/**
 * Smart Schedule - Loan Repayment Calculator
 * 
 * Two modes:
 * 1. Simple presets (for guest borrowers and quick selection)
 * 2. Income-based personalized suggestions (for logged-in users with financial profiles)
 * 
 * Duration Fee System:
 * - Longer repayment periods incur additional fees
 * - Encourages faster repayment while allowing flexibility
 */

// ==========================================
// DURATION-BASED FEE STRUCTURE
// The longer the loan term, the higher the fee
// ==========================================

export interface DurationFee {
  minWeeks: number;
  maxWeeks: number;
  feePercent: number;
  label: string;
  description: string;
}

// Fee tiers based on loan duration
export const DURATION_FEE_TIERS: DurationFee[] = [
  { minWeeks: 0, maxWeeks: 4, feePercent: 0, label: 'No Fee', description: 'Repay within 4 weeks' },
  { minWeeks: 5, maxWeeks: 8, feePercent: 2, label: '2% Fee', description: '5-8 weeks' },
  { minWeeks: 9, maxWeeks: 12, feePercent: 4, label: '4% Fee', description: '9-12 weeks (2-3 months)' },
  { minWeeks: 13, maxWeeks: 24, feePercent: 6, label: '6% Fee', description: '3-6 months' },
  { minWeeks: 25, maxWeeks: 52, feePercent: 8, label: '8% Fee', description: '6-12 months' },
  { minWeeks: 53, maxWeeks: Infinity, feePercent: 10, label: '10% Fee', description: 'Over 12 months' },
];

/**
 * Calculate the duration fee based on repayment period
 */
export function calculateDurationFee(
  principal: number,
  frequencyWeeks: number, // weeks per payment (1=weekly, 2=biweekly, 4=monthly)
  numberOfPayments: number
): { feePercent: number; feeAmount: number; totalWeeks: number; tier: DurationFee } {
  const totalWeeks = frequencyWeeks * numberOfPayments;
  
  // Find the applicable fee tier
  const tier = DURATION_FEE_TIERS.find(t => totalWeeks >= t.minWeeks && totalWeeks <= t.maxWeeks) 
    || DURATION_FEE_TIERS[DURATION_FEE_TIERS.length - 1];
  
  const feeAmount = Math.ceil(principal * (tier.feePercent / 100));
  
  return {
    feePercent: tier.feePercent,
    feeAmount,
    totalWeeks,
    tier,
  };
}

/**
 * Get frequency in weeks
 */
export function getFrequencyWeeks(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 1;
    case 'biweekly': return 2;
    case 'semimonthly': return 2;
    case 'monthly': return 4;
    default: return 4;
  }
}

/**
 * Calculate total loan cost including duration fee
 */
export function calculateTotalWithDurationFee(
  principal: number,
  interestRate: number,
  interestType: 'simple' | 'compound',
  frequency: string,
  numberOfPayments: number
): {
  principal: number;
  interestAmount: number;
  durationFee: number;
  durationFeePercent: number;
  totalAmount: number;
  paymentAmount: number;
  totalWeeks: number;
  feeTier: DurationFee;
  savings?: { fasterPayments: number; savedAmount: number };
} {
  // Calculate interest
  let interestAmount = 0;
  if (interestRate > 0) {
    if (interestType === 'simple') {
      const termMonths = (getFrequencyWeeks(frequency) * numberOfPayments) / 4;
      interestAmount = Math.ceil(principal * (interestRate / 100) * (termMonths / 12));
    } else {
      // Compound interest (simplified)
      const termMonths = (getFrequencyWeeks(frequency) * numberOfPayments) / 4;
      interestAmount = Math.ceil(principal * Math.pow(1 + interestRate / 100 / 12, termMonths) - principal);
    }
  }
  
  // Calculate duration fee
  const { feePercent, feeAmount, totalWeeks, tier } = calculateDurationFee(
    principal,
    getFrequencyWeeks(frequency),
    numberOfPayments
  );
  
  const totalAmount = principal + interestAmount + feeAmount;
  const paymentAmount = Math.ceil(totalAmount / numberOfPayments);
  
  // Calculate potential savings if they pay faster
  let savings;
  if (feePercent > 0) {
    // Find next lower tier
    const currentTierIndex = DURATION_FEE_TIERS.findIndex(t => t === tier);
    if (currentTierIndex > 0) {
      const lowerTier = DURATION_FEE_TIERS[currentTierIndex - 1];
      const fasterWeeks = lowerTier.maxWeeks;
      const fasterPayments = Math.ceil(fasterWeeks / getFrequencyWeeks(frequency));
      const lowerFee = Math.ceil(principal * (lowerTier.feePercent / 100));
      const savedAmount = feeAmount - lowerFee;
      
      if (savedAmount > 0 && fasterPayments >= 1) {
        savings = { fasterPayments, savedAmount };
      }
    }
  }
  
  return {
    principal,
    interestAmount,
    durationFee: feeAmount,
    durationFeePercent: feePercent,
    totalAmount,
    paymentAmount,
    totalWeeks,
    feeTier: tier,
    savings,
  };
}

// ==========================================
// SIMPLE PRESETS (Guest Borrowers & Quick Selection)
// ==========================================

export interface RepaymentPreset {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  installments: number;
  label: string;
  paymentAmount: number;
  durationFee?: number;
  durationFeePercent?: number;
  totalAmount?: number;
  totalWeeks?: number;
  recommended?: boolean;
}

/**
 * Get repayment presets based on loan amount (with optional duration fees)
 */
export function getRepaymentPresets(amount: number, interestRate: number = 0, includeDurationFees: boolean = false): RepaymentPreset[] {
  if (!amount || amount <= 0) return [];
  
  const basePresets: { frequency: 'weekly' | 'biweekly' | 'monthly'; installments: number; label: string; recommended?: boolean }[] = [];
  
  if (amount <= 100) {
    // Small loans: 1-4 weeks
    basePresets.push({ frequency: 'weekly', installments: 1, label: 'Pay in full (1 week)' });
    basePresets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments', recommended: true });
    if (amount >= 50) {
      basePresets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments' });
    }
  } else if (amount <= 500) {
    // Medium-small loans: 2-8 weeks or 1-3 months
    basePresets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments' });
    basePresets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments', recommended: true });
    basePresets.push({ frequency: 'biweekly', installments: 4, label: '4 bi-weekly payments' });
    if (amount >= 200) {
      basePresets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    }
  } else if (amount <= 2000) {
    // Medium loans: 1-6 months
    basePresets.push({ frequency: 'biweekly', installments: 4, label: '4 bi-weekly payments' });
    basePresets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments', recommended: true });
    basePresets.push({ frequency: 'monthly', installments: 4, label: '4 monthly payments' });
    basePresets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
  } else if (amount <= 10000) {
    // Larger loans: 3-12 months
    basePresets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    basePresets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments', recommended: true });
    basePresets.push({ frequency: 'monthly', installments: 9, label: '9 monthly payments' });
    basePresets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments' });
  } else {
    // Large loans: 6-24 months
    basePresets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
    basePresets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments', recommended: true });
    basePresets.push({ frequency: 'monthly', installments: 18, label: '18 monthly payments' });
    basePresets.push({ frequency: 'monthly', installments: 24, label: '24 monthly payments' });
  }
  
  // Calculate with or without duration fees
  if (includeDurationFees) {
    return basePresets.map(preset => {
      const result = calculateTotalWithDurationFee(
        amount,
        interestRate,
        'simple',
        preset.frequency,
        preset.installments
      );
      
      return {
        ...preset,
        paymentAmount: result.paymentAmount,
        durationFee: result.durationFee,
        durationFeePercent: result.durationFeePercent,
        totalAmount: result.totalAmount,
        totalWeeks: result.totalWeeks,
      };
    });
  }
  
  // Without duration fees (original behavior)
  return basePresets.map(preset => ({
    ...preset,
    paymentAmount: Math.ceil(amount / preset.installments),
  }));
}

/**
 * Validate repayment schedule is realistic for the loan amount
 */
export function validateRepaymentSchedule(
  amount: number, 
  frequency: string, 
  installments: number
): { valid: boolean; message?: string; paymentAmount: number } {
  if (!amount || amount <= 0) {
    return { valid: false, message: 'Invalid loan amount', paymentAmount: 0 };
  }
  
  if (!installments || installments <= 0) {
    return { valid: false, message: 'Invalid number of installments', paymentAmount: 0 };
  }
  
  // Calculate minimum payment per period (at least $10 or 5% of loan)
  const minPayment = Math.max(10, amount * 0.05);
  const paymentAmount = Math.ceil(amount / installments);
  
  if (paymentAmount < minPayment) {
    return { 
      valid: false, 
      message: `Payment amount is too small. Each payment should be at least $${minPayment.toFixed(0)}.`,
      paymentAmount 
    };
  }
  
  // Calculate max duration based on loan size
  let maxInstallments: number;
  if (amount <= 100) {
    maxInstallments = frequency === 'weekly' ? 4 : 2; // Max 1 month
  } else if (amount <= 500) {
    maxInstallments = frequency === 'weekly' ? 8 : (frequency === 'biweekly' ? 6 : 3); // Max 2-3 months
  } else if (amount <= 2000) {
    maxInstallments = frequency === 'monthly' ? 6 : (frequency === 'biweekly' ? 12 : 24); // Max 6 months
  } else if (amount <= 10000) {
    maxInstallments = frequency === 'monthly' ? 12 : (frequency === 'biweekly' ? 24 : 52); // Max 12 months
  } else {
    maxInstallments = frequency === 'monthly' ? 24 : (frequency === 'biweekly' ? 48 : 104); // Max 24 months
  }
  
  if (installments > maxInstallments) {
    return { 
      valid: false, 
      message: `Repayment period is too long. Maximum ${maxInstallments} ${frequency} payments for this loan amount.`,
      paymentAmount 
    };
  }
  
  return { valid: true, paymentAmount };
}


// ==========================================
// INCOME-BASED PERSONALIZED SUGGESTIONS
// For logged-in users with financial profiles
// ==========================================

export type PayFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';
export type ComfortLevel = 'comfortable' | 'balanced' | 'aggressive';

export interface FinancialProfile {
  payFrequency: PayFrequency;
  payAmount: number;
  payDayOfWeek?: number;
  payDayOfMonth?: number;
  secondPayDayOfMonth?: number;
  rentMortgage: number;
  utilities: number;
  transportation: number;
  insurance: number;
  groceries: number;
  phone: number;
  subscriptions: number;
  childcare: number;
  otherBills: number;
  existingDebtPayments: number;
  comfortLevel: ComfortLevel;
  preferredPaymentBufferDays: number;
}

export interface PaymentSuggestion {
  amount: number;
  frequency: PayFrequency;
  percentOfDisposable: number;
  numberOfPayments: number;
  weeksToPayoff: number;
  totalRepayment: number;
  durationFee?: number;
  durationFeePercent?: number;
  description: string;
}

export interface SmartScheduleResult {
  hasProfile: boolean;
  monthlyIncome: number;
  monthlyExpenses: number;
  disposableIncome: number;
  payFrequency: PayFrequency;
  suggestions: {
    comfortable: PaymentSuggestion;
    balanced: PaymentSuggestion;
    aggressive: PaymentSuggestion;
  };
  recommended: PaymentSuggestion;
  warning?: string;
  nextPayDate?: Date;
  suggestedFirstPaymentDate?: Date;
}

// Frequency multipliers to convert to monthly
const FREQUENCY_MULTIPLIERS: Record<PayFrequency, number> = {
  weekly: 4.33,
  biweekly: 2.17,
  semimonthly: 2,
  monthly: 1,
};

// Comfort level percentages of disposable income
const COMFORT_PERCENTAGES: Record<ComfortLevel, number> = {
  comfortable: 0.15,
  balanced: 0.22,
  aggressive: 0.30,
};

/**
 * Calculate monthly income from pay frequency and amount
 */
export function calculateMonthlyIncome(payAmount: number, payFrequency: PayFrequency): number {
  return payAmount * FREQUENCY_MULTIPLIERS[payFrequency];
}

/**
 * Calculate total monthly expenses
 */
export function calculateMonthlyExpenses(profile: Partial<FinancialProfile>): number {
  return (
    (profile.rentMortgage || 0) +
    (profile.utilities || 0) +
    (profile.transportation || 0) +
    (profile.insurance || 0) +
    (profile.groceries || 0) +
    (profile.phone || 0) +
    (profile.subscriptions || 0) +
    (profile.childcare || 0) +
    (profile.otherBills || 0) +
    (profile.existingDebtPayments || 0)
  );
}

/**
 * Calculate disposable income
 */
export function calculateDisposableIncome(monthlyIncome: number, monthlyExpenses: number): number {
  return Math.max(0, monthlyIncome - monthlyExpenses);
}

/**
 * Calculate payment amount for a given comfort level (with duration fees)
 */
function calculatePaymentForComfort(
  disposableIncome: number,
  comfortLevel: ComfortLevel,
  payFrequency: PayFrequency,
  loanAmount: number,
  interestRate: number = 0,
  includeDurationFees: boolean = false
): PaymentSuggestion {
  const monthlyPayment = disposableIncome * COMFORT_PERCENTAGES[comfortLevel];
  
  // Convert to payment frequency amount
  let paymentAmount = monthlyPayment / FREQUENCY_MULTIPLIERS[payFrequency];
  
  // Ensure minimum payment
  const minimumPayment = Math.max(loanAmount / 12, 25);
  paymentAmount = Math.max(paymentAmount, minimumPayment / FREQUENCY_MULTIPLIERS[payFrequency]);
  
  // Round to nearest dollar
  paymentAmount = Math.round(paymentAmount);
  
  // Calculate total with interest
  const totalWithInterest = loanAmount * (1 + interestRate / 100);
  
  // Calculate number of payments
  const numberOfPayments = Math.ceil(totalWithInterest / paymentAmount);
  
  // Calculate weeks to payoff
  const weeksPerPayment = payFrequency === 'weekly' ? 1 : 
                          payFrequency === 'biweekly' ? 2 : 
                          payFrequency === 'semimonthly' ? 2 : 4;
  const weeksToPayoff = numberOfPayments * weeksPerPayment;
  
  // Calculate duration fee if enabled
  let durationFee = 0;
  let durationFeePercent = 0;
  if (includeDurationFees) {
    const feeResult = calculateDurationFee(loanAmount, weeksPerPayment, numberOfPayments);
    durationFee = feeResult.feeAmount;
    durationFeePercent = feeResult.feePercent;
  }
  
  const descriptions: Record<ComfortLevel, string> = {
    comfortable: 'Easy on your budget, longer payoff time',
    balanced: 'Recommended balance of comfort and speed',
    aggressive: 'Fastest payoff, tighter budget',
  };
  
  return {
    amount: paymentAmount,
    frequency: payFrequency,
    percentOfDisposable: Math.round((paymentAmount * FREQUENCY_MULTIPLIERS[payFrequency] / disposableIncome) * 100),
    numberOfPayments,
    weeksToPayoff,
    totalRepayment: paymentAmount * numberOfPayments + durationFee,
    durationFee,
    durationFeePercent,
    description: descriptions[comfortLevel],
  };
}

/**
 * Get the next pay date based on pay schedule
 */
export function getNextPayDate(profile: FinancialProfile): Date {
  const today = new Date();
  const currentDay = today.getDay();
  
  if (profile.payFrequency === 'weekly' || profile.payFrequency === 'biweekly') {
    const payDayOfWeek = profile.payDayOfWeek ?? 5; // Default Friday
    let daysUntilPay = (payDayOfWeek - currentDay + 7) % 7;
    if (daysUntilPay === 0) daysUntilPay = 7;
    
    const nextPay = new Date(today);
    nextPay.setDate(today.getDate() + daysUntilPay);
    return nextPay;
  }
  
  if (profile.payFrequency === 'monthly') {
    const payDayOfMonth = profile.payDayOfMonth ?? 1;
    const nextPay = new Date(today.getFullYear(), today.getMonth(), payDayOfMonth);
    if (nextPay <= today) {
      nextPay.setMonth(nextPay.getMonth() + 1);
    }
    return nextPay;
  }
  
  if (profile.payFrequency === 'semimonthly') {
    const firstPayDay = profile.payDayOfMonth ?? 1;
    const secondPayDay = profile.secondPayDayOfMonth ?? 15;
    
    const firstPay = new Date(today.getFullYear(), today.getMonth(), firstPayDay);
    const secondPay = new Date(today.getFullYear(), today.getMonth(), secondPayDay);
    
    if (firstPay > today) return firstPay;
    if (secondPay > today) return secondPay;
    
    firstPay.setMonth(firstPay.getMonth() + 1);
    return firstPay;
  }
  
  // Default: next Friday
  const nextFriday = new Date(today);
  nextFriday.setDate(today.getDate() + ((5 - currentDay + 7) % 7 || 7));
  return nextFriday;
}

/**
 * Main function: Calculate smart schedule suggestions based on income profile
 */
export function calculateSmartSchedule(
  profile: FinancialProfile,
  loanAmount: number,
  interestRate: number = 0,
  includeDurationFees: boolean = false
): SmartScheduleResult {
  const monthlyIncome = calculateMonthlyIncome(profile.payAmount, profile.payFrequency);
  const monthlyExpenses = calculateMonthlyExpenses(profile);
  const disposableIncome = calculateDisposableIncome(monthlyIncome, monthlyExpenses);
  
  let warning: string | undefined;
  if (disposableIncome <= 0) {
    warning = 'Your expenses exceed your income. Consider adjusting your budget before taking a loan.';
  } else if (disposableIncome < loanAmount * 0.1) {
    warning = 'Your disposable income is low. This loan may be difficult to repay.';
  }
  
  const suggestions = {
    comfortable: calculatePaymentForComfort(disposableIncome, 'comfortable', profile.payFrequency, loanAmount, interestRate, includeDurationFees),
    balanced: calculatePaymentForComfort(disposableIncome, 'balanced', profile.payFrequency, loanAmount, interestRate, includeDurationFees),
    aggressive: calculatePaymentForComfort(disposableIncome, 'aggressive', profile.payFrequency, loanAmount, interestRate, includeDurationFees),
  };
  
  const recommended = suggestions[profile.comfortLevel || 'balanced'];
  
  const nextPayDate = getNextPayDate(profile);
  const suggestedFirstPaymentDate = new Date(nextPayDate);
  suggestedFirstPaymentDate.setDate(nextPayDate.getDate() + (profile.preferredPaymentBufferDays || 2));
  
  return {
    hasProfile: true,
    monthlyIncome,
    monthlyExpenses,
    disposableIncome,
    payFrequency: profile.payFrequency,
    suggestions,
    recommended,
    warning,
    nextPayDate,
    suggestedFirstPaymentDate,
  };
}

/**
 * Format pay frequency for display
 */
export function formatPayFrequency(frequency: PayFrequency): string {
  const labels: Record<PayFrequency, string> = {
    weekly: 'Weekly',
    biweekly: 'Every 2 weeks',
    semimonthly: 'Twice a month',
    monthly: 'Monthly',
  };
  return labels[frequency];
}

/**
 * Validate if a payment amount is safe based on income
 */
export function isPaymentSafe(
  paymentAmount: number,
  payFrequency: PayFrequency,
  monthlyDisposableIncome: number
): { safe: boolean; percentage: number; message: string } {
  const monthlyPayment = paymentAmount * FREQUENCY_MULTIPLIERS[payFrequency];
  const percentage = (monthlyPayment / monthlyDisposableIncome) * 100;
  
  if (percentage > 35) {
    return {
      safe: false,
      percentage,
      message: 'This payment is more than 35% of your disposable income and may be difficult to maintain.',
    };
  }
  
  if (percentage > 25) {
    return {
      safe: true,
      percentage,
      message: 'This payment is aggressive but manageable if you have no unexpected expenses.',
    };
  }
  
  return {
    safe: true,
    percentage,
    message: 'This payment is within a comfortable range for your budget.',
  };
}

/**
 * Get duration fee explanation for UI
 */
export function getDurationFeeExplanation(totalWeeks: number): string {
  const tier = DURATION_FEE_TIERS.find(t => totalWeeks >= t.minWeeks && totalWeeks <= t.maxWeeks);
  if (!tier || tier.feePercent === 0) {
    return 'No extra fees for repaying within 4 weeks!';
  }
  return `A ${tier.feePercent}% fee applies for ${tier.description.toLowerCase()}. Pay faster to reduce fees!`;
}
