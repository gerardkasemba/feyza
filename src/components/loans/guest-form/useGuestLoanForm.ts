'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { createClient } from '@/lib/supabase/client';
import { onLoanCreatedForBusiness } from '@/lib/business/borrower-trust-service';
import {
  formatCurrency,
  calculateRepaymentSchedule,
  toDateString,
  generateInviteToken,
} from '@/lib/utils';
import {
  getRepaymentPresets,
  PayFrequency,
  ComfortLevel,
} from '@/lib/smartSchedule';
import { clientLogger } from '@/lib/client-logger';
import type {
  BorrowingEligibility,
  LoanTypeOption,
  FinancialProfileData,
  BankInfo,
  GuestLoanRequestFormProps,
} from './types';

const log = clientLogger('GuestLoanForm');

export function useGuestLoanForm({
  businessSlug,
  businessLenderId,
  presetMaxAmount,
}: GuestLoanRequestFormProps = {}) {
  const router = useRouter();
  // Stable client reference so effects depending on it don't re-run every render (which would re-trigger init and show loading again).
  const supabase = useMemo(() => createClient(), []);

  // ─── Auth ────────────────────────────────────────────────────────────────────
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // ─── Navigation ──────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ─── Lender & agreement ──────────────────────────────────────────────────────
  const [lenderType, setLenderType] = useState<'business' | 'personal' | null>(
    businessSlug || businessLenderId ? 'business' : null,
  );
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  // ─── Borrowing eligibility ────────────────────────────────────────────────────
  const [borrowingLimit, setBorrowingLimit] = useState<BorrowingEligibility | null>(null);
  const [businessEligibility, setBusinessEligibility] = useState<BorrowingEligibility | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(true);

  // ─── Loan types ───────────────────────────────────────────────────────────────
  const [loanTypes, setLoanTypes] = useState<LoanTypeOption[]>([]);
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | null>(null);
  const [loanTypeSearch, setLoanTypeSearch] = useState('');
  const [showLoanTypeDropdown, setShowLoanTypeDropdown] = useState(false);

  // ─── Smart schedule ───────────────────────────────────────────────────────────
  const [useSmartSchedule, setUseSmartSchedule] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  const [financialProfile, setFinancialProfile] = useState<FinancialProfileData | null>(null);
  const [loadingFinancialProfile, setLoadingFinancialProfile] = useState(true);
  const [selectedComfortLevel, setSelectedComfortLevel] = useState<ComfortLevel>('balanced');

  // ─── Bank connection ──────────────────────────────────────────────────────────
  const [bankConnected, setBankConnected] = useState(false);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);
  const [plaidLoaded, setPlaidLoaded] = useState(false);
  const [connectingBank, setConnectingBank] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);

  // ─── Payment providers ────────────────────────────────────────────────────────
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);
  const [loadingPaymentProviders, setLoadingPaymentProviders] = useState(true);
  const requiresBankConnection = isDwollaEnabled;

  // ─── Loan amount cap ──────────────────────────────────────────────────────────
  const [maxLoanAmount, setMaxLoanAmount] = useState<number>(presetMaxAmount ?? 0);

  // ─── Username search ──────────────────────────────────────────────────────────
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameSearching, setUsernameSearching] = useState(false);
  const [usernameFound, setUsernameFound] = useState<{ username: string; displayName: string } | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // ─── Guest account fields ─────────────────────────────────────────────────────
  const [guestFullName, setGuestFullName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestPassword, setGuestPassword] = useState('');
  const [guestConfirmPassword, setGuestConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // ─── Identity verification ────────────────────────────────────────────────────
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  // ─── Employment verification ──────────────────────────────────────────────────
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employmentStartDate, setEmploymentStartDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentDocumentFile, setEmploymentDocumentFile] = useState<File | null>(null);

  // ─── Address verification ─────────────────────────────────────────────────────
  const [addressLine1, setAddressLine1] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [addressDocumentType, setAddressDocumentType] = useState('');
  const [addressDocumentFile, setAddressDocumentFile] = useState<File | null>(null);

  // ─── Guest manual payment methods ─────────────────────────────────────────────
  const [guestCashapp, setGuestCashapp] = useState('');
  const [guestVenmo, setGuestVenmo] = useState('');
  const [guestZelle, setGuestZelle] = useState('');

  // ─── Business lender info ─────────────────────────────────────────────────────
  const [businessLenderInfo, setBusinessLenderInfo] = useState<Record<string, unknown> | null>(null);
  // True from the start when a business context is pre-provided (apply/[slug]).
  // Prevents StepLoanDetails from showing maxLoanAmount=0 while trust API is in-flight.
  const [loadingBusinessInfo, setLoadingBusinessInfo] = useState(!!(businessLenderId || businessSlug));

  // ─── Calendar ─────────────────────────────────────────────────────────────────
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(null);

  // ─── React Hook Form ──────────────────────────────────────────────────────────
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

  // ─── Derived calculations ─────────────────────────────────────────────────────
  const totalInterest = amount > 0 && interestRate > 0 ? amount * (interestRate / 100) : 0;
  const totalAmount = amount + totalInterest;
  const repaymentAmount = totalInstallments > 0 ? totalAmount / totalInstallments : 0;

  const repaymentPresets = useMemo(() => getRepaymentPresets(amount), [amount]);
  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;

  const incomeBasedSchedule = useMemo(() => {
    if (!financialProfile || !amount || amount <= 0) return null;
    const disposable = financialProfile.disposableIncome;
    if (disposable <= 0) {
      return { hasProfile: true, monthlyIncome: financialProfile.monthlyIncome, disposableIncome: disposable, suggestions: null };
    }
    const multiplierMap: Record<PayFrequency, number> = { weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 };

    const getInstallmentCount = (level: ComfortLevel): number => {
      if (amount <= 100) return level === 'comfortable' ? 4 : level === 'balanced' ? 2 : 1;
      if (amount <= 300) return level === 'comfortable' ? 6 : level === 'balanced' ? 4 : 2;
      if (amount <= 500) return level === 'comfortable' ? 8 : level === 'balanced' ? 4 : 2;
      if (amount <= 1000) return level === 'comfortable' ? 10 : level === 'balanced' ? 6 : 3;
      if (amount <= 2000) return level === 'comfortable' ? 12 : level === 'balanced' ? 8 : 4;
      const percentages = { comfortable: 0.15, balanced: 0.22, aggressive: 0.30 };
      const multiplier = multiplierMap[financialProfile.payFrequency];
      const monthlyPayment = disposable * percentages[level];
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

  const totalSteps = useMemo(() => {
    if (isLoggedIn) return 5;
    if (lenderType === 'personal') return 6;
    if (lenderType === 'business') return 9;
    return 5;
  }, [isLoggedIn, lenderType]);

  const progressPercent = (step / totalSteps) * 100;

  // ─── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (selectedStartDate) {
      setValue('startDate', selectedStartDate.toISOString().split('T')[0]);
    }
  }, [selectedStartDate, setValue]);

  // Skip to step 3 when business ID or slug is provided
  useEffect(() => {
    if (businessSlug || businessLenderId) {
      setStep(3);
      setLenderType('business');
    }
  }, [businessSlug, businessLenderId]);

  // Fetch business info from ID
  useEffect(() => {
    if (!businessLenderId) return;
    const fetchBusinessInfo = async () => {
      setLoadingBusinessInfo(true);
      try {
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('id, business_name, tagline, logo_url, default_interest_rate, interest_type, first_time_borrower_amount, user_id')
          .eq('id', businessLenderId)
          .single();

        if (!businessData) return;
        setBusinessLenderInfo(businessData as Record<string, unknown>);

        const { data: prefs } = await supabase
          .from('lender_preferences')
          .select('interest_rate, interest_type, min_amount, first_time_borrower_limit, allow_first_time_borrowers')
          .eq('business_id', businessLenderId)
          .single();

        // Safe fallback: business.first_time_borrower_amount (lender-configured intro cap).
        // Never fall back to prefs.first_time_borrower_limit — its DB default is 500,
        // which is the absolute ceiling, not the introductory limit for new borrowers.
        const safeDefault = (businessData as any).first_time_borrower_amount ?? 50;

        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          // Logged-in path: use /api/borrower/trust for the correct tier-based limit.
          // Three failure modes all fall through to safeDefault:
          //   A) trustRes.ok = false (401 auth issue, 404 business not found, 500 server error)
          //   B) trustData.maxAmount = 0 (banned / suspended user — canBorrow=false)
          //   C) fetch throws (network error)
          try {
            const trustRes = await fetch(`/api/borrower/trust?business_id=${businessLenderId}`);
            if (trustRes.ok) {
              const trustData = await trustRes.json();
              if (trustData.canBorrow === false) {
                // Banned / suspended — show 0 so the form blocks submission
                setMaxLoanAmount(0);
              } else if (trustData.maxAmount > 0) {
                setMaxLoanAmount(trustData.maxAmount);
              } else {
                // maxAmount unexpectedly 0 but canBorrow is true → use safeDefault
                setMaxLoanAmount(safeDefault);
              }
            } else {
              // Non-ok response (401, 404, 500) → fall back to intro cap
              setMaxLoanAmount(safeDefault);
            }
          } catch {
            // Network / parse error → fall back to intro cap
            setMaxLoanAmount(safeDefault);
          }
        } else {
          // Guest (not logged in): use the lender-configured first-time cap
          setMaxLoanAmount(safeDefault);
        }

        if (prefs) {
          setValue('interestRate', (prefs.interest_rate as number) || 0);
          setValue('interestType', (prefs.interest_type as string) || 'simple');
        } else if ((businessData as { default_interest_rate?: number }).default_interest_rate) {
          setValue('interestRate', (businessData as { default_interest_rate: number }).default_interest_rate || 0);
          setValue('interestType', (businessData as { interest_type?: string }).interest_type || 'simple');
        }
      } catch (err) {
        log.error('Error fetching business info', err);
      } finally {
        setLoadingBusinessInfo(false);
      }
    };
    fetchBusinessInfo();
  }, [businessLenderId, supabase, setValue]);

  // Fetch business info from slug
  useEffect(() => {
    if (!businessSlug) return;
    const fetchBusinessFromSlug = async () => {
      setLoadingBusinessInfo(true);
      try {
        const { data: businessData } = await supabase
          .from('business_profiles')
          .select('id, business_name, tagline, logo_url, default_interest_rate, interest_type, slug, user_id, first_time_borrower_amount')
          .eq('slug', businessSlug)
          .single();

        if (!businessData) return;
        setBusinessLenderInfo(businessData as Record<string, unknown>);
        setValue('lenderType', 'business');

        const { data: prefs } = await supabase
          .from('lender_preferences')
          .select('interest_rate, interest_type, min_amount, first_time_borrower_limit, allow_first_time_borrowers')
          .eq('business_id', (businessData as { id: string }).id)
          .single();

        // Safe fallback: use the lender-configured first-time borrower cap.
        // Intentionally NOT using prefs.first_time_borrower_limit — its DB default is 500,
        // which is the absolute ceiling, not the introductory limit for new borrowers.
        const safeDefaultSlug = (businessData as any).first_time_borrower_amount ?? 50;

        const { data: { user: authUserSlug } } = await supabase.auth.getUser();
        const businessIdFromSlug = (businessData as { id: string }).id;
        if (authUserSlug) {
          // Logged-in path: use /api/borrower/trust for tier-based limit.
          // All failure modes (non-ok response, maxAmount=0 without canBorrow=false,
          // network error) fall through to safeDefaultSlug.
          try {
            const trustRes = await fetch(`/api/borrower/trust?business_id=${businessIdFromSlug}`);
            if (trustRes.ok) {
              const trustData = await trustRes.json();
              if (trustData.canBorrow === false) {
                setMaxLoanAmount(0);
              } else if (trustData.maxAmount > 0) {
                setMaxLoanAmount(trustData.maxAmount);
              } else {
                setMaxLoanAmount(safeDefaultSlug);
              }
            } else {
              setMaxLoanAmount(safeDefaultSlug);
            }
          } catch {
            setMaxLoanAmount(safeDefaultSlug);
          }
        } else {
          // Guest (not logged in): use lender-configured first-time cap
          setMaxLoanAmount(safeDefaultSlug);
        }
        setValue('lenderType', 'business');

        if (prefs) {
          setValue('interestRate', (prefs.interest_rate as number) || 0);
          setValue('interestType', (prefs.interest_type as string) || 'simple');
        } else if ((businessData as { default_interest_rate?: number }).default_interest_rate) {
          setValue('interestRate', (businessData as { default_interest_rate: number }).default_interest_rate || 0);
          setValue('interestType', (businessData as { interest_type?: string }).interest_type || 'simple');
        }
      } catch (err) {
        log.error('Error fetching business from slug', err);
      } finally {
        setLoadingBusinessInfo(false);
      }
    };
    fetchBusinessFromSlug();
  }, [businessSlug, supabase, setValue]);

  // Load Plaid script
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!(window as { Plaid?: unknown }).Plaid) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      script.onload = () => setPlaidLoaded(true);
      document.body.appendChild(script);
    } else {
      setPlaidLoaded(true);
    }
  }, []);

  // Check auth and load initial data
  useEffect(() => {
    const init = async () => {
      setInitialLoading(true);
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();

        if (authUser) {
          setIsLoggedIn(true);
          setUserId(authUser.id);
          const { data: profile } = await supabase.from('users').select('*').eq('id', authUser.id).single();
          const userData = (profile || { id: authUser.id, email: authUser.email, full_name: authUser.user_metadata?.full_name || 'User' }) as Record<string, unknown>;
          setUser(userData);
          setGuestFullName((userData.full_name as string) || '');
          setGuestEmail((userData.email as string) || (authUser.email ?? ''));

          if (userData.dwolla_funding_source_url) {
            setBankConnected(true);
            setBankInfo({
              dwolla_customer_url: userData.dwolla_customer_url as string | undefined,
              dwolla_customer_id: userData.dwolla_customer_id as string | undefined,
              dwolla_funding_source_url: userData.dwolla_funding_source_url as string | undefined,
              dwolla_funding_source_id: userData.dwolla_funding_source_id as string | undefined,
              bank_name: userData.bank_name as string | undefined,
              account_mask: userData.bank_account_mask as string | undefined,
            });
          }

          try {
            const [personalRes, businessRes] = await Promise.all([
              fetch('/api/borrower/eligibility?lender_type=personal'),
              fetch('/api/borrower/eligibility?lender_type=business'),
            ]);
            if (personalRes.ok) setBorrowingLimit(await personalRes.json());
            if (businessRes.ok) setBusinessEligibility(await businessRes.json());
          } catch (e) {
            log.error('Failed to fetch limits', e);
          }
          setLoadingLimit(false);

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
          } catch (e) {
            log.error('Failed to fetch financial profile', e);
          }
          setLoadingFinancialProfile(false);
        } else {
          setLoadingLimit(false);
          setLoadingFinancialProfile(false);
        }

        try {
          const ltRes = await fetch('/api/loan-types');
          if (ltRes.ok) {
            const ltData = await ltRes.json();
            setLoanTypes(ltData.loanTypes || []);
          }
        } catch (e) {
          log.error('Failed to fetch loan types', e);
        }

        try {
          const ppRes = await fetch('/api/payment-methods?country=US&type=disbursement');
          if (ppRes.ok) {
            const ppData = await ppRes.json();
            const dwollaEnabled = (ppData.providers || []).some((p: { slug: string }) => p.slug === 'dwolla');
            setIsDwollaEnabled(dwollaEnabled);
          }
        } catch (e) {
          log.error('Failed to fetch payment providers', e);
        }
        setLoadingPaymentProviders(false);
      } catch (err) {
        log.error('Init error', err);
      } finally {
        setInitialLoading(false);
      }
    };
    init();
  }, [supabase]);

  // Auth state change listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsLoggedIn(false);
        setUserId(null);
        setUser(null);
        setGuestFullName('');
        setGuestEmail('');
        setGuestPhone('');
        setGuestPassword('');
        setGuestConfirmPassword('');
        setBankConnected(false);
        setBankInfo(null);
        setBorrowingLimit(null);
        setBusinessEligibility(null);
        setFinancialProfile(null);
        setLenderType(businessSlug || businessLenderId ? 'business' : null);
        setStep(1);
        setStepError(null);
        setSubmitError(null);
        setAgreementAccepted(false);
        setLoadingLimit(false);
        setLoadingFinancialProfile(false);
        setValue('amount', 0);
        setValue('totalInstallments', 0);
        setValue('startDate', '');
        setValue('inviteEmail', '');
        setValue('invitePhone', '');
        setValue('inviteUsername', '');
        setValue('purpose', '');
      } else if (event === 'SIGNED_IN' && session?.user) {
        window.location.reload();
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase, businessSlug, businessLenderId, setValue]);

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
        setValue('repaymentFrequency', suggestion.frequency as string);
        setValue('totalInstallments', suggestion.numberOfPayments);
      }
    }
  }, [incomeBasedSchedule, useSmartSchedule, selectedComfortLevel, setValue, financialProfile]);

  useEffect(() => {
    setSelectedPresetIndex(null);
  }, [amount]);

  // Plaid link token
  const fetchLinkToken = useCallback(async () => {
    const name = isLoggedIn ? (user?.full_name as string) : guestFullName;
    const email = isLoggedIn ? (user?.email as string) : guestEmail;
    if (!name || !email) return;
    try {
      const endpoint = isLoggedIn ? '/api/plaid/link-token' : '/api/plaid/guest-link-token';
      const body = isLoggedIn ? {} : { name, email };
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.link_token) setLinkToken(data.link_token);
    } catch (err) {
      log.error('Error fetching link token', err);
    }
  }, [isLoggedIn, user, guestFullName, guestEmail]);

  useEffect(() => {
    if ((isLoggedIn && user && !linkToken && !bankConnected) || (!isLoggedIn && guestFullName && guestEmail && !linkToken)) {
      fetchLinkToken();
    }
  }, [isLoggedIn, user, linkToken, bankConnected, guestFullName, guestEmail, fetchLinkToken]);

  // ─── Handlers ─────────────────────────────────────────────────────────────────

  const handleConnectBank = useCallback(async () => {
    const name = isLoggedIn ? (user?.full_name as string) : guestFullName;
    const email = isLoggedIn ? (user?.email as string) : guestEmail;
    if (!name || !email) return;

    if (!linkToken) {
      await fetchLinkToken();
      return;
    }

    if (!(window as unknown as { Plaid?: { create: (config: Record<string, unknown>) => { open: () => void } } }).Plaid) return;

    setConnectingBank(true);
    const handler = (window as unknown as { Plaid: { create: (config: Record<string, unknown>) => { open: () => void } } }).Plaid.create({
      token: linkToken,
      onSuccess: async (publicToken: string, metadata: { institution?: { name?: string }; account?: { mask?: string } }) => {
        try {
          const endpoint = isLoggedIn ? '/api/plaid/exchange' : '/api/plaid/guest-exchange';
          const body = isLoggedIn ? { public_token: publicToken } : { public_token: publicToken, name, email };
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (res.ok) {
            const data = await res.json();
            setBankConnected(true);
            setBankInfo({
              ...data,
              bank_name: metadata.institution?.name,
              account_mask: metadata.account?.mask,
            });
          }
        } catch (err) {
          log.error('Bank exchange error', err);
        } finally {
          setConnectingBank(false);
        }
      },
      onExit: () => setConnectingBank(false),
    });
    handler.open();
  }, [isLoggedIn, user, guestFullName, guestEmail, linkToken, fetchLinkToken]);

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

  const uploadFile = async (file: File, path: string): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;
    const { error } = await supabase.storage.from('verification-documents').upload(filePath, file);
    if (error) return null;
    const { data: { publicUrl } } = supabase.storage.from('verification-documents').getPublicUrl(filePath);
    return publicUrl;
  };

  // ─── Validation ───────────────────────────────────────────────────────────────

  const validateStep1 = (): boolean => {
    if (requiresBankConnection && !bankConnected && isLoggedIn) {
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
    if (values.amount > maxLoanAmount) {
      setStepError(`Amount cannot exceed ${formatCurrency(maxLoanAmount)} (lender's maximum)`);
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
    if (!guestFullName.trim()) { setStepError('Please enter your full name'); return false; }
    if (!guestEmail.trim() || !guestEmail.includes('@')) { setStepError('Please enter a valid email'); return false; }
    if (!guestPassword || guestPassword.length < 8) { setStepError('Password must be at least 8 characters'); return false; }
    if (guestPassword !== guestConfirmPassword) { setStepError('Passwords do not match'); return false; }
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
    if (requiresBankConnection && !bankConnected) {
      setStepError('Please connect your bank account');
      return false;
    }
    return true;
  };

  const goToNextStep = (nextStep: number) => {
    setStepError(null);

    // Skip bank transfer step for logged-in users when Dwolla is disabled
    if (step === 3 && nextStep === 4 && !isDwollaEnabled && isLoggedIn) {
      if (validateStep3()) setStep(5);
      return;
    }

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
        if (step === 5) isValid = !requiresBankConnection || bankConnected;
        else if (step === 6) isValid = agreementAccepted;
      }
    }

    if (isValid) setStep(nextStep);
    else if (step === (isLoggedIn ? 5 : lenderType === 'business' ? 9 : 6) && !agreementAccepted) {
      setStepError('Please accept the agreement');
    }
  };

  // ─── Form submission ──────────────────────────────────────────────────────────

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreementAccepted) { setStepError('Please accept the agreement'); return; }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const data = getValues();
      const inviteToken = lenderType === 'personal' ? generateInviteToken() : null;
      const frequency = data.repaymentFrequency as 'weekly' | 'biweekly' | 'monthly' | 'custom';
      const calculatedTotalInterest = amount * (interestRate / 100);
      const calculatedTotalAmount = amount + calculatedTotalInterest;
      const calculatedRepaymentAmount = totalInstallments > 0 ? calculatedTotalAmount / totalInstallments : 0;

      const schedule = calculateRepaymentSchedule({
        amount: data.amount,
        repaymentAmount: calculatedRepaymentAmount,
        totalInstallments: data.totalInstallments,
        startDate: data.startDate,
        frequency,
        interestRate,
        interestType: interestType as 'simple' | 'compound',
      });

      if (isLoggedIn) {
        const loanData: Record<string, unknown> = {
          borrower_id: userId,
          lender_type: lenderType,
          business_lender_id: businessLenderId || null,
          loan_type_id: selectedLoanTypeId || null,
          country: (user?.country as string) || null,
          state: (user?.state as string) || null,
          invite_email: lenderType === 'personal' ? (data.inviteEmail || null) : null,
          invite_phone: lenderType === 'personal' ? (data.invitePhone || null) : null,
          invite_username: lenderType === 'personal' ? (data.inviteUsername || null) : null,
          invite_token: inviteToken,
          invite_accepted: false,
          amount: data.amount,
          currency: data.currency,
          purpose: data.purpose || loanTypes.find((lt) => lt.id === selectedLoanTypeId)?.name,
          interest_rate: interestRate,
          interest_type: interestType,
          total_interest: Math.round(calculatedTotalInterest * 100) / 100,
          total_amount: Math.round(calculatedTotalAmount * 100) / 100,
          repayment_frequency: data.repaymentFrequency,
          repayment_amount: Math.round(calculatedRepaymentAmount * 100) / 100,
          total_installments: data.totalInstallments,
          start_date: data.startDate,
          disbursement_method: 'bank_transfer',
          borrower_signed: true,
          borrower_signed_at: new Date().toISOString(),
          status: 'pending',
          match_status: lenderType === 'business' ? 'pending' : 'manual',
          amount_paid: 0,
          amount_remaining: Math.round(calculatedTotalAmount * 100) / 100,
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

        // Update borrower_business_trust (replaces tr_update_trust_on_loan_create DB trigger)
        if (businessLenderId && lenderType === 'business') {
          onLoanCreatedForBusiness(supabase as any, userId!, businessLenderId, Number(loanData.amount))
            .catch(err => console.error('[GuestForm] onLoanCreatedForBusiness error:', err));
        }

        await supabase.from('notifications').insert({
          user_id: userId,
          type: 'loan_created',
          title: 'Loan Request Submitted',
          message: `Your loan request for $${data.amount.toLocaleString()} has been submitted.`,
          data: { loan_id: (loan as { id: string }).id, amount: data.amount },
          is_read: false,
        });

        const scheduleItems = schedule.map((item) => ({
          loan_id: (loan as { id: string }).id,
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
              body: JSON.stringify({ type: 'direct_loan_request', loanId: (loan as { id: string }).id, businessId: businessLenderId, borrowerName: user?.full_name, amount: data.amount }),
            });
            router.push(`/loans/${(loan as { id: string }).id}?direct=true`);
          } else {
            const matchRes = await fetch('/api/matching', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ loan_id: (loan as { id: string }).id }),
            });
            const matchResult = await matchRes.json();
            if (matchResult.status === 'auto_accepted') router.push(`/loans/${(loan as { id: string }).id}?matched=true`);
            else if (matchResult.status === 'pending_acceptance') router.push(`/loans/${(loan as { id: string }).id}?matching=true`);
            else router.push(`/loans/${(loan as { id: string }).id}?no_match=true`);
          }
        } else {
          if (data.inviteEmail || data.invitePhone) {
            await fetch('/api/invite/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loanId: (loan as { id: string }).id,
                lenderType,
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
          router.push(`/loans/${(loan as { id: string }).id}`);
        }
      } else {
        // ── Guest flow ──────────────────────────────────────────────────────────
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
          const userUpdate: Record<string, unknown> = { full_name: guestFullName, phone: guestPhone || null };
          if (guestCashapp) userUpdate.cashapp_username = guestCashapp;
          if (guestVenmo) userUpdate.venmo_username = guestVenmo;
          if (guestZelle) {
            if (guestZelle.includes('@')) userUpdate.zelle_email = guestZelle;
            else userUpdate.zelle_phone = guestZelle;
          }
          if (bankInfo) {
            Object.assign(userUpdate, {
              plaid_access_token: bankInfo.plaid_access_token,
              dwolla_customer_url: bankInfo.dwolla_customer_url,
              dwolla_customer_id: bankInfo.dwolla_customer_id,
              dwolla_funding_source_url: bankInfo.dwolla_funding_source_url,
              dwolla_funding_source_id: bankInfo.dwolla_funding_source_id,
              bank_name: bankInfo.bank_name,
              bank_account_mask: bankInfo.account_mask,
              bank_connected: true,
              bank_connected_at: new Date().toISOString(),
            });
          }
          await supabase.from('users').update(userUpdate).eq('id', newUserId);

          const loanData: Record<string, unknown> = {
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
            repayment_amount: Math.round(calculatedRepaymentAmount * 100) / 100,
            total_installments: data.totalInstallments,
            start_date: data.startDate,
            disbursement_method: requiresBankConnection ? 'bank_transfer' : 'manual',
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
            Object.assign(loanData, {
              borrower_dwolla_customer_url: bankInfo.dwolla_customer_url,
              borrower_dwolla_customer_id: bankInfo.dwolla_customer_id,
              borrower_dwolla_funding_source_url: bankInfo.dwolla_funding_source_url,
              borrower_dwolla_funding_source_id: bankInfo.dwolla_funding_source_id,
              borrower_bank_name: bankInfo.bank_name,
              borrower_bank_account_mask: bankInfo.account_mask,
              borrower_bank_connected: true,
            });
          }

          const { data: loan, error: loanError } = await supabase.from('loans').insert(loanData).select().single();
          if (loanError) throw loanError;

          const scheduleItems = schedule.map((item) => ({
            loan_id: (loan as { id: string }).id,
            due_date: toDateString(item.dueDate),
            amount: item.amount,
            principal_amount: item.principalAmount,
            interest_amount: item.interestAmount,
            is_paid: false,
          }));
          await supabase.from('payment_schedule').insert(scheduleItems);
          await supabase.from('notifications').insert({
            user_id: newUserId,
            type: 'loan_created',
            title: 'Loan Request Submitted',
            message: `Your loan request for $${data.amount.toLocaleString()} has been submitted.`,
            data: { loan_id: (loan as { id: string }).id, amount: data.amount },
            is_read: false,
          });

          if (data.inviteEmail || data.invitePhone) {
            await fetch('/api/invite/send', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                loanId: (loan as { id: string }).id,
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
          router.push(`/loans/${(loan as { id: string }).id}?welcome=true`);
        } else {
          // Guest business loan - upload docs, create pending request
          let idDocUrl = null, employmentDocUrl = null, addressDocUrl = null;
          if (idDocumentFile) idDocUrl = await uploadFile(idDocumentFile, `id-documents/${newUserId}`);
          if (employmentDocumentFile) employmentDocUrl = await uploadFile(employmentDocumentFile, `employment-documents/${newUserId}`);
          if (addressDocumentFile) addressDocUrl = await uploadFile(addressDocumentFile, `address-documents/${newUserId}`);

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

          const termMonthsCalc = Math.ceil(
            (data.totalInstallments * (data.repaymentFrequency === 'weekly' ? 1 : data.repaymentFrequency === 'biweekly' ? 2 : 4)) / 4,
          );
          await supabase.from('pending_loan_requests').insert({
            user_id: newUserId,
            business_lender_id: businessLenderId || null,
            loan_type_id: selectedLoanTypeId || null,
            amount: data.amount,
            purpose: data.purpose || loanTypes.find((lt) => lt.id === selectedLoanTypeId)?.name || 'Business',
            term_months: termMonthsCalc,
            status: 'awaiting_verification',
          });

          router.push('/verify/pending?source=guest-business');
        }
      }
    } catch (err: unknown) {
      log.error('Submit error', err);
      setSubmitError((err as Error).message || 'Failed to submit. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────

  const canProceedStep2 = () =>
    lenderType === 'business' ? !!selectedLoanTypeId : !!(inviteEmail || invitePhone || inviteUsername);

  const canProceedStep3 = () => amount > 0 && totalInstallments > 0 && !!startDate;

  // ─── Return ───────────────────────────────────────────────────────────────────

  return {
    // Auth
    isLoggedIn, userId, user, initialLoading,
    // Navigation
    step, setStep, isSubmitting, stepError, setStepError, submitError, setSubmitError, progressPercent, totalSteps,
    // Lender & agreement
    lenderType, setLenderType, agreementAccepted, setAgreementAccepted, showFullTerms, setShowFullTerms,
    // Eligibility
    borrowingLimit, businessEligibility, loadingLimit,
    // Loan types
    loanTypes, selectedLoanTypeId, setSelectedLoanTypeId, loanTypeSearch, setLoanTypeSearch,
    showLoanTypeDropdown, setShowLoanTypeDropdown,
    // Schedule
    useSmartSchedule, setUseSmartSchedule, selectedPresetIndex, setSelectedPresetIndex,
    financialProfile, loadingFinancialProfile, selectedComfortLevel, setSelectedComfortLevel,
    repaymentPresets, incomeBasedSchedule,
    // Bank
    bankConnected, bankInfo, plaidLoaded, connectingBank, requiresBankConnection,
    // Payment providers
    isDwollaEnabled, loadingPaymentProviders,
    // Amount
    maxLoanAmount, presetMaxAmount,
    // Username search
    usernameSearch, setUsernameSearch, usernameSearching, usernameFound, usernameError,
    // Guest account
    guestFullName, setGuestFullName, guestEmail, setGuestEmail, guestPhone, setGuestPhone,
    guestPassword, setGuestPassword, guestConfirmPassword, setGuestConfirmPassword,
    showPassword, setShowPassword,
    // Identity
    idType, setIdType, idNumber, setIdNumber, idExpiry, setIdExpiry, idDocumentFile, setIdDocumentFile,
    // Employment
    employmentStatus, setEmploymentStatus, employerName, setEmployerName,
    employmentStartDate, setEmploymentStartDate, monthlyIncome, setMonthlyIncome,
    employmentDocumentFile, setEmploymentDocumentFile,
    // Address
    addressLine1, setAddressLine1, city, setCity, country, setCountry,
    addressDocumentType, setAddressDocumentType, addressDocumentFile, setAddressDocumentFile,
    // Manual payment
    guestCashapp, setGuestCashapp, guestVenmo, setGuestVenmo, guestZelle, setGuestZelle,
    // Business lender
    businessLenderInfo, loadingBusinessInfo, businessLenderId, businessSlug,
    // Calendar
    selectedStartDate, setSelectedStartDate,
    // Form
    register, setValue, watch, getValues,
    // Calculated
    amount, totalInstallments, repaymentFrequency, interestRate, interestType,
    startDate, inviteEmail, invitePhone, inviteUsername,
    totalInterest, totalAmount, repaymentAmount,
    // Handlers
    handleConnectBank, searchUsername, goToNextStep, handleFormSubmit,
    canProceedStep2, canProceedStep3,
  };
}

export type GuestLoanFormHook = ReturnType<typeof useGuestLoanForm>;
