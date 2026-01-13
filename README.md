# Feyza 💰

> From Swahili "Feza" meaning money - Simple, transparent lending between people you trust.

A mobile-first loan tracking platform that allows users to request, track, and repay loans — either from registered business lenders or friends and family via invite links.

## Features

### Two Ways to Request a Loan

1. **Business Lenders** - Browse and request loans from verified businesses on the platform
2. **Friends & Family** - Send invite links to personal contacts (no account required for lenders)

### Core Features

- 📱 **Mobile-first design** - Optimized for all devices with touch-friendly UI
- 📊 **Visual timeline** - Track repayments with a clean, visual timeline
- 🔔 **Smart notifications** - Friendly payment reminders via email
- 📅 **Calendar export** - Add payment due dates to Google Calendar or iCal
- 💳 **Multiple payment methods** - PayPal, Cash App, Venmo support
- ✉️ **Email notifications** - Powered by Resend
- 🌍 **Multi-currency support** - USD, EUR, GBP, NGN, GHS, KES

### Guest Flow (No Account Required)

- Borrowers can request loans without creating an account
- Lenders can accept and manage loans without creating an account
- Simple email-based authentication for guest users

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, TailwindCSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Email**: Resend
- **Payments**: PayPal, Cash App, Venmo integration

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- Resend account

### Installation

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables: `cp .env.example .env.local`
4. Run migrations in Supabase
5. Start dev server: `npm run dev`

## License

MIT License
