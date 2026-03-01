import { NextRequest, NextResponse } from 'next/server';

/**
 * Agent disbursement API removed. This stub returns 410 so the build does not
 * depend on @/lib/disbursements/disbursement-service.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Agent disbursement system has been removed' },
    { status: 410 }
  );
}

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return NextResponse.json(
    { error: 'Agent disbursement system has been removed' },
    { status: 410 }
  );
}
