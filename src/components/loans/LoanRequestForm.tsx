'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Card, Calendar as CalendarPicker } from '@/components/ui';
import { BusinessProfile, DisbursementMethod } from '@/types';
import { formatCurrency, formatPercentage, calculateTotalInterest, calculateLoanTermMonths } from '@/lib/utils';
import {
  getRepaymentPresets,
  PayFrequency,
  ComfortLevel,
  formatPayFrequency,
} from '@/lib/smartSchedule';
import { DisbursementMethodForm } from './DisbursementMethodForm';
import {
  Building2,
  Users,
  ChevronRight,
  ChevronLeft,
  Info,
  AlertCircle,
  FileText,
  CreditCard,
  Check,
  AlertTriangle,
  Shield,
  TrendingUp,
  Lock,
  Star,
  Zap,
  Calendar as CalendarIcon,
  Clock,
  Edit3,
  Search,
  AtSign,
  Loader2,
  Wallet,
  Sparkles,
} from 'lucide-react';

export interface LoanRequestFormData {
  lenderType: 'business' | 'personal';
  businessId?: string;
  loanTypeId?: string;
  inviteEmail?: string;
  invitePhone?: string;
  inviteUsername?: string;
  amount: number;
  currency: string;
  purpose?: string;
  interestRate?: number;
  interestType?: 'simple' | 'compound';
  repaymentFrequency: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  repaymentAmount?: number;
  totalInstallments: number;
  startDate: string;
  disbursementMethod?: DisbursementMethod;
  mobileMoneyProvider?: string;
  mobileMoneyPhone?: string;
  mobileMoneyName?: string;
  cashPickupLocation?: string;
  pickerFullName?: string;
  pickerIdType?: string;
  pickerIdNumber?: string;
  pickerPhone?: string;
  bankName?: string;
  bankAccountName?: string;
  bankAccountNumber?: string;
  bankBranch?: string;
  bankSwiftCode?: string;
  isForRecipient?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientCountry?: string;
  agreementSigned?: boolean;
}

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

interface LoanRequestFormProps {
  businesses: BusinessProfile[];
  preferredLender?: BusinessProfile | null;
  userBankConnected: boolean;
  userVerificationStatus?: string;
  userBankName?: string;
  userBankAccountMask?: string;
  onSubmit: (data: LoanRequestFormData) => Promise<void>;
  onConnectBank: () => void;
  onStartVerification?: () => void;
}

/* ----------------------------- UI Primitives ----------------------------- */

function SectionHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div>
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-neutral-500 dark:text-neutral-400">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}

function Banner({
  tone = 'neutral',
  icon: Icon,
  title,
  children,
  actions,
}: {
  tone?: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const toneStyles: Record<string, string> = {
    neutral: 'border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/30',
    info: 'border-blue-200 dark:border-blue-900/40 bg-blue-50 dark:bg-blue-900/20',
    success: 'border-green-200 dark:border-green-900/40 bg-green-50 dark:bg-green-900/20',
    warning: 'border-yellow-200 dark:border-yellow-900/40 bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/20',
  };
  const iconWrap: Record<string, string> = {
    neutral: 'bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-200',
    info: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200',
    success: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-200',
    warning: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-200',
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200',
  };

  return (
    <div className={['rounded-2xl border p-4', toneStyles[tone]].join(' ')}>
      <div className="flex items-start gap-3">
        <div className={['w-11 h-11 rounded-2xl grid place-items-center', iconWrap[tone]].join(' ')}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-neutral-900 dark:text-white">{title}</p>
          {children ? <div className="mt-1 text-sm text-neutral-700 dark:text-neutral-300">{children}</div> : null}
          {actions ? <div className="mt-3">{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}

function Stepper({
  step,
  totalSteps,
}: {
  step: number;
  totalSteps: number;
}) {
  const progressPercent = (step / totalSteps) * 100;
  return (
    <div className="mb-2">
      <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-2">
        <span>
          Step {step} of {totalSteps}
        </span>
        <span>{Math.round(progressPercent)}% complete</span>
      </div>
      <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
        <div className="h-full bg-primary-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
    >
      <ChevronLeft className="w-4 h-4" />
      Back
    </button>
  );
}

/* ------------------------------- Main Form ------------------------------- */

export function LoanRequestForm({
  businesses,
  preferredLender,
  userBankConnected,
  userVerificationStatus,
  userBankName,
  userBankAccountMask,
  onSubmit,
  onConnectBank,
  onStartVerification,
}: LoanRequestFormProps) {
  const [step, setStep] = useState(preferredLender ? 2 : 1);
  const [lenderType, setLenderType] = useState<'business' | 'personal' | null>(preferredLender ? 'business' : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);

  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(preferredLender || null);

  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);

  const [borrowingLimit, setBorrowingLimit] = useState<BorrowingEligibility | null>(null);
  const [businessEligibility, setBusinessEligibility] = useState<BorrowingEligibility | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(true);

  const [businessTrust, setBusinessTrust] = useState<{
    maxAmount: number;
    isGraduated: boolean;
    completedLoans: number;
    loansUntilGraduation: number;
    trustStatus: string;
    firstTimeAmount: number;
    standardMaxAmount: number;
    canBorrow: boolean;
    reason?: string;
    message?: string;
  } | null>(null);
  const [loadingTrust, setLoadingTrust] = useState(false);

  const [loanTypes, setLoanTypes] = useState<
    Array<{ id: string; name: string; slug: string; description?: string; icon?: string; display_order: number }>
  >([]);
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | null>(null);
  const [loadingLoanTypes, setLoadingLoanTypes] = useState(false);

  const [disbursementData] = useState<any>({ disbursement_method: 'bank_transfer' });

  const [useSmartSchedule, setUseSmartSchedule] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);

  const [financialProfile, setFinancialProfile] = useState<{
    payFrequency: PayFrequency;
    payAmount: number;
    monthlyIncome: number;
    monthlyExpenses: number;
    disposableIncome: number;
    comfortLevel: ComfortLevel;
  } | null>(null);
  const [loadingFinancialProfile, setLoadingFinancialProfile] = useState(true);
  const [selectedComfortLevel, setSelectedComfortLevel] = useState<ComfortLevel>('balanced');

  const { register, setValue, watch, getValues } = useForm<LoanRequestFormData>({
    defaultValues: {
      lenderType: preferredLender ? 'business' : undefined,
      currency: 'USD',
      repaymentFrequency: 'monthly',
      interestRate: 0,
      interestType: 'simple',
    },
  });

  const selectedBusinessId = watch('businessId');
  const amount = watch('amount') || 0;
  const totalInstallments = watch('totalInstallments') || 0;
  const repaymentFrequency = watch('repaymentFrequency') || 'monthly';
  const interestRate = watch('interestRate') || 0;
  const interestType = watch('interestType') || 'simple';
  const inviteEmail = watch('inviteEmail');
  const invitePhone = watch('invitePhone');
  const inviteUsername = watch('inviteUsername');
  const startDate = watch('startDate');

  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(() => (startDate ? new Date(startDate) : null));

  useEffect(() => {
    if (selectedStartDate) {
      const formatted = selectedStartDate.toISOString().split('T')[0];
      setValue('startDate', formatted);
    }
  }, [selectedStartDate, setValue]);

  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameSearching, setUsernameSearching] = useState(false);
  const [usernameFound, setUsernameFound] = useState<{ username: string; displayName: string } | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const termMonths = calculateLoanTermMonths(totalInstallments || 1, repaymentFrequency);
  const totalInterest = calculateTotalInterest(amount, interestRate, termMonths, interestType);
  const totalAmount = amount + totalInterest;
  const repaymentAmount = totalInstallments > 0 ? totalAmount / totalInstallments : 0;

  const repaymentPresets = useMemo(() => getRepaymentPresets(amount), [amount]);
  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;

  useEffect(() => {
    setSelectedPresetIndex(null);
  }, [amount]);

  useEffect(() => {
    if (selectedPreset && useSmartSchedule && !financialProfile) {
      setValue('repaymentFrequency', selectedPreset.frequency);
      setValue('totalInstallments', selectedPreset.installments);
    }
  }, [selectedPreset, useSmartSchedule, setValue, financialProfile]);

  const incomeBasedSchedule = useMemo(() => {
    if (!financialProfile || !amount || amount <= 0) return null;

    const disposable = financialProfile.disposableIncome;
    if (disposable <= 0) {
      return {
        hasProfile: true,
        monthlyIncome: financialProfile.monthlyIncome,
        monthlyExpenses: financialProfile.monthlyExpenses,
        disposableIncome: disposable,
        payFrequency: financialProfile.payFrequency,
        suggestions: null as any,
        recommended: null as any,
      };
    }

    const getInstallmentCount = (level: ComfortLevel): number => {
      if (amount <= 100) return level === 'comfortable' ? 4 : level === 'balanced' ? 2 : 1;
      if (amount <= 300) return level === 'comfortable' ? 6 : level === 'balanced' ? 4 : 2;
      if (amount <= 500) return level === 'comfortable' ? 8 : level === 'balanced' ? 4 : 2;
      if (amount <= 1000) return level === 'comfortable' ? 10 : level === 'balanced' ? 6 : 3;
      if (amount <= 2000) return level === 'comfortable' ? 12 : level === 'balanced' ? 8 : 4;

      const percentages = { comfortable: 0.15, balanced: 0.22, aggressive: 0.3 };
      const monthlyPayment = disposable * percentages[level];

      const multiplier = ({ weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 } as any)[financialProfile.payFrequency];
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

      const multiplier = ({ weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 } as any)[financialProfile.payFrequency];
      const weeksPerPayment =
        financialProfile.payFrequency === 'weekly' ? 1 : financialProfile.payFrequency === 'biweekly' ? 2 : 4;

      const monthlyEquivalent = paymentAmount * multiplier;
      const percentOfDisposable = Math.round((monthlyEquivalent / disposable) * 100);

      return {
        amount: paymentAmount,
        frequency: financialProfile.payFrequency,
        percentOfDisposable: Math.min(percentOfDisposable, 100),
        numberOfPayments,
        weeksToPayoff: numberOfPayments * weeksPerPayment,
        totalRepayment: paymentAmount * numberOfPayments,
        description:
          level === 'comfortable' ? 'Easy on your budget' : level === 'balanced' ? 'Recommended' : 'Fastest payoff',
      };
    };

    return {
      hasProfile: true,
      monthlyIncome: financialProfile.monthlyIncome,
      monthlyExpenses: financialProfile.monthlyExpenses,
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

  useEffect(() => {
    if (incomeBasedSchedule && incomeBasedSchedule.suggestions && useSmartSchedule && financialProfile) {
      const suggestion = incomeBasedSchedule.suggestions[selectedComfortLevel];
      if (suggestion) {
        setValue('repaymentFrequency', suggestion.frequency as any);
        setValue('totalInstallments', suggestion.numberOfPayments);
      }
    }
  }, [incomeBasedSchedule, useSmartSchedule, selectedComfortLevel, setValue, financialProfile]);

  useEffect(() => {
    const fetchBorrowingLimits = async () => {
      try {
        const personalResponse = await fetch('/api/borrower/eligibility?lender_type=personal');
        if (personalResponse.ok) setBorrowingLimit(await personalResponse.json());

        const businessResponse = await fetch('/api/borrower/eligibility?lender_type=business');
        if (businessResponse.ok) setBusinessEligibility(await businessResponse.json());
      } catch (error) {
        console.error('Failed to fetch borrowing limit:', error);
      } finally {
        setLoadingLimit(false);
      }
    };

    fetchBorrowingLimits();
  }, []);

  useEffect(() => {
    const fetchFinancialProfile = async () => {
      try {
        const response = await fetch('/api/financial-profile');
        if (response.ok) {
          const data = await response.json();
          if (data && data.pay_amount > 0) {
            setFinancialProfile({
              payFrequency: data.pay_frequency as PayFrequency,
              payAmount: parseFloat(data.pay_amount) || 0,
              monthlyIncome: parseFloat(data.monthly_income) || 0,
              monthlyExpenses: parseFloat(data.monthly_expenses) || 0,
              disposableIncome: parseFloat(data.disposable_income) || 0,
              comfortLevel: (data.comfort_level || 'balanced') as ComfortLevel,
            });
            setSelectedComfortLevel((data.comfort_level || 'balanced') as ComfortLevel);
          }
        }
      } catch (error) {
        console.error('Failed to fetch financial profile:', error);
      } finally {
        setLoadingFinancialProfile(false);
      }
    };

    fetchFinancialProfile();
  }, []);

  useEffect(() => {
    const fetchLoanTypes = async () => {
      setLoadingLoanTypes(true);
      try {
        const response = await fetch('/api/loan-types');
        if (response.ok) {
          const data = await response.json();
          setLoanTypes(data.loanTypes || []);
        }
      } catch (error) {
        console.error('Failed to fetch loan types:', error);
      } finally {
        setLoadingLoanTypes(false);
      }
    };

    fetchLoanTypes();
  }, []);

  useEffect(() => {
    if (lenderType) setValue('lenderType', lenderType);
    if (preferredLender) setValue('businessId', preferredLender.id);
  }, [lenderType, preferredLender, setValue]);

  useEffect(() => {
    if (selectedBusinessId) {
      const business = businesses.find((b) => b.id === selectedBusinessId);
      if (business) {
        setSelectedBusiness(business);
        setValue('interestRate', business.default_interest_rate || 0);
        setValue('interestType', business.interest_type || 'simple');
      }
    }
  }, [selectedBusinessId, businesses, setValue]);

  useEffect(() => {
    const fetchBusinessTrust = async () => {
      if (!selectedBusiness?.id) {
        setBusinessTrust(null);
        return;
      }

      setLoadingTrust(true);
      try {
        const response = await fetch(`/api/borrower/trust?business_id=${selectedBusiness.id}`);
        if (response.ok) setBusinessTrust(await response.json());
      } catch (error) {
        console.error('Failed to fetch business trust:', error);
      } finally {
        setLoadingTrust(false);
      }
    };

    if (lenderType === 'business' && selectedBusiness) fetchBusinessTrust();
  }, [selectedBusiness, lenderType]);

  const isAmountOverLimit =
    lenderType === 'personal' &&
    borrowingLimit &&
    borrowingLimit.borrowingTier &&
    borrowingLimit.borrowingTier < 6 &&
    borrowingLimit.availableAmount != null &&
    amount > borrowingLimit.availableAmount;

  const validateStep1 = (): boolean => {
    if (!userBankConnected) {
      setStepError('Please connect your Bank account first');
      return false;
    }
    if (!lenderType) {
      setStepError('Please select a lender type');
      return false;
    }
    if (lenderType === 'personal' && borrowingLimit && !borrowingLimit.canBorrow) {
      setStepError(borrowingLimit.reason);
      return false;
    }
    if (lenderType === 'business' && businessEligibility && !businessEligibility.canBorrow) {
      setStepError(businessEligibility.reason || 'Unable to borrow from business lenders at this time');
      return false;
    }
    return true;
  };

  const validateStep2 = (): boolean => {
    if (lenderType === 'business') return true;

    const email = getValues('inviteEmail');
    const phone = getValues('invitePhone');
    const username = getValues('inviteUsername');

    if (!email && !phone && !username) {
      setStepError('Please enter a username, email address, or phone number');
      return false;
    }
    if (email && !email.includes('@')) {
      setStepError('Please enter a valid email address');
      return false;
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const values = getValues();
    if (!values.amount || values.amount < 1) {
      setStepError('Please enter a valid loan amount');
      return false;
    }

    if (lenderType === 'personal' && borrowingLimit && borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6) {
      if (borrowingLimit.availableAmount != null && values.amount > borrowingLimit.availableAmount) {
        if ((borrowingLimit.availableAmount || 0) <= 0) {
          setStepError(
            `You've reached your borrowing limit of ${formatCurrency(borrowingLimit.maxAmount || 0)}. Pay off existing loans to borrow more.`
          );
        } else {
          setStepError(`Amount exceeds your available limit. You can borrow up to ${formatCurrency(borrowingLimit.availableAmount)}.`);
        }
        return false;
      }
      if (borrowingLimit.maxAmount != null && values.amount > borrowingLimit.maxAmount) {
        setStepError(
          `Amount exceeds your tier limit of ${formatCurrency(borrowingLimit.maxAmount)}. Complete more loans to increase your limit.`
        );
        return false;
      }
    }

    if (lenderType === 'business' && selectedBusiness && businessTrust) {
      if (!businessTrust.canBorrow) {
        setStepError(businessTrust.reason || 'You are not eligible to borrow from this business');
        return false;
      }
      if (values.amount > businessTrust.maxAmount) {
        if (businessTrust.isGraduated) {
          setStepError(`Amount exceeds the maximum of ${formatCurrency(businessTrust.maxAmount)} for this lender.`);
        } else {
          setStepError(
            `As a new borrower with ${selectedBusiness.business_name}, you can borrow up to ${formatCurrency(
              businessTrust.maxAmount
            )}. Complete ${businessTrust.loansUntilGraduation} more loan(s) to unlock up to ${formatCurrency(businessTrust.standardMaxAmount)}.`
          );
        }
        return false;
      }
    }

    if (lenderType === 'business' && !selectedBusiness && businessEligibility?.maxAvailableFromBusinesses != null) {
      if (values.amount > businessEligibility.maxAvailableFromBusinesses) {
        setStepError(
          `No business lenders currently support ${formatCurrency(values.amount)}. Try ${formatCurrency(
            businessEligibility.maxAvailableFromBusinesses
          )} or less.`
        );
        return false;
      }
    }

    if (!values.totalInstallments || values.totalInstallments < 1) {
      setStepError('Please enter the number of installments');
      return false;
    }
    if (!values.startDate) {
      setStepError('Please select a start date');
      return false;
    }
    return true;
  };

  const validateStep4 = (): boolean => {
    if (userBankConnected) return true;

    if (!disbursementData.disbursement_method) {
      setStepError('Please select how you want to receive the money');
      return false;
    }
    setStepError('Please connect your bank account in Settings, or select a disbursement method');
    return false;
  };

  const validateStep5 = (): boolean => {
    if (!agreementAccepted) {
      setStepError('Please accept the loan agreement to proceed');
      return false;
    }
    return true;
  };

  const goToNextStep = (nextStep: number) => {
    setStepError(null);

    let isValid = true;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();
    else if (step === 4) isValid = validateStep4();
    else if (step === 5) isValid = validateStep5();

    if (isValid) setStep(nextStep);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep5()) return;

    const data = getValues();

    if (!data.lenderType && lenderType) data.lenderType = lenderType;
    if (!data.lenderType) {
      setSubmitError('Please select a lender type (Business or Personal)');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const tm = calculateLoanTermMonths(data.totalInstallments, data.repaymentFrequency);
      const ti = calculateTotalInterest(data.amount, data.interestRate || 0, tm, data.interestType || 'simple');
      const ta = data.amount + ti;
      data.repaymentAmount = ta / data.totalInstallments;

      // Bank-only flow
      data.disbursementMethod = 'bank_transfer';
      data.isForRecipient = false;
      data.agreementSigned = true;

      await onSubmit(data);
    } catch (error: any) {
      console.error('Submit error:', error);
      setSubmitError(error.message || 'Failed to submit loan request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const frequencyOptions = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Every 2 weeks' },
    { value: 'monthly', label: 'Monthly' },
    { value: 'custom', label: 'Custom' },
  ];

  const currencyOptions = [
    { value: 'USD', label: 'USD ($)' },
    { value: 'EUR', label: 'EUR (€)' },
    { value: 'GBP', label: 'GBP (£)' },
    { value: 'NGN', label: 'NGN (₦)' },
    { value: 'GHS', label: 'GHS (₵)' },
    { value: 'KES', label: 'KES (KSh)' },
  ];

  const canProceedStep2 = () => (lenderType === 'business' ? true : !!(inviteEmail || invitePhone || inviteUsername));
  const canProceedStep3 = () => amount > 0 && totalInstallments > 0 && !!startDate;

  const searchUsername = useCallback(
    async (username: string) => {
      const cleanUsername = username.replace(/^~/, '').toLowerCase().trim();
      if (!cleanUsername || cleanUsername.length < 3) {
        setUsernameFound(null);
        setUsernameError(null);
        setValue('inviteUsername', '');
        return;
      }

      setUsernameSearching(true);
      setUsernameError(null);

      try {
        const res = await fetch(`/api/user/username?username=${encodeURIComponent(cleanUsername)}`);
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
      } catch (error) {
        setUsernameError('Failed to search');
        setUsernameFound(null);
        setValue('inviteUsername', '');
      } finally {
        setUsernameSearching(false);
      }
    },
    [setValue]
  );

  const totalSteps = 5;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <Stepper step={step} totalSteps={totalSteps} />

      {(stepError || submitError) ? (
        <Banner tone="danger" icon={AlertCircle} title="Please fix this before continuing">
          {stepError || submitError}
        </Banner>
      ) : null}

      {/* STEP 1 */}
      {step === 1 && (
        <div className="space-y-6">
          {!userBankConnected ? (
            <Banner
              tone="warning"
              icon={CreditCard}
              title="Connect your bank first"
              actions={
                <Button type="button" onClick={onConnectBank} size="sm" className="rounded-xl">
                  <CreditCard className="w-4 h-4 mr-2" />
                  Connect bank
                </Button>
              }
            >
              Bank connection is required before requesting a loan.
            </Banner>
          ) : (
            <Banner tone="success" icon={Check} title="Bank connected">
              You’re ready to continue.
            </Banner>
          )}

          {userBankConnected && !loadingLimit ? (
            <>
              {!lenderType || lenderType === 'personal' ? (
                borrowingLimit ? (
                  <Card className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800 shadow-sm">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-neutral-900/40 border border-black/5 dark:border-white/10 grid place-items-center">
                          <Star className="w-5 h-5 text-primary-600 dark:text-primary-300" />
                        </div>
                        <div>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Personal lending tier</p>
                          <p className="font-semibold text-neutral-900 dark:text-white">{borrowingLimit.tierName || 'Starter'}</p>
                        </div>
                      </div>

                      {!borrowingLimit.canBorrow ? (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-200">
                          <Lock className="w-3 h-3" />
                          Limited
                        </span>
                      ) : null}
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                      {borrowingLimit.borrowingTier === 6 ? (
                        <div className="text-center">
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrowing limit</p>
                          <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">Unlimited ✨</p>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-neutral-500 dark:text-neutral-400">Available to borrow</span>
                            <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                              {formatCurrency(borrowingLimit.availableAmount || 0)}
                            </span>
                          </div>
                          <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 transition-all"
                              style={{
                                width: `${borrowingLimit.maxAmount ? ((borrowingLimit.availableAmount || 0) / borrowingLimit.maxAmount) * 100 : 0}%`,
                              }}
                            />
                          </div>
                          <div className="flex justify-between text-xs text-neutral-400 mt-1">
                            <span>Outstanding: {formatCurrency(borrowingLimit.totalOutstanding)}</span>
                            <span>Tier max: {formatCurrency(borrowingLimit.maxAmount || 0)}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {!borrowingLimit.canBorrow && borrowingLimit.reason ? (
                      <div className="mt-3 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-900/15 p-3 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <p className="text-sm text-red-700 dark:text-red-200">{borrowingLimit.reason}</p>
                      </div>
                    ) : null}

                    {borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6 && (borrowingLimit.loansNeededToUpgrade ?? 0) > 0 ? (
                      <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">
                          <TrendingUp className="w-4 h-4 inline mr-1 text-green-600" />
                          {borrowingLimit.loansNeededToUpgrade} more loan{(borrowingLimit.loansNeededToUpgrade ?? 0) > 1 ? 's' : ''} to unlock{' '}
                          {formatCurrency(borrowingLimit.nextTierAmount || 0)}
                        </p>
                      </div>
                    ) : null}
                  </Card>
                ) : null
              ) : null}

              {lenderType === 'business' && businessEligibility ? (
                <Card className="rounded-2xl border border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-neutral-800 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-neutral-900/40 border border-black/5 dark:border-white/10 grid place-items-center">
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-300" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Business lender matching</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {businessEligibility.isFirstTimeBorrower ? 'First-time borrower' : 'Returning borrower'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700 text-center">
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">Maximum available from lenders</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {businessEligibility.maxAvailableFromBusinesses ? formatCurrency(businessEligibility.maxAvailableFromBusinesses) : 'No lenders available'}
                    </p>
                  </div>

                  {businessEligibility.message ? (
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{businessEligibility.message}</p>
                  ) : null}
                </Card>
              ) : null}
            </>
          ) : null}

          <SectionHeader title="Who do you want to borrow from?" subtitle="Choose your lender type to get started" />

          <div className="grid md:grid-cols-2 gap-4">
            <Card
              hover
              className={[
                'cursor-pointer transition-all rounded-2xl',
                lenderType === 'business' ? 'ring-2 ring-primary-500 border-primary-500' : '',
                !userBankConnected || userVerificationStatus !== 'verified' ? 'opacity-50 pointer-events-none' : '',
              ].join(' ')}
              onClick={() => {
                if (userBankConnected && userVerificationStatus === 'verified') {
                  setLenderType('business');
                  setValue('lenderType', 'business');
                  setStepError(null);
                }
              }}
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 dark:from-primary-900/30 to-yellow-100 dark:to-yellow-900/30 rounded-2xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                </div>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Business lender</h3>
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">We’ll match you with an available lender</p>
                {userVerificationStatus !== 'verified' ? (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Requires verification
                  </p>
                ) : null}
              </div>
            </Card>

            <Card
              hover
              className={[
                'cursor-pointer transition-all rounded-2xl',
                lenderType === 'personal' ? 'ring-2 ring-primary-500 border-primary-500' : '',
                !userBankConnected ? 'opacity-50 pointer-events-none' : '',
              ].join(' ')}
              onClick={() => {
                if (userBankConnected) {
                  setLenderType('personal');
                  setValue('lenderType', 'personal');
                  setValue('interestRate', 0);
                  setStepError(null);
                }
              }}
            >
              <div className="text-center py-6">
                <div className="w-16 h-16 mx-auto mb-4 bg-accent-100 dark:bg-accent-900/30 rounded-2xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-accent-600 dark:text-accent-400" />
                </div>
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-2">Friend or family</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Invite someone you know</p>
              </div>
            </Card>
          </div>

          {userBankConnected && userVerificationStatus !== 'verified' ? (
            <Banner
              tone="warning"
              icon={Shield}
              title="Verification required for business loans"
              actions={
                userVerificationStatus !== 'submitted' && onStartVerification ? (
                  <Button type="button" size="sm" className="rounded-xl" onClick={onStartVerification}>
                    <Shield className="w-4 h-4 mr-2" />
                    Start verification
                  </Button>
                ) : null
              }
            >
              {userVerificationStatus === 'submitted'
                ? 'Your verification is being reviewed. You can still borrow from friends and family.'
                : 'Complete verification to borrow from registered businesses.'}
            </Banner>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => goToNextStep(2)} disabled={!lenderType || !userBankConnected} className="rounded-xl">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <div className="space-y-4">
          <BackButton onClick={() => { setStep(1); setStepError(null); }} />

          {lenderType === 'business' ? (
            <>
              <SectionHeader title="Auto-match enabled" subtitle="We’ll find the best lender automatically." />

              <Card className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 dark:from-primary-900/10 to-yellow-50 dark:to-yellow-900/10">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 dark:from-primary-900/30 to-yellow-100 dark:to-yellow-900/30 rounded-full flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <p className="font-semibold text-neutral-900 dark:text-white">How it works</p>

                  <div className="text-left max-w-md mx-auto space-y-3 mt-4">
                    {[
                      'You submit your request with your terms.',
                      'We match you with lenders that fit.',
                      'A lender funds it (instantly or within ~24h).',
                    ].map((t, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-800 dark:text-primary-200">
                          {i + 1}
                        </div>
                        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {loanTypes.length > 0 ? (
                <div className="pt-2">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-neutral-900 dark:text-white">Loan type (optional)</p>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">
                        Helps matching. You can skip this.
                      </p>
                    </div>
                    {loadingLoanTypes ? <Loader2 className="w-4 h-4 animate-spin text-neutral-400" /> : null}
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3">
                    {loanTypes.map((loanType) => (
                      <button
                        key={loanType.id}
                        type="button"
                        onClick={() => {
                          const next = selectedLoanTypeId === loanType.id ? null : loanType.id;
                          setSelectedLoanTypeId(next);
                          setValue('loanTypeId', next || undefined);
                        }}
                        className={[
                          'p-3 rounded-xl border-2 text-left transition-all',
                          selectedLoanTypeId === loanType.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
                        ].join(' ')}
                      >
                        <p className="font-medium text-sm text-neutral-900 dark:text-white">{loanType.name}</p>
                        {loanType.description ? (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{loanType.description}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <SectionHeader title="Invite your lender" subtitle="Search by username, or invite by email/phone." />

              <Card className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  <AtSign className="w-4 h-4 inline mr-1" />
                  Feyza username
                </label>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-500 dark:text-primary-400 font-medium">~</span>
                    <input
                      type="text"
                      value={usernameSearch}
                      onChange={(e) => {
                        setUsernameSearch(e.target.value);
                        setUsernameError(null);
                        setUsernameFound(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          searchUsername(usernameSearch);
                        }
                      }}
                      placeholder="username"
                      className="w-full pl-8 pr-4 py-2.5 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-white"
                    />
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => searchUsername(usernameSearch)}
                    disabled={usernameSearching || !usernameSearch}
                    className="rounded-xl"
                  >
                    {usernameSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>

                {usernameFound ? (
                  <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-800 dark:text-green-300">~{usernameFound.username}</p>
                      <p className="text-sm text-green-700 dark:text-green-400">{usernameFound.displayName}</p>
                    </div>
                  </div>
                ) : null}

                {usernameError ? (
                  <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <p className="text-sm text-red-700 dark:text-red-300">{usernameError}</p>
                  </div>
                ) : null}
              </Card>

              <div className="flex items-center gap-4 py-1">
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
                <span className="text-sm text-neutral-400 font-medium">or</span>
                <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700" />
              </div>

              <Input
                label="Email address"
                type="email"
                placeholder="friend@example.com"
                {...register('inviteEmail')}
                onChange={(e) => {
                  setValue('inviteEmail', e.target.value);
                  setStepError(null);
                }}
              />

              <div className="text-center text-sm text-neutral-400 dark:text-neutral-500">or</div>

              <Input
                label="Phone number"
                type="tel"
                placeholder="+1 234 567 8900"
                {...register('invitePhone')}
                onChange={(e) => {
                  setValue('invitePhone', e.target.value);
                  setStepError(null);
                }}
              />

              <input type="hidden" {...register('inviteUsername')} />

              <Banner tone="info" icon={Info} title="Interest rate set by lender">
                Your friend or family member sets the interest rate (if any) when they accept your request.
              </Banner>
            </>
          )}

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => goToNextStep(3)} disabled={!canProceedStep2()} className="rounded-xl">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <div className="space-y-4">
          <BackButton onClick={() => { setStep(2); setStepError(null); }} />

          <SectionHeader title="Loan details" subtitle="Set amount and repayment terms." />

          {lenderType === 'business' && selectedBusiness && (selectedBusiness as any).default_interest_rate > 0 ? (
            <Banner tone="info" icon={Info} title="Business lender pricing">
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-200">
                  {selectedBusiness.business_name} charges {formatPercentage((selectedBusiness as any).default_interest_rate)} APR
                </p>
                <p className="text-blue-700 dark:text-blue-300">
                  Interest type: {(selectedBusiness as any).interest_type === 'compound' ? 'Compound' : 'Simple'}
                </p>
              </div>
            </Banner>
          ) : null}
          {lenderType === 'business' && selectedBusiness && (loadingTrust ? (
            <Banner tone="neutral" icon={Loader2} title="Checking trust level…">
              Please wait.
            </Banner>
          ) : businessTrust ? (
            <Card
              className={[
                'rounded-2xl border-2 shadow-sm',
                businessTrust.isGraduated
                  ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-white dark:to-neutral-800'
                  : 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-white dark:to-neutral-800',
              ].join(' ')}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={[
                    'w-10 h-10 rounded-xl flex items-center justify-center',
                    businessTrust.isGraduated ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30',
                  ].join(' ')}
                >
                  {businessTrust.isGraduated ? (
                    <Star className="w-5 h-5 text-green-600 dark:text-green-300" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-300" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Trust level with {selectedBusiness.business_name}</p>
                  <p className={['font-semibold', businessTrust.isGraduated ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'].join(' ')}>
                    {businessTrust.isGraduated ? 'Graduated borrower' : 'New borrower'}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Maximum loan amount</span>
                  <span className={['text-lg font-bold', businessTrust.isGraduated ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'].join(' ')}>
                    {formatCurrency(businessTrust.maxAmount)}
                  </span>
                </div>

                {!businessTrust.isGraduated ? (
                  <>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
                      <div className="h-full bg-amber-500 transition-all" style={{ width: `${(businessTrust.completedLoans / 3) * 100}%` }} />
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{businessTrust.completedLoans}/3 loans completed</span>
                      <span>Unlocks {formatCurrency(businessTrust.standardMaxAmount)}</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Complete {businessTrust.loansUntilGraduation} more loan(s) at {formatCurrency(businessTrust.firstTimeAmount)} to unlock higher amounts
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    <Check className="w-3 h-3 inline mr-1" />
                    You can borrow up to the lender’s max amount.
                  </p>
                )}
              </div>

              {!businessTrust.canBorrow && businessTrust.reason ? (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
                  <p className="text-sm text-red-700 dark:text-red-300">{businessTrust.reason}</p>
                </div>
              ) : null}
            </Card>
          ) : null)}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Principal amount *"
                type="number"
                placeholder="1000"
                min="1"
                max={
                  lenderType === 'personal' && borrowingLimit?.borrowingTier !== 6
                    ? borrowingLimit?.availableAmount || undefined
                    : lenderType === 'business' && selectedBusiness && businessTrust
                      ? businessTrust.maxAmount
                      : undefined
                }
                {...register('amount', { valueAsNumber: true })}
              />

              {lenderType === 'personal' && borrowingLimit && borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6 ? (
                <p className={['text-xs mt-1', isAmountOverLimit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-500 dark:text-neutral-400'].join(' ')}>
                  {isAmountOverLimit ? (
                    <>
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Exceeds your limit. Max: {formatCurrency(borrowingLimit.availableAmount || 0)}
                    </>
                  ) : (
                    <>Available: {formatCurrency(borrowingLimit.availableAmount || 0)}</>
                  )}
                </p>
              ) : null}

              {lenderType === 'business' && selectedBusiness && businessTrust ? (
                <p
                  className={[
                    'text-xs mt-1',
                    amount > businessTrust.maxAmount
                      ? 'text-red-600 dark:text-red-400 font-medium'
                      : businessTrust.isGraduated
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-amber-600 dark:text-amber-400',
                  ].join(' ')}
                >
                  {amount > businessTrust.maxAmount ? (
                    <>
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Exceeds your limit. Max: {formatCurrency(businessTrust.maxAmount)}
                    </>
                  ) : businessTrust.isGraduated ? (
                    <>
                      <Star className="w-3 h-3 inline mr-1" />
                      Graduated: up to {formatCurrency(businessTrust.maxAmount)}
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 inline mr-1" />
                      New borrower limit: {formatCurrency(businessTrust.maxAmount)}
                    </>
                  )}
                </p>
              ) : null}

              {lenderType === 'business' && !selectedBusiness && businessEligibility?.maxAvailableFromBusinesses != null ? (
                <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                  <Info className="w-3 h-3 inline mr-1" />
                  Max available from lenders: {formatCurrency(businessEligibility.maxAvailableFromBusinesses || 0)}
                </p>
              ) : null}
            </div>

            <Select label="Currency *" options={currencyOptions} {...register('currency')} />
          </div>

          <Input label="Purpose (optional)" placeholder="e.g., supplies, emergency…" {...register('purpose')} />

          {/* Repayment schedule */}
          {amount > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Repayment schedule *</label>
                <button
                  type="button"
                  onClick={() => setUseSmartSchedule(!useSmartSchedule)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                >
                  {useSmartSchedule ? (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Custom
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Suggestions
                    </>
                  )}
                </button>
              </div>

              {useSmartSchedule ? (
                <>
                  {financialProfile && incomeBasedSchedule && incomeBasedSchedule.disposableIncome > 0 && incomeBasedSchedule.suggestions ? (
                    <div className="space-y-4">
                      <Banner tone="success" icon={Sparkles} title="Personalized to your budget">
                        Disposable income: {formatCurrency(incomeBasedSchedule.disposableIncome)}/month
                      </Banner>

                      <div className="grid gap-3">
                        {(['comfortable', 'balanced', 'aggressive'] as ComfortLevel[]).map((level) => {
                          const suggestion = incomeBasedSchedule.suggestions[level];
                          const isSelected = selectedComfortLevel === level;
                          const frequencyLabel =
                            suggestion.frequency === 'weekly'
                              ? 'weekly'
                              : suggestion.frequency === 'biweekly'
                                ? 'bi-weekly'
                                : suggestion.frequency === 'semimonthly'
                                  ? 'semi-monthly'
                                  : 'monthly';

                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setSelectedComfortLevel(level)}
                              className={[
                                'w-full p-4 rounded-2xl border-2 text-left transition-all',
                                isSelected
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={[
                                      'w-10 h-10 rounded-xl grid place-items-center',
                                      isSelected ? 'bg-green-100 dark:bg-green-800' : 'bg-neutral-100 dark:bg-neutral-800',
                                    ].join(' ')}
                                  >
                                    {level === 'comfortable' && (
                                      <Shield className={['w-5 h-5', isSelected ? 'text-green-600 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'].join(' ')} />
                                    )}
                                    {level === 'balanced' && (
                                      <Star className={['w-5 h-5', isSelected ? 'text-green-600 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'].join(' ')} />
                                    )}
                                    {level === 'aggressive' && (
                                      <Zap className={['w-5 h-5', isSelected ? 'text-green-600 dark:text-green-300' : 'text-neutral-500 dark:text-neutral-400'].join(' ')} />
                                    )}
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-neutral-900 dark:text-white capitalize">{level}</p>
                                      {level === 'balanced' ? (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                          Recommended
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      {suggestion.numberOfPayments} {frequencyLabel} payments • {suggestion.percentOfDisposable}% of disposable
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="font-bold text-neutral-900 dark:text-white">{formatCurrency(suggestion.amount)}</p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">~{suggestion.weeksToPayoff} weeks</p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-xl flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                        <Wallet className="w-4 h-4" />
                        <span>
                          You’ll pay {formatCurrency(incomeBasedSchedule.suggestions[selectedComfortLevel].amount)}{' '}
                          {formatPayFrequency(incomeBasedSchedule.payFrequency).toLowerCase()} for{' '}
                          {incomeBasedSchedule.suggestions[selectedComfortLevel].numberOfPayments} payments
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {financialProfile && financialProfile.disposableIncome <= 0 ? (
                        <Banner tone="warning" icon={AlertTriangle} title="Budget warning">
                          Your expenses match or exceed your income. Consider updating your income profile before borrowing.
                        </Banner>
                      ) : null}

                      {!loadingFinancialProfile && !financialProfile ? (
                        <Banner tone="info" icon={Info} title="Want personalized suggestions?">
                          Set up your income profile to get repayment options tailored to your budget.
                        </Banner>
                      ) : null}

                      {repaymentPresets.length > 0 ? (
                        <div className="grid gap-3">
                          {repaymentPresets.map((preset, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedPresetIndex(index)}
                              className={[
                                'w-full p-4 rounded-2xl border-2 text-left transition-all',
                                selectedPresetIndex === index
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600',
                              ].join(' ')}
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={[
                                      'w-10 h-10 rounded-xl grid place-items-center',
                                      selectedPresetIndex === index ? 'bg-primary-100 dark:bg-primary-900' : 'bg-neutral-100 dark:bg-neutral-800',
                                    ].join(' ')}
                                  >
                                    <CalendarIcon
                                      className={[
                                        'w-5 h-5',
                                        selectedPresetIndex === index
                                          ? 'text-primary-600 dark:text-primary-300'
                                          : 'text-neutral-500 dark:text-neutral-400',
                                      ].join(' ')}
                                    />
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-neutral-900 dark:text-white">{preset.label}</p>
                                      {preset.recommended ? (
                                        <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                                          Recommended
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      {preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'} payments
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right">
                                  <p className="font-bold text-neutral-900 dark:text-white">{formatCurrency(preset.paymentAmount)}</p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">per payment</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center text-neutral-500 dark:text-neutral-400">
                          Enter a loan amount to see options
                        </div>
                      )}

                      {selectedPreset ? (
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-xl flex items-center gap-2 text-primary-700 dark:text-primary-300 text-sm">
                          <Clock className="w-4 h-4" />
                          <span>
                            You’ll pay {formatCurrency(selectedPreset.paymentAmount)} {selectedPreset.frequency} for {selectedPreset.installments}{' '}
                            {selectedPreset.installments === 1 ? 'payment' : 'payments'}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  )}
                </>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <Select label="Repayment frequency" options={frequencyOptions} {...register('repaymentFrequency')} />
                  <Input
                    label="Number of installments"
                    type="number"
                    placeholder="10"
                    min="1"
                    {...register('totalInstallments', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Select label="Repayment frequency *" options={frequencyOptions} {...register('repaymentFrequency')} />
              <Input
                label="Number of installments *"
                type="number"
                placeholder="10"
                min="1"
                {...register('totalInstallments', { valueAsNumber: true })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">Start date *</label>
            <CalendarPicker selectedDate={selectedStartDate} onDateSelect={setSelectedStartDate} minDate={new Date()} placeholder="Select start date" />
          </div>

          {amount > 0 && totalInstallments > 0 ? (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-2xl space-y-2">
              <p className="font-semibold text-neutral-900 dark:text-white">Loan summary</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Principal</span>
                <span className="text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(amount)}</span>

                {interestRate > 0 ? (
                  <>
                    <span className="text-neutral-500 dark:text-neutral-400">Interest rate</span>
                    <span className="text-right font-medium text-neutral-900 dark:text-white">{formatPercentage(interestRate)} APR</span>

                    <span className="text-neutral-500 dark:text-neutral-400">Total interest</span>
                    <span className="text-right font-medium text-orange-600 dark:text-orange-400">{formatCurrency(totalInterest)}</span>
                  </>
                ) : null}

                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Total to repay</span>
                <span className="text-right font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalAmount)}</span>

                <span className="text-neutral-500 dark:text-neutral-400">Per installment</span>
                <span className="text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(repaymentAmount)}</span>
              </div>
            </div>
          ) : null}

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => goToNextStep(4)} disabled={!canProceedStep3()} className="rounded-xl">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <div className="space-y-4">
          <BackButton onClick={() => { setStep(3); setStepError(null); }} />

          <SectionHeader title="How you’ll receive funds" subtitle="Bank transfer only for now." />

          <Banner tone="success" icon={Building2} title="Bank transfer">
            {userBankName ? (
              <>Funds will be sent to your {userBankName} account (••••{userBankAccountMask || '—'}).</>
            ) : (
              <>Funds will be sent to your connected bank account.</>
            )}
          </Banner>

          <div className="flex justify-end pt-2">
            <Button type="button" onClick={() => goToNextStep(5)} className="rounded-xl">
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <BackButton onClick={() => { setStep(4); setStepError(null); setSubmitError(null); }} />

          <SectionHeader title="Review & sign" subtitle="Confirm the terms before submitting." />

          <Card className="rounded-2xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20">
            <p className="font-semibold text-primary-900 dark:text-primary-200 mb-3">Loan summary</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-primary-700 dark:text-primary-300">Principal</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-200">{formatCurrency(amount)}</span>

              <span className="text-primary-700 dark:text-primary-300">Total to repay</span>
              <span className="text-right font-bold text-primary-900 dark:text-primary-200">{formatCurrency(totalAmount)}</span>

              <span className="text-primary-700 dark:text-primary-300">Installments</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-200">
                {totalInstallments} × {formatCurrency(repaymentAmount)}
              </span>

              <span className="text-primary-700 dark:text-primary-300">Start date</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-200">
                {startDate ? new Date(startDate).toLocaleDateString() : '-'}
              </span>
            </div>
          </Card>

          <Card className="rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <p className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Loan agreement terms
              </p>
              <button
                type="button"
                onClick={() => setShowFullTerms(!showFullTerms)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {showFullTerms ? 'Hide' : 'Show'} full terms
              </button>
            </div>

            {showFullTerms ? (
              <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-3 max-h-64 overflow-y-auto mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                <p className="font-semibold text-neutral-900 dark:text-white">Loan Agreement Terms</p>

                <p>
                  <strong>1. Parties & Loan Details</strong>
                  <br />
                  This agreement is between the borrower (“Borrower”) and the lender (“Lender”). By accepting, Borrower agrees to receive a principal amount of {formatCurrency(amount)}.
                </p>

                <p>
                  <strong>2. Provisional Terms</strong>
                  <br />
                  Repayment terms may update once a lender is matched (business) or accepts the request (personal).
                </p>

                <p>
                  <strong>3. Repayment Schedule</strong>
                  <br />
                  Borrower agrees to repay in {totalInstallments} installment(s) of {formatCurrency(repaymentAmount)} each on the schedule shown.
                </p>

                <p>
                  <strong>4. Late Payments</strong>
                  <br />
                  Late payments can impact eligibility and trust. Borrower should communicate early if a payment will be late.
                </p>

                <p>
                  <strong>5. Platform Role</strong>
                  <br />
                  Feyza provides tools for matching and tracking; Feyza is not the lender unless explicitly stated.
                </p>

                <p>
                  <strong>6. Electronic Consent</strong>
                  <br />
                  By clicking “Sign & Submit”, Borrower consents to electronic records and signatures.
                </p>

                <p className="text-xs text-neutral-500 dark:text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  This is a general template and may not cover all legal requirements in every jurisdiction.
                </p>
              </div>
            ) : null}

            <Banner tone="warning" icon={AlertTriangle} title="Legally binding">
              By signing, you agree to repay according to the terms shown.
            </Banner>

            <label className="flex items-start gap-3 cursor-pointer mt-4">
              <input
                type="checkbox"
                checked={agreementAccepted}
                onChange={(e) => {
                  setAgreementAccepted(e.target.checked);
                  setStepError(null);
                }}
                className="mt-1 w-4 h-4 text-primary-600 dark:text-primary-400 rounded border-neutral-300 dark:border-neutral-600 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800"
              />
              <span className="text-sm text-neutral-700 dark:text-neutral-300">
                I have read, understood, and agree to the loan agreement terms.
              </span>
            </label>
          </Card>

          <div className="flex justify-end pt-2">
            <Button type="submit" loading={isSubmitting} disabled={!agreementAccepted} className="rounded-xl">
              <FileText className="w-4 h-4 mr-2" />
              Sign & submit request
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}
