# Security

## Overview

- **Access control** is enforced in the **application layer**: API routes use `createServerSupabaseClient()` and `supabase.auth.getUser()` (or equivalent) and return 401/403 when the user is missing or not allowed.
- The **Supabase service role** key bypasses Row Level Security (RLS). It is used only where the app needs to act on behalf of the system (cron, admin, trust score updates, payment handler, partner API). See [Where the service role is used](#where-the-service-role-is-used).
- **Secrets**: Never commit `.env.local`. Use Vercel (or your host) environment variables for production; mark `CRON_SECRET`, `ADMIN_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, and all payment/email keys as sensitive.

## Row Level Security (RLS)

By default, the schema in `supabase/feyza-database.sql` does **not** enable RLS. That means:
- Any client with the **anon key** could, in theory, query tables if it had direct DB access (e.g. if the anon key were leaked and someone connected to Supabase from outside the app).
- The **service role** has full access regardless of RLS.

To add a **read-side** safety net, you can run the optional migration:

```bash
psql $DATABASE_URL -f supabase/migrations/0001_enable_rls_read_policies.sql
```

That migration:
- Enables RLS on `users` and `loans`.
- Adds **SELECT** policies so that with the **anon key + authenticated user JWT**, users can only read their own row in `users` and only loans where they are borrower, lender, or the business lender’s user.

Writes (INSERT/UPDATE/DELETE) from the app today go through API routes that use the **service role** for complex flows (e.g. loan accept, payment handler, cron). So after applying this migration, **read** access is restricted when using the anon key; **writes** continue to work via the app because those routes use the service role. Expanding RLS to cover writes would require refactoring those routes to use the user-scoped client where possible and adding INSERT/UPDATE policies.

## Where the service role is used

The service role is intentionally used in these areas so the app can perform cross-user or system actions:

| Area | Purpose |
|------|--------|
| **Auth / user** | `POST /api/auth/user` – upsert user row and bootstrap trust score |
| **Trust score** | `GET/POST /api/trust-score` – read/update trust_scores (and recalc) |
| **Borrower profile** | `GET /api/borrower/[id]` – public borrower info for lenders |
| **Cron** | All cron routes (payment-retry, auto-pay, reminders, match-expiry, sync-dwolla, etc.) |
| **Payments** | Payment handler (`onPaymentCompleted`), payments/create (trust + completion), payments/manual, Dwolla webhook, PayPal charge |
| **Loans** | accept, decline, cancel, fund, funds, reconcile; invite accept; lender setup-loan; reminders |
| **Vouches** | vouches (create/update), vouches/eligibility, vouches/request |
| **Admin / backfill** | backfill-trust-tiers, backfill-vouch-strength, backfill-vouches, trust-debug; business approve; Dwolla setup-webhook |
| **Partner API** | Partner auth, users, vouches, KYC, payment-methods, trust report |
| **Other** | payment-providers, payment-methods (direct), notifications/payment, matching, states, guest-lender, guest/create-lender, plaid guest-exchange, lender/access, agent/disbursements |

Use the **server client** (user session) for user-scoped reads/writes when possible; use the **service role** only when the operation requires it (e.g. updating another user’s trust score, or cron acting on many users).

## Cron and admin protection

- **Cron:** Vercel calls cron endpoints with `Authorization: Bearer <CRON_SECRET>`. Each cron route must check this (or that `CRON_SECRET` is set and the header matches). Do not expose `CRON_SECRET` to the client.
- **Admin:** Admin and backfill routes check either the logged-in user’s `is_admin` flag or `Authorization: Bearer <ADMIN_SECRET>`. Keep `ADMIN_SECRET` server-only.

## Reporting issues

If you discover a security issue, please report it privately (e.g. to the maintainers) rather than opening a public GitHub issue.
