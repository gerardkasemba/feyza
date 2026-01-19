// Platform Fee Utility Library
// Handles fee calculation and retrieval for all transactions

import { createServiceRoleClient } from '@/lib/supabase/server';

export interface PlatformFeeSettings {
  enabled: boolean;
  type: 'fixed' | 'percentage';
  fixed_amount: number;
  percentage: number;
  min_fee: number;
  max_fee: number;
  fee_label: string;
  fee_description: string;
}

export interface FeeCalculation {
  grossAmount: number;      // Original amount
  platformFee: number;      // Fee charged by Feyza
  netAmount: number;        // Amount after fee (what recipient gets)
  feeType: 'fixed' | 'percentage';
  feeLabel: string;
  feeDescription: string;
  feeEnabled: boolean;
}

// Default settings if database is unavailable
const DEFAULT_FEE_SETTINGS: PlatformFeeSettings = {
  enabled: true,
  type: 'fixed',
  fixed_amount: 1.50,
  percentage: 2.5,
  min_fee: 0.50,
  max_fee: 25.00,
  fee_label: 'Feyza Service Fee',
  fee_description: 'Platform processing fee',
};

// Cache for fee settings (refreshes every 5 minutes)
let cachedSettings: PlatformFeeSettings | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get platform fee settings from database
 * Uses caching to reduce database calls
 */
export async function getPlatformFeeSettings(): Promise<PlatformFeeSettings> {
  const now = Date.now();
  
  // Return cached settings if still valid
  if (cachedSettings && (now - cacheTimestamp) < CACHE_DURATION) {
    return cachedSettings;
  }
  
  try {
    const supabase = await createServiceRoleClient();
    
    const { data, error } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'platform_fee')
      .single();
    
    if (error || !data) {
      console.warn('Could not fetch platform fee settings, using defaults:', error);
      return DEFAULT_FEE_SETTINGS;
    }
    
    cachedSettings = data.value as PlatformFeeSettings;
    cacheTimestamp = now;
    
    return cachedSettings;
  } catch (error) {
    console.error('Error fetching platform fee settings:', error);
    return DEFAULT_FEE_SETTINGS;
  }
}

/**
 * Clear the fee settings cache (call after admin updates)
 */
export function clearFeeSettingsCache(): void {
  cachedSettings = null;
  cacheTimestamp = 0;
}

/**
 * Calculate platform fee for a given amount
 */
export async function calculatePlatformFee(amount: number): Promise<FeeCalculation> {
  const settings = await getPlatformFeeSettings();
  
  if (!settings.enabled) {
    return {
      grossAmount: amount,
      platformFee: 0,
      netAmount: amount,
      feeType: settings.type,
      feeLabel: settings.fee_label,
      feeDescription: settings.fee_description,
      feeEnabled: false,
    };
  }
  
  let fee: number;
  
  if (settings.type === 'fixed') {
    fee = settings.fixed_amount;
  } else {
    // Percentage calculation
    fee = amount * (settings.percentage / 100);
    
    // Apply min/max limits
    if (settings.min_fee && fee < settings.min_fee) {
      fee = settings.min_fee;
    }
    if (settings.max_fee && fee > settings.max_fee) {
      fee = settings.max_fee;
    }
  }
  
  // Round to 2 decimal places
  fee = Math.round(fee * 100) / 100;
  
  return {
    grossAmount: amount,
    platformFee: fee,
    netAmount: Math.round((amount - fee) * 100) / 100,
    feeType: settings.type,
    feeLabel: settings.fee_label,
    feeDescription: settings.fee_description,
    feeEnabled: true,
  };
}

/**
 * Calculate fee synchronously with provided settings (for client-side)
 */
export function calculateFeeWithSettings(
  amount: number, 
  settings: PlatformFeeSettings
): FeeCalculation {
  if (!settings.enabled) {
    return {
      grossAmount: amount,
      platformFee: 0,
      netAmount: amount,
      feeType: settings.type,
      feeLabel: settings.fee_label,
      feeDescription: settings.fee_description,
      feeEnabled: false,
    };
  }
  
  let fee: number;
  
  if (settings.type === 'fixed') {
    fee = settings.fixed_amount;
  } else {
    fee = amount * (settings.percentage / 100);
    
    if (settings.min_fee && fee < settings.min_fee) {
      fee = settings.min_fee;
    }
    if (settings.max_fee && fee > settings.max_fee) {
      fee = settings.max_fee;
    }
  }
  
  fee = Math.round(fee * 100) / 100;
  
  return {
    grossAmount: amount,
    platformFee: fee,
    netAmount: Math.round((amount - fee) * 100) / 100,
    feeType: settings.type,
    feeLabel: settings.fee_label,
    feeDescription: settings.fee_description,
    feeEnabled: true,
  };
}

/**
 * Format fee for display
 */
export function formatFeeDescription(settings: PlatformFeeSettings): string {
  if (!settings.enabled) {
    return 'No fees';
  }
  
  if (settings.type === 'fixed') {
    return `$${settings.fixed_amount.toFixed(2)} per transaction`;
  } else {
    let desc = `${settings.percentage}%`;
    if (settings.min_fee) {
      desc += ` (min $${settings.min_fee.toFixed(2)}`;
      if (settings.max_fee) {
        desc += `, max $${settings.max_fee.toFixed(2)}`;
      }
      desc += ')';
    } else if (settings.max_fee) {
      desc += ` (max $${settings.max_fee.toFixed(2)})`;
    }
    return desc;
  }
}

/**
 * Update platform fee settings (admin only)
 */
export async function updatePlatformFeeSettings(
  settings: Partial<PlatformFeeSettings>,
  adminUserId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createServiceRoleClient();
    
    // Get current settings
    const { data: current } = await supabase
      .from('platform_settings')
      .select('id, value')
      .eq('key', 'platform_fee')
      .single();
    
    const currentSettings = current?.value || DEFAULT_FEE_SETTINGS;
    const newSettings = { ...currentSettings, ...settings };
    
    // Validate settings
    if (newSettings.type === 'fixed' && newSettings.fixed_amount < 0) {
      return { success: false, error: 'Fixed amount cannot be negative' };
    }
    if (newSettings.type === 'percentage' && (newSettings.percentage < 0 || newSettings.percentage > 100)) {
      return { success: false, error: 'Percentage must be between 0 and 100' };
    }
    if (newSettings.min_fee < 0) {
      return { success: false, error: 'Minimum fee cannot be negative' };
    }
    if (newSettings.max_fee && newSettings.max_fee < newSettings.min_fee) {
      return { success: false, error: 'Maximum fee cannot be less than minimum fee' };
    }
    
    let error;
    
    if (current?.id) {
      // Record exists - UPDATE it
      const result = await supabase
        .from('platform_settings')
        .update({
          value: newSettings,
          updated_at: new Date().toISOString(),
          updated_by: adminUserId,
        })
        .eq('key', 'platform_fee');
      
      error = result.error;
    } else {
      // Record doesn't exist - INSERT it
      const result = await supabase
        .from('platform_settings')
        .insert({
          key: 'platform_fee',
          value: newSettings,
          description: 'Platform fee configuration for all transactions',
          updated_at: new Date().toISOString(),
          updated_by: adminUserId,
        });
      
      error = result.error;
    }
    
    if (error) {
      return { success: false, error: error.message };
    }
    
    // Clear cache so new settings take effect immediately
    clearFeeSettingsCache();
    
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
