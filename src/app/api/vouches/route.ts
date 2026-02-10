import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';
import { VouchService, TrustScoreService } from '@/lib/trust-score';
import { sendEmail } from '@/lib/email';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET: Get vouches for/by a user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || user.id;
    const type = searchParams.get('type') || 'received'; // 'received' or 'given'

    const serviceClient = await createServiceRoleClient();
    const vouchService = new VouchService(serviceClient);

    let vouches;
    if (type === 'given') {
      vouches = await vouchService.getVouchesBy(userId);
    } else {
      vouches = await vouchService.getVouchesFor(userId);
    }

    // Also get pending requests if viewing own profile
    let pendingRequests = [];
    if (userId === user.id) {
      const { data: requests } = await serviceClient
        .from('vouch_requests')
        .select(`
          *,
          requester:users!requester_id(
            id,
            full_name,
            username,
            email
          )
        `)
        .eq('requested_user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      pendingRequests = requests || [];
    }

    return NextResponse.json({
      vouches,
      pendingRequests,
    });
  } catch (error: any) {
    console.error('Error fetching vouches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: Create a vouch or vouch request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body;

    const serviceClient = await createServiceRoleClient();
    const vouchService = new VouchService(serviceClient);

    // Create a vouch directly
    if (action === 'vouch') {
      const { voucheeId, vouch_type, relationship, relationship_details, known_years, message, guarantee_percentage, guarantee_max_amount, is_public } = body;

      if (!voucheeId) {
        return NextResponse.json({ error: 'voucheeId is required' }, { status: 400 });
      }

      const result = await vouchService.createVouch(user.id, voucheeId, {
        vouch_type: vouch_type || 'character',
        relationship: relationship || 'friend',
        relationship_details,
        known_years,
        message,
        guarantee_percentage,
        guarantee_max_amount,
        is_public,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send notification to vouchee
      const { data: vouchee } = await serviceClient
        .from('users')
        .select('email, full_name')
        .eq('id', voucheeId)
        .single();

      const { data: voucher } = await serviceClient
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (vouchee?.email) {
        await sendEmail({
          to: vouchee.email,
          subject: `${voucher?.full_name || 'Someone'} vouched for you on Feyza! 🎉`,
          html: getVouchReceivedEmail({
            voucheeName: vouchee.full_name?.split(' ')[0] || 'there',
            voucherName: voucher?.full_name || 'Someone',
            relationship: relationship || 'friend',
            message: message || '',
            vouchStrength: result.vouch?.vouch_strength || 0,
          }),
        });
      }

      return NextResponse.json({ vouch: result.vouch });
    }

    // Request a vouch
    if (action === 'request') {
      const { targetUserId, targetEmail, targetName, message, suggestedRelationship } = body;

      const result = await vouchService.requestVouch(
        user.id,
        targetUserId,
        targetEmail,
        message,
        suggestedRelationship
      );

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      // Send email notification
      const { data: requester } = await serviceClient
        .from('users')
        .select('full_name')
        .eq('id', user.id)
        .single();

      const emailTo = targetEmail || (await serviceClient
        .from('users')
        .select('email')
        .eq('id', targetUserId)
        .single()).data?.email;

      if (emailTo) {
        await sendEmail({
          to: emailTo,
          subject: `${requester?.full_name || 'Someone'} is asking for your vouch on Feyza`,
          html: getVouchRequestEmail({
            targetName: targetName || 'there',
            requesterName: requester?.full_name || 'Someone',
            message: message || '',
            requestId: result.request.id,
            inviteToken: result.request.invite_token,
          }),
        });
      }

      return NextResponse.json({ request: result.request });
    }

    // Accept a vouch request
    if (action === 'accept') {
      const { requestId, vouch_type, relationship, relationship_details, known_years, message } = body;

      const result = await vouchService.acceptVouchRequest(requestId, user.id, {
        vouch_type: vouch_type || 'character',
        relationship: relationship || 'friend',
        relationship_details,
        known_years,
        message,
      });

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ vouch: result.vouch });
    }

    // Decline a vouch request
    if (action === 'decline') {
      const { requestId, reason } = body;

      const result = await vouchService.declineVouchRequest(requestId, user.id, reason);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    // Revoke a vouch
    if (action === 'revoke') {
      const { vouchId, reason } = body;

      const result = await vouchService.revokeVouch(user.id, vouchId, reason);

      if (result.error) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('Error processing vouch action:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Email templates
function getVouchReceivedEmail(params: {
  voucheeName: string;
  voucherName: string;
  relationship: string;
  message: string;
  vouchStrength: number;
}): string {
  const { voucheeName, voucherName, relationship, message, vouchStrength } = params;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">🎉 You've Been Vouched For!</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Your Trust Score just got a boost</p>
  </div>
  
  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
    <p style="font-size: 18px; color: #166534;">Hi ${voucheeName}! 👋</p>
    
    <p style="color: #374151;"><strong>${voucherName}</strong> has vouched for you on Feyza!</p>
    
    <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
      <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
        <div style="width: 50px; height: 50px; background: #d1fae5; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px;">👤</div>
        <div>
          <p style="margin: 0; font-weight: 600; color: #166534;">${voucherName}</p>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Relationship: ${relationship}</p>
        </div>
      </div>
      
      ${message ? `<p style="color: #374151; font-style: italic; padding: 15px; background: #f9fafb; border-radius: 8px; margin: 0;">"${message}"</p>` : ''}
      
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e5e7eb; text-align: center;">
        <p style="color: #6b7280; margin: 0; font-size: 14px;">Vouch Strength</p>
        <p style="font-size: 32px; font-weight: bold; color: #059669; margin: 5px 0;">${vouchStrength}/100</p>
      </div>
    </div>
    
    <div style="background: #ecfdf5; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <p style="color: #065f46; margin: 0; font-size: 14px;">
        <strong>What this means:</strong><br>
        ✅ Your Trust Score has increased<br>
        ✅ Lenders can see you have trusted connections<br>
        ✅ You're more likely to get approved for loans
      </p>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${APP_URL}/profile" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600;">View Your Trust Score →</a>
    </div>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Building Trust Together</div>
</body>
</html>
  `;
}

function getVouchRequestEmail(params: {
  targetName: string;
  requesterName: string;
  message: string;
  requestId: string;
  inviteToken?: string;
}): string {
  const { targetName, requesterName, message, requestId, inviteToken } = params;
  
  const actionUrl = inviteToken
    ? `${APP_URL}/vouch/accept?token=${inviteToken}`
    : `${APP_URL}/vouch/requests`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
  
  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
    <h1 style="color: #fff; margin: 0; font-size: 24px;">Someone Needs Your Vouch</h1>
    <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 16px;">Help build trust in your community</p>
  </div>
  
  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
    <p style="font-size: 18px; color: #166534;">Hi ${targetName}! 👋</p>
    
    <p style="color: #374151;"><strong>${requesterName}</strong> is asking you to vouch for them on Feyza.</p>
    
    ${message ? `
    <div style="background: white; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0;">
      <p style="color: #6b7280; margin: 0 0 10px; font-size: 14px;">Their message:</p>
      <p style="color: #374151; font-style: italic; margin: 0;">"${message}"</p>
    </div>
    ` : ''}
    
    <div style="background: #fffbeb; padding: 16px; border-radius: 8px; margin: 20px 0; border: 1px solid #fcd34d;">
      <p style="color: #92400e; margin: 0; font-size: 14px;">
        <strong>What is a vouch?</strong><br>
        A vouch is your statement of trust in this person. It helps them get loans and builds their Trust Score. Only vouch for people you actually know and trust.
      </p>
    </div>
    
    <div style="text-align: center; margin: 25px 0;">
      <a href="${actionUrl}" style="display: inline-block; background: linear-gradient(to right, #059669, #047857); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin-right: 10px;">Review Request →</a>
    </div>
    
    <p style="color: #6b7280; font-size: 13px; text-align: center;">You can accept or decline this request. Only vouch if you truly trust this person.</p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280;">Feyza • Building Trust Together</div>
</body>
</html>
  `;
}
