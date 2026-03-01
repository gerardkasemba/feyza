/**
 * Contract HTML generation tests
 *
 * generateContractHtml is a pure function that takes loan data and returns
 * an HTML string. These tests verify the output contains key loan details
 * and that edge cases are handled gracefully.
 */

import { describe, it, expect } from 'vitest';
import { generateContractHtml, escapeHtml } from '@/app/api/contracts/contractHtml';

// ─── Test fixtures ─────────────────────────────────────────────────────────────

const baseLoan = {
  id: 'loan-test-123',
  borrower_id: 'borrower-1',
  lender_type: 'personal' as const,
  amount: 1000,
  currency: 'USD',
  purpose: 'Emergency medical',
  interest_rate: 5,
  interest_type: 'simple',
  total_interest: 50,
  total_amount: 1050,
  repayment_frequency: 'monthly',
  repayment_amount: 350,
  total_installments: 3,
  start_date: '2025-03-01',
  created_at: '2025-02-01T10:00:00Z',
  borrower_signed: false,
  lender_signed: false,
  borrower: {
    id: 'borrower-1',
    full_name: 'Jane Borrower',
    email: 'jane@example.com',
  },
  lender: {
    id: 'lender-1',
    full_name: 'John Lender',
    email: 'john@example.com',
  },
  business_lender: null,
  schedule: [
    { due_date: '2025-04-01', amount: 350, principal_amount: 333.33, interest_amount: 16.67, is_paid: false },
    { due_date: '2025-05-01', amount: 350, principal_amount: 333.33, interest_amount: 16.67, is_paid: false },
    { due_date: '2025-06-01', amount: 350, principal_amount: 333.34, interest_amount: 16.66, is_paid: false },
  ],
};

// ─── escapeHtml ───────────────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes < and > characters', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes & character', () => {
    expect(escapeHtml('Cats & Dogs')).toBe('Cats &amp; Dogs');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('handles non-string input gracefully', () => {
    expect(escapeHtml(undefined as unknown as string)).toBe('');
    expect(escapeHtml(null as unknown as string)).toBe('');
  });
});

// ─── generateContractHtml ─────────────────────────────────────────────────────

describe('generateContractHtml', () => {
  describe('basic output', () => {
    it('returns a non-empty HTML string', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toBeTruthy();
      expect(typeof html).toBe('string');
    });

    it('starts with DOCTYPE', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html.trim()).toMatch(/^<!DOCTYPE html>/i);
    });

    it('includes the loan amount', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('1,000');
    });

    it('includes the currency', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('USD');
    });
  });

  describe('party names', () => {
    it('includes borrower name', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('Jane Borrower');
    });

    it('includes lender name for individual lender', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('John Lender');
    });

    it('uses business lender name when lender_type is business', () => {
      const bizLoan = {
        ...baseLoan,
        lender_type: 'business' as const,
        lender: null,
        business_lender: {
          id: 'biz-1',
          business_name: 'ABC Finance Ltd',
          contact_email: 'info@abc.com',
          owner: null,
        },
      };
      const html = generateContractHtml(bizLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('ABC Finance Ltd');
    });

    it('falls back to invite_email when no lender assigned', () => {
      const pendingLoan = {
        ...baseLoan,
        lender: null,
        invite_email: 'friend@example.com',
      };
      const html = generateContractHtml(pendingLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('friend@example.com');
    });
  });

  describe('loan terms', () => {
    it('includes the purpose', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('Emergency medical');
    });

    it('includes interest rate', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('5%');
    });

    it('shows zero-interest note when interest_rate is 0', () => {
      const noInterestLoan = { ...baseLoan, interest_rate: 0, total_interest: 0, total_amount: 1000 };
      const html = generateContractHtml(noInterestLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toMatch(/0%|no interest/i);
    });

    it('includes repayment frequency', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html.toLowerCase()).toContain('monthly');
    });

    it('includes total installments', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('3');
    });
  });

  describe('payment schedule', () => {
    it('renders schedule rows for each payment', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      // 3 payments in the schedule
      const paymentCount = (html.match(/350/g) || []).length;
      expect(paymentCount).toBeGreaterThanOrEqual(3);
    });

    it('handles empty schedule gracefully', () => {
      const noScheduleLoan = { ...baseLoan, schedule: [] };
      const html = generateContractHtml(noScheduleLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toBeTruthy();
    });
  });

  describe('signature status', () => {
    it('shows unsigned status when no signatures', () => {
      const html = generateContractHtml(baseLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      // Should not show signed timestamps since neither has signed
      expect(html).not.toContain('undefined');
    });

    it('includes borrower signed date when borrower has signed', () => {
      const signedLoan = {
        ...baseLoan,
        borrower_signed: true,
        borrower_signed_at: '2025-02-15T14:30:00Z',
      };
      const html = generateContractHtml(signedLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).toContain('Feb 15, 2025');
    });
  });

  describe('XSS safety', () => {
    it('escapes malicious content in purpose field', () => {
      const xssLoan = {
        ...baseLoan,
        purpose: '<script>alert("xss")</script>',
      };
      const html = generateContractHtml(xssLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).not.toContain('<script>');
      expect(html).toContain('&lt;script&gt;');
    });

    it('escapes malicious content in borrower name', () => {
      const xssLoan = {
        ...baseLoan,
        borrower: {
          ...baseLoan.borrower,
          full_name: '"><img src=x onerror=alert(1)>',
        },
      };
      const html = generateContractHtml(xssLoan as unknown as Parameters<typeof generateContractHtml>[0]);
      expect(html).not.toContain('<img src=x');
    });
  });
});
