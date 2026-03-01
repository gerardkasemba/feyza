import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { 
  getPlatformFeeSettings, 
  updatePlatformFeeSettings, 
  calculatePlatformFee,
  clearFeeSettingsCache,
  PlatformFeeSettings 
} from '@/lib/platformFee';
import { logger } from '@/lib/logger';

const log = logger('admin-platform-fee');

// GET: Get current platform fee settings (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const amount = searchParams.get('amount');
    
    const settings = await getPlatformFeeSettings();
    
    // If amount is provided, calculate the fee
    if (amount) {
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum < 0) {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
      }
      
      const feeCalc = await calculatePlatformFee(amountNum);
      return NextResponse.json({
        settings,
        calculation: feeCalc,
      });
    }
    
    return NextResponse.json({ settings });
  } catch (error: unknown) {
    log.error('Error getting platform fee settings:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to get settings' },
      { status: 500 }
    );
  }
}

// POST: Update platform fee settings (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Check if user is admin
    let serviceSupabase;
    try {
      serviceSupabase = await createServiceRoleClient();
    } catch (err) {
      // Fall back to regular client if service role not configured
      serviceSupabase = supabase;
    }
    
    const { data: profile } = await serviceSupabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();
    
    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    const body = await request.json();
    const { 
      enabled,
      type,
      fixed_amount,
      percentage,
      min_fee,
      max_fee,
      fee_label,
      fee_description,
    } = body;
    
    const updates: Partial<PlatformFeeSettings> = {};
    
    if (enabled !== undefined) updates.enabled = enabled;
    if (type !== undefined) updates.type = type; // Now supports 'fixed', 'percentage', 'combined'
    if (fixed_amount !== undefined) updates.fixed_amount = parseFloat(fixed_amount);
    if (percentage !== undefined) updates.percentage = parseFloat(percentage);
    if (min_fee !== undefined) updates.min_fee = parseFloat(min_fee);
    if (max_fee !== undefined) updates.max_fee = max_fee ? parseFloat(max_fee) : 0;
    if (fee_label !== undefined) updates.fee_label = fee_label;
    if (fee_description !== undefined) updates.fee_description = fee_description;
    
    const result = await updatePlatformFeeSettings(updates, user.id);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // Get updated settings
    clearFeeSettingsCache();
    const newSettings = await getPlatformFeeSettings();
    
    return NextResponse.json({ 
      success: true, 
      settings: newSettings,
      message: 'Platform fee settings updated successfully',
    });
  } catch (error: unknown) {
    log.error('Error updating platform fee settings:', error);
    return NextResponse.json(
      { error: (error as Error).message || 'Failed to update settings' },
      { status: 500 }
    );
  }
}
