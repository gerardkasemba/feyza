-- ============================================================
-- Patch 7 Migration: Voucher Accountability + Verification Gate
-- Run in Supabase SQL editor after patch6 migration
-- ============================================================

-- ── 1. New columns on users ────────────────────────────────────────────────
--
-- These drive the entire accountability and verification system.
-- We never delete old data — all columns are additive.

ALTER TABLE public.users
  -- Vouching eligibility gate
  ADD COLUMN IF NOT EXISTS vouching_locked           BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS vouching_locked_reason    TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS vouching_locked_at        TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_vouchee_defaults   INTEGER     DEFAULT 0,

  -- Historical track record (recalculated after every outcome)
  ADD COLUMN IF NOT EXISTS vouching_success_rate     DECIMAL(5,2) DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS vouches_given_total       INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vouches_resulted_default  INTEGER     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vouches_resulted_complete INTEGER     DEFAULT 0;

-- ── 2. Backfill vouches_given_total from existing vouch rows ──────────────
UPDATE public.users u
SET vouches_given_total = sub.total
FROM (
  SELECT voucher_id, COUNT(*) AS total
  FROM public.vouches
  WHERE status IN ('active', 'revoked', 'expired', 'claimed')
  GROUP BY voucher_id
) sub
WHERE u.id = sub.voucher_id;

-- ── 3. Backfill success rate from existing vouch outcome columns ──────────
UPDATE public.users u
SET
  vouches_resulted_default  = COALESCE(sub.total_defaults, 0),
  vouches_resulted_complete = COALESCE(sub.total_completions, 0),
  vouching_success_rate = CASE
    WHEN COALESCE(sub.total_outcomes, 0) = 0 THEN 100.00
    ELSE ROUND(
      (COALESCE(sub.total_completions, 0)::DECIMAL / sub.total_outcomes) * 100,
      2
    )
  END
FROM (
  SELECT
    voucher_id,
    SUM(loans_defaulted)  AS total_defaults,
    SUM(loans_completed)  AS total_completions,
    SUM(loans_defaulted + loans_completed) AS total_outcomes
  FROM public.vouches
  GROUP BY voucher_id
) sub
WHERE u.id = sub.voucher_id;

-- ── 4. Lock any users who already have 2+ active vouchee defaults ─────────
UPDATE public.users u
SET
  active_vouchee_defaults = sub.default_count,
  vouching_locked         = (sub.default_count >= 2),
  vouching_locked_reason  = CASE
    WHEN sub.default_count >= 2
    THEN 'Two or more people you vouched for are currently in default. Resolve before vouching again.'
    ELSE NULL
  END,
  vouching_locked_at = CASE
    WHEN sub.default_count >= 2 THEN NOW()
    ELSE NULL
  END
FROM (
  SELECT
    v.voucher_id,
    COUNT(*) AS default_count
  FROM public.vouches v
  JOIN public.loans l ON l.borrower_id = v.vouchee_id
  WHERE v.status = 'active'
    AND l.status IN ('defaulted', 'failed')
  GROUP BY v.voucher_id
) sub
WHERE u.id = sub.voucher_id;

-- ── 5. Index for fast vouching eligibility lookups ────────────────────────
CREATE INDEX IF NOT EXISTS idx_users_vouching_locked
  ON public.users (vouching_locked)
  WHERE vouching_locked = true;

CREATE INDEX IF NOT EXISTS idx_users_vouching_success_rate
  ON public.users (vouching_success_rate);

-- ── 6. Index on vouches for fast voucher-by-vouchee lookups ─────────────
-- (already exists from base schema — this is a safety net)
CREATE INDEX IF NOT EXISTS idx_vouches_active_by_vouchee
  ON public.vouches (vouchee_id, voucher_id)
  WHERE status = 'active';

-- Done.
-- Patch 7 adds accountability tracking that fires every time a
-- vouchee's loan completes or defaults. See src/lib/vouching/accountability.ts
