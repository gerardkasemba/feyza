import { createClient } from '@/lib/supabase/client';
import { useState, useEffect } from 'react';

// Default settings values - safe for client and server
export const DEFAULT_SETTINGS = {
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

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
export type SettingValue = typeof DEFAULT_SETTINGS[SettingKey];

// Cache for settings to avoid repeated DB calls
let settingsCache: Record<string, any> | null = null;
let cacheTimestamp: number = 0;
const CACHE_TTL = 60000; // 1 minute cache

/**
 * Parse a setting value from JSONB
 */
function parseSettingValue(value: any): any {
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

/**
 * Get all platform settings (client-side)
 * Uses caching to minimize DB calls
 */
export async function getSettings(): Promise<Record<string, any>> {
  // Check cache
  if (settingsCache && Date.now() - cacheTimestamp < CACHE_TTL) {
    return settingsCache;
  }

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('platform_settings')
      .select('key, value');

    if (error) {
      console.error('Error fetching settings:', error);
      return { ...DEFAULT_SETTINGS };
    }

    // Convert to key-value object
    const settings: Record<string, any> = { ...DEFAULT_SETTINGS };
    (data || []).forEach((row) => {
      settings[row.key] = parseSettingValue(row.value);
    });

    // Update cache
    settingsCache = settings;
    cacheTimestamp = Date.now();

    return settings;
  } catch (err) {
    console.error('Error in getSettings:', err);
    return { ...DEFAULT_SETTINGS };
  }
}

/**
 * Get a single setting value (client-side)
 */
export async function getSetting<K extends SettingKey>(
  key: K
): Promise<typeof DEFAULT_SETTINGS[K]> {
  const settings = await getSettings();
  return settings[key] ?? DEFAULT_SETTINGS[key];
}

/**
 * Update a setting value (admin only, client-side)
 */
export async function updateSetting(
  key: string,
  value: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ 
        key, 
        value: JSON.stringify(value),
        updated_at: new Date().toISOString() 
      }, { 
        onConflict: 'key' 
      });

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate cache
    settingsCache = null;
    cacheTimestamp = 0;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update multiple settings at once
 */
export async function updateSettings(
  settings: Record<string, any>
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    
    const updates = Object.entries(settings).map(([key, value]) => ({
      key,
      value: JSON.stringify(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('platform_settings')
      .upsert(updates, { onConflict: 'key' });

    if (error) {
      return { success: false, error: error.message };
    }

    // Invalidate cache
    settingsCache = null;
    cacheTimestamp = 0;

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Clear settings cache (useful after updates)
 */
export function clearSettingsCache(): void {
  settingsCache = null;
  cacheTimestamp = 0;
}

/**
 * Check if maintenance mode is enabled
 */
export async function isMaintenanceMode(): Promise<boolean> {
  return getSetting('maintenance_mode');
}

/**
 * Check if new registrations are allowed
 */
export async function canRegister(): Promise<boolean> {
  return getSetting('allow_new_registrations');
}

/**
 * Check if business registrations are allowed
 */
export async function canRegisterBusiness(): Promise<boolean> {
  return getSetting('allow_business_registrations');
}

/**
 * Get max active loans per user
 */
export async function getMaxActiveLoans(): Promise<number> {
  return getSetting('max_active_loans_per_user');
}

/**
 * Get payment retry settings
 */
export async function getPaymentRetrySettings(): Promise<{
  maxAttempts: number;
  intervalHours: number;
  restrictionDays: number;
}> {
  const settings = await getSettings();
  return {
    maxAttempts: settings.payment_retry_max_attempts || 3,
    intervalHours: settings.payment_retry_interval_hours || 24,
    restrictionDays: settings.restriction_period_days || 90,
  };
}

/**
 * React hook for accessing platform settings
 * Automatically refreshes when settings change
 */
export function usePlatformSettings() {
  const [settings, setSettings] = useState<Record<string, any>>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchSettings() {
      try {
        setLoading(true);
        const data = await getSettings();
        if (mounted) {
          setSettings(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message || 'Failed to load settings');
          setSettings(DEFAULT_SETTINGS);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchSettings();

    // Set up real-time subscription
    const supabase = createClient();
    const channel = supabase
      .channel('platform_settings_changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'platform_settings' 
        },
        () => {
          // Refresh settings when they change
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  /**
   * Get a single setting value
   */
  const getSettingValue = <K extends SettingKey>(key: K): typeof DEFAULT_SETTINGS[K] => {
    return settings[key] ?? DEFAULT_SETTINGS[key];
  };

  /**
   * Update a setting (admin only)
   */
  const updateSettingValue = async (
    key: string,
    value: any
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await updateSetting(key, value);
      if (result.success) {
        // Refresh settings
        const updatedSettings = await getSettings();
        setSettings(updatedSettings);
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  /**
   * Update multiple settings at once
   */
  const updateMultipleSettings = async (
    newSettings: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const result = await updateSettings(newSettings);
      if (result.success) {
        // Refresh settings
        const updatedSettings = await getSettings();
        setSettings(updatedSettings);
      }
      return result;
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  return {
    settings,
    loading,
    error,
    getSetting: getSettingValue,
    updateSetting: updateSettingValue,
    updateMultipleSettings,
    refresh: () => {
      setLoading(true);
      getSettings().then(data => {
        setSettings(data);
        setLoading(false);
      }).catch(err => {
        setError(err.message);
        setLoading(false);
      });
    },
  };
}