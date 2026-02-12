import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match ONLY routes that need auth checking:
     * - Dashboard, settings, admin pages
     * - Auth pages (to redirect if already logged in)
     * Exclude:
     * - API routes (they handle their own auth)
     * - Static files
     * - Public pages
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
    '/auth/signin',
    '/auth/signup',
    '/auth/forgot-password',
    '/auth/reset-password',
  ],
};