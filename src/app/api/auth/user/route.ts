import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { bootstrapTrustScore } from '@/lib/users/user-lifecycle-service';

const log = logger('auth-user');

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

    const serviceClient = await createServiceRoleClient();

    // Only set user_type when explicitly provided; never overwrite 'business' with default 'individual'
    const { data: existing } = await serviceClient
      .from('users')
      .select('full_name, user_type')
      .eq('id', user.id)
      .maybeSingle();

    // Only set full_name when a non-empty value is provided; empty string must not overwrite
    const nextFullName =
      fullName !== undefined && fullName !== null && String(fullName).trim() !== ''
        ? String(fullName).trim()
        : (existing?.full_name ?? user.user_metadata?.full_name ?? user.email?.split('@')[0] ?? 'User');
    const nextUserType =
      userType !== undefined && userType !== null && userType !== ''
        ? userType
        : (existing?.user_type ?? user.user_metadata?.user_type ?? 'individual');

    const { error: upsertError } = await serviceClient
      .from('users')
      .upsert(
        {
          id: user.id,
          email: user.email,
          full_name: nextFullName,
          user_type: nextUserType,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
          ignoreDuplicates: false,
        }
      );

    if (upsertError) {
      log.error('[Auth] Error upserting user record:', upsertError);
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    log.info(`[Auth] User record ensured for ${user.id}`);

    // Bootstrap trust score for new users (replaces create_trust_score_on_user_create DB trigger)
    // Using upsert so safe to call on every signup attempt - no-ops if score already exists
    bootstrapTrustScore(serviceClient as any, user.id)
      .catch(err => log.error('[Auth] bootstrapTrustScore error:', err));

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error('Error in user creation:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

/**
 * GET: Check if email is already registered
 * Uses database function to check auth.users table directly
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ 
        exists: false, 
        message: 'Invalid email format' 
      });
    }
    
    // Use service role to check
    const serviceClient = await createServiceRoleClient();

    // Method 1: Check using our custom function (checks auth.users)
    const { data: functionResult, error: functionError } = await serviceClient
      .rpc('check_email_exists', { email_to_check: normalizedEmail });

    if (!functionError && functionResult === true) {
      log.info(`[Auth Check] Email ${normalizedEmail} exists (via function)`);
      return NextResponse.json({ 
        exists: true,
        message: 'Email already registered'
      });
    }

    // Method 2: Fallback - check public.users table
    const { data: existingUser } = await serviceClient
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (existingUser) {
      log.info(`[Auth Check] Email ${normalizedEmail} exists in users table`);
      return NextResponse.json({ 
        exists: true,
        message: 'Email already registered'
      });
    }

    // Method 3: Final fallback - use admin API to list and search
    // This is slower but works without the database function
    if (functionError) {
      log.info('[Auth Check] Function not available, using admin API fallback');
      try {
        const { data: { users }, error: listError } = await serviceClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000, // Get more users to search through
        });
        
        if (!listError && users) {
          const userExists = users.some(u => u.email?.toLowerCase() === normalizedEmail);
          if (userExists) {
            log.info(`[Auth Check] Email ${normalizedEmail} exists in auth.users (admin API)`);
            return NextResponse.json({ 
              exists: true,
              message: 'Email already registered'
            });
          }
        }
      } catch (adminError) {
        log.error('[Auth Check] Admin API error:', adminError);
      }
    }

    log.info(`[Auth Check] Email ${normalizedEmail} is available`);
    return NextResponse.json({ 
      exists: false,
      message: 'Email available'
    });
  } catch (error: unknown) {
    log.error('[Auth Check] Error:', error);
    // On error, return false but log it - don't block registration
    // The actual signup will fail if email exists anyway
    return NextResponse.json({ 
      exists: false, 
      message: 'Email check completed',
      warning: 'Verification pending'
    });
  }
}
