import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const log = logger('invite-accept');

export async function POST(request: NextRequest) {
  try {
    // Guest lenders have been removed. Invited lenders must sign up for an account.
    return NextResponse.json(
      {
        error: 'Guest lender access is no longer supported. Please sign up for a Feyza account to accept this loan invite.',
        code: 'GUEST_LENDERS_DISABLED',
      },
      { status: 410 }
    );
  } catch (error) {
    log.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
