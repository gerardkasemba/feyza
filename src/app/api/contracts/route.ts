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
      .select(
        `
        *,
        borrower:users!borrower_id(*),
        lender:users!lender_id(*),
        business_lender:business_profiles(*, owner:users!user_id(*)),
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
    console.error('Contract generation error:', error);
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

    const { error: updateError } = await supabase.from('loans').update(updateData).eq('id', loanId);

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
      await supabase.from('loans').update({ status: 'active' }).eq('id', loanId);

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
    console.error('Contract signing error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ======================
// Generate contract HTML
// ======================
function generateContractHtml(loan: any): string {
  const borrower = loan.borrower;

  const lenderName =
    loan.lender_type === 'business'
      ? loan.business_lender?.business_name
      : loan.lender?.full_name || loan.invite_email || 'Pending';

  const lenderTypeLabel = loan.lender_type === 'business' ? 'Business' : 'Individual';

  const startDate = loan.start_date ? format(new Date(loan.start_date), 'MMMM d, yyyy') : 'TBD';
  const createdDate = loan.created_at ? format(new Date(loan.created_at), 'MMMM d, yyyy') : 'TBD';

  // Calculate end date from schedule
  const lastPayment = (loan.schedule || [])
    .slice()
    .sort((a: any, b: any) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())[0];

  const endDate = lastPayment?.due_date ? format(new Date(lastPayment.due_date), 'MMMM d, yyyy') : 'TBD';

  const currency = loan.currency || 'USD';
  const money = (n: any) => (typeof n === 'number' ? n.toLocaleString() : '0');

  const freq = loan.repayment_frequency
    ? loan.repayment_frequency.charAt(0).toUpperCase() + loan.repayment_frequency.slice(1)
    : '—';

  const interestLine =
    loan.interest_rate > 0
      ? `${loan.interest_rate}% APR (${loan.interest_type || 'fixed'})`
      : '0% (No interest)';

  const borrowerSignedAt = loan.borrower_signed_at
    ? format(new Date(loan.borrower_signed_at), 'MMM d, yyyy h:mm a')
    : null;

  const lenderSignedAt = loan.lender_signed_at ? format(new Date(loan.lender_signed_at), 'MMM d, yyyy h:mm a') : null;

  const payScheduleRows =
    (loan.schedule || [])
      .slice()
      .sort((a: any, b: any) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
      .map((p: any, idx: number) => {
        const due = p?.due_date ? format(new Date(p.due_date), 'MMM d, yyyy') : 'TBD';
        const amount = p?.amount ?? loan.repayment_amount ?? 0;
        const status = p?.status ? String(p.status) : 'scheduled';
        return `
          <tr>
            <td class="mono">${String(idx + 1).padStart(2, '0')}</td>
            <td>${due}</td>
            <td class="right">${currency} ${money(amount)}</td>
            <td class="pill"><span class="pill-${status === 'paid' ? 'paid' : status === 'late' ? 'late' : 'scheduled'}">${escapeHtml(
              status
            )}</span></td>
          </tr>
        `;
      })
      .join('') || '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Loan Agreement - ${escapeHtml(String(loan.id || ''))}</title>

  <style>
    :root{
      --ink:#0f172a;
      --muted:#475569;
      --line:#e2e8f0;
      --soft:#f8fafc;
      --brand:#0f766e;
      --brand2:#134e4a;
      --accent:#2563eb;
      --good:#16a34a;
      --warn:#f59e0b;
      --bad:#dc2626;
      --radius:14px;
    }

    *{ box-sizing:border-box; }
    html,body{ margin:0; padding:0; }
    body{
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
      color:var(--ink);
      background:#ffffff;
      line-height:1.55;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page{
      max-width: 920px;
      margin: 0 auto;
      padding: 48px 20px;
    }

    /* Header */
    .topbar{
      display:flex;
      gap:16px;
      align-items:center;
      justify-content:space-between;
      padding-bottom:20px;
      border-bottom: 2px solid var(--line);
      margin-bottom: 22px;
    }
    .brand{
      display:flex;
      gap:14px;
      align-items:center;
      min-width: 240px;
    }
    .brand img{
      height:42px;
      width:auto;
      display:block;
    }
    .brand h1{
      margin:0;
      font-size:18px;
      letter-spacing:0.06em;
      text-transform:uppercase;
      color:var(--brand2);
      line-height:1.2;
    }
    .brand p{
      margin:2px 0 0;
      color:var(--muted);
      font-size:12px;
    }

    .meta{
      text-align:right;
      display:grid;
      gap:6px;
      font-size:12px;
      color:var(--muted);
    }
    .meta b{ color:var(--ink); font-weight:600; }
    .tag{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 10px;
      border-radius: 999px;
      background: #ecfeff;
      color: var(--brand2);
      border: 1px solid #a5f3fc;
      font-weight:600;
      font-size:12px;
      width: fit-content;
      margin-left:auto;
    }

    /* Section layout */
    .grid{
      display:grid;
      grid-template-columns: 1.1fr 0.9fr;
      gap:16px;
      margin-top: 18px;
    }

    .card{
      border:1px solid var(--line);
      border-radius: var(--radius);
      background:#fff;
      overflow:hidden;
    }
    .card .hd{
      padding:14px 16px;
      background: linear-gradient(180deg, var(--soft), #fff);
      border-bottom:1px solid var(--line);
      display:flex;
      align-items:flex-end;
      justify-content:space-between;
      gap:12px;
    }
    .card .hd h2{
      margin:0;
      font-size:14px;
      letter-spacing:0.06em;
      text-transform:uppercase;
      color:#0b3b36;
    }
    .card .hd .sub{
      font-size:12px;
      color:var(--muted);
    }
    .card .bd{
      padding: 16px;
    }

    .parties{
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:12px;
    }
    .party{
      border:1px solid var(--line);
      border-radius: 12px;
      padding: 12px;
      background: #fff;
    }
    .party .role{
      font-size:12px;
      font-weight:700;
      color: var(--brand2);
      letter-spacing:0.06em;
      text-transform:uppercase;
      margin-bottom:6px;
    }
    .party .name{
      font-size:14px;
      font-weight:700;
      margin:0 0 6px;
    }
    .kv{
      margin:0;
      display:grid;
      gap:4px;
      color:var(--muted);
      font-size:12px;
    }
    .kv span b{ color:var(--ink); font-weight:600; }

    /* Tables */
    table{
      width:100%;
      border-collapse:collapse;
      font-size:13px;
    }
    th, td{
      border-bottom: 1px solid var(--line);
      padding:10px 10px;
      vertical-align:top;
    }
    th{
      text-align:left;
      color:var(--muted);
      font-weight:700;
      width: 45%;
    }
    td{
      color:var(--ink);
      font-weight:600;
    }
    .muted{
      color:var(--muted);
      font-weight:500;
    }
    .right{ text-align:right; }
    .mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }

    /* Clauses */
    .clauses{
      display:grid;
      gap:10px;
    }
    .clause{
      border:1px solid var(--line);
      border-radius: 12px;
      background: #fff;
      padding: 12px;
    }
    .clause h3{
      margin:0 0 6px;
      font-size:13px;
      display:flex;
      gap:8px;
      align-items:center;
    }
    .badge-num{
      display:inline-flex;
      width:22px;
      height:22px;
      border-radius: 999px;
      align-items:center;
      justify-content:center;
      background: #eef2ff;
      color:#3730a3;
      font-size:12px;
      font-weight:800;
    }
    .clause p{
      margin:0;
      color: var(--muted);
      font-size:12.5px;
      font-weight:500;
    }
    .note{
      margin-top:8px;
      padding:10px;
      border-radius: 12px;
      background: #eff6ff;
      border:1px solid #bfdbfe;
      color:#1e3a8a;
      font-size:12px;
    }

    /* Schedule pills */
    .pill span{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:4px 10px;
      border-radius: 999px;
      border:1px solid var(--line);
      font-size:12px;
      font-weight:700;
      text-transform:capitalize;
      color: var(--muted);
      background:#fff;
    }
    .pill .pill-paid{ border-color:#bbf7d0; background:#f0fdf4; color:#14532d; }
    .pill .pill-late{ border-color:#fecaca; background:#fef2f2; color:#7f1d1d; }
    .pill .pill-scheduled{ border-color:#e2e8f0; background:#f8fafc; color:#334155; }

    /* Signatures */
    .signwrap{
      margin-top:18px;
      border-top: 2px solid var(--line);
      padding-top: 18px;
      display:grid;
      grid-template-columns: 1fr 1fr;
      gap:14px;
    }
    .sig{
      border:1px solid var(--line);
      border-radius: var(--radius);
      padding: 14px;
      background: #fff;
    }
    .sig .who{
      display:flex;
      align-items:baseline;
      justify-content:space-between;
      gap:10px;
      margin-bottom: 10px;
    }
    .sig .who b{ font-size:13px; }
    .status{
      display:inline-flex;
      align-items:center;
      justify-content:center;
      padding:6px 10px;
      border-radius: 999px;
      font-size:12px;
      font-weight:800;
      border:1px solid var(--line);
      background:#fff;
      color: var(--muted);
    }
    .status-signed{ border-color:#bbf7d0; background:#f0fdf4; color:#14532d; }
    .status-pending{ border-color:#fde68a; background:#fffbeb; color:#92400e; }

    .sigline{
      height: 54px;
      border-bottom: 1px solid #0f172a;
      margin-bottom: 10px;
    }
    .sigmeta{
      color: var(--muted);
      font-size:12px;
    }

    /* Footer */
    .footer{
      margin-top: 26px;
      padding-top: 16px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 12px;
      display:flex;
      align-items:flex-start;
      justify-content:space-between;
      gap:12px;
    }
    .footer .small{
      max-width: 70%;
    }

    /* Print */
    @media print{
      .page{ padding: 22px; }
      a{ color: inherit; text-decoration:none; }
      .card, .party, .clause, .sig{ break-inside: avoid; page-break-inside: avoid; }
    }
  </style>
</head>

<body>
  <div class="page">

    <!-- Header -->
    <div class="topbar">
      <div class="brand">
        <img src="https://feyza.app/feyza.svg" alt="Feyza" />
        <div>
          <h1>Loan Agreement</h1>
          <p>Feyza Contract Document</p>
        </div>
      </div>

      <div class="meta">
        <div class="tag">Contract ID: <span class="mono" style="margin-left:8px;">${escapeHtml(
          String(loan.id || '')
        )}</span></div>
        <div><b>Created:</b> ${escapeHtml(createdDate)}</div>
        <div><b>Start:</b> ${escapeHtml(startDate)} &nbsp; • &nbsp; <b>End:</b> ${escapeHtml(endDate)}</div>
      </div>
    </div>

    <!-- Parties + Terms -->
    <div class="grid">
      <div class="card">
        <div class="hd">
          <h2>Parties</h2>
          <div class="sub">Borrower and Lender information</div>
        </div>
        <div class="bd">
          <div class="parties">
            <div class="party">
              <div class="role">Borrower</div>
              <p class="name">${escapeHtml(borrower?.full_name || '—')}</p>
              <p class="kv">
                <span><b>Email:</b> ${escapeHtml(borrower?.email || '—')}</span>
                ${borrower?.phone ? `<span><b>Phone:</b> ${escapeHtml(borrower.phone)}</span>` : ''}
              </p>
            </div>

            <div class="party">
              <div class="role">Lender (${escapeHtml(lenderTypeLabel)})</div>
              <p class="name">${escapeHtml(lenderName || '—')}</p>
              <p class="kv">
                ${
                  loan.lender_type === 'business' && loan.business_lender?.location
                    ? `<span><b>Location:</b> ${escapeHtml(loan.business_lender.location)}</span>`
                    : ''
                }
                ${loan.invite_email ? `<span><b>Email:</b> ${escapeHtml(loan.invite_email)}</span>` : ''}
              </p>
            </div>
          </div>

          <div class="note">
            This document summarizes the final loan terms agreed to by the Borrower and the Lender through Feyza.
          </div>
        </div>
      </div>

      <div class="card">
        <div class="hd">
          <h2>Key Terms</h2>
          <div class="sub">Financial summary</div>
        </div>
        <div class="bd">
          <table>
            <tr><th>Principal</th><td>${escapeHtml(currency)} ${escapeHtml(money(loan.amount))}</td></tr>
            <tr><th>Interest</th><td>${escapeHtml(interestLine)}</td></tr>
            ${
              loan.interest_rate > 0
                ? `<tr><th>Total Interest</th><td>${escapeHtml(currency)} ${escapeHtml(money(loan.total_interest))}</td></tr>`
                : ''
            }
            <tr><th>Total Repayment</th><td>${escapeHtml(currency)} ${escapeHtml(money(loan.total_amount))}</td></tr>
            <tr><th>Frequency</th><td>${escapeHtml(freq)}</td></tr>
            <tr><th>Installment</th><td>${escapeHtml(currency)} ${escapeHtml(money(loan.repayment_amount))}</td></tr>
            <tr><th>Installments</th><td>${escapeHtml(String(loan.total_installments ?? '—'))}</td></tr>
            ${loan.purpose ? `<tr><th>Purpose</th><td class="muted">${escapeHtml(String(loan.purpose))}</td></tr>` : ''}
          </table>
        </div>
      </div>
    </div>

    <!-- Agreements -->
    <div class="grid" style="grid-template-columns: 1fr 1fr;">
      <div class="card">
        <div class="hd">
          <h2>Borrower Acknowledgement</h2>
          <div class="sub">Borrower obligations</div>
        </div>
        <div class="bd">
          <div class="clauses">
            <div class="clause">
              <h3><span class="badge-num">1</span> Final Terms</h3>
              <p>The terms displayed in this agreement are the final loan terms accepted by the borrower after lender matching.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">2</span> Repayment Obligation</h3>
              <p>The borrower agrees to repay the total amount according to the repayment schedule, beginning on ${escapeHtml(
                startDate
              )}.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">3</span> Auto-Pay Authorization</h3>
              <p>The borrower authorizes Feyza to initiate ACH debits from the connected bank account on scheduled due dates.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">4</span> Late Payments</h3>
              <p>If a payment cannot be made on time, the borrower agrees to notify the lender promptly. Late payments may affect future eligibility.</p>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="hd">
          <h2>Lender Acknowledgement</h2>
          <div class="sub">Lender authorizations</div>
        </div>
        <div class="bd">
          <div class="clauses">
            <div class="clause">
              <h3><span class="badge-num">1</span> Loan Commitment</h3>
              <p>The lender agrees to disburse ${escapeHtml(currency)} ${escapeHtml(money(loan.amount))} and receive total repayment of ${escapeHtml(
                currency
              )} ${escapeHtml(money(loan.total_amount))}.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">2</span> Disbursement Authorization</h3>
              <p>The lender authorizes an ACH transfer from the lender’s connected bank account to the borrower’s bank account once both parties accept.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">3</span> Collection & Deposits</h3>
              <p>The lender authorizes Feyza to facilitate repayment collection from the borrower and deposit repayments to the lender according to schedule.</p>
            </div>
            <div class="clause">
              <h3><span class="badge-num">4</span> Borrower Request Context</h3>
              <p>The lender acknowledges the borrower’s initial request may have contained provisional terms; this agreement reflects the final accepted terms.</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Schedule -->
    <div class="card" style="margin-top:16px;">
      <div class="hd">
        <h2>Repayment Schedule</h2>
        <div class="sub">Installments and due dates</div>
      </div>
      <div class="bd">
        ${
          payScheduleRows
            ? `
          <table>
            <thead>
              <tr>
                <th class="mono">#</th>
                <th>Due Date</th>
                <th class="right">Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${payScheduleRows}
            </tbody>
          </table>
        `
            : `<div class="muted">No schedule rows found for this loan.</div>`
        }
      </div>
    </div>

    <!-- Signatures -->
    <div class="signwrap">
      <div class="sig">
        <div class="who">
          <b>${escapeHtml(borrower?.full_name || 'Borrower')}</b>
          <span class="status ${loan.borrower_signed ? 'status-signed' : 'status-pending'}">
            ${loan.borrower_signed ? '✓ Signed' : 'Pending'}
          </span>
        </div>
        <div class="sigline"></div>
        <div class="sigmeta">
          Role: Borrower<br/>
          ${loan.borrower_signed ? `Signed: ${escapeHtml(String(borrowerSignedAt))}` : `Not yet signed`}
        </div>
      </div>

      <div class="sig">
        <div class="who">
          <b>${escapeHtml(lenderName || 'Lender')}</b>
          <span class="status ${loan.lender_signed ? 'status-signed' : 'status-pending'}">
            ${loan.lender_signed ? '✓ Signed' : 'Pending'}
          </span>
        </div>
        <div class="sigline"></div>
        <div class="sigmeta">
          Role: Lender<br/>
          ${loan.lender_signed ? `Signed: ${escapeHtml(String(lenderSignedAt))}` : `Not yet signed`}
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="small">
        Generated by Feyza. This document is an electronic record of the agreement between borrower and lender.
      </div>
      <div class="mono">
        Document ID: ${escapeHtml(String(loan.id || ''))}<br/>
        Generated: ${escapeHtml(format(new Date(), 'MMMM d, yyyy h:mm a'))}
      </div>
    </div>

  </div>
</body>
</html>
`;
}

/**
 * Basic HTML escape to keep dynamic data safe in the contract HTML.
 */
function escapeHtml(input: string): string {
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
