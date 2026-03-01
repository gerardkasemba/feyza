import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match routes that need auth checking:
     * - Dashboard, settings, admin pages
     * - Auth pages (to redirect if already logged in)
     * - Apply / borrow pages — session must be refreshed here so the
     *   /api/borrower/trust Route Handler receives a valid auth cookie.
     *   Without this, getUser() returns null on stale sessions → 401 →
     *   GuestLoanRequestForm shows the hardcoded $500 fallback.
     * Exclude:
     * - API routes (they handle their own auth)
     * - Static files
     */
    '/dashboard/:path*',
    '/settings/:path*',
    '/profile/:path*',
    '/business/:path*',
    '/lender/:path*',
    '/borrower/:path*',
    '/loans/:path*',
    '/notifications/:path*',
    '/admin/:path*',
    '/apply/:path*',
    '/apply',
    '/borrow',
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
  ],
};
