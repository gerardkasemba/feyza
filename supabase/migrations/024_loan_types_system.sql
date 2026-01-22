-- Migration: Loan Types System
-- Business lenders can select which loan types they offer
-- Borrowers can select a loan type when requesting a loan
-- Auto-matching considers loan type compatibility

-- Create loan_types table (admin-managed)
CREATE TABLE IF NOT EXISTS loan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- lucide icon name for UI
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default loan types
INSERT INTO loan_types (name, slug, description, icon, display_order) VALUES
  ('Personal Loan', 'personal-loan', 'General purpose personal loans for individuals', 'User', 1),
  ('Microloan', 'microloan', 'Small loans typically under $50,000 for individuals or small businesses', 'Coins', 2),
  ('Working Capital Loan', 'working-capital', 'Short-term financing for day-to-day business operations', 'Briefcase', 3),
  ('Equipment Financing', 'equipment-financing', 'Loans to purchase or lease business equipment', 'Wrench', 4),
  ('Vehicle Loan', 'vehicle-loan', 'Financing for cars, trucks, or other vehicles', 'Car', 5),
  ('Inventory Financing', 'inventory-financing', 'Loans to purchase inventory or stock', 'Package', 6),
  ('Agricultural / Seasonal Loan', 'agricultural-loan', 'Financing for farming, agriculture, or seasonal businesses', 'Leaf', 7),
  ('Construction Loan', 'construction-loan', 'Short-term financing for building or renovation projects', 'HardHat', 8),
  ('Mortgage Loan', 'mortgage-loan', 'Long-term financing for real estate purchases', 'Home', 9),
  ('Business Expansion Loan', 'business-expansion', 'Financing for growing or expanding a business', 'TrendingUp', 10),
  ('Emergency Loan', 'emergency-loan', 'Quick financing for unexpected expenses or emergencies', 'AlertCircle', 11),
  ('Education Loan', 'education-loan', 'Financing for education, tuition, or training', 'GraduationCap', 12),
  ('Medical Loan', 'medical-loan', 'Financing for medical expenses or healthcare', 'Heart', 13),
  ('Debt Consolidation', 'debt-consolidation', 'Loans to combine multiple debts into one payment', 'Layers', 14),
  ('Invoice Financing', 'invoice-financing', 'Loans against outstanding invoices or receivables', 'FileText', 15)
ON CONFLICT (slug) DO NOTHING;

-- Create junction table for business-loan type relationships
CREATE TABLE IF NOT EXISTS business_loan_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  loan_type_id UUID NOT NULL REFERENCES loan_types(id) ON DELETE CASCADE,
  -- Optional: business-specific settings per loan type
  min_amount DECIMAL(12,2),
  max_amount DECIMAL(12,2),
  interest_rate DECIMAL(5,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint - one record per business-loan type pair
  UNIQUE(business_id, loan_type_id)
);

-- Add loan_type_id to loans table
ALTER TABLE loans 
ADD COLUMN IF NOT EXISTS loan_type_id UUID REFERENCES loan_types(id);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_loan_types_active ON loan_types(is_active, display_order);
CREATE INDEX IF NOT EXISTS idx_loan_types_slug ON loan_types(slug);
CREATE INDEX IF NOT EXISTS idx_business_loan_types_business ON business_loan_types(business_id);
CREATE INDEX IF NOT EXISTS idx_business_loan_types_loan_type ON business_loan_types(loan_type_id);
CREATE INDEX IF NOT EXISTS idx_loans_loan_type ON loans(loan_type_id);

-- Function to get loan types offered by a business
CREATE OR REPLACE FUNCTION get_business_loan_types(p_business_id UUID)
RETURNS TABLE (
  loan_type_id UUID,
  name TEXT,
  slug TEXT,
  description TEXT,
  icon TEXT,
  min_amount DECIMAL,
  max_amount DECIMAL,
  interest_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lt.id AS loan_type_id,
    lt.name,
    lt.slug,
    lt.description,
    lt.icon,
    COALESCE(blt.min_amount, bp.min_loan_amount) AS min_amount,
    COALESCE(blt.max_amount, bp.max_loan_amount) AS max_amount,
    COALESCE(blt.interest_rate, bp.default_interest_rate) AS interest_rate
  FROM business_loan_types blt
  JOIN loan_types lt ON lt.id = blt.loan_type_id
  JOIN business_profiles bp ON bp.id = blt.business_id
  WHERE blt.business_id = p_business_id
    AND blt.is_active = true
    AND lt.is_active = true
  ORDER BY lt.display_order;
END;
$$ LANGUAGE plpgsql;

-- Function to find businesses that offer a specific loan type
CREATE OR REPLACE FUNCTION find_businesses_by_loan_type(p_loan_type_id UUID)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  min_amount DECIMAL,
  max_amount DECIMAL,
  interest_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bp.id AS business_id,
    bp.business_name,
    COALESCE(blt.min_amount, bp.min_loan_amount) AS min_amount,
    COALESCE(blt.max_amount, bp.max_loan_amount) AS max_amount,
    COALESCE(blt.interest_rate, bp.default_interest_rate) AS interest_rate
  FROM business_loan_types blt
  JOIN business_profiles bp ON bp.id = blt.business_id
  WHERE blt.loan_type_id = p_loan_type_id
    AND blt.is_active = true
    AND bp.is_verified = true
    AND bp.profile_completed = true
  ORDER BY bp.business_name;
END;
$$ LANGUAGE plpgsql;

-- Update the find_matching_lenders function to consider loan type
CREATE OR REPLACE FUNCTION find_matching_lenders(p_loan_id UUID, p_limit INT DEFAULT 5)
RETURNS TABLE (
  lender_user_id UUID,
  lender_business_id UUID,
  match_score INT,
  auto_accept BOOLEAN,
  interest_rate DECIMAL,
  lender_name TEXT
) AS $$
DECLARE
  v_loan RECORD;
  v_borrower_completed_loans INT;
  v_is_first_time BOOLEAN;
BEGIN
  -- Get loan details including loan_type_id
  SELECT l.*, u.borrower_rating, u.verification_status
  INTO v_loan
  FROM loans l
  JOIN users u ON u.id = l.borrower_id
  WHERE l.id = p_loan_id;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  -- Count borrower's completed loans
  SELECT COUNT(*) INTO v_borrower_completed_loans
  FROM loans
  WHERE borrower_id = v_loan.borrower_id
  AND status = 'completed';

  v_is_first_time := v_borrower_completed_loans = 0;

  RETURN QUERY
  SELECT 
    lp.user_id AS lender_user_id,
    lp.business_id AS lender_business_id,
    -- Calculate match score (loan type match gives bonus)
    CASE
      WHEN lp.auto_accept THEN 100
      ELSE 80
    END +
    CASE
      WHEN v_loan.borrower_rating IN ('great', 'good') THEN 10
      ELSE 0
    END +
    -- Bonus for loan type match
    CASE
      WHEN v_loan.loan_type_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM business_loan_types blt 
        WHERE blt.business_id = lp.business_id 
        AND blt.loan_type_id = v_loan.loan_type_id
        AND blt.is_active = true
      ) THEN 20
      ELSE 0
    END AS match_score,
    lp.auto_accept,
    lp.interest_rate,
    COALESCE(bp.business_name, u.full_name, 'Unknown Lender') AS lender_name
  FROM lender_preferences lp
  LEFT JOIN business_profiles bp ON bp.id = lp.business_id
  LEFT JOIN users u ON u.id = lp.user_id
  WHERE 
    -- Must be active
    lp.is_active = true
    -- Must have enough capital
    AND (lp.capital_pool - COALESCE(lp.capital_reserved, 0)) >= v_loan.amount
    -- Amount within range
    AND lp.min_amount <= v_loan.amount
    AND lp.max_amount >= v_loan.amount
    -- Check first-time borrower limits
    AND (
      NOT v_is_first_time
      OR (
        lp.allow_first_time_borrowers = true
        AND COALESCE(lp.first_time_borrower_limit, lp.max_amount) >= v_loan.amount
      )
    )
    -- Term range check
    AND lp.min_term_weeks <= COALESCE(v_loan.term_weeks, 12)
    AND lp.max_term_weeks >= COALESCE(v_loan.term_weeks, 12)
    -- Loan type check - if loan has a type, lender must support it (or have no types = supports all)
    AND (
      v_loan.loan_type_id IS NULL
      OR NOT EXISTS (SELECT 1 FROM business_loan_types WHERE business_id = lp.business_id)
      OR EXISTS (
        SELECT 1 FROM business_loan_types blt 
        WHERE blt.business_id = lp.business_id 
        AND blt.loan_type_id = v_loan.loan_type_id
        AND blt.is_active = true
      )
    )
    -- Borrower rating check
    AND (
      lp.min_borrower_rating = 'worst'
      OR (lp.min_borrower_rating = 'bad' AND v_loan.borrower_rating IN ('bad', 'poor', 'neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'poor' AND v_loan.borrower_rating IN ('poor', 'neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'neutral' AND v_loan.borrower_rating IN ('neutral', 'good', 'great'))
      OR (lp.min_borrower_rating = 'good' AND v_loan.borrower_rating IN ('good', 'great'))
      OR (lp.min_borrower_rating = 'great' AND v_loan.borrower_rating = 'great')
    )
    -- Country check (if specified)
    AND (
      lp.countries IS NULL 
      OR array_length(lp.countries, 1) IS NULL
      OR v_loan.country = ANY(lp.countries)
    )
    -- Verification check
    AND (
      lp.require_verified_borrower = false 
      OR v_loan.verification_status = 'verified'
    )
  ORDER BY match_score DESC, lp.interest_rate ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at on loan_types
CREATE OR REPLACE FUNCTION update_loan_types_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_loan_types_updated_at ON loan_types;
CREATE TRIGGER tr_loan_types_updated_at
  BEFORE UPDATE ON loan_types
  FOR EACH ROW
  EXECUTE FUNCTION update_loan_types_timestamp();

-- Comments for documentation
COMMENT ON TABLE loan_types IS 'Master list of loan types/categories that businesses can offer';
COMMENT ON TABLE business_loan_types IS 'Junction table linking businesses to the loan types they offer';
COMMENT ON COLUMN loans.loan_type_id IS 'The type of loan requested by the borrower';
