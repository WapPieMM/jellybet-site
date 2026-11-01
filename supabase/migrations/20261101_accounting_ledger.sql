-- Private accounting ledger. All financial data is isolated from the public Account marketplace.
alter table public.accounts
  add column if not exists sale_started_at timestamptz;

create table if not exists public.accounting_entries (
  id uuid primary key default gen_random_uuid(),
  source_account_id bigint references public.accounts(id) on delete set null,
  account_title text not null,
  sale_date date not null,
  sale_amount numeric(12,2) not null default 0 check (sale_amount >= 0),
  cost_amount numeric(12,2) not null default 0 check (cost_amount >= 0),
  opening_balance numeric(12,2) not null default 0 check (opening_balance >= 0),
  weekly_amount numeric(12,2) not null default 0 check (weekly_amount >= 0),
  is_carryover boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists accounting_entries_source_account_unique
  on public.accounting_entries(source_account_id)
  where source_account_id is not null;
create index if not exists accounting_entries_sale_date_idx
  on public.accounting_entries(sale_date desc);

create table if not exists public.accounting_payments (
  id uuid primary key default gen_random_uuid(),
  entry_id uuid not null references public.accounting_entries(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  paid_on date not null default current_date,
  payment_type text not null default 'installment'
    check (payment_type in ('deposit','installment','other')),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists accounting_payments_paid_on_idx
  on public.accounting_payments(paid_on desc);
create index if not exists accounting_payments_entry_idx
  on public.accounting_payments(entry_id);

alter table public.accounting_entries enable row level security;
alter table public.accounting_payments enable row level security;

drop policy if exists "Admins manage accounting entries" on public.accounting_entries;
create policy "Admins manage accounting entries"
  on public.accounting_entries for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

drop policy if exists "Admins manage accounting payments" on public.accounting_payments;
create policy "Admins manage accounting payments"
  on public.accounting_payments for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

notify pgrst, 'reload schema';
