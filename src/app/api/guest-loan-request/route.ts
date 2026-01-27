import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { sendEmail, getLoanRequestSubmittedEmail } from '@/lib/email';
import { randomBytes } from 'crypto';
import { validateRepaymentSchedule } from '@/lib/smartSchedule';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    const body = await request.json();

    const { 
      amount, 
      currency, 
      purpose, 
      full_name, 
      email, 
      description,
      proposed_frequency,
      proposed_installments,
      proposed_payment_amount,
      proposed_start_date,
      bank_connected,
      // Dwolla info from bank connection
      borrower_dwolla_customer_url,
      borrower_dwolla_customer_id,
      borrower_dwolla_funding_source_url,
      borrower_dwolla_funding_source_id,
      borrower_plaid_access_token,
      borrower_bank_name,
      borrower_bank_account_mask,
      borrower_bank_account_type,
    } = body;

    // Validation
    if (!amount || !currency || !purpose || !full_name || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be greater than 0' },
        { status: 400 }
      );
    }

    if (!bank_connected) {
      return NextResponse.json(
        { error: 'Please connect your bank account to receive the loan' },
        { status: 400 }
      );
    }

    // Validate proposed repayment schedule
    if (proposed_frequency && proposed_installments) {
      const validation = validateRepaymentSchedule(amount, proposed_frequency, proposed_installments);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.message },
          { status: 400 }
        );
      }
    }

    // Check if user exists with this email (for linking if they have an account)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();

    // Generate access tokens
    // We use ONE token that works for both loan_requests and loans
    const borrowerAccessToken = generateToken();
    const tokenExpires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    // Create loan request record
    // Store the borrower token here so the borrower portal can find it
    const { data: loanRequest, error: createError } = await supabase
      .from('loan_requests')
      .insert({
        amount,
        currency,
        purpose,
        description,
        borrower_name: full_name,
        borrower_email: email.toLowerCase(),
        borrower_user_id: existingUser?.id || null,
        status: 'pending',
        access_token: borrowerAccessToken, // Same token used for borrower portal
        access_token_expires: tokenExpires.toISOString(),
        // Proposed repayment schedule
        proposed_frequency: proposed_frequency || 'monthly',
        proposed_installments: proposed_installments || 1,
        proposed_payment_amount: proposed_payment_amount || amount,
        proposed_start_date: proposed_start_date || null,
        // Dwolla/bank info for receiving funds
        borrower_dwolla_customer_url,
        borrower_dwolla_customer_id,
        borrower_dwolla_funding_source_url,
        borrower_dwolla_funding_source_id,
        borrower_plaid_access_token,
        borrower_bank_name,
        borrower_bank_account_mask,
        borrower_bank_account_type,
        borrower_bank_connected: bank_connected,
      })
      .select()
      .single();

    if (createError) {
      console.error('Create loan request error:', createError);
      throw createError;
    }

    // Create loan in 'pending' status so borrower can track it via /borrower/[token]
    // We only include fields that definitely exist in the loans table
    const loanData: any = {
      amount: parseFloat(String(amount)),
      currency,
      purpose,
      description: description || null,
      status: 'pending',
      lender_type: 'personal',
      // Borrower info
      borrower_id: existingUser?.id || null,
      borrower_invite_email: email.toLowerCase(),
      // Borrower access token for /borrower/[token] portal
      borrower_access_token: borrowerAccessToken,
      borrower_access_token_expires: tokenExpires.toISOString(),
      // Default values for required fields
      interest_rate: 0,
      interest_type: 'fixed',
      total_interest: 0,
      total_amount: parseFloat(String(amount)),
      amount_paid: 0,
      amount_remaining: parseFloat(String(amount)),
      repayment_frequency: proposed_frequency || 'monthly',
      total_installments: proposed_installments || 1,
      repayment_amount: proposed_payment_amount || amount,
    };

    // Only add optional fields if they have values
    if (borrower_dwolla_customer_url) loanData.borrower_dwolla_customer_url = borrower_dwolla_customer_url;
    if (borrower_dwolla_customer_id) loanData.borrower_dwolla_customer_id = borrower_dwolla_customer_id;
    if (borrower_dwolla_funding_source_url) loanData.borrower_dwolla_funding_source_url = borrower_dwolla_funding_source_url;
    if (borrower_dwolla_funding_source_id) loanData.borrower_dwolla_funding_source_id = borrower_dwolla_funding_source_id;
    if (borrower_bank_name) loanData.borrower_bank_name = borrower_bank_name;
    if (borrower_bank_account_mask) loanData.borrower_bank_account_mask = borrower_bank_account_mask;
    if (bank_connected) loanData.borrower_bank_connected = bank_connected;

    console.log('[Guest Loan Request] Creating loan with data:', JSON.stringify(loanData, null, 2));

    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .insert(loanData)
      .select()
      .single();

    if (loanError) {
      console.error('[Guest Loan Request] Loan creation failed:', loanError);
      // Still continue - loan request was created, we'll return a fallback token
    } else {
      console.log('[Guest Loan Request] Loan created successfully:', loan?.id);
      
      // Update loan request with the loan_id
      await supabase
        .from('loan_requests')
        .update({ loan_id: loan.id })
        .eq('id', loanRequest.id);
    }

    // Send confirmation email to borrower
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const emailContent = getLoanRequestSubmittedEmail({
      borrowerName: full_name,
      amount,
      currency,
      purpose,
      requestId: loanRequest.id,
      accessToken: borrowerAccessToken,
    });

    try {
      await sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
      });
    } catch (emailError) {
      console.error('[Guest Loan Request] Email sending failed:', emailError);
      // Continue anyway - loan was created
    }

    return NextResponse.json({
      success: true,
      request_id: loanRequest.id,
      loan_id: loan?.id || null,
      borrower_token: borrowerAccessToken, // Single token for borrower portal
      message: 'Loan request submitted successfully',
    });

  } catch (error) {
    console.error('Guest loan request error:', error);
    return NextResponse.json(
      { error: 'Failed to submit loan request' },
      { status: 500 }
    );
  }
}

// GET: Fetch all pending loan requests (for matching/browsing)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServiceRoleClient();
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    const { data: requests, error, count } = await supabase
      .from('loan_requests')
      .select('*', { count: 'exact' })
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      requests,
      total: count,
      limit,
      offset,
    });

  } catch (error) {
    console.error('Fetch loan requests error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch loan requests' },
      { status: 500 }
    );
  }
}
