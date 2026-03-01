-- Optional: enable RLS on core tables and add SELECT-only policies.
-- This restricts read access when using the anon key + user JWT.
-- Service role continues to bypass RLS (used by cron, admin, payment handler, etc.).
-- Run after feyza-database.sql.
--
-- Usage: psql $DATABASE_URL -f supabase/migrations/0001_enable_rls_read_policies.sql

-- -----------------------------------------------------------------------------
-- users: authenticated user can only SELECT their own row
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;

create policy "users_select_own"
  on public.users
  for select
  using (auth.uid() = id);

-- -----------------------------------------------------------------------------
-- loans: user can SELECT loans where they are borrower, lender, or business owner
-- -----------------------------------------------------------------------------
alter table public.loans enable row level security;

create policy "loans_select_borrower_or_lender"
  on public.loans
  for select
  using (
    auth.uid() = borrower_id
    or auth.uid() = lender_id
    or business_lender_id in (
      select id from public.business_profiles where user_id = auth.uid()
    )
  );

-- Note: INSERT/UPDATE/DELETE are not restricted by these policies.
-- The app performs those via API routes that use the service role where needed.
-- To enforce writes at the DB layer, add further policies and use the
-- user-scoped Supabase client (with JWT) for user-initiated writes.
