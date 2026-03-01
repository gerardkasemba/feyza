import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('user-username');

// GET: Search for user by username or check availability
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username')?.toLowerCase().replace(/^~/, '');
    const checkAvailability = searchParams.get('check') === 'true';
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    // Validate format
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only',
        valid: false 
      }, { status: 400 });
    }
    
    const supabase = await createServiceRoleClient();
    
    const { data: user, error } = await supabase
      .from('users')
      .select('id, username, full_name, user_type')
      .eq('username', username)
      .single();
    
    if (checkAvailability) {
      return NextResponse.json({ 
        available: !user,
        valid: true,
        username 
      });
    }
    
    if (error || !user) {
      return NextResponse.json({ 
        found: false,
        message: 'User not found' 
      });
    }
    
    // Don't expose user ID for privacy, just confirm they exist
    return NextResponse.json({ 
      found: true,
      username: user.username,
      displayName: user.full_name,
      userType: user.user_type,
    });
  } catch (error: unknown) {
    log.error('Error searching username:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to search username' },
      { status: 500 }
    );
  }
}

// POST: Set or update current user's username
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const body = await request.json();
    let { username } = body;
    
    // Clean and validate
    username = username?.toLowerCase().replace(/^~/, '').trim();
    
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }
    
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      return NextResponse.json({ 
        error: 'Username must be 3-20 characters, lowercase letters, numbers, and underscores only' 
      }, { status: 400 });
    }
    
    // Reserved usernames
    const reserved = ['admin', 'support', 'help', 'feyza', 'system', 'root', 'moderator', 'mod'];
    if (reserved.includes(username)) {
      return NextResponse.json({ error: 'This username is reserved' }, { status: 400 });
    }
    
    const serviceSupabase = await createServiceRoleClient();
    
    // Check if username is taken by someone else
    const { data: existing } = await serviceSupabase
      .from('users')
      .select('id')
      .eq('username', username)
      .neq('id', user.id)
      .single();
    
    if (existing) {
      return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
    }
    
    // Update user's username
    const { error } = await serviceSupabase
      .from('users')
      .update({ 
        username,
        updated_at: new Date().toISOString() 
      })
      .eq('id', user.id);
    
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Username is already taken' }, { status: 400 });
      }
      throw error;
    }
    
    return NextResponse.json({ 
      success: true, 
      username,
      message: 'Username set successfully' 
    });
  } catch (error: unknown) {
    log.error('Error setting username:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to set username' },
      { status: 500 }
    );
  }
}
