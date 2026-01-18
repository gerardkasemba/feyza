// Smart repayment schedule calculation based on loan amount
// Prevents unrealistic schedules like $50 loan over 24 months

export interface RepaymentPreset {
  frequency: 'weekly' | 'biweekly' | 'monthly';
  installments: number;
  label: string;
  paymentAmount: number;
}

export function getRepaymentPresets(amount: number): RepaymentPreset[] {
  if (!amount || amount <= 0) return [];
  
  const presets: Omit<RepaymentPreset, 'paymentAmount'>[] = [];
  
  if (amount <= 100) {
    // Small loans: 1-4 weeks
    presets.push({ frequency: 'weekly', installments: 1, label: 'Pay in full (1 week)' });
    presets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments' });
    if (amount >= 50) {
      presets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments' });
    }
  } else if (amount <= 500) {
    // Medium-small loans: 2-8 weeks or 1-3 months
    presets.push({ frequency: 'weekly', installments: 2, label: '2 weekly payments' });
    presets.push({ frequency: 'weekly', installments: 4, label: '4 weekly payments' });
    presets.push({ frequency: 'monthly', installments: 2, label: '2 monthly payments' });
    if (amount >= 200) {
      presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    }
  } else if (amount <= 2000) {
    // Medium loans: 1-6 months
    presets.push({ frequency: 'monthly', installments: 2, label: '2 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 4, label: '4 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
  } else if (amount <= 10000) {
    // Larger loans: 3-12 months
    presets.push({ frequency: 'monthly', installments: 3, label: '3 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 9, label: '9 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments' });
  } else {
    // Large loans: 6-24 months
    presets.push({ frequency: 'monthly', installments: 6, label: '6 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 12, label: '12 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 18, label: '18 monthly payments' });
    presets.push({ frequency: 'monthly', installments: 24, label: '24 monthly payments' });
  }
  
  // Calculate payment amount for each preset
  return presets.map(preset => ({
    ...preset,
    paymentAmount: Math.ceil(amount / preset.installments),
  }));
}

// Validate repayment schedule is realistic for the loan amount
export function validateRepaymentSchedule(
  amount: number, 
  frequency: string, 
  installments: number
): { valid: boolean; message?: string } {
  // Calculate minimum payment per period (at least $10 or 5% of loan)
  const minPayment = Math.max(10, amount * 0.05);
  const paymentAmount = amount / installments;
  
  if (paymentAmount < minPayment) {
    return { 
      valid: false, 
      message: `Payment amount is too small. Each payment should be at least $${minPayment.toFixed(0)}.` 
    };
  }
  
  // Calculate max duration based on loan size
  let maxInstallments: number;
  if (amount <= 100) {
    maxInstallments = frequency === 'weekly' ? 4 : 1; // Max 1 month
  } else if (amount <= 500) {
    maxInstallments = frequency === 'weekly' ? 8 : 3; // Max 2-3 months
  } else if (amount <= 2000) {
    maxInstallments = frequency === 'monthly' ? 6 : 24; // Max 6 months
  } else if (amount <= 10000) {
    maxInstallments = frequency === 'monthly' ? 12 : 52; // Max 12 months
  } else {
    maxInstallments = frequency === 'monthly' ? 24 : 104; // Max 24 months
  }
  
  if (installments > maxInstallments) {
    return { 
      valid: false, 
      message: `Repayment period is too long. Maximum ${maxInstallments} ${frequency} payments for this loan amount.` 
    };
  }
  
  return { valid: true };
}
