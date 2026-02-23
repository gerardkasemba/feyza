-- =====================================================
-- COMBINED DATABASE SCHEMA
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE (Core table that others reference)
-- =====================================================
create table public.users (
  id uuid not null,
  email text not null,
  full_name text not null,
  phone text null,
  avatar_url text null,
  user_type text not null default 'individual'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  paypal_email text null,
  paypal_payer_id text null,
  paypal_connected boolean null default false,
  paypal_connected_at timestamp with time zone null,
  email_reminders boolean null default true,
  reminder_days_before integer null default 3,
  verification_status text null default 'pending'::text,
  verification_submitted_at timestamp with time zone null,
  verification_reviewed_at timestamp with time zone null,
  verification_notes text null,
  id_type text null,
  id_number text null,
  id_document_url text null,
  id_expiry_date date null,
  employment_status text null,
  employer_name text null,
  employer_address text null,
  employment_start_date date null,
  employment_document_url text null,
  monthly_income numeric(12, 2) null,
  address_line1 text null,
  address_line2 text null,
  city text null,
  state_province text null,
  postal_code text null,
  country text null,
  address_document_url text null,
  address_document_type text null,
  terms_accepted boolean null default false,
  terms_accepted_at timestamp with time zone null,
  borrower_rating text null default 'neutral'::text,
  borrower_rating_updated_at timestamp with time zone null,
  total_loans_completed integer null default 0,
  total_payments_made integer null default 0,
  payments_on_time integer null default 0,
  payments_early integer null default 0,
  payments_late integer null default 0,
  payments_missed integer null default 0,
  borrowing_tier integer null default 1,
  max_borrowing_amount numeric(12, 2) null default 150.00,
  loans_at_current_tier integer null default 0,
  total_amount_borrowed numeric(12, 2) null default 0,
  total_amount_repaid numeric(12, 2) null default 0,
  current_outstanding_amount numeric(12, 2) null default 0,
  cashapp_username text null,
  venmo_username text null,
  preferred_payment_method text null,
  is_admin boolean null default false,
  is_suspended boolean null default false,
  timezone text null default 'America/New_York'::text,
  plaid_access_token text null,
  plaid_item_id character varying(255) null,
  plaid_account_id character varying(255) null,
  dwolla_customer_url text null,
  dwolla_customer_id character varying(255) null,
  dwolla_funding_source_url text null,
  dwolla_funding_source_id character varying(255) null,
  bank_name character varying(255) null,
  bank_account_mask character varying(10) null,
  bank_account_type character varying(50) null,
  bank_connected boolean null default false,
  bank_connected_at timestamp with time zone null,
  username text null,
  is_blocked boolean null default false,
  blocked_at timestamp with time zone null,
  blocked_reason text null,
  debt_cleared_at timestamp with time zone null,
  restriction_ends_at timestamp with time zone null,
  default_count integer null default 0,
  pre_default_rating text null,
  state character varying(10) null,
  date_of_birth date null,
  phone_number text null,
  phone_verified boolean null default false,
  ssn_last4 text null,
  id_front_url text null,
  id_back_url text null,
  id_expiry date null,
  selfie_url text null,
  selfie_verified boolean null default false,
  selfie_verified_at timestamp with time zone null,
  job_title text null,
  monthly_income_range text null,
  verified_at timestamp with time zone null,
  reverification_required boolean null default false,
  reverification_due_at timestamp with time zone null,
  verification_count integer null default 0,
  privacy_accepted boolean null default false,
  privacy_accepted_at timestamp with time zone null,
  auto_payments_count integer null default 0,
  manual_payments_count integer null default 0,
  zelle_email text null,
  zelle_phone character varying(20) null,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username),
  constraint users_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint username_format check (
    (
      (username is null)
      or (username ~ '^[a-z0-9_]{3,20}$'::text)
    )
  ),
  constraint users_verification_status_check check (
    (
      verification_status = any (
        array[
          'pending'::text,
          'submitted'::text,
          'verified'::text,
          'rejected'::text
        ]
      )
    )
  ),
  constraint users_borrower_rating_check check (
    (
      borrower_rating = any (
        array[
          'great'::text,
          'good'::text,
          'neutral'::text,
          'poor'::text,
          'bad'::text,
          'worst'::text
        ]
      )
    )
  ),
  constraint users_preferred_payment_method_check check (
    (
      (preferred_payment_method is null)
      or (
        preferred_payment_method = any (
          array[
            'paypal'::text,
            'cashapp'::text,
            'venmo'::text,
            'zelle'::text
          ]
        )
      )
    )
  ),
  constraint users_user_type_check check (
    (
      user_type = any (array['individual'::text, 'business'::text])
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- BUSINESS PROFILES (Depends on users)
-- =====================================================
create table public.business_profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  business_name text not null,
  business_type text not null,
  description text null,
  location text null,
  contact_email text null,
  contact_phone text null,
  is_verified boolean null default false,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  default_interest_rate numeric(5, 2) null default 0,
  interest_type text null default 'simple'::text,
  min_loan_amount numeric(12, 2) null,
  max_loan_amount numeric(12, 2) null,
  profile_completed boolean null default false,
  paypal_email text null,
  paypal_connected boolean null default false,
  terms_accepted boolean null default false,
  terms_accepted_at timestamp with time zone null,
  cashapp_username text null,
  venmo_username text null,
  preferred_payment_method text null,
  ein_tax_id character varying(20) null,
  state character varying(50) null,
  business_entity_type character varying(50) null,
  years_in_business integer null,
  website_url character varying(255) null,
  number_of_employees character varying(50) null,
  annual_revenue_range character varying(50) null,
  slug character varying(100) null,
  public_profile_enabled boolean null default false,
  tagline character varying(200) null,
  logo_url character varying(500) null,
  verification_status character varying(20) null default 'pending'::character varying,
  verification_notes text null,
  verified_at timestamp with time zone null,
  verified_by uuid null,
  plaid_access_token text null,
  plaid_item_id character varying(255) null,
  plaid_account_id character varying(255) null,
  dwolla_customer_url text null,
  dwolla_customer_id character varying(255) null,
  dwolla_funding_source_url text null,
  dwolla_funding_source_id character varying(255) null,
  bank_name character varying(255) null,
  bank_account_mask character varying(10) null,
  bank_account_type character varying(50) null,
  bank_connected boolean null default false,
  bank_connected_at timestamp with time zone null,
  first_time_borrower_amount numeric(12, 2) null default 50,
  lending_terms text null,
  lending_terms_updated_at timestamp with time zone null,
  total_loans_funded integer null default 0,
  total_amount_funded numeric(12, 2) null default 0,
  rejection_reason text null,
  zelle_email text null,
  total_interest_earned numeric(12, 2) null default 0,
  capital_pool numeric(12, 2) null default 10000,
  auto_match_enabled boolean null default false,
  zelle_phone character varying(20) null,
  zelle_name character varying(255) null,
  constraint business_profiles_pkey primary key (id),
  constraint business_profiles_slug_key unique (slug),
  constraint business_profiles_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint business_profiles_verified_by_fkey foreign KEY (verified_by) references auth.users (id),
  constraint business_profiles_interest_type_check check (
    (
      interest_type = any (array['simple'::text, 'compound'::text])
    )
  ),
  constraint business_profiles_preferred_payment_method_check check (
    (
      (preferred_payment_method is null)
      or (
        preferred_payment_method = any (
          array[
            'paypal'::text,
            'cashapp'::text,
            'venmo'::text,
            'zelle'::text
          ]
        )
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- AGENTS (Depends on users)
-- =====================================================
create table public.agents (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  email text not null,
  full_name text not null,
  phone text null,
  role text null default 'agent'::text,
  country text null,
  region text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint agents_pkey primary key (id),
  constraint agents_email_key unique (email),
  constraint agents_user_id_fkey foreign KEY (user_id) references users (id),
  constraint agents_role_check check (
    (
      role = any (
        array['agent'::text, 'supervisor'::text, 'admin'::text]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- COUNTRIES
-- =====================================================
create table public.countries (
  id uuid not null default gen_random_uuid (),
  code character varying(3) not null,
  name character varying(100) not null,
  currency character varying(3) not null,
  currency_symbol character varying(5) null default '$'::character varying,
  is_active boolean null default true,
  dwolla_supported boolean null default false,
  paypal_supported boolean null default true,
  min_loan_amount numeric(12, 2) null default 50,
  max_loan_amount numeric(12, 2) null default 5000,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint countries_pkey primary key (id),
  constraint countries_code_key unique (code)
) TABLESPACE pg_default;

-- =====================================================
-- STATES (Depends on countries)
-- =====================================================
create table public.states (
  id uuid not null default gen_random_uuid (),
  code character varying(10) not null,
  name character varying(100) not null,
  country_id uuid not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint states_pkey primary key (id),
  constraint states_code_country_id_key unique (code, country_id),
  constraint states_country_id_fkey foreign KEY (country_id) references countries (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- LOAN TYPES
-- =====================================================
create table public.loan_types (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  slug character varying(100) not null,
  description text null,
  icon character varying(50) null,
  min_amount numeric(12, 2) null default 50,
  max_amount numeric(12, 2) null default 5000,
  min_interest_rate numeric(5, 2) null default 0,
  max_interest_rate numeric(5, 2) null default 25,
  max_term_months integer null default 24,
  is_active boolean null default true,
  requires_business_lender boolean null default false,
  display_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint loan_types_pkey primary key (id),
  constraint loan_types_slug_key unique (slug)
) TABLESPACE pg_default;

-- =====================================================
-- BUSINESS LOAN TYPES (Depends on business_profiles and loan_types)
-- =====================================================
create table public.business_loan_types (
  id uuid not null default gen_random_uuid (),
  business_id uuid not null,
  loan_type_id uuid not null,
  min_amount numeric(12, 2) null,
  max_amount numeric(12, 2) null,
  interest_rate numeric(5, 2) null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint business_loan_types_pkey primary key (id),
  constraint business_loan_types_business_id_loan_type_id_key unique (business_id, loan_type_id),
  constraint business_loan_types_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint business_loan_types_loan_type_id_fkey foreign KEY (loan_type_id) references loan_types (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- LENDER PREFERENCES (Depends on users and business_profiles)
-- =====================================================
create table public.lender_preferences (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  business_id uuid null,
  is_active boolean null default true,
  auto_accept boolean null default false,
  min_amount numeric(12, 2) null default 50,
  max_amount numeric(12, 2) null default 5000,
  preferred_currency text null default 'USD'::text,
  interest_rate numeric(5, 2) null default 10,
  interest_type text null default 'simple'::text,
  countries jsonb null default '[]'::jsonb,
  min_borrower_rating text null default 'neutral'::text,
  require_verified_borrower boolean null default false,
  min_term_weeks integer null default 1,
  max_term_weeks integer null default 52,
  capital_pool numeric(12, 2) null default 0,
  capital_reserved numeric(12, 2) null default 0,
  notify_on_match boolean null default true,
  notify_email boolean null default true,
  notify_sms boolean null default false,
  total_loans_funded integer null default 0,
  total_amount_funded numeric(12, 2) null default 0,
  acceptance_rate numeric(5, 2) null default 100,
  avg_response_time_hours numeric(10, 2) null,
  last_loan_assigned_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  first_time_borrower_limit numeric(12, 2) null default 500,
  allow_first_time_borrowers boolean null default true,
  lending_terms text null,
  lending_terms_updated_at timestamp with time zone null,
  states jsonb null default '[]'::jsonb,
  constraint lender_preferences_pkey primary key (id),
  constraint lender_preferences_business_id_key unique (business_id),
  constraint lender_preferences_user_id_key unique (user_id),
  constraint lender_preferences_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint lender_preferences_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint lender_type_check check (
    (
      (
        (user_id is not null)
        and (business_id is null)
      )
      or (
        (user_id is null)
        and (business_id is not null)
      )
    )
  ),
  constraint lender_preferences_interest_type_check check (
    (
      interest_type = any (array['simple'::text, 'compound'::text])
    )
  ),
  constraint lender_preferences_min_borrower_rating_check check (
    (
      min_borrower_rating = any (
        array[
          'great'::text,
          'good'::text,
          'neutral'::text,
          'poor'::text,
          'bad'::text,
          'worst'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- PAYMENT PROVIDERS
-- =====================================================
create table public.payment_providers (
  id uuid not null default gen_random_uuid (),
  slug character varying(50) not null,
  name character varying(100) not null,
  description text null,
  logo_url text null,
  provider_type character varying(20) not null,
  is_enabled boolean null default false,
  is_available_for_disbursement boolean null default true,
  is_available_for_repayment boolean null default true,
  requires_api_credentials boolean null default false,
  api_credentials jsonb null default '{}'::jsonb,
  api_environment character varying(20) null default 'sandbox'::character varying,
  webhook_url text null,
  webhook_secret text null,
  supported_countries text[] null default '{}'::text[],
  supported_currencies text[] null default '{}'::text[],
  fee_type character varying(20) null default 'none'::character varying,
  fee_percentage numeric(5, 4) null default 0,
  fee_fixed numeric(10, 2) null default 0,
  fee_currency character varying(3) null default 'USD'::character varying,
  fee_paid_by character varying(20) null default 'sender'::character varying,
  min_amount numeric(12, 2) null,
  max_amount numeric(12, 2) null,
  daily_limit numeric(12, 2) null,
  monthly_limit numeric(12, 2) null,
  estimated_transfer_days_min integer null default 0,
  estimated_transfer_days_max integer null default 0,
  requires_bank_connection boolean null default false,
  requires_account_identifier boolean null default true,
  account_identifier_label character varying(50) null,
  account_identifier_placeholder character varying(100) null,
  account_identifier_validation character varying(255) null,
  display_order integer null default 100,
  icon_name character varying(50) null,
  brand_color character varying(7) null,
  instructions text null,
  config jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint payment_providers_pkey primary key (id),
  constraint payment_providers_slug_key unique (slug),
  constraint payment_providers_api_environment_check check (
    (
      (api_environment)::text = any (
        (
          array[
            'sandbox'::character varying,
            'production'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_providers_fee_paid_by_check check (
    (
      (fee_paid_by)::text = any (
        (
          array[
            'sender'::character varying,
            'receiver'::character varying,
            'split'::character varying,
            'platform'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_providers_fee_type_check check (
    (
      (fee_type)::text = any (
        (
          array[
            'none'::character varying,
            'percentage'::character varying,
            'fixed'::character varying,
            'both'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_providers_provider_type_check check (
    (
      (provider_type)::text = any (
        (
          array[
            'automated'::character varying,
            'manual'::character varying,
            'mobile_money'::character varying,
            'cash'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- COUNTRY PAYMENT METHODS (Depends on countries and payment_providers)
-- =====================================================
create table public.country_payment_methods (
  id uuid not null default gen_random_uuid (),
  country_code character varying(2) not null,
  payment_provider_id uuid null,
  is_enabled boolean null default true,
  is_default_for_disbursement boolean null default false,
  is_default_for_repayment boolean null default false,
  fee_percentage_override numeric(5, 4) null,
  fee_fixed_override numeric(10, 2) null,
  min_amount_override numeric(12, 2) null,
  max_amount_override numeric(12, 2) null,
  display_order integer null default 100,
  created_at timestamp with time zone null default now(),
  constraint country_payment_methods_pkey primary key (id),
  constraint country_payment_methods_country_code_payment_provider_id_key unique (country_code, payment_provider_id),
  constraint country_payment_methods_payment_provider_id_fkey foreign KEY (payment_provider_id) references payment_providers (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- USER PAYMENT METHODS (Depends on users and payment_providers)
-- =====================================================
create table public.user_payment_methods (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  payment_provider_id uuid null,
  account_identifier character varying(255) null,
  account_name character varying(255) null,
  account_metadata jsonb null default '{}'::jsonb,
  is_verified boolean null default false,
  is_default boolean null default false,
  is_active boolean null default true,
  access_token text null,
  refresh_token text null,
  token_expires_at timestamp with time zone null,
  verified_at timestamp with time zone null,
  verification_method character varying(50) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_payment_methods_pkey primary key (id),
  constraint user_payment_methods_user_id_payment_provider_id_account_id_key unique (user_id, payment_provider_id, account_identifier),
  constraint user_payment_methods_payment_provider_id_fkey foreign KEY (payment_provider_id) references payment_providers (id) on delete CASCADE,
  constraint user_payment_methods_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- FEE CONFIGURATIONS
-- =====================================================
create table public.fee_configurations (
  id uuid not null default gen_random_uuid (),
  fee_type character varying(50) not null,
  fee_name character varying(100) not null,
  fee_mode character varying(20) not null default 'percentage'::character varying,
  fee_percentage numeric(5, 2) null default 0,
  flat_fee numeric(12, 2) null default 0,
  min_fee numeric(12, 2) null default 0,
  max_fee numeric(12, 2) null,
  applies_to character varying(50) not null,
  description text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint fee_configurations_pkey primary key (id),
  constraint fee_configurations_fee_type_key unique (fee_type)
) TABLESPACE pg_default;

-- =====================================================
-- FEE CHANGE HISTORY (Depends on fee_configurations)
-- =====================================================
create table public.fee_change_history (
  id uuid not null default gen_random_uuid (),
  fee_id uuid not null,
  fee_type character varying(50) not null,
  old_mode character varying(20) null,
  new_mode character varying(20) null,
  old_percentage numeric(5, 2) null,
  new_percentage numeric(5, 2) null,
  old_flat_fee numeric(12, 2) null,
  new_flat_fee numeric(12, 2) null,
  changed_at timestamp with time zone null default now(),
  changed_by uuid null,
  constraint fee_change_history_pkey primary key (id),
  constraint fee_change_history_changed_by_fkey foreign KEY (changed_by) references users (id),
  constraint fee_change_history_fee_id_fkey foreign KEY (fee_id) references fee_configurations (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- LOAN REQUESTS (Depends on users)
-- =====================================================
create table public.loan_requests (
  id uuid not null default extensions.uuid_generate_v4 (),
  amount numeric(12, 2) not null,
  currency text not null default 'USD'::text,
  purpose text not null,
  description text null,
  borrower_name text not null,
  borrower_email text not null,
  borrower_user_id uuid null,
  access_token text null,
  access_token_expires timestamp with time zone null,
  status text not null default 'pending'::text,
  accepted_by_email text null,
  accepted_by_name text null,
  accepted_at timestamp with time zone null,
  loan_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  proposed_frequency text null default 'monthly'::text,
  proposed_installments integer null default 1,
  proposed_payment_amount numeric(12, 2) null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_plaid_access_token text null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_account_type character varying(50) null,
  borrower_bank_connected boolean null default false,
  proposed_start_date date null,
  constraint loan_requests_pkey primary key (id),
  constraint loan_requests_borrower_user_id_fkey foreign KEY (borrower_user_id) references users (id) on delete set null,
  constraint loan_requests_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete set null,
  constraint loan_requests_proposed_frequency_check check (
    (
      proposed_frequency = any (
        array['weekly'::text, 'biweekly'::text, 'monthly'::text]
      )
    )
  ),
  constraint loan_requests_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'accepted'::text,
          'declined'::text,
          'expired'::text,
          'cancelled'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- GUEST LENDERS TABLE (Reference for loans)
-- =====================================================
-- Note: This table wasn't in your provided schema but is referenced in loans table
-- Creating a placeholder if it doesn't exist
create table if not exists public.guest_lenders (
  id uuid not null default gen_random_uuid (),
  email text,
  name text,
  created_at timestamp with time zone null default now(),
  constraint guest_lenders_pkey primary key (id)
) TABLESPACE pg_default;

-- =====================================================
-- LOANS (Core table with many dependencies)
-- =====================================================
create table public.loans (
  id uuid not null default extensions.uuid_generate_v4 (),
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text not null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null default false,
  amount numeric(12, 2) not null,
  currency text null default 'USD'::text,
  purpose text null,
  repayment_frequency text not null,
  repayment_amount numeric(12, 2) not null,
  total_installments integer not null,
  start_date date not null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text not null default 'pending'::text,
  amount_paid numeric(12, 2) null default 0,
  amount_remaining numeric(12, 2) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  interest_rate numeric(5, 2) null default 0,
  interest_type text null default 'simple'::text,
  total_interest numeric(12, 2) null default 0,
  total_amount numeric(12, 2) not null,
  contract_generated boolean null default false,
  contract_url text null,
  borrower_signed boolean null default false,
  borrower_signed_at timestamp with time zone null,
  borrower_signature_ip text null,
  lender_signed boolean null default false,
  lender_signed_at timestamp with time zone null,
  lender_signature_ip text null,
  auto_payment_enabled boolean null default false,
  auto_payment_reminder_sent boolean null default false,
  disbursement_method text null,
  mobile_money_provider text null,
  mobile_money_phone text null,
  mobile_money_name text null,
  pickup_person_phone text null,
  pickup_person_id_type text null,
  pickup_person_id_number text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  bank_swift_code text null,
  bank_branch text null,
  cancelled_at timestamp with time zone null,
  cancelled_reason text null,
  lender_interest_rate numeric(5, 2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null default false,
  guest_lender_id uuid null,
  cash_pickup_location text null,
  picker_full_name text null,
  picker_id_type text null,
  picker_id_number text null,
  picker_phone text null,
  bank_routing_number text null,
  is_for_recipient boolean null default false,
  recipient_name text null,
  recipient_phone text null,
  recipient_country text null,
  match_status text null default 'pending'::text,
  matched_at timestamp with time zone null,
  match_attempts integer null default 0,
  current_match_id uuid null,
  funds_sent boolean null default false,
  funds_sent_at timestamp with time zone null,
  funds_sent_method text null,
  funds_sent_reference text null,
  funds_sent_note text null,
  funds_disbursed boolean null default false,
  funds_disbursed_at timestamp with time zone null,
  funds_disbursed_reference text null,
  funds_sent_proof_url text null,
  borrower_invite_email text null,
  borrower_access_token text null,
  borrower_access_token_expires timestamp with time zone null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  lender_paypal_email text null,
  lender_cashapp_username text null,
  lender_venmo_username text null,
  lender_preferred_payment_method text null,
  disbursement_status character varying(50) null default 'pending'::character varying,
  disbursement_transfer_id character varying(255) null,
  disbursed_at timestamp with time zone null,
  auto_pay_enabled boolean null default true,
  last_payment_at timestamp with time zone null,
  lender_dwolla_customer_url text null,
  lender_dwolla_customer_id character varying(255) null,
  lender_dwolla_funding_source_url text null,
  lender_dwolla_funding_source_id character varying(255) null,
  lender_bank_name character varying(255) null,
  lender_bank_account_mask character varying(10) null,
  lender_bank_connected boolean null default false,
  lender_name character varying(255) null,
  lender_email character varying(255) null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_connected boolean null default false,
  borrower_name character varying(255) null,
  invite_accepted_at timestamp with time zone null,
  invite_username text null,
  loan_type_id uuid null,
  loan_request_id uuid null,
  auto_matched boolean null default false,
  country character varying(3) null,
  state character varying(10) null,
  completed_at timestamp with time zone null,
  disbursement_receipt_url text null,
  duration_fee_percent numeric(5, 2) null default 0,
  duration_fee_amount numeric(12, 2) null default 0,
  uses_apr_calculation boolean null default false,
  constraint loans_pkey primary key (id),
  constraint loans_invite_token_key unique (invite_token),
  constraint loans_borrower_id_fkey foreign KEY (borrower_id) references users (id) on delete CASCADE,
  constraint loans_loan_request_id_fkey foreign KEY (loan_request_id) references loan_requests (id) on delete set null,
  constraint loans_lender_id_fkey foreign KEY (lender_id) references users (id) on delete set null,
  constraint loans_business_lender_id_fkey foreign KEY (business_lender_id) references business_profiles (id) on delete set null,
  constraint loans_guest_lender_id_fkey foreign KEY (guest_lender_id) references guest_lenders (id) on delete set null,
  constraint loans_current_match_id_fkey foreign KEY (current_match_id) references loan_matches (id),
  constraint check_total_interest check (
    (
      (uses_apr_calculation = true)
      or (
        abs(
          (
            total_interest - (amount * (interest_rate / (100)::numeric))
          )
        ) < 0.01
      )
    )
  ),
  constraint loans_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'pending_signature'::text,
          'pending_funds'::text,
          'active'::text,
          'completed'::text,
          'declined'::text,
          'cancelled'::text
        ]
      )
    )
  ),
  constraint loans_borrower_payment_method_check check (
    (
      borrower_payment_method = any (
        array['paypal'::text, 'cashapp'::text, 'venmo'::text]
      )
    )
  ),
  constraint loans_disbursement_method_check check (
    (
      disbursement_method = any (
        array[
          'paypal'::text,
          'mobile_money'::text,
          'cash_pickup'::text,
          'bank_transfer'::text
        ]
      )
    )
  ),
  constraint loans_interest_type_check check (
    (
      interest_type = any (array['simple'::text, 'compound'::text])
    )
  ),
  constraint loans_lender_interest_type_check check (
    (
      lender_interest_type = any (array['simple'::text, 'compound'::text])
    )
  ),
  constraint loans_lender_type_check check (
    (
      lender_type = any (array['business'::text, 'personal'::text])
    )
  ),
  constraint loans_match_status_check check (
    (
      match_status = any (
        array[
          'pending'::text,
          'matching'::text,
          'matched'::text,
          'no_match'::text,
          'manual'::text
        ]
      )
    )
  ),
  constraint loans_repayment_frequency_check check (
    (
      repayment_frequency = any (
        array[
          'weekly'::text,
          'biweekly'::text,
          'monthly'::text,
          'custom'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- LOAN MATCHES (Depends on loans, users, business_profiles)
-- =====================================================
create table public.loan_matches (
  id uuid not null default gen_random_uuid (),
  loan_id uuid not null,
  lender_user_id uuid null,
  lender_business_id uuid null,
  match_score numeric(5, 2) null,
  match_rank integer null,
  status text null default 'pending'::text,
  offered_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + '24:00:00'::interval),
  responded_at timestamp with time zone null,
  was_auto_accepted boolean null default false,
  decline_reason text null,
  created_at timestamp with time zone null default now(),
  constraint loan_matches_pkey primary key (id),
  constraint loan_matches_lender_business_id_fkey foreign KEY (lender_business_id) references business_profiles (id),
  constraint loan_matches_lender_user_id_fkey foreign KEY (lender_user_id) references users (id),
  constraint loan_matches_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete CASCADE,
  constraint loan_matches_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'accepted'::text,
          'declined'::text,
          'expired'::text,
          'auto_accepted'::text,
          'skipped'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- LOAN INTEREST CORRECTIONS (Depends on loans)
-- =====================================================
create table public.loan_interest_corrections (
  id uuid not null default gen_random_uuid (),
  loan_id uuid null,
  old_repayment_amount numeric(12, 2) null,
  new_repayment_amount numeric(12, 2) null,
  difference numeric(12, 2) null,
  corrected_at timestamp without time zone null default now(),
  correction_reason text null default 'Fixed APR calculation bug'::text,
  constraint loan_interest_corrections_pkey primary key (id),
  constraint loan_interest_corrections_loan_id_fkey foreign KEY (loan_id) references loans (id)
) TABLESPACE pg_default;

-- =====================================================
-- PAYMENT SCHEDULE (Depends on loans)
-- =====================================================
create table public.payment_schedule (
  id uuid not null default extensions.uuid_generate_v4 (),
  loan_id uuid not null,
  due_date date not null,
  amount numeric(12, 2) not null,
  is_paid boolean null default false,
  payment_id uuid null,
  created_at timestamp with time zone null default now(),
  principal_amount numeric(12, 2) not null,
  interest_amount numeric(12, 2) null default 0,
  paid_days_diff integer null,
  reminder_sent_at timestamp with time zone null,
  overdue_reminder_sent_at timestamp with time zone null,
  status text null default 'pending'::text,
  last_manual_reminder_at timestamp with time zone null,
  manual_reminder_count integer null default 0,
  transfer_id character varying(255) null,
  paid_at timestamp with time zone null,
  notes text null,
  platform_fee numeric(10, 2) null default 0,
  retry_count integer null default 0,
  last_retry_at timestamp with time zone null,
  next_retry_at timestamp with time zone null,
  retry_history jsonb null default '[]'::jsonb,
  caused_block boolean null default false,
  payment_status character varying(20) null default 'pending'::character varying,
  manual_payment boolean null default false,
  payment_method text null,
  payment_reference text null,
  marked_paid_by uuid null,
  transaction_reference text null,
  payment_proof_url text null,
  constraint payment_schedule_pkey primary key (id),
  constraint fk_payment foreign KEY (payment_id) references payments (id) on delete set null,
  constraint payment_schedule_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete CASCADE,
  constraint payment_schedule_marked_paid_by_fkey foreign KEY (marked_paid_by) references users (id),
  constraint payment_schedule_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'paid'::text,
          'overdue'::text,
          'missed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- PAYMENTS (Depends on loans and payment_schedule)
-- =====================================================
create table public.payments (
  id uuid not null default extensions.uuid_generate_v4 (),
  loan_id uuid not null,
  schedule_id uuid null,
  amount numeric(12, 2) not null,
  payment_date timestamp with time zone not null,
  status text not null default 'pending'::text,
  confirmed_by uuid null,
  confirmation_date timestamp with time zone null,
  note text null,
  proof_url text null,
  paypal_transaction_id text null,
  created_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_confirmed_by_fkey foreign KEY (confirmed_by) references users (id) on delete set null,
  constraint payments_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete CASCADE,
  constraint payments_schedule_id_fkey foreign KEY (schedule_id) references payment_schedule (id) on delete set null,
  constraint payments_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'confirmed'::text,
          'disputed'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- PAYMENT TRANSACTIONS (Depends on multiple tables)
-- =====================================================
create table public.payment_transactions (
  id uuid not null default gen_random_uuid (),
  loan_id uuid null,
  payment_schedule_id uuid null,
  payment_provider_id uuid null,
  sender_id uuid null,
  receiver_id uuid null,
  sender_payment_method_id uuid null,
  receiver_payment_method_id uuid null,
  transaction_type character varying(20) not null,
  amount numeric(12, 2) not null,
  currency character varying(3) null default 'USD'::character varying,
  fee_amount numeric(10, 2) null default 0,
  net_amount numeric(12, 2) null,
  status character varying(20) null default 'pending'::character varying,
  provider_transaction_id character varying(255) null,
  provider_status character varying(50) null,
  provider_response jsonb null,
  proof_type character varying(20) null,
  proof_url text null,
  proof_reference character varying(255) null,
  proof_uploaded_at timestamp with time zone null,
  proof_uploaded_by uuid null,
  confirmed_by uuid null,
  confirmed_at timestamp with time zone null,
  confirmation_note text null,
  disputed_at timestamp with time zone null,
  disputed_by uuid null,
  dispute_reason text null,
  dispute_resolved_at timestamp with time zone null,
  dispute_resolution text null,
  description text null,
  metadata jsonb null default '{}'::jsonb,
  ip_address inet null,
  user_agent text null,
  initiated_at timestamp with time zone null default now(),
  completed_at timestamp with time zone null,
  failed_at timestamp with time zone null,
  failure_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint payment_transactions_pkey primary key (id),
  constraint payment_transactions_disputed_by_fkey foreign KEY (disputed_by) references users (id),
  constraint payment_transactions_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete set null,
  constraint payment_transactions_payment_provider_id_fkey foreign KEY (payment_provider_id) references payment_providers (id),
  constraint payment_transactions_payment_schedule_id_fkey foreign KEY (payment_schedule_id) references payment_schedule (id) on delete set null,
  constraint payment_transactions_confirmed_by_fkey foreign KEY (confirmed_by) references users (id),
  constraint payment_transactions_receiver_payment_method_id_fkey foreign KEY (receiver_payment_method_id) references user_payment_methods (id),
  constraint payment_transactions_sender_id_fkey foreign KEY (sender_id) references users (id),
  constraint payment_transactions_sender_payment_method_id_fkey foreign KEY (sender_payment_method_id) references user_payment_methods (id),
  constraint payment_transactions_proof_uploaded_by_fkey foreign KEY (proof_uploaded_by) references users (id),
  constraint payment_transactions_receiver_id_fkey foreign KEY (receiver_id) references users (id),
  constraint payment_transactions_proof_type_check check (
    (
      (proof_type)::text = any (
        (
          array[
            'screenshot'::character varying,
            'receipt'::character varying,
            'reference_number'::character varying,
            'photo'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_transactions_transaction_type_check check (
    (
      (transaction_type)::text = any (
        (
          array[
            'disbursement'::character varying,
            'repayment'::character varying,
            'refund'::character varying,
            'fee'::character varying
          ]
        )::text[]
      )
    )
  ),
  constraint payment_transactions_status_check check (
    (
      (status)::text = any (
        (
          array[
            'pending'::character varying,
            'awaiting_proof'::character varying,
            'awaiting_confirmation'::character varying,
            'processing'::character varying,
            'completed'::character varying,
            'failed'::character varying,
            'cancelled'::character varying,
            'disputed'::character varying,
            'refunded'::character varying
          ]
        )::text[]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- PAYMENT RETRY LOG (Depends on payments, loans, users)
-- =====================================================
create table public.payment_retry_log (
  id uuid not null default gen_random_uuid (),
  payment_id uuid not null,
  loan_id uuid null,
  borrower_id uuid null,
  retry_number integer not null,
  attempted_at timestamp with time zone not null default now(),
  amount numeric(12, 2) null,
  success boolean not null default false,
  error_message text null,
  payment_method character varying(50) null,
  will_block_on_failure boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint payment_retry_log_pkey primary key (id),
  constraint payment_retry_log_borrower_id_fkey foreign KEY (borrower_id) references users (id),
  constraint payment_retry_log_loan_id_fkey foreign KEY (loan_id) references loans (id)
) TABLESPACE pg_default;

-- =====================================================
-- BORROWER BLOCKS (Depends on users, loans)
-- =====================================================
create table public.borrower_blocks (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  loan_id uuid null,
  blocked_at timestamp with time zone not null default now(),
  blocked_reason text null,
  total_debt_at_block numeric(12, 2) null,
  debt_cleared_at timestamp with time zone null,
  restriction_ends_at timestamp with time zone null,
  restriction_lifted_at timestamp with time zone null,
  lifted_by uuid null,
  status character varying(20) null default 'active'::character varying,
  created_at timestamp with time zone null default now(),
  constraint borrower_blocks_pkey primary key (id),
  constraint borrower_blocks_lifted_by_fkey foreign KEY (lifted_by) references users (id),
  constraint borrower_blocks_loan_id_fkey foreign KEY (loan_id) references loans (id),
  constraint borrower_blocks_user_id_fkey foreign KEY (user_id) references users (id)
) TABLESPACE pg_default;

-- =====================================================
-- TRUST SCORES (Depends on users)
-- =====================================================
create table public.trust_scores (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  score integer not null default 50,
  score_grade text not null default 'C'::text,
  score_label text not null default 'Building Trust'::text,
  payment_score integer null default 50,
  completion_score integer null default 50,
  social_score integer null default 50,
  verification_score integer null default 0,
  tenure_score integer null default 0,
  total_loans integer null default 0,
  completed_loans integer null default 0,
  active_loans integer null default 0,
  defaulted_loans integer null default 0,
  total_payments integer null default 0,
  ontime_payments integer null default 0,
  early_payments integer null default 0,
  late_payments integer null default 0,
  missed_payments integer null default 0,
  total_amount_borrowed numeric(12, 2) null default 0,
  total_amount_repaid numeric(12, 2) null default 0,
  current_streak integer null default 0,
  best_streak integer null default 0,
  vouches_received integer null default 0,
  vouches_given integer null default 0,
  vouch_defaults integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  last_calculated_at timestamp with time zone null default now(),
  constraint trust_scores_pkey primary key (id),
  constraint trust_scores_user_id_key unique (user_id),
  constraint trust_scores_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint trust_scores_score_check check (
    (
      (score >= 0)
      and (score <= 100)
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- TRUST SCORE HISTORY (Depends on users, loans)
-- =====================================================
create table public.trust_score_history (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  score integer not null,
  score_grade text not null,
  change_amount integer null,
  change_reason text null,
  payment_score integer null,
  completion_score integer null,
  social_score integer null,
  verification_score integer null,
  tenure_score integer null,
  related_loan_id uuid null,
  related_payment_id uuid null,
  related_vouch_id uuid null,
  created_at timestamp with time zone null default now(),
  constraint trust_score_history_pkey primary key (id),
  constraint trust_score_history_related_loan_id_fkey foreign KEY (related_loan_id) references loans (id),
  constraint trust_score_history_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- TRUST SCORE EVENTS (Depends on users, loans)
-- =====================================================
create table public.trust_score_events (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  event_type text not null,
  score_impact integer not null default 0,
  title text not null,
  description text null,
  loan_id uuid null,
  payment_id uuid null,
  other_user_id uuid null,
  vouch_id uuid null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint trust_score_events_pkey primary key (id),
  constraint trust_score_events_loan_id_fkey foreign KEY (loan_id) references loans (id),
  constraint trust_score_events_other_user_id_fkey foreign KEY (other_user_id) references users (id),
  constraint trust_score_events_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE
) TABLESPACE pg_default;

-- =====================================================
-- VOUCHES (Depends on users)
-- =====================================================
create table public.vouches (
  id uuid not null default gen_random_uuid (),
  voucher_id uuid not null,
  vouchee_id uuid not null,
  vouch_type text not null default 'character'::text,
  relationship text not null,
  relationship_details text null,
  known_years integer null,
  known_since date null,
  message text null,
  guarantee_percentage integer null default 0,
  guarantee_max_amount numeric(12, 2) null default 0,
  guarantee_used numeric(12, 2) null default 0,
  vouch_strength integer null default 0,
  trust_score_boost integer null default 0,
  status text null default 'active'::text,
  loans_active integer null default 0,
  loans_completed integer null default 0,
  loans_defaulted integer null default 0,
  is_public boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null,
  revoked_at timestamp with time zone null,
  revoked_reason text null,
  constraint vouches_pkey primary key (id),
  constraint vouches_voucher_id_vouchee_id_key unique (voucher_id, vouchee_id),
  constraint vouches_vouchee_id_fkey foreign KEY (vouchee_id) references users (id) on delete CASCADE,
  constraint vouches_voucher_id_fkey foreign KEY (voucher_id) references users (id) on delete CASCADE,
  constraint vouches_guarantee_percentage_check check (
    (
      (guarantee_percentage >= 0)
      and (guarantee_percentage <= 100)
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- VOUCH REQUESTS (Depends on users, vouches)
-- =====================================================
create table public.vouch_requests (
  id uuid not null default gen_random_uuid (),
  requester_id uuid not null,
  requested_user_id uuid null,
  requested_email text null,
  requested_name text null,
  message text null,
  suggested_relationship text null,
  status text null default 'pending'::text,
  response_message text null,
  responded_at timestamp with time zone null,
  vouch_id uuid null,
  created_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + '30 days'::interval),
  invite_token text null,
  constraint vouch_requests_pkey primary key (id),
  constraint vouch_requests_invite_token_key unique (invite_token),
  constraint vouch_requests_requested_user_id_fkey foreign KEY (requested_user_id) references users (id),
  constraint vouch_requests_requester_id_fkey foreign KEY (requester_id) references users (id) on delete CASCADE,
  constraint vouch_requests_vouch_id_fkey foreign KEY (vouch_id) references vouches (id)
) TABLESPACE pg_default;

-- =====================================================
-- BORROWER BUSINESS TRUST (Depends on users, business_profiles)
-- =====================================================
create table public.borrower_business_trust (
  id uuid not null default gen_random_uuid (),
  borrower_id uuid not null,
  business_id uuid not null,
  completed_loan_count integer null default 0,
  total_amount_borrowed numeric(12, 2) null default 0,
  total_amount_repaid numeric(12, 2) null default 0,
  has_graduated boolean null default false,
  graduated_at timestamp with time zone null,
  has_defaulted boolean null default false,
  default_count integer null default 0,
  last_default_at timestamp with time zone null,
  late_payment_count integer null default 0,
  on_time_payment_count integer null default 0,
  trust_status text null default 'new'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint borrower_business_trust_pkey primary key (id),
  constraint borrower_business_trust_borrower_id_business_id_key unique (borrower_id, business_id),
  constraint borrower_business_trust_borrower_id_fkey foreign KEY (borrower_id) references auth.users (id) on delete CASCADE,
  constraint borrower_business_trust_business_id_fkey foreign KEY (business_id) references business_profiles (id) on delete CASCADE,
  constraint borrower_business_trust_trust_status_check check (
    (
      trust_status = any (
        array[
          'new'::text,
          'building'::text,
          'graduated'::text,
          'suspended'::text,
          'banned'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- USER FINANCIAL PROFILES (Depends on users)
-- =====================================================
create table public.user_financial_profiles (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  pay_frequency text not null default 'biweekly'::text,
  pay_amount numeric(12, 2) not null default 0,
  pay_day_of_week integer null,
  pay_day_of_month integer null,
  second_pay_day_of_month integer null,
  rent_mortgage numeric(12, 2) not null default 0,
  utilities numeric(12, 2) not null default 0,
  transportation numeric(12, 2) not null default 0,
  insurance numeric(12, 2) not null default 0,
  groceries numeric(12, 2) not null default 0,
  phone numeric(12, 2) not null default 0,
  subscriptions numeric(12, 2) not null default 0,
  childcare numeric(12, 2) not null default 0,
  other_bills numeric(12, 2) not null default 0,
  existing_debt_payments numeric(12, 2) not null default 0,
  monthly_income numeric GENERATED ALWAYS as (
    case pay_frequency
      when 'weekly'::text then (pay_amount * 4.33)
      when 'biweekly'::text then (pay_amount * 2.17)
      when 'semimonthly'::text then (pay_amount * (2)::numeric)
      when 'monthly'::text then pay_amount
      else (0)::numeric
    end
  ) STORED,
  monthly_expenses numeric GENERATED ALWAYS as (
    (
      (
        (
          (
            (
              (
                (
                  ((rent_mortgage + utilities) + transportation) + insurance
                ) + groceries
              ) + phone
            ) + subscriptions
          ) + childcare
        ) + other_bills
      ) + existing_debt_payments
    )
  ) STORED,
  preferred_payment_buffer_days integer null default 2,
  comfort_level text null default 'balanced'::text,
  is_complete boolean null default false,
  last_updated timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_financial_profiles_pkey primary key (id),
  constraint unique_user_financial_profile unique (user_id),
  constraint user_financial_profiles_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint user_financial_profiles_pay_day_of_week_check check (
    (
      (pay_day_of_week >= 0)
      and (pay_day_of_week <= 6)
    )
  ),
  constraint user_financial_profiles_pay_frequency_check check (
    (
      pay_frequency = any (
        array[
          'weekly'::text,
          'biweekly'::text,
          'semimonthly'::text,
          'monthly'::text
        ]
      )
    )
  ),
  constraint user_financial_profiles_pay_day_of_month_check check (
    (
      (pay_day_of_month >= 1)
      and (pay_day_of_month <= 31)
    )
  ),
  constraint user_financial_profiles_second_pay_day_of_month_check check (
    (
      (second_pay_day_of_month >= 1)
      and (second_pay_day_of_month <= 31)
    )
  ),
  constraint user_financial_profiles_comfort_level_check check (
    (
      comfort_level = any (
        array[
          'comfortable'::text,
          'balanced'::text,
          'aggressive'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- PENDING LOAN REQUESTS (Depends on users, business_profiles)
-- =====================================================
create table public.pending_loan_requests (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  business_lender_id uuid null,
  personal_lender_id uuid null,
  amount numeric(12, 2) not null,
  purpose text not null,
  description text null,
  term_months integer not null default 3,
  status text not null default 'awaiting_verification'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  processed_at timestamp with time zone null,
  constraint pending_loan_requests_pkey primary key (id),
  constraint pending_loan_requests_user_id_business_lender_id_key unique (user_id, business_lender_id),
  constraint pending_loan_requests_business_lender_id_fkey foreign KEY (business_lender_id) references business_profiles (id) on delete set null,
  constraint pending_loan_requests_personal_lender_id_fkey foreign KEY (personal_lender_id) references users (id) on delete set null,
  constraint pending_loan_requests_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint pending_loan_requests_status_check check (
    (
      status = any (
        array[
          'awaiting_verification'::text,
          'verification_approved'::text,
          'loan_created'::text,
          'cancelled'::text,
          'expired'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- NOTIFICATIONS (Depends on users, loans)
-- =====================================================
create table public.notifications (
  id uuid not null default extensions.uuid_generate_v4 (),
  user_id uuid not null,
  loan_id uuid null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  data jsonb not null default '{}'::jsonb,
  constraint notifications_pkey primary key (id),
  constraint notifications_loan_id_fkey foreign KEY (loan_id) references loans (id) on delete CASCADE,
  constraint notifications_user_id_fkey foreign KEY (user_id) references users (id) on delete CASCADE,
  constraint notifications_type_check check (
    (
      type = any (
        array[
          'reminder'::text,
          'payment_received'::text,
          'payment_confirmed'::text,
          'loan_request'::text,
          'loan_accepted'::text,
          'loan_declined'::text,
          'loan_cancelled'::text,
          'contract_signed'::text,
          'paypal_required'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

-- =====================================================
-- ADMIN EMAILS (Depends on users)
-- =====================================================
create table public.admin_emails (
  id uuid not null default extensions.uuid_generate_v4 (),
  email_type character varying(50) not null,
  subject text not null,
  body text not null,
  recipient_type character varying(50) not null,
  recipient_ids uuid[] not null,
  recipient_count integer not null default 0,
  status character varying(50) not null default 'pending'::character varying,
  error_message text null,
  sent_by uuid null,
  sent_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint admin_emails_pkey primary key (id),
  constraint admin_emails_sent_by_fkey foreign KEY (sent_by) references users (id) on delete set null
) TABLESPACE pg_default;

-- =====================================================
-- ADMIN EMAIL LOGS (Depends on users)
-- =====================================================
create table public.admin_email_logs (
  id uuid not null default gen_random_uuid (),
  created_at timestamp with time zone null default now(),
  subject text not null,
  body text not null,
  email_type text not null,
  recipient_type text not null,
  recipients_count integer not null default 0,
  recipient_ids text[] null,
  sent_by uuid null,
  sent_at timestamp with time zone null,
  status text not null default 'pending'::text,
  success_count integer null default 0,
  failed_count integer null default 0,
  metadata jsonb null default '{}'::jsonb,
  constraint admin_email_logs_pkey primary key (id),
  constraint admin_email_logs_sent_by_fkey foreign KEY (sent_by) references users (id) on delete set null
) TABLESPACE pg_default;

-- =====================================================
-- CRON JOB RUNS (Depends on users)
-- =====================================================
create table public.cron_job_runs (
  id uuid not null default gen_random_uuid (),
  job_name character varying(100) not null,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone null,
  duration_ms integer null,
  status character varying(20) not null default 'running'::character varying,
  items_processed integer null default 0,
  result jsonb null,
  error_message text null,
  triggered_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint cron_job_runs_pkey primary key (id),
  constraint cron_job_runs_triggered_by_fkey foreign KEY (triggered_by) references users (id) on delete set null
) TABLESPACE pg_default;

-- =====================================================
-- PLATFORM SETTINGS
-- =====================================================
create table public.platform_settings (
  id uuid not null default gen_random_uuid (),
  key character varying(100) not null,
  value jsonb not null,
  value_type character varying(20) null default 'string'::character varying,
  category character varying(50) null default 'general'::character varying,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint platform_settings_pkey primary key (id),
  constraint platform_settings_key_key unique (key)
) TABLESPACE pg_default;

-- =====================================================
-- WAITLIST
-- =====================================================
create table public.waitlist (
  id uuid not null default gen_random_uuid (),
  email character varying(255) not null,
  full_name character varying(255) null,
  interest_type character varying(50) not null,
  created_at timestamp with time zone null default now(),
  constraint waitlist_pkey primary key (id),
  constraint waitlist_email_key unique (email)
) TABLESPACE pg_default;

-- =====================================================
-- LOANS BACKUP TABLES (for data migration/backup purposes)
-- =====================================================

create table public.loans_backup (
  id uuid null,
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null,
  amount numeric(12, 2) null,
  currency text null,
  purpose text null,
  repayment_frequency text null,
  repayment_amount numeric(12, 2) null,
  total_installments integer null,
  start_date date null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text null,
  amount_paid numeric(12, 2) null,
  amount_remaining numeric(12, 2) null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  interest_rate numeric(5, 2) null,
  interest_type text null,
  total_interest numeric(12, 2) null,
  total_amount numeric(12, 2) null,
  contract_generated boolean null,
  contract_url text null,
  borrower_signed boolean null,
  borrower_signed_at timestamp with time zone null,
  borrower_signature_ip text null,
  lender_signed boolean null,
  lender_signed_at timestamp with time zone null,
  lender_signature_ip text null,
  auto_payment_enabled boolean null,
  auto_payment_reminder_sent boolean null,
  disbursement_method text null,
  mobile_money_provider text null,
  mobile_money_phone text null,
  mobile_money_name text null,
  pickup_person_phone text null,
  pickup_person_id_type text null,
  pickup_person_id_number text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  bank_swift_code text null,
  bank_branch text null,
  cancelled_at timestamp with time zone null,
  cancelled_reason text null,
  lender_interest_rate numeric(5, 2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null,
  guest_lender_id uuid null,
  cash_pickup_location text null,
  picker_full_name text null,
  picker_id_type text null,
  picker_id_number text null,
  picker_phone text null,
  bank_routing_number text null,
  is_for_recipient boolean null,
  recipient_name text null,
  recipient_phone text null,
  recipient_country text null,
  match_status text null,
  matched_at timestamp with time zone null,
  match_attempts integer null,
  current_match_id uuid null,
  funds_sent boolean null,
  funds_sent_at timestamp with time zone null,
  funds_sent_method text null,
  funds_sent_reference text null,
  funds_sent_note text null,
  funds_disbursed boolean null,
  funds_disbursed_at timestamp with time zone null,
  funds_disbursed_reference text null,
  funds_sent_proof_url text null,
  borrower_invite_email text null,
  borrower_access_token text null,
  borrower_access_token_expires timestamp with time zone null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  lender_paypal_email text null,
  lender_cashapp_username text null,
  lender_venmo_username text null,
  lender_preferred_payment_method text null,
  disbursement_status character varying(50) null,
  disbursement_transfer_id character varying(255) null,
  disbursed_at timestamp with time zone null,
  auto_pay_enabled boolean null,
  last_payment_at timestamp with time zone null,
  lender_dwolla_customer_url text null,
  lender_dwolla_customer_id character varying(255) null,
  lender_dwolla_funding_source_url text null,
  lender_dwolla_funding_source_id character varying(255) null,
  lender_bank_name character varying(255) null,
  lender_bank_account_mask character varying(10) null,
  lender_bank_connected boolean null,
  lender_name character varying(255) null,
  lender_email character varying(255) null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_connected boolean null,
  borrower_name character varying(255) null,
  invite_accepted_at timestamp with time zone null,
  invite_username text null,
  loan_type_id uuid null,
  loan_request_id uuid null,
  auto_matched boolean null,
  country character varying(3) null,
  state character varying(10) null,
  completed_at timestamp with time zone null,
  disbursement_receipt_url text null,
  duration_fee_percent numeric(5, 2) null,
  duration_fee_amount numeric(12, 2) null
) TABLESPACE pg_default;

create table public.loans_backup_before_interest_fix (
  id uuid null,
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null,
  amount numeric(12, 2) null,
  currency text null,
  purpose text null,
  repayment_frequency text null,
  repayment_amount numeric(12, 2) null,
  total_installments integer null,
  start_date date null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text null,
  amount_paid numeric(12, 2) null,
  amount_remaining numeric(12, 2) null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  interest_rate numeric(5, 2) null,
  interest_type text null,
  total_interest numeric(12, 2) null,
  total_amount numeric(12, 2) null,
  contract_generated boolean null,
  contract_url text null,
  borrower_signed boolean null,
  borrower_signed_at timestamp with time zone null,
  borrower_signature_ip text null,
  lender_signed boolean null,
  lender_signed_at timestamp with time zone null,
  lender_signature_ip text null,
  auto_payment_enabled boolean null,
  auto_payment_reminder_sent boolean null,
  disbursement_method text null,
  mobile_money_provider text null,
  mobile_money_phone text null,
  mobile_money_name text null,
  pickup_person_phone text null,
  pickup_person_id_type text null,
  pickup_person_id_number text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  bank_swift_code text null,
  bank_branch text null,
  cancelled_at timestamp with time zone null,
  cancelled_reason text null,
  lender_interest_rate numeric(5, 2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null,
  guest_lender_id uuid null,
  cash_pickup_location text null,
  picker_full_name text null,
  picker_id_type text null,
  picker_id_number text null,
  picker_phone text null,
  bank_routing_number text null,
  is_for_recipient boolean null,
  recipient_name text null,
  recipient_phone text null,
  recipient_country text null,
  match_status text null,
  matched_at timestamp with time zone null,
  match_attempts integer null,
  current_match_id uuid null,
  funds_sent boolean null,
  funds_sent_at timestamp with time zone null,
  funds_sent_method text null,
  funds_sent_reference text null,
  funds_sent_note text null,
  funds_disbursed boolean null,
  funds_disbursed_at timestamp with time zone null,
  funds_disbursed_reference text null,
  funds_sent_proof_url text null,
  borrower_invite_email text null,
  borrower_access_token text null,
  borrower_access_token_expires timestamp with time zone null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  lender_paypal_email text null,
  lender_cashapp_username text null,
  lender_venmo_username text null,
  lender_preferred_payment_method text null,
  disbursement_status character varying(50) null,
  disbursement_transfer_id character varying(255) null,
  disbursed_at timestamp with time zone null,
  auto_pay_enabled boolean null,
  last_payment_at timestamp with time zone null,
  lender_dwolla_customer_url text null,
  lender_dwolla_customer_id character varying(255) null,
  lender_dwolla_funding_source_url text null,
  lender_dwolla_funding_source_id character varying(255) null,
  lender_bank_name character varying(255) null,
  lender_bank_account_mask character varying(10) null,
  lender_bank_connected boolean null,
  lender_name character varying(255) null,
  lender_email character varying(255) null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_connected boolean null,
  borrower_name character varying(255) null,
  invite_accepted_at timestamp with time zone null,
  invite_username text null,
  loan_type_id uuid null,
  loan_request_id uuid null,
  auto_matched boolean null,
  country character varying(3) null,
  state character varying(10) null,
  completed_at timestamp with time zone null,
  disbursement_receipt_url text null,
  duration_fee_percent numeric(5, 2) null,
  duration_fee_amount numeric(12, 2) null
) TABLESPACE pg_default;

create table public.loans_backup_feb_14_2026 (
  id uuid null,
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null,
  amount numeric(12, 2) null,
  currency text null,
  purpose text null,
  repayment_frequency text null,
  repayment_amount numeric(12, 2) null,
  total_installments integer null,
  start_date date null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text null,
  amount_paid numeric(12, 2) null,
  amount_remaining numeric(12, 2) null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  interest_rate numeric(5, 2) null,
  interest_type text null,
  total_interest numeric(12, 2) null,
  total_amount numeric(12, 2) null,
  contract_generated boolean null,
  contract_url text null,
  borrower_signed boolean null,
  borrower_signed_at timestamp with time zone null,
  borrower_signature_ip text null,
  lender_signed boolean null,
  lender_signed_at timestamp with time zone null,
  lender_signature_ip text null,
  auto_payment_enabled boolean null,
  auto_payment_reminder_sent boolean null,
  disbursement_method text null,
  mobile_money_provider text null,
  mobile_money_phone text null,
  mobile_money_name text null,
  pickup_person_phone text null,
  pickup_person_id_type text null,
  pickup_person_id_number text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  bank_swift_code text null,
  bank_branch text null,
  cancelled_at timestamp with time zone null,
  cancelled_reason text null,
  lender_interest_rate numeric(5, 2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null,
  guest_lender_id uuid null,
  cash_pickup_location text null,
  picker_full_name text null,
  picker_id_type text null,
  picker_id_number text null,
  picker_phone text null,
  bank_routing_number text null,
  is_for_recipient boolean null,
  recipient_name text null,
  recipient_phone text null,
  recipient_country text null,
  match_status text null,
  matched_at timestamp with time zone null,
  match_attempts integer null,
  current_match_id uuid null,
  funds_sent boolean null,
  funds_sent_at timestamp with time zone null,
  funds_sent_method text null,
  funds_sent_reference text null,
  funds_sent_note text null,
  funds_disbursed boolean null,
  funds_disbursed_at timestamp with time zone null,
  funds_disbursed_reference text null,
  funds_sent_proof_url text null,
  borrower_invite_email text null,
  borrower_access_token text null,
  borrower_access_token_expires timestamp with time zone null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  lender_paypal_email text null,
  lender_cashapp_username text null,
  lender_venmo_username text null,
  lender_preferred_payment_method text null,
  disbursement_status character varying(50) null,
  disbursement_transfer_id character varying(255) null,
  disbursed_at timestamp with time zone null,
  auto_pay_enabled boolean null,
  last_payment_at timestamp with time zone null,
  lender_dwolla_customer_url text null,
  lender_dwolla_customer_id character varying(255) null,
  lender_dwolla_funding_source_url text null,
  lender_dwolla_funding_source_id character varying(255) null,
  lender_bank_name character varying(255) null,
  lender_bank_account_mask character varying(10) null,
  lender_bank_connected boolean null,
  lender_name character varying(255) null,
  lender_email character varying(255) null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_connected boolean null,
  borrower_name character varying(255) null,
  invite_accepted_at timestamp with time zone null,
  invite_username text null,
  loan_type_id uuid null,
  loan_request_id uuid null,
  auto_matched boolean null,
  country character varying(3) null,
  state character varying(10) null,
  completed_at timestamp with time zone null,
  disbursement_receipt_url text null,
  duration_fee_percent numeric(5, 2) null,
  duration_fee_amount numeric(12, 2) null,
  uses_apr_calculation boolean null
) TABLESPACE pg_default;

create table public.loans_backup_interest_fix (
  id uuid null,
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null,
  amount numeric(12, 2) null,
  currency text null,
  purpose text null,
  repayment_frequency text null,
  repayment_amount numeric(12, 2) null,
  total_installments integer null,
  start_date date null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text null,
  amount_paid numeric(12, 2) null,
  amount_remaining numeric(12, 2) null,
  created_at timestamp with time zone null,
  updated_at timestamp with time zone null,
  interest_rate numeric(5, 2) null,
  interest_type text null,
  total_interest numeric(12, 2) null,
  total_amount numeric(12, 2) null,
  contract_generated boolean null,
  contract_url text null,
  borrower_signed boolean null,
  borrower_signed_at timestamp with time zone null,
  borrower_signature_ip text null,
  lender_signed boolean null,
  lender_signed_at timestamp with time zone null,
  lender_signature_ip text null,
  auto_payment_enabled boolean null,
  auto_payment_reminder_sent boolean null,
  disbursement_method text null,
  mobile_money_provider text null,
  mobile_money_phone text null,
  mobile_money_name text null,
  pickup_person_phone text null,
  pickup_person_id_type text null,
  pickup_person_id_number text null,
  bank_name text null,
  bank_account_name text null,
  bank_account_number text null,
  bank_swift_code text null,
  bank_branch text null,
  cancelled_at timestamp with time zone null,
  cancelled_reason text null,
  lender_interest_rate numeric(5, 2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null,
  guest_lender_id uuid null,
  cash_pickup_location text null,
  picker_full_name text null,
  picker_id_type text null,
  picker_id_number text null,
  picker_phone text null,
  bank_routing_number text null,
  is_for_recipient boolean null,
  recipient_name text null,
  recipient_phone text null,
  recipient_country text null,
  match_status text null,
  matched_at timestamp with time zone null,
  match_attempts integer null,
  current_match_id uuid null,
  funds_sent boolean null,
  funds_sent_at timestamp with time zone null,
  funds_sent_method text null,
  funds_sent_reference text null,
  funds_sent_note text null,
  funds_disbursed boolean null,
  funds_disbursed_at timestamp with time zone null,
  funds_disbursed_reference text null,
  funds_sent_proof_url text null,
  borrower_invite_email text null,
  borrower_access_token text null,
  borrower_access_token_expires timestamp with time zone null,
  borrower_payment_method text null,
  borrower_payment_username text null,
  lender_paypal_email text null,
  lender_cashapp_username text null,
  lender_venmo_username text null,
  lender_preferred_payment_method text null,
  disbursement_status character varying(50) null,
  disbursement_transfer_id character varying(255) null,
  disbursed_at timestamp with time zone null,
  auto_pay_enabled boolean null,
  last_payment_at timestamp with time zone null,
  lender_dwolla_customer_url text null,
  lender_dwolla_customer_id character varying(255) null,
  lender_dwolla_funding_source_url text null,
  lender_dwolla_funding_source_id character varying(255) null,
  lender_bank_name character varying(255) null,
  lender_bank_account_mask character varying(10) null,
  lender_bank_connected boolean null,
  lender_name character varying(255) null,
  lender_email character varying(255) null,
  borrower_dwolla_customer_url text null,
  borrower_dwolla_customer_id character varying(255) null,
  borrower_dwolla_funding_source_url text null,
  borrower_dwolla_funding_source_id character varying(255) null,
  borrower_bank_name character varying(255) null,
  borrower_bank_account_mask character varying(10) null,
  borrower_bank_connected boolean null,
  borrower_name character varying(255) null,
  invite_accepted_at timestamp with time zone null,
  invite_username text null,
  loan_type_id uuid null,
  loan_request_id uuid null,
  auto_matched boolean null,
  country character varying(3) null,
  state character varying(10) null,
  completed_at timestamp with time zone null,
  disbursement_receipt_url text null,
  duration_fee_percent numeric(5, 2) null,
  duration_fee_amount numeric(12, 2) null,
  uses_apr_calculation boolean null
) TABLESPACE pg_default;

-- =====================================================
-- INDEXES
-- =====================================================

-- Users indexes
create index IF not exists idx_users_auto_payments on public.users using btree (auto_payments_count) TABLESPACE pg_default;
create index IF not exists idx_users_verification_status on public.users using btree (verification_status) TABLESPACE pg_default;
create index IF not exists idx_users_borrower_rating on public.users using btree (borrower_rating) TABLESPACE pg_default;
create index IF not exists idx_users_borrowing_tier on public.users using btree (borrowing_tier) TABLESPACE pg_default;
create index IF not exists idx_users_bank_connected on public.users using btree (bank_connected) TABLESPACE pg_default;
create index IF not exists idx_users_country on public.users using btree (country) TABLESPACE pg_default;
create index IF not exists idx_users_state on public.users using btree (state) TABLESPACE pg_default;
create index IF not exists idx_users_is_admin on public.users using btree (is_admin) TABLESPACE pg_default where (is_admin = true);
create index IF not exists idx_users_reverification_due on public.users using btree (reverification_due_at) TABLESPACE pg_default where ((verification_status = 'verified'::text) and (reverification_due_at is not null));
create index IF not exists idx_users_verified_at on public.users using btree (verified_at) TABLESPACE pg_default where (verification_status = 'verified'::text);
create index IF not exists idx_users_dwolla_customer on public.users using btree (dwolla_customer_id) TABLESPACE pg_default;
create index IF not exists idx_users_username on public.users using btree (username) TABLESPACE pg_default;
create index IF not exists idx_users_email on public.users using btree (email) TABLESPACE pg_default;
create index IF not exists idx_users_user_type on public.users using btree (user_type) TABLESPACE pg_default;
create index IF not exists idx_users_created_at on public.users using btree (created_at desc) TABLESPACE pg_default;
create index IF not exists idx_users_manual_payments on public.users using btree (manual_payments_count) TABLESPACE pg_default;
create index IF not exists idx_users_dwolla_funding on public.users using btree (dwolla_funding_source_url) TABLESPACE pg_default where (dwolla_funding_source_url is not null);

-- Business profiles indexes
create index IF not exists idx_business_interest on public.business_profiles using btree (total_interest_earned) TABLESPACE pg_default;
create unique INDEX IF not exists idx_business_profiles_slug on public.business_profiles using btree (slug) TABLESPACE pg_default where (slug is not null);
create index IF not exists idx_business_profiles_public on public.business_profiles using btree (public_profile_enabled, verification_status) TABLESPACE pg_default where ((public_profile_enabled = true) and ((verification_status)::text = 'approved'::text));
create index IF not exists idx_business_verified on public.business_profiles using btree (is_verified, public_profile_enabled) TABLESPACE pg_default where (is_verified = true);
create index IF not exists idx_business_user on public.business_profiles using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_business_profiles_dwolla_funding on public.business_profiles using btree (dwolla_funding_source_url) TABLESPACE pg_default where (dwolla_funding_source_url is not null);
create index IF not exists idx_business_profiles_cashapp on public.business_profiles using btree (cashapp_username) TABLESPACE pg_default where (cashapp_username is not null);
create index IF not exists idx_business_profiles_venmo on public.business_profiles using btree (venmo_username) TABLESPACE pg_default where (venmo_username is not null);
create index IF not exists idx_business_profiles_zelle_email on public.business_profiles using btree (zelle_email) TABLESPACE pg_default where (zelle_email is not null);
create index IF not exists idx_business_profiles_zelle_phone on public.business_profiles using btree (zelle_phone) TABLESPACE pg_default where (zelle_phone is not null);
create index IF not exists idx_business_profiles_paypal on public.business_profiles using btree (paypal_email) TABLESPACE pg_default where (paypal_email is not null);

-- Agents indexes
create index IF not exists idx_agents_email on public.agents using btree (email) TABLESPACE pg_default;
create index IF not exists idx_agents_country on public.agents using btree (country) TABLESPACE pg_default;

-- States indexes
create index IF not exists idx_states_country_id on public.states using btree (country_id) TABLESPACE pg_default;
create index IF not exists idx_states_code on public.states using btree (code) TABLESPACE pg_default;
create index IF not exists idx_states_is_active on public.states using btree (is_active) TABLESPACE pg_default;

-- Country payment methods indexes
create index IF not exists idx_country_payment_methods_country on public.country_payment_methods using btree (country_code) TABLESPACE pg_default;
create index IF not exists idx_country_payment_methods_provider on public.country_payment_methods using btree (payment_provider_id) TABLESPACE pg_default;

-- User payment methods indexes
create index IF not exists idx_user_payment_methods_user on public.user_payment_methods using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_user_payment_methods_provider on public.user_payment_methods using btree (payment_provider_id) TABLESPACE pg_default;

-- Lender preferences indexes
create index IF not exists idx_lender_prefs_user_id on public.lender_preferences using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_lender_prefs_business_id on public.lender_preferences using btree (business_id) TABLESPACE pg_default;
create index IF not exists idx_lender_prefs_active on public.lender_preferences using btree (is_active) TABLESPACE pg_default;
create index IF not exists idx_lender_prefs_countries on public.lender_preferences using gin (countries) TABLESPACE pg_default;
create index IF not exists idx_lender_prefs_states on public.lender_preferences using gin (states) TABLESPACE pg_default;
create index IF not exists idx_lender_prefs_business on public.lender_preferences using btree (business_id, is_active) TABLESPACE pg_default where (business_id is not null);
create index IF not exists idx_lender_prefs_user on public.lender_preferences using btree (user_id, is_active) TABLESPACE pg_default where (user_id is not null);
create index IF not exists idx_lender_prefs_capital on public.lender_preferences using btree (capital_pool, capital_reserved, min_amount, max_amount) TABLESPACE pg_default where (is_active = true);

-- Loan requests indexes
create index IF not exists idx_loan_requests_status on public.loan_requests using btree (status) TABLESPACE pg_default;
create index IF not exists idx_loan_requests_borrower_email on public.loan_requests using btree (borrower_email) TABLESPACE pg_default;
create index IF not exists idx_loan_requests_access_token on public.loan_requests using btree (access_token) TABLESPACE pg_default;
create index IF not exists idx_loan_requests_created_at on public.loan_requests using btree (created_at desc) TABLESPACE pg_default;

-- Loans indexes
create index IF not exists idx_loans_guest_lender on public.loans using btree (guest_lender_id) TABLESPACE pg_default;
create index IF not exists idx_loans_borrower on public.loans using btree (borrower_id) TABLESPACE pg_default;
create index IF not exists idx_loans_lender on public.loans using btree (lender_id) TABLESPACE pg_default;
create index IF not exists idx_loans_business_lender on public.loans using btree (business_lender_id) TABLESPACE pg_default;
create index IF not exists idx_loans_status on public.loans using btree (status) TABLESPACE pg_default;
create index IF not exists idx_loans_invite_token on public.loans using btree (invite_token) TABLESPACE pg_default;
create index IF not exists idx_loans_funds_pending on public.loans using btree (status, funds_sent) TABLESPACE pg_default where ((status = 'pending_funds'::text) and (funds_sent = false));
create index IF not exists idx_loans_pending_disbursement on public.loans using btree (status, funds_disbursed) TABLESPACE pg_default where ((status = 'pending_disbursement'::text) and (funds_disbursed = false));
create index IF not exists idx_loans_awaiting_payment on public.loans using btree (status, funds_sent) TABLESPACE pg_default where ((status = 'active'::text) and (funds_sent = false));
create index IF not exists idx_loans_country on public.loans using btree (country) TABLESPACE pg_default;
create index IF not exists idx_loans_state on public.loans using btree (state) TABLESPACE pg_default;
create index IF not exists idx_loans_loan_type on public.loans using btree (loan_type_id) TABLESPACE pg_default;
create index IF not exists idx_loans_borrower_invite_email on public.loans using btree (borrower_invite_email) TABLESPACE pg_default;
create index IF not exists idx_loans_borrower_access_token on public.loans using btree (borrower_access_token) TABLESPACE pg_default;
create index IF not exists idx_loans_auto_matched on public.loans using btree (auto_matched) TABLESPACE pg_default;
create index IF not exists idx_loans_loan_request_id on public.loans using btree (loan_request_id) TABLESPACE pg_default;
create index IF not exists idx_loans_borrower_status on public.loans using btree (borrower_id, status) TABLESPACE pg_default;
create index IF not exists idx_loans_lender_status on public.loans using btree (lender_id, status) TABLESPACE pg_default where (lender_id is not null);
create index IF not exists idx_loans_business_lender_status on public.loans using btree (business_lender_id, status) TABLESPACE pg_default where (business_lender_id is not null);
create index IF not exists idx_loans_status_created on public.loans using btree (status, created_at desc) TABLESPACE pg_default;
create index IF not exists idx_loans_borrower_active on public.loans using btree (borrower_id, amount_remaining, created_at desc) TABLESPACE pg_default where (status = 'active'::text);
create index IF not exists idx_loans_lender_active on public.loans using btree (lender_id, amount_remaining, created_at desc) TABLESPACE pg_default where ((status = 'active'::text) and (lender_id is not null));
create index IF not exists idx_loans_amount on public.loans using btree (amount) TABLESPACE pg_default;
create index IF not exists idx_loans_country_state on public.loans using btree (country, state) TABLESPACE pg_default where (country is not null);

-- Loan matches indexes
create index IF not exists idx_loan_matches_loan_id on public.loan_matches using btree (loan_id) TABLESPACE pg_default;
create index IF not exists idx_loan_matches_lender_user on public.loan_matches using btree (lender_user_id) TABLESPACE pg_default;
create index IF not exists idx_loan_matches_lender_business on public.loan_matches using btree (lender_business_id) TABLESPACE pg_default;
create index IF not exists idx_loan_matches_status on public.loan_matches using btree (status) TABLESPACE pg_default;

-- Payment schedule indexes
create index IF not exists idx_payment_schedule_due_date on public.payment_schedule using btree (due_date) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_status on public.payment_schedule using btree (status) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_loan on public.payment_schedule using btree (loan_id) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_due on public.payment_schedule using btree (due_date) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_due_unpaid on public.payment_schedule using btree (due_date, is_paid) TABLESPACE pg_default where (is_paid = false);
create index IF not exists idx_payment_schedule_loan_paid on public.payment_schedule using btree (loan_id, is_paid, due_date) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_due_paid on public.payment_schedule using btree (due_date, is_paid) TABLESPACE pg_default;
create index IF not exists idx_payment_schedule_status_due on public.payment_schedule using btree (status, due_date) TABLESPACE pg_default where (status is not null);
create index IF not exists idx_payment_schedule_unpaid on public.payment_schedule using btree (loan_id, due_date) TABLESPACE pg_default where (is_paid = false);
create index IF not exists idx_payment_schedule_reminders on public.payment_schedule using btree (due_date, reminder_sent_at) TABLESPACE pg_default where ((is_paid = false) and (reminder_sent_at is not null));

-- Payments indexes
create index IF not exists idx_payments_loan on public.payments using btree (loan_id) TABLESPACE pg_default;
create index IF not exists idx_payments_loan_status on public.payments using btree (loan_id, status, payment_date desc) TABLESPACE pg_default;

-- Payment transactions indexes
create index IF not exists idx_payment_transactions_loan on public.payment_transactions using btree (loan_id) TABLESPACE pg_default;
create index IF not exists idx_payment_transactions_status on public.payment_transactions using btree (status) TABLESPACE pg_default;
create index IF not exists idx_payment_transactions_type on public.payment_transactions using btree (transaction_type) TABLESPACE pg_default;
create index IF not exists idx_payment_transactions_sender on public.payment_transactions using btree (sender_id) TABLESPACE pg_default;
create index IF not exists idx_payment_transactions_receiver on public.payment_transactions using btree (receiver_id) TABLESPACE pg_default;

-- Payment retry log indexes
create index IF not exists idx_payment_retry_log_payment_id on public.payment_retry_log using btree (payment_id) TABLESPACE pg_default;
create index IF not exists idx_payment_retry_log_borrower_id on public.payment_retry_log using btree (borrower_id) TABLESPACE pg_default;
create index IF not exists idx_payment_retry_log_attempted_at on public.payment_retry_log using btree (attempted_at desc) TABLESPACE pg_default;

-- Borrower blocks indexes
create index IF not exists idx_borrower_blocks_user_id on public.borrower_blocks using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_borrower_blocks_status on public.borrower_blocks using btree (status) TABLESPACE pg_default;

-- Trust scores indexes
create index IF not exists idx_trust_scores_user on public.trust_scores using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_trust_scores_score on public.trust_scores using btree (score desc) TABLESPACE pg_default;
create index IF not exists idx_trust_scores_grade on public.trust_scores using btree (score_grade) TABLESPACE pg_default;

-- Trust score history indexes
create index IF not exists idx_trust_score_history_user on public.trust_score_history using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_trust_score_history_created on public.trust_score_history using btree (created_at desc) TABLESPACE pg_default;

-- Trust score events indexes
create index IF not exists idx_trust_score_events_user on public.trust_score_events using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_trust_score_events_type on public.trust_score_events using btree (event_type) TABLESPACE pg_default;
create index IF not exists idx_trust_score_events_created on public.trust_score_events using btree (created_at desc) TABLESPACE pg_default;

-- Vouches indexes
create index IF not exists idx_vouches_voucher on public.vouches using btree (voucher_id) TABLESPACE pg_default;
create index IF not exists idx_vouches_vouchee on public.vouches using btree (vouchee_id) TABLESPACE pg_default;
create index IF not exists idx_vouches_status on public.vouches using btree (status) TABLESPACE pg_default;
create index IF not exists idx_vouches_active on public.vouches using btree (vouchee_id) TABLESPACE pg_default where (status = 'active'::text);

-- Vouch requests indexes
create index IF not exists idx_vouch_requests_requester on public.vouch_requests using btree (requester_id) TABLESPACE pg_default;
create index IF not exists idx_vouch_requests_requested on public.vouch_requests using btree (requested_user_id) TABLESPACE pg_default;
create index IF not exists idx_vouch_requests_status on public.vouch_requests using btree (status) TABLESPACE pg_default;
create index IF not exists idx_vouch_requests_token on public.vouch_requests using btree (invite_token) TABLESPACE pg_default;

-- Borrower business trust indexes
create index IF not exists idx_borrower_business_trust_borrower on public.borrower_business_trust using btree (borrower_id) TABLESPACE pg_default;
create index IF not exists idx_borrower_business_trust_business on public.borrower_business_trust using btree (business_id) TABLESPACE pg_default;
create index IF not exists idx_borrower_business_trust_status on public.borrower_business_trust using btree (trust_status) TABLESPACE pg_default;
create index IF not exists idx_borrower_business_trust_graduated on public.borrower_business_trust using btree (has_graduated) TABLESPACE pg_default;
create index IF not exists idx_borrower_trust_borrower_business on public.borrower_business_trust using btree (borrower_id, business_id) TABLESPACE pg_default;
create index IF not exists idx_borrower_trust_graduated on public.borrower_business_trust using btree (business_id, has_graduated) TABLESPACE pg_default where (has_graduated = true);
create index IF not exists idx_borrower_trust_status on public.borrower_business_trust using btree (borrower_id, trust_status) TABLESPACE pg_default;

-- User financial profiles indexes
create index IF not exists idx_financial_profiles_user on public.user_financial_profiles using btree (user_id) TABLESPACE pg_default;

-- Pending loan requests indexes
create index IF not exists idx_pending_loans_user on public.pending_loan_requests using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_pending_loans_status on public.pending_loan_requests using btree (status) TABLESPACE pg_default;
create index IF not exists idx_pending_loans_business_lender on public.pending_loan_requests using btree (business_lender_id) TABLESPACE pg_default;
create index IF not exists idx_pending_loans_created on public.pending_loan_requests using btree (created_at) TABLESPACE pg_default;

-- Notifications indexes
create index IF not exists idx_notifications_user on public.notifications using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_notifications_unread on public.notifications using btree (user_id, is_read) TABLESPACE pg_default;
create index IF not exists idx_notifications_user_unread on public.notifications using btree (user_id, is_read, created_at desc) TABLESPACE pg_default;
create index IF not exists idx_notifications_loan on public.notifications using btree (loan_id, user_id) TABLESPACE pg_default where (loan_id is not null);
create index IF not exists idx_notifications_user_id on public.notifications using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_notifications_loan_id on public.notifications using btree (loan_id) TABLESPACE pg_default;
create index IF not exists idx_notifications_created_at on public.notifications using btree (created_at desc) TABLESPACE pg_default;

-- Admin emails indexes
create index IF not exists idx_admin_emails_status on public.admin_emails using btree (status) TABLESPACE pg_default;
create index IF not exists idx_admin_emails_email_type on public.admin_emails using btree (email_type) TABLESPACE pg_default;
create index IF not exists idx_admin_emails_sent_by on public.admin_emails using btree (sent_by) TABLESPACE pg_default;
create index IF not exists idx_admin_emails_created_at on public.admin_emails using btree (created_at desc) TABLESPACE pg_default;

-- Admin email logs indexes
create index IF not exists idx_admin_email_logs_sent_by on public.admin_email_logs using btree (sent_by) TABLESPACE pg_default;
create index IF not exists idx_admin_email_logs_email_type on public.admin_email_logs using btree (email_type) TABLESPACE pg_default;
create index IF not exists idx_admin_email_logs_status on public.admin_email_logs using btree (status) TABLESPACE pg_default;
create index IF not exists idx_admin_email_logs_sent_at on public.admin_email_logs using btree (sent_at desc) TABLESPACE pg_default;
create index IF not exists idx_admin_email_logs_created_at on public.admin_email_logs using btree (created_at desc) TABLESPACE pg_default;

-- Cron job runs indexes
create index IF not exists idx_cron_job_runs_job_name on public.cron_job_runs using btree (job_name) TABLESPACE pg_default;
create index IF not exists idx_cron_job_runs_started_at on public.cron_job_runs using btree (started_at desc) TABLESPACE pg_default;
create index IF not exists idx_cron_job_runs_status on public.cron_job_runs using btree (status) TABLESPACE pg_default;

-- Payment providers indexes
create index IF not exists idx_payment_providers_enabled on public.payment_providers using btree (is_enabled) TABLESPACE pg_default where (is_enabled = true);
create index IF not exists idx_payment_providers_slug on public.payment_providers using btree (slug) TABLESPACE pg_default;

-- Waitlist indexes
create index IF not exists idx_waitlist_email on public.waitlist using btree (email) TABLESPACE pg_default;
create index IF not exists idx_waitlist_interest on public.waitlist using btree (interest_type) TABLESPACE pg_default;

-- =====================================================
-- TRIGGERS AND FUNCTIONS
-- =====================================================

-- Update timestamp functions (need to be created before triggers that use them)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_lender_prefs_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_payment_providers_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_trust_score_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function set_business_slug()
returns trigger as $$
begin
  if new.slug is null then
    new.slug = lower(regexp_replace(new.business_name, '[^a-zA-Z0-9]+', '-', 'g'));
  end if;
  return new;
end;
$$ language plpgsql;

create or replace function sync_business_to_lender_preferences()
returns trigger as $$
begin
  -- This function would sync business profile changes to lender preferences
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function sync_first_time_amount()
returns trigger as $$
begin
  -- This function would sync first time borrower amount changes
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function create_trust_score_for_user()
returns trigger as $$
begin
  insert into public.trust_scores (user_id) values (new.id);
  return new;
end;
$$ language plpgsql;

create or replace function check_reverification_needed()
returns trigger as $$
begin
  -- This function would check if reverification is needed
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function process_pending_loan_after_verification()
returns trigger as $$
begin
  -- This function would process pending loans after verification
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function trigger_update_trust_on_loan_complete()
returns trigger as $$
begin
  -- This function would update trust scores when loan is completed
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function trigger_update_trust_on_loan_create()
returns trigger as $$
begin
  -- This function would update trust scores when loan is created
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

create or replace function update_borrower_trust_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function update_loan_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create or replace function calculate_vouch_on_save()
returns trigger as $$
begin
  -- This function would calculate vouch strength
  -- Implementation depends on business logic
  return new;
end;
$$ language plpgsql;

-- Admin emails trigger
create trigger admin_emails_updated_at BEFORE
update on admin_emails for EACH row
execute FUNCTION update_updated_at();

-- Borrower business trust trigger
create trigger tr_borrower_trust_updated_at BEFORE
update on borrower_business_trust for EACH row
execute FUNCTION update_borrower_trust_timestamp();

-- Business profiles triggers
create trigger tr_business_profiles_slug BEFORE INSERT on business_profiles for EACH row
execute FUNCTION set_business_slug();

create trigger tr_sync_business_lender_prefs
after INSERT or update OF default_interest_rate, interest_type, min_loan_amount, max_loan_amount, 
first_time_borrower_amount, capital_pool, auto_match_enabled, verification_status on business_profiles for EACH row
execute FUNCTION sync_business_to_lender_preferences();

create trigger tr_sync_first_time_amount
after update OF first_time_borrower_amount on business_profiles for EACH row
execute FUNCTION sync_first_time_amount();

create trigger update_business_profiles_updated_at BEFORE
update on business_profiles for EACH row
execute FUNCTION update_updated_at();

-- Countries trigger
create trigger update_countries_updated_at BEFORE
update on countries for EACH row
execute FUNCTION update_updated_at_column();

-- Fee configurations trigger
create trigger update_fee_configurations_updated_at BEFORE
update on fee_configurations for EACH row
execute FUNCTION update_updated_at_column();

-- Lender preferences trigger
create trigger trigger_lender_prefs_timestamp BEFORE
update on lender_preferences for EACH row
execute FUNCTION update_lender_prefs_timestamp();

-- Loan requests trigger
create trigger update_loan_requests_updated_at BEFORE
update on loan_requests for EACH row
execute FUNCTION update_loan_requests_updated_at();

-- Loans triggers
create trigger tr_update_trust_on_loan_complete
after update on loans for EACH row
execute FUNCTION trigger_update_trust_on_loan_complete();

create trigger tr_update_trust_on_loan_create
after INSERT on loans for EACH row when (
  new.status = any (array['active'::text, 'pending_disbursement'::text])
)
execute FUNCTION trigger_update_trust_on_loan_create();

create trigger update_loans_updated_at BEFORE
update on loans for EACH row
execute FUNCTION update_updated_at();

-- Loan types trigger
create trigger update_loan_types_updated_at BEFORE
update on loan_types for EACH row
execute FUNCTION update_updated_at_column();

-- Payment providers trigger
create trigger payment_providers_updated BEFORE
update on payment_providers for EACH row
execute FUNCTION update_payment_providers_timestamp();

-- Payment transactions trigger
create trigger payment_transactions_updated BEFORE
update on payment_transactions for EACH row
execute FUNCTION update_payment_providers_timestamp();

-- Platform settings trigger
create trigger update_platform_settings_updated_at BEFORE
update on platform_settings for EACH row
execute FUNCTION update_updated_at_column();

-- Trust scores trigger
create trigger trust_score_update_timestamp BEFORE
update on trust_scores for EACH row
execute FUNCTION update_trust_score_timestamp();

-- User financial profiles trigger
create trigger update_financial_profiles_updated_at BEFORE
update on user_financial_profiles for EACH row
execute FUNCTION update_updated_at();

-- User payment methods trigger
create trigger user_payment_methods_updated BEFORE
update on user_payment_methods for EACH row
execute FUNCTION update_payment_providers_timestamp();

-- Users triggers
create trigger create_trust_score_on_user_create
after INSERT on users for EACH row
execute FUNCTION create_trust_score_for_user();

create trigger trigger_check_reverification BEFORE
update OF verification_status on users for EACH row
execute FUNCTION check_reverification_needed();

create trigger trigger_process_pending_loans
after update on users for EACH row
execute FUNCTION process_pending_loan_after_verification();

create trigger update_users_updated_at BEFORE
update on users for EACH row
execute FUNCTION update_updated_at();

-- Vouches trigger
create trigger vouch_calculate_strength BEFORE INSERT or update on vouches for EACH row
execute FUNCTION calculate_vouch_on_save();

-- Note: The following functions were referenced but not defined in the original schema:
-- - update_admin_emails_updated_at (referenced in admin_emails trigger)
-- - update_borrower_trust_timestamp (already defined above)

-- If you need those functions, you'll need to create them with appropriate logic.