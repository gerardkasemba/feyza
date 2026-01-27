# Feyza - Peer-to-Peer Lending Platform Documentation

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Technology Stack](#technology-stack)
3. [Architecture Overview](#architecture-overview)
4. [User Roles & Flows](#user-roles--flows)
5. [Core Features](#core-features)
6. [Database Schema](#database-schema)
7. [API Routes](#api-routes)
8. [Key Components](#key-components)
9. [Third-Party Integrations](#third-party-integrations)
10. [Admin Panel](#admin-panel)
11. [Scheduled Jobs (Cron)](#scheduled-jobs-cron)

---

## Platform Overview

**Feyza** (formerly LoanTrack) is a peer-to-peer lending platform that facilitates informal lending between:
- **Friends & Family** (Personal loans)
- **Verified Business Lenders** (Business loans with automatic matching)

### Key Value Propositions
- **No account required for guests** - Borrowers can request loans without creating an account
- **Automatic lender matching** - Loan requests are matched with suitable business lenders
- **Bank-to-bank payments** - ACH transfers via Dwolla for automated payments
- **Smart repayment scheduling** - Intelligent payment schedules based on income
- **Trust & rating system** - Graduated borrowing limits based on repayment history
- **Email reminders** - Automated payment reminders and notifications

---

## Technology Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TypeScript** | Type-safe development |
| **Tailwind CSS** | Utility-first styling |
| **Lucide React** | Icon library |
| **React Hook Form + Zod** | Form handling & validation |

### Backend
| Technology | Purpose |
|------------|---------|
| **Supabase** | PostgreSQL database + Auth + RLS |
| **Next.js API Routes** | Serverless API endpoints |
| **Nodemailer** | Email sending (SMTP) |

### Payment Infrastructure
| Service | Purpose |
|---------|---------|
| **Plaid** | Bank account connection & verification |
| **Dwolla** | ACH transfers (bank-to-bank payments) |
| **PayPal** | Alternative payment method |

### Key Dependencies
```json
{
  "next": "^14.2.0",
  "@supabase/supabase-js": "^2.89.0",
  "plaid": "^41.0.0",
  "dwolla-v2": "^3.4.0",
  "@paypal/react-paypal-js": "^8.9.2",
  "nodemailer": "^6.10.1",
  "date-fns": "^3.0.0"
}
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  Landing    │  │  Dashboard  │  │  Admin Panel            │  │
│  │  Page       │  │  (Users)    │  │  (Platform Management)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐ │
│  │  Auth    │  │  Loans   │  │ Payments │  │  Matching Engine │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
┌───────────────┐    ┌───────────────┐    ┌───────────────┐
│   Supabase    │    │    Plaid      │    │    Dwolla     │
│   (Database)  │    │   (Banking)   │    │    (ACH)      │
└───────────────┘    └───────────────┘    └───────────────┘
```

---

## User Roles & Flows

### 1. Guest Borrower Flow
```
Guest visits landing page
        │
        ▼
Fills loan request form (no account)
        │
        ▼
Connects bank via Plaid
        │
        ▼
Submits request → Loan request created
        │
        ▼
System attempts to match with lenders
        │
        ├── Match found → Lender reviews → Accept/Decline
        │                                      │
        │                            ┌─────────┴─────────┐
        │                            ▼                   ▼
        │                       Accepted             Declined
        │                            │
        │                            ▼
        │              Funds disbursed via Dwolla
        │                            │
        │                            ▼
        │              Auto-pay collects repayments
        │
        └── No match → Borrower notified, can share link to invite lenders
```

### 2. Registered User Flow
```
User signs up/logs in
        │
        ▼
Dashboard shows:
- Active loans (borrowed/lent)
- Payment schedule
- Trust score & borrowing limit
        │
        ├── Request Loan
        │       │
        │       ▼
        │   Choose: Business lender OR Personal (invite friend)
        │       │
        │       ├── Business: Auto-matching
        │       └── Personal: Send invite via email
        │
        └── Become a Lender (Business)
                │
                ▼
        Set up business profile
                │
                ▼
        Configure lending preferences
        (rates, limits, auto-accept rules)
```

### 3. Business Lender Flow
```
Register as Business
        │
        ▼
Complete business profile
(Name, type, EIN, verification docs)
        │
        ▼
Set lending preferences:
- Min/Max loan amounts
- Interest rates
- Capital pool
- Auto-accept rules
- First-time borrower limits
        │
        ▼
Get verified by admin
        │
        ▼
Start receiving matched loan requests
        │
        ▼
Review & approve loans
        │
        ▼
Disburse funds → Collect repayments
```

---

## Core Features

### 1. Loan Matching System (`/api/matching`)
The matching engine automatically pairs loan requests with suitable lenders:

```typescript
// Matching criteria
- Amount within lender's min/max range
- Sufficient capital pool available
- First-time borrower restrictions
- Geographic/currency matching
- Auto-accept vs manual review
```

**Match Scoring:**
- Capital availability
- Interest rate competitiveness
- Lender reliability score
- First-time borrower allowance

### 2. Smart Schedule (`/lib/smartSchedule.ts`)
Intelligent repayment scheduling based on:

```typescript
// Simple presets for guests
- Based on loan amount size
- Prevents unrealistic schedules (e.g., $50 over 24 months)

// Income-based for registered users
- Pay frequency (weekly/biweekly/monthly)
- Monthly expenses analysis
- Disposable income calculation
- Comfort level preferences
```

**Repayment Presets by Amount:**
| Amount | Options |
|--------|---------|
| ≤$100 | 1-4 weekly payments |
| $100-500 | 2-8 weeks or 1-3 months |
| $500-2000 | 1-6 months |
| $2000-10000 | 3-12 months |
| >$10000 | 6-24 months |

### 3. Trust & Rating System
Borrowers build trust through repayment history:

```typescript
// Trust Tiers (for business loans)
Tier 1: $150 max (new borrowers)
Tier 2: $300 max (2 completed loans)
Tier 3: $500 max (5 completed loans)
Tier 4: $1000 max (9 completed loans)
Tier 5: $2000 max (14+ completed loans)

// Rating System
'great'   - 95%+ on-time, 4+ payments
'good'    - 85%+ on-time, 3+ payments
'neutral' - 70%+ on-time
'poor'    - 50-70% on-time
'bad'     - <50% on-time, 3+ payments
```

### 4. Payment Processing

**Disbursement Flow:**
```
Lender approves loan
        │
        ▼
System creates Dwolla transfer:
Lender Bank → Master Account → Borrower Bank
        │
        ▼
Platform fee deducted (configurable)
        │
        ▼
Net amount sent to borrower
```

**Repayment Flow (Auto-pay):**
```
Cron job runs daily at 8 AM
        │
        ▼
Find payments due today
        │
        ▼
For each payment:
  - Verify borrower has bank connected
  - Verify lender has bank connected
  - Create facilitated transfer
  - Borrower Bank → Master Account → Lender Bank
        │
        ▼
Update loan balance & schedule
        │
        ▼
Send notifications
```

---

## Database Schema

### Core Tables

#### `users`
```sql
- id (UUID, PK, references auth.users)
- email, full_name, phone, username
- user_type ('individual' | 'business')
- Bank connection fields (Plaid/Dwolla)
- PayPal connection fields
- Borrower stats (rating, tier, payment history)
- Notification preferences
```

#### `business_profiles`
```sql
- id (UUID, PK)
- user_id (FK to users)
- business_name, business_type
- Verification fields (EIN, state, etc.)
- Lending settings (rates, limits)
- Public profile (slug, logo)
- Verification status
```

#### `loans`
```sql
- id (UUID, PK)
- borrower_id, lender_id, business_lender_id
- lender_type ('business' | 'personal')
- Loan details (amount, currency, purpose)
- Interest settings (rate, type, totals)
- Repayment terms (frequency, installments)
- Contract/signature tracking
- Disbursement method & details
- Dwolla transfer tracking
- Status tracking
```

#### `payment_schedule`
```sql
- id (UUID, PK)
- loan_id (FK)
- due_date, amount
- principal_amount, interest_amount
- is_paid, payment_id
- Reminder tracking fields
```

#### `payments`
```sql
- id (UUID, PK)
- loan_id (FK)
- schedule_id (FK)
- amount, payment_date
- status ('pending' | 'confirmed' | 'disputed')
- Dwolla transfer tracking
- proof_url (for manual payments)
```

#### `loan_requests` (Guest borrowers)
```sql
- id (UUID, PK)
- borrower_name, borrower_email
- amount, currency, purpose
- Proposed repayment schedule
- Access token & expiry
- Dwolla/bank connection info
- Status tracking
```

#### `lender_preferences`
```sql
- id (UUID, PK)
- user_id, business_id
- min_amount, max_amount
- interest_rate, capital_pool
- auto_accept rules
- First-time borrower settings
```

---

## API Routes

### Authentication
| Route | Method | Description |
|-------|--------|-------------|
| `/api/auth/callback` | GET | Supabase auth callback |
| `/auth/signin` | Page | Sign in form |
| `/auth/signup` | Page | Sign up form |
| `/auth/signout` | Route | Sign out handler |

### Loans
| Route | Method | Description |
|-------|--------|-------------|
| `/api/loans/[id]/accept` | POST | Accept loan request |
| `/api/loans/[id]/decline` | POST | Decline loan request |
| `/api/loans/[id]/cancel` | POST | Cancel loan |
| `/api/loans/[id]/fund` | POST | Mark funds sent |
| `/api/loans/[id]/remind` | POST | Send manual reminder |

### Payments
| Route | Method | Description |
|-------|--------|-------------|
| `/api/payments/create` | POST | Record manual payment |
| `/api/payments/confirm` | POST | Confirm payment received |

### Matching
| Route | Method | Description |
|-------|--------|-------------|
| `/api/matching` | POST | Run matching for loan |
| `/api/matching` | GET | Get match status |
| `/api/matching/[id]` | GET/POST | Manage specific match |

### Guest Flows
| Route | Method | Description |
|-------|--------|-------------|
| `/api/guest-loan-request` | POST | Submit guest loan request |
| `/api/guest-borrower/access` | POST | Get guest borrower access |
| `/api/guest-lender/[token]` | GET | Get lender invite details |

### Banking (Plaid/Dwolla)
| Route | Method | Description |
|-------|--------|-------------|
| `/api/plaid/link-token` | POST | Get Plaid link token |
| `/api/plaid/exchange` | POST | Exchange Plaid public token |
| `/api/dwolla/transfer` | POST | Initiate Dwolla transfer |
| `/api/dwolla/webhook` | POST | Handle Dwolla webhooks |

### Admin
| Route | Method | Description |
|-------|--------|-------------|
| `/api/admin/business/approve` | POST | Approve/reject business |
| `/api/admin/platform-fee` | GET/POST | Manage platform fees |
| `/api/admin/countries` | GET/POST | Manage supported countries |

---

## Key Components

### UI Components (`/components/ui/`)
- `Button` - Primary action buttons with variants
- `Card` - Container component
- `Input` / `Select` / `TextArea` - Form inputs
- `Modal` - Dialog overlays
- `Tabs` - Tab navigation
- `Toast` - Notifications
- `Badge` - Status indicators
- `Progress` - Progress bars

### Loan Components (`/components/loans/`)
- `LoanCard` - Displays loan summary
- `LoanRequestForm` - Create loan request
- `LoanContract` - Digital contract/agreement
- `LoanTimeline` - Visual loan history
- `PaymentModal` - Record payments
- `DisbursementMethodForm` - Choose disbursement

### Dashboard Components (`/components/dashboard/`)
- `StatsCard` - Metric display
- `BorrowerTrustCard` - Trust score display
- `IncomeProfileCard` - Financial profile
- `DashboardBorrowingLimit` - Available credit

### Business Components (`/components/business/`)
- `BusinessProfileBanner` - Business header
- `LendingTermsCard` - Configure lending terms
- `PendingLoanCard` - Pending approvals

### Payment Components (`/components/payments/`)
- `PlaidLink` - Bank connection widget
- `PayPalConnect` - PayPal integration
- `PayPalPayment` - PayPal checkout

---

## Third-Party Integrations

### Plaid Integration (`/lib/plaid.ts`)
**Purpose:** Securely connect user bank accounts

```typescript
// Key functions
createLinkToken()      // Initialize Plaid Link
exchangePublicToken()  // Get access token
getAuthData()          // Get account/routing numbers
createProcessorToken() // Create Dwolla processor token
```

**Flow:**
1. User clicks "Connect Bank"
2. Frontend gets link token from `/api/plaid/link-token`
3. Plaid Link opens, user authenticates
4. Frontend receives public token
5. Backend exchanges for access token
6. Creates Dwolla funding source with processor token

### Dwolla Integration (`/lib/dwolla.ts`)
**Purpose:** ACH bank transfers

```typescript
// Customer types
- Unverified: $5,000/week send limit, unlimited receive
- Receive-only: For guests receiving funds

// Key functions
createCustomer()              // Create Dwolla customer
createFundingSourceWithPlaid() // Link bank via Plaid
createTransfer()              // Simple A→B transfer
createFacilitatedTransfer()   // A→Master→B (for fees)
```

**Facilitated Transfer Flow:**
```
Borrower Bank
     │
     ▼
[Gross Amount]
     │
     ▼
Master Account (Platform)
     │
     ├── Platform Fee retained
     │
     ▼
[Net Amount]
     │
     ▼
Lender Bank
```

### Email (Nodemailer) (`/lib/email.ts`)
**Purpose:** Transactional emails

**Email Templates:**
- Loan invite
- Payment reminder (automated & manual)
- Payment received confirmation
- Loan accepted/declined
- Match found notification
- Funds disbursed notification

---

## Admin Panel

### Routes (`/app/admin/`)

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/admin` | Overview stats |
| Users | `/admin/users` | User management |
| Loans | `/admin/loans` | All loans |
| Businesses | `/admin/businesses` | Business verification |
| Verification | `/admin/verification` | ID verification queue |
| Platform Fee | `/admin/platform-fee` | Fee configuration |
| Countries | `/admin/countries` | Supported countries |
| Settings | `/admin/settings` | Platform settings |

### Admin Capabilities
- View platform statistics
- Manage user accounts
- Approve/reject business verifications
- Monitor all loans
- Configure platform fees
- Manage supported countries
- View overdue payments

---

## Scheduled Jobs (Cron)

### Auto-Pay (`/api/cron/auto-pay`)
**Schedule:** Daily at 8 AM
**Purpose:** Process automatic loan payments

```typescript
// Process
1. Find all unpaid payments due today or earlier
2. For each payment with auto-pay enabled:
   - Verify borrower & lender have bank connected
   - Create facilitated Dwolla transfer
   - Update payment schedule
   - Update loan balance
   - Update borrower stats
   - Send notifications
3. Track failed payments for retry/alerts
```

### Payment Reminders (`/api/cron/payment-reminders`)
**Schedule:** Daily
**Purpose:** Send payment due reminders

```typescript
// Reminder types
- 3 days before due date
- Day before due date
- Day of due date
- Overdue reminders
```

### Match Expiry (`/api/cron/match-expiry`)
**Schedule:** Daily
**Purpose:** Expire stale loan matches

```typescript
// Process
1. Find matches older than expiry threshold
2. Mark as expired
3. Try next match or notify borrower
```

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Plaid
PLAID_CLIENT_ID=
PLAID_SECRET=
PLAID_ENV=sandbox

# Dwolla
DWOLLA_APP_KEY=
DWOLLA_APP_SECRET=
DWOLLA_ENV=sandbox
DWOLLA_WEBHOOK_SECRET=

# Email (SMTP)
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=

# App
NEXT_PUBLIC_APP_URL=
CRON_SECRET=
```

---

## File Structure Summary

```
src/
├── app/                    # Next.js App Router pages
│   ├── admin/             # Admin panel
│   ├── agent/             # Disbursement agents
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── borrower/          # Borrower flows
│   ├── business/          # Business lender pages
│   ├── dashboard/         # User dashboard
│   ├── lender/            # Lender flows
│   ├── loans/             # Loan management
│   └── ...
├── components/            # React components
│   ├── borrower/
│   ├── business/
│   ├── dashboard/
│   ├── layout/
│   ├── loans/
│   ├── payments/
│   └── ui/
├── lib/                   # Utilities & integrations
│   ├── supabase/         # Supabase clients
│   ├── calendar.ts
│   ├── dwolla.ts
│   ├── email.ts
│   ├── plaid.ts
│   ├── platformFee.ts
│   ├── smartSchedule.ts
│   ├── utils.ts
│   └── validations.ts
├── types/                 # TypeScript types
└── middleware.ts          # Auth middleware

supabase/
├── migrations/           # Database migrations
├── schema.sql           # Base schema
└── storage_policies.sql # Storage rules
```

---

## Security Considerations

1. **Row Level Security (RLS)** - Database-level access control
2. **Supabase Auth** - Secure authentication
3. **Plaid Link** - Bank credentials never touch our servers
4. **Webhook Verification** - Dwolla webhook signatures verified
5. **Token-based Guest Access** - Time-limited access tokens
6. **HTTPS Only** - All communications encrypted
7. **Protected Routes** - Middleware enforces authentication

---

## Deployment Notes

1. **Vercel** recommended for Next.js deployment
2. **Supabase** managed PostgreSQL
3. **Cron Jobs** via Vercel Cron or external scheduler
4. **Dwolla Webhooks** must be configured for production
5. **Plaid** requires production credentials and approval

---

*Last updated: January 2025*
*Platform version: 1.0.0*
