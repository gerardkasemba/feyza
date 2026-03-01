-- =====================================================
-- Drop tables and column removed after guest/agent removal
-- Run this on a database that still has the old schema.
-- Safe to run multiple times (uses IF EXISTS).
-- =====================================================

-- 1. Drop foreign key and column on loans (loans.guest_lender_id → guest_lenders)
alter table if exists public.loans
  drop constraint if exists loans_guest_lender_id_fkey;

alter table if exists public.loans
  drop column if exists guest_lender_id;

-- 2. Drop agent/disbursement tables (child tables first due to FKs)
drop table if exists public.disbursement_history;
drop table if exists public.disbursements;
drop table if exists public.agents;

-- 3. Drop guest lenders table
drop table if exists public.guest_lenders;
