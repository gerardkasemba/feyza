import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isAfter, isBefore, addDays } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Convert Date to YYYY-MM-DD string (local date, no timezone)
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Parse YYYY-MM-DD string to local Date
export function parseDateString(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  // Handle ISO strings
  if (dateStr.includes('T')) {
    const datePart = dateStr.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  return new Date(dateStr);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  // Handle date-only strings (YYYY-MM-DD) to avoid timezone issues
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    // Parse as local date by adding time component
    const [year, month, day] = date.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  }
  
  // Handle ISO strings that end with a date (from database)
  if (typeof date === 'string' && date.includes('T')) {
    // Extract just the date part and parse as local
    const datePart = date.split('T')[0];
    const [year, month, day] = datePart.split('-').map(Number);
    return format(new Date(year, month - 1, day), 'MMM d, yyyy');
  }
  
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatRelativeDate(date: string | Date): string {
  const parsedDate = typeof date === 'string' ? parseDateString(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true });
}

export function formatPercentage(rate: number): string {
  return `${rate.toFixed(2)}%`;
}

export function getPaymentStatus(dueDate: string, isPaid: boolean): 'paid' | 'upcoming' | 'due' | 'overdue' {
  if (isPaid) return 'paid';
  
  const due = parseDateString(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Reset time to start of day for comparison
  const threeDaysFromNow = addDays(today, 3);
  
  if (isBefore(due, today)) return 'overdue';
  if (isBefore(due, threeDaysFromNow)) return 'due';
  return 'upcoming';
}

export function getLoanProgress(amountPaid: number, totalAmount: number): number {
  if (totalAmount === 0) return 0;
  return Math.round((amountPaid / totalAmount) * 100);
}

export function generateInviteToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Interest calculation functions
export function calculateSimpleInterest(
  principal: number,
  annualRate: number,
  termMonths: number
): number {
  // Simple interest: I = P * r * t
  const monthlyRate = annualRate / 100 / 12;
  return principal * monthlyRate * termMonths;
}

export function calculateCompoundInterest(
  principal: number,
  annualRate: number,
  termMonths: number,
  compoundingPerYear: number = 12
): number {
  // Compound interest: A = P(1 + r/n)^(nt) - P
  const r = annualRate / 100;
  const n = compoundingPerYear;
  const t = termMonths / 12;
  const amount = principal * Math.pow(1 + r / n, n * t);
  return amount - principal;
}

export function calculateTotalInterest(
  principal: number,
  annualRate: number,
  termMonths: number,
  interestType: 'simple' | 'compound'
): number {
  if (annualRate === 0) return 0;
  
  if (interestType === 'simple') {
    return calculateSimpleInterest(principal, annualRate, termMonths);
  }
  return calculateCompoundInterest(principal, annualRate, termMonths);
}

export function calculateLoanTermMonths(
  totalInstallments: number,
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom'
): number {
  switch (frequency) {
    case 'weekly':
      return totalInstallments / 4.33; // Approx weeks per month
    case 'biweekly':
      return totalInstallments / 2.17; // Approx bi-weeks per month
    case 'monthly':
      return totalInstallments;
    default:
      return totalInstallments; // Assume monthly for custom
  }
}

export function calculateRepaymentSchedule(params: {
  amount: number;
  repaymentAmount: number;
  totalInstallments: number;
  startDate: string;
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'custom';
  interestRate?: number;
  interestType?: 'simple' | 'compound';
}): Array<{ 
  dueDate: Date; 
  amount: number; 
  principalAmount: number; 
  interestAmount: number;
}> {
  const { 
    amount, 
    repaymentAmount, 
    totalInstallments, 
    startDate, 
    frequency,
    interestRate = 0,
    interestType = 'simple'
  } = params;
  
  const schedule: Array<{ 
    dueDate: Date; 
    amount: number; 
    principalAmount: number; 
    interestAmount: number;
  }> = [];
  
  // Calculate total interest and total amount
  const termMonths = calculateLoanTermMonths(totalInstallments, frequency);
  const totalInterest = calculateTotalInterest(amount, interestRate, termMonths, interestType);
  const totalAmount = amount + totalInterest;
  
  // Calculate per-installment amounts
  const interestPerInstallment = totalInterest / totalInstallments;
  const principalPerInstallment = amount / totalInstallments;
  const amountPerInstallment = totalAmount / totalInstallments;
  
  // Parse startDate correctly - handle both YYYY-MM-DD and Date objects
  let currentDate: Date;
  if (typeof startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    // Parse date-only string as local date
    const [year, month, day] = startDate.split('-').map(Number);
    currentDate = new Date(year, month - 1, day);
  } else {
    currentDate = new Date(startDate);
  }
  let remainingPrincipal = amount;
  let remainingInterest = totalInterest;
  
  for (let i = 0; i < totalInstallments; i++) {
    const isLast = i === totalInstallments - 1;
    
    // For last payment, use remaining amounts to avoid rounding errors
    const principal = isLast ? remainingPrincipal : Math.min(principalPerInstallment, remainingPrincipal);
    const interest = isLast ? remainingInterest : Math.min(interestPerInstallment, remainingInterest);
    const payment = principal + interest;
    
    schedule.push({
      dueDate: new Date(currentDate),
      amount: Math.round(payment * 100) / 100,
      principalAmount: Math.round(principal * 100) / 100,
      interestAmount: Math.round(interest * 100) / 100,
    });
    
    remainingPrincipal -= principal;
    remainingInterest -= interest;
    
    // Calculate next date based on frequency
    switch (frequency) {
      case 'weekly':
        currentDate = addDays(currentDate, 7);
        break;
      case 'biweekly':
        currentDate = addDays(currentDate, 14);
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      default:
        currentDate = addDays(currentDate, 30);
    }
  }
  
  return schedule;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
    case 'confirmed':
    case 'paid':
      return 'text-green-600 bg-green-50';
    case 'pending':
    case 'upcoming':
      return 'text-yellow-600 bg-yellow-50';
    case 'overdue':
    case 'declined':
    case 'cancelled':
      return 'text-red-600 bg-red-50';
    case 'completed':
      return 'text-blue-600 bg-blue-50';
    case 'due':
      return 'text-orange-600 bg-orange-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '...';
}