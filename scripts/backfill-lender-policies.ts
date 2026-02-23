/**
 * scripts/backfill-lender-policies.ts
 *
 * One-time script: creates default lender_tier_policies for every
 * existing lender who has a lender_preferences row.
 *
 * Policy: flat rate across all 4 tiers (same rate as their current setting).
 * Max amount: same as their current max_amount for all tiers.
 *
 * Run: npx ts-node --project tsconfig.json scripts/backfill-lender-policies.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

const TIERS = ['tier_1', 'tier_2', 'tier_3', 'tier_4'] as const;

async function main() {
  console.log('Starting lender tier policy backfill…');

  const { data: prefs, error } = await supabase
    .from('lender_preferences')
    .select('user_id, interest_rate, max_amount')
    .not('user_id', 'is', null); // individual lenders only

  if (error) {
    console.error('Failed to fetch lender_preferences:', error.message);
    process.exit(1);
  }

  if (!prefs || prefs.length === 0) {
    console.log('No individual lenders found. Nothing to backfill.');
    return;
  }

  console.log(`Found ${prefs.length} individual lender(s) to backfill.`);

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const pref of prefs) {
    if (!pref.user_id) continue;

    const rate = Number(pref.interest_rate) || 10;
    const maxAmount = Number(pref.max_amount) || 500;

    const rows = TIERS.map((tier) => ({
      lender_id: pref.user_id,
      tier_id: tier,
      interest_rate: rate,        // flat rate — lender can adjust later
      max_loan_amount: maxAmount, // flat max — lender can adjust later
      is_active: true,
    }));

    const { error: upsertError } = await supabase
      .from('lender_tier_policies')
      .upsert(rows, { onConflict: 'lender_id,tier_id', ignoreDuplicates: true });

    if (upsertError) {
      console.warn(`  Failed for lender ${pref.user_id}: ${upsertError.message}`);
      totalSkipped++;
    } else {
      totalCreated += rows.length;
    }
  }

  console.log(`✅ Done. Created ${totalCreated} policy rows. Skipped ${totalSkipped} lender(s) with errors.`);
  console.log('   Remind lenders to review their tier policies in Settings → Trust Tiers.');
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
