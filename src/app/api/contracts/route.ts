import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { format } from 'date-fns';
import { generateContractHtml, escapeHtml, type ContractLoan } from './contractHtml';
import { onVoucheeNewLoan } from '@/lib/vouching/accountability';
import { logger } from '@/lib/logger';
import type { User, BusinessProfile, PaymentScheduleItem, LenderType } from '@/types';

/** Update payload for contract signing */
interface ContractSignUpdate {
  contract_generated: boolean;
  borrower_signed?: boolean;
  borrower_signed_at?: string;
  borrower_signature_ip?: string;
  lender_signed?: boolean;
  lender_signed_at?: string;
  lender_signature_ip?: string;
}

const log = logger('contracts');

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET: Generate contract HTML for viewing/downloading
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'loanId is required' }, { status: 400 });
    }

    const serviceSupabase = await createServiceRoleClient();

    // Get loan with all details (service role so borrower/lender are always visible regardless of RLS)
    const { data: loan, error } = await serviceSupabase
      .from('loans')
      .select(
        `
        *,
        borrower:users!borrower_id(id, full_name, email, phone),
        lender:users!lender_id(id, full_name, email),
        business_lender:business_profiles!business_lender_id(id, business_name, contact_email, location, user_id),
        schedule:payment_schedule(*)
      `
      )
      .eq('id', loanId)
      .single();

    if (error || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Generate contract HTML
    const contractHtml = generateContractHtml(loan);

    return new NextResponse(contractHtml, {
      headers: {
        'Content-Type': 'text/html',
      },
    });
  } catch (error) {
    log.error('Contract generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Sign the contract
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { loanId, role } = body;

    if (!loanId || !role) {
      return NextResponse.json({ error: 'loanId and role are required' }, { status: 400 });
    }

    // Get client IP
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';

    // Get loan to verify user role
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, business_lender:business_profiles(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Verify user is authorized to sign
    const isBorrower = loan.borrower_id === user.id;
    const isLender =
      loan.lender_id === user.id || (loan.business_lender && loan.business_lender.user_id === user.id);

    if (role === 'borrower' && !isBorrower) {
      return NextResponse.json({ error: 'Not authorized to sign as borrower' }, { status: 403 });
    }
    if (role === 'lender' && !isLender) {
      return NextResponse.json({ error: 'Not authorized to sign as lender' }, { status: 403 });
    }

    // Update loan with signature
    const updateData: ContractSignUpdate = {
      contract_generated: true,
    };

    if (role === 'borrower') {
      updateData.borrower_signed = true;
      updateData.borrower_signed_at = new Date().toISOString();
      updateData.borrower_signature_ip = ip;
    } else {
      updateData.lender_signed = true;
      updateData.lender_signed_at = new Date().toISOString();
      updateData.lender_signature_ip = ip;
    }

    const { error: updateError } = await supabase.from('loans').update(updateData).eq('id', loanId);

    if (updateError) {
      log.error('Error updating loan signature:', updateError);
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    }

    // Check if both parties have signed - activate loan if so
    const { data: updatedLoan } = await supabase
      .from('loans')
      .select('borrower_signed, lender_signed, status')
      .eq('id', loanId)
      .single();

    if (updatedLoan?.borrower_signed && updatedLoan?.lender_signed && updatedLoan?.status === 'pending') {
      await supabase.from('loans').update({ status: 'active' }).eq('id', loanId);

      // Increment loans_active on all vouchers for this borrower (voucher accountability)
      if (loan.borrower_id) {
        const serviceSupabase = await createServiceRoleClient();
        try {
          await onVoucheeNewLoan(serviceSupabase as any, loan.borrower_id, loanId);
        } catch (err) {
          log.error('[Contracts] onVoucheeNewLoan error (non-fatal):', err);
        }
      }

      // Notify both parties
      await supabase.from('notifications').insert([
        {
          user_id: loan.borrower_id,
          loan_id: loanId,
          type: 'loan_accepted',
          title: 'Contract signed - Loan active',
          message: 'Both parties have signed the contract. Your loan is now active.',
        },
      ]);
    }

    return NextResponse.json({
      success: true,
      bothSigned: updatedLoan?.borrower_signed && updatedLoan?.lender_signed,
    });
  } catch (error) {
    log.error('Contract signing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ======================
// Generate contract HTML
// ======================
