import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Create admin client with service role key
function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// POST: Approve or reject a business application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, action, notes, admin_user_id } = body;

    console.log('Admin approval request:', { business_id, action, notes, admin_user_id });

    if (!business_id) {
      return NextResponse.json({ error: 'business_id is required' }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'action must be "approve" or "reject"' }, { status: 400 });
    }

    const supabase = getAdminClient();

    // First, get the business profile to verify it exists
    const { data: business, error: fetchError } = await supabase
      .from('business_profiles')
      .select('*, owner:users!user_id(id, email, full_name)')
      .eq('id', business_id)
      .single();

    console.log('Fetched business:', business, 'Error:', fetchError);

    if (fetchError) {
      console.error('Fetch error:', fetchError);
      return NextResponse.json({ 
        error: 'Business not found', 
        details: fetchError.message 
      }, { status: 404 });
    }

    if (!business) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    const isApproved = action === 'approve';
    const now = new Date().toISOString();

    // Prepare update data
    const updateData: Record<string, any> = {
      is_verified: isApproved,
    };
    
    // Only add these fields if the columns exist
    // Try to update with all fields first
    try {
      const fullUpdateData = {
        verification_status: isApproved ? 'approved' : 'rejected',
        verification_notes: notes || null,
        verified_at: isApproved ? now : null,
        verified_by: admin_user_id || null,
        is_verified: isApproved,
      };
      
      console.log('Attempting full update with:', fullUpdateData);
      
      const { data: updatedBusiness, error: updateError } = await supabase
        .from('business_profiles')
        .update(fullUpdateData)
        .eq('id', business_id)
        .select()
        .single();

      if (updateError) {
        console.error('Full update error:', updateError);
        
        // If full update fails, try minimal update
        console.log('Trying minimal update with just is_verified');
        const { data: minimalUpdate, error: minimalError } = await supabase
          .from('business_profiles')
          .update({ is_verified: isApproved })
          .eq('id', business_id)
          .select()
          .single();
          
        if (minimalError) {
          console.error('Minimal update error:', minimalError);
          return NextResponse.json({ 
            error: 'Failed to update business profile',
            details: minimalError.message,
            hint: 'Check if the columns exist in the database'
          }, { status: 500 });
        }
        
        console.log('Minimal update successful:', minimalUpdate);
      } else {
        console.log('Full update successful:', updatedBusiness);
      }
    } catch (err: any) {
      console.error('Update exception:', err);
      return NextResponse.json({ 
        error: 'Exception during update',
        details: err.message 
      }, { status: 500 });
    }

    // If approved, activate lender preferences
    if (isApproved) {
      const { error: prefsError } = await supabase
        .from('lender_preferences')
        .update({ is_active: true })
        .eq('business_id', business_id);
      
      if (prefsError) {
        console.error('Lender prefs update error:', prefsError);
        // Don't fail the whole operation for this
      } else {
        console.log('Lender preferences activated');
      }
    }

    // Send email notification
    const ownerEmail = business.owner?.email;
    const ownerName = business.owner?.full_name || 'Business Owner';
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    if (ownerEmail) {
      try {
        if (isApproved) {
          await sendEmail({
            to: ownerEmail,
            subject: '🎉 Your Business Account Has Been Approved!',
            html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <!-- Header with gradient background and logo -->
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                    <!-- Logo -->
                    <div style="margin-bottom: 20px;">
                      <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                          alt="Feyza Logo" 
                          style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">🎉 You're Approved!</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Welcome to Feyza</p>
                  </div>
                  
                  <!-- Content area -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${ownerName}! 👋</p>
                    
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">Great news! Your business account <strong style="color: #059669;">${business.business_name}</strong> has been approved and is now active on Feyza.</p>
                    
                    <!-- Information box -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">What's Next?</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #065f46;">
                        <li style="margin-bottom: 10px; line-height: 1.6;">Set your capital pool in <a href="${APP_URL}/lender/preferences" style="color: #059669; font-weight: 500; text-decoration: none; border-bottom: 1px solid #059669;">Lender Preferences</a></li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Configure your matching settings</li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Start receiving loan requests from verified borrowers</li>
                        ${business.public_profile_enabled && business.slug ? `
                        <li style="line-height: 1.6;">Share your profile: 
                          <a href="${APP_URL}/lend/${business.slug}" style="color: #059669; font-weight: 500; text-decoration: none; border-bottom: 1px solid #059669;">
                            ${APP_URL}/lend/${business.slug}
                          </a>
                        </li>` : ''}
                      </ul>
                    </div>
                    
                    <!-- CTA Button -->
                    <a href="${APP_URL}/business" 
                      style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                              color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                              font-weight: 600; text-align: center; margin: 24px 0; font-size: 16px;
                              box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                      onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                      onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                      Go to Business Dashboard →
                    </a>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0;">Need help? <a href="mailto:support@feyza.com" style="color: #059669; text-decoration: none; font-weight: 500;">Contact our support team</a></p>
                    </div>
                  </div>
                  
                  <!-- Signature -->
                  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from Feyza</p>
                  </div>
                </body>
              </html>
            `,
          });
          console.log('Approval email sent to:', ownerEmail);
        } else {
          await sendEmail({
            to: ownerEmail,
            subject: '📋 Update on Your Business Application',
            html: `
              <!DOCTYPE html>
              <html>
                <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                  <!-- Header with gradient background and logo -->
                  <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px; border-radius: 16px 16px 0 0; text-align: center; position: relative;">
                    <!-- Logo -->
                    <div style="margin-bottom: 20px;">
                      <img src="https://raw.githubusercontent.com/gerardkasemba/feyza/442387cc7eaefdd8a38e999b7dc42a0d526137e6/public/feyza.svg" 
                          alt="Feyza Logo" 
                          style="height: 40px; width: auto; filter: brightness(0) invert(1);">
                    </div>
                    <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">📋 Application Update</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 16px;">Feyza Business Portal</p>
                  </div>
                  
                  <!-- Content area -->
                  <div style="background: #f0fdf4; padding: 30px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
                    <p style="font-size: 18px; color: #166534; margin-bottom: 20px;">Hi ${ownerName},</p>
                    
                    <p style="color: #166534; line-height: 1.6; margin-bottom: 20px;">
                      After reviewing your application for <strong style="color: #059669;">${business.business_name}</strong>, 
                      we were unable to approve it at this time.
                    </p>
                    
                    ${notes ? `
                    <!-- Feedback box -->
                    <div style="background: white; padding: 24px; border-radius: 12px; margin: 20px 0; border: 1px solid #bbf7d0; box-shadow: 0 2px 8px rgba(5, 150, 105, 0.1);">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 20px; font-weight: 600;">📝 Feedback:</h3>
                      <div style="background: #f0fdf4; padding: 16px; border-radius: 8px; border-left: 4px solid #059669;">
                        <p style="margin: 0; color: #166534; line-height: 1.6; font-style: italic;">${notes}</p>
                      </div>
                    </div>
                    ` : ''}
                    
                    <!-- Next steps information -->
                    <div style="background: white; padding: 20px; border-radius: 12px; margin: 24px 0; border: 1px solid #bbf7d0;">
                      <h3 style="margin: 0 0 15px 0; color: #065f46; font-size: 18px; font-weight: 600;">What You Can Do:</h3>
                      <ul style="margin: 0; padding-left: 20px; color: #166534;">
                        <li style="margin-bottom: 10px; line-height: 1.6;">Review the feedback provided above</li>
                        <li style="margin-bottom: 10px; line-height: 1.6;">Update your application with additional information</li>
                        <li style="line-height: 1.6;">Contact our support team for clarification</li>
                      </ul>
                    </div>
                    
                    <!-- Support contact -->
                    <div style="background: #dcfce7; padding: 20px; border-radius: 12px; margin: 20px 0; border: 1px solid #86efac; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #166534; font-weight: 600;">Need assistance?</p>
                      <a href="mailto:support@feyza.app" 
                        style="color: #059669; font-weight: 600; text-decoration: none; font-size: 16px; border-bottom: 2px solid #059669;">
                        support@feyza.app
                      </a>
                    </div>
                    
                    <!-- CTA Button to resubmit or contact -->
                    <div style="text-align: center; margin-top: 30px;">
                      <a href="mailto:support@feyza.app" 
                        style="display: inline-block; background: linear-gradient(to right, #059669, #047857); 
                                color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; 
                                font-weight: 600; text-align: center; font-size: 16px;
                                box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2); transition: all 0.2s ease;"
                        onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='0 6px 16px rgba(5, 150, 105, 0.3)';"
                        onmouseout="this.style.transform='translateY(0)';this.style.boxShadow='0 4px 12px rgba(5, 150, 105, 0.2)';">
                        Contact Support
                      </a>
                    </div>
                    
                    <!-- Footer -->
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #bbf7d0; color: #047857; font-size: 14px;">
                      <p style="margin: 0;">You can reply to this email or contact support for more details</p>
                    </div>
                  </div>
                  
                  <!-- Signature -->
                  <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
                    <p style="margin: 0;">This is an automated message from Feyza</p>
                  </div>
                </body>
              </html>
            `,
          });
          console.log('Rejection email sent to:', ownerEmail);
        }
      } catch (emailError) {
        console.error('Email send error:', emailError);
        // Don't fail the whole operation for email
      }

      // Create in-app notification
      try {
        await supabase.from('notifications').insert({
          user_id: business.user_id,
          type: isApproved ? 'business_approved' : 'business_rejected',
          title: isApproved ? '🎉 Business Account Approved!' : '📋 Business Application Update',
          message: isApproved 
            ? `Your business "${business.business_name}" has been approved. You can now start lending!`
            : `Your business application for "${business.business_name}" requires attention.${notes ? ` Reason: ${notes}` : ''}`,
        });
        console.log('Notification created');
      } catch (notifError) {
        console.error('Notification error:', notifError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      action,
      business_id,
      message: isApproved 
        ? 'Business approved successfully' 
        : 'Business application rejected',
    });
  } catch (error: any) {
    console.error('Error in admin business approval:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}

// GET: List business applications by status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'pending';

    const supabase = getAdminClient();

    // For pending, we check profile_completed AND (verification_status = 'pending' OR is_verified = false)
    let query = supabase
      .from('business_profiles')
      .select('*, owner:users!user_id(id, email, full_name, phone)')
      .eq('profile_completed', true)
      .order('created_at', { ascending: false });

    if (status === 'pending') {
      // Get businesses that are pending approval
      query = query.or('verification_status.eq.pending,verification_status.is.null').eq('is_verified', false);
    } else if (status === 'approved') {
      query = query.eq('is_verified', true);
    } else if (status === 'rejected') {
      query = query.eq('verification_status', 'rejected');
    }

    const { data: businesses, error } = await query;

    if (error) {
      console.error('Fetch businesses error:', error);
      return NextResponse.json({ 
        error: 'Failed to fetch businesses',
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      businesses: businesses || [],
      count: businesses?.length || 0,
    });
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 });
  }
}
