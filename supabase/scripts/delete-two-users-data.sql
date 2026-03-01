-- Delete all data for two users EXCEPT users and business_profiles.
-- User IDs: 947e6728-7320-4cca-a70d-1f01adcaed44, f770d39b-73b0-4eeb-9851-e7c6bf7d0fac
--
-- Run with: psql $DATABASE_URL -f supabase/scripts/delete-two-users-data.sql
-- Or run in Supabase SQL Editor.

BEGIN;

-- 1. Break FK: loans.current_match_id -> loan_matches (for loans we're about to delete)
UPDATE public.loans
SET current_match_id = NULL
WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 2. Loan matches (by lender or by loan)
DELETE FROM public.loan_matches
WHERE lender_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR lender_business_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   OR loan_id IN (
     SELECT id FROM public.loans
     WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   );

-- 3. Payment schedule (by loan)
DELETE FROM public.payment_schedule
WHERE loan_id IN (
  SELECT id FROM public.loans
  WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
);

-- 4. Payments (by loan)
DELETE FROM public.payments
WHERE loan_id IN (
  SELECT id FROM public.loans
  WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
);

-- 5. Payment retry log
DELETE FROM public.payment_retry_log
WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR loan_id IN (
     SELECT id FROM public.loans
     WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   );

-- 6. Payment transactions (by loan, user, or their payment methods)
DELETE FROM public.payment_transactions
WHERE loan_id IN (
  SELECT id FROM public.loans
  WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
     OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
)
   OR sender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR receiver_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR confirmed_by IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR proof_uploaded_by IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR disputed_by IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR sender_payment_method_id IN (SELECT id FROM public.user_payment_methods WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   OR receiver_payment_method_id IN (SELECT id FROM public.user_payment_methods WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 7. Transfers (by loan or user)
DELETE FROM public.transfers
WHERE source_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR destination_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR loan_id IN (
     SELECT id FROM public.loans
     WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   );

-- 8. Trust score events
DELETE FROM public.trust_score_events
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR other_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 9. Notifications
DELETE FROM public.notifications
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR loan_id IN (
     SELECT id FROM public.loans
     WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   );

-- 10. Borrower blocks
DELETE FROM public.borrower_blocks
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR loan_id IN (
     SELECT id FROM public.loans
     WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
        OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'))
   );

-- 11. Loans
DELETE FROM public.loans
WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 12. Vouches
DELETE FROM public.vouches
WHERE voucher_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR vouchee_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 13. Vouch requests
DELETE FROM public.vouch_requests
WHERE requester_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR requested_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 14. Loan requests (borrower)
DELETE FROM public.loan_requests
WHERE borrower_user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 15. Pending loan requests
DELETE FROM public.pending_loan_requests
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR personal_lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR business_lender_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 16. Borrower business trust (borrower or business)
DELETE FROM public.borrower_business_trust
WHERE borrower_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR business_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 17. Lender tier policies
DELETE FROM public.lender_tier_policies
WHERE lender_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 18. Lender preferences (user or business)
DELETE FROM public.lender_preferences
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac')
   OR business_id IN (SELECT id FROM public.business_profiles WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac'));

-- 19. User payment methods
DELETE FROM public.user_payment_methods
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 20. User financial profiles
DELETE FROM public.user_financial_profiles
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 21. Trust scores
DELETE FROM public.trust_scores
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 22. Agents
DELETE FROM public.agents
WHERE user_id IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

-- 23. Admin email logs: clear sent_by
UPDATE public.admin_email_logs
SET sent_by = NULL
WHERE sent_by IN ('947e6728-7320-4cca-a70d-1f01adcaed44', 'f770d39b-73b0-4eeb-9851-e7c6bf7d0fac');

COMMIT;
