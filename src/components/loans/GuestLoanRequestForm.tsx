'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Card, Calendar as CalendarPicker, Alert } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatPercentage, calculateTotalInterest, calculateLoanTermMonths, generateInviteToken, calculateRepaymentSchedule, toDateString } from '@/lib/utils';
import { 
  getRepaymentPresets, 
  RepaymentPreset,
  PayFrequency,
  ComfortLevel,
  formatPayFrequency,
} from '@/lib/smartSchedule';
import { 
  Building2, Users, ChevronRight, ChevronLeft, Info, 
  AlertCircle, FileText, CreditCard, Check, AlertTriangle, Shield,
  TrendingUp, Lock, Star, Zap, Calendar as CalendarIcon, Clock, Edit3, Search, AtSign, Loader2,
  Wallet, Sparkles, Building, Eye, EyeOff, Upload, Briefcase, MapPin, CheckCircle, ChevronDown, X,
  // Loan type icons
  Heart, GraduationCap, Home, Car, Plane, ShoppingBag, Wrench, Baby, Stethoscope, 
  Banknote, PiggyBank, Gift, Package, LucideIcon
} from 'lucide-react';

// Icon mapping for loan types
const LOAN_TYPE_ICONS: Record<string, LucideIcon> = {
  'emergency': Zap,
  'medical': Stethoscope,
  'health': Heart,
  'education': GraduationCap,
  'school': GraduationCap,
  'tuition': GraduationCap,
  'business': Briefcase,
  'home': Home,
  'housing': Home,
  'rent': Home,
  'car': Car,
  'vehicle': Car,
  'auto': Car,
  'travel': Plane,
  'vacation': Plane,
  'shopping': ShoppingBag,
  'retail': ShoppingBag,
  'repair': Wrench,
  'maintenance': Wrench,
  'baby': Baby,
  'family': Baby,
  'childcare': Baby,
  'personal': Wallet,
  'cash': Banknote,
  'savings': PiggyBank,
  'gift': Gift,
  'wedding': Gift,
  'other': Package,
  'general': Package,
};

// Helper to get icon component for a loan type
const getLoanTypeIcon = (loanType: LoanTypeOption): LucideIcon => {
  const slugLower = loanType.slug?.toLowerCase() || '';
  const nameLower = loanType.name?.toLowerCase() || '';
  
  for (const [key, icon] of Object.entries(LOAN_TYPE_ICONS)) {
    if (slugLower.includes(key) || nameLower.includes(key)) {
      return icon;
    }
  }
  return Banknote;
};

// Types
interface BorrowingEligibility {
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

interface LoanTypeOption {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  display_order: number;
}

interface FinancialProfileData {
  payFrequency: PayFrequency;
  payAmount: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  comfortLevel: ComfortLevel;
}

interface BankInfo {
  dwolla_customer_url?: string;
  dwolla_customer_id?: string;
  dwolla_funding_source_url?: string;
  dwolla_funding_source_id?: string;
  bank_name?: string;
  account_mask?: string;
  plaid_access_token?: string;
}

interface GuestLoanRequestFormProps {
  businessSlug?: string | null;
  businessLenderId?: string | null;
}

const ID_TYPES = [
  { value: '', label: 'Select ID type' },
  { value: 'drivers_license', label: "Driver's License" },
  { value: 'passport', label: 'Passport' },
  { value: 'national_id', label: 'National ID Card' },
  { value: 'state_id', label: 'State ID' },
];

const EMPLOYMENT_STATUSES = [
  { value: '', label: 'Select status' },
  { value: 'employed', label: 'Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'contractor', label: 'Contractor/Freelance' },
  { value: 'business_owner', label: 'Business Owner' },
];

const ADDRESS_DOC_TYPES = [
  { value: '', label: 'Select document type' },
  { value: 'utility_bill', label: 'Utility Bill (last 3 months)' },
  { value: 'bank_statement', label: 'Bank Statement (last 3 months)' },
  { value: 'lease_agreement', label: 'Lease/Rental Agreement' },
  { value: 'government_letter', label: 'Government Letter' },
];

const COUNTRIES = [
  { value: '', label: 'Select country' },
  { value: 'US', label: 'United States' },
  { value: 'UK', label: 'United Kingdom' },
  { value: 'CA', label: 'Canada' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'KE', label: 'Kenya' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'OTHER', label: 'Other' },
];

export default function GuestLoanRequestForm({ businessSlug, businessLenderId }: GuestLoanRequestFormProps = {}) {
  const router = useRouter();
  const supabase = createClient();

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Form state
  const [step, setStep] = useState(1);
  const [lenderType, setLenderType] = useState<'business' | 'personal' | null>(businessSlug || businessLenderId ? 'business' : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  // Borrowing limits
  const [borrowingLimit, setBorrowingLimit] = useState<BorrowingEligibility | null>(null);
  const [businessEligibility, setBusinessEligibility] = useState<BorrowingEligibility | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(true);

  // Loan types
  const [loanTypes, setLoanTypes] = useState<LoanTypeOption[]>([]);
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | null>(null);
  const [loanTypeSearch, setLoanTypeSearch] = useState('');
  const [showLoanTypeDropdown, setShowLoanTypeDropdown] = useState(false);

  // Smart schedule
  const [useSmartSchedule, setUseSmartSchedule] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfileData | null>(null);
  const [loadingFinancialProfile, setLoadingFinancialProfile] = useState(true);
  const [selectedComfortLevel, setSelectedComfortLevel] = useState<ComfortLevel>('balanced');

  // Bank connection
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [connectingBank, setConnectingBank] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // Username search (for personal loans)
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameSearching, setUsernameSearching] = useState(false);
  const [usernameFound, setUsernameFound] = useState<{ username: string; displayName: string } | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Guest account creation fields
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestConfirmPassword, setGuestConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Guest verification fields (for business loans)
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employmentStartDate, setEmploymentStartDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentDocumentFile, setEmploymentDocumentFile] = useState<File | null>(null);
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [addressDocumentType, setAddressDocumentType] = useState('');
  const [addressDocumentFile, setAddressDocumentFile] = useState<File | null>(null);

  // Form with react-hook-form
  const { register, setValue, watch, getValues } = useForm({
    defaultValues: {
      lenderType: businessSlug || businessLenderId ? 'business' : undefined,
      currency: 'USD',
      repaymentFrequency: 'monthly',
      interestRate: 0,
      interestType: 'simple',
      amount: 0,
      totalInstallments: 0,
      startDate: '',
      inviteEmail: '',
      invitePhone: '',
      inviteUsername: '',
      purpose: '',
      loanTypeId: '',
    },
  });

  const amount = watch('amount') || 0;
  const totalInstallments = watch('totalInstallments') || 0;
  const repaymentFrequency = watch('repaymentFrequency') || 'monthly';
  const interestRate = watch('interestRate') || 0;
  const interestType = watch('interestType') || 'simple';
  const startDate = watch('startDate');
  const inviteEmail = watch('inviteEmail');
  const invitePhone = watch('invitePhone');
  const inviteUsername = watch('inviteUsername');

  // Calendar date state
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);

  useEffect(() => {
    if (selectedStartDate) {
      setValue('startDate', selectedStartDate.toISOString().split('T')[0]);
    }
  }, [selectedStartDate, setValue]);

  // Calculate totals
  const freqType = repaymentFrequency as 'weekly' | 'biweekly' | 'monthly' | 'custom';
  const intType = (interestType || 'simple') as 'simple' | 'compound';
  const termMonths = calculateLoanTermMonths(totalInstallments || 1, freqType);
  const totalInterest = calculateTotalInterest(amount, interestRate, termMonths, intType);
  const totalAmount = amount + totalInterest;
  const repaymentAmount = totalInstallments > 0 ? totalAmount / totalInstallments : 0;

  // Smart schedule presets
  const repaymentPresets = useMemo(() => getRepaymentPresets(amount), [amount]);
  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;

  // Income-based schedule
  const incomeBasedSchedule = useMemo(() => {
    if (!financialProfile || !amount || amount <= 0) return null;
    const disposable = financialProfile.disposableIncome;
    if (disposable <= 0) {
      return { hasProfile: true, monthlyIncome: financialProfile.monthlyIncome, disposableIncome: disposable, suggestions: null };
    }
    
    const getInstallmentCount = (level: ComfortLevel): number => {
      if (amount <= 100) return level === 'comfortable' ? 4 : level === 'balanced' ? 2 : 1;
      if (amount <= 300) return level === 'comfortable' ? 6 : level === 'balanced' ? 4 : 2;
      if (amount <= 500) return level === 'comfortable' ? 8 : level === 'balanced' ? 4 : 2;
      if (amount <= 1000) return level === 'comfortable' ? 10 : level === 'balanced' ? 6 : 3;
      if (amount <= 2000) return level === 'comfortable' ? 12 : level === 'balanced' ? 8 : 4;
      const percentages = { comfortable: 0.15, balanced: 0.22, aggressive: 0.30 };
      const monthlyPayment = disposable * percentages[level];
      const multiplierMap: Record<PayFrequency, number> = { weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 };
      const multiplier = multiplierMap[financialProfile.payFrequency];
      const paymentAmount = Math.max(Math.round(monthlyPayment / multiplier), 50);
      let count = Math.ceil(amount / paymentAmount);
      if (level === 'comfortable') count = Math.min(Math.max(count, 8), 24);
      else if (level === 'balanced') count = Math.min(Math.max(count, 4), 12);
      else count = Math.min(Math.max(count, 2), 6);
      return count;
    };

    const calculateForLevel = (level: ComfortLevel) => {
      const numberOfPayments = getInstallmentCount(level);
      const paymentAmount = Math.ceil(amount / numberOfPayments);
      const multiplierMap: Record<PayFrequency, number> = { weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 };
      const multiplier = multiplierMap[financialProfile.payFrequency];
      const weeksPerPayment = financialProfile.payFrequency === 'weekly' ? 1 : financialProfile.payFrequency === 'biweekly' ? 2 : 4;
      const monthlyEquivalent = paymentAmount * multiplier;
      const percentOfDisposable = Math.round((monthlyEquivalent / disposable) * 100);
      return {
        amount: paymentAmount,
        frequency: financialProfile.payFrequency,
        percentOfDisposable: Math.min(percentOfDisposable, 100),
        numberOfPayments,
        weeksToPayoff: numberOfPayments * weeksPerPayment,
        totalRepayment: paymentAmount * numberOfPayments,
        description: level === 'comfortable' ? 'Easy on your budget' : level === 'balanced' ? 'Recommended' : 'Fastest payoff',
      };
    };

    return {
      hasProfile: true,
      monthlyIncome: financialProfile.monthlyIncome,
      disposableIncome: disposable,
      payFrequency: financialProfile.payFrequency,
      suggestions: {
        comfortable: calculateForLevel('comfortable'),
        balanced: calculateForLevel('balanced'),
        aggressive: calculateForLevel('aggressive'),
      },
      recommended: calculateForLevel(selectedComfortLevel),
    };
  }, [financialProfile, amount, selectedComfortLevel]);

  // Load Plaid script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as any).Plaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => setPlaidLoaded(true);
      document.body.appendChild(script);
    } else {
      setPlaidLoaded(true);
    }
  }, []);

  // Check auth and load data
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (authUser) {
          setIsLoggedIn(true);
          setUserId(authUser.id);
          
          const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          const userData = profile || { id: authUser.id, email: authUser.email, full_name: authUser.user_metadata?.full_name || 'User' };
          setUser(userData);
          setGuestFullName(userData.full_name || '');
          setGuestEmail(userData.email || authUser.email || '');

          // Check bank connection
          if (userData.dwolla_funding_source_url) {
            setBankConnected(true);
            setBankInfo({
              dwolla_customer_url: userData.dwolla_customer_url,
              dwolla_customer_id: userData.dwolla_customer_id,
              dwolla_funding_source_url: userData.dwolla_funding_source_url,
              dwolla_funding_source_id: userData.dwolla_funding_source_id,
              bank_name: userData.bank_name,
              account_mask: userData.bank_account_mask,
            });
          }

          // Fetch borrowing limits
          try {
            const [personalRes, businessRes] = await Promise.all([
              fetch('/api/borrower/eligibility?lender_type=personal'),
              fetch('/api/borrower/eligibility?lender_type=business'),
            ]);
            if (personalRes.ok) setBorrowingLimit(await personalRes.json());
            if (businessRes.ok) setBusinessEligibility(await businessRes.json());
          } catch (e) { console.error('Failed to fetch limits:', e); }
          setLoadingLimit(false);

          // Fetch financial profile
          try {
            const fpRes = await fetch('/api/financial-profile');
            if (fpRes.ok) {
              const fpData = await fpRes.json();
              if (fpData && fpData.pay_amount > 0) {
                setFinancialProfile({
                  payFrequency: fpData.pay_frequency as PayFrequency,
                  payAmount: parseFloat(fpData.pay_amount) || 0,
                  monthlyIncome: parseFloat(fpData.monthly_income) || 0,
                  monthlyExpenses: parseFloat(fpData.monthly_expenses) || 0,
                  disposableIncome: parseFloat(fpData.disposable_income) || 0,
                  comfortLevel: (fpData.comfort_level || 'balanced') as ComfortLevel,
                });
                setSelectedComfortLevel((fpData.comfort_level || 'balanced') as ComfortLevel);
              }
            }
          } catch (e) { console.error('Failed to fetch financial profile:', e); }
          setLoadingFinancialProfile(false);
        } else {
          setLoadingLimit(false);
          setLoadingFinancialProfile(false);
        }

        // Fetch loan types
        try {
          const ltRes = await fetch('/api/loan-types');
          if (ltRes.ok) {
            const ltData = await ltRes.json();
            setLoanTypes(ltData.loanTypes || []);
          }
        } catch (e) { console.error('Failed to fetch loan types:', e); }

      } catch (err) {
        console.error('Init error:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [supabase]);

  // Update form when preset selected
  useEffect(() => {
    if (selectedPreset && useSmartSchedule && !financialProfile) {
      setValue('repaymentFrequency', selectedPreset.frequency);
      setValue('totalInstallments', selectedPreset.installments);
    }
  }, [selectedPreset, useSmartSchedule, setValue, financialProfile]);

  useEffect(() => {
    if (incomeBasedSchedule?.suggestions && useSmartSchedule && financialProfile) {
      const suggestion = incomeBasedSchedule.suggestions[selectedComfortLevel];
      if (suggestion) {
        setValue('repaymentFrequency', suggestion.frequency as any);
        setValue('totalInstallments', suggestion.numberOfPayments);
      }
    }
  }, [incomeBasedSchedule, useSmartSchedule, selectedComfortLevel, setValue, financialProfile]);

  useEffect(() => { setSelectedPresetIndex(null); }, [amount]);

  // Fetch Plaid link token
  const fetchLinkToken = useCallback(async () => {
    const name = isLoggedIn ? user?.full_name : guestFullName;
    const email = isLoggedIn ? user?.email : guestEmail;
    if (!name || !email) return;
    
    try {
      // Use different endpoints for logged-in vs guest users
      const endpoint = isLoggedIn ? '/api/plaid/link-token' : '/api/plaid/guest-link-token';
      const body = isLoggedIn 
        ? {} // logged-in endpoint gets user from session
        : { name, email }; // guest endpoint needs name and email
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Link token error:', errorData);
        return;
      }
      
      const data = await response.json();
      if (data.link_token) setLinkToken(data.link_token);
    } catch (err) { console.error('Error fetching link token:', err); }
  }, [isLoggedIn, user, guestFullName, guestEmail]);

  useEffect(() => {
    if ((isLoggedIn && user && !linkToken && !bankConnected) || (!isLoggedIn && guestFullName && guestEmail && !linkToken)) {
      fetchLinkToken();
    }
  }, [isLoggedIn, user, linkToken, bankConnected, guestFullName, guestEmail, fetchLinkToken]);

  // Handle bank connection
  const handleConnectBank = useCallback(async () => {
    const name = isLoggedIn ? user?.full_name : guestFullName;
    const email = isLoggedIn ? user?.email : guestEmail;
    if (!name || !email) {
      setStepError('Please enter your name and email first.');
      return;
    }
    if (!plaidLoaded || !(window as any).Plaid) {
      setStepError('Bank connection is loading. Please try again.');
      return;
    }

    if (!linkToken) {
      await fetchLinkToken();
      return;
    }

    setConnectingBank(true);
    const handler = (window as any).Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: any) => {
        try {
          const response = await fetch('/api/plaid/guest-exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              public_token: publicToken,
              account_id: metadata.accounts[0].id,
              user_name: name,
              user_email: email,
            }),
          });
          const data = await response.json();
          if (data.success || data.dwolla_funding_source_url) {
            setBankConnected(true);
            setBankInfo({
              dwolla_customer_url: data.dwolla_customer_url,
              dwolla_customer_id: data.dwolla_customer_id,
              dwolla_funding_source_url: data.dwolla_funding_source_url,
              dwolla_funding_source_id: data.dwolla_funding_source_id,
              bank_name: data.bank_name,
              account_mask: data.account_mask,
              plaid_access_token: data.plaid_access_token,
            });
            // Update user profile if logged in
            if (isLoggedIn && userId) {
              await supabase.from('users').update({
                dwolla_customer_url: data.dwolla_customer_url,
                dwolla_customer_id: data.dwolla_customer_id,
                dwolla_funding_source_url: data.dwolla_funding_source_url,
                dwolla_funding_source_id: data.dwolla_funding_source_id,
                bank_name: data.bank_name,
                bank_account_mask: data.account_mask,
                bank_connected: true,
              }).eq('id', userId);
            }
          } else {
            setStepError(data.error || 'Failed to connect bank');
          }
        } catch (err) {
          console.error('Error exchanging token:', err);
          setStepError('Failed to connect bank account');
        } finally {
          setConnectingBank(false);
        }
      },
      onExit: () => setConnectingBank(false),
    });
    handler.open();
  }, [isLoggedIn, user, guestFullName, guestEmail, plaidLoaded, linkToken, fetchLinkToken, userId, supabase]);

  // Username search
  const searchUsername = async (username: string) => {
    const clean = username.replace(/^~/, '').toLowerCase().trim();
    if (!clean || clean.length < 3) {
      setUsernameFound(null);
      setUsernameError(null);
      setValue('inviteUsername', '');
      return;
    }
    setUsernameSearching(true);
    setUsernameError(null);
    try {
      const res = await fetch(`/api/user/username?username=${encodeURIComponent(clean)}`);
      const data = await res.json();
      if (data.found) {
        setUsernameFound({ username: data.username, displayName: data.displayName });
        setValue('inviteUsername', data.username);
        setStepError(null);
      } else {
        setUsernameFound(null);
        setValue('inviteUsername', '');
        setUsernameError('User not found');
      }
    } catch {
      setUsernameError('Failed to search');
      setUsernameFound(null);
      setValue('inviteUsername', '');
    } finally {
      setUsernameSearching(false);
    }
  };

  // Step calculations
  // Logged-in: 5 steps
  // Guest personal: 6 steps (add account creation)
  // Guest business: 9 steps (add account + 3 verification steps)
  const totalSteps = useMemo(() => {
    if (isLoggedIn) return 5;
    if (lenderType === 'personal') return 6;
    if (lenderType === 'business') return 9;
    return 5;
  }, [isLoggedIn, lenderType]);

  const progressPercent = (step / totalSteps) * 100;

  // Validation functions
  const validateStep1 = (): boolean => {
    if (!bankConnected && isLoggedIn) {
      setStepError('Please connect your bank account first');
      return false;
    }
    if (!lenderType) {
      setStepError('Please select a lender type');
      return false;
    }
    if (isLoggedIn && lenderType === 'personal' && borrowingLimit && !borrowingLimit.canBorrow) {
      setStepError(borrowingLimit.reason);
      return false;
    }
    if (isLoggedIn && lenderType === 'business' && businessEligibility && !businessEligibility.canBorrow) {
      setStepError(businessEligibility.reason || 'Unable to borrow from business lenders');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (lenderType === 'business') {
      if (!selectedLoanTypeId) {
        setStepError('Please select a loan type');
        return false;
      }
      return true;
    }
    const email = getValues('inviteEmail');
    const phone = getValues('invitePhone');
    const username = getValues('inviteUsername');
    if (!email && !phone && !username) {
      setStepError('Please enter a username, email, or phone');
      return false;
    }
    if (email && !email.includes('@')) {
      setStepError('Please enter a valid email');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const values = getValues();
    if (!values.amount || values.amount < 1) {
      setStepError('Please enter a valid amount');
      return false;
    }
    if (!values.totalInstallments || values.totalInstallments < 1) {
      setStepError('Please select a repayment schedule');
      return false;
    }
    if (!values.startDate) {
      setStepError('Please select a start date');
      return false;
    }
    return true;
  };

  const validateGuestAccount = (): boolean => {
    if (!guestFullName.trim()) {
      setStepError('Please enter your full name');
      return false;
    }
    if (!guestEmail.trim() || !guestEmail.includes('@')) {
      setStepError('Please enter a valid email');
      return false;
    }
    if (!guestPassword || guestPassword.length < 8) {
      setStepError('Password must be at least 8 characters');
      return false;
    }
    if (guestPassword !== guestConfirmPassword) {
      setStepError('Passwords do not match');
      return false;
    }
    return true;
  };

  const validateIdentity = (): boolean => {
    if (!idType || !idNumber || !idDocumentFile) {
      setStepError('Please complete all identity fields');
      return false;
    }
    return true;
  };

  const validateEmployment = (): boolean => {
    if (!employmentStatus || !employerName || !employmentStartDate || !employmentDocumentFile) {
      setStepError('Please complete all employment fields');
      return false;
    }
    const start = new Date(employmentStartDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (start > thirtyDaysAgo) {
      setStepError('Employment must be at least 30 days');
      return false;
    }
    return true;
  };

  const validateAddress = (): boolean => {
    if (!addressLine1 || !city || !country || !addressDocumentType || !addressDocumentFile) {
      setStepError('Please complete all address fields');
      return false;
    }
    if (!bankConnected) {
      setStepError('Please connect your bank account');
      return false;
    }
    return true;
  };

  const goToNextStep = (nextStep: number) => {
    setStepError(null);
    let isValid = true;

    if (isLoggedIn) {
      if (step === 1) isValid = validateStep1();
      else if (step === 2) isValid = validateStep2();
      else if (step === 3) isValid = validateStep3();
      else if (step === 4) isValid = true;
      else if (step === 5) isValid = agreementAccepted;
    } else {
      if (step === 1) isValid = validateStep1();
      else if (step === 2) isValid = validateStep2();
      else if (step === 3) isValid = validateStep3();
      else if (step === 4) isValid = validateGuestAccount();
      
      if (lenderType === 'business') {
        if (step === 5) isValid = validateIdentity();
        else if (step === 6) isValid = validateEmployment();
        else if (step === 7) isValid = validateAddress();
        else if (step === 8) isValid = true;
        else if (step === 9) isValid = agreementAccepted;
      } else {
        if (step === 5) isValid = bankConnected;
        else if (step === 6) isValid = agreementAccepted;
      }
    }

    if (isValid) setStep(nextStep);
    else if (step === (isLoggedIn ? 5 : (lenderType === 'business' ? 9 : 6)) && !agreementAccepted) {
      setStepError('Please accept the agreement');
    }
  };

  // Upload file helper
  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    const { error } = await supabase.storage.from('verification-documents').upload(filePath, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('verification-documents').getPublicUrl(filePath);
    return publicUrl;
  };

  // Submit handler
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementAccepted) {
      setStepError('Please accept the agreement');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = getValues();
      const inviteToken = lenderType === 'personal' ? generateInviteToken() : null;
      const frequency = data.repaymentFrequency as 'weekly' | 'biweekly' | 'monthly' | 'custom';
      const intTypeCalc = (interestType || 'simple') as 'simple' | 'compound';
      const schedule = calculateRepaymentSchedule({
        amount: data.amount,
        repaymentAmount: repaymentAmount,
        totalInstallments: data.totalInstallments,
        startDate: data.startDate,
        frequency: frequency,
        interestRate: interestRate,
        interestType: intTypeCalc,
      });

      if (isLoggedIn) {
        // Logged-in user flow
        const loanData: any = {
          borrower_id: userId,
          lender_type: lenderType,
          business_lender_id: businessLenderId || null,
          loan_type_id: selectedLoanTypeId || null,
          country: user?.country || null,
          state: user?.state || null,
          invite_email: lenderType === 'personal' ? (data.inviteEmail || null) : null,
          invite_phone: lenderType === 'personal' ? (data.invitePhone || null) : null,
          invite_username: lenderType === 'personal' ? (data.inviteUsername || null) : null,
          invite_token: inviteToken,
          invite_accepted: false,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose || loanTypes.find((lt: LoanTypeOption) => lt.id === selectedLoanTypeId)?.name,
          interest_rate: interestRate,
          interest_type: interestType,
          total_interest: Math.round(totalInterest * 100) / 100,
          total_amount: Math.round(totalAmount * 100) / 100,
          repayment_frequency: data.repaymentFrequency,
          repayment_amount: Math.round(repaymentAmount * 100) / 100,
          total_installments: data.totalInstallments,
          start_date: data.startDate,
          disbursement_method: 'bank_transfer',
          borrower_signed: true,
          borrower_signed_at: new Date().toISOString(),
          status: 'pending',
          match_status: lenderType === 'business' ? 'pending' : 'manual',
          amount_paid: 0,
          amount_remaining: Math.round(totalAmount * 100) / 100,
          borrower_name: user?.full_name,
          auto_pay_enabled: true,
        };

        if (bankInfo) {
          loanData.borrower_dwolla_customer_url = bankInfo.dwolla_customer_url;
          loanData.borrower_dwolla_customer_id = bankInfo.dwolla_customer_id;
          loanData.borrower_dwolla_funding_source_url = bankInfo.dwolla_funding_source_url;
          loanData.borrower_dwolla_funding_source_id = bankInfo.dwolla_funding_source_id;
          loanData.borrower_bank_name = bankInfo.bank_name;
          loanData.borrower_bank_account_mask = bankInfo.account_mask;
          loanData.borrower_bank_connected = true;
        }

        const { data: loan, error } = await supabase.from('loans').insert(loanData).select().single();
        if (error) throw error;

        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'loan_created',
          title: 'Loan Request Submitted',
          message: `Your loan request for $${data.amount.toLocaleString()} has been submitted.`,
          data: { loan_id: loan.id, amount: data.amount },
          is_read: false,
        });

        const scheduleItems = schedule.map((item) => ({
          loan_id: loan.id,
          due_date: toDateString(item.dueDate),
          amount: item.amount,
          principal_amount: item.principalAmount,
          interest_amount: item.interestAmount,
          is_paid: false,
        }));
        await supabase.from('payment_schedule').insert(scheduleItems);

        if (lenderType === 'business') {
          if (businessLenderId) {
            await fetch('/api/notifications/payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'direct_loan_request', loanId: loan.id, businessId: businessLenderId, borrowerName: user?.full_name, amount: data.amount }),
            });
            router.push(`/loans/${loan.id}?direct=true`);
          } else {
            const matchRes = await fetch('/api/matching', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loan_id: loan.id }),
            });
            const matchResult = await matchRes.json();
            if (matchResult.status === 'auto_accepted') router.push(`/loans/${loan.id}?matched=true`);
            else if (matchResult.status === 'pending_acceptance') router.push(`/loans/${loan.id}?matching=true`);
            else router.push(`/loans/${loan.id}?no_match=true`);
          }
        } else {
          if (data.inviteEmail || data.invitePhone) {
            await fetch('/api/invite/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loanId: loan.id,
                lenderType: lenderType,
                inviteToken,
                email: data.inviteEmail,
                phone: data.invitePhone,
                borrowerName: user?.full_name,
                amount: data.amount,
                currency: data.currency,
                purpose: data.purpose,
              }),
            });
          }
          router.push(`/loans/${loan.id}`);
        }
      } else {
        // GUEST FLOW - Create account first, then handle loan
        
        // Step 1: Create Supabase auth account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: guestEmail,
          password: guestPassword,
          options: { data: { full_name: guestFullName } },
        });
        
        if (signUpError) {
          if (signUpError.message.includes('already registered')) {
            setSubmitError('This email is already registered. Please sign in instead.');
          } else {
            throw signUpError;
          }
          return;
        }
        
        if (!signUpData.user) throw new Error('Failed to create account');
        const newUserId = signUpData.user.id;

        if (lenderType === 'personal') {
          // GUEST PERSONAL LOAN - Create account and loan directly
          
          // Step 2: Update user profile with bank info
          await supabase.from('users').update({
            full_name: guestFullName,
            phone: guestPhone || null,
            plaid_access_token: bankInfo?.plaid_access_token,
            dwolla_customer_url: bankInfo?.dwolla_customer_url,
            dwolla_customer_id: bankInfo?.dwolla_customer_id,
            dwolla_funding_source_url: bankInfo?.dwolla_funding_source_url,
            dwolla_funding_source_id: bankInfo?.dwolla_funding_source_id,
            bank_name: bankInfo?.bank_name,
            bank_account_mask: bankInfo?.account_mask,
            bank_connected: !!bankInfo,
            bank_connected_at: bankInfo ? new Date().toISOString() : null,
          }).eq('id', newUserId);

          // Step 3: Create the loan
          const loanData: any = {
            borrower_id: newUserId,
            lender_type: 'personal',
            invite_email: data.inviteEmail || null,
            invite_phone: data.invitePhone || null,
            invite_username: data.inviteUsername || null,
            invite_token: inviteToken,
            invite_accepted: false,
            amount: data.amount,
            currency: data.currency,
            purpose: data.purpose || 'Personal loan',
            interest_rate: 0,
            interest_type: 'simple',
            total_interest: 0,
            total_amount: data.amount,
            repayment_frequency: data.repaymentFrequency,
            repayment_amount: Math.round(repaymentAmount * 100) / 100,
            total_installments: data.totalInstallments,
            start_date: data.startDate,
            disbursement_method: 'bank_transfer',
            borrower_signed: true,
            borrower_signed_at: new Date().toISOString(),
            status: 'pending',
            match_status: 'manual',
            amount_paid: 0,
            amount_remaining: data.amount,
            borrower_name: guestFullName,
            auto_pay_enabled: true,
          };

          if (bankInfo) {
            loanData.borrower_dwolla_customer_url = bankInfo.dwolla_customer_url;
            loanData.borrower_dwolla_customer_id = bankInfo.dwolla_customer_id;
            loanData.borrower_dwolla_funding_source_url = bankInfo.dwolla_funding_source_url;
            loanData.borrower_dwolla_funding_source_id = bankInfo.dwolla_funding_source_id;
            loanData.borrower_bank_name = bankInfo.bank_name;
            loanData.borrower_bank_account_mask = bankInfo.account_mask;
            loanData.borrower_bank_connected = true;
          }

          const { data: loan, error: loanError } = await supabase.from('loans').insert(loanData).select().single();
          if (loanError) throw loanError;

          // Step 4: Create payment schedule
          const scheduleItems = schedule.map((item) => ({
            loan_id: loan.id,
            due_date: toDateString(item.dueDate),
            amount: item.amount,
            principal_amount: item.principalAmount,
            interest_amount: item.interestAmount,
            is_paid: false,
          }));
          await supabase.from('payment_schedule').insert(scheduleItems);

          // Step 5: Create notification for borrower
          await supabase.from('notifications').insert({
            user_id: newUserId,
            type: 'loan_created',
            title: 'Loan Request Submitted',
            message: `Your loan request for $${data.amount.toLocaleString()} has been submitted.`,
            data: { loan_id: loan.id, amount: data.amount },
            is_read: false,
          });

          // Step 6: Send invite to lender
          if (data.inviteEmail || data.invitePhone) {
            await fetch('/api/invite/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loanId: loan.id,
                lenderType: 'personal',
                inviteToken,
                email: data.inviteEmail,
                phone: data.invitePhone,
                borrowerName: guestFullName,
                amount: data.amount,
                currency: data.currency,
                purpose: data.purpose,
              }),
            });
          }

          // Redirect to loan page (user is now logged in)
          router.push(`/loans/${loan.id}?welcome=true`);

        } else {
          // GUEST BUSINESS LOAN - Needs verification first
          
          // Upload documents
          let idDocUrl = null, employmentDocUrl = null, addressDocUrl = null;
          if (idDocumentFile) idDocUrl = await uploadFile(idDocumentFile, `id-documents/${newUserId}`);
          if (employmentDocumentFile) employmentDocUrl = await uploadFile(employmentDocumentFile, `employment-documents/${newUserId}`);
          if (addressDocumentFile) addressDocUrl = await uploadFile(addressDocumentFile, `address-documents/${newUserId}`);

          // Update user profile with verification data
          await supabase.from('users').update({
            full_name: guestFullName,
            phone: guestPhone || null,
            id_type: idType,
            id_number: idNumber,
            id_expiry_date: idExpiry || null,
            id_document_url: idDocUrl,
            employment_status: employmentStatus,
            employer_name: employerName,
            employment_start_date: employmentStartDate,
            monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
            employment_document_url: employmentDocUrl,
            address_line1: addressLine1,
            city,
            country,
            address_document_type: addressDocumentType,
            address_document_url: addressDocUrl,
            verification_status: 'submitted',
            verification_submitted_at: new Date().toISOString(),
            plaid_access_token: bankInfo?.plaid_access_token,
            dwolla_customer_url: bankInfo?.dwolla_customer_url,
            dwolla_customer_id: bankInfo?.dwolla_customer_id,
            dwolla_funding_source_url: bankInfo?.dwolla_funding_source_url,
            dwolla_funding_source_id: bankInfo?.dwolla_funding_source_id,
            bank_name: bankInfo?.bank_name,
            bank_account_mask: bankInfo?.account_mask,
            bank_connected: true,
            bank_connected_at: new Date().toISOString(),
          }).eq('id', newUserId);

          // Create pending loan request (will be converted after verification)
          const termMonthsCalc = Math.ceil((data.totalInstallments * (data.repaymentFrequency === 'weekly' ? 1 : data.repaymentFrequency === 'biweekly' ? 2 : 4)) / 4);
          await supabase.from('pending_loan_requests').insert({
            user_id: newUserId,
            business_lender_id: businessLenderId || null,
            loan_type_id: selectedLoanTypeId || null,
            amount: data.amount,
            purpose: data.purpose || loanTypes.find((lt: LoanTypeOption) => lt.id === selectedLoanTypeId)?.name || 'Business',
            term_months: termMonthsCalc,
            status: 'awaiting_verification',
          });

          router.push('/verify/pending?source=guest-business');
        }
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setSubmitError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
  ];

  const currencyOptions = [{ value: 'USD', label: 'USD ($)' }];

  const canProceedStep2 = () => lenderType === 'business' ? !!selectedLoanTypeId : !!(inviteEmail || invitePhone || inviteUsername);
  const canProceedStep3 = () => amount > 0 && totalInstallments > 0 && !!startDate;

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-2">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      {/* Error Display */}
      {(stepError || submitError) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{stepError || submitError}</div>
        </div>
      )}

      {/* STEP 1: Bank Check & Lender Type */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {isLoggedIn && !bankConnected && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">Connect Bank First</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">Connect your bank account before requesting a loan.</p>
                  <Button type="button" onClick={handleConnectBank} className="mt-3" size="sm" disabled={connectingBank}>
                    {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Connect Bank
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {isLoggedIn && bankConnected && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">Bank connected - {bankInfo?.bank_name} ••••{bankInfo?.account_mask}</span>
            </div>
          )}

          {isLoggedIn && !loadingLimit && borrowingLimit && (!lenderType || lenderType === 'personal') && (
            <Card className="border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <Star className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-neutral-500">Personal Lending Tier</p>
                    <p className="font-semibold text-neutral-900 dark:text-white">{borrowingLimit.tierName || 'Starter'}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-500">Available to Borrow</span>
                  <span className="text-lg font-bold text-primary-600">{formatCurrency(borrowingLimit.availableAmount || 0)}</span>
                </div>
                <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500" style={{ width: `${borrowingLimit.maxAmount ? ((borrowingLimit.availableAmount || 0) / borrowingLimit.maxAmount) * 100 : 0}%` }} />
                </div>
              </div>
            </Card>
          )}

          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Who do you want to borrow from?</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Choose your lender type to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Card
              hover
              className={`cursor-pointer transition-all ${lenderType === 'business' ? 'ring-2 ring-primary-500 border-primary-500' : ''} ${isLoggedIn && (!bankConnected || user?.verification_status !== 'verified') ? 'opacity-50' : ''}`}
              onClick={() => {
                if (!isLoggedIn || (bankConnected && user?.verification_status === 'verified')) {
                  setLenderType('business');
                  setValue('lenderType', 'business');
                  setStepError(null);
                }
              }}
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-yellow-100 dark:from-primary-900/30 dark:to-yellow-900/30 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-600" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Business Lender</h3>
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-sm text-neutral-500">We'll instantly match you with the best lender</p>
                {isLoggedIn && user?.verification_status !== 'verified' && (
                  <p className="text-xs text-yellow-600 mt-2 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" /> Requires verification
                  </p>
                )}
              </div>
            </Card>

            <Card
              hover
              className={`cursor-pointer transition-all ${lenderType === 'personal' ? 'ring-2 ring-primary-500 border-primary-500' : ''}`}
              onClick={() => {
                setLenderType('personal');
                setValue('lenderType', 'personal');
                setValue('interestRate', 0);
                setStepError(null);
              }}
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent-600" />
                </div>
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-2">Friend or Family</h3>
                <p className="text-sm text-neutral-500">Send an invite to someone you know</p>
              </div>
            </Card>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(2)} disabled={!lenderType || (isLoggedIn && !bankConnected)}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2: Select Lender */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(1); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {lenderType === 'business' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Auto-Match Enabled</h2>
                <p className="text-neutral-500">We'll find the best lender for you automatically</p>
              </div>

              <Card className="bg-gradient-to-br from-primary-50 to-yellow-50 dark:from-primary-900/10 dark:to-yellow-900/10 border-primary-200 dark:border-primary-800">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 to-yellow-100 rounded-full flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">How It Works</h3>
                  <div className="text-left max-w-md mx-auto space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-800">1</div>
                      <p className="text-sm text-neutral-600">You submit your loan request</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-800">2</div>
                      <p className="text-sm text-neutral-600">We match you with available lenders</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 flex items-center justify-center text-sm font-bold text-primary-800">3</div>
                      <p className="text-sm text-neutral-600">Best match funds your loan</p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Loan Type Selection */}
              {loanTypes.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">What type of loan? <span className="text-red-500">*</span></h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-3">Select a loan type to help us match you with the right lenders</p>
                  
                  <div className="relative">
                    <div 
                      className={`w-full px-4 py-3 rounded-xl border cursor-pointer transition ${
                        showLoanTypeDropdown ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-neutral-200 dark:border-neutral-700'
                      } bg-white dark:bg-neutral-800`}
                      onClick={() => setShowLoanTypeDropdown(!showLoanTypeDropdown)}
                    >
                      <div className="flex items-center justify-between">
                        {selectedLoanTypeId ? (
                          (() => {
                            const selectedType = loanTypes.find((lt: LoanTypeOption) => lt.id === selectedLoanTypeId);
                            if (!selectedType) return null;
                            const IconComponent = getLoanTypeIcon(selectedType);
                            return (
                              <div className="flex items-center gap-2">
                                <IconComponent className="w-5 h-5 text-primary-600 dark:text-primary-400 flex-shrink-0" />
                                <span className="text-neutral-900 dark:text-white">{selectedType.name}</span>
                              </div>
                            );
                          })()
                        ) : (
                          <span className="text-neutral-500">Select loan purpose...</span>
                        )}
                        <ChevronDown className={`w-5 h-5 text-neutral-400 transition-transform ${showLoanTypeDropdown ? 'rotate-180' : ''}`} />
                      </div>
                    </div>

                    {showLoanTypeDropdown && (
                      <div className="absolute z-20 w-full mt-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg overflow-hidden">
                        <div className="p-2 border-b border-neutral-100 dark:border-neutral-800">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                            <input
                              type="text"
                              value={loanTypeSearch}
                              onChange={(e) => setLoanTypeSearch(e.target.value)}
                              placeholder="Search loan types..."
                              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto p-2">
                          {loanTypes
                            .filter(lt => 
                              loanTypeSearch === '' || 
                              lt.name.toLowerCase().includes(loanTypeSearch.toLowerCase()) ||
                              lt.description?.toLowerCase().includes(loanTypeSearch.toLowerCase())
                            )
                            .map((lt) => {
                              const IconComponent = getLoanTypeIcon(lt);
                              return (
                                <button
                                  key={lt.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedLoanTypeId(lt.id);
                                    setValue('loanTypeId', lt.id);
                                    setShowLoanTypeDropdown(false);
                                    setLoanTypeSearch('');
                                  }}
                                  className={`w-full px-3 py-2.5 rounded-lg text-left transition flex items-center gap-3 ${
                                    selectedLoanTypeId === lt.id 
                                      ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' 
                                      : 'hover:bg-neutral-50 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                                  }`}
                                >
                                  <IconComponent className={`w-5 h-5 flex-shrink-0 ${selectedLoanTypeId === lt.id ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}`} />
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm">{lt.name}</p>
                                    {lt.description && (
                                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{lt.description}</p>
                                    )}
                                  </div>
                                  {selectedLoanTypeId === lt.id && (
                                    <Check className="w-4 h-4 text-primary-600 flex-shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                          
                          {loanTypes.filter(lt => 
                            loanTypeSearch === '' || 
                            lt.name.toLowerCase().includes(loanTypeSearch.toLowerCase())
                          ).length === 0 && (
                            <p className="px-3 py-4 text-sm text-neutral-500 text-center">No matching loan types</p>
                          )}
                        </div>
                      </div>
                    )}

                    {showLoanTypeDropdown && (
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => { setShowLoanTypeDropdown(false); setLoanTypeSearch(''); }}
                      />
                    )}
                  </div>

                  {selectedLoanTypeId && (
                    <button
                      type="button"
                      onClick={() => { setSelectedLoanTypeId(null); setValue('loanTypeId', ''); }}
                      className="mt-2 text-xs text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
                    >
                      <X className="w-3 h-3" /> Clear selection
                    </button>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Invite Your Lender</h2>
                <p className="text-neutral-500">Find them by username or enter their contact info</p>
              </div>

              <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                <label className="block text-sm font-medium mb-2"><AtSign className="w-4 h-4 inline mr-1" /> Feyza Username</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 font-medium">~</span>
                    <input
                      type="text"
                      value={usernameSearch}
                      onChange={(e) => { setUsernameSearch(e.target.value); setUsernameError(null); setUsernameFound(null); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); searchUsername(usernameSearch); } }}
                      placeholder="username"
                      className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:border-neutral-700"
                    />
                  </div>
                  <Button type="button" variant="outline" onClick={() => searchUsername(usernameSearch)} disabled={usernameSearching || !usernameSearch}>
                    {usernameSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
                {usernameFound && (
                  <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800">~{usernameFound.username}</p>
                      <p className="text-sm text-green-700">{usernameFound.displayName}</p>
                    </div>
                  </div>
                )}
                {usernameError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700">{usernameError}</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-4 py-2">
                <div className="flex-1 h-px bg-neutral-200"></div>
                <span className="text-sm text-neutral-400">or invite by contact</span>
                <div className="flex-1 h-px bg-neutral-200"></div>
              </div>

              <Input label="Email Address" type="email" placeholder="friend@example.com" {...register('inviteEmail')} onChange={(e) => { setValue('inviteEmail', e.target.value); setStepError(null); }} />
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(3)} disabled={!canProceedStep2()}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Loan Details */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(2); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Loan Details</h2>
            <p className="text-neutral-500">Specify the amount and repayment terms</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input label="Principal Amount *" type="number" placeholder="1000" min="1" {...register('amount', { valueAsNumber: true })} />
              {isLoggedIn && borrowingLimit && lenderType === 'personal' && (
                <p className="text-xs mt-1 text-neutral-500">Available: {formatCurrency(borrowingLimit.availableAmount || 0)}</p>
              )}
            </div>
            <Select label="Currency *" options={currencyOptions} {...register('currency')} />
          </div>

          <Input label="Purpose (optional)" placeholder="e.g., Business supplies, emergency" {...register('purpose')} />

          {amount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium">Repayment Schedule *</label>
                <button type="button" onClick={() => setUseSmartSchedule(!useSmartSchedule)} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
                  {useSmartSchedule ? <><Edit3 className="w-4 h-4" /> Custom</> : <><Zap className="w-4 h-4" /> Smart</>}
                </button>
              </div>

              {useSmartSchedule ? (
                <>
                  {financialProfile && incomeBasedSchedule?.suggestions ? (
                    <div className="space-y-4">
                      <div className="p-3 bg-gradient-to-r from-green-50 to-green-50 border border-green-200 rounded-xl">
                        <div className="flex items-center gap-2 text-green-700">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-medium">Personalized for your income ({formatCurrency(incomeBasedSchedule.disposableIncome)}/mo disposable)</span>
                        </div>
                      </div>

                      <div className="grid gap-3">
                        {(['comfortable', 'balanced', 'aggressive'] as ComfortLevel[]).map((level) => {
                          const suggestion = incomeBasedSchedule.suggestions![level];
                          const isSelected = selectedComfortLevel === level;
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setSelectedComfortLevel(level)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${isSelected ? 'border-green-500 bg-green-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? 'bg-green-100' : 'bg-neutral-100'}`}>
                                    {level === 'comfortable' && <Shield className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                                    {level === 'balanced' && <Star className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                                    {level === 'aggressive' && <Zap className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-neutral-500'}`} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium capitalize">{level}</p>
                                      {level === 'balanced' && <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Recommended</span>}
                                    </div>
                                    <p className="text-sm text-neutral-500">{suggestion.numberOfPayments} payments • {suggestion.percentOfDisposable}% of disposable</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold">{formatCurrency(suggestion.amount)}</p>
                                  <p className="text-xs text-neutral-500">~{suggestion.weeksToPayoff} weeks</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : repaymentPresets.length > 0 ? (
                    <div className="grid gap-3">
                      {repaymentPresets.map((preset, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => setSelectedPresetIndex(index)}
                          className={`w-full p-4 rounded-xl border-2 text-left transition-all ${selectedPresetIndex === index ? 'border-primary-500 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedPresetIndex === index ? 'bg-primary-100' : 'bg-neutral-100'}`}>
                                <CalendarIcon className={`w-5 h-5 ${selectedPresetIndex === index ? 'text-primary-600' : 'text-neutral-500'}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{preset.label}</p>
                                  {preset.recommended && <span className="px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">Recommended</span>}
                                </div>
                                <p className="text-sm text-neutral-500">{preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(preset.paymentAmount)}</p>
                              <p className="text-xs text-neutral-500">per payment</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 bg-neutral-50 rounded-xl text-center text-neutral-500">Enter an amount to see options</div>
                  )}
                </>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <Select label="Frequency" options={frequencyOptions} {...register('repaymentFrequency')} />
                  <Input label="Number of Installments" type="number" placeholder="10" min="1" {...register('totalInstallments', { valueAsNumber: true })} />
                </div>
              )}
            </div>
          )}

          {(!amount || amount <= 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Repayment Frequency *" options={frequencyOptions} {...register('repaymentFrequency')} />
              <Input label="Number of Installments *" type="number" placeholder="10" min="1" {...register('totalInstallments', { valueAsNumber: true })} />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Start Date *</label>
            <CalendarPicker selectedDate={selectedStartDate} onDateSelect={setSelectedStartDate} minDate={new Date()} placeholder="Select start date" />
          </div>

          {amount > 0 && totalInstallments > 0 && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <h4 className="font-semibold mb-2">Loan Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-neutral-500">Principal:</span>
                <span className="text-right font-medium">{formatCurrency(amount)}</span>
                <span className="text-neutral-500 font-medium">Total to Repay:</span>
                <span className="text-right font-bold text-primary-600">{formatCurrency(totalAmount)}</span>
                <span className="text-neutral-500">Per Installment:</span>
                <span className="text-right font-medium">{formatCurrency(repaymentAmount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(4)} disabled={!canProceedStep3()}>
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Account Creation (Guest) or Disbursement (Logged-in) */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(3); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {isLoggedIn ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">How to Receive Money</h2>
                <p className="text-neutral-500">Funds will be sent to your connected bank</p>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">Bank Transfer</p>
                    <p className="text-sm text-green-700">{bankInfo?.bank_name ? `Funds will be sent to ${bankInfo.bank_name} (••••${bankInfo.account_mask})` : 'Funds will be sent to your connected bank'}</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => goToNextStep(5)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Create Your Account</h2>
                <p className="text-neutral-500">Sign up to complete your loan request</p>
              </div>

              <Input label="Full Name *" value={guestFullName} onChange={(e) => setGuestFullName(e.target.value)} placeholder="John Doe" />
              <Input label="Email *" type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} placeholder="john@example.com" />
              <Input label="Phone (Optional)" type="tel" value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} placeholder="+1 234 567 8900" />

              <div>
                <label className="block text-sm font-medium mb-2">Password *</label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} value={guestPassword} onChange={(e) => setGuestPassword(e.target.value)} placeholder="••••••••" minLength={8}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 focus:ring-2 focus:ring-primary-500 dark:bg-neutral-800 dark:border-neutral-700" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Input label="Confirm Password *" type={showPassword ? 'text' : 'password'} value={guestConfirmPassword} onChange={(e) => setGuestConfirmPassword(e.target.value)} placeholder="••••••••" />

              <div className="flex justify-end pt-4">
                <Button type="button" onClick={() => goToNextStep(5)}>
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Guest Business: Identity Verification (Step 5) */}
      {!isLoggedIn && lenderType === 'business' && step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(4); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Identity Verification</h2>
            <p className="text-neutral-500">Required for business loans</p>
          </div>

          <Select label="ID Type *" value={idType} onChange={(e) => setIdType(e.target.value)} options={ID_TYPES} />
          <Input label="ID Number *" value={idNumber} onChange={(e) => setIdNumber(e.target.value)} placeholder="Enter ID number" />
          <Input label="ID Expiry (Optional)" type="date" value={idExpiry} onChange={(e) => setIdExpiry(e.target.value)} />

          <div>
            <label className="block text-sm font-medium mb-1.5">Upload ID Document *</label>
            <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setIdDocumentFile(e.target.files?.[0] || null)} className="hidden" id="id-upload" />
              <label htmlFor="id-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                {idDocumentFile ? <p className="text-sm text-green-600 font-medium">{idDocumentFile.name}</p> : <p className="text-sm text-neutral-600">Click to upload</p>}
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(6)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Guest Business: Employment (Step 6) */}
      {!isLoggedIn && lenderType === 'business' && step === 6 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(5); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Employment Information</h2>
            <p className="text-neutral-500">Help us verify your income</p>
          </div>

          <Select label="Employment Status *" value={employmentStatus} onChange={(e) => setEmploymentStatus(e.target.value)} options={EMPLOYMENT_STATUSES} />
          <Input label="Employer Name *" value={employerName} onChange={(e) => setEmployerName(e.target.value)} placeholder="Company name" />
          <Input label="Employment Start Date *" type="date" value={employmentStartDate} onChange={(e) => setEmploymentStartDate(e.target.value)} />
          <Input label="Monthly Income (Optional)" type="number" value={monthlyIncome} onChange={(e) => setMonthlyIncome(e.target.value)} placeholder="5000" />

          <div>
            <label className="block text-sm font-medium mb-1.5">Upload Proof of Employment *</label>
            <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setEmploymentDocumentFile(e.target.files?.[0] || null)} className="hidden" id="emp-upload" />
              <label htmlFor="emp-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                {employmentDocumentFile ? <p className="text-sm text-green-600 font-medium">{employmentDocumentFile.name}</p> : <p className="text-sm text-neutral-600">Click to upload</p>}
              </label>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(7)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Guest Business: Address + Bank (Step 7) */}
      {!isLoggedIn && lenderType === 'business' && step === 7 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(6); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Address & Bank</h2>
            <p className="text-neutral-500">Final verification step</p>
          </div>

          <Input label="Address *" value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} placeholder="123 Main St" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="City *" value={city} onChange={(e) => setCity(e.target.value)} placeholder="New York" />
            <Select label="Country *" value={country} onChange={(e) => setCountry(e.target.value)} options={COUNTRIES} />
          </div>
          <Select label="Proof of Address Type *" value={addressDocumentType} onChange={(e) => setAddressDocumentType(e.target.value)} options={ADDRESS_DOC_TYPES} />

          <div>
            <label className="block text-sm font-medium mb-1.5">Upload Proof *</label>
            <div className="border-2 border-dashed border-neutral-300 rounded-xl p-6 text-center">
              <input type="file" accept="image/*,.pdf" onChange={(e) => setAddressDocumentFile(e.target.files?.[0] || null)} className="hidden" id="addr-upload" />
              <label htmlFor="addr-upload" className="cursor-pointer">
                <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                {addressDocumentFile ? <p className="text-sm text-green-600 font-medium">{addressDocumentFile.name}</p> : <p className="text-sm text-neutral-600">Click to upload</p>}
              </label>
            </div>
          </div>

          <div className="rounded-2xl border border-neutral-200">
            <div className="p-4 bg-neutral-50"><p className="text-sm font-semibold">Bank Connection *</p></div>
            <div className="p-4">
              {bankConnected && bankInfo ? (
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="font-semibold">{bankInfo.bank_name}</p>
                    <p className="text-xs text-neutral-500">••••{bankInfo.account_mask}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                </div>
              ) : (
                <Button type="button" onClick={handleConnectBank} disabled={!plaidLoaded || connectingBank} className="w-full">
                  {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building className="w-4 h-4 mr-2" />}
                  Connect Bank
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(8)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Guest Business: Disbursement (Step 8) */}
      {!isLoggedIn && lenderType === 'business' && step === 8 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(7); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">How to Receive Money</h2>
            <p className="text-neutral-500">Funds will be sent to your connected bank</p>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-green-800">Bank Transfer</p>
                <p className="text-sm text-green-700">{bankInfo?.bank_name ? `${bankInfo.bank_name} (••••${bankInfo.account_mask})` : 'Your connected bank account'}</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(9)}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Guest Personal: Disbursement + Bank (Step 5) */}
      {!isLoggedIn && lenderType === 'personal' && step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(4); setStepError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Connect Your Bank</h2>
            <p className="text-neutral-500">Funds will be sent to your bank account</p>
          </div>

          <div className="rounded-2xl border border-neutral-200">
            <div className="p-4 bg-neutral-50"><p className="text-sm font-semibold">Bank Connection *</p></div>
            <div className="p-4">
              {bankConnected && bankInfo ? (
                <div className="flex items-center gap-3">
                  <Building className="w-5 h-5 text-green-700" />
                  <div>
                    <p className="font-semibold">{bankInfo.bank_name}</p>
                    <p className="text-xs text-neutral-500">••••{bankInfo.account_mask}</p>
                  </div>
                  <CheckCircle className="w-4 h-4 text-green-600 ml-auto" />
                </div>
              ) : (
                <Button type="button" onClick={handleConnectBank} disabled={!plaidLoaded || connectingBank || !guestFullName || !guestEmail} className="w-full">
                  {connectingBank ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Building className="w-4 h-4 mr-2" />}
                  Connect Bank
                </Button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button type="button" onClick={() => goToNextStep(6)} disabled={!bankConnected}>Continue <ChevronRight className="w-4 h-4 ml-1" /></Button>
          </div>
        </div>
      )}

      {/* Agreement Step - Final step */}
      {((isLoggedIn && step === 5) || (!isLoggedIn && lenderType === 'personal' && step === 6) || (!isLoggedIn && lenderType === 'business' && step === 9)) && (
        <div className="space-y-4 animate-fade-in">
          <button type="button" onClick={() => { setStep(step - 1); setStepError(null); setSubmitError(null); }} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Review & Sign Agreement</h2>
            <p className="text-neutral-500">Review and accept the loan terms</p>
          </div>

          <Card className="bg-primary-50 border-primary-200">
            <h4 className="font-semibold text-primary-900 mb-3">Loan Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-primary-700">Principal:</span>
              <span className="text-right font-medium text-primary-900">{formatCurrency(amount)}</span>
              <span className="text-primary-700">Total to Repay:</span>
              <span className="text-right font-bold text-primary-900">{formatCurrency(totalAmount)}</span>
              <span className="text-primary-700">Installments:</span>
              <span className="text-right font-medium text-primary-900">{totalInstallments} × {formatCurrency(repaymentAmount)}</span>
              <span className="text-primary-700">Start Date:</span>
              <span className="text-right font-medium text-primary-900">{startDate ? new Date(startDate).toLocaleDateString() : '-'}</span>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold flex items-center gap-2"><FileText className="w-4 h-4" /> Loan Agreement Terms</h4>
              <button type="button" onClick={() => setShowFullTerms(!showFullTerms)} className="text-sm text-primary-600 hover:text-primary-700">
                {showFullTerms ? 'Hide' : 'Show'} full terms
              </button>
            </div>

            {showFullTerms && (
              <div className="text-sm text-neutral-600 space-y-3 max-h-64 overflow-y-auto mb-4 p-4 bg-neutral-50 rounded-lg">
                <p><strong>1. Loan Agreement</strong></p>
                <p>I agree to borrow {formatCurrency(amount)} and repay a total of {formatCurrency(totalAmount)} according to the payment schedule.</p>
                <p><strong>2. Repayment Terms</strong></p>
                <p>I will make {totalInstallments} payments of {formatCurrency(repaymentAmount)} each.</p>
                <p><strong>3. Late Payments</strong></p>
                <p>I understand that late payments may affect my relationship with the lender.</p>
                <p><strong>4. Digital Signatures</strong></p>
                <p>I acknowledge that my digital signature on this platform is legally binding.</p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">By signing, you agree to repay this loan according to the terms above. This is a legally binding agreement.</div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={agreementAccepted} onChange={(e) => { setAgreementAccepted(e.target.checked); setStepError(null); }} className="mt-1 w-4 h-4 text-primary-600 rounded border-neutral-300 focus:ring-primary-500" />
              <span className="text-sm text-neutral-700">I have read, understood, and agree to the loan agreement terms. I commit to repaying this loan as agreed.</span>
            </label>
          </Card>

          <div className="flex justify-end pt-4">
            <Button type="submit" loading={isSubmitting} disabled={!agreementAccepted}>
              <FileText className="w-4 h-4 mr-2" /> Sign & Submit Request
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
