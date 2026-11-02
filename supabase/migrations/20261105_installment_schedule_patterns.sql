-- Add installment cadence patterns while preserving all existing weekly schedules.
alter table public.account_private_financials add column if not exists installment_schedule_type text not null default 'weekly' check (installment_schedule_type in ('weekly','daily','every_other_day'));
alter table public.account_private_financials add column if not exists installment_due_date date;
alter table public.accounting_entries add column if not exists installment_schedule_type text not null default 'weekly' check (installment_schedule_type in ('weekly','daily','every_other_day'));
alter table public.accounting_entries add column if not exists installment_due_date date;

-- Existing rows remain weekly and retain their saved weekday.
update public.account_private_financials set installment_schedule_type='weekly' where installment_schedule_type is null;
update public.accounting_entries set installment_schedule_type='weekly' where installment_schedule_type is null;

create index if not exists accounting_entries_schedule_idx on public.accounting_entries(installment_schedule_type,installment_due_date) where installment_due_date is not null;

-- Replace the existing auto-sync function so newly created ledger entries receive the same schedule.
create or replace function public.auto_sync_account_to_accounting()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, pg_temp
as $function$
declare
  v_account public.accounts%rowtype;
  v_handoff_at timestamptz;
  v_sale_date date;
  v_plan_text text;
  v_plan_end integer;
  v_plans jsonb := '[]'::jsonb;
  v_plan jsonb := '{}'::jsonb;
  v_plan_index integer := 0;
  v_down numeric(12,2) := 0;
  v_plan_total numeric(12,2) := 0;
  v_sale_amount numeric(12,2) := 0;
  v_initial_received numeric(12,2) := 0;
  v_weekly_amount numeric(12,2) := 0;
  v_due_weekday smallint;
  v_schedule_type text := 'weekly';
  v_due_date date;
  v_payment_type text := 'other';
  v_payment_note text := '';
  v_entry_id uuid;
  v_marker constant text := '[[JELLYBET_INSTALLMENT_PLANS]]';
begin
  select * into v_account
  from public.accounts
  where id = new.account_id;

  if not found or v_account.status not in ('installment','sold') then
    return new;
  end if;

  v_handoff_at := coalesce(new.accounting_handoff_at, v_account.sale_started_at);
  if v_handoff_at is null or coalesce(v_account.accounting_carryover,false) then
    return new;
  end if;
  if v_handoff_at < timestamptz '2026-11-01 00:00:00+07' then
    return new;
  end if;

  v_sale_date := (v_handoff_at at time zone 'Asia/Bangkok')::date;

  if v_account.status = 'installment' then
    v_plan_index := greatest(coalesce(new.installment_plan_index,0)::integer,0);
    if left(coalesce(v_account.installment_details,''), char_length(v_marker)) = v_marker then
      v_plan_text := substr(v_account.installment_details, char_length(v_marker)+1);
      v_plan_end := strpos(v_plan_text, ']');
      if v_plan_end > 0 then
        begin
          v_plans := substr(v_plan_text,1,v_plan_end)::jsonb;
          if jsonb_typeof(v_plans) = 'array' then
            v_plan := coalesce(v_plans -> v_plan_index, '{}'::jsonb);
          end if;
        exception when others then
          v_plan := '{}'::jsonb;
        end;
      end if;
    end if;

    v_down := greatest(coalesce(nullif(v_plan->>'down','')::numeric,0),0);
    v_plan_total := greatest(coalesce(nullif(v_plan->>'total','')::numeric,0),0);
    v_weekly_amount := greatest(coalesce(nullif(v_plan->>'weekly','')::numeric,0),0);
    v_sale_amount := v_down + v_plan_total;
    if v_sale_amount <= 0 then
      v_sale_amount := greatest(coalesce(v_account.price,0),0);
    end if;
    v_initial_received := least(v_sale_amount,v_down);
    v_due_weekday := new.installment_due_weekday;
    v_schedule_type := coalesce(new.installment_schedule_type,'weekly');
    v_due_date := new.installment_due_date;
    v_payment_type := 'deposit';
    v_payment_note := 'เงินดาวน์เริ่มต้นจากการเปลี่ยนสถานะ Account';
  else
    v_sale_amount := greatest(coalesce(new.actual_sale_price,v_account.price,0),0);
    v_initial_received := v_sale_amount;
    v_weekly_amount := 0;
    v_due_weekday := null;
    v_schedule_type := 'weekly';
    v_due_date := null;
    v_payment_type := 'other';
    v_payment_note := 'ยอดรับเต็มตามราคาขายจริงจากการเปลี่ยนสถานะ Account';
  end if;

  -- A unique source_account_id constraint makes this idempotent. If a row already
  -- exists from an earlier manual import, do not add a second initial payment.
  insert into public.accounting_entries (
    source_account_id, account_title, sale_date, sale_amount, cost_amount,
    opening_balance, weekly_amount, installment_due_weekday, installment_schedule_type, installment_due_date, is_carryover, notes,
    created_at, updated_at
  ) values (
    new.account_id, coalesce(nullif(v_account.title,''),'Account #'||new.account_id),
    v_sale_date, v_sale_amount, greatest(coalesce(new.acquisition_cost,0),0),
    v_sale_amount, v_weekly_amount, v_due_weekday, v_schedule_type, v_due_date, false,
    case when v_account.status='installment' then 'สร้างอัตโนมัติจากสถานะติดผ่อน' else 'สร้างอัตโนมัติจากสถานะขายแล้ว' end,
    now(), now()
  )
  on conflict (source_account_id) where source_account_id is not null do nothing
  returning id into v_entry_id;

  if v_entry_id is null then
    return new;
  end if;

  if v_initial_received > 0 then
    insert into public.accounting_payments (
      entry_id, amount, paid_on, payment_type, note, created_at
    ) values (
      v_entry_id, v_initial_received, v_sale_date, v_payment_type, v_payment_note, now()
    );
  end if;

  return new;
end;
$function$;


notify pgrst, 'reload schema';
