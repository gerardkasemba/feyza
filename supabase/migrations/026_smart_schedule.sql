-- Migration: Smart Schedule - User Financial Profiles
-- Stores income, expenses, and pay schedule to calculate optimal loan repayments

-- Create financial profiles table
CREATE TABLE IF NOT EXISTS user_financial_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Income Information
  pay_frequency TEXT NOT NULL DEFAULT 'biweekly' CHECK (pay_frequency IN ('weekly', 'biweekly', 'semimonthly', 'monthly')),
  pay_amount NUMERIC(12,2) NOT NULL DEFAULT 0, -- Net income per paycheck
  pay_day_of_week INTEGER CHECK (pay_day_of_week >= 0 AND pay_day_of_week <= 6), -- 0=Sunday for weekly/biweekly
  pay_day_of_month INTEGER CHECK (pay_day_of_month >= 1 AND pay_day_of_month <= 31), -- For monthly/semimonthly
  second_pay_day_of_month INTEGER CHECK (second_pay_day_of_month >= 1 AND second_pay_day_of_month <= 31), -- For semimonthly (2nd payday)
  
  -- Fixed Expenses (Monthly)
  rent_mortgage NUMERIC(12,2) NOT NULL DEFAULT 0,
  utilities NUMERIC(12,2) NOT NULL DEFAULT 0, -- Electric, gas, water, internet
  transportation NUMERIC(12,2) NOT NULL DEFAULT 0, -- Car payment, gas, transit
  insurance NUMERIC(12,2) NOT NULL DEFAULT 0, -- Health, car, renters
  groceries NUMERIC(12,2) NOT NULL DEFAULT 0,
  phone NUMERIC(12,2) NOT NULL DEFAULT 0,
  subscriptions NUMERIC(12,2) NOT NULL DEFAULT 0, -- Streaming, gym, etc.
  childcare NUMERIC(12,2) NOT NULL DEFAULT 0,
  other_bills NUMERIC(12,2) NOT NULL DEFAULT 0,
  existing_debt_payments NUMERIC(12,2) NOT NULL DEFAULT 0, -- Other loan payments
  
  -- Calculated Fields (cached for performance)
  monthly_income NUMERIC(12,2) GENERATED ALWAYS AS (
    CASE pay_frequency
      WHEN 'weekly' THEN pay_amount * 4.33
      WHEN 'biweekly' THEN pay_amount * 2.17
      WHEN 'semimonthly' THEN pay_amount * 2
      WHEN 'monthly' THEN pay_amount
      ELSE 0
    END
  ) STORED,
  
  monthly_expenses NUMERIC(12,2) GENERATED ALWAYS AS (
    rent_mortgage + utilities + transportation + insurance + groceries + phone + subscriptions + childcare + other_bills + existing_debt_payments
  ) STORED,
  
  -- User preferences
  preferred_payment_buffer_days INTEGER DEFAULT 2, -- Days after payday to schedule payment
  comfort_level TEXT DEFAULT 'balanced' CHECK (comfort_level IN ('comfortable', 'balanced', 'aggressive')),
  
  -- Meta
  is_complete BOOLEAN DEFAULT FALSE,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_financial_profile UNIQUE (user_id)
);

-- Add indexes
CREATE INDEX idx_financial_profiles_user ON user_financial_profiles(user_id);

-- Enable RLS
ALTER TABLE user_financial_profiles ENABLE ROW LEVEL SECURITY;

-- Users can only see/edit their own financial profile
CREATE POLICY "Users can view own financial profile"
  ON user_financial_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own financial profile"
  ON user_financial_profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own financial profile"
  ON user_financial_profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own financial profile"
  ON user_financial_profiles FOR DELETE
  USING (user_id = auth.uid());

-- Function to calculate disposable income
CREATE OR REPLACE FUNCTION get_disposable_income(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_monthly_income NUMERIC;
  v_monthly_expenses NUMERIC;
BEGIN
  SELECT monthly_income, monthly_expenses
  INTO v_monthly_income, v_monthly_expenses
  FROM user_financial_profiles
  WHERE user_id = p_user_id;
  
  IF v_monthly_income IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN GREATEST(0, v_monthly_income - v_monthly_expenses);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate smart payment suggestion
CREATE OR REPLACE FUNCTION calculate_smart_payment(
  p_user_id UUID,
  p_loan_amount NUMERIC,
  p_interest_rate NUMERIC DEFAULT 0,
  p_comfort_level TEXT DEFAULT 'balanced'
)
RETURNS TABLE (
  suggested_amount NUMERIC,
  suggested_frequency TEXT,
  estimated_payments INTEGER,
  estimated_weeks INTEGER,
  payment_percentage NUMERIC,
  is_safe BOOLEAN
) AS $$
DECLARE
  v_profile user_financial_profiles%ROWTYPE;
  v_disposable NUMERIC;
  v_percentage NUMERIC;
  v_payment NUMERIC;
  v_freq TEXT;
  v_num_payments INTEGER;
BEGIN
  -- Get user's financial profile
  SELECT * INTO v_profile
  FROM user_financial_profiles
  WHERE user_id = p_user_id;
  
  IF v_profile IS NULL THEN
    -- Return defaults if no profile
    RETURN QUERY SELECT 
      ROUND(p_loan_amount / 4, 2)::NUMERIC,
      'biweekly'::TEXT,
      4::INTEGER,
      8::INTEGER,
      25.0::NUMERIC,
      TRUE::BOOLEAN;
    RETURN;
  END IF;
  
  -- Calculate disposable income
  v_disposable := GREATEST(0, v_profile.monthly_income - v_profile.monthly_expenses);
  
  -- Set percentage based on comfort level
  v_percentage := CASE p_comfort_level
    WHEN 'comfortable' THEN 0.15
    WHEN 'balanced' THEN 0.22
    WHEN 'aggressive' THEN 0.30
    ELSE 0.22
  END;
  
  -- Use same frequency as their pay frequency
  v_freq := v_profile.pay_frequency;
  
  -- Calculate payment amount based on frequency
  v_payment := CASE v_freq
    WHEN 'weekly' THEN (v_disposable * v_percentage) / 4.33
    WHEN 'biweekly' THEN (v_disposable * v_percentage) / 2.17
    WHEN 'semimonthly' THEN (v_disposable * v_percentage) / 2
    WHEN 'monthly' THEN v_disposable * v_percentage
    ELSE (v_disposable * v_percentage) / 2.17
  END;
  
  -- Ensure minimum payment (at least covers some principal)
  v_payment := GREATEST(v_payment, p_loan_amount / 12);
  
  -- Round to nearest dollar
  v_payment := ROUND(v_payment, 0);
  
  -- Calculate number of payments
  v_num_payments := CEIL(p_loan_amount * (1 + COALESCE(p_interest_rate, 0) / 100) / v_payment);
  
  RETURN QUERY SELECT
    v_payment,
    v_freq,
    v_num_payments,
    CASE v_freq
      WHEN 'weekly' THEN v_num_payments
      WHEN 'biweekly' THEN v_num_payments * 2
      WHEN 'semimonthly' THEN v_num_payments * 2
      WHEN 'monthly' THEN v_num_payments * 4
      ELSE v_num_payments * 2
    END,
    ROUND((v_payment / v_disposable) * 100, 1),
    (v_payment / v_disposable) <= 0.35;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update timestamp trigger
CREATE TRIGGER update_financial_profiles_updated_at
  BEFORE UPDATE ON user_financial_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Comments
COMMENT ON TABLE user_financial_profiles IS 'Stores user income and expense data for smart loan repayment scheduling';
COMMENT ON COLUMN user_financial_profiles.pay_frequency IS 'How often the user gets paid: weekly, biweekly, semimonthly, monthly';
COMMENT ON COLUMN user_financial_profiles.comfort_level IS 'User preference for payment aggressiveness';
