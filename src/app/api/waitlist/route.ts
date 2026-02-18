import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { email, full_name, interest_type } = await request.json();

    // Validate
    if (!email || !interest_type) {
      return NextResponse.json(
        { error: 'Email and interest type required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Insert
    const { error } = await supabase
      .from('waitlist')
      .insert({
        email: email.toLowerCase().trim(),
        full_name: full_name?.trim() || null,
        interest_type,
      });

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Email already registered!' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to join waitlist' },
      { status: 500 }
    );
  }
}