import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';

// Simple token-based auth for agents
// In production, consider using proper JWT or session management

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const supabase = await createServiceRoleClient();

    // Get agent by email
    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('is_active', true)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // For simplicity, using a basic password check
    // In production, use proper password hashing (bcrypt)
    const expectedPassword = process.env.AGENT_DEFAULT_PASSWORD || 'agent123';
    
    // Or check against stored hash if you add password column to agents table
    if (password !== expectedPassword) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store token (in production, use Redis or database)
    // For now, we'll use a simple cookie-based approach
    const cookieStore = await cookies();
    cookieStore.set('agent_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    cookieStore.set('agent_id', agent.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        email: agent.email,
        full_name: agent.full_name,
        role: agent.role,
        country: agent.country,
      },
    });
  } catch (error) {
    console.error('Agent login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Logout
export async function DELETE(request: NextRequest) {
  const cookieStore = await cookies();
  cookieStore.delete('agent_token');
  cookieStore.delete('agent_id');
  
  return NextResponse.json({ success: true });
}

// Get current agent
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const agentId = cookieStore.get('agent_id')?.value;
    const token = cookieStore.get('agent_token')?.value;

    if (!agentId || !token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();

    const { data: agent, error } = await supabase
      .from('agents')
      .select('*')
      .eq('id', agentId)
      .eq('is_active', true)
      .single();

    if (error || !agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 401 });
    }

    return NextResponse.json({
      agent: {
        id: agent.id,
        email: agent.email,
        full_name: agent.full_name,
        role: agent.role,
        country: agent.country,
        region: agent.region,
      },
    });
  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
