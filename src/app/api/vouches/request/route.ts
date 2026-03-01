import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('vouches-request');

/**
 * GET: Get vouch request by token (public - no auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token required' }, { status: 400 });
    }

    // Use service role to bypass RLS
    const serviceClient = await createServiceRoleClient();

    const { data: requestData, error } = await serviceClient
      .from('vouch_requests')
      .select(`
        id,
        requester_id,
        message,
        suggested_relationship,
        status,
        expires_at,
        requester:users!requester_id(
          id,
          full_name,
          email
        )
      `)
      .eq('invite_token', token)
      .single();

    if (error || !requestData) {
      return NextResponse.json({ 
        error: 'Vouch request not found or has expired' 
      }, { status: 404 });
    }

    // Check if expired
    if (requestData.expires_at && new Date(requestData.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This vouch request has expired' 
      }, { status: 410 });
    }

    // Check status
    if (requestData.status !== 'pending') {
      return NextResponse.json({ 
        error: `This vouch request has already been ${requestData.status}`,
        status: requestData.status
      }, { status: 400 });
    }

    // Don't expose email in response
    const safeData = {
      id: requestData.id,
      requester_id: requestData.requester_id,
      message: requestData.message,
      suggested_relationship: requestData.suggested_relationship,
      status: requestData.status,
      requester: {
        id: (requestData.requester as any)?.id,
        full_name: (requestData.requester as any)?.full_name,
      }
    };

    return NextResponse.json({ request: safeData });
  } catch (error: unknown) {
    log.error('Error fetching vouch request:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
