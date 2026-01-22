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

    /* ===== HEADER ===== */
    .header {
      text-align: center;
      border-bottom: 3px double #059669;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }

    .header h1 {
      font-size: 28px;
      margin-bottom: 5px;
      color: #065f46;
    }

    .header p {
      color: #555;
      font-size: 14px;
    }

    /* ===== SECTIONS ===== */
    .section {
      margin-bottom: 25px;
    }

    .section h2 {
      font-size: 16px;
      border-bottom: 1px solid #bbf7d0;
      padding-bottom: 5px;
      margin-bottom: 15px;
      text-transform: uppercase;
      color: #065f46;
    }

    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }

    .party {
      background: #f0fdf4;
      padding: 15px;
      border-radius: 8px;
      border: 1px solid #bbf7d0;
    }

    .party h3 {
      font-size: 14px;
      color: #047857;
      margin-bottom: 10px;
    }

    .party p {
      margin: 5px 0;
    }

    /* ===== TABLES ===== */
    .terms-table,
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 14px;
    }

    .terms-table th,
    .terms-table td,
    .schedule-table th,
    .schedule-table td {
      padding: 10px 12px;
      text-align: left;
      border: 1px solid #ddd;
    }

    .terms-table th,
    .schedule-table th {
      background: #ecfdf5;
      font-weight: bold;
      color: #065f46;
    }

    /* ===== CLAUSES ===== */
    .clause {
      margin-bottom: 15px;
    }

    .clause-number {
      font-weight: bold;
      margin-right: 5px;
      color: #065f46;
    }

    /* ===== SIGNATURES ===== */
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 50px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #059669;
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

    /* ===== FOOTER ===== */
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #bbf7d0;
      text-align: center;
      color: #065f46;
      font-size: 12px;
    }

    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>

<body>

  <!-- ===== HEADER WITH LOGO ===== -->
  <div class="header">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      <tr>
        <td align="center" style="padding-bottom: 15px;">
          <img
            src="https://feyza.app/feyza.png"
            alt="Feyza Logo"
            height="48"
            style="display:block; height:48px; width:auto; border:0; outline:none; text-decoration:none;"
          />
        </td>
      </tr>
    </table>

    <h1>LOAN AGREEMENT</h1>
    <p>Contract ID: ${loan.id}</p>
    <p>Date: ${createdDate}</p>
  </div>

  <!-- ===== PARTIES ===== -->
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
        ${loan.lender_type === 'business' && loan.business_lender?.location
          ? `<p>Location: ${loan.business_lender.location}</p>` : ''}
        ${loan.invite_email ? `<p>Email: ${loan.invite_email}</p>` : ''}
      </div>
    </div>
  </div>

  <!-- ===== LOAN TERMS ===== -->
  <div class="section">
    <h2>Loan Terms</h2>
    <table class="terms-table">
      <tr><th>Principal Amount</th><td>${loan.currency} ${loan.amount.toLocaleString()}</td></tr>
      ${loan.interest_rate > 0 ? `
        <tr><th>Interest Rate</th><td>${loan.interest_rate}% APR (${loan.interest_type})</td></tr>
        <tr><th>Total Interest</th><td>${loan.currency} ${loan.total_interest.toLocaleString()}</td></tr>
      ` : ''}
      <tr><th>Total Amount to Repay</th><td><strong>${loan.currency} ${loan.total_amount.toLocaleString()}</strong></td></tr>
      <tr><th>Repayment Frequency</th><td>${loan.repayment_frequency.charAt(0).toUpperCase() + loan.repayment_frequency.slice(1)}</td></tr>
      <tr><th>Installment Amount</th><td>${loan.currency} ${loan.repayment_amount.toLocaleString()}</td></tr>
      <tr><th>Number of Installments</th><td>${loan.total_installments}</td></tr>
      <tr><th>Start Date</th><td>${startDate}</td></tr>
      <tr><th>End Date</th><td>${endDate}</td></tr>
      ${loan.purpose ? `<tr><th>Purpose</th><td>${loan.purpose}</td></tr>` : ''}
    </table>
  </div>

  <!-- ===== SIGNATURES ===== -->
  <div class="signatures">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${borrower.full_name}</p>
      <p>Borrower</p>
      ${loan.borrower_signed
        ? `<span class="signed-badge">✓ Signed</span><p class="signature-date">${format(new Date(loan.borrower_signed_at), 'MMM d, yyyy h:mm a')}</p>`
        : `<span class="pending-badge">Pending Signature</span>`
      }
    </div>

    <div class="signature-block">
      <div class="signature-line"></div>
      <p class="signature-name">${lenderName}</p>
      <p>Lender</p>
      ${loan.lender_signed
        ? `<span class="signed-badge">✓ Signed</span><p class="signature-date">${format(new Date(loan.lender_signed_at), 'MMM d, yyyy h:mm a')}</p>`
        : `<span class="pending-badge">Pending Signature</span>`
      }
    </div>
  </div>

  <!-- ===== FOOTER ===== -->
  <div class="footer">
    <p>This loan agreement was generated by Feyza</p>
    <p>Document ID: ${loan.id}</p>
    <p>Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}</p>
  </div>

</body>
</html>
`;

}
