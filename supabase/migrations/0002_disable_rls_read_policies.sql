-- Reverses 0001_enable_rls_read_policies.sql: disable RLS and drop SELECT-only policies.
-- After this, anon + user JWT can read all rows (same as no RLS). Service role unchanged.
--
-- Usage: psql $DATABASE_URL -f supabase/migrations/0002_disable_rls_read_policies.sql

-- -----------------------------------------------------------------------------
-- users: drop policy and disable RLS
-- -----------------------------------------------------------------------------
drop policy if exists "users_select_own" on public.users;
alter table public.users disable row level security;

-- -----------------------------------------------------------------------------
-- loans: drop policy and disable RLS
-- -----------------------------------------------------------------------------
drop policy if exists "loans_select_borrower_or_lender" on public.loans;
alter table public.loans disable row level security;
