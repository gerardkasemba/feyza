import { NextRequest, NextResponse } from 'next/server';
import { createWebhookSubscription, listWebhookSubscriptions } from '@/lib/dwolla';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// POST: Create webhook subscription
export async function POST(request: NextRequest) {
  try {
    // Verify admin access (use a secret or admin check in production)
    const authHeader = request.headers.get('authorization');
    if (process.env.ADMIN_SECRET && authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const webhookUrl = `${APP_URL}/api/dwolla/webhook`;
    
    console.log('Creating Dwolla webhook subscription for:', webhookUrl);
    
    const subscriptionUrl = await createWebhookSubscription(webhookUrl);
    
    return NextResponse.json({
      success: true,
      subscription_url: subscriptionUrl,
      webhook_url: webhookUrl,
    });

  } catch (error: any) {
    console.error('Error setting up webhook:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set up webhook' },
      { status: 500 }
    );
  }
}

// GET: List webhook subscriptions
export async function GET(request: NextRequest) {
  try {
    const subscriptions = await listWebhookSubscriptions();
    
    return NextResponse.json({
      subscriptions: subscriptions.map((s: any) => ({
        url: s.url,
        created: s.created,
        paused: s.paused,
      })),
    });

  } catch (error: any) {
    console.error('Error listing webhooks:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to list webhooks' },
      { status: 500 }
    );
  }
}
