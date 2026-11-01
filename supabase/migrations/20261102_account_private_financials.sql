-- Store Account acquisition costs outside the publicly readable marketplace table.
create table if not exists public.account_private_financials (
  account_id bigint primary key references public.accounts(id) on delete cascade,
  acquisition_cost numeric(12,2) not null default 0 check (acquisition_cost >= 0),
  updated_at timestamptz not null default now()
);

alter table public.account_private_financials enable row level security;

-- Explicitly deny public/anonymous access; authenticated access is still restricted by RLS.
revoke all on table public.account_private_financials from public, anon, authenticated;
grant select, insert, update, delete on table public.account_private_financials to authenticated;

drop policy if exists "Admins manage account private financials" on public.account_private_financials;
create policy "Admins manage account private financials"
  on public.account_private_financials for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');
