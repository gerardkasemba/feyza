import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, full_name, phone, role, country, region } = body;

    // Validation
    if (!email || !full_name || !country) {
      return NextResponse.json(
        { error: 'Email, full name, and country are required' },
        { status: 400 }
      );
    }

    if (!['agent', 'supervisor', 'admin'].includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role. Must be agent, supervisor, or admin' },
        { status: 400 }
      );
    }

    const supabase = await createServiceRoleClient();

    // Check if agent with email already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    if (existingAgent) {
      return NextResponse.json(
        { error: 'An agent with this email already exists' },
        { status: 400 }
      );
    }

    // Create agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        email: email.toLowerCase(),
        full_name,
        phone: phone || null,
        role,
        country,
        region: region || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, agent });
  } catch (error) {
    console.error('Error in create agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
