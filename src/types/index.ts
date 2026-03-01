// User types
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
  username?: string;
  user_type: 'individual' | 'business';
  // Bank Connection (Plaid + Dwolla)
  bank_connected: boolean;
  bank_name?: string;
  bank_account_mask?: string;
  bank_account_type?: string;
  bank_connected_at?: string;
  dwolla_customer_id?: string;
  dwolla_customer_url?: string;
  dwolla_funding_source_id?: string;
  dwolla_funding_source_url?: string;
  plaid_access_token?: string;
  plaid_item_id?: string;
  plaid_account_id?: string;
  paypal_email?:string;
  paypal_connected?:string;
  // Notification preferences
  email_reminders: boolean;
  reminder_days_before: number;
  // Borrower stats & rating
  borrower_rating?: 'great' | 'good' | 'neutral' | 'poor' | 'bad' | 'worst';
  borrower_rating_updated_at?: string;
  payments_missed?: number;
  payments_early?: number;
  payments_on_time?: number;
  payments_late?: number;
  total_payments_made?: number;
  total_amount_repaid?: number;
  current_outstanding_amount?: number;
  total_loans_completed?: number;
  borrowing_tier?: number;
  loans_at_current_tier?: number;
  max_borrowing_amount?: number;
  created_at: string;
  updated_at: string;
}

export type InterestType = 'simple' | 'compound';

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_type: string;
  description?: string;
  location?: string;
  contact_email?: string;
  contact_phone?: string;
  is_verified: boolean;
  // Interest rate settings
  default_interest_rate: number;
  interest_type: InterestType;
  min_loan_amount?: number;
  max_loan_amount?: number;
  // Graduated trust system
  first_time_borrower_amount?: number;
  // Profile completion
  profile_completed: boolean;
  terms_accepted: boolean;
  terms_accepted_at?: string;
  created_at: string;
  updated_at: string;
  // Enhanced verification fields
  ein_tax_id?: string;
  state?: string;
  business_entity_type?: string;
  years_in_business?: number;
  website_url?: string;
  number_of_employees?: string;
  annual_revenue_range?: string;
  // Public profile
  slug?: string;
  public_profile_enabled?: boolean;
  tagline?: string;
  logo_url?: string;
  // Verification status
  verification_status?: 'pending' | 'approved' | 'rejected';
  verification_notes?: string;
  verified_at?: string;
  verified_by?: string;
  // Relation
  owner?: User;
  // Bank / Dwolla fields (mirrors User)
  bank_connected?: boolean;
  bank_connected_at?: string;
  bank_name?: string;
  bank_account_mask?: string;
  dwolla_customer_id?: string;
  dwolla_customer_url?: string;
  dwolla_funding_source_id?: string;
  dwolla_funding_source_url?: string;
  // Payment handles
  paypal_email?: string;
  cashapp_username?: string;
  venmo_username?: string;
  zelle_email?: string;
  zelle_phone?: string;
  // Business display name helper
  full_name?: string;
}

// Disbursement types
export type DisbursementMethod = 'bank_transfer' | 'mobile_money' | 'cash_pickup';
export type MobileMoneyProvider = 'mpesa' | 'airtel' | 'mtn' | 'orange' | 'tigo' | 'other';
export type PickerIdType = 'passport' | 'national_id' | 'drivers_license';

// Loan types
export type LoanStatus = 'pending' | 'pending_funds' | 'pending_disbursement' | 'active' | 'completed' | 'declined' | 'cancelled' | 'defaulted';
export type PaymentStatus = 'pending' | 'confirmed' | 'disputed';
export type RepaymentFrequency = 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type LenderType = 'business' | 'personal';

export interface Loan {
  id: string;
  borrower_id: string;
  borrower_token?: string;
  lender_id?: string;
  business_lender_id?: string;
  lender_type: LenderType;
  
  // Loan type
  loan_type_id?: string;
  loan_type?: LoanType;
  
  // For invite-based loans
  invite_email?: string;
  invite_phone?: string;
  invite_username?: string;
  invite_token?: string;
  invite_accepted: boolean;
  
  // Borrower name (for display)
  borrower_name?: string;
  
  // Loan details
  amount: number;
  currency: string;
  purpose?: string;
  
  // Interest
  interest_rate: number;
  interest_type: InterestType;
  total_interest: number;
  total_amount: number;
  
  // Repayment
  repayment_frequency: RepaymentFrequency;
  repayment_amount: number;
  total_installments: number;
  start_date: string;
  
  // Contract/Agreement
  contract_generated: boolean;
  contract_url?: string;
  borrower_signed: boolean;
  borrower_signed_at?: string;
  borrower_signature_ip?: string;
  lender_signed: boolean;
  lender_signed_at?: string;
  lender_signature_ip?: string;
  
  // Auto-payment
  auto_payment_enabled: boolean;
  auto_payment_reminder_sent: boolean;
  
  // Disbursement method
  disbursement_method?: DisbursementMethod;
  
  // Mobile Money
  mobile_money_provider?: string;
  mobile_money_phone?: string;
  mobile_money_name?: string;
  
  // Cash Pickup
  cash_pickup_location?: string;
  picker_full_name?: string;
  picker_id_type?: PickerIdType;
  picker_id_number?: string;
  picker_phone?: string;
  
  // Bank Transfer
  bank_name?: string;
  bank_account_name?: string;
  bank_account_number?: string;
  bank_routing_number?: string;
  bank_swift_code?: string;
  bank_branch?: string;
  
  // Diaspora - borrowing for someone else
  is_for_recipient: boolean;
  recipient_name?: string;
  recipient_phone?: string;
  recipient_country?: string;
  pickup_person_name?: string;
  pickup_person_location?: string;
  
  // Funds tracking
  funds_sent?: boolean;
  funds_sent_at?: string;
  funds_sent_method?: string;
  funds_sent_reference?: string;
  funds_sent_note?: string;
  funds_disbursed?: boolean;
  funds_disbursed_at?: string;
  funds_disbursed_reference?: string;
  
  // Matching
  match_status?: string;
  matched_at?: string;
  
  // Status
  status: LoanStatus;
  amount_paid: number;
  amount_remaining: number;
  
  // Guest borrower fields
  borrower_invite_email?: string;
  borrower_access_token?: string;
  borrower_access_token_expires?: string;
  
  // Dwolla transfer tracking
  disbursement_status?: 'pending' | 'processing' | 'completed' | 'failed';
  disbursement_transfer_id?: string;
  disbursed_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  
  // Relations (when joined)
  borrower?: User;
  lender?: User | BusinessProfile;
  business_lender?: BusinessProfile;
  payments?: Payment[];
  schedule?: PaymentScheduleItem[];
}

export interface Payment {
  id: string;
  loan_id: string;
  amount: number;
  payment_date: string;
  status: PaymentStatus;
  confirmed_by?: string;
  confirmation_date?: string;
  note?: string;
  proof_url?: string;
  dwolla_transfer_id?: string;
  dwolla_transfer_url?: string;
  created_at: string;
}

export interface PaymentScheduleItem {
  id: string;
  loan_id: string;
  due_date: string;
  amount: number; // Total payment
  principal_amount: number;
  interest_amount: number;
  is_paid: boolean;
  payment_id?: string;
  status?: 'pending' | 'overdue' | 'paid';
  // Fee tracking
  platform_fee?: number;
  paid_at?: string;
  transfer_id?: string;
  // Reminder tracking
  reminder_sent_at?: string;
  last_manual_reminder_at?: string;
  manual_reminder_count?: number;
  overdue_reminder_sent_at?: string;
  created_at: string;
}

// Notification types
export type NotificationType = 
  | 'reminder' 
  | 'payment_received' 
  | 'payment_confirmed' 
  | 'loan_request' 
  | 'loan_accepted' 
  | 'loan_declined'
  | 'loan_cancelled'
  | 'contract_signed'
  | 'bank_required'
  | 'loan_match_offer'
  | 'funds_sent'
  | 'funds_disbursed'
  | 'transfer_completed'
  | 'transfer_failed';

export interface Notification {
  id: string;
  user_id: string;
  loan_id?: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

// Form types
export interface LoanRequestForm {
  lender_type: LenderType;
  business_id?: string;
  invite_email?: string;
  invite_phone?: string;
  amount: number;
  currency: string;
  purpose?: string;
  repayment_frequency: RepaymentFrequency;
  repayment_amount: number;
  total_installments: number;
  start_date: string;
  pickup_person_name?: string;
  pickup_person_location?: string;
}

export interface PaymentForm {
  amount: number;
  note?: string;
  proof_url?: string;
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

// Dashboard stats
export interface DashboardStats {
  total_borrowed: number;
  total_lent: number;
  active_loans_as_borrower: number;
  active_loans_as_lender: number;
  pending_payments: number;
  overdue_payments: number;
}

// Borrower Business Trust (graduated trust system)
export type TrustStatus = 'new' | 'building' | 'graduated' | 'suspended' | 'banned';

export interface BorrowerBusinessTrust {
  id: string;
  borrower_id: string;
  business_id: string;
  completed_loan_count: number;
  total_amount_borrowed: number;
  total_amount_repaid: number;
  has_graduated: boolean;
  graduated_at?: string;
  has_defaulted: boolean;
  default_count: number;
  last_default_at?: string;
  late_payment_count: number;
  on_time_payment_count: number;
  trust_status: TrustStatus;
  created_at: string;
  updated_at: string;
}

// Loan Types
export interface LoanType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  is_active: boolean;
  display_order: number;
  created_at?: string;
  updated_at?: string;
  // When fetched with business context
  isSelected?: boolean;
  businessSettings?: {
    min_amount?: number;
    max_amount?: number;
    interest_rate?: number;
  } | null;
}

export interface BusinessLoanType {
  id: string;
  business_id: string;
  loan_type_id: string;
  min_amount?: number;
  max_amount?: number;
  interest_rate?: number;
  is_active: boolean;
  created_at: string;
  loan_type?: LoanType;
}

// ─── Supabase / API generic shapes ───────────────────────────────────────────

/** Basic user profile shape returned from auth or DB lookups */
export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  username?: string;
  user_type?: 'individual' | 'business';
  avatar_url?: string;
  [key: string]: unknown;
}

/** Generic key-value record for DB rows with unknown extra columns */
export type DbRecord = Record<string, unknown>;

/** Error-like object (e.g., Supabase PostgrestError) */
export interface ErrorLike {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
}

// ─── Dwolla ───────────────────────────────────────────────────────────────────

export interface DwollaTransfer {
  id?: string;
  status: 'pending' | 'processed' | 'failed' | 'cancelled';
  type?: 'disbursement' | 'repayment';
  amount?: { value: string; currency: string };
  created_at?: string;
  _links?: Record<string, { href: string }>;
}

// ─── Payment Provider ─────────────────────────────────────────────────────────

export interface PaymentProvider {
  id: string;
  name: string;
  slug: string;
  is_enabled: boolean;
  is_automated: boolean;
  is_available_for_repayment?: boolean;
  supported_countries?: string[];
}

export interface UserPaymentMethod {
  id: string;
  user_id: string;
  account_identifier: string;
  account_name?: string;
  is_active: boolean;
  is_default: boolean;
  payment_provider?: PaymentProvider;
}
