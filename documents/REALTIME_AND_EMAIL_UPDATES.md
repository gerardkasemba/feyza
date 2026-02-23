# Feyza Platform Updates

## 1. Real-time Updates with Supabase

### Overview
The platform now supports live updates using Supabase Real-time subscriptions. Changes to loans, payments, notifications, and other data are automatically pushed to connected clients.

### New Files Created

#### `/src/hooks/useRealtimeSubscription.ts`
A comprehensive set of hooks for subscribing to real-time database changes:

```typescript
// Core hooks
useRealtimeSubscription<T>(config, enabled)  // Generic subscription
useBroadcastChannel(channelName, eventName, onMessage, enabled)  // Custom events
usePresence(channelName, userInfo, enabled)  // Who's online tracking

// Specialized hooks
useLoanSubscription(loanId, callbacks)
useUserLoansSubscription(userId, callbacks)
usePaymentScheduleSubscription(loanId, callbacks)
useNotificationsSubscription(userId, callbacks)
useLoanRequestSubscription(requestId, callbacks)
useTransferSubscription(loanId, callbacks)
useBusinessProfileSubscription(businessId, callbacks)
usePendingVerificationsSubscription(callbacks, enabled)
usePaymentsSubscription(loanId, callbacks)
```

**Usage Example:**
```tsx
import { useLoanSubscription, useNotificationsSubscription } from '@/hooks';

function LoanDetails({ loanId, userId }) {
  const [loan, setLoan] = useState(null);
  
  // Subscribe to loan updates
  const { isConnected } = useLoanSubscription(loanId, {
    onUpdate: (updatedLoan) => {
      setLoan(updatedLoan);
      toast.success('Loan updated!');
    }
  });
  
  // Subscribe to notifications
  useNotificationsSubscription(userId, {
    onInsert: (notification) => {
      toast.info(notification.title);
    }
  });
  
  return (
    <div>
      {isConnected && <span className="text-green-500">● Live</span>}
      {/* loan details */}
    </div>
  );
}
```

#### `/src/components/providers/RealtimeProvider.tsx`
A React context provider that manages app-wide real-time subscriptions with notifications support.

#### `/src/components/ui/NotificationBell.tsx`
A ready-to-use notification bell component with live updates, unread count, and browser notifications.

---

## 2. Email System Verification ✅

### All emails are centralized in `/src/lib/email.ts`

**Verification Results:**
- ✅ **29 API routes** import from `@/lib/email`
- ✅ **30 email template functions** available
- ✅ **0 files** use nodemailer directly (only email.ts)
- ✅ All emails use consistent Feyza branding

### Email Template Functions (30 total)

#### Core Functions
| Function | Purpose |
|----------|---------|
| `sendEmail()` | Main email sending function |

#### Loan Request Emails
| Function | Purpose |
|----------|---------|
| `getLoanRequestSubmittedEmail()` | Guest submits loan request |
| `getNewLoanRequestForLenderEmail()` | New request notification to lender |
| `getNoMatchFoundEmail()` | No matching lenders found |
| `getLoanInviteEmail()` | Invite someone to lend |

#### Loan Acceptance Emails
| Function | Purpose |
|----------|---------|
| `getLoanAcceptedBorrowerEmail()` | Acceptance notification to borrower |
| `getLoanAcceptedLenderEmail()` | Confirmation to lender |
| `getLoanAcceptedEmail()` | Legacy acceptance email |

#### Funds & Disbursement Emails
| Function | Purpose |
|----------|---------|
| `getFundsOnTheWayEmail()` | Funds sent notification |
| `getFundsArrivedEmail()` | Funds received notification |
| `getDisbursementFailedEmail()` | Disbursement failure alert |

#### Payment Emails
| Function | Purpose |
|----------|---------|
| `getPaymentReminderEmail()` | Payment due reminder |
| `getPaymentConfirmationEmail()` | Payment confirmed |
| `getPaymentReceivedLenderEmail()` | Payment received by lender |
| `getMissedPaymentEmail()` | Missed payment alert |
| `getOverduePaymentEmail()` | Overdue payment notice |
| `getMissedPaymentLenderNotification()` | Notify lender of missed payment |
| `getPaymentProcessedEmail()` | Payment processed (borrower) |
| `getPaymentReceivedEmail()` | Payment received (lender) |
| `getPaymentConfirmationNeededEmail()` | Guest borrower confirm payment |

#### Business Emails
| Function | Purpose |
|----------|---------|
| `getBusinessApprovedEmail()` | Business verification approved |
| `getBusinessRejectedEmail()` | Business verification rejected |

#### Other Emails
| Function | Purpose |
|----------|---------|
| `getLoanCancelledEmail()` | Loan cancellation notice |
| `getCashPickupReminderEmail()` | Cash pickup reminder |
| `getDashboardAccessEmail()` | Dashboard access link |
| `getAutoPayReminderEmail()` | Auto-pay charge reminder |
| `getAutoChargeWarningEmail()` | Day-before auto-charge warning |
| `getNewMatchForLenderEmail()` | New loan match notification |
| `getAccessLoansEmail()` | Guest borrower access link |
| `getLoanRematchedEmail()` | Loan matched with new lender |
| `getNoLendersAvailableEmail()` | No lenders after all expired |

### API Routes Using Emails

All 29 routes import from `@/lib/email`:
- `/api/payments/confirm` - Payment confirmation
- `/api/payments/create` - New payment
- `/api/guest-loan-request` - Guest loan submission
- `/api/guest-loan-request/[id]/accept` - Accept guest request
- `/api/admin/business/approve` - Business approval/rejection
- `/api/matching` - Loan matching notifications
- `/api/matching/[id]` - Match acceptance
- `/api/notifications/loan-request` - Loan request notifications
- `/api/notifications/payment` - Payment notifications
- `/api/lender/access` - Lender dashboard access
- `/api/lender/setup-loan/[id]` - Loan setup completion
- `/api/reminders` - Payment reminders
- `/api/invite/accept` - Invite acceptance
- `/api/invite/send` - Send loan invite
- `/api/cron/match-expiry` - Match expiration handling
- `/api/cron/auto-pay` - Automatic payments
- `/api/cron/payment-reminders` - Scheduled reminders
- `/api/loans/[id]/accept` - Loan acceptance
- `/api/loans/[id]/fund` - Loan funding
- `/api/loans/[id]/funds` - Funds confirmation
- `/api/loans/[id]/cancel` - Loan cancellation
- `/api/loans/[id]/remind` - Manual reminder
- `/api/dwolla/transfer` - Dwolla transfers
- `/api/dwolla/webhook` - Dwolla webhooks
- `/api/guest-borrower/[token]` - Guest borrower actions
- `/api/guest-borrower/access` - Guest access requests
- `/api/paypal/charge` - PayPal charges
- `/api/agent/disbursements` - Agent disbursements
- `/api/agent/disbursements/[id]` - Specific disbursement

---

## 3. Supabase Real-time Setup

### Enable Real-time for Tables

Run this SQL in your Supabase dashboard:

```sql
-- Enable real-time for key tables
ALTER PUBLICATION supabase_realtime ADD TABLE loans;
ALTER PUBLICATION supabase_realtime ADD TABLE payment_schedule;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE loan_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE transfers;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE business_profiles;

-- Verify enabled tables
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

A migration file is also available: `/supabase/migrations/027_enable_realtime.sql`

---

## 4. Integration Guide

### Adding Real-time to Your App

1. **Wrap your app with RealtimeProvider:**
```tsx
// In a client layout component
'use client';
import { RealtimeProvider } from '@/components/providers';

export default function AppLayout({ children, userId }) {
  return (
    <RealtimeProvider userId={userId}>
      {children}
    </RealtimeProvider>
  );
}
```

2. **Add NotificationBell to Navbar:**
```tsx
import { NotificationBell } from '@/components/ui';

function Navbar() {
  return (
    <nav>
      {/* other nav items */}
      <NotificationBell />
    </nav>
  );
}
```

3. **Subscribe to specific updates:**
```tsx
import { useLoanSubscription, usePaymentsSubscription } from '@/hooks';

function LoanPage({ loanId }) {
  useLoanSubscription(loanId, {
    onUpdate: (loan) => {
      console.log('Loan updated:', loan.status);
      refreshData();
    }
  });
  
  usePaymentsSubscription(loanId, {
    onInsert: (payment) => {
      toast.success(`Payment of ${payment.amount} received!`);
    }
  });
}
```

### Using Email Templates

```typescript
import { 
  sendEmail, 
  getLoanAcceptedBorrowerEmail,
  getPaymentReminderEmail 
} from '@/lib/email';

// Generate and send email
const emailContent = getLoanAcceptedBorrowerEmail({
  borrowerName: 'John',
  lenderName: 'Acme Lending',
  amount: 500,
  currency: 'USD',
  interestRate: 10,
  loanId: 'loan-123',
});

await sendEmail({
  to: 'john@example.com',
  subject: emailContent.subject,
  html: emailContent.html,
});
```

---

## 5. Files Summary

### New/Updated Files
| File | Description |
|------|-------------|
| `/src/hooks/useRealtimeSubscription.ts` | Real-time subscription hooks (12 hooks) |
| `/src/hooks/index.ts` | Hooks barrel export |
| `/src/components/providers/RealtimeProvider.tsx` | Real-time context provider |
| `/src/components/providers/index.ts` | Providers barrel export |
| `/src/components/ui/NotificationBell.tsx` | Notification bell component |
| `/src/lib/email.ts` | Centralized email templates (30 functions) |
| `/supabase/migrations/027_enable_realtime.sql` | Enable real-time migration |

### Environment Variables
No new environment variables required. Uses existing:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
