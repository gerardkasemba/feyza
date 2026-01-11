-- LoanTrack Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('individual', 'business')) DEFAULT 'individual',
  -- PayPal Integration
  paypal_email TEXT,
  paypal_payer_id TEXT,
  paypal_connected BOOLEAN DEFAULT FALSE,
  paypal_connected_at TIMESTAMPTZ,
  -- Notification preferences
  email_reminders BOOLEAN DEFAULT TRUE,
  reminder_days_before INTEGER DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business profiles for business lenders
CREATE TABLE public.business_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  description TEXT,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  -- Interest rate settings
  default_interest_rate DECIMAL(5, 2) DEFAULT 0, -- Annual percentage rate (e.g., 12.50 = 12.5%)
  interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
  min_loan_amount DECIMAL(12, 2),
  max_loan_amount DECIMAL(12, 2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Loans table
CREATE TABLE public.loans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  borrower_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  lender_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  business_lender_id UUID REFERENCES public.business_profiles(id) ON DELETE SET NULL,
  lender_type TEXT NOT NULL CHECK (lender_type IN ('business', 'personal')),
  
  -- For invite-based loans (personal)
  invite_email TEXT,
  invite_phone TEXT,
  invite_token TEXT UNIQUE,
  invite_accepted BOOLEAN DEFAULT FALSE,
  
  -- Loan details
  amount DECIMAL(12, 2) NOT NULL, -- Principal amount
  currency TEXT DEFAULT 'USD',
  purpose TEXT,
  
  -- Interest settings
  interest_rate DECIMAL(5, 2) DEFAULT 0, -- Annual percentage rate
  interest_type TEXT DEFAULT 'simple' CHECK (interest_type IN ('simple', 'compound')),
  total_interest DECIMAL(12, 2) DEFAULT 0, -- Calculated total interest
  total_amount DECIMAL(12, 2) NOT NULL, -- Principal + interest (total to repay)
  
  -- Repayment terms
  repayment_frequency TEXT NOT NULL CHECK (repayment_frequency IN ('weekly', 'biweekly', 'monthly', 'custom')),
  repayment_amount DECIMAL(12, 2) NOT NULL, -- Amount per installment (includes interest)
  total_installments INTEGER NOT NULL,
  start_date DATE NOT NULL,
  
  -- Contract/Agreement
  contract_generated BOOLEAN DEFAULT FALSE,
  contract_url TEXT,
  borrower_signed BOOLEAN DEFAULT FALSE,
  borrower_signed_at TIMESTAMPTZ,
  borrower_signature_ip TEXT,
  lender_signed BOOLEAN DEFAULT FALSE,
  lender_signed_at TIMESTAMPTZ,
  lender_signature_ip TEXT,
  
  -- Auto-payment settings
  auto_payment_enabled BOOLEAN DEFAULT FALSE,
  auto_payment_reminder_sent BOOLEAN DEFAULT FALSE,
  
  -- Diaspora support
  pickup_person_name TEXT,
  pickup_person_location TEXT,
  
  -- Status tracking
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined', 'cancelled')) DEFAULT 'pending',
  amount_paid DECIMAL(12, 2) DEFAULT 0,
  amount_remaining DECIMAL(12, 2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payment schedule table
CREATE TABLE public.payment_schedule (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  due_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL, -- Total payment amount
  principal_amount DECIMAL(12, 2) NOT NULL, -- Principal portion
  interest_amount DECIMAL(12, 2) DEFAULT 0, -- Interest portion
  is_paid BOOLEAN DEFAULT FALSE,
  payment_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  loan_id UUID NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES public.payment_schedule(id) ON DELETE SET NULL,
  amount DECIMAL(12, 2) NOT NULL,
  payment_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'disputed')) DEFAULT 'pending',
  confirmed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  confirmation_date TIMESTAMPTZ,
  note TEXT,
  proof_url TEXT,
  paypal_transaction_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key for payment_id in payment_schedule
ALTER TABLE public.payment_schedule
ADD CONSTRAINT fk_payment
FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE SET NULL;

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('reminder', 'payment_received', 'payment_confirmed', 'loan_request', 'loan_accepted', 'loan_declined')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_loans_borrower ON public.loans(borrower_id);
CREATE INDEX idx_loans_lender ON public.loans(lender_id);
CREATE INDEX idx_loans_business_lender ON public.loans(business_lender_id);
CREATE INDEX idx_loans_status ON public.loans(status);
CREATE INDEX idx_loans_invite_token ON public.loans(invite_token);
CREATE INDEX idx_payment_schedule_loan ON public.payment_schedule(loan_id);
CREATE INDEX idx_payment_schedule_due ON public.payment_schedule(due_date);
CREATE INDEX idx_payments_loan ON public.payments(loan_id);
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_unread ON public.notifications(user_id, is_read);

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view their own profile"
ON public.users FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

-- Business profiles policies
CREATE POLICY "Anyone can view verified business profiles"
ON public.business_profiles FOR SELECT
USING (is_verified = true);

CREATE POLICY "Users can manage their own business profile"
ON public.business_profiles FOR ALL
USING (auth.uid() = user_id);

-- Loans policies
CREATE POLICY "Users can view loans they're involved in"
ON public.loans FOR SELECT
USING (
  auth.uid() = borrower_id OR 
  auth.uid() = lender_id OR 
  auth.uid() IN (SELECT user_id FROM business_profiles WHERE id = business_lender_id)
);

CREATE POLICY "Users can create loans as borrower"
ON public.loans FOR INSERT
WITH CHECK (auth.uid() = borrower_id);

CREATE POLICY "Users can update loans they're involved in"
ON public.loans FOR UPDATE
USING (
  auth.uid() = borrower_id OR 
  auth.uid() = lender_id OR 
  auth.uid() IN (SELECT user_id FROM business_profiles WHERE id = business_lender_id)
);

-- Payment schedule policies
CREATE POLICY "Users can view payment schedules for their loans"
ON public.payment_schedule FOR SELECT
USING (
  loan_id IN (
    SELECT id FROM loans 
    WHERE borrower_id = auth.uid() OR lender_id = auth.uid()
  )
);

CREATE POLICY "Loan participants can manage payment schedules"
ON public.payment_schedule FOR ALL
USING (
  loan_id IN (
    SELECT id FROM loans 
    WHERE borrower_id = auth.uid() OR lender_id = auth.uid()
  )
);

-- Payments policies
CREATE POLICY "Users can view payments for their loans"
ON public.payments FOR SELECT
USING (
  loan_id IN (
    SELECT id FROM loans 
    WHERE borrower_id = auth.uid() OR lender_id = auth.uid()
  )
);

CREATE POLICY "Loan participants can manage payments"
ON public.payments FOR ALL
USING (
  loan_id IN (
    SELECT id FROM loans 
    WHERE borrower_id = auth.uid() OR lender_id = auth.uid()
  )
);

-- Notifications policies
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'individual')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_business_profiles_updated_at
BEFORE UPDATE ON public.business_profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_loans_updated_at
BEFORE UPDATE ON public.loans
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
