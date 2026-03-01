import { logger } from '@/lib/logger';
const log = logger('auth-callback');
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    // If we have a user, create their record in the users table
    if (data?.user && !error) {
      try {
        const serviceClient = await createServiceRoleClient();
        
        // Check if user already exists
        const { data: existingUser } = await serviceClient
          .from('users')
          .select('id')
          .eq('id', data.user.id)
          .single();

        // Create user record if it doesn't exist
        if (!existingUser) {
          await serviceClient
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || '',
              user_type: data.user.user_metadata?.user_type || 'individual',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          
          log.info(`[Auth Callback] Created user record for ${data.user.id}`);
        }
      } catch (err) {
        log.error('[Auth Callback] Error creating user record:', err);
        // Don't fail the callback if user record creation fails
      }

      // Redirect business users to setup
      if (data.user.user_metadata?.user_type === 'business') {
        return NextResponse.redirect(`${origin}/business/setup`);
      }
    }
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(`${origin}/dashboard`);
}
