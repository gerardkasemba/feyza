'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Input, Select, Card, Calendar as CalendarPicker, Alert } from '@/components/ui';
import { BusinessProfile, DisbursementMethod } from '@/types';
import { formatCurrency, formatPercentage, calculateTotalInterest, calculateLoanTermMonths } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import { 
  getRepaymentPresets, 
  validateRepaymentSchedule, 
  RepaymentPreset,
  PayFrequency,
  ComfortLevel,
  formatPayFrequency,
} from '@/lib/smartSchedule';
import { DisbursementMethodForm } from './DisbursementMethodForm';
import { 
  Building2, Users, ChevronRight, ChevronLeft, MapPin, Percent, Info, 
  AlertCircle, FileText, CreditCard, Check, AlertTriangle, Shield,
  TrendingUp, Lock, Star, Zap, Calendar as CalendarIcon, Clock, Edit3, Search, AtSign, Loader2,
  Wallet, Sparkles
} from 'lucide-react';

// Full form data type
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
  // Disbursement
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
  // Recipient
  isForRecipient?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientCountry?: string;
  // Agreement
  agreementSigned?: boolean;
}

// Borrowing eligibility type
interface BorrowingEligibility {
  canBorrow: boolean;
  reason: string;
  lenderType?: 'business' | 'personal';
  isFirstTimeBorrower?: boolean;
  maxAvailableFromBusinesses?: number;
  message?: string;
  // Personal lending fields
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
  preferredLender?: BusinessProfile | null; // Direct lender from ?lender=slug
  userBankConnected: boolean;
  userVerificationStatus?: string; // pending, submitted, verified, rejected
  // User bank info
  userBankName?: string;
  userBankAccountMask?: string;
  onSubmit: (data: LoanRequestFormData) => Promise<void>;
  onConnectBank: () => void;
  onStartVerification?: () => void;
}

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
  // If there's a preferred lender from direct link, auto-select business type
  const [step, setStep] = useState(preferredLender ? 2 : 1);
  const [lenderType, setLenderType] = useState<'business' | 'personal' | null>(preferredLender ? 'business' : null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepError, setStepError] = useState<string | null>(null);
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessProfile | null>(preferredLender || null);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [showFullTerms, setShowFullTerms] = useState(false);
  
  // Borrowing limit state
  const [borrowingLimit, setBorrowingLimit] = useState<BorrowingEligibility | null>(null);
  const [businessEligibility, setBusinessEligibility] = useState<BorrowingEligibility | null>(null);
  const [loadingLimit, setLoadingLimit] = useState(true);
  
  // Trust level state for specific business (graduated trust system)
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

  // Loan types state
  const [loanTypes, setLoanTypes] = useState<Array<{
    id: string;
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    display_order: number;
  }>>([]);
  const [selectedLoanTypeId, setSelectedLoanTypeId] = useState<string | null>(null);
  const [loadingLoanTypes, setLoadingLoanTypes] = useState(false);
  
  // Disbursement state
  const [disbursementData, setDisbursementData] = useState<any>({
    disbursement_method: 'bank_transfer',
  });

  // Payment provider state (controlled by admin)
  const supabase = createClient();
  const [isDwollaEnabled, setIsDwollaEnabled] = useState(false);

  // Smart schedule state
  const [useSmartSchedule, setUseSmartSchedule] = useState(true);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number | null>(null);
  
  // Income-based smart schedule state
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

  const {
    register,
    setValue,
    watch,
    getValues,
  } = useForm<LoanRequestFormData>({
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

  // Calendar date state for proper control
  const [selectedStartDate, setSelectedStartDate] = useState<Date | null>(() => {
    if (startDate) {
      return new Date(startDate);
    }
    return null;
  });

  // Sync selectedStartDate with form
  useEffect(() => {
    if (selectedStartDate) {
      const formatted = selectedStartDate.toISOString().split('T')[0];
      setValue('startDate', formatted);
    }
  }, [selectedStartDate, setValue]);

  // Username search state
  const [usernameSearch, setUsernameSearch] = useState('');
  const [usernameSearching, setUsernameSearching] = useState(false);
  const [usernameFound, setUsernameFound] = useState<{ username: string; displayName: string } | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Calculate loan summary
  const termMonths = calculateLoanTermMonths(totalInstallments || 1, repaymentFrequency);
  const totalInterest = calculateTotalInterest(amount, interestRate, termMonths, interestType);
  const totalAmount = amount + totalInterest;
  const repaymentAmount = totalInstallments > 0 ? totalAmount / totalInstallments : 0;

  // Smart schedule presets based on amount
  const repaymentPresets = useMemo(() => {
    return getRepaymentPresets(amount);
  }, [amount]);

  // Income-based smart schedule suggestions (if user has financial profile)
// Replace lines 553-590 with:

// Income-based smart schedule suggestions (if user has financial profile)
const incomeBasedSchedule = useMemo(() => {
  if (!financialProfile || !amount || amount <= 0) return null;
  
  const disposable = financialProfile.disposableIncome;
  
  // If disposable income is <= 0, return object with that info so warning can show
  if (disposable <= 0) {
    return {
      hasProfile: true,
      monthlyIncome: financialProfile.monthlyIncome,
      monthlyExpenses: financialProfile.monthlyExpenses,
      disposableIncome: disposable,
      payFrequency: financialProfile.payFrequency,
      suggestions: null, // Can't calculate suggestions with no disposable income
      recommended: null,
    };
  }
  
  // For small to medium loans, use FIXED installment counts to ensure variety
  // This guarantees different payment amounts for each comfort level
  const getInstallmentCount = (level: ComfortLevel): number => {
    if (amount <= 100) {
      // $100 or less: 4, 2, 1 payments
      return level === 'comfortable' ? 4 : level === 'balanced' ? 2 : 1;
    } else if (amount <= 300) {
      // $101-300: 6, 4, 2 payments
      return level === 'comfortable' ? 6 : level === 'balanced' ? 4 : 2;
    } else if (amount <= 500) {
      // $301-500: 8, 4, 2 payments
      return level === 'comfortable' ? 8 : level === 'balanced' ? 4 : 2;
    } else if (amount <= 1000) {
      // $501-1000: 10, 6, 3 payments
      return level === 'comfortable' ? 10 : level === 'balanced' ? 6 : 3;
    } else if (amount <= 2000) {
      // $1001-2000: 12, 8, 4 payments
      return level === 'comfortable' ? 12 : level === 'balanced' ? 8 : 4;
    } else {
      // $2000+: Calculate based on income, with min/max bounds
      const percentages = { comfortable: 0.15, balanced: 0.22, aggressive: 0.30 };
      const monthlyPayment = disposable * percentages[level];
      const multiplier = { weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 }[financialProfile.payFrequency];
      const paymentAmount = Math.max(Math.round(monthlyPayment / multiplier), 50);
      let count = Math.ceil(amount / paymentAmount);
      // Clamp to reasonable range
      if (level === 'comfortable') count = Math.min(Math.max(count, 8), 24);
      else if (level === 'balanced') count = Math.min(Math.max(count, 4), 12);
      else count = Math.min(Math.max(count, 2), 6);
      return count;
    }
  };
  
  const calculateForLevel = (level: ComfortLevel) => {
    const numberOfPayments = getInstallmentCount(level);
    const paymentAmount = Math.ceil(amount / numberOfPayments);
    
    const multiplier = { weekly: 4.33, biweekly: 2.17, semimonthly: 2, monthly: 1 }[financialProfile.payFrequency];
    const weeksPerPayment = financialProfile.payFrequency === 'weekly' ? 1 : 
                            financialProfile.payFrequency === 'biweekly' ? 2 : 4;
    
    // Calculate what percentage of disposable income this represents
    const monthlyEquivalent = paymentAmount * multiplier;
    const percentOfDisposable = Math.round((monthlyEquivalent / disposable) * 100);
    
    return {
      amount: paymentAmount,
      frequency: financialProfile.payFrequency,
      percentOfDisposable: Math.min(percentOfDisposable, 100), // Cap at 100%
      numberOfPayments,
      weeksToPayoff: numberOfPayments * weeksPerPayment,
      totalRepayment: paymentAmount * numberOfPayments,
      description: level === 'comfortable' ? 'Easy on your budget' : 
                   level === 'balanced' ? 'Recommended' : 'Fastest payoff',
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

  const selectedPreset = selectedPresetIndex !== null ? repaymentPresets[selectedPresetIndex] : null;

  // When amount changes, reset preset selection
  useEffect(() => {
    setSelectedPresetIndex(null);
  }, [amount]);

  // When preset is selected (simple presets), update form values
  useEffect(() => {
    if (selectedPreset && useSmartSchedule && !financialProfile) {
      setValue('repaymentFrequency', selectedPreset.frequency);
      setValue('totalInstallments', selectedPreset.installments);
    }
  }, [selectedPreset, useSmartSchedule, setValue, financialProfile]);

  // When income-based schedule is selected, update form values
  useEffect(() => {
    if (incomeBasedSchedule && incomeBasedSchedule.suggestions && useSmartSchedule && financialProfile) {
      const suggestion = incomeBasedSchedule.suggestions[selectedComfortLevel];
      if (suggestion) {
        setValue('repaymentFrequency', suggestion.frequency as any);
        setValue('totalInstallments', suggestion.numberOfPayments);
      }
    }
  }, [incomeBasedSchedule, useSmartSchedule, selectedComfortLevel, setValue, financialProfile]);

  // Fetch borrowing limit on mount
  useEffect(() => {
    const fetchBorrowingLimits = async () => {
      try {
        // Fetch personal lending limits (tier-based)
        const personalResponse = await fetch('/api/borrower/eligibility?lender_type=personal');
        if (personalResponse.ok) {
          const data = await personalResponse.json();
          setBorrowingLimit(data);
        }
        
        // Fetch business lending limits (dynamic based on lender preferences)
        const businessResponse = await fetch('/api/borrower/eligibility?lender_type=business');
        if (businessResponse.ok) {
          const data = await businessResponse.json();
          setBusinessEligibility(data);
        }
      } catch (error) {
        console.error('Failed to fetch borrowing limit:', error);
      } finally {
        setLoadingLimit(false);
      }
    };

    fetchBorrowingLimits();
  }, []);

  // Fetch user's financial profile for income-based suggestions
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

  // Fetch loan types on mount
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

  // Check if Dwolla (ACH bank transfers) is enabled by admin
  useEffect(() => {
    const checkPaymentProviders = async () => {
      try {
        const { data: providers } = await supabase
          .from('payment_providers')
          .select('slug')
          .eq('is_enabled', true);
        
        const dwollaEnabled = (providers || []).some(p => p.slug === 'dwolla');
        setIsDwollaEnabled(dwollaEnabled);
      } catch (err) {
        console.error('Failed to check payment providers:', err);
      }
    };

    checkPaymentProviders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('loan_form_payment_providers')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'payment_providers' },
        () => {
          checkPaymentProviders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  // Sync lenderType state with form (important for preferredLender case)
  useEffect(() => {
    if (lenderType) {
      setValue('lenderType', lenderType);
    }
    // Also set businessId if we have a preferred lender
    if (preferredLender) {
      setValue('businessId', preferredLender.id);
    }
  }, [lenderType, preferredLender, setValue]);

  // Update interest rate when business is selected
  useEffect(() => {
    if (selectedBusinessId) {
      const business = businesses.find(b => b.id === selectedBusinessId);
      if (business) {
        setSelectedBusiness(business);
        setValue('interestRate', business.default_interest_rate || 0);
        setValue('interestType', business.interest_type || 'simple');
      }
    }
  }, [selectedBusinessId, businesses, setValue]);

  // Fetch trust level when a specific business is selected (graduated trust system)
  useEffect(() => {
    const fetchBusinessTrust = async () => {
      if (!selectedBusiness?.id) {
        setBusinessTrust(null);
        return;
      }

      setLoadingTrust(true);
      try {
        const response = await fetch(`/api/borrower/trust?business_id=${selectedBusiness.id}`);
        if (response.ok) {
          const data = await response.json();
          setBusinessTrust(data);
        }
      } catch (error) {
        console.error('Failed to fetch business trust:', error);
      } finally {
        setLoadingTrust(false);
      }
    };

    if (lenderType === 'business' && selectedBusiness) {
      fetchBusinessTrust();
    }
  }, [selectedBusiness, lenderType]);

  // Check if amount exceeds limit (only for personal lending)
  const isAmountOverLimit = lenderType === 'personal' && borrowingLimit && 
    borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6 && 
    borrowingLimit.availableAmount !== null && borrowingLimit.availableAmount !== undefined && 
    amount > borrowingLimit.availableAmount;
  
  // Get the active eligibility based on lender type
  const activeEligibility = lenderType === 'business' ? businessEligibility : borrowingLimit;

  // Step validation functions
  const validateStep1 = (): boolean => {
    // Only require bank connection if Dwolla is enabled
    if (isDwollaEnabled && !userBankConnected) {
      setStepError('Please connect your Bank account first');
      return false;
    }
    if (!lenderType) {
      setStepError('Please select a lender type');
      return false;
    }
    // Check if user can borrow at all - use the appropriate eligibility based on lender type
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
    if (lenderType === 'business') {
      // Auto-match, no validation needed
      return true;
    } else if (lenderType === 'personal') {
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
    }
    return true;
  };

  const validateStep3 = (): boolean => {
    const values = getValues();
    if (!values.amount || values.amount < 1) {
      setStepError('Please enter a valid loan amount');
      return false;
    }
    
    // Check borrowing limit - only for personal lending
    if (lenderType === 'personal' && borrowingLimit && borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6) {
      if (borrowingLimit.availableAmount !== null && borrowingLimit.availableAmount !== undefined && values.amount > borrowingLimit.availableAmount) {
        if (borrowingLimit.availableAmount <= 0) {
          setStepError(`You've reached your borrowing limit of ${formatCurrency(borrowingLimit.maxAmount || 0)}. Pay off existing loans to borrow more.`);
        } else {
          setStepError(`Amount exceeds your available limit. You can borrow up to ${formatCurrency(borrowingLimit.availableAmount)}.`);
        }
        return false;
      }
      if (borrowingLimit.maxAmount !== null && borrowingLimit.maxAmount !== undefined && values.amount > borrowingLimit.maxAmount) {
        setStepError(`Amount exceeds your tier limit of ${formatCurrency(borrowingLimit.maxAmount)}. Complete more loans to increase your limit.`);
        return false;
      }
    }
    
    // For business lending with a specific business selected, check trust-based limits
    if (lenderType === 'business' && selectedBusiness && businessTrust) {
      if (!businessTrust.canBorrow) {
        setStepError(businessTrust.reason || 'You are not eligible to borrow from this business');
        return false;
      }
      if (values.amount > businessTrust.maxAmount) {
        if (businessTrust.isGraduated) {
          setStepError(`Amount exceeds the maximum of ${formatCurrency(businessTrust.maxAmount)} for this lender.`);
        } else {
          setStepError(`As a new borrower with ${selectedBusiness.business_name}, you can borrow up to ${formatCurrency(businessTrust.maxAmount)}. Complete ${businessTrust.loansUntilGraduation} more loan(s) to unlock up to ${formatCurrency(businessTrust.standardMaxAmount)}.`);
        }
        return false;
      }
    }
    
    // For business lending without specific business (auto-match), just check if there are any lenders who can support this amount
    if (lenderType === 'business' && !selectedBusiness && businessEligibility) {
      if (businessEligibility.maxAvailableFromBusinesses !== undefined && 
          values.amount > businessEligibility.maxAvailableFromBusinesses) {
        setStepError(`No business lenders currently support ${formatCurrency(values.amount)}. Try ${formatCurrency(businessEligibility.maxAvailableFromBusinesses)} or less.`);
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
    // If Dwolla is disabled, skip bank validation - payments will be manual
    if (!isDwollaEnabled) {
      return true;
    }
    
    // If user has bank connected via Plaid, they're good to go
    if (userBankConnected) {
      return true;
    }
    
    if (!disbursementData.disbursement_method) {
      setStepError('Please select how you want to receive the money');
      return false;
    }
    
    // Validate based on method
    if (disbursementData.disbursement_method === 'mobile_money') {
      if (!disbursementData.mobile_money_provider || !disbursementData.mobile_money_phone || !disbursementData.mobile_money_name) {
        setStepError('Please fill in all mobile money details');
        return false;
      }
    }
    
    if (disbursementData.disbursement_method === 'cash_pickup') {
      if (!disbursementData.cash_pickup_location || !disbursementData.picker_full_name || 
          !disbursementData.picker_id_type || !disbursementData.picker_id_number) {
        setStepError('Please fill in all cash pickup details');
        return false;
      }
    }
    
    if (disbursementData.disbursement_method === 'bank_transfer') {
      if (!disbursementData.bank_name || !disbursementData.bank_account_name || !disbursementData.bank_account_number) {
        setStepError('Please fill in all bank transfer details');
        return false;
      }
    }

    // If no bank connected and no disbursement method selected
    if (!userBankConnected) {
      setStepError('Please connect your bank account in Settings, or select a disbursement method');
      return false;
    }

    return true;
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
    
    let isValid = false;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();
    else if (step === 4) isValid = validateStep4();
    else if (step === 5) isValid = validateStep5();
    else isValid = true;

    if (isValid) {
      setStep(nextStep);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep5()) return;

    const data = getValues();
    
    // Ensure lenderType is set (fallback to state if form value is missing)
    if (!data.lenderType && lenderType) {
      data.lenderType = lenderType;
    }
    
    // Final validation - lenderType is required
    if (!data.lenderType) {
      setSubmitError('Please select a lender type (Business or Personal)');
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      const termMonths = calculateLoanTermMonths(data.totalInstallments, data.repaymentFrequency);
      const totalInterest = calculateTotalInterest(data.amount, data.interestRate || 0, termMonths, data.interestType || 'simple');
      const totalAmount = data.amount + totalInterest;
      data.repaymentAmount = totalAmount / data.totalInstallments;
      
      // Add disbursement data - Bank only
      data.disbursementMethod = 'bank_transfer';
      // Remove all diaspora/recipient fields
      data.isForRecipient = false;
      data.agreementSigned = true;
      
      console.log('Form submit - Simple Bank flow:', {
        disbursementMethod: data.disbursementMethod,
        isForRecipient: data.isForRecipient,
      });
      
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

  const interestTypeOptions = [
    { value: 'simple', label: 'Simple Interest' },
    { value: 'compound', label: 'Compound Interest' },
  ];

  const canProceedStep2 = () => lenderType === 'business' ? true : !!(inviteEmail || invitePhone || inviteUsername);
  const canProceedStep3 = () => amount > 0 && totalInstallments > 0 && !!startDate;

  // Search for username
  const searchUsername = async (username: string) => {
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
  };

  // Progress indicator
  const totalSteps = 5;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-2">
          <span>Step {step} of {totalSteps}</span>
          <span>{Math.round(progressPercent)}% complete</span>
        </div>
        <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
          <div 
            className="h-full bg-primary-500 transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Error Display */}
      {(stepError || submitError) && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-700 dark:text-red-300">{stepError || submitError}</div>
        </div>
      )}

      {/* Step 1: Bank Check & Lender Type */}
      {step === 1 && (
        <div className="space-y-6 animate-fade-in">
          {/* Bank Connection Check - Only show if Dwolla is enabled */}
          {isDwollaEnabled && !userBankConnected && (
            <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-yellow-900 dark:text-yellow-300">Connect Bank First</h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    You need to connect your Bank account before requesting a loan. 
                    This ensures secure payment processing.
                  </p>
                  <Button 
                    type="button" 
                    onClick={onConnectBank}
                    className="mt-3"
                    size="sm"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Connect Bank
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {isDwollaEnabled && userBankConnected && (
            <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
              <Check className="w-5 h-5 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-300">Bank connected</span>
            </div>
          )}

          {/* Manual payment notice when Dwolla is disabled */}
          {!isDwollaEnabled && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
              <Wallet className="w-5 h-5 text-blue-600" />
              <span className="text-sm text-blue-700 dark:text-blue-300">
                Payments will be handled via Cash App, Venmo, Zelle, or PayPal
              </span>
            </div>
          )}

          {/* Borrowing Limit Card - Show based on lender type selection */}
          {(userBankConnected || !isDwollaEnabled) && !loadingLimit && (
            <>
              {/* Personal Lending Tier Card */}
              {(!lenderType || lenderType === 'personal') && borrowingLimit && (
                <Card className="border-primary-200 dark:border-primary-800 bg-gradient-to-br from-primary-50 to-white dark:from-primary-900/20 dark:to-neutral-800">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        borrowingLimit.borrowingTier === 6 ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' :
                        (borrowingLimit.borrowingTier ?? 0) >= 4 ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' :
                        (borrowingLimit.borrowingTier ?? 0) >= 2 ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400' :
                        'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      }`}>
                        <Star className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Personal Lending Tier</p>
                        <p className="font-semibold text-neutral-900 dark:text-white">{borrowingLimit.tierName || 'Starter'}</p>
                      </div>
                    </div>
                    {!borrowingLimit.canBorrow && (
                      <div className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-medium flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Limited
                      </div>
                    )}
                  </div>

                  {/* Borrowing Limit Display */}
                  <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                    {borrowingLimit.borrowingTier === 6 ? (
                      <div className="text-center">
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Borrowing Limit</p>
                        <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">Unlimited ✨</p>
                        {borrowingLimit.totalOutstanding > 0 && (
                          <p className="text-xs text-neutral-400 mt-1">
                            Outstanding: {formatCurrency(borrowingLimit.totalOutstanding)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-neutral-500 dark:text-neutral-400">Available to Borrow</span>
                          <span className="text-lg font-bold text-primary-600 dark:text-primary-400">
                            {formatCurrency(borrowingLimit.availableAmount || 0)}
                          </span>
                        </div>
                        <div className="h-3 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary-500 transition-all"
                            style={{ 
                              width: `${borrowingLimit.maxAmount ? ((borrowingLimit.availableAmount || 0) / borrowingLimit.maxAmount) * 100 : 0}%` 
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-neutral-400 mt-1">
                          <span>Outstanding: {formatCurrency(borrowingLimit.totalOutstanding)}</span>
                          <span>Tier Max: {formatCurrency(borrowingLimit.maxAmount || 0)}</span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Can't Borrow Warning */}
                  {!borrowingLimit.canBorrow && borrowingLimit.reason && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-red-700 dark:text-red-400">{borrowingLimit.reason}</p>
                    </div>
                  )}

                  {/* Tier Progress */}
                  {borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6 && (borrowingLimit.loansNeededToUpgrade ?? 0) > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-100 dark:border-neutral-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-600 dark:text-neutral-400">
                          <TrendingUp className="w-4 h-4 inline mr-1 text-green-600" />
                          {borrowingLimit.loansNeededToUpgrade} more loan{(borrowingLimit.loansNeededToUpgrade ?? 0) > 1 ? 's' : ''} to unlock {formatCurrency(borrowingLimit.nextTierAmount || 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              )}

              {/* Business Lending Card */}
              {lenderType === 'business' && businessEligibility && (
                <Card className="border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 to-white dark:from-green-900/20 dark:to-neutral-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Business Lender Matching</p>
                      <p className="font-semibold text-neutral-900 dark:text-white">
                        {businessEligibility.isFirstTimeBorrower ? 'First-Time Borrower' : 'Returning Borrower'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                    <div className="text-center">
                      <p className="text-sm text-neutral-500 dark:text-neutral-400">Maximum Available from Lenders</p>
                      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {businessEligibility.maxAvailableFromBusinesses 
                          ? formatCurrency(businessEligibility.maxAvailableFromBusinesses)
                          : 'No lenders available'}
                      </p>
                    </div>
                  </div>

                  {businessEligibility.isFirstTimeBorrower && (
                    <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-400">
                        <Info className="w-4 h-4 inline mr-1" />
                        <strong>First-time borrower:</strong> You'll be matched with lenders who accept new borrowers at your requested amount.
                      </p>
                    </div>
                  )}

                  {businessEligibility.message && (
                    <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">
                      {businessEligibility.message}
                    </p>
                  )}
                </Card>
              )}
            </>
          )}

          <div className="text-center mb-4">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Who do you want to borrow from?</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Choose your lender type to get started</p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Business Lender - Auto Match */}
            <Card
              hover
              className={`cursor-pointer transition-all ${
                lenderType === 'business' ? 'ring-2 ring-primary-500 border-primary-500' : ''
              } ${(isDwollaEnabled && !userBankConnected) || userVerificationStatus !== 'verified' ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                if ((!isDwollaEnabled || userBankConnected) && userVerificationStatus === 'verified') {
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
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white">Business Lender</h3>
                  <Zap className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  We'll instantly match you with the best available lender
                </p>
                {userVerificationStatus !== 'verified' && (
                  <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-2 flex items-center justify-center gap-1">
                    <Shield className="w-3 h-3" />
                    Requires verification
                  </p>
                )}
              </div>
            </Card>

            {/* Friend or Family */}
            <Card
              hover
              className={`cursor-pointer transition-all ${
                lenderType === 'personal' ? 'ring-2 ring-primary-500 border-primary-500' : ''
              } ${isDwollaEnabled && !userBankConnected ? 'opacity-50 pointer-events-none' : ''}`}
              onClick={() => {
                if (!isDwollaEnabled || userBankConnected) {
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
                <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-2">Friend or Family</h3>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  Send an invite to someone you know
                </p>
              </div>
            </Card>
          </div>

          {/* Verification Required Banner */}
          {userBankConnected && userVerificationStatus !== 'verified' && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800 dark:text-yellow-300">Verification Required for Business Loans</p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                    {userVerificationStatus === 'submitted' 
                      ? 'Your verification is being reviewed. You can still borrow from friends and family.'
                      : 'Complete your verification to borrow from registered businesses. You can still borrow from friends and family without verification.'}
                  </p>
                  {userVerificationStatus !== 'submitted' && onStartVerification && (
                    <Button 
                      type="button" 
                      size="sm" 
                      className="mt-3"
                      onClick={onStartVerification}
                    >
                      <Shield className="w-4 h-4 mr-2" />
                      Start Verification
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              onClick={() => goToNextStep(2)}
              disabled={!lenderType || (isDwollaEnabled && !userBankConnected)}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Select Lender */}
      {step === 2 && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => { setStep(1); setStepError(null); }}
            className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          {lenderType === 'business' ? (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Auto-Match Enabled</h2>
                <p className="text-neutral-500 dark:text-neutral-400">We'll find the best lender for you automatically</p>
              </div>

              <Card className="bg-gradient-to-br from-primary-50 dark:from-primary-900/10 to-yellow-50 dark:to-yellow-900/10 border-primary-200 dark:border-primary-800">
                <div className="text-center py-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary-100 dark:from-primary-900/30 to-yellow-100 dark:to-yellow-900/30 rounded-full flex items-center justify-center">
                    <Zap className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                  </div>
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-2">How It Works</h3>
                  <div className="text-left max-w-md mx-auto space-y-3 mt-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-800 dark:text-primary-300">1</div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">You submit your loan request with your terms</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-800 dark:text-primary-300">2</div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Our system finds business lenders matching your needs</p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-primary-200 dark:bg-primary-800 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-800 dark:text-primary-300">3</div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Best match funds your loan instantly or within 24h</p>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
                <Check className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-300">No browsing required</p>
                  <p className="text-sm text-green-700 dark:text-green-400">Continue to set your loan details and we'll handle the rest</p>
                </div>
              </div>

              {/* Loan Type Selection */}
              {loanTypes.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">What type of loan do you need?</h3>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">Select a loan type to help us match you with the right lenders</p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {loanTypes.map((loanType) => (
                      <button
                        key={loanType.id}
                        type="button"
                        onClick={() => {
                          setSelectedLoanTypeId(selectedLoanTypeId === loanType.id ? null : loanType.id);
                          setValue('loanTypeId', selectedLoanTypeId === loanType.id ? undefined : loanType.id);
                        }}
                        className={`p-3 rounded-xl border-2 text-left transition-all ${
                          selectedLoanTypeId === loanType.id
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                        }`}
                      >
                        <p className="font-medium text-sm text-neutral-900 dark:text-white">{loanType.name}</p>
                        {loanType.description && (
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">{loanType.description}</p>
                        )}
                      </button>
                    ))}
                  </div>

                  {!selectedLoanTypeId && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2 italic">
                      Optional you can skip this and we'll match with all available lenders
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Invite Your Lender</h2>
                <p className="text-neutral-500 dark:text-neutral-400">Find them by Feyza username, or enter their contact info</p>
              </div>

              <div className="space-y-4">
                {/* Username Search */}
                <div className="p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-xl">
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    <AtSign className="w-4 h-4 inline mr-1" />
                    Feyza Username
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
                    >
                      {usernameSearching ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                    </Button>
                  </div>

                  {/* Username Found */}
                  {usernameFound && (
                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="font-medium text-green-800 dark:text-green-300">~{usernameFound.username}</p>
                        <p className="text-sm text-green-700 dark:text-green-400">{usernameFound.displayName}</p>
                      </div>
                    </div>
                  )}

                  {/* Username Error */}
                  {usernameError && (
                    <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600" />
                      <p className="text-sm text-red-700 dark:text-red-400">{usernameError}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                  <span className="text-sm text-neutral-400 font-medium">or invite by contact</span>
                  <div className="flex-1 h-px bg-neutral-200 dark:bg-neutral-700"></div>
                </div>

                <Input
                  label="Email Address"
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
                  label="Phone Number"
                  type="tel"
                  placeholder="+1 234 567 8900"
                  {...register('invitePhone')}
                  onChange={(e) => {
                    setValue('invitePhone', e.target.value);
                    setStepError(null);
                  }}
                />

                {/* Hidden field to ensure inviteUsername is submitted */}
                <input type="hidden" {...register('inviteUsername')} />
                
                <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-300">Interest rate set by lender</p>
                        <p className="text-blue-700 dark:text-blue-400">
                          Your friend or family member will set the interest rate (if any) when they accept your request.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end pt-4">
            <Button
              type="button"
              onClick={() => goToNextStep(3)}
              disabled={!canProceedStep2()}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Loan Details */}
      {step === 3 && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => { setStep(2); setStepError(null); }}
            className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Loan Details</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Specify the amount and repayment terms</p>
          </div>

          {lenderType === 'business' && selectedBusiness && selectedBusiness.default_interest_rate > 0 && (
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl flex items-start gap-3">
              <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 dark:text-blue-300">
                  {selectedBusiness.business_name} charges {formatPercentage(selectedBusiness.default_interest_rate)} APR
                </p>
                <p className="text-blue-700 dark:text-blue-400">
                  Interest type: {selectedBusiness.interest_type === 'compound' ? 'Compound' : 'Simple'}
                </p>
              </div>
            </div>
          )}

          {/* Trust Level Display for Specific Business */}
          {lenderType === 'business' && selectedBusiness && businessTrust && (
            <Card className={`border-2 ${
              businessTrust.isGraduated 
                ? 'border-green-200 dark:border-green-800 bg-gradient-to-br from-green-50 dark:from-green-900/20 to-white dark:to-neutral-800' 
                : 'border-amber-200 dark:border-amber-800 bg-gradient-to-br from-amber-50 dark:from-amber-900/20 to-white dark:to-neutral-800'
            }`}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                  businessTrust.isGraduated 
                    ? 'bg-green-100 dark:bg-green-900/30' 
                    : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  {businessTrust.isGraduated ? (
                    <Star className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">Your Trust Level with {selectedBusiness.business_name}</p>
                  <p className={`font-semibold ${
                    businessTrust.isGraduated ? 'text-green-700 dark:text-green-400' : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {businessTrust.isGraduated ? 'Graduated Borrower' : 'New Borrower'}
                  </p>
                </div>
              </div>

              <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 border border-neutral-100 dark:border-neutral-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-neutral-500 dark:text-neutral-400">Maximum Loan Amount</span>
                  <span className={`text-lg font-bold ${
                    businessTrust.isGraduated ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {formatCurrency(businessTrust.maxAmount)}
                  </span>
                </div>

                {!businessTrust.isGraduated && (
                  <>
                    <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden mb-2">
                      <div 
                        className="h-full bg-amber-500 transition-all"
                        style={{ width: `${(businessTrust.completedLoans / 3) * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-neutral-500 dark:text-neutral-400">
                      <span>{businessTrust.completedLoans}/3 loans completed</span>
                      <span>Unlocks {formatCurrency(businessTrust.standardMaxAmount)}</span>
                    </div>
                    <p className="mt-2 text-sm text-amber-700 dark:text-amber-400">
                      <Lock className="w-3 h-3 inline mr-1" />
                      Complete {businessTrust.loansUntilGraduation} more loan{businessTrust.loansUntilGraduation > 1 ? 's' : ''} at {formatCurrency(businessTrust.firstTimeAmount)} to unlock higher amounts
                    </p>
                  </>
                )}

                {businessTrust.isGraduated && (
                  <p className="text-sm text-green-700 dark:text-green-400">
                    <Check className="w-3 h-3 inline mr-1" />
                    You've built trust with this lender and can borrow up to their maximum amount
                  </p>
                )}
              </div>

              {!businessTrust.canBorrow && businessTrust.reason && (
                <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700 dark:text-red-400">{businessTrust.reason}</p>
                </div>
              )}
            </Card>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Input
                label="Principal Amount *"
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
              {/* Show available limit for personal lending */}
              {lenderType === 'personal' && borrowingLimit && borrowingLimit.borrowingTier && borrowingLimit.borrowingTier < 6 && (
                <p className={`text-xs mt-1 ${isAmountOverLimit ? 'text-red-600 dark:text-red-400 font-medium' : 'text-neutral-500 dark:text-neutral-400'}`}>
                  {isAmountOverLimit ? (
                    <>
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Exceeds your limit! Max: {formatCurrency(borrowingLimit.availableAmount || 0)}
                    </>
                  ) : (
                    <>Available: {formatCurrency(borrowingLimit.availableAmount || 0)}</>
                  )}
                </p>
              )}
              {/* Show trust-based limit for specific business */}
              {lenderType === 'business' && selectedBusiness && businessTrust && (
                <p className={`text-xs mt-1 ${
                  amount > businessTrust.maxAmount 
                    ? 'text-red-600 dark:text-red-400 font-medium' 
                    : businessTrust.isGraduated 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-amber-600 dark:text-amber-400'
                }`}>
                  {amount > businessTrust.maxAmount ? (
                    <>
                      <AlertCircle className="w-3 h-3 inline mr-1" />
                      Exceeds your limit! Max: {formatCurrency(businessTrust.maxAmount)}
                    </>
                  ) : businessTrust.isGraduated ? (
                    <>
                      <Star className="w-3 h-3 inline mr-1" />
                      Graduated: Up to {formatCurrency(businessTrust.maxAmount)}
                    </>
                  ) : (
                    <>
                      <Lock className="w-3 h-3 inline mr-1" />
                      New borrower limit: {formatCurrency(businessTrust.maxAmount)}
                    </>
                  )}
                </p>
              )}
              {/* Show info for business lending without specific business (auto-match) */}
              {lenderType === 'business' && !selectedBusiness && businessEligibility && (
                <p className="text-xs mt-1 text-green-600 dark:text-green-400">
                  <Info className="w-3 h-3 inline mr-1" />
                  {businessEligibility.isFirstTimeBorrower 
                    ? `First-time borrower you'll be matched with lenders accepting up to ${formatCurrency(businessEligibility.maxAvailableFromBusinesses || 0)}`
                    : `Max available from lenders: ${formatCurrency(businessEligibility.maxAvailableFromBusinesses || 0)}`
                  }
                </p>
              )}
            </div>
            <Select
              label="Currency *"
              options={currencyOptions}
              {...register('currency')}
            />
          </div>

          <Input
            label="Purpose (optional)"
            placeholder="e.g., Business supplies, emergency, etc."
            {...register('purpose')}
          />

          {/* Smart Repayment Schedule */}
          {amount > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Repayment Schedule *
                </label>
                <button
                  type="button"
                  onClick={() => setUseSmartSchedule(!useSmartSchedule)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 flex items-center gap-1"
                >
                  {useSmartSchedule ? (
                    <>
                      <Edit3 className="w-4 h-4" />
                      Custom schedule
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Smart suggestions
                    </>
                  )}
                </button>
              </div>

              {useSmartSchedule ? (
                <>
                  {/* Income-Based Smart Schedule (if user has financial profile) */}
                  {financialProfile && incomeBasedSchedule && incomeBasedSchedule.disposableIncome > 0 && incomeBasedSchedule.suggestions ? (
                    <div className="space-y-4">
                      {/* Income Profile Banner */}
                      <div className="p-3 bg-gradient-to-r from-green-50 to-green-50 dark:from-green-900/20 dark:to-green-900/20 border border-green-200 dark:border-green-800 rounded-xl">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <Sparkles className="w-4 h-4" />
                          <span className="text-sm font-medium">
                            Personalized for your income ({formatCurrency(incomeBasedSchedule.disposableIncome)}/mo disposable)
                          </span>
                        </div>
                      </div>

                      {/* Comfort Level Options */}
                      <div className="grid gap-3">
                        {(['comfortable', 'balanced', 'aggressive'] as ComfortLevel[]).map((level) => {
                          const suggestion = incomeBasedSchedule.suggestions[level];
                          const isSelected = selectedComfortLevel === level;
                          const frequencyLabel = suggestion.frequency === 'weekly' ? 'weekly' : 
                                                 suggestion.frequency === 'biweekly' ? 'bi-weekly' : 
                                                 suggestion.frequency === 'semimonthly' ? 'semi-monthly' : 'monthly';
                          
                          return (
                            <button
                              key={level}
                              type="button"
                              onClick={() => setSelectedComfortLevel(level)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                isSelected
                                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    isSelected ? 'bg-green-100 dark:bg-green-800' : 'bg-neutral-100 dark:bg-neutral-800'
                                  }`}>
                                    {level === 'comfortable' && <Shield className={`w-5 h-5 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`} />}
                                    {level === 'balanced' && <Star className={`w-5 h-5 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`} />}
                                    {level === 'aggressive' && <Zap className={`w-5 h-5 ${isSelected ? 'text-green-600 dark:text-green-400' : 'text-neutral-500 dark:text-neutral-400'}`} />}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-neutral-900 dark:text-white capitalize">{level}</p>
                                      {level === 'balanced' && (
                                        <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                                          Recommended
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      {suggestion.numberOfPayments} {frequencyLabel} payments • {suggestion.percentOfDisposable}% of disposable
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-neutral-900 dark:text-white">
                                    {formatCurrency(suggestion.amount)}
                                  </p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                    ~{suggestion.weeksToPayoff} weeks
                                  </p>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {/* Selected Schedule Summary */}
                      <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg flex items-center gap-2 text-green-700 dark:text-green-300 text-sm">
                        <Wallet className="w-4 h-4" />
                        <span>
                          You'll pay {formatCurrency(incomeBasedSchedule.suggestions[selectedComfortLevel].amount)}{' '}
                          {formatPayFrequency(incomeBasedSchedule.payFrequency).toLowerCase()} for{' '}
                          {incomeBasedSchedule.suggestions[selectedComfortLevel].numberOfPayments} payments
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Simple Presets (for users without financial profile OR with $0 disposable) */
                    repaymentPresets.length > 0 ? (
                      <div className="space-y-4">
                        {/* Warning for users with $0 or negative disposable income */}
                        {financialProfile && financialProfile.disposableIncome <= 0 && (
                          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-amber-700 dark:text-amber-300">
                                <span className="font-medium">Your expenses match or exceed your income.</span>
                                {' '}Consider reviewing your budget before taking a loan, or{' '}
                                <a href="/dashboard" className="font-medium hover:underline">update your income profile</a>.
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Prompt to set up income profile */}
                        {!loadingFinancialProfile && !financialProfile && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                            <div className="flex items-start gap-2">
                              <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                              <div className="text-sm text-blue-700 dark:text-blue-300">
                                <a href="/dashboard" className="font-medium hover:underline">Set up your income profile</a>
                                {' '}to get personalized repayment suggestions based on your budget.
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="grid gap-3">
                          {repaymentPresets.map((preset, index) => (
                            <button
                              key={index}
                              type="button"
                              onClick={() => setSelectedPresetIndex(index)}
                              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                                selectedPresetIndex === index
                                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                  : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                                    selectedPresetIndex === index ? 'bg-primary-100 dark:bg-primary-900' : 'bg-neutral-100 dark:bg-neutral-800'
                                  }`}>
                                    <CalendarIcon className={`w-5 h-5 ${
                                      selectedPresetIndex === index ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'
                                    }`} />
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="font-medium text-neutral-900 dark:text-white">{preset.label}</p>
                                      {preset.recommended && (
                                        <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 rounded-full">
                                          Recommended
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-neutral-500 dark:text-neutral-400">
                                      {preset.frequency === 'weekly' ? 'Weekly' : preset.frequency === 'biweekly' ? 'Bi-weekly' : 'Monthly'} payments
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-neutral-900 dark:text-white">
                                    {formatCurrency(preset.paymentAmount)}
                                  </p>
                                  <p className="text-xs text-neutral-500 dark:text-neutral-400">per payment</p>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>

                        {selectedPreset && (
                          <div className="p-3 bg-primary-50 dark:bg-primary-900/30 rounded-lg flex items-center gap-2 text-primary-700 dark:text-primary-300 text-sm">
                            <Clock className="w-4 h-4" />
                            <span>
                              You'll pay {formatCurrency(selectedPreset.paymentAmount)}{' '}
                              {selectedPreset.frequency} for {selectedPreset.installments}{' '}
                              {selectedPreset.installments === 1 ? 'payment' : 'payments'}
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl text-center text-neutral-500 dark:text-neutral-400">
                        Enter a loan amount to see repayment options
                      </div>
                    )
                  )}
                </>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <Select
                    label="Repayment Frequency"
                    options={frequencyOptions}
                    {...register('repaymentFrequency')}
                  />
                  <Input
                    label="Number of Installments"
                    type="number"
                    placeholder="10"
                    min="1"
                    {...register('totalInstallments', { valueAsNumber: true })}
                  />
                </div>
              )}
            </div>
          )}

          {/* Fallback if no amount entered yet */}
          {(!amount || amount <= 0) && (
            <div className="grid md:grid-cols-2 gap-4">
              <Select
                label="Repayment Frequency *"
                options={frequencyOptions}
                {...register('repaymentFrequency')}
              />
              <Input
                label="Number of Installments *"
                type="number"
                placeholder="10"
                min="1"
                {...register('totalInstallments', { valueAsNumber: true })}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Start Date *
            </label>
            <CalendarPicker
              selectedDate={selectedStartDate}
              onDateSelect={setSelectedStartDate}
              minDate={new Date()}
              placeholder="Select start date"
            />
          </div>

          {amount > 0 && totalInstallments > 0 && (
            <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl space-y-2">
              <h4 className="font-semibold text-neutral-900 dark:text-white">Loan Summary</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-neutral-500 dark:text-neutral-400">Principal:</span>
                <span className="text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(amount)}</span>
                
                {interestRate > 0 && (
                  <>
                    <span className="text-neutral-500 dark:text-neutral-400">Interest Rate:</span>
                    <span className="text-right font-medium text-neutral-900 dark:text-white">{formatPercentage(interestRate)} APR</span>
                    
                    <span className="text-neutral-500 dark:text-neutral-400">Total Interest:</span>
                    <span className="text-right font-medium text-orange-600 dark:text-orange-400">{formatCurrency(totalInterest)}</span>
                  </>
                )}
                
                <span className="text-neutral-500 dark:text-neutral-400 font-medium">Total to Repay:</span>
                <span className="text-right font-bold text-primary-600 dark:text-primary-400">{formatCurrency(totalAmount)}</span>
                
                <span className="text-neutral-500 dark:text-neutral-400">Per Installment:</span>
                <span className="text-right font-medium text-neutral-900 dark:text-white">{formatCurrency(repaymentAmount)}</span>
              </div>
            </div>
          )}

          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              onClick={() => goToNextStep(4)}
              disabled={!canProceedStep3()}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Disbursement Method */}
      {step === 4 && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => { setStep(3); setStepError(null); }}
            className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">How to Receive Money</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Choose how you or your recipient will receive the funds</p>
          </div>

          {/* Bank Transfer Info */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="font-medium text-green-800 dark:text-green-300">Bank Transfer</p>
                <p className="text-sm text-green-700 dark:text-green-400">
                  {userBankName ? `Funds will be sent to your ${userBankName} account (••••${userBankAccountMask})` : 'Funds will be sent directly to your connected bank account'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button 
              type="button" 
              onClick={() => goToNextStep(5)}
            >
              Continue
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Step 5: Agreement */}
      {step === 5 && (
        <div className="space-y-4 animate-fade-in">
          <button
            type="button"
            onClick={() => { setStep(4); setStepError(null); setSubmitError(null); }}
            className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Review & Sign Agreement</h2>
            <p className="text-neutral-500 dark:text-neutral-400">Please review the loan terms and sign the agreement</p>
          </div>

          {/* Loan Summary Card */}
          <Card className="bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <h4 className="font-semibold text-primary-900 dark:text-primary-300 mb-3">Loan Summary</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-primary-700 dark:text-primary-400">Principal:</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-300">{formatCurrency(amount)}</span>
              <span className="text-primary-700 dark:text-primary-400">Total to Repay:</span>
              <span className="text-right font-bold text-primary-900 dark:text-primary-300">{formatCurrency(totalAmount)}</span>
              <span className="text-primary-700 dark:text-primary-400">Installments:</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-300">{totalInstallments} × {formatCurrency(repaymentAmount)}</span>
              <span className="text-primary-700 dark:text-primary-400">Start Date:</span>
              <span className="text-right font-medium text-primary-900 dark:text-primary-300">
                {startDate ? new Date(startDate).toLocaleDateString() : '-'}
              </span>
            </div>
          </Card>

          {/* Terms Section */}
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Loan Agreement Terms
              </h4>
              <button
                type="button"
                onClick={() => setShowFullTerms(!showFullTerms)}
                className="text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300"
              >
                {showFullTerms ? 'Hide' : 'Show'} full terms
              </button>
            </div>

            {showFullTerms && (
              <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-3 max-h-64 overflow-y-auto mb-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-lg">
                <p className="font-semibold text-neutral-900 dark:text-white">Loan Agreement Terms</p>

                <p><strong>1. Parties & Loan Details</strong></p>
                <p>
                  This Loan Agreement ("Agreement") is between the borrower ("Borrower") and the lender ("Lender").
                  By accepting these terms, Borrower agrees to receive a principal loan amount of {formatCurrency(amount)}.
                  The total repayment amount and interest rate are provisional until a lender is matched.
                </p>

                <p><strong>2. Provisional Terms & Lender Matching</strong></p>
                <p>
                  The repayment terms shown are based on your initial request. <strong>The interest rate and total repayment amount may change once you are matched with a lender or when a lender agrees to fund your loan.</strong> 
                  Final loan terms, including the exact interest rate and total repayment amount, will be presented for your acceptance before any funds are disbursed.
                </p>

                <p><strong>3. Repayment Schedule</strong></p>
                <p>
                  Borrower agrees to repay this loan in {totalInstallments} installment(s) of {formatCurrency(repaymentAmount)} each,
                  due on the dates shown in the repayment schedule. The payment amount shown is based on current provisional terms and may be adjusted based on the final interest rate set by the matched lender.
                  Payments may be made through supported payment methods (e.g., bank transfer or other options offered in Feyza).
                </p>

                <p><strong>4. Interest, Fees, and Total Cost</strong></p>
                <p>
                  The total repayment amount shown above includes estimated interest based on provisional terms. 
                  <strong>The final interest rate will be determined by the matched lender</strong> and will be clearly displayed before you accept the final loan agreement.
                  Feyza displays these amounts before Borrower accepts the final Agreement. Once accepted, loan pricing cannot be changed unless both parties explicitly agree to an update within the platform.
                </p>

                <p><strong>5. Prepayment</strong></p>
                <p>
                  Borrower may repay the loan early, in whole or in part, unless the Lender's terms explicitly state otherwise.
                  Any early repayment will be applied to the outstanding balance and may reduce future scheduled payments.
                  Early repayment may affect the total interest paid, depending on the lender's terms.
                </p>

                <p><strong>6. Late Payments & Communication</strong></p>
                <p>
                  A payment is considered late if not received by the due date shown in the schedule. Borrower agrees to notify
                  Lender as soon as possible if a payment cannot be made on time. Late payments may result in reminders and may
                  impact Borrower's ability to receive future offers from participating lenders.
                </p>

                <p><strong>7. Payment Confirmation & Records</strong></p>
                <p>
                  Feyza keeps a record of the repayment schedule, payment history, and confirmations submitted by either party.
                  Borrower authorizes Feyza to display these records to Borrower and Lender for transparency. Feyza may also send
                  automated reminders and status updates by email or other notification methods enabled by the user.
                </p>

                <p><strong>8. Disputes</strong></p>
                <p>
                  If Borrower and Lender disagree about a payment or balance, both parties agree to first attempt to resolve the
                  issue directly. Feyza may provide supporting records (e.g., timestamps, confirmations, receipts uploaded by users),
                  but Feyza is not a party to this Agreement and does not guarantee resolution outcomes.
                </p>

                <p><strong>9. No Legal, Tax, or Credit Advice</strong></p>
                <p>
                  Feyza provides tools to document and manage loans but does not provide legal, tax, or credit advice.
                  Borrower and Lender are responsible for understanding and complying with any applicable laws, regulations, and
                  reporting obligations related to this loan.
                </p>

                <p><strong>10. Platform Role & Limitations</strong></p>
                <p>
                  Feyza is a software platform that helps facilitate loan matching, documentation, reminders, and repayment tracking.
                  Unless explicitly stated, Feyza is not the lender, does not guarantee funding, does not guarantee repayment,
                  and does not assume responsibility for the actions of Borrower or Lender.
                </p>

                <p><strong>11. Electronic Consent & Signature</strong></p>
                <p>
                  By clicking "Accept," Borrower consents to using electronic records and signatures and acknowledges that this
                  electronic acceptance has the same legal effect as a handwritten signature to the extent permitted by law.
                  Note: This initial acceptance indicates your interest in receiving loan offers; you will need to accept final loan terms when matched with a lender.
                </p>

                <p className="text-xs text-neutral-500 dark:text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-700">
                  <strong>Important:</strong> The interest rate and total repayment amount shown are provisional. Final terms will be set by the matched lender and presented for your acceptance before any funds are disbursed. 
                  This is a general template for use within Feyza and may not cover all legal requirements in every jurisdiction.
                  Consider consulting legal counsel to ensure compliance for your specific use case.
                </p>
              </div>
            )}

            <div className="flex items-start gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl mb-4">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-300">
                By signing, you agree to repay this loan according to the terms above. 
                This is a legally binding agreement.
              </div>
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
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
                I commit to repaying this loan as agreed.
              </span>
            </label>
          </Card>

          <div className="flex justify-end pt-4">
            <Button 
              type="submit" 
              loading={isSubmitting}
              disabled={!agreementAccepted}
            >
              <FileText className="w-4 h-4 mr-2" />
              Sign & Submit Request
            </Button>
          </div>
        </div>
      )}
    </form>
  );
}