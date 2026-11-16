-- Switch Account installment due tracking to a recurring weekday.
-- Explicit private handoff timestamp lets Accounting discover status changes.
alter table public.account_private_financials
  add column if not exists installment_due_date date;

alter table public.account_private_financials
  add column if not exists actual_sale_price numeric(12,2)
  check (actual_sale_price is null or actual_sale_price >= 0);

alter table public.account_private_financials
  add column if not exists installment_due_weekday smallint
  check (installment_due_weekday is null or installment_due_weekday between 0 and 6);

alter table public.account_private_financials
  add column if not exists installment_schedule_type text not null default 'weekly'
  check (installment_schedule_type in ('weekly','daily','every_other_day'));

alter table public.account_private_financials
  add column if not exists installment_plan_index smallint not null default 0
  check (installment_plan_index >= 0);

alter table public.account_private_financials
  add column if not exists accounting_handoff_at timestamptz;

alter table public.accounting_entries
  add column if not exists installment_due_date date;

alter table public.accounting_entries
  add column if not exists installment_due_weekday smallint
  check (installment_due_weekday is null or installment_due_weekday between 0 and 6);

alter table public.accounting_entries
  add column if not exists installment_schedule_type text not null default 'weekly'
  check (installment_schedule_type in ('weekly','daily','every_other_day'));

-- Preserve the weekday from the one-off dates entered in the previous version.
update public.account_private_financials
set installment_due_weekday = extract(dow from installment_due_date)::smallint
where installment_due_weekday is null
  and installment_due_date is not null;

update public.accounting_entries
set installment_due_weekday = extract(dow from installment_due_date)::smallint
where installment_due_weekday is null
  and installment_due_date is not null;

-- Backfill handoff timestamps for status changes made before this migration.
update public.account_private_financials f
set accounting_handoff_at = a.sale_started_at
from public.accounts a
where a.id = f.account_id
  and f.accounting_handoff_at is null
  and a.status in ('installment','sold')
  and a.sale_started_at is not null;

create index if not exists account_private_financials_handoff_idx
  on public.account_private_financials(accounting_handoff_at)
  where accounting_handoff_at is not null;

create index if not exists accounting_entries_installment_weekday_idx
  on public.accounting_entries(installment_due_weekday)
  where installment_due_weekday is not null;

notify pgrst, 'reload schema';
