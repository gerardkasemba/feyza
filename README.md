# Feyza

Borrow and lend with trust. A loan tracking platform for informal lending between individuals and businesses.

- **Stack:** Next.js (App Router), React 19, Supabase (auth + Postgres), Tailwind CSS
- **Deploy:** Vercel (recommended); cron jobs for payments, reminders, matching

## Quick start

1. **Clone and install**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env.local`
   - Fill in at least:
     - `NEXT_PUBLIC_APP_URL` (e.g. `http://localhost:3000`)
     - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY` (required for API routes that need to bypass RLS)
   - See [.env.example](.env.example) for all variables and which are **secret** (server-only).

3. **Database**
   - Create a Supabase project and run the schema:
     ```bash
     # Apply main schema (tables, indexes, triggers)
     psql $DATABASE_URL -f supabase/feyza-database.sql
     ```
   - Optional: enable [RLS](docs/SECURITY.md#row-level-security) for read protection:
     ```bash
     psql $DATABASE_URL -f supabase/migrations/0001_enable_rls_read_policies.sql
     ```

4. **Run**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint |
| `npm run test` | Run unit/integration tests (includes payment handler critical path) |
| `npm run test:coverage` | Tests with coverage report |

## Project structure

- `src/app/` – Next.js App Router (pages, API routes, cron)
- `src/components/` – Shared UI and layout
- `src/lib/` – Supabase clients, payments, trust score, email, etc.
- `src/types/` – Shared TypeScript types
- `supabase/` – Schema (`feyza-database.sql`) and RLS migrations

## Deployment (Vercel)

1. Connect the repo to Vercel and set **Environment Variables** from [.env.example](.env.example) (mark secrets as sensitive).
2. Crons are defined in `vercel.json`; Vercel will call them with `Authorization: Bearer <CRON_SECRET>`.
3. Ensure `NEXT_PUBLIC_APP_URL` is your production URL.

## Security and RLS

- Access control is enforced in the **application layer** (API routes check auth and roles).
- The **service role** key is used only where necessary (cron, admin, trust score, payment handler, partner API). See [docs/SECURITY.md](docs/SECURITY.md).
- Optional **Row Level Security (RLS)** can be enabled for read-side protection; see `supabase/migrations/0001_enable_rls_read_policies.sql` and [docs/SECURITY.md](docs/SECURITY.md).

## Observability

- **Logs:** API and cron use `@/lib/logger` (JSON in production). View in Vercel Dashboard → Logs, or stream to your preferred log aggregator.
- **Errors:** Set `SENTRY_DSN` in production to send errors to Sentry (see [Observability](#observability) in .env.example).

## License

MIT
