/**
 * Smart Schedule - Loan Repayment Calculator
 * 
 * Two modes:
 * 1. Simple presets (for guest borrowers and quick selection)
 * 2. Income-based personalized suggestions (for logged-in users with financial profiles)
 */

// ==========================================
// SIMPLE PRESETS (Guest Borrowers & Quick Selection)
// ==========================================

export interface RepaymentPreset {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  installments: number;
  label: string;
  paymentAmount: number;
  recommended?: boolean;
}

/**
 * Get repayment presets based on loan amount
 * Prevents unrealistic schedules like $50 loan over 24 months
 */
export function getRepaymentPresets(amount: number): RepaymentPreset[] {
  if (!amount || amount <= 0) return [];
  
  const presets: Omit<RepaymentPreset, 'paymentAmount'>[] = [];
  
  if (amount <= 100) {
    // Small loans: 1-4 weeks
    presets.push({ frequency: 'weekly', installments: 1, label: 'Pay in full (1 week)' });
    presets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments', recommended: true });
    if (amount >= 50) {
      presets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments' });
    }
  } else if (amount <= 500) {
    // Medium-small loans: 2-8 weeks or 1-3 months
    presets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments' });
    presets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments', recommended: true });
    presets.push({ frequency: 'biweekly', installments: 4, label: '4 bi-weekly payments' });
    if (amount >= 200) {
      presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    }
  } else if (amount <= 2000) {
    // Medium loans: 1-6 months
    presets.push({ frequency: 'biweekly', installments: 4, label: '4 bi-weekly payments' });
    presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments', recommended: true });
    presets.push({ frequency: 'monthly', installments: 4, label: '4 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
  } else if (amount <= 10000) {
    // Larger loans: 3-12 months
    presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments', recommended: true });
    presets.push({ frequency: 'monthly', installments: 9, label: '9 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments' });
  } else {
    // Large loans: 6-24 months
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments', recommended: true });
    presets.push({ frequency: 'monthly', installments: 18, label: '18 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 24, label: '24 monthly payments' });
  }
  
  // Calculate payment amount for each preset
  return presets.map(preset => ({
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
 * Calculate payment amount for a given comfort level
 */
function calculatePaymentForComfort(
  disposableIncome: number,
  comfortLevel: ComfortLevel,
  payFrequency: PayFrequency,
  loanAmount: number,
  interestRate: number = 0
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
    totalRepayment: paymentAmount * numberOfPayments,
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
  interestRate: number = 0
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
    comfortable: calculatePaymentForComfort(disposableIncome, 'comfortable', profile.payFrequency, loanAmount, interestRate),
    balanced: calculatePaymentForComfort(disposableIncome, 'balanced', profile.payFrequency, loanAmount, interestRate),
    aggressive: calculatePaymentForComfort(disposableIncome, 'aggressive', profile.payFrequency, loanAmount, interestRate),
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
