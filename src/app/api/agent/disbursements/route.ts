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

// GET: List disbursements for agent
export async function GET(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    if (!agent) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    
    const status = searchParams.get('status');
    const country = searchParams.get('country');
    const method = searchParams.get('method');

    let query = supabase
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
      .order('created_at', { ascending: false });

    // Filter by agent's country if they're not admin
    if (agent.role !== 'admin' && agent.country) {
      query = query.eq('recipient_country', agent.country);
    }

    // Apply filters
    if (status) {
      query = query.eq('status', status);
    }
    if (country) {
      query = query.eq('recipient_country', country);
    }
    if (method) {
      query = query.eq('disbursement_method', method);
    }

    const { data: disbursements, error } = await query;

    if (error) {
      console.error('Error fetching disbursements:', error);
      return NextResponse.json({ error: 'Failed to fetch disbursements' }, { status: 500 });
    }

    // Get stats
    const { data: stats } = await supabase
      .from('disbursements')
      .select('status')
      .eq(agent.role !== 'admin' && agent.country ? 'recipient_country' : 'id', 
          agent.role !== 'admin' && agent.country ? agent.country : disbursements?.map(d => d.id) || []);

    const statusCounts = {
      pending: 0,
      processing: 0,
      ready_for_pickup: 0,
      completed: 0,
      failed: 0,
    };

    disbursements?.forEach(d => {
      if (statusCounts.hasOwnProperty(d.status)) {
        statusCounts[d.status as keyof typeof statusCounts]++;
      }
    });

    return NextResponse.json({
      disbursements,
      stats: statusCounts,
      total: disbursements?.length || 0,
    });
  } catch (error) {
    console.error('Error in disbursements GET:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Create a new disbursement (usually called when loan is funded)
export async function POST(request: NextRequest) {
  try {
    const agent = await getCurrentAgent();
    // Allow system to create disbursements too (no agent check for POST)
    
    const supabase = await createServiceRoleClient();
    const body = await request.json();

    const {
      loan_id,
      amount,
      currency,
      disbursement_method,
      // Mobile Money
      mobile_provider,
      mobile_number,
      mobile_name,
      // Bank Transfer
      bank_name,
      bank_account_name,
      bank_account_number,
      bank_branch,
      bank_swift_code,
      // Cash Pickup
      pickup_location,
      // Recipient
      recipient_name,
      recipient_phone,
      recipient_id_type,
      recipient_id_number,
      recipient_country,
    } = body;

    if (!loan_id || !amount || !disbursement_method || !recipient_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create disbursement
    const { data: disbursement, error } = await supabase
      .from('disbursements')
      .insert({
        loan_id,
        amount,
        currency: currency || 'USD',
        disbursement_method,
        mobile_provider,
        mobile_number,
        mobile_name,
        bank_name,
        bank_account_name,
        bank_account_number,
        bank_branch,
        bank_swift_code,
        pickup_location,
        recipient_name,
        recipient_phone,
        recipient_id_type,
        recipient_id_number,
        recipient_country,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating disbursement:', error);
      return NextResponse.json({ error: 'Failed to create disbursement' }, { status: 500 });
    }

    return NextResponse.json({ success: true, disbursement });
  } catch (error) {
    console.error('Error in disbursements POST:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
