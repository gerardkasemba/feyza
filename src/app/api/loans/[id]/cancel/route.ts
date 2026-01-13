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

    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

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
                <!-- Header with logo -->
                <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                  <!-- Logo -->
                  <div style="margin-bottom: 20px;">
                    <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                        alt="Feyza Logo" 
                        style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                  </div>
                  <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">❌ Loan Request Cancelled</h1>
                  <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Request Update</p>
                </div>
                
                <!-- Content area -->
                <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                  <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi there,</p>
                  
                  <!-- Cancellation notice -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Loan Request Update</h3>
                    
                    <div style="display: flex; align-items: center; background: #fef2f2; padding: 16px; border-radius: 8px; border: 1px solid #fecaca; margin-bottom: 20px;">
                      <div style="color: #dc2626; font-size: 24px; margin-right: 12px;">⚠️</div>
                      <div>
                        <p style="margin: 0; color: #991b1b; font-weight: 500;">This loan request has been cancelled by the borrower.</p>
                      </div>
                    </div>
                    
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                      <h4 style="margin: 0 0 12px 0; color: #475569; font-weight: 600;">Request Details:</h4>
                      <div style="display: grid; grid-template-columns: auto 1fr; gap: 8px 16px; color: #64748b;">
                        <span style="font-weight: 500;">Borrower:</span>
                        <span style="color: #334155;">${loan.borrower?.full_name || 'Not specified'}</span>
                        
                        <span style="font-weight: 500;">Amount:</span>
                        <span style="color: #059669; font-weight: 600;">${loan.currency} ${loan.amount.toLocaleString()}</span>
                        
                        ${loan.loan_term ? `
                        <span style="font-weight: 500;">Term:</span>
                        <span style="color: #334155;">${loan.loan_term} days</span>
                        ` : ''}
                        
                        ${loan.purpose ? `
                        <span style="font-weight: 500;">Purpose:</span>
                        <span style="color: #334155;">${loan.purpose}</span>
                        ` : ''}
                      </div>
                    </div>
                    
                    ${reason ? `
                    <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin-bottom: 20px;">
                      <h4 style="margin: 0 0 12px 0; color: #475569; font-weight: 600;">Cancellation Reason:</h4>
                      <p style="margin: 0; color: #64748b; line-height: 1.6; font-style: italic;">"${reason}"</p>
                    </div>
                    ` : ''}
                    
                    <!-- Status message -->
                    <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border: 1px solid #86efac; margin-top: 20px;">
                      <div style="display: flex; align-items: center;">
                        <div style="color: #059669; font-size: 20px; margin-right: 12px;">✓</div>
                        <div>
                          <p style="margin: 0; color: #065f46; font-weight: 500;">No further action is required from you.</p>
                          <p style="margin: 8px 0 0 0; color: #047857; font-size: 14px;">This loan request has been removed from your dashboard.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <!-- Action buttons -->
                  <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                    <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">Continue Lending</h3>
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                      Other borrowers are actively seeking funding. Explore new opportunities to grow your portfolio.
                    </p>
                    
                    <div style="display: flex; gap: 15px; margin-top: 25px; flex-wrap: wrap;">
                      <a href="${APP_URL}/lend" 
                        style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px;
                                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;
                                flex: 1; min-width: 200px;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                        Browse New Opportunities →
                      </a>
                      
                      <a href="${APP_URL}/dashboard" 
                        style="display: inline-block; background: white; 
                                color: #059669; text-decoration: none; padding: 14px 28px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px; border: 2px solid #059669;
                                box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1); transition: all 0.2s ease;
                                flex: 1; min-width: 200px;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';this.style.background='#f0fdf4';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 2px 8px rgba(5, 150, 105, 0.1)';this.style.background='white';">
                        View Dashboard
                      </a>
                    </div>
                  </div>
                  
                  <!-- Footer -->
                  <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                    <p style="margin: 0 0 10px 0;">Questions about this cancellation?</p>
                    <p style="margin: 0;">
                      <a href="${APP_URL}/help/loan-cancellations" style="color: #059669; text-decoration: none; font-weight: 500; margin-right: 15px;">
                        Help Center
                      </a>
                      <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">
                        Contact Support
                      </a>
                    </p>
                  </div>
                </div>
                
                <!-- Signature -->
                <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                  <p style="margin: 0;">Feyza • Professional Loan Marketplace</p>
                  <p style="margin: 5px 0 0 0; font-size: 11px;">This is an automated notification. Please do not reply to this email.</p>
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
