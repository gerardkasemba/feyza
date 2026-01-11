import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { sendEmail } from '@/lib/email';

// Helper to get current agent
async function getCurrentAgent() {
  const cookieStore = await cookies();
  const agentId = cookieStore.get('agent_id')?.value;
  const token = cookieStore.get('agent_token')?.value;

  if (!agentId || !token) {
    return null;
  }

  const supabase = await createServiceRoleClient();
  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', agentId)
    .eq('is_active', true)
    .single();

  return agent;
}

// GET: Get single disbursement with full details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const supabase = await createServiceRoleClient();

    const { data: disbursement, error } = await supabase
      .from('disbursements')
      .select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          purpose,
          status,
          created_at,
          borrower:users!borrower_id(id, email, full_name, phone)
        ),
        history:disbursement_history(*)
      `)
      .eq('id', id)
      .single();

    if (error || !disbursement) {
      return NextResponse.json({ error: 'Disbursement not found' }, { status: 404 });
    }

    return NextResponse.json({ disbursement });
  } catch (error) {
    console.error('Error fetching disbursement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH: Update disbursement (verify, process, complete)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes, proof_url, local_amount, local_currency, exchange_rate } = body;

    const supabase = await createServiceRoleClient();

    // Get current disbursement with loan and borrower info
    const { data: disbursement, error: fetchError } = await supabase
      .from('disbursements')
      .select(`
        *,
        loan:loans(
          id,
          amount,
          currency,
          borrower:users!borrower_id(id, email, full_name, phone)
        )
      `)
      .eq('id', id)
      .single();

    if (fetchError || !disbursement) {
      return NextResponse.json({ error: 'Disbursement not found' }, { status: 404 });
    }

    const borrowerEmail = disbursement.loan?.borrower?.email;
    const borrowerName = disbursement.loan?.borrower?.full_name || 'there';
    const recipientName = disbursement.recipient_name;
    const amount = disbursement.amount;
    const currency = disbursement.currency;

    let updateData: any = {
      updated_at: new Date().toISOString(),
      processed_by_agent_id: agent.id,
    };

    let emailToSend: { to: string; subject: string; html: string } | null = null;

    switch (action) {
      case 'assign':
        // Assign to current agent
        updateData.assigned_agent_id = agent.id;
        updateData.status = 'processing';
        break;

      case 'verify':
        // Verify recipient identity
        updateData.recipient_verified = true;
        updateData.recipient_verified_at = new Date().toISOString();
        updateData.verification_notes = notes;
        break;

      case 'ready_for_pickup':
        // Cash is ready for pickup
        if (disbursement.disbursement_method !== 'cash_pickup') {
          return NextResponse.json({ error: 'Not a cash pickup disbursement' }, { status: 400 });
        }
        updateData.status = 'ready_for_pickup';
        
        // Email borrower that cash is ready
        if (borrowerEmail) {
          emailToSend = getCashReadyEmail({
            borrowerName,
            recipientName,
            amount,
            currency,
            pickupLocation: disbursement.pickup_location,
            pickupCode: disbursement.pickup_code,
          });
          emailToSend.to = borrowerEmail;
        }
        break;

      case 'complete':
        // Mark as completed - money delivered
        updateData.status = 'completed';
        updateData.completed_at = new Date().toISOString();
        updateData.completion_proof_url = proof_url;
        updateData.completion_notes = notes;
        
        if (local_amount) updateData.local_amount = local_amount;
        if (local_currency) updateData.local_currency = local_currency;
        if (exchange_rate) updateData.exchange_rate = exchange_rate;

        // CRITICAL: Update the loan to 'active' so borrower can start repayments
        console.log('Completing disbursement, updating loan:', disbursement.loan_id);
        
        if (disbursement.loan_id) {
          const { data: updatedLoan, error: loanUpdateError } = await supabase
            .from('loans')
            .update({
              status: 'active',
              funds_disbursed: true,
              funds_disbursed_at: new Date().toISOString(),
              funds_disbursed_reference: notes || 'Disbursed by agent',
            })
            .eq('id', disbursement.loan_id)
            .select()
            .single();

          if (loanUpdateError) {
            console.error('Error updating loan status:', loanUpdateError);
            // Return error to agent so they know something went wrong
            return NextResponse.json({ 
              error: 'Failed to activate loan: ' + loanUpdateError.message,
              details: loanUpdateError
            }, { status: 500 });
          } else {
            console.log('Loan updated to active:', updatedLoan);
          }

          // Create notification for borrower
          const borrowerId = disbursement.loan?.borrower?.id;
          if (borrowerId) {
            const { error: notifError } = await supabase.from('notifications').insert({
              user_id: borrowerId,
              loan_id: disbursement.loan_id,
              type: 'loan_accepted', // Use existing type that works
              title: '✅ Money Delivered to ' + recipientName + '!',
              message: `Great news! ${currency} ${amount.toLocaleString()} has been delivered to ${recipientName}. Your repayment schedule is now active.`,
            });
            
            if (notifError) {
              console.error('Error creating notification:', notifError);
            }
          }
        }

        // Email borrower that money was delivered
        if (borrowerEmail) {
          emailToSend = getDisbursementCompletedEmail({
            borrowerName,
            recipientName,
            amount,
            currency,
            method: disbursement.disbursement_method,
            loanId: disbursement.loan_id,
          });
          emailToSend.to = borrowerEmail;
        }
        break;

      case 'fail':
        // Mark as failed
        updateData.status = 'failed';
        updateData.completion_notes = notes;
        
        // Email borrower about failure
        if (borrowerEmail) {
          emailToSend = getDisbursementFailedEmail({
            borrowerName,
            recipientName,
            amount,
            currency,
            reason: notes || 'Unknown reason',
          });
          emailToSend.to = borrowerEmail;
        }
        break;

      case 'hold':
        // Put on hold
        updateData.status = 'on_hold';
        updateData.completion_notes = notes;
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update disbursement
    const { error: updateError } = await supabase
      .from('disbursements')
      .update(updateData)
      .eq('id', id);

    if (updateError) {
      console.error('Error updating disbursement:', updateError);
      return NextResponse.json({ error: 'Failed to update disbursement' }, { status: 500 });
    }

    // Log to history
    await supabase.from('disbursement_history').insert({
      disbursement_id: id,
      action,
      performed_by: agent.id,
      notes: notes || `Action: ${action}`,
      metadata: { agent_name: agent.full_name },
    });

    // Send email if needed
    if (emailToSend) {
      try {
        await sendEmail(emailToSend);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ success: true, action });
  } catch (error) {
    console.error('Error updating disbursement:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Email templates
function getCashReadyEmail(data: {
  borrowerName: string;
  recipientName: string;
  amount: number;
  currency: string;
  pickupLocation: string;
  pickupCode: string;
}) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return {
    to: '',
    subject: `💰 Cash Ready for Pickup - ${data.recipientName}`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">💰 Cash Ready for Pickup!</h1>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.borrowerName}! 👋</p>
            
            <p>Great news! The cash is ready for <strong>${data.recipientName}</strong> to pick up.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
              <div style="text-align: center; margin-bottom: 15px;">
                <p style="color: #6b7280; margin: 0;">Amount</p>
                <p style="font-size: 28px; font-weight: bold; color: #22c55e; margin: 5px 0;">${data.currency} ${data.amount.toLocaleString()}</p>
              </div>
              
              <div style="border-top: 1px solid #e5e7eb; padding-top: 15px;">
                <p style="margin: 5px 0;"><strong>📍 Pickup Location:</strong> ${data.pickupLocation}</p>
                <p style="margin: 5px 0;"><strong>🔑 Pickup Code:</strong></p>
                <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; margin-top: 10px;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${data.pickupCode}</span>
                </div>
              </div>
            </div>
            
            <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #854d0e; font-size: 14px;">
                <strong>📝 Important:</strong> Please share this pickup code with ${data.recipientName}. They'll need to present this code along with valid ID to collect the cash.
              </p>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              The cash will be held indefinitely until picked up. If there are any issues, please contact our support team.
            </p>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
  };
}

function getDisbursementCompletedEmail(data: {
  borrowerName: string;
  recipientName: string;
  amount: number;
  currency: string;
  method: string;
  loanId: string;
}) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const methodText = {
    mobile_money: 'via Mobile Money',
    bank_transfer: 'via Bank Transfer',
    cash_pickup: 'in cash',
  }[data.method] || '';

  return {
    to: '',
    subject: `✅ Money Delivered to ${data.recipientName}!`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✅ Money Delivered!</h1>
          </div>
          
          <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.borrowerName}! 👋</p>
            
            <p>Great news! We've successfully delivered the money to <strong>${data.recipientName}</strong>!</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; text-align: center;">
              <p style="color: #6b7280; margin: 0 0 10px 0;">Amount Delivered</p>
              <p style="font-size: 32px; font-weight: bold; color: #22c55e; margin: 0;">${data.currency} ${data.amount.toLocaleString()}</p>
              <p style="color: #6b7280; margin: 10px 0 0 0;">${methodText}</p>
            </div>
            
            <div style="background: #dbeafe; border: 1px solid #93c5fd; border-radius: 8px; padding: 16px; margin: 20px 0;">
              <p style="margin: 0; color: #1e40af; font-size: 14px;">
                <strong>📅 Your Loan is Now Active!</strong><br>
                Your repayment schedule has started. Please make sure to keep up with your scheduled payments to maintain a good borrower rating.
              </p>
            </div>
            
            <a href="${APP_URL}/loans/${data.loanId}" style="display: block; background: #22c55e; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              View Your Loan & Schedule →
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
  };
}

function getDisbursementFailedEmail(data: {
  borrowerName: string;
  recipientName: string;
  amount: number;
  currency: string;
  reason: string;
}) {
  return {
    to: '',
    subject: `⚠️ Disbursement Issue - Action Required`,
    html: `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Disbursement Issue</h1>
          </div>
          
          <div style="background: #fffbeb; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #fde68a;">
            <p style="font-size: 18px; margin-bottom: 20px;">Hi ${data.borrowerName},</p>
            
            <p>We encountered an issue delivering the funds to <strong>${data.recipientName}</strong>.</p>
            
            <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #fde68a;">
              <p style="margin: 5px 0;"><strong>Amount:</strong> ${data.currency} ${data.amount.toLocaleString()}</p>
              <p style="margin: 5px 0;"><strong>Reason:</strong> ${data.reason}</p>
            </div>
            
            <p>Please contact our support team to resolve this issue and ensure ${data.recipientName} receives the funds.</p>
            
            <a href="mailto:support@loantrack.app" style="display: block; background: #d97706; color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: bold; text-align: center; margin: 24px 0;">
              Contact Support
            </a>
          </div>
          
          <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">
            Sent via LoanTrack • Simple loan tracking for everyone
          </p>
        </body>
      </html>
    `,
  };
}
