-- =====================================================
-- TRIGGER FUNCTIONS (must be created first)
-- =====================================================

-- Generic updated_at function (used by multiple tables)
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Generic updated_at column function (alternative name used by some tables)
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Borrower trust timestamp function
create or replace function update_borrower_trust_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Lender preferences timestamp function
create or replace function update_lender_prefs_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Lender tier policies timestamp function
create or replace function update_lender_tier_policies_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Loan requests timestamp function
create or replace function update_loan_requests_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Payment providers timestamp function (used by payment_providers, payment_transactions, user_payment_methods)
create or replace function update_payment_providers_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Transfers timestamp function
create or replace function update_transfers_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trust score timestamp function
create or replace function update_trust_score_timestamp()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Users (main user table) - MUST COME FIRST as it's referenced by many other tables
create table public.users (
  id uuid not null,
  email text not null,
  full_name text not null,
  phone text null,
  avatar_url text null,
  user_type text not null default 'individual',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  paypal_email text null,
  paypal_payer_id text null,
  paypal_connected boolean null default false,
  paypal_connected_at timestamp with time zone null,
  email_reminders boolean null default true,
  reminder_days_before integer null default 3,
  verification_status text null default 'pending',
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
  monthly_income numeric(12,2) null,
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
  borrower_rating text null default 'neutral',
  borrower_rating_updated_at timestamp with time zone null,
  total_loans_completed integer null default 0,
  total_payments_made integer null default 0,
  payments_on_time integer null default 0,
  payments_early integer null default 0,
  payments_late integer null default 0,
  payments_missed integer null default 0,
  total_amount_borrowed numeric(12,2) null default 0,
  total_amount_repaid numeric(12,2) null default 0,
  current_outstanding_amount numeric(12,2) null default 0,
  cashapp_username text null,
  venmo_username text null,
  preferred_payment_method text null,
  is_admin boolean null default false,
  is_suspended boolean null default false,
  timezone text null default 'America/New_York',
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
  trust_tier character varying(20) null default 'tier_1',
  trust_tier_updated_at timestamp with time zone null,
  vouch_count integer null default 0,
  active_vouches_count integer null default 0,
  kyc_verified_at timestamp with time zone null,
  vouching_locked boolean null default false,
  vouching_locked_reason text null,
  vouching_locked_at timestamp with time zone null,
  active_vouchee_defaults integer null default 0,
  vouching_success_rate numeric(5,2) null default 100.00,
  vouches_given_total integer null default 0,
  vouches_resulted_default integer null default 0,
  vouches_resulted_complete integer null default 0,
  constraint users_pkey primary key (id),
  constraint users_email_key unique (email),
  constraint users_username_key unique (username),
  constraint users_id_fkey foreign key (id) references auth.users (id) on delete cascade,
  constraint username_format check (
    username is null or username ~ '^[a-z0-9_]{3,20}$'
  ),
  constraint users_verification_status_check check (
    verification_status = any (array['pending', 'submitted', 'verified', 'rejected'])
  ),
  constraint users_borrower_rating_check check (
    borrower_rating = any (array['great', 'good', 'neutral', 'poor', 'bad', 'worst'])
  ),
  constraint users_preferred_payment_method_check check (
    (preferred_payment_method is null) or
    (preferred_payment_method = any (array['paypal', 'cashapp', 'venmo', 'zelle', 'bank_transfer']))
  ),
  constraint users_user_type_check check (
    user_type = any (array['individual', 'business'])
  )
);

-- Trust Tiers (referenced by lender_tier_policies)
create table public.trust_tiers (
  tier_id character varying(20) not null,
  tier_name character varying(50) not null,
  tier_number integer not null,
  min_vouches integer not null,
  max_vouches integer not null,
  description text null,
  constraint trust_tiers_pkey primary key (tier_id)
);

-- Payment Providers (referenced by many tables)
create table public.payment_providers (
  id uuid not null default gen_random_uuid(),
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
  api_environment character varying(20) null default 'sandbox',
  webhook_url text null,
  webhook_secret text null,
  supported_countries text[] null default '{}'::text[],
  supported_currencies text[] null default '{}'::text[],
  fee_type character varying(20) null default 'none',
  fee_percentage numeric(5,4) null default 0,
  fee_fixed numeric(10,2) null default 0,
  fee_currency character varying(3) null default 'USD',
  fee_paid_by character varying(20) null default 'sender',
  min_amount numeric(12,2) null,
  max_amount numeric(12,2) null,
  daily_limit numeric(12,2) null,
  monthly_limit numeric(12,2) null,
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
    api_environment = any (array['sandbox', 'production'])
  ),
  constraint payment_providers_fee_paid_by_check check (
    fee_paid_by = any (array['sender', 'receiver', 'split', 'platform'])
  ),
  constraint payment_providers_fee_type_check check (
    fee_type = any (array['none', 'percentage', 'fixed', 'both'])
  ),
  constraint payment_providers_provider_type_check check (
    provider_type = any (array['automated', 'manual', 'mobile_money', 'cash'])
  )
);

-- Countries (referenced by states)
create table public.countries (
  id uuid not null default gen_random_uuid(),
  code character varying(3) not null,
  name character varying(100) not null,
  currency character varying(3) not null,
  currency_symbol character varying(5) null default '$',
  is_active boolean null default true,
  dwolla_supported boolean null default false,
  paypal_supported boolean null default true,
  min_loan_amount numeric(12,2) null default 50,
  max_loan_amount numeric(12,2) null default 5000,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint countries_pkey primary key (id),
  constraint countries_code_key unique (code)
);

-- Fee Configurations (referenced by fee_change_history)
create table public.fee_configurations (
  id uuid not null default gen_random_uuid(),
  fee_type character varying(50) not null,
  fee_name character varying(100) not null,
  fee_mode character varying(20) not null default 'percentage',
  fee_percentage numeric(5,2) null default 0,
  flat_fee numeric(12,2) null default 0,
  min_fee numeric(12,2) null default 0,
  max_fee numeric(12,2) null,
  applies_to character varying(50) not null,
  description text null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint fee_configurations_pkey primary key (id),
  constraint fee_configurations_fee_type_key unique (fee_type)
);

-- Loan Types (referenced by business_loan_types)
create table public.loan_types (
  id uuid not null default gen_random_uuid(),
  name character varying(100) not null,
  slug character varying(100) not null,
  description text null,
  icon character varying(50) null,
  min_amount numeric(12,2) null default 50,
  max_amount numeric(12,2) null default 5000,
  min_interest_rate numeric(5,2) null default 0,
  max_interest_rate numeric(5,2) null default 25,
  max_term_months integer null default 24,
  is_active boolean null default true,
  requires_business_lender boolean null default false,
  display_order integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint loan_types_pkey primary key (id),
  constraint loan_types_slug_key unique (slug)
);

-- Business Profiles (referenced by many tables)
create table public.business_profiles (
  id uuid not null default extensions.uuid_generate_v4(),
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
  default_interest_rate numeric(5,2) null default 0,
  interest_type text null default 'simple',
  min_loan_amount numeric(12,2) null,
  max_loan_amount numeric(12,2) null,
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
  verification_status character varying(20) null default 'pending',
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
  first_time_borrower_amount numeric(12,2) null default 50,
  lending_terms text null,
  lending_terms_updated_at timestamp with time zone null,
  total_loans_funded integer null default 0,
  total_amount_funded numeric(12,2) null default 0,
  rejection_reason text null,
  zelle_email text null,
  total_interest_earned numeric(12,2) null default 0,
  capital_pool numeric(12,2) null default 10000,
  auto_match_enabled boolean null default false,
  zelle_phone character varying(20) null,
  zelle_name character varying(255) null,
  constraint business_profiles_pkey primary key (id),
  constraint business_profiles_slug_key unique (slug),
  constraint business_profiles_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint business_profiles_verified_by_fkey foreign key (verified_by) references auth.users (id),
  constraint business_profiles_interest_type_check check (
    interest_type = any (array['simple', 'compound'])
  ),
  constraint business_profiles_preferred_payment_method_check check (
    (preferred_payment_method is null) or
    (preferred_payment_method = any (array['paypal', 'cashapp', 'venmo', 'zelle']))
  )
);

-- States (depends on countries)
create table public.states (
  id uuid not null default gen_random_uuid(),
  code character varying(10) not null,
  name character varying(100) not null,
  country_id uuid not null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint states_pkey primary key (id),
  constraint states_code_country_id_key unique (code, country_id),
  constraint states_country_id_fkey foreign key (country_id) references countries (id) on delete cascade
);

-- Admin Email Logs (depends on users)
create table public.admin_email_logs (
  id uuid not null default gen_random_uuid(),
  created_at timestamp with time zone null default now(),
  subject text not null,
  body text not null,
  email_type text not null,
  recipient_type text not null,
  recipients_count integer not null default 0,
  recipient_ids text[] null,
  sent_by uuid null,
  sent_at timestamp with time zone null,
  status text not null default 'pending',
  success_count integer null default 0,
  failed_count integer null default 0,
  metadata jsonb null default '{}'::jsonb,
  constraint admin_email_logs_pkey primary key (id),
  constraint admin_email_logs_sent_by_fkey foreign key (sent_by) references users (id) on delete set null
);

-- Borrower Blocks (depends on users, loans)
-- Note: loans table will be created later, so we'll add the loan_id fkey later or create loans first
-- For proper ordering, we'll create loans first then come back to this
-- Let's continue with tables that don't depend on loans

-- Country Payment Methods (depends on payment_providers)
create table public.country_payment_methods (
  id uuid not null default gen_random_uuid(),
  country_code character varying(2) not null,
  payment_provider_id uuid null,
  is_enabled boolean null default true,
  is_default_for_disbursement boolean null default false,
  is_default_for_repayment boolean null default false,
  fee_percentage_override numeric(5,4) null,
  fee_fixed_override numeric(10,2) null,
  min_amount_override numeric(12,2) null,
  max_amount_override numeric(12,2) null,
  display_order integer null default 100,
  created_at timestamp with time zone null default now(),
  constraint country_payment_methods_pkey primary key (id),
  constraint country_payment_methods_country_code_payment_provider_id_key unique (country_code, payment_provider_id),
  constraint country_payment_methods_payment_provider_id_fkey foreign key (payment_provider_id) references payment_providers (id) on delete cascade
);

-- Cron Job Runs (depends on users)
create table public.cron_job_runs (
  id uuid not null default gen_random_uuid(),
  job_name character varying(100) not null,
  started_at timestamp with time zone not null,
  completed_at timestamp with time zone null,
  duration_ms integer null,
  status character varying(20) not null default 'running',
  items_processed integer null default 0,
  result jsonb null,
  error_message text null,
  triggered_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint cron_job_runs_pkey primary key (id),
  constraint cron_job_runs_triggered_by_fkey foreign key (triggered_by) references users (id) on delete set null
);

-- Fee Change History (depends on fee_configurations, users)
create table public.fee_change_history (
  id uuid not null default gen_random_uuid(),
  fee_id uuid not null,
  fee_type character varying(50) not null,
  old_mode character varying(20) null,
  new_mode character varying(20) null,
  old_percentage numeric(5,2) null,
  new_percentage numeric(5,2) null,
  old_flat_fee numeric(12,2) null,
  new_flat_fee numeric(12,2) null,
  changed_at timestamp with time zone null default now(),
  changed_by uuid null,
  constraint fee_change_history_pkey primary key (id),
  constraint fee_change_history_changed_by_fkey foreign key (changed_by) references users (id),
  constraint fee_change_history_fee_id_fkey foreign key (fee_id) references fee_configurations (id) on delete cascade
);

-- Lender Preferences (depends on users, business_profiles)
create table public.lender_preferences (
  id uuid not null default gen_random_uuid(),
  user_id uuid null,
  business_id uuid null,
  is_active boolean null default true,
  auto_accept boolean null default false,
  min_amount numeric(12,2) null default 50,
  max_amount numeric(12,2) null default 5000,
  preferred_currency text null default 'USD',
  interest_rate numeric(5,2) null default 10,
  interest_type text null default 'simple',
  countries jsonb null default '[]'::jsonb,
  min_borrower_rating text null default 'neutral',
  require_verified_borrower boolean null default false,
  min_term_weeks integer null default 1,
  max_term_weeks integer null default 52,
  capital_pool numeric(12,2) null default 0,
  capital_reserved numeric(12,2) null default 0,
  notify_on_match boolean null default true,
  notify_email boolean null default true,
  notify_sms boolean null default false,
  total_loans_funded integer null default 0,
  total_amount_funded numeric(12,2) null default 0,
  acceptance_rate numeric(5,2) null default 100,
  avg_response_time_hours numeric(10,2) null,
  last_loan_assigned_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  first_time_borrower_limit numeric(12,2) null default 500,
  allow_first_time_borrowers boolean null default true,
  lending_terms text null,
  lending_terms_updated_at timestamp with time zone null,
  states jsonb null default '[]'::jsonb,
  constraint lender_preferences_pkey primary key (id),
  constraint lender_preferences_business_id_key unique (business_id),
  constraint lender_preferences_user_id_key unique (user_id),
  constraint lender_preferences_business_id_fkey foreign key (business_id) references business_profiles (id) on delete cascade,
  constraint lender_preferences_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint lender_type_check check (
    ((user_id is not null) and (business_id is null)) or
    ((user_id is null) and (business_id is not null))
  ),
  constraint lender_preferences_interest_type_check check (
    interest_type = any (array['simple', 'compound'])
  ),
  constraint lender_preferences_min_borrower_rating_check check (
    min_borrower_rating = any (array['great', 'good', 'neutral', 'poor', 'bad', 'worst'])
  )
);

-- Lender Tier Policies (depends on users, trust_tiers)
create table public.lender_tier_policies (
  id uuid not null default gen_random_uuid(),
  lender_id uuid not null,
  tier_id character varying(20) not null,
  interest_rate numeric(5,2) not null,
  max_loan_amount integer not null,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint lender_tier_policies_pkey primary key (id),
  constraint lender_tier_policies_lender_id_tier_id_key unique (lender_id, tier_id),
  constraint lender_tier_policies_lender_id_fkey foreign key (lender_id) references users (id) on delete cascade,
  constraint lender_tier_policies_tier_id_fkey foreign key (tier_id) references trust_tiers (tier_id)
);

-- Business Loan Types (depends on business_profiles, loan_types)
create table public.business_loan_types (
  id uuid not null default gen_random_uuid(),
  business_id uuid not null,
  loan_type_id uuid not null,
  min_amount numeric(12,2) null,
  max_amount numeric(12,2) null,
  interest_rate numeric(5,2) null,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  constraint business_loan_types_pkey primary key (id),
  constraint business_loan_types_business_id_loan_type_id_key unique (business_id, loan_type_id),
  constraint business_loan_types_business_id_fkey foreign key (business_id) references business_profiles (id) on delete cascade,
  constraint business_loan_types_loan_type_id_fkey foreign key (loan_type_id) references loan_types (id) on delete cascade
);

-- Borrower Business Trust (depends on auth.users, business_profiles)
create table public.borrower_business_trust (
  id uuid not null default gen_random_uuid(),
  borrower_id uuid not null,
  business_id uuid not null,
  completed_loan_count integer null default 0,
  total_amount_borrowed numeric(12,2) null default 0,
  total_amount_repaid numeric(12,2) null default 0,
  has_graduated boolean null default false,
  graduated_at timestamp with time zone null,
  has_defaulted boolean null default false,
  default_count integer null default 0,
  last_default_at timestamp with time zone null,
  late_payment_count integer null default 0,
  on_time_payment_count integer null default 0,
  trust_status text null default 'new',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint borrower_business_trust_pkey primary key (id),
  constraint borrower_business_trust_borrower_id_business_id_key unique (borrower_id, business_id),
  constraint borrower_business_trust_borrower_id_fkey foreign key (borrower_id) references auth.users (id) on delete cascade,
  constraint borrower_business_trust_business_id_fkey foreign key (business_id) references business_profiles (id) on delete cascade,
  constraint borrower_business_trust_trust_status_check check (
    trust_status = any (array['new', 'building', 'graduated', 'suspended', 'banned'])
  )
);

-- Platform Settings
create table public.platform_settings (
  id uuid not null default gen_random_uuid(),
  key character varying(100) not null,
  value jsonb not null,
  value_type character varying(20) null default 'string',
  category character varying(50) null default 'general',
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint platform_settings_pkey primary key (id),
  constraint platform_settings_key_key unique (key)
);

-- User Payment Methods (depends on users, payment_providers)
create table public.user_payment_methods (
  id uuid not null default gen_random_uuid(),
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
  constraint user_payment_methods_payment_provider_id_fkey foreign key (payment_provider_id) references payment_providers (id) on delete cascade,
  constraint user_payment_methods_user_id_fkey foreign key (user_id) references users (id) on delete cascade
);

-- User Financial Profiles (depends on users)
create table public.user_financial_profiles (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null,
  pay_frequency text not null default 'biweekly',
  pay_amount numeric(12,2) not null default 0,
  pay_day_of_week integer null,
  pay_day_of_month integer null,
  second_pay_day_of_month integer null,
  rent_mortgage numeric(12,2) not null default 0,
  utilities numeric(12,2) not null default 0,
  transportation numeric(12,2) not null default 0,
  insurance numeric(12,2) not null default 0,
  groceries numeric(12,2) not null default 0,
  phone numeric(12,2) not null default 0,
  subscriptions numeric(12,2) not null default 0,
  childcare numeric(12,2) not null default 0,
  other_bills numeric(12,2) not null default 0,
  existing_debt_payments numeric(12,2) not null default 0,
  monthly_income numeric GENERATED ALWAYS as (
    case pay_frequency
      when 'weekly' then (pay_amount * 4.33)
      when 'biweekly' then (pay_amount * 2.17)
      when 'semimonthly' then (pay_amount * 2)
      when 'monthly' then pay_amount
      else 0
    end
  ) stored,
  monthly_expenses numeric GENERATED ALWAYS as (
    rent_mortgage + utilities + transportation + insurance +
    groceries + phone + subscriptions + childcare +
    other_bills + existing_debt_payments
  ) stored,
  preferred_payment_buffer_days integer null default 2,
  comfort_level text null default 'balanced',
  is_complete boolean null default false,
  last_updated timestamp with time zone null default now(),
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_financial_profiles_pkey primary key (id),
  constraint unique_user_financial_profile unique (user_id),
  constraint user_financial_profiles_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint user_financial_profiles_pay_day_of_week_check check (pay_day_of_week >= 0 and pay_day_of_week <= 6),
  constraint user_financial_profiles_pay_frequency_check check (
    pay_frequency = any (array['weekly', 'biweekly', 'semimonthly', 'monthly'])
  ),
  constraint user_financial_profiles_pay_day_of_month_check check (pay_day_of_month >= 1 and pay_day_of_month <= 31),
  constraint user_financial_profiles_second_pay_day_of_month_check check (second_pay_day_of_month >= 1 and second_pay_day_of_month <= 31),
  constraint user_financial_profiles_comfort_level_check check (
    comfort_level = any (array['comfortable', 'balanced', 'aggressive'])
  )
);

-- Trust Scores (depends on users)
create table public.trust_scores (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  score integer not null default 50,
  score_grade text not null default 'C',
  score_label text not null default 'Building Trust',
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
  total_amount_borrowed numeric(12,2) null default 0,
  total_amount_repaid numeric(12,2) null default 0,
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
  constraint trust_scores_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint trust_scores_score_check check (score >= 0 and score <= 100)
);

-- Pending Loan Requests (depends on users, business_profiles)
create table public.pending_loan_requests (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  business_lender_id uuid null,
  personal_lender_id uuid null,
  amount numeric(12,2) not null,
  purpose text not null,
  description text null,
  term_months integer not null default 3,
  status text not null default 'awaiting_verification',
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  processed_at timestamp with time zone null,
  constraint pending_loan_requests_pkey primary key (id),
  constraint pending_loan_requests_user_id_business_lender_id_key unique (user_id, business_lender_id),
  constraint pending_loan_requests_business_lender_id_fkey foreign key (business_lender_id) references business_profiles (id) on delete set null,
  constraint pending_loan_requests_personal_lender_id_fkey foreign key (personal_lender_id) references users (id) on delete set null,
  constraint pending_loan_requests_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint pending_loan_requests_status_check check (
    status = any (array['awaiting_verification', 'verification_approved', 'loan_created', 'cancelled', 'expired'])
  )
);

-- Loan Requests (depends on users, loans - will add loan fkey after loans created)
create table public.loan_requests (
  id uuid not null default extensions.uuid_generate_v4(),
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  purpose text not null,
  description text null,
  borrower_name text not null,
  borrower_email text not null,
  borrower_user_id uuid null,
  access_token text null,
  access_token_expires timestamp with time zone null,
  status text not null default 'pending',
  accepted_by_email text null,
  accepted_by_name text null,
  accepted_at timestamp with time zone null,
  loan_id uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  proposed_frequency text null default 'monthly',
  proposed_installments integer null default 1,
  proposed_payment_amount numeric(12,2) null,
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
  constraint loan_requests_borrower_user_id_fkey foreign key (borrower_user_id) references users (id) on delete set null,
  -- loan_id fkey will be added after loans table is created
  constraint loan_requests_proposed_frequency_check check (
    proposed_frequency = any (array['weekly', 'biweekly', 'monthly'])
  ),
  constraint loan_requests_status_check check (
    status = any (array['pending', 'accepted', 'declined', 'expired', 'cancelled'])
  )
);

-- Waitlist
create table public.waitlist (
  id uuid not null default gen_random_uuid(),
  email character varying(255) not null,
  full_name character varying(255) null,
  interest_type character varying(50) not null,
  created_at timestamp with time zone null default now(),
  constraint waitlist_pkey primary key (id),
  constraint waitlist_email_key unique (email)
);

-- Vouches (depends on users)
create table public.vouches (
  id uuid not null default gen_random_uuid(),
  voucher_id uuid not null,
  vouchee_id uuid not null,
  vouch_type text not null default 'character',
  relationship text not null,
  relationship_details text null,
  known_years integer null,
  known_since date null,
  message text null,
  guarantee_percentage integer null default 0,
  guarantee_max_amount numeric(12,2) null default 0,
  guarantee_used numeric(12,2) null default 0,
  vouch_strength integer null default 0,
  trust_score_boost integer null default 0,
  status text null default 'active',
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
  constraint vouches_vouchee_id_fkey foreign key (vouchee_id) references users (id) on delete cascade,
  constraint vouches_voucher_id_fkey foreign key (voucher_id) references users (id) on delete cascade,
  constraint vouches_guarantee_percentage_check check (guarantee_percentage >= 0 and guarantee_percentage <= 100)
);

-- Vouch Requests (depends on users, vouches)
create table public.vouch_requests (
  id uuid not null default gen_random_uuid(),
  requester_id uuid not null,
  requested_user_id uuid null,
  requested_email text null,
  requested_name text null,
  message text null,
  suggested_relationship text null,
  status text null default 'pending',
  response_message text null,
  responded_at timestamp with time zone null,
  vouch_id uuid null,
  created_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + interval '30 days'),
  invite_token text null,
  constraint vouch_requests_pkey primary key (id),
  constraint vouch_requests_invite_token_key unique (invite_token),
  constraint vouch_requests_requested_user_id_fkey foreign key (requested_user_id) references users (id),
  constraint vouch_requests_requester_id_fkey foreign key (requester_id) references users (id) on delete cascade,
  constraint vouch_requests_vouch_id_fkey foreign key (vouch_id) references vouches (id)
);

-- Now create tables that depend on loans
-- Loans (main table - depends on users, business_profiles, loan_requests, loan_matches)
create table public.loans (
  id uuid not null default extensions.uuid_generate_v4(),
  borrower_id uuid null,
  lender_id uuid null,
  business_lender_id uuid null,
  lender_type text not null,
  invite_email text null,
  invite_phone text null,
  invite_token text null,
  invite_accepted boolean null default false,
  amount numeric(12,2) not null,
  currency text null default 'USD',
  purpose text null,
  repayment_frequency text not null,
  repayment_amount numeric(12,2) not null,
  total_installments integer not null,
  start_date date not null,
  pickup_person_name text null,
  pickup_person_location text null,
  status text not null default 'pending',
  amount_paid numeric(12,2) null default 0,
  amount_remaining numeric(12,2) null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  interest_rate numeric(5,2) null default 0,
  interest_type text null default 'simple',
  total_interest numeric(12,2) null default 0,
  total_amount numeric(12,2) not null,
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
  lender_interest_rate numeric(5,2) null,
  lender_interest_type text null,
  interest_set_by_lender boolean null default false,
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
  match_status text null default 'pending',
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
  disbursement_status character varying(50) null default 'pending',
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
  duration_fee_percent numeric(5,2) null default 0,
  duration_fee_amount numeric(12,2) null default 0,
  uses_apr_calculation boolean null default false,
  borrower_trust_tier character varying(20) null,
  borrower_vouch_count integer null,
  was_first_time_borrower boolean null default false,
  constraint loans_pkey primary key (id),
  constraint loans_invite_token_key unique (invite_token),
  constraint loans_borrower_id_fkey foreign key (borrower_id) references users (id) on delete cascade,
  constraint loans_lender_id_fkey foreign key (lender_id) references users (id) on delete set null,
  constraint loans_business_lender_id_fkey foreign key (business_lender_id) references business_profiles (id) on delete set null,
  constraint loans_loan_request_id_fkey foreign key (loan_request_id) references loan_requests (id) on delete set null,
  -- current_match_id fkey will be added after loan_matches is created
  constraint check_total_interest check (
    (uses_apr_calculation = true) or
    (abs(total_interest - (amount * (interest_rate / 100))) < 0.01)
  ),
  constraint loans_status_check check (
    status = any (array['pending', 'pending_signature', 'pending_funds', 'active', 'completed', 'declined', 'cancelled', 'defaulted'])
  ),
  constraint loans_borrower_payment_method_check check (
    borrower_payment_method = any (array['paypal', 'cashapp', 'venmo'])
  ),
  constraint loans_disbursement_method_check check (
    disbursement_method = any (array['paypal', 'mobile_money', 'cash_pickup', 'bank_transfer'])
  ),
  constraint loans_interest_type_check check (
    interest_type = any (array['simple', 'compound'])
  ),
  constraint loans_lender_interest_type_check check (
    lender_interest_type = any (array['simple', 'compound'])
  ),
  constraint loans_lender_type_check check (
    lender_type = any (array['business', 'personal'])
  ),
  constraint loans_match_status_check check (
    match_status = any (array['pending', 'matching', 'matched', 'no_match', 'manual'])
  ),
  constraint loans_repayment_frequency_check check (
    repayment_frequency = any (array['weekly', 'biweekly', 'monthly', 'custom'])
  )
);

-- Now add the loan_id fkey to loan_requests
alter table public.loan_requests
  add constraint loan_requests_loan_id_fkey foreign key (loan_id) references loans (id) on delete set null;

-- Loan Matches (depends on loans, users, business_profiles)
create table public.loan_matches (
  id uuid not null default gen_random_uuid(),
  loan_id uuid not null,
  lender_user_id uuid null,
  lender_business_id uuid null,
  match_score numeric(5,2) null,
  match_rank integer null,
  status text null default 'pending',
  offered_at timestamp with time zone null default now(),
  expires_at timestamp with time zone null default (now() + interval '24 hours'),
  responded_at timestamp with time zone null,
  was_auto_accepted boolean null default false,
  decline_reason text null,
  created_at timestamp with time zone null default now(),
  constraint loan_matches_pkey primary key (id),
  constraint loan_matches_lender_business_id_fkey foreign key (lender_business_id) references business_profiles (id),
  constraint loan_matches_lender_user_id_fkey foreign key (lender_user_id) references users (id),
  constraint loan_matches_loan_id_fkey foreign key (loan_id) references loans (id) on delete cascade,
  constraint loan_matches_status_check check (
    status = any (array['pending', 'accepted', 'declined', 'expired', 'auto_accepted', 'skipped'])
  )
);

-- Now add the current_match_id fkey to loans
alter table public.loans
  add constraint loans_current_match_id_fkey foreign key (current_match_id) references loan_matches (id);

-- Payments (depends on loans, users, payment_schedule - will add schedule fkey after payment_schedule created)
create table public.payments (
  id uuid not null default extensions.uuid_generate_v4(),
  loan_id uuid not null,
  schedule_id uuid null,
  amount numeric(12,2) not null,
  payment_date timestamp with time zone not null,
  status text not null default 'pending',
  confirmed_by uuid null,
  confirmation_date timestamp with time zone null,
  note text null,
  proof_url text null,
  paypal_transaction_id text null,
  created_at timestamp with time zone null default now(),
  constraint payments_pkey primary key (id),
  constraint payments_confirmed_by_fkey foreign key (confirmed_by) references users (id) on delete set null,
  constraint payments_loan_id_fkey foreign key (loan_id) references loans (id) on delete cascade
  -- schedule_id fkey will be added after payment_schedule is created
);

-- Payment Schedule (depends on loans, payments)
create table public.payment_schedule (
  id uuid not null default extensions.uuid_generate_v4(),
  loan_id uuid not null,
  due_date date not null,
  amount numeric(12,2) not null,
  is_paid boolean null default false,
  payment_id uuid null,
  created_at timestamp with time zone null default now(),
  principal_amount numeric(12,2) not null,
  interest_amount numeric(12,2) null default 0,
  paid_days_diff integer null,
  reminder_sent_at timestamp with time zone null,
  overdue_reminder_sent_at timestamp with time zone null,
  status text null default 'pending',
  last_manual_reminder_at timestamp with time zone null,
  manual_reminder_count integer null default 0,
  transfer_id character varying(255) null,
  paid_at timestamp with time zone null,
  notes text null,
  platform_fee numeric(10,2) null default 0,
  retry_count integer null default 0,
  last_retry_at timestamp with time zone null,
  next_retry_at timestamp with time zone null,
  retry_history jsonb null default '[]'::jsonb,
  caused_block boolean null default false,
  payment_status character varying(20) null default 'pending',
  manual_payment boolean null default false,
  payment_method text null,
  payment_reference text null,
  marked_paid_by uuid null,
  transaction_reference text null,
  payment_proof_url text null,
  constraint payment_schedule_pkey primary key (id),
  constraint payment_schedule_loan_id_fkey foreign key (loan_id) references loans (id) on delete cascade,
  constraint payment_schedule_marked_paid_by_fkey foreign key (marked_paid_by) references users (id),
  constraint fk_payment foreign key (payment_id) references payments (id) on delete set null,
  constraint payment_schedule_status_check check (
    status = any (array['pending', 'paid', 'overdue', 'missed'])
  )
);

-- Now add the schedule_id fkey to payments
alter table public.payments
  add constraint payments_schedule_id_fkey foreign key (schedule_id) references payment_schedule (id) on delete set null;

-- Payment Retry Log (depends on users, loans)
create table public.payment_retry_log (
  id uuid not null default gen_random_uuid(),
  payment_id uuid not null,
  loan_id uuid null,
  borrower_id uuid null,
  retry_number integer not null,
  attempted_at timestamp with time zone not null default now(),
  amount numeric(12,2) null,
  success boolean not null default false,
  error_message text null,
  payment_method character varying(50) null,
  will_block_on_failure boolean null default false,
  created_at timestamp with time zone null default now(),
  constraint payment_retry_log_pkey primary key (id),
  constraint payment_retry_log_borrower_id_fkey foreign key (borrower_id) references users (id),
  constraint payment_retry_log_loan_id_fkey foreign key (loan_id) references loans (id)
);

-- Payment Transactions (depends on loans, payment_schedule, payment_providers, users, user_payment_methods)
create table public.payment_transactions (
  id uuid not null default gen_random_uuid(),
  loan_id uuid null,
  payment_schedule_id uuid null,
  payment_provider_id uuid null,
  sender_id uuid null,
  receiver_id uuid null,
  sender_payment_method_id uuid null,
  receiver_payment_method_id uuid null,
  transaction_type character varying(20) not null,
  amount numeric(12,2) not null,
  currency character varying(3) null default 'USD',
  fee_amount numeric(10,2) null default 0,
  net_amount numeric(12,2) null,
  status character varying(20) null default 'pending',
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
  constraint payment_transactions_disputed_by_fkey foreign key (disputed_by) references users (id),
  constraint payment_transactions_loan_id_fkey foreign key (loan_id) references loans (id) on delete set null,
  constraint payment_transactions_payment_provider_id_fkey foreign key (payment_provider_id) references payment_providers (id),
  constraint payment_transactions_payment_schedule_id_fkey foreign key (payment_schedule_id) references payment_schedule (id) on delete set null,
  constraint payment_transactions_confirmed_by_fkey foreign key (confirmed_by) references users (id),
  constraint payment_transactions_receiver_payment_method_id_fkey foreign key (receiver_payment_method_id) references user_payment_methods (id),
  constraint payment_transactions_sender_id_fkey foreign key (sender_id) references users (id),
  constraint payment_transactions_sender_payment_method_id_fkey foreign key (sender_payment_method_id) references user_payment_methods (id),
  constraint payment_transactions_proof_uploaded_by_fkey foreign key (proof_uploaded_by) references users (id),
  constraint payment_transactions_receiver_id_fkey foreign key (receiver_id) references users (id),
  constraint payment_transactions_proof_type_check check (
    proof_type = any (array['screenshot', 'receipt', 'reference_number', 'photo'])
  ),
  constraint payment_transactions_transaction_type_check check (
    transaction_type = any (array['disbursement', 'repayment', 'refund', 'fee'])
  ),
  constraint payment_transactions_status_check check (
    status = any (array['pending', 'awaiting_proof', 'awaiting_confirmation', 'processing', 'completed', 'failed', 'cancelled', 'disputed', 'refunded'])
  )
);

-- Transfers (depends on loans, users)
create table public.transfers (
  id uuid not null default extensions.uuid_generate_v4(),
  loan_id uuid null,
  dwolla_transfer_id character varying(255) null,
  dwolla_transfer_url text null,
  type character varying(50) not null,
  amount numeric(10,2) not null,
  currency character varying(3) null default 'USD',
  status character varying(50) null default 'pending',
  source_user_id uuid null,
  destination_user_id uuid null,
  failure_reason text null,
  processed_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  platform_fee numeric(10,2) null default 0,
  fee_type text null,
  gross_amount numeric(10,2) null,
  net_amount numeric(10,2) null,
  constraint transfers_pkey primary key (id),
  constraint transfers_dwolla_transfer_id_unique unique (dwolla_transfer_id),
  constraint transfers_destination_user_id_fkey foreign key (destination_user_id) references users (id),
  constraint transfers_loan_id_fkey foreign key (loan_id) references loans (id) on delete cascade,
  constraint transfers_source_user_id_fkey foreign key (source_user_id) references users (id)
);

-- Trust Score Events (depends on users, loans, payments, vouches)
create table public.trust_score_events (
  id uuid not null default gen_random_uuid(),
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
  constraint trust_score_events_loan_id_fkey foreign key (loan_id) references loans (id),
  constraint trust_score_events_other_user_id_fkey foreign key (other_user_id) references users (id),
  constraint trust_score_events_user_id_fkey foreign key (user_id) references users (id) on delete cascade
);

-- Notifications (depends on users, loans)
create table public.notifications (
  id uuid not null default extensions.uuid_generate_v4(),
  user_id uuid not null,
  loan_id uuid null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean null default false,
  created_at timestamp with time zone null default now(),
  data jsonb not null default '{}'::jsonb,
  constraint notifications_pkey primary key (id),
  constraint notifications_loan_id_fkey foreign key (loan_id) references loans (id) on delete cascade,
  constraint notifications_user_id_fkey foreign key (user_id) references users (id) on delete cascade,
  constraint notifications_type_check check (
    type = any (array[
      'reminder', 'payment_received', 'payment_confirmed', 'payment_confirmation_needed',
      'payment_disputed', 'payment_reminder', 'payment_retry_success', 'payment_retry_failed',
      'loan_request', 'loan_accepted', 'loan_declined', 'loan_cancelled', 'loan_created',
      'loan_match_offer', 'loan_completed', 'contract_signed', 'paypal_required',
      'bank_required', 'funds_sent', 'funds_disbursed', 'transfer_completed',
      'transfer_failed', 'account_blocked', 'vouch_received', 'voucher_defaulted',
      'voucher_completed', 'voucher_locked'
    ])
  )
);

-- Borrower Blocks (depends on users, loans) - now that loans is created
create table public.borrower_blocks (
  id uuid not null default gen_random_uuid(),
  user_id uuid not null,
  loan_id uuid null,
  blocked_at timestamp with time zone not null default now(),
  blocked_reason text null,
  total_debt_at_block numeric(12,2) null,
  debt_cleared_at timestamp with time zone null,
  restriction_ends_at timestamp with time zone null,
  restriction_lifted_at timestamp with time zone null,
  lifted_by uuid null,
  status character varying(20) null default 'active',
  created_at timestamp with time zone null default now(),
  constraint borrower_blocks_pkey primary key (id),
  constraint borrower_blocks_lifted_by_fkey foreign key (lifted_by) references users (id),
  constraint borrower_blocks_loan_id_fkey foreign key (loan_id) references loans (id),
  constraint borrower_blocks_user_id_fkey foreign key (user_id) references users (id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Admin Email Logs indexes
create index if not exists idx_admin_email_logs_sent_by on public.admin_email_logs using btree (sent_by);
create index if not exists idx_admin_email_logs_email_type on public.admin_email_logs using btree (email_type);
create index if not exists idx_admin_email_logs_status on public.admin_email_logs using btree (status);
create index if not exists idx_admin_email_logs_sent_at on public.admin_email_logs using btree (sent_at desc);
create index if not exists idx_admin_email_logs_created_at on public.admin_email_logs using btree (created_at desc);

-- Borrower Blocks indexes
create index if not exists idx_borrower_blocks_user_id on public.borrower_blocks using btree (user_id);
create index if not exists idx_borrower_blocks_status on public.borrower_blocks using btree (status);

-- Borrower Business Trust indexes
create index if not exists idx_bbt_borrower on public.borrower_business_trust using btree (borrower_id);
create index if not exists idx_bbt_business on public.borrower_business_trust using btree (business_id);
create index if not exists idx_bbt_status on public.borrower_business_trust using btree (trust_status);
create index if not exists idx_bbt_graduated on public.borrower_business_trust using btree (has_graduated);

-- Business Profiles indexes
create index if not exists idx_business_interest on public.business_profiles using btree (total_interest_earned);
create unique index if not exists idx_business_profiles_slug on public.business_profiles using btree (slug) where (slug is not null);
create index if not exists idx_business_profiles_public on public.business_profiles using btree (public_profile_enabled, verification_status) 
  where (public_profile_enabled = true and verification_status = 'approved');
create index if not exists idx_business_verified on public.business_profiles using btree (is_verified, public_profile_enabled) where (is_verified = true);
create index if not exists idx_business_user on public.business_profiles using btree (user_id);
create index if not exists idx_business_profiles_dwolla_funding on public.business_profiles using btree (dwolla_funding_source_url) 
  where (dwolla_funding_source_url is not null);
create index if not exists idx_business_profiles_cashapp on public.business_profiles using btree (cashapp_username) where (cashapp_username is not null);
create index if not exists idx_business_profiles_venmo on public.business_profiles using btree (venmo_username) where (venmo_username is not null);
create index if not exists idx_business_profiles_zelle_email on public.business_profiles using btree (zelle_email) where (zelle_email is not null);
create index if not exists idx_business_profiles_zelle_phone on public.business_profiles using btree (zelle_phone) where (zelle_phone is not null);
create index if not exists idx_business_profiles_paypal on public.business_profiles using btree (paypal_email) where (paypal_email is not null);

-- Country Payment Methods indexes
create index if not exists idx_country_payment_methods_country on public.country_payment_methods using btree (country_code);
create index if not exists idx_country_payment_methods_provider on public.country_payment_methods using btree (payment_provider_id);

-- Cron Job Runs indexes
create index if not exists idx_cron_job_runs_job_name on public.cron_job_runs using btree (job_name);
create index if not exists idx_cron_job_runs_started_at on public.cron_job_runs using btree (started_at desc);
create index if not exists idx_cron_job_runs_status on public.cron_job_runs using btree (status);

-- Guest Lenders indexes

-- Lender Preferences indexes
create index if not exists idx_lender_prefs_user_id on public.lender_preferences using btree (user_id);
create index if not exists idx_lender_prefs_business_id on public.lender_preferences using btree (business_id);
create index if not exists idx_lender_prefs_active on public.lender_preferences using btree (is_active);
create index if not exists idx_lender_prefs_countries on public.lender_preferences using gin (countries);
create index if not exists idx_lender_prefs_states on public.lender_preferences using gin (states);
create index if not exists idx_lender_prefs_business on public.lender_preferences using btree (business_id, is_active) where (business_id is not null);
create index if not exists idx_lender_prefs_user on public.lender_preferences using btree (user_id, is_active) where (user_id is not null);
create index if not exists idx_lender_prefs_capital on public.lender_preferences using btree (capital_pool, capital_reserved, min_amount, max_amount) 
  where (is_active = true);

-- Lender Tier Policies indexes
create index if not exists idx_lender_tier_policies_lender on public.lender_tier_policies using btree (lender_id);
create index if not exists idx_lender_tier_policies_tier on public.lender_tier_policies using btree (tier_id);
create index if not exists idx_lender_tier_policies_active on public.lender_tier_policies using btree (tier_id, is_active) where (is_active = true);

-- Loan Matches indexes
create index if not exists idx_loan_matches_loan_id on public.loan_matches using btree (loan_id);
create index if not exists idx_loan_matches_lender_user on public.loan_matches using btree (lender_user_id);
create index if not exists idx_loan_matches_lender_business on public.loan_matches using btree (lender_business_id);
create index if not exists idx_loan_matches_status on public.loan_matches using btree (status);

-- Loan Requests indexes
create index if not exists idx_loan_requests_status on public.loan_requests using btree (status);
create index if not exists idx_loan_requests_borrower_email on public.loan_requests using btree (borrower_email);
create index if not exists idx_loan_requests_access_token on public.loan_requests using btree (access_token);
create index if not exists idx_loan_requests_created_at on public.loan_requests using btree (created_at desc);

-- Loans indexes
create index if not exists idx_loans_borrower on public.loans using btree (borrower_id);
create index if not exists idx_loans_lender on public.loans using btree (lender_id);
create index if not exists idx_loans_business_lender on public.loans using btree (business_lender_id);
create index if not exists idx_loans_status on public.loans using btree (status);
create index if not exists idx_loans_invite_token on public.loans using btree (invite_token);
create index if not exists idx_loans_funds_pending on public.loans using btree (status, funds_sent) 
  where (status = 'pending_funds' and funds_sent = false);
create index if not exists idx_loans_pending_disbursement on public.loans using btree (status, funds_disbursed) 
  where (status = 'pending_disbursement' and funds_disbursed = false);
create index if not exists idx_loans_awaiting_payment on public.loans using btree (status, funds_sent) 
  where (status = 'active' and funds_sent = false);
create index if not exists idx_loans_country on public.loans using btree (country);
create index if not exists idx_loans_state on public.loans using btree (state);
create index if not exists idx_loans_loan_type on public.loans using btree (loan_type_id);
create index if not exists idx_loans_borrower_invite_email on public.loans using btree (borrower_invite_email);
create index if not exists idx_loans_borrower_access_token on public.loans using btree (borrower_access_token);
create index if not exists idx_loans_auto_matched on public.loans using btree (auto_matched);
create index if not exists idx_loans_loan_request_id on public.loans using btree (loan_request_id);
create index if not exists idx_loans_borrower_status on public.loans using btree (borrower_id, status);
create index if not exists idx_loans_lender_status on public.loans using btree (lender_id, status) where (lender_id is not null);
create index if not exists idx_loans_business_lender_status on public.loans using btree (business_lender_id, status) where (business_lender_id is not null);
create index if not exists idx_loans_status_created on public.loans using btree (status, created_at desc);
create index if not exists idx_loans_borrower_active on public.loans using btree (borrower_id, amount_remaining, created_at desc) 
  where (status = 'active');
create index if not exists idx_loans_lender_active on public.loans using btree (lender_id, amount_remaining, created_at desc) 
  where (status = 'active' and lender_id is not null);
create index if not exists idx_loans_amount on public.loans using btree (amount);
create index if not exists idx_loans_country_state on public.loans using btree (country, state) where (country is not null);

-- Notifications indexes
create index if not exists idx_notifications_user on public.notifications using btree (user_id);
create index if not exists idx_notifications_unread on public.notifications using btree (user_id, is_read);
create index if not exists idx_notifications_user_unread on public.notifications using btree (user_id, is_read, created_at desc);
create index if not exists idx_notifications_loan on public.notifications using btree (loan_id, user_id) where (loan_id is not null);

-- Payment Providers indexes
create index if not exists idx_payment_providers_enabled on public.payment_providers using btree (is_enabled) where (is_enabled = true);
create index if not exists idx_payment_providers_slug on public.payment_providers using btree (slug);

-- Payment Retry Log indexes
create index if not exists idx_payment_retry_log_payment_id on public.payment_retry_log using btree (payment_id);
create index if not exists idx_payment_retry_log_borrower_id on public.payment_retry_log using btree (borrower_id);
create index if not exists idx_payment_retry_log_attempted_at on public.payment_retry_log using btree (attempted_at desc);

-- Payment Schedule indexes
create index if not exists idx_payment_schedule_due_date on public.payment_schedule using btree (due_date);
create index if not exists idx_payment_schedule_status on public.payment_schedule using btree (status);
create index if not exists idx_payment_schedule_loan on public.payment_schedule using btree (loan_id);
create index if not exists idx_payment_schedule_due_unpaid on public.payment_schedule using btree (due_date, is_paid) where (is_paid = false);
create index if not exists idx_payment_schedule_loan_paid on public.payment_schedule using btree (loan_id, is_paid, due_date);
create index if not exists idx_payment_schedule_status_due on public.payment_schedule using btree (status, due_date) where (status is not null);
create index if not exists idx_payment_schedule_unpaid on public.payment_schedule using btree (loan_id, due_date) where (is_paid = false);

-- Payment Transactions indexes
create index if not exists idx_payment_transactions_loan on public.payment_transactions using btree (loan_id);
create index if not exists idx_payment_transactions_status on public.payment_transactions using btree (status);
create index if not exists idx_payment_transactions_type on public.payment_transactions using btree (transaction_type);
create index if not exists idx_payment_transactions_sender on public.payment_transactions using btree (sender_id);
create index if not exists idx_payment_transactions_receiver on public.payment_transactions using btree (receiver_id);

-- Payments indexes
create index if not exists idx_payments_loan on public.payments using btree (loan_id);
create index if not exists idx_payments_loan_status on public.payments using btree (loan_id, status, payment_date desc);

-- Pending Loan Requests indexes
create index if not exists idx_pending_loans_user on public.pending_loan_requests using btree (user_id);
create index if not exists idx_pending_loans_status on public.pending_loan_requests using btree (status);
create index if not exists idx_pending_loans_business_lender on public.pending_loan_requests using btree (business_lender_id);
create index if not exists idx_pending_loans_created on public.pending_loan_requests using btree (created_at);

-- States indexes
create index if not exists idx_states_country_id on public.states using btree (country_id);
create index if not exists idx_states_code on public.states using btree (code);
create index if not exists idx_states_is_active on public.states using btree (is_active);

-- Transfers indexes
create index if not exists idx_transfers_type on public.transfers using btree (type);
create index if not exists idx_transfers_loan_id on public.transfers using btree (loan_id);
create index if not exists idx_transfers_dwolla_id on public.transfers using btree (dwolla_transfer_id);
create index if not exists idx_transfers_status on public.transfers using btree (status);

-- Trust Score Events indexes
create index if not exists idx_trust_score_events_user on public.trust_score_events using btree (user_id);
create index if not exists idx_trust_score_events_type on public.trust_score_events using btree (event_type);
create index if not exists idx_trust_score_events_created on public.trust_score_events using btree (created_at desc);
create index if not exists idx_trust_score_events_payment_dedup on public.trust_score_events using btree (user_id, payment_id, event_type) 
  where (payment_id is not null);
create index if not exists idx_trust_score_events_loan on public.trust_score_events using btree (loan_id) where (loan_id is not null);

-- Trust Scores indexes
create index if not exists idx_trust_scores_user on public.trust_scores using btree (user_id);
create index if not exists idx_trust_scores_score on public.trust_scores using btree (score desc);
create index if not exists idx_trust_scores_grade on public.trust_scores using btree (score_grade);

-- User Financial Profiles indexes
create index if not exists idx_financial_profiles_user on public.user_financial_profiles using btree (user_id);

-- User Payment Methods indexes
create index if not exists idx_user_payment_methods_user on public.user_payment_methods using btree (user_id);
create index if not exists idx_user_payment_methods_provider on public.user_payment_methods using btree (payment_provider_id);

-- Users indexes
create index if not exists idx_users_auto_payments on public.users using btree (auto_payments_count);
create index if not exists idx_users_vouching_locked on public.users using btree (vouching_locked) where (vouching_locked = true);
create index if not exists idx_users_vouching_success_rate on public.users using btree (vouching_success_rate);
create index if not exists idx_users_verification_status on public.users using btree (verification_status);
create index if not exists idx_users_borrower_rating on public.users using btree (borrower_rating);
create index if not exists idx_users_bank_connected on public.users using btree (bank_connected);
create index if not exists idx_users_country on public.users using btree (country);
create index if not exists idx_users_state on public.users using btree (state);
create index if not exists idx_users_is_admin on public.users using btree (is_admin) where (is_admin = true);
create index if not exists idx_users_reverification_due on public.users using btree (reverification_due_at) 
  where (verification_status = 'verified' and reverification_due_at is not null);
create index if not exists idx_users_verified_at on public.users using btree (verified_at) where (verification_status = 'verified');
create index if not exists idx_users_dwolla_customer on public.users using btree (dwolla_customer_id);
create index if not exists idx_users_username on public.users using btree (username);
create index if not exists idx_users_email on public.users using btree (email);
create index if not exists idx_users_user_type on public.users using btree (user_type);
create index if not exists idx_users_created_at on public.users using btree (created_at desc);
create index if not exists idx_users_manual_payments on public.users using btree (manual_payments_count);
create index if not exists idx_users_dwolla_funding on public.users using btree (dwolla_funding_source_url) where (dwolla_funding_source_url is not null);
create index if not exists idx_users_trust_tier on public.users using btree (trust_tier);
create index if not exists idx_users_vouch_count on public.users using btree (vouch_count);

-- Vouch Requests indexes
create index if not exists idx_vouch_requests_requester on public.vouch_requests using btree (requester_id);
create index if not exists idx_vouch_requests_requested on public.vouch_requests using btree (requested_user_id);
create index if not exists idx_vouch_requests_status on public.vouch_requests using btree (status);
create index if not exists idx_vouch_requests_token on public.vouch_requests using btree (invite_token);

-- Vouches indexes
create index if not exists idx_vouches_active_by_vouchee on public.vouches using btree (vouchee_id, voucher_id) where (status = 'active');
create index if not exists idx_vouches_voucher on public.vouches using btree (voucher_id);
create index if not exists idx_vouches_vouchee on public.vouches using btree (vouchee_id);
create index if not exists idx_vouches_status on public.vouches using btree (status);
create index if not exists idx_vouches_active on public.vouches using btree (vouchee_id) where (status = 'active');

-- Waitlist indexes
create index if not exists idx_waitlist_email on public.waitlist using btree (email);
create index if not exists idx_waitlist_interest on public.waitlist using btree (interest_type);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Borrower Business Trust triggers
create trigger tr_borrower_trust_updated_at before update on borrower_business_trust
  for each row execute function update_borrower_trust_timestamp();

-- Business Profiles triggers
create trigger update_business_profiles_updated_at before update on business_profiles
  for each row execute function update_updated_at();

-- Countries triggers
create trigger update_countries_updated_at before update on countries
  for each row execute function update_updated_at_column();

-- Fee Configurations triggers
create trigger update_fee_configurations_updated_at before update on fee_configurations
  for each row execute function update_updated_at_column();

-- Lender Preferences triggers
create trigger trigger_lender_prefs_timestamp before update on lender_preferences
  for each row execute function update_lender_prefs_timestamp();

-- Lender Tier Policies triggers
create trigger update_lender_tier_policies_updated_at before update on lender_tier_policies
  for each row execute function update_lender_tier_policies_updated_at();

-- Loan Requests triggers
create trigger update_loan_requests_updated_at before update on loan_requests
  for each row execute function update_loan_requests_updated_at();

-- Loan Types triggers
create trigger update_loan_types_updated_at before update on loan_types
  for each row execute function update_updated_at_column();

-- Loans triggers
create trigger update_loans_updated_at before update on loans
  for each row execute function update_updated_at();

-- Payment Providers triggers
create trigger payment_providers_updated before update on payment_providers
  for each row execute function update_payment_providers_timestamp();

-- Payment Transactions triggers
create trigger payment_transactions_updated before update on payment_transactions
  for each row execute function update_payment_providers_timestamp();

-- Platform Settings triggers
create trigger update_platform_settings_updated_at before update on platform_settings
  for each row execute function update_updated_at_column();

-- Transfers triggers
create trigger transfers_updated_at before update on transfers
  for each row execute function update_transfers_updated_at();

-- Trust Scores triggers
create trigger trust_score_update_timestamp before update on trust_scores
  for each row execute function update_trust_score_timestamp();

-- User Financial Profiles triggers
create trigger update_financial_profiles_updated_at before update on user_financial_profiles
  for each row execute function update_updated_at();

-- User Payment Methods triggers
create trigger user_payment_methods_updated before update on user_payment_methods
  for each row execute function update_payment_providers_timestamp();

-- Users triggers
create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at();