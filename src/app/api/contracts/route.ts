import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { format } from 'date-fns';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET: Generate contract HTML for viewing/downloading
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const loanId = searchParams.get('loanId');

    if (!loanId) {
      return NextResponse.json({ error: 'loanId is required' }, { status: 400 });
    }

    const supabase = await createServerSupabaseClient();

    // Get loan with all details
    const { data: loan, error } = await supabase
      .from('loans')
      .select(`
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles(*, owner:users!user_id(*)),
        schedule:payment_schedule(*)
      `)
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
    console.error('Contract generation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Sign the contract
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
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
    const isLender = loan.lender_id === user.id || 
      (loan.business_lender && loan.business_lender.user_id === user.id);

    if (role === 'borrower' && !isBorrower) {
      return NextResponse.json({ error: 'Not authorized to sign as borrower' }, { status: 403 });
    }
    if (role === 'lender' && !isLender) {
      return NextResponse.json({ error: 'Not authorized to sign as lender' }, { status: 403 });
    }

    // Update loan with signature
    const updateData: any = {
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

    const { error: updateError } = await supabase
      .from('loans')
      .update(updateData)
      .eq('id', loanId);

    if (updateError) {
      console.error('Error updating loan signature:', updateError);
      return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
    }

    // Check if both parties have signed - activate loan if so
    const { data: updatedLoan } = await supabase
      .from('loans')
      .select('borrower_signed, lender_signed, status')
      .eq('id', loanId)
      .single();

    if (updatedLoan?.borrower_signed && updatedLoan?.lender_signed && updatedLoan?.status === 'pending') {
      await supabase
        .from('loans')
        .update({ status: 'active' })
        .eq('id', loanId);

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

    return NextResponse.json({ success: true, bothSigned: updatedLoan?.borrower_signed && updatedLoan?.lender_signed });
  } catch (error) {
    console.error('Contract signing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Generate contract HTML
function generateContractHtml(loan: any): string {
  const borrower = loan.borrower;
  const lender = loan.lender || loan.business_lender;
  const lenderName = loan.lender_type === 'business' 
    ? loan.business_lender?.business_name 
    : loan.lender?.full_name || loan.invite_email || 'Pending';
  const lenderType = loan.lender_type === 'business' ? 'Business' : 'Individual';
  
  const startDate = format(new Date(loan.start_date), 'MMMM d, yyyy');
  const createdDate = format(new Date(loan.created_at), 'MMMM d, yyyy');
  
  // Calculate end date from schedule
  const lastPayment = loan.schedule?.sort((a: any, b: any) => 
    new Date(b.due_date).getTime() - new Date(a.due_date).getTime()
  )[0];
  const endDate = lastPayment ? format(new Date(lastPayment.due_date), 'MMMM d, yyyy') : 'TBD';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Loan Agreement - ${loan.id}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      background: white;
    }
    .header {
      text-align: center;
      border-bottom: 3px double #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
    }
    .header p {
      color: #666;
    }
    .section {
      margin-bottom: 25px;
    }
    .section h2 {
      font-size: 16px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 5px;
      margin-bottom: 15px;
      text-transform: uppercase;
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
    .party {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 8px;
    }
    .party h3 {
      font-size: 14px;
      color: #666;
      margin-bottom: 10px;
    }
    .party p {
      margin: 5px 0;
    }
    .terms-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    .terms-table th,
    .terms-table td {
      padding: 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .terms-table th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }
    .schedule-table th,
    .schedule-table td {
      padding: 8px 12px;
      text-align: left;
      border: 1px solid #ddd;
    }
    .schedule-table th {
      background: #f5f5f5;
    }
    .clause {
      margin-bottom: 15px;
    }
    .clause-number {
      font-weight: bold;
      margin-right: 5px;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #333;
    }
    .signature-block {
      text-align: center;
    }
    .signature-line {
      border-bottom: 1px solid #333;
      height: 60px;
      margin-bottom: 10px;
    }
    .signature-name {
      font-weight: bold;
      margin-bottom: 5px;
    }
    .signature-date {
      color: #666;
      font-size: 14px;
    }
    .signed-badge {
      background: #22c55e;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-block;
      margin-top: 10px;
    }
    .pending-badge {
      background: #f59e0b;
      color: white;
      padding: 5px 15px;
      border-radius: 20px;
      font-size: 12px;
      display: inline-block;
      margin-top: 10px;
    }
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #ccc;
      text-align: center;
      color: #666;
      font-size: 12px;
    }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>LOAN AGREEMENT</h1>
    <p>Contract ID: ${loan.id}</p>
    <p>Date: ${createdDate}</p>
  </div>

  <div class="section">
    <h2>Parties to this Agreement</h2>
    <div class="parties">
      <div class="party">
        <h3>BORROWER</h3>
        <p><strong>${borrower.full_name}</strong></p>
        <p>Email: ${borrower.email}</p>
        ${borrower.phone ? `<p>Phone: ${borrower.phone}</p>` : ''}
      </div>
      <div class="party">
        <h3>LENDER (${lenderType})</h3>
        <p><strong>${lenderName}</strong></p>
        ${loan.lender_type === 'business' && loan.business_lender?.location ? 
          `<p>Location: ${loan.business_lender.location}</p>` : ''}
        ${loan.invite_email ? `<p>Email: ${loan.invite_email}</p>` : ''}
      </div>
    </div>
  </div>

  <div class="section">
    <h2>Loan Terms</h2>
    <table class="terms-table">
      <tr>
        <th>Principal Amount</th>
        <td>${loan.currency} ${loan.amount.toLocaleString()}</td>
      </tr>
      ${loan.interest_rate > 0 ? `
      <tr>
        <th>Interest Rate</th>
        <td>${loan.interest_rate}% APR (${loan.interest_type})</td>
      </tr>
      <tr>
        <th>Total Interest</th>
        <td>${loan.currency} ${loan.total_interest.toLocaleString()}</td>
      </tr>
      ` : ''}
      <tr>
        <th>Total Amount to Repay</th>
        <td><strong>${loan.currency} ${loan.total_amount.toLocaleString()}</strong></td>
      </tr>
      <tr>
        <th>Repayment Frequency</th>
        <td>${loan.repayment_frequency.charAt(0).toUpperCase() + loan.repayment_frequency.slice(1)}</td>
      </tr>
      <tr>
        <th>Installment Amount</th>
        <td>${loan.currency} ${loan.repayment_amount.toLocaleString()}</td>
      </tr>
      <tr>
        <th>Number of Installments</th>
        <td>${loan.total_installments}</td>
      </tr>
      <tr>
        <th>Start Date</th>
        <td>${startDate}</td>
      </tr>
      <tr>
        <th>End Date</th>
        <td>${endDate}</td>
      </tr>
      ${loan.purpose ? `
      <tr>
        <th>Purpose</th>
        <td>${loan.purpose}</td>
      </tr>
      ` : ''}
    </table>
  </div>

  ${loan.schedule && loan.schedule.length > 0 ? `
  <div class="section">
    <h2>Payment Schedule</h2>
    <table class="schedule-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Due Date</th>
          <th>Principal</th>
          ${loan.interest_rate > 0 ? '<th>Interest</th>' : ''}
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${loan.schedule
          .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .map((item: any, index: number) => `
          <tr>
            <td>${index + 1}</td>
            <td>${format(new Date(item.due_date), 'MMM d, yyyy')}</td>
            <td>${loan.currency} ${(item.principal_amount || item.amount).toLocaleString()}</td>
            ${loan.interest_rate > 0 ? `<td>${loan.currency} ${(item.interest_amount || 0).toLocaleString()}</td>` : ''}
            <td>${loan.currency} ${item.amount.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="section">
    <h2>Terms and Conditions</h2>
    
    <div class="clause">
      <span class="clause-number">1.</span>
      <strong>Loan Disbursement:</strong> The Lender agrees to disburse the principal amount to the Borrower upon execution of this agreement by both parties.
    </div>
    
    <div class="clause">
      <span class="clause-number">2.</span>
      <strong>Repayment:</strong> The Borrower agrees to repay the total amount according to the payment schedule specified above. Payments shall be made on or before each due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">3.</span>
      <strong>Late Payment:</strong> In the event of late payment, the Borrower shall notify the Lender immediately. Continued failure to make payments may result in additional actions as permitted by law.
    </div>
    
    <div class="clause">
      <span class="clause-number">4.</span>
      <strong>Early Repayment:</strong> The Borrower may repay the loan in full at any time without penalty.
    </div>
    
    <div class="clause">
      <span class="clause-number">5.</span>
      <strong>Default:</strong> The loan shall be considered in default if the Borrower fails to make any scheduled payment within 30 days of its due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">6.</span>
      <strong>Automatic Payments:</strong> If enabled, the Borrower authorizes automatic debit from their connected PayPal account on each payment due date.
    </div>
    
    <div class="clause">
      <span class="clause-number">7.</span>
      <strong>Governing Law:</strong> This agreement shall be governed by the laws of the jurisdiction in which the Lender is located.
    </div>
    
    <div class="clause">
      <span class="clause-number">8.</span>
      <strong>Entire Agreement:</strong> This document constitutes the entire agreement between the parties and supersedes all prior discussions and agreements.
    </div>
  </div>

  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${borrower.full_name}</p>
      <p>Borrower</p>
      ${loan.borrower_signed ? `
        <span class="signed-badge">✓ Signed</span>
        <p class="signature-date">${format(new Date(loan.borrower_signed_at), 'MMM d, yyyy h:mm a')}</p>
      ` : `
        <span class="pending-badge">Pending Signature</span>
      `}
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${lenderName}</p>
      <p>Lender</p>
      ${loan.lender_signed ? `
        <span class="signed-badge">✓ Signed</span>
        <p class="signature-date">${format(new Date(loan.lender_signed_at), 'MMM d, yyyy h:mm a')}</p>
      ` : `
        <span class="pending-badge">Pending Signature</span>
      `}
    </div>
  </div>

  <div class="footer">
    <p>This loan agreement was generated by LoanTrack</p>
    <p>Document ID: ${loan.id}</p>
    <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
  </div>
</body>
</html>
  `;
}
