import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: loanId } = await params;
    const supabase = await createServerSupabaseClient();
    const body = await request.json();
    const { reason } = body;

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the loan
    const { data: loan, error: loanError } = await supabase
      .from('loans')
      .select('*, borrower:users!borrower_id(*), lender:users!lender_id(*)')
      .eq('id', loanId)
      .single();

    if (loanError || !loan) {
      return NextResponse.json({ error: 'Loan not found' }, { status: 404 });
    }

    // Only allow cancellation of pending loans
    if (loan.status !== 'pending') {
      return NextResponse.json({ error: 'Only pending loans can be cancelled' }, { status: 400 });
    }

    // Verify user is the borrower
    if (loan.borrower_id !== user.id) {
      return NextResponse.json({ error: 'Only the borrower can cancel this loan' }, { status: 403 });
    }

    // Update loan status
    const { error: updateError } = await supabase
      .from('loans')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: reason || 'Cancelled by borrower',
        updated_at: new Date().toISOString(),
      })
      .eq('id', loanId);

    if (updateError) {
      console.error('Error cancelling loan:', updateError);
      return NextResponse.json({ error: 'Failed to cancel loan' }, { status: 500 });
    }

    // Notify lender if there is one
    if (loan.lender_id) {
      try {
        await supabase.from('notifications').insert({
          user_id: loan.lender_id,
          loan_id: loanId,
          type: 'loan_cancelled',
          title: 'Loan Request Cancelled',
          message: `${loan.borrower?.full_name || 'The borrower'} has cancelled their loan request for ${loan.currency} ${loan.amount}.`,
        });
      } catch (notifError) {
        console.error('Error creating notification:', notifError);
      }
    }

    // Send email to invited lender (personal loan)
    if (loan.invite_email) {
      try {
        await sendEmail({
          to: loan.invite_email,
          subject: 'Loan Request Cancelled',
          html: `
            <!DOCTYPE html>
            <html>
              <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: #fef3c7; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
                  <h1 style="color: #92400e; margin: 0;">❌ Loan Request Cancelled</h1>
                </div>
                <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #e5e7eb;">
                  <p>Hi there,</p>
                  <p><strong>${loan.borrower?.full_name || 'The borrower'}</strong> has cancelled their loan request for <strong>${loan.currency} ${loan.amount}</strong>.</p>
                  ${reason ? `<p>Reason: ${reason}</p>` : ''}
                  <p style="color: #6b7280;">No action is needed from you.</p>
                </div>
              </body>
            </html>
          `,
        });
      } catch (emailError) {
        console.error('Error sending cancellation email:', emailError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error cancelling loan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
