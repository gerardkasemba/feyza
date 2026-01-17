import { NextRequest, NextResponse } from 'next/server';
import { createLinkToken } from '@/lib/plaid';
import { v4 as uuidv4 } from 'uuid';

// POST: Create a Plaid link token for a guest user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Create a temporary user ID for the guest
    // This will be used to create the Plaid link token
    const guestUserId = `guest_${uuidv4()}`;

    // Create link token
    const linkTokenData = await createLinkToken(guestUserId);

    return NextResponse.json({
      link_token: linkTokenData.link_token,
      expiration: linkTokenData.expiration,
      guest_id: guestUserId,
    });
  } catch (error: any) {
    console.error('Error creating guest Plaid link token:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create link token' },
      { status: 500 }
    );
  }
}
