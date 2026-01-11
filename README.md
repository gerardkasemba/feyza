# LoanTrack 💰

A simple, mobile-first loan tracking platform that allows users to request, track, and repay loans — either from registered business lenders or friends and family via invite links.

![LoanTrack](https://via.placeholder.com/800x400?text=LoanTrack+Screenshot)

## Features

### Two Ways to Request a Loan

1. **Business Lenders** - Browse and request loans from verified businesses on the platform
2. **Friends & Family** - Send invite links to personal contacts (no account required for lenders)

### Core Features

- 📱 **Mobile-first design** - Optimized for mobile devices
- 📊 **Visual timeline** - Track repayments with a clean, visual timeline
- 🔔 **Smart notifications** - Friendly payment reminders via email
- 🌍 **Diaspora support** - Add pickup person details for remote collections
- 💳 **PayPal integration** - Optional automatic payments
- ✉️ **Email notifications** - Powered by Resend

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Email**: Resend
- **Payments**: PayPal

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Resend account
- PayPal developer account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/loantrack.git
cd loantrack/web
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Update `.env.local` with your credentials:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# PayPal
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_SECRET=your_paypal_secret

# Resend (Email)
RESEND_API_KEY=your_resend_api_key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

5. Set up the database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Run the SQL from `supabase/schema.sql`

6. Start the development server:
```bash
npm run dev
```

Visit `http://localhost:3000` to see the app.

## Project Structure

```
web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── dashboard/         # Dashboard page
│   │   ├── loans/             # Loan pages
│   │   └── invite/            # Invite acceptance page
│   ├── components/            # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── layout/           # Layout components
│   │   ├── loans/            # Loan-specific components
│   │   └── dashboard/        # Dashboard components
│   ├── lib/                   # Utilities and helpers
│   │   ├── supabase/         # Supabase client setup
│   │   ├── email.ts          # Email templates
│   │   ├── utils.ts          # Utility functions
│   │   └── validations.ts    # Zod schemas
│   └── types/                 # TypeScript types
├── supabase/
│   └── schema.sql            # Database schema
└── public/                    # Static assets
```

## Database Schema

The app uses the following main tables:

- `users` - User profiles
- `business_profiles` - Business lender profiles
- `loans` - Loan records
- `payment_schedule` - Scheduled payments
- `payments` - Payment records
- `notifications` - User notifications

See `supabase/schema.sql` for the complete schema with RLS policies.

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/invite/send` | POST | Send loan invite email |
| `/api/invite/accept` | POST | Accept loan invite |
| `/api/invite/decline` | POST | Decline loan invite |
| `/api/notifications/payment` | POST | Send payment notification |

## User Flows

### Requesting a Loan from a Business

1. User clicks "Request Loan"
2. Selects "From a Business"
3. Browses available business lenders
4. Submits loan request with terms
5. Business reviews and accepts/declines
6. Loan becomes active upon acceptance

### Requesting a Loan from Friends/Family

1. User clicks "Request Loan"
2. Selects "From Someone I Know"
3. Enters friend's email/phone
4. Platform sends invite link
5. Friend views details and accepts (no account needed)
6. Loan becomes active

### Making a Payment

1. User views loan timeline
2. Clicks on upcoming payment
3. Marks payment as paid
4. Optionally adds proof/note
5. Lender receives notification
6. Lender confirms payment

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see LICENSE for details.

## Support

For questions or issues, please open a GitHub issue or contact support@loantrack.app.
