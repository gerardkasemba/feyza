import { describe, it, expect } from 'vitest';
import {
  getRepaymentPresets,
  validateRepaymentSchedule,
  calculateMonthlyIncome,
  calculateMonthlyExpenses,
  calculateDisposableIncome,
  isPaymentSafe,
  formatPayFrequency,
} from '@/lib/smartSchedule';

// ─── getRepaymentPresets ──────────────────────────────────────────────────────

describe('getRepaymentPresets', () => {
  it('returns empty array for zero amount', () => {
    expect(getRepaymentPresets(0)).toEqual([]);
  });

  it('returns empty array for negative amount', () => {
    expect(getRepaymentPresets(-50)).toEqual([]);
  });

  it('returns weekly presets for small loans ($50)', () => {
    const presets = getRepaymentPresets(50);
    expect(presets.length).toBeGreaterThan(0);
    presets.forEach((p) => {
      expect(p.paymentAmount).toBeGreaterThan(0);
      expect(['weekly', 'biweekly', 'monthly']).toContain(p.frequency);
    });
  });

  it('paymentAmount * installments >= loan amount for each preset', () => {
    [100, 500, 1000, 5000, 15000].forEach((amount) => {
      const presets = getRepaymentPresets(amount);
      presets.forEach((p) => {
        // Each installment is ceil(amount / installments), so total >= amount
        expect(p.paymentAmount * p.installments).toBeGreaterThanOrEqual(amount);
      });
    });
  });

  it('has exactly one recommended preset (or none)', () => {
    [50, 200, 1000, 8000].forEach((amount) => {
      const recommended = getRepaymentPresets(amount).filter((p) => p.recommended);
      expect(recommended.length).toBeLessThanOrEqual(1);
    });
  });

  it('includes longer terms for large loans ($15000)', () => {
    const presets = getRepaymentPresets(15000);
    const maxInstallments = Math.max(...presets.map((p) => p.installments));
    expect(maxInstallments).toBeGreaterThanOrEqual(12);
  });
});

// ─── validateRepaymentSchedule ────────────────────────────────────────────────

describe('validateRepaymentSchedule', () => {
  it('rejects zero amount', () => {
    const result = validateRepaymentSchedule(0, 'monthly', 3);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/invalid loan amount/i);
  });

  it('rejects zero installments', () => {
    const result = validateRepaymentSchedule(500, 'monthly', 0);
    expect(result.valid).toBe(false);
  });

  it('rejects negative installments', () => {
    const result = validateRepaymentSchedule(500, 'monthly', -1);
    expect(result.valid).toBe(false);
  });

  it('accepts valid $100 weekly 2-installment plan', () => {
    const result = validateRepaymentSchedule(100, 'weekly', 2);
    expect(result.valid).toBe(true);
    expect(result.paymentAmount).toBe(50);
  });

  it('rejects plan where payment is below minimum ($10 or 5%)', () => {
    // $100 / 20 = $5 — below $10 minimum
    const result = validateRepaymentSchedule(100, 'weekly', 20);
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/too small/i);
  });

  it('rejects too many installments for small loan ($100 monthly 12)', () => {
    // $100/12 ≈ $8.33 — below $10 minimum, fails with "too small" error
    // Either way the schedule is invalid
    const result = validateRepaymentSchedule(100, 'monthly', 12);
    expect(result.valid).toBe(false);
  });

  it('accepts $10000 monthly 12-installment plan', () => {
    const result = validateRepaymentSchedule(10000, 'monthly', 12);
    expect(result.valid).toBe(true);
    expect(result.paymentAmount).toBeCloseTo(834, 0); // ceil(10000/12)
  });

  it('paymentAmount is always Math.ceil(amount/installments)', () => {
    const result = validateRepaymentSchedule(1000, 'monthly', 3);
    expect(result.paymentAmount).toBe(334); // ceil(1000/3)
  });
});

// ─── calculateMonthlyIncome ───────────────────────────────────────────────────

describe('calculateMonthlyIncome', () => {
  it('converts weekly pay to monthly (× 4.33)', () => {
    const monthly = calculateMonthlyIncome(1000, 'weekly');
    expect(monthly).toBe(4330); // 1000 × 4.33 = 4330
  });

  it('converts biweekly pay to monthly (× 2.17)', () => {
    const monthly = calculateMonthlyIncome(2000, 'biweekly');
    expect(monthly).toBe(4340); // 2000 × 2.17 = 4340
  });

  it('keeps monthly pay as-is', () => {
    expect(calculateMonthlyIncome(5000, 'monthly')).toBe(5000);
  });

  it('converts semimonthly pay to monthly (× 2)', () => {
    expect(calculateMonthlyIncome(2500, 'semimonthly')).toBe(5000);
  });

  it('returns 0 for 0 pay amount', () => {
    expect(calculateMonthlyIncome(0, 'monthly')).toBe(0);
  });
});

// ─── calculateMonthlyExpenses ─────────────────────────────────────────────────

describe('calculateMonthlyExpenses', () => {
  it('sums all expense categories', () => {
    const expenses = calculateMonthlyExpenses({
      rentMortgage: 1200,
      utilities: 100,
      transportation: 300,
      insurance: 150,
      groceries: 400,
      phone: 80,
      subscriptions: 50,
      childcare: 0,
      otherBills: 200,
      existingDebtPayments: 500,
    });
    expect(expenses).toBe(2980);
  });

  it('handles partial profile gracefully', () => {
    const expenses = calculateMonthlyExpenses({ rentMortgage: 1000 });
    expect(expenses).toBe(1000);
  });

  it('returns 0 for empty profile', () => {
    expect(calculateMonthlyExpenses({})).toBe(0);
  });
});

// ─── calculateDisposableIncome ────────────────────────────────────────────────

describe('calculateDisposableIncome', () => {
  it('returns income minus expenses', () => {
    expect(calculateDisposableIncome(5000, 3000)).toBe(2000);
  });

  it('clamps to 0 when expenses exceed income', () => {
    expect(calculateDisposableIncome(1000, 2000)).toBe(0);
  });

  it('returns full income when expenses are 0', () => {
    expect(calculateDisposableIncome(4000, 0)).toBe(4000);
  });
});

// ─── isPaymentSafe ────────────────────────────────────────────────────────────

describe('isPaymentSafe', () => {
  it('marks payment as safe when monthly total is ≤25% of disposable income', () => {
    // $500 monthly, $3000 disposable = 16.7% — comfortably safe
    const result = isPaymentSafe(500, 'monthly', 3000);
    expect(result.safe).toBe(true);
    expect(result.percentage).toBeCloseTo(16.7, 0);
  });

  it('marks payment as unsafe when monthly total exceeds 35% of disposable income', () => {
    // $1100 monthly, $3000 disposable = 36.7% — unsafe
    const result = isPaymentSafe(1100, 'monthly', 3000);
    expect(result.safe).toBe(false);
    expect(result.percentage).toBeCloseTo(36.7, 0);
  });

  it('marks aggressive-but-safe range (25–35%)', () => {
    // $900 monthly, $3000 disposable = 30% — aggressive but safe
    const result = isPaymentSafe(900, 'monthly', 3000);
    expect(result.safe).toBe(true);
    expect(result.message).toMatch(/aggressive/i);
  });

  it('converts weekly payments to monthly before comparing', () => {
    // $200/week × 4.33 ≈ $866/month, disposable $3000 = ~28.9% — aggressive but safe
    const result = isPaymentSafe(200, 'weekly', 3000);
    expect(result.safe).toBe(true);
    expect(result.percentage).toBeGreaterThan(25);
  });

  it('includes a percentage in the result', () => {
    const result = isPaymentSafe(300, 'monthly', 1000);
    expect(result).toHaveProperty('percentage');
    expect(result.percentage).toBe(30);
  });
});

// ─── formatPayFrequency ───────────────────────────────────────────────────────

describe('formatPayFrequency', () => {
  it('formats known frequencies', () => {
    expect(formatPayFrequency('weekly')).toMatch(/weekly/i);
    expect(formatPayFrequency('biweekly')).toMatch(/bi-?weekly|every 2 weeks/i);
    expect(formatPayFrequency('monthly')).toMatch(/monthly/i);
    expect(formatPayFrequency('semimonthly')).toMatch(/semi-?monthly|twice a month/i);
  });
});
