import { z } from 'zod';

export const signUpSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  userType: z.enum(['individual', 'business']),
});

export const signInSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export const businessProfileSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.string().min(1, 'Please select a business type'),
  description: z.string().optional(),
  location: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().optional(),
  // Interest rate settings
  defaultInterestRate: z.number().min(0).max(100).default(0),
  interestType: z.enum(['simple', 'compound']).default('simple'),
  minLoanAmount: z.number().min(0).optional(),
  maxLoanAmount: z.number().min(0).optional(),
});

export const loanRequestSchema = z.object({
  lenderType: z.enum(['business', 'personal']),
  businessId: z.string().optional(),
  inviteEmail: z.string().email().optional().or(z.literal('')),
  invitePhone: z.string().optional(),
  amount: z.number().min(1, 'Amount must be at least 1'),
  currency: z.string().default('USD'),
  purpose: z.string().optional(),
  // Interest (optional for personal loans, set by business for business loans)
  interestRate: z.number().min(0).max(100).optional().default(0),
  interestType: z.enum(['simple', 'compound']).optional().default('simple'),
  repaymentFrequency: z.enum(['weekly', 'biweekly', 'monthly', 'custom']),
  repaymentAmount: z.number().optional(), // Calculated, not required from form
  totalInstallments: z.number().min(1, 'Must have at least 1 installment'),
  startDate: z.string().min(1, 'Start date is required'),
  pickupPersonName: z.string().optional(),
  pickupPersonLocation: z.string().optional(),
}).refine((data) => {
  if (data.lenderType === 'business') {
    return !!data.businessId;
  }
  return !!data.inviteEmail || !!data.invitePhone;
}, {
  message: 'Please select a business or provide contact info for personal loan',
  path: ['lenderType'],
});

export const paymentSchema = z.object({
  amount: z.number().min(0.01, 'Amount must be greater than 0'),
  note: z.string().optional(),
  proofUrl: z.string().url().optional().or(z.literal('')),
});

export const inviteResponseSchema = z.object({
  action: z.enum(['accept', 'decline']),
  note: z.string().optional(),
});

export type SignUpFormData = z.infer<typeof signUpSchema>;
export type SignInFormData = z.infer<typeof signInSchema>;
export type BusinessProfileFormData = z.infer<typeof businessProfileSchema>;
export type LoanRequestFormData = z.infer<typeof loanRequestSchema>;
export type PaymentFormData = z.infer<typeof paymentSchema>;
export type InviteResponseFormData = z.infer<typeof inviteResponseSchema>;
