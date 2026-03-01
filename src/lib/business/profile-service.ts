import { logger } from '@/lib/logger';
import { SupabaseClient } from '@supabase/supabase-js';

const log = logger('business-profile-service');

// ─────────────────────────────────────────────────────────────────────────────
// SLUG  (replaces set_business_slug + generate_business_slug DB trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a URL-safe slug from a business name.
 * Mirrors generate_business_slug() Postgres function exactly.
 */
export function generateBusinessSlug(businessName: string): string {
  let slug = businessName.toLowerCase()
    .replace(/[^a-zA-Z0-9\s]/g, '')   // remove special chars
    .replace(/\s+/g, '-')              // spaces → hyphens
    .replace(/-+/g, '-')               // collapse multiple hyphens
    .replace(/^-|-$/g, '');            // trim leading/trailing hyphens
  return slug.substring(0, 50);
}

/**
 * Generate a unique slug for a business, appending -1, -2, etc. if needed.
 * Call BEFORE inserting a new business_profiles row.
 */
export async function generateUniqueBusinessSlug(
  supabase: SupabaseClient,
  businessName: string
): Promise<string> {
  const base = generateBusinessSlug(businessName);
  let candidate = base;
  let counter = 0;

  while (true) {
    const { count } = await supabase
      .from('business_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('slug', candidate);

    if (!count || count === 0) return candidate;

    counter++;
    candidate = `${base}-${counter}`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LENDER PREFS SYNC  (replaces sync_business_to_lender_preferences trigger)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * After creating or updating a business_profiles row, call this to keep
 * lender_preferences in sync. Replaces tr_sync_business_lender_prefs trigger.
 *
 * On INSERT: upserts a lender_preferences row (is_active=false until approved).
 * On UPDATE: refreshes rate, amounts, and is_active status.
 */
export async function syncBusinessToLenderPrefs(
  supabase: SupabaseClient,
  businessId: string
): Promise<void> {
  try {
    const { data: biz } = await supabase
      .from('business_profiles')
      .select(`
        id, default_interest_rate, interest_type, min_loan_amount, max_loan_amount,
        is_verified, profile_completed, verification_status
      `)
      .eq('id', businessId)
      .single();

    if (!biz) return;

    const isActive =
      biz.is_verified === true &&
      biz.profile_completed === true &&
      biz.verification_status === 'approved';

    // Check if prefs row already exists
    const { count } = await supabase
      .from('lender_preferences')
      .select('id', { count: 'exact', head: true })
      .eq('business_id', businessId);

    if (count && count > 0) {
      // Update existing
      await supabase
        .from('lender_preferences')
        .update({
          interest_rate:  biz.default_interest_rate ?? undefined,
          interest_type:  biz.interest_type         ?? undefined,
          min_amount:     biz.min_loan_amount        ?? undefined,
          max_amount:     biz.max_loan_amount        ?? undefined,
          is_active:      isActive,
          updated_at:     new Date().toISOString(),
        })
        .eq('business_id', businessId);
    } else {
      // Create new — is_active=false until admin approves
      await supabase
        .from('lender_preferences')
        .insert({
          business_id:               businessId,
          is_active:                 false,
          interest_rate:             biz.default_interest_rate ?? 10,
          interest_type:             biz.interest_type         ?? 'simple',
          min_amount:                biz.min_loan_amount        ?? 50,
          max_amount:                biz.max_loan_amount        ?? 500,
          auto_accept:               false,
          preferred_currency:        'USD',
          min_borrower_rating:       'neutral',
          require_verified_borrower: false,
          min_term_weeks:            1,
          max_term_weeks:            52,
          capital_pool:              0,
          notify_on_match:           true,
          notify_email:              true,
          allow_first_time_borrowers: true,
        });
    }

    log.info(`[BusinessProfileService] lender_preferences synced for business ${businessId}`);
  } catch (err) {
    log.error('[BusinessProfileService] syncBusinessToLenderPrefs error:', err);
  }
}

/**
 * After updating business_profiles.first_time_borrower_amount, call this to
 * sync the value to lender_preferences. Replaces tr_sync_first_time_amount trigger.
 */
export async function syncFirstTimeBorrowerAmount(
  supabase: SupabaseClient,
  businessId: string,
  firstTimeAmount: number
): Promise<void> {
  try {
    await supabase
      .from('lender_preferences')
      .update({
        first_time_borrower_limit: firstTimeAmount,
        updated_at: new Date().toISOString(),
      })
      .eq('business_id', businessId);

    log.info(`[BusinessProfileService] first_time_borrower_limit synced: $${firstTimeAmount} for ${businessId}`);
  } catch (err) {
    log.error('[BusinessProfileService] syncFirstTimeBorrowerAmount error:', err);
  }
}
