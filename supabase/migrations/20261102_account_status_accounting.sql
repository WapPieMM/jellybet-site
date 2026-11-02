-- Private handoff fields for newly transitioned Account statuses.
-- These fields remain outside the public accounts table.
alter table public.account_private_financials
  add column if not exists installment_due_date date;

alter table public.account_private_financials
  add column if not exists actual_sale_price numeric(12,2)
  check (actual_sale_price is null or actual_sale_price >= 0);

-- Copy the installment due date into the Accounting ledger at import time
-- so it remains visible to admins even if Account metadata changes later.
alter table public.accounting_entries
  add column if not exists installment_due_date date;

create index if not exists accounting_entries_installment_due_date_idx
  on public.accounting_entries(installment_due_date)
  where installment_due_date is not null;

notify pgrst, 'reload schema';
