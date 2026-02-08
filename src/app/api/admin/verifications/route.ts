import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server';

// GET: Fetch all pending verifications (users and businesses)
export async function GET(request: NextRequest) {
  try {
    // First check if user is admin
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Use service role client to bypass RLS
    const serviceClient = await createServiceRoleClient();

    // Fetch pending users (verification_status = 'submitted' means they've submitted for review)
    const { data: pendingUsers, error: usersError } = await serviceClient
      .from('users')
      .select(`
        id,
        full_name,
        email,
        phone,
        verification_status,
        verification_submitted_at,
        id_type,
        id_number,
        id_document_url,
        id_expiry_date,
        employment_status,
        employer_name,
        employer_address,
        employment_start_date,
        employment_document_url,
        monthly_income,
        address_line1,
        address_line2,
        city,
        state_province,
        postal_code,
        country,
        address_document_url,
        address_document_type,
        created_at
      `)
      .eq('verification_status', 'submitted')
      .order('verification_submitted_at', { ascending: true });

    if (usersError) {
      console.error('Error fetching pending users:', usersError);
    }

    // Fetch pending loan requests for these users
    const userIds = (pendingUsers || []).map(u => u.id);
    let pendingLoans: any[] = [];
    
    if (userIds.length > 0) {
      const { data: loans, error: loansError } = await serviceClient
        .from('pending_loan_requests')
        .select(`
          id,
          user_id,
          amount,
          purpose,
          description,
          term_months,
          status,
          business_lender:business_profiles!business_lender_id (
            id,
            business_name
          )
        `)
        .in('user_id', userIds)
        .eq('status', 'awaiting_verification');

      if (loansError) {
        console.error('Error fetching pending loans:', loansError);
      } else {
        pendingLoans = loans || [];
      }
    }

    // Attach pending loans to users
    const usersWithLoans = (pendingUsers || []).map(user => ({
      ...user,
      pending_loan_requests: pendingLoans.filter(loan => loan.user_id === user.id)
    }));

    // Fetch pending businesses
    const { data: pendingBusinesses, error: businessesError } = await serviceClient
      .from('business_profiles')
      .select(`
        id,
        business_name,
        business_type,
        contact_email,
        contact_phone,
        website_url,
        location,
        city,
        state,
        country,
        ein_tax_id,
        years_in_business,
        verification_status,
        created_at,
        user_id
      `)
      .eq('verification_status', 'pending')
      .order('created_at', { ascending: true });

    if (businessesError) {
      console.error('Error fetching pending businesses:', businessesError);
    }

    // Get owner info for businesses
    const ownerIds = (pendingBusinesses || []).map(b => b.user_id).filter(Boolean);
    let owners: any[] = [];
    
    if (ownerIds.length > 0) {
      const { data: ownerData } = await serviceClient
        .from('users')
        .select('id, full_name, email')
        .in('id', ownerIds);
      
      owners = ownerData || [];
    }

    // Attach owners to businesses
    const businessesWithOwners = (pendingBusinesses || []).map(business => ({
      ...business,
      owner: owners.find(o => o.id === business.user_id) || null
    }));

    return NextResponse.json({
      users: usersWithLoans,
      businesses: businessesWithOwners,
      counts: {
        users: usersWithLoans.length,
        businesses: businessesWithOwners.length,
        total: usersWithLoans.length + businessesWithOwners.length
      }
    });
  } catch (error: any) {
    console.error('Error in verification API:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch verifications' },
      { status: 500 }
    );
  }
}

// POST: Approve or reject a verification
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { type, id, action, reason } = body;

    if (!type || !id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const serviceClient = await createServiceRoleClient();

    if (type === 'user') {
      const newStatus = action === 'approve' ? 'verified' : 'rejected';
      const { error } = await serviceClient
        .from('users')
        .update({
          verification_status: newStatus,
          verification_reviewed_at: new Date().toISOString(),
          verification_notes: action === 'reject' ? (reason || 'Did not meet verification requirements') : null
        })
        .eq('id', id);

      if (error) {
        console.error('Error updating user verification:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, type: 'user', id, action });
    } else if (type === 'business') {
      const newStatus = action === 'approve' ? 'approved' : 'rejected';
      const updateData: any = {
        verification_status: newStatus,
        verified_at: action === 'approve' ? new Date().toISOString() : null,
        verified_by: action === 'approve' ? user.id : null,
      };
      
      if (action === 'approve') {
        updateData.is_verified = true;
      } else {
        updateData.rejection_reason = reason || 'Did not meet verification requirements';
      }

      const { error } = await serviceClient
        .from('business_profiles')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Error updating business verification:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, type: 'business', id, action });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in verification action:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process verification' },
      { status: 500 }
    );
  }
}
