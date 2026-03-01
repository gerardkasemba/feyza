import { NextResponse } from 'next/server';

/** Guest Plaid flows are disabled. Use authenticated /api/plaid/exchange instead. */
export async function POST() {
  return NextResponse.json(
    { error: 'Guest lender flows are no longer supported' },
    { status: 410 }
  );
}
