import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

const log = logger('settings');

// Default settings
const DEFAULT_SETTINGS: Record<string, any> = {
  // Email
  email_notifications_enabled: true,
  email_from_name: 'Feyza',
  email_from_address: 'noreply@feyza.com',
  
  // Reminders
  reminder_enabled: true,
  reminder_days_before: 3,
  overdue_reminder_frequency: 'daily',
  
  // Security
  max_login_attempts: 5,
  session_timeout_hours: 24,
  require_email_verification: true,
  
  // Platform
  maintenance_mode: false,
  allow_new_registrations: true,
  allow_business_registrations: true,
  
  // Loans
  max_active_loans_per_user: 3,
  min_days_between_loans: 7,
  auto_matching_enabled: true,
  default_loan_currency: 'USD',
  
  // Payments
  auto_pay_enabled: true,
  payment_retry_max_attempts: 3,
  payment_retry_interval_hours: 24,
  restriction_period_days: 90,
};

function parseSettingValue(value: unknown): unknown {
  if (typeof value === 'string') {
    // Remove surrounding quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    // Try to parse as JSON
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

// GET /api/settings - Get platform settings (public, non-sensitive ones)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { searchParams } = new URL(request.url);
    const keys = searchParams.get('keys')?.split(',');

    try {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value');

      if (error) {
        log.info('platform_settings table may not exist:', (error as Error).message);
        // Return defaults if table doesn't exist
        if (keys) {
          const filtered: Record<string, any> = {};
          keys.forEach(key => {
            if (DEFAULT_SETTINGS[key] !== undefined) {
              filtered[key] = DEFAULT_SETTINGS[key];
            }
          });
          return NextResponse.json({ settings: filtered });
        }
        return NextResponse.json({ settings: DEFAULT_SETTINGS });
      }

      // Build settings object
      const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
      (data || []).forEach((row) => {
        settings[row.key] = parseSettingValue(row.value);
      });

      // Filter by requested keys if provided
      if (keys) {
        const filtered: Record<string, any> = {};
        keys.forEach(key => {
          if (settings[key] !== undefined) {
            filtered[key] = settings[key];
          }
        });
        return NextResponse.json({ settings: filtered });
      }

      return NextResponse.json({ settings });
    } catch (err) {
      log.info('Error fetching settings:', err);
      return NextResponse.json({ settings: DEFAULT_SETTINGS });
    }
  } catch (error) {
    log.error('Error in settings API:', error);
    return NextResponse.json({ settings: DEFAULT_SETTINGS });
  }
}

// POST /api/settings - Update settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Settings object required' }, { status: 400 });
    }

    // Update each setting
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }));

    for (const update of updates) {
      const { error } = await supabase
        .from('platform_settings')
        .upsert(update, { onConflict: 'key' });
      
      if (error) {
        log.error(`Error updating setting ${update.key}:`, error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    log.error('Error updating settings:', error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
