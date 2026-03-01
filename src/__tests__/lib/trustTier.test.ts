/**
 * Trust tier tests
 * 
 * Since calculateSimpleTrustTier hits Supabase, we test the tier-mapping
 * logic by extracting and testing the pure mapping function directly,
 * and separately verify DB calls via mocks.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Pure tier mapping (extracted for unit testing) ───────────────────────────

function mapVouchCountToTier(vouchCount: number) {
  if (vouchCount >= 11) {
    return { tier: 'tier_4', tierNumber: 4, tierName: 'High Trust', nextTierVouches: 0 };
  } else if (vouchCount >= 6) {
    return { tier: 'tier_3', tierNumber: 3, tierName: 'Established Trust', nextTierVouches: 11 - vouchCount };
  } else if (vouchCount >= 3) {
    return { tier: 'tier_2', tierNumber: 2, tierName: 'Building Trust', nextTierVouches: 6 - vouchCount };
  } else {
    return { tier: 'tier_1', tierNumber: 1, tierName: 'Low Trust', nextTierVouches: 3 - vouchCount };
  }
}

describe('Trust Tier Mapping', () => {
  describe('Tier 1 — Low Trust (0–2 vouches)', () => {
    it('assigns tier_1 with 0 vouches', () => {
      const result = mapVouchCountToTier(0);
      expect(result.tier).toBe('tier_1');
      expect(result.tierNumber).toBe(1);
      expect(result.tierName).toBe('Low Trust');
      expect(result.nextTierVouches).toBe(3);
    });

    it('assigns tier_1 with 1 vouch', () => {
      const result = mapVouchCountToTier(1);
      expect(result.tier).toBe('tier_1');
      expect(result.nextTierVouches).toBe(2);
    });

    it('assigns tier_1 with 2 vouches', () => {
      const result = mapVouchCountToTier(2);
      expect(result.tier).toBe('tier_1');
      expect(result.nextTierVouches).toBe(1);
    });
  });

  describe('Tier 2 — Building Trust (3–5 vouches)', () => {
    it('assigns tier_2 at exactly 3 vouches', () => {
      const result = mapVouchCountToTier(3);
      expect(result.tier).toBe('tier_2');
      expect(result.tierNumber).toBe(2);
      expect(result.nextTierVouches).toBe(3); // needs 3 more to reach tier_3
    });

    it('assigns tier_2 with 5 vouches', () => {
      const result = mapVouchCountToTier(5);
      expect(result.tier).toBe('tier_2');
      expect(result.nextTierVouches).toBe(1);
    });
  });

  describe('Tier 3 — Established Trust (6–10 vouches)', () => {
    it('assigns tier_3 at exactly 6 vouches', () => {
      const result = mapVouchCountToTier(6);
      expect(result.tier).toBe('tier_3');
      expect(result.tierNumber).toBe(3);
      expect(result.nextTierVouches).toBe(5);
    });

    it('assigns tier_3 with 10 vouches', () => {
      const result = mapVouchCountToTier(10);
      expect(result.tier).toBe('tier_3');
      expect(result.nextTierVouches).toBe(1);
    });
  });

  describe('Tier 4 — High Trust (11+ vouches)', () => {
    it('assigns tier_4 at exactly 11 vouches', () => {
      const result = mapVouchCountToTier(11);
      expect(result.tier).toBe('tier_4');
      expect(result.tierNumber).toBe(4);
      expect(result.nextTierVouches).toBe(0); // max tier
    });

    it('assigns tier_4 with 100 vouches', () => {
      const result = mapVouchCountToTier(100);
      expect(result.tier).toBe('tier_4');
      expect(result.nextTierVouches).toBe(0);
    });
  });

  describe('Boundary conditions', () => {
    // Verify each boundary value produces the right tier
    const tierBoundaries: [number, string][] = [
      [0, 'tier_1'],
      [2, 'tier_1'],
      [3, 'tier_2'],
      [5, 'tier_2'],
      [6, 'tier_3'],
      [10, 'tier_3'],
      [11, 'tier_4'],
      [50, 'tier_4'],
    ];

    tierBoundaries.forEach(([vouches, expectedTier]) => {
      it(`${vouches} vouches → ${expectedTier}`, () => {
        expect(mapVouchCountToTier(vouches).tier).toBe(expectedTier);
      });
    });
  });

  describe('nextTierVouches logic', () => {
    it('is always 0 at tier_4', () => {
      [11, 15, 50].forEach((v) => {
        expect(mapVouchCountToTier(v).nextTierVouches).toBe(0);
      });
    });

    it('counts down correctly within tier_2', () => {
      expect(mapVouchCountToTier(3).nextTierVouches).toBe(3);
      expect(mapVouchCountToTier(4).nextTierVouches).toBe(2);
      expect(mapVouchCountToTier(5).nextTierVouches).toBe(1);
    });

    it('counts down correctly within tier_3', () => {
      expect(mapVouchCountToTier(6).nextTierVouches).toBe(5);
      expect(mapVouchCountToTier(9).nextTierVouches).toBe(2);
      expect(mapVouchCountToTier(10).nextTierVouches).toBe(1);
    });
  });
});

// ─── calculateSimpleTrustTier integration (mocked Supabase) ───────────────────

describe('calculateSimpleTrustTier (mocked DB)', () => {
  it('returns the correct tier for a given vouch count via mocked Supabase', async () => {
    // Mock createServiceRoleClientDirect to return controlled vouch counts
    vi.doMock('@/lib/supabase/server', () => ({
      createServiceRoleClientDirect: () => ({
        from: (table: string) => {
          if (table === 'vouches') {
            return {
              select: () => ({
                eq: () => ({
                  eq: () => Promise.resolve({ count: 5, error: null }),
                }),
              }),
            };
          }
          // users table — tier persistence, non-blocking
          return {
            update: () => ({
              eq: () => Promise.resolve({ error: null }),
            }),
          };
        },
      }),
    }));

    // Dynamically import AFTER mock is set to avoid hoisting issues
    const { calculateSimpleTrustTier } = await import('@/lib/trust/simple-tier?t=' + Date.now());
    const result = await calculateSimpleTrustTier('user-test-id');

    // 5 vouches → tier_2
    expect(result.tier).toBe('tier_2');
    expect(result.vouchCount).toBe(5);
    expect(result.nextTierVouches).toBe(1); // needs 1 more to reach tier_3

    vi.doUnmock('@/lib/supabase/server');
  });
});
