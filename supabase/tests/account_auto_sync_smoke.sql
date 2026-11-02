begin;

do $test$
declare
  v_entry public.accounting_entries%rowtype;
  v_account_id bigint;
  v_count integer;
  v_total numeric(12,2);
begin
  -- Migration backfill: status was changed before the trigger was installed.
  select * into v_entry from public.accounting_entries where source_account_id=900001;
  if not found then raise exception 'FAIL: pending Account 900001 was not auto-created'; end if;
  if v_entry.sale_amount<>400 or v_entry.cost_amount<>120 or v_entry.weekly_amount<>40 or v_entry.installment_due_weekday<>1 then
    raise exception 'FAIL: backfilled installment values are incorrect: %', row_to_json(v_entry);
  end if;
  select count(*),coalesce(sum(amount),0) into v_count,v_total
  from public.accounting_payments where entry_id=v_entry.id;
  if v_count<>1 or v_total<>80 then
    raise exception 'FAIL: backfilled initial deposit was not created exactly once';
  end if;

  -- New installment status: choose plan #2, recurring Wednesday, and create
  -- the ledger row plus down-payment event without any manual import action.
  insert into public.accounts (
    id,title,price,status,installment_details,sale_started_at,accounting_carryover
  ) values (
    900002,'QA installment plan two',1200,'installment',
    '[[JELLYBET_INSTALLMENT_PLANS]][{"months":1,"down":40,"total":160,"weekly":30},{"months":3,"down":100,"total":600,"weekly":50}]',
    timestamptz '2026-11-02 11:00:00+07',false
  );
  insert into public.account_private_financials (
    account_id,acquisition_cost,installment_due_weekday,installment_plan_index,accounting_handoff_at
  ) values (900002,200,3,1,timestamptz '2026-11-02 11:00:00+07');

  select * into v_entry from public.accounting_entries where source_account_id=900002;
  if not found then raise exception 'FAIL: new installment Account was not auto-created'; end if;
  if v_entry.sale_amount<>700 or v_entry.opening_balance<>700 or v_entry.cost_amount<>200 or v_entry.weekly_amount<>50 or v_entry.installment_due_weekday<>3 then
    raise exception 'FAIL: selected installment plan values are incorrect: %', row_to_json(v_entry);
  end if;
  select count(*),coalesce(sum(amount),0) into v_count,v_total
  from public.accounting_payments where entry_id=v_entry.id;
  if v_count<>1 or v_total<>100 then
    raise exception 'FAIL: installment down payment was not created exactly once';
  end if;

  -- Re-saving private Account data must not duplicate its Accounting entry or
  -- initial payment.
  update public.account_private_financials set updated_at=now() where account_id=900002;
  select count(*) into v_count from public.accounting_entries where source_account_id=900002;
  if v_count<>1 then raise exception 'FAIL: duplicate Accounting entry created'; end if;
  select count(*) into v_count from public.accounting_payments p
    join public.accounting_entries e on e.id=p.entry_id where e.source_account_id=900002;
  if v_count<>1 then raise exception 'FAIL: duplicate initial payment created'; end if;

  -- Direct sold status: actual sale price is used as sales amount and is marked
  -- received in full, with zero outstanding balance.
  insert into public.accounts (
    id,title,price,status,sale_started_at,accounting_carryover
  ) values (
    900003,'QA sold Account',999,'sold',timestamptz '2026-11-02 12:00:00+07',false
  );
  insert into public.account_private_financials (
    account_id,acquisition_cost,accounting_handoff_at,actual_sale_price
  ) values (900003,250,timestamptz '2026-11-02 12:00:00+07',850);

  select * into v_entry from public.accounting_entries where source_account_id=900003;
  if not found then raise exception 'FAIL: sold Account was not auto-created'; end if;
  if v_entry.sale_amount<>850 or v_entry.opening_balance<>850 or v_entry.cost_amount<>250 then
    raise exception 'FAIL: actual sale price or cost was not transferred: %', row_to_json(v_entry);
  end if;
  select count(*),coalesce(sum(amount),0) into v_count,v_total
  from public.accounting_payments where entry_id=v_entry.id;
  if v_count<>1 or v_total<>850 then
    raise exception 'FAIL: sold payment was not recorded in full exactly once';
  end if;

  -- Existing installment carryovers must not be auto-created as new sales.
  insert into public.accounts (
    id,title,price,status,sale_started_at,accounting_carryover
  ) values (900004,'QA legacy carryover',500,'installment',null,true);
  insert into public.account_private_financials (
    account_id,acquisition_cost,accounting_handoff_at
  ) values (900004,100,null);
  select count(*) into v_count from public.accounting_entries where source_account_id=900004;
  if v_count<>0 then raise exception 'FAIL: legacy carryover was incorrectly auto-created'; end if;

  -- When an entry already exists (e.g. a previous manual import), the trigger
  -- must preserve it and must not add another initial payment.
  insert into public.accounts (
    id,title,price,status,sale_started_at,accounting_carryover
  ) values (900005,'QA already imported',500,'installment',timestamptz '2026-11-02 13:00:00+07',false);
  insert into public.accounting_entries (
    source_account_id,account_title,sale_date,sale_amount,cost_amount,opening_balance
  ) values (900005,'QA already imported','2026-11-02',500,100,500);
  insert into public.account_private_financials (
    account_id,acquisition_cost,installment_due_weekday,accounting_handoff_at
  ) values (900005,100,2,timestamptz '2026-11-02 13:00:00+07');
  select count(*) into v_count from public.accounting_entries where source_account_id=900005;
  if v_count<>1 then raise exception 'FAIL: existing Accounting entry was duplicated'; end if;
  select count(*) into v_count from public.accounting_payments p
    join public.accounting_entries e on e.id=p.entry_id where e.source_account_id=900005;
  if v_count<>0 then raise exception 'FAIL: duplicate initial payment was added to previous manual import'; end if;

  -- A pre-launch record with a timestamp should remain outside the new-sale flow.
  insert into public.accounts (
    id,title,price,status,sale_started_at,accounting_carryover
  ) values (900006,'QA prelaunch status',500,'installment',timestamptz '2026-10-31 23:00:00+07',false);
  insert into public.account_private_financials (
    account_id,acquisition_cost,accounting_handoff_at
  ) values (900006,100,null);
  select count(*) into v_count from public.accounting_entries where source_account_id=900006;
  if v_count<>0 then raise exception 'FAIL: pre-launch record was incorrectly auto-created'; end if;
end;
$test$;

rollback;
