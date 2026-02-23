/**
 * scripts/backfill-trust-tiers.ts
 *
 * One-time script: calculates and persists trust_tier + vouch_count
 * for every existing user in the database.
 *
 * Run: npx ts-node --project tsconfig.json scripts/backfill-trust-tiers.ts
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in env
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

function calcTier(vouchCount: number) {
  if (vouchCount >= 11) return { tier: 'tier_4', name: 'High Trust' };
  if (vouchCount >= 6)  return { tier: 'tier_3', name: 'Established Trust' };
  if (vouchCount >= 3)  return { tier: 'tier_2', name: 'Building Trust' };
  return { tier: 'tier_1', name: 'Low Trust' };
}

async function main() {
  console.log('Starting trust tier backfill…');

  // Fetch all user IDs (paginate in batches of 200)
  let page = 0;
  const PAGE_SIZE = 200;
  let totalProcessed = 0;
  let hasMore = true;

  while (hasMore) {
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) {
      console.error('Failed to fetch users:', error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      hasMore = false;
      break;
    }

    for (const user of users) {
      const { count } = await supabase
        .from('vouches')
        .select('*', { count: 'exact', head: true })
        .eq('vouchee_id', user.id)
        .eq('status', 'active');

      const vouchCount = count ?? 0;
      const { tier } = calcTier(vouchCount);

      const { error: updateError } = await supabase
        .from('users')
        .update({
          trust_tier: tier,
          vouch_count: vouchCount,
          active_vouches_count: vouchCount,
          trust_tier_updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        console.warn(`Failed to update user ${user.id}: ${updateError.message}`);
      } else {
        totalProcessed++;
        if (totalProcessed % 25 === 0) {
          console.log(`  Processed ${totalProcessed} users…`);
        }
      }
    }

    if (users.length < PAGE_SIZE) hasMore = false;
    page++;
  }

  console.log(`✅ Done. Trust tiers set for ${totalProcessed} users.`);
}

main().catch((e) => {
  console.error('Backfill failed:', e);
  process.exit(1);
});
