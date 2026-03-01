// ─────────────────────────────────────────────────────────────────────────────
// Feyza Partner API — Shared Auth Guard
//
// All /api/partner/* routes are exclusively for approved partner apps
// (e.g. Capital Circle). They authenticate with a shared secret sent in the
// X-Partner-Secret header. This is a server-to-server secret — never exposed
// to end users.
//
// Set FEYZA_PARTNER_SECRET in your .env.local (Feyza side).
// The same value goes in FEYZA_PARTNER_SECRET on the Capital Circle side.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const log = logger('partner-_auth');

const PARTNER_SECRET = process.env.FEYZA_PARTNER_SECRET ?? '';

/**
 * Verify the incoming request carries the correct partner secret.
 * Returns null on success, or a 401/403 NextResponse to return immediately.
 */
export function verifyPartnerSecret(req: NextRequest): NextResponse | null {
  if (!PARTNER_SECRET) {
    log.error('[Partner API] FEYZA_PARTNER_SECRET is not set!');
    return NextResponse.json(
      { error: 'Partner API not configured' },
      { status: 500 },
    );
  }

  const secret = req.headers.get('X-Partner-Secret');

  if (!secret) {
    return NextResponse.json(
      { error: 'Missing X-Partner-Secret header' },
      { status: 401 },
    );
  }

  if (secret !== PARTNER_SECRET) {
    return NextResponse.json(
      { error: 'Invalid partner secret' },
      { status: 403 },
    );
  }

  return null; // All good
}

/**
 * Lightweight user shape returned from all partner routes.
 * Intentionally excludes sensitive fields (Plaid tokens, Dwolla IDs, etc).
 */
export interface PartnerUser {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  username: string | null;
  // KYC / verification
  kyc_status: 'not_started' | 'pending' | 'approved' | 'rejected' | 'needs_review';
  is_verified: boolean;
  verification_status: string | null;
  // Trust
  trust_tier: 'tier_1' | 'tier_2' | 'tier_3' | 'tier_4';
  vouch_count: number;
  // Account health
  is_blocked: boolean;
  is_suspended: boolean;
  created_at: string;
}

/**
 * Map a raw users row into the safe PartnerUser shape.
 */
export function toPartnerUser(row: Record<string, any>): PartnerUser {
  // Derive kyc_status from verification_status
  const vs = row.verification_status ?? 'pending';
  const kyc_status_map: Record<string, PartnerUser['kyc_status']> = {
    verified:  'approved',
    approved:  'approved',
    pending:   'pending',
    rejected:  'rejected',
    review:    'needs_review',
    submitted: 'pending',
  };
  const kyc_status = kyc_status_map[vs] ?? 'not_started';

  return {
    id:                 row.id,
    email:              row.email,
    full_name:          row.full_name ?? '',
    avatar_url:         row.avatar_url ?? null,
    phone:              row.phone ?? row.phone_number ?? null,
    username:           row.username ?? null,
    kyc_status,
    is_verified:        row.is_verified ?? (vs === 'verified'),
    verification_status: vs,
    trust_tier:         row.trust_tier ?? 'tier_1',
    vouch_count:        row.vouch_count ?? 0,
    is_blocked:         row.is_blocked ?? false,
    is_suspended:       row.is_suspended ?? false,
    created_at:         row.created_at,
  };
}
