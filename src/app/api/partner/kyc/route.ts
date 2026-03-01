// GET  /api/partner/kyc?user_id=<uuid>   — get KYC status
// POST /api/partner/kyc                  — submit KYC data
//
// Capital Circle collects all KYC fields and submits them here.
// Feyza admins review and approve/reject via feyza.app/admin/verification.
// Protected by X-Partner-Secret.

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { verifyPartnerSecret }       from '../_auth';
import { logger } from '@/lib/logger';

const log = logger('partner-kyc');

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
}

// ── GET — fetch KYC status ────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  const user_id = req.nextUrl.searchParams.get('user_id');
  if (!user_id) {
    return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
  }

  try {
    const db = serviceClient();

    const { data: user, error } = await db
      .from('users')
      .select(`
        id, verification_status, is_blocked,
        verification_submitted_at, verification_reviewed_at, verification_notes,
        kyc_verified_at, reverification_required, reverification_due_at, verification_count,
        id_type, id_number, id_front_url, id_back_url, id_expiry,
        selfie_url, selfie_verified, selfie_verified_at,
        phone_verified, phone_number,
        date_of_birth, ssn_last4,
        employment_status, employer_name, job_title, monthly_income_range,
        address_line1, address_line2, city, state_province, postal_code, country,
        address_document_url, address_document_type,
        full_name, email, avatar_url
      `)
      .eq('id', user_id)
      .single();

    if (error || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map verification_status → kyc_status
    const statusMap: Record<string, string> = {
      verified:  'approved',
      approved:  'approved',
      pending:   'pending',
      submitted: 'pending',
      rejected:  'rejected',
      review:    'needs_review',
    };
    const kyc_status = statusMap[user.verification_status ?? 'pending'] ?? 'not_started';

    // Reverification: every 90 days
    const now = new Date();
    const reverification_due = user.reverification_due_at ? new Date(user.reverification_due_at) : null;
    const reverification_overdue = reverification_due ? now > reverification_due : false;
    const days_until_reverification = reverification_due
      ? Math.ceil((reverification_due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return NextResponse.json({
      user_id,
      kyc_status,
      is_verified:             user.verification_status === 'verified',
      verification_status:     user.verification_status,
      verification_notes:      user.verification_notes ?? null,
      submitted_at:            user.verification_submitted_at ?? null,
      reviewed_at:             user.verification_reviewed_at ?? null,
      verified_at:             user.kyc_verified_at ?? null,
      reverification_required:   user.reverification_required ?? false,
      reverification_due_at:     user.reverification_due_at ?? null,
      reverification_overdue,
      days_until_reverification,
      verification_count:        user.verification_count ?? 0,
      documents: {
        id_type:        user.id_type ?? null,
        has_id_front:   !!user.id_front_url,
        has_id_back:    !!user.id_back_url,
        has_selfie:     !!user.selfie_verified,
        phone_verified: user.phone_verified ?? false,
      },
      // Full profile — pre-populates the verify form
      profile: {
        full_name:             user.full_name ?? null,
        email:                 user.email ?? null,
        avatar_url:            user.avatar_url ?? null,
        phone_number:          user.phone_number ?? null,
        date_of_birth:         user.date_of_birth ?? null,
        ssn_last4:             user.ssn_last4 ? '••••' : null,
        id_type:               user.id_type ?? null,
        id_number:             user.id_number
          ? user.id_number.slice(0, -4).replace(/./g, '•') + user.id_number.slice(-4)
          : null,
        id_expiry:             user.id_expiry ?? null,
        id_front_url:          user.id_front_url ?? null,
        id_back_url:           user.id_back_url ?? null,
        selfie_url:            user.selfie_url ?? null,
        selfie_verified:       user.selfie_verified ?? false,
        employment_status:     user.employment_status ?? null,
        employer_name:         user.employer_name ?? null,
        job_title:             user.job_title ?? null,
        monthly_income_range:  user.monthly_income_range ?? null,
        address_line1:         user.address_line1 ?? null,
        address_line2:         user.address_line2 ?? null,
        city:                  user.city ?? null,
        state_province:        user.state_province ?? null,
        postal_code:           user.postal_code ?? null,
        country:               user.country ?? null,
        address_document_type: user.address_document_type ?? null,
        address_document_url:  user.address_document_url ?? null,
      },
    });
  } catch (err: unknown) {
    log.error('[Partner /kyc GET]', err);
    return NextResponse.json({ error: 'Failed to fetch KYC status' }, { status: 500 });
  }
}

// ── POST — submit KYC data ────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const guard = verifyPartnerSecret(req);
  if (guard) return guard;

  try {
    const body = await req.json();
    const {
      user_id,
      // Step 1: Personal
      date_of_birth,
      phone_number,
      ssn_last4,
      // Step 2: Identity
      id_type,
      id_number,
      id_front_url,
      id_back_url,
      id_expiry,
      // Step 3: Selfie
      selfie_url,
      // Step 4: Employment
      employment_status,
      employer_name,
      job_title,
      monthly_income_range,
      employment_document_url,
      // Step 5: Address
      address_line1,
      address_line2,
      city,
      state_province,
      postal_code,
      country,
      address_document_url,
      address_document_type,
      // Terms
      terms_accepted,
      privacy_accepted,
    } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id is required' }, { status: 400 });
    }

    const db = serviceClient();

    // Build update payload — only include fields that were provided
    const updates: Record<string, any> = {
      verification_status:        'pending',
      verification_submitted_at:  new Date().toISOString(),
      updated_at:                 new Date().toISOString(),
    };

    if (date_of_birth)           updates.date_of_birth            = date_of_birth;
    if (phone_number)            updates.phone_number              = phone_number;
    if (ssn_last4)               updates.ssn_last4                 = ssn_last4;
    if (id_type)                 updates.id_type                   = id_type;
    if (id_number)               updates.id_number                 = id_number;
    if (id_front_url)            updates.id_front_url              = id_front_url;
    if (id_back_url)             updates.id_back_url               = id_back_url;
    if (id_expiry)               updates.id_expiry                 = id_expiry;
    if (selfie_url) {
      updates.selfie_url         = selfie_url;
      updates.selfie_verified    = false; // Admin will verify
    }
    if (employment_status)       updates.employment_status         = employment_status;
    if (employer_name)           updates.employer_name             = employer_name;
    if (job_title)               updates.job_title                 = job_title;
    if (monthly_income_range)    updates.monthly_income_range      = monthly_income_range;
    if (employment_document_url) updates.employment_document_url   = employment_document_url;
    if (address_line1)           updates.address_line1             = address_line1;
    if (address_line2)           updates.address_line2             = address_line2;
    if (city)                    updates.city                      = city;
    if (state_province)          updates.state_province            = state_province;
    if (postal_code)             updates.postal_code               = postal_code;
    if (country)                 updates.country                   = country;
    if (address_document_url)    updates.address_document_url      = address_document_url;
    if (address_document_type)   updates.address_document_type     = address_document_type;
    if (terms_accepted)          { updates.terms_accepted = true;   updates.terms_accepted_at = new Date().toISOString(); }
    if (privacy_accepted)        { updates.privacy_accepted = true; updates.privacy_accepted_at = new Date().toISOString(); }

    const { error } = await db
      .from('users')
      .update(updates)
      .eq('id', user_id);

    if (error) {
      log.error('[Partner /kyc POST] Update error:', error);
      return NextResponse.json({ error: 'Failed to submit KYC data' }, { status: 500 });
    }

    return NextResponse.json({
      success:    true,
      kyc_status: 'pending',
      message:    'KYC submission received. Under review by Feyza admins.',
    });
  } catch (err: unknown) {
    log.error('[Partner /kyc POST]', err);
    return NextResponse.json({ error: 'KYC submission failed' }, { status: 500 });
  }
}
