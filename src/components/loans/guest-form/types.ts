import { LucideIcon } from 'lucide-react';
import {
  Heart, GraduationCap, Home, Car, Plane, ShoppingBag, Wrench, Baby, Stethoscope,
  Banknote, PiggyBank, Gift, Package, Wallet, Briefcase,
} from 'lucide-react';

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface BorrowingEligibility {
  canBorrow: boolean;
  reason: string;
  lenderType?: 'business' | 'personal';
  isFirstTimeBorrower?: boolean;
  maxAvailableFromBusinesses?: number;
  message?: string;
  borrowingTier?: number | null;
  tierName?: string | null;
  maxAmount?: number | null;
  availableAmount?: number | null;
  totalOutstanding: number;
  loansAtCurrentTier?: number;
  loansNeededToUpgrade?: number;
  nextTierAmount?: number | null;
}

export interface LoanTypeOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
}

export interface FinancialProfileData {
  payFrequency: PayFrequency;
  payAmount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  comfortLevel: ComfortLevel;
}

export interface BankInfo {
  dwolla_customer_url?: string;
  dwolla_customer_id?: string;
  dwolla_funding_source_url?: string;
  dwolla_funding_source_id?: string;
  bank_name?: string;
  account_mask?: string;
  plaid_access_token?: string;
}

export interface GuestLoanRequestFormProps {
  businessSlug?: string | null;
  businessLenderId?: string | null;
  presetMaxAmount?: number;
}

// ─── Schedule types ────────────────────────────────────────────────────────────

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type ComfortLevel = 'comfortable' | 'balanced' | 'aggressive';

// ─── Constants ─────────────────────────────────────────────────────────────────

export const ID_TYPES = [
  { value: '', label: 'Select ID type' },
  { value: 'passport', label: 'Passport' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'national_id', label: 'National ID' },
  { value: 'state_id', label: 'State ID' },
];

export const EMPLOYMENT_STATUSES = [
  { value: '', label: 'Select status' },
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'student', label: 'Student' },
  { value: 'retired', label: 'Retired' },
];

export const ADDRESS_DOC_TYPES = [
  { value: '', label: 'Select type' },
  { value: 'utility_bill', label: 'Utility Bill' },
  { value: 'bank_statement', label: 'Bank Statement' },
  { value: 'lease_agreement', label: 'Lease Agreement' },
  { value: 'government_letter', label: 'Government Letter' },
];

export const COUNTRIES = [
  { value: '', label: 'Select country' },
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'AU', label: 'Australia' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'KE', label: 'Kenya' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'OTHER', label: 'Other' },
];

export const FREQUENCY_OPTIONS = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
];

export const CURRENCY_OPTIONS = [{ value: 'USD', label: 'USD ($)' }];

// ─── Loan type icon mapping ────────────────────────────────────────────────────

const LOAN_TYPE_ICONS: Record<string, LucideIcon> = {
  emergency: Wallet,
  medical: Stethoscope,
  health: Heart,
  education: GraduationCap,
  school: GraduationCap,
  tuition: GraduationCap,
  business: Briefcase,
  home: Home,
  housing: Home,
  rent: Home,
  car: Car,
  vehicle: Car,
  auto: Car,
  travel: Plane,
  vacation: Plane,
  shopping: ShoppingBag,
  retail: ShoppingBag,
  repair: Wrench,
  maintenance: Wrench,
  baby: Baby,
  family: Baby,
  childcare: Baby,
  personal: Wallet,
  cash: Banknote,
  savings: PiggyBank,
  gift: Gift,
  wedding: Gift,
  other: Package,
  general: Package,
};

export function getLoanTypeIcon(loanType: LoanTypeOption): LucideIcon {
  const slugLower = loanType.slug?.toLowerCase() || '';
  const nameLower = loanType.name?.toLowerCase() || '';
  for (const [key, icon] of Object.entries(LOAN_TYPE_ICONS)) {
    if (slugLower.includes(key) || nameLower.includes(key)) return icon;
  }
  return Banknote;
}
