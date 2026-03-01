import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('user');

/**
 * POST: Create user record in users table after signup
 * This ensures the user exists in our users table immediately after auth signup
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { fullName, userType } = body;

    // Use service role to bypass RLS for initial user creation
    const serviceClient = await createServiceRoleClient();

    // Check if user already exists
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // User already exists, just return success
      return NextResponse.json({ success: true, message: 'User already exists' });
    }

    // Create the user record
    const { error: insertError } = await serviceClient
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        full_name: fullName || user.user_metadata?.full_name || '',
        user_type: userType || user.user_metadata?.user_type || 'individual',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (insertError) {
      log.error('Error creating user record:', insertError);
      // Don't fail if it's a duplicate (race condition)
      if (!insertError.message.includes('duplicate')) {
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    log.info(`[Auth] User record created for ${user.id}`);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error('Error in user creation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * GET: Check if email is already registered
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    // Use service role to check auth.users
    const serviceClient = await createServiceRoleClient();

    // Check in users table first (faster)
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    return NextResponse.json({ 
      exists: !!existingUser,
      message: existingUser ? 'Email already registered' : 'Email available'
    });
  } catch (error: unknown) {
    // If no rows found, email is available
    if ((error instanceof Error ? (error as NodeJS.ErrnoException).code : undefined) === 'PGRST116') {
      return NextResponse.json({ exists: false, message: 'Email available' });
    }
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
