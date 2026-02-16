import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email'

type EmailType =
  | 'newsletter'
  | 'announcement'
  | 'personal'
  | 'promotional'
  | 'notification'
  | 'reminder'
  | 'welcome'
  | 'verification'
  | 'security'
  | 'transactional'
  | 'support'
  | 'feedback'
  | 'compliance'
  | 'system'

type RecipientType =
  | 'all'
  | 'borrowers'
  | 'lenders'
  | 'business'
  | 'verified'
  | 'unverified'
  | 'active'
  | 'inactive'
  | 'premium'
  | 'new'
  | 'suspended'
  | 'custom'

type Priority = 'low' | 'medium' | 'high'
type EmailTone = 'professional' | 'friendly' | 'urgent' | 'formal' | 'casual' | 'motivational'

interface EmailRequest {
  subject: string
  body: string
  emailType: EmailType
  recipientType: RecipientType
  recipients: string[]
  tone?: EmailTone
  priority?: Priority
  trackingEnabled?: boolean
  scheduledSend?: string | null
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  testMode?: boolean
  testEmail?: string
}

/** Extract the first URL from the email body and clean trailing punctuation. */
function extractFirstUrl(text: string): string | null {
  if (!text) return null
  const match = text.match(/https?:\/\/[^\s<>"')\]]+/i)
  if (!match) return null
  const cleaned = match[0].replace(/[.,!?;:]+$/, '')
  return cleaned || null
}

/** Convert simple markdown-ish formatting to HTML blocks. */
function formatBodyToHtml(personalizedBody: string) {
  return personalizedBody
    .split('\n\n')
    .map((paragraph) => {
      // headers
      if (paragraph.startsWith('# ')) {
        return `<h1 style="color:#166534;font-size:22px;font-weight:800;margin:0 0 14px 0;">${paragraph.substring(
          2
        )}</h1>`
      }
      if (paragraph.startsWith('## ')) {
        return `<h2 style="color:#166534;font-size:18px;font-weight:800;margin:0 0 12px 0;">${paragraph.substring(
          3
        )}</h2>`
      }
      if (paragraph.startsWith('### ')) {
        return `<h3 style="color:#166534;font-size:16px;font-weight:800;margin:0 0 10px 0;">${paragraph.substring(
          4
        )}</h3>`
      }

      // lists
      if (paragraph.includes('\n- ')) {
        const lines = paragraph.split('\n')
        const items = lines.filter((l) => l.startsWith('- ')).map((l) => l.substring(2))
        const intro = lines.find((l) => !l.startsWith('- ')) || ''

        return `
          ${intro ? `<p style="margin:0 0 14px 0;color:#334155;">${intro}</p>` : ''}
          <ul style="margin:0 0 14px 0;padding-left:20px;">
            ${items.map((item) => `<li style="margin:0 0 8px 0;color:#334155;">${item}</li>`).join('')}
          </ul>
        `
      }

      // bold/italic/links
      const formattedParagraph = paragraph
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" style="color:#059669;text-decoration:underline;">$1</a>')

      return `<p style="margin:0 0 14px 0;color:#334155;">${formattedParagraph}</p>`
    })
    .join('')
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // admin check
    const serviceSupabase = await createServiceRoleClient()
    const { data: profile } = await serviceSupabase
      .from('users')
      .select('is_admin, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile?.is_admin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
    }

    const payload: EmailRequest = await request.json()
    const {
      subject,
      body: emailBody,
      emailType,
      recipientType,
      recipients,
      tone = 'professional',
      priority = 'medium',
      trackingEnabled = true,
      scheduledSend = null,
      replyTo,
      cc = [],
      bcc = [],
      testMode = false,
      testEmail,
    } = payload

    // Validation
    if (!subject || !emailBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    if (testMode && !testEmail) {
      return NextResponse.json({ error: 'Test email address is required for test mode' }, { status: 400 })
    }

    if (!testMode && (!recipients || recipients.length === 0)) {
      return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 })
    }

    // Handle test mode
    if (testMode && testEmail) {
      return await handleTestEmail({
        subject,
        body: emailBody,
        testEmail,
        tone,
        priority,
        trackingEnabled,
        replyTo,
        cc,
        bcc,
        serviceSupabase,
        adminUser: user,
      })
    }

    // Fetch recipient details
    const { data: users, error: usersError } = await serviceSupabase
      .from('users')
      .select('id, full_name, email, user_type, verification_status, is_suspended')
      .in('id', recipients)

    if (usersError) throw usersError

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No valid recipients found' }, { status: 400 })
    }

    const activeUsers = users.filter((u: any) => !u.is_suspended)
    if (activeUsers.length === 0) {
      return NextResponse.json({ error: 'No active recipients found' }, { status: 400 })
    }

    // Create email log entry
    const { data: emailLog, error: logError } = await serviceSupabase
      .from('admin_email_logs')
      .insert({
        subject,
        body: emailBody,
        email_type: emailType,
        recipient_type: recipientType,
        recipients_count: activeUsers.length,
        recipient_ids: activeUsers.map((u: any) => u.id),
        sent_by: user.id,
        status: scheduledSend ? 'scheduled' : 'pending',
        metadata: {
          tone,
          priority,
          tracking_enabled: trackingEnabled,
          scheduled_send: scheduledSend,
          reply_to: replyTo,
          cc,
          bcc,
        },
      })
      .select()
      .single()

    if (logError) {
      console.error('Error creating email log:', logError)
    }

    // If scheduled, don't send now
    if (scheduledSend) {
      return NextResponse.json({
        success: true,
        message: `Email scheduled for ${new Date(scheduledSend).toLocaleString()}`,
        scheduled: true,
        scheduledTime: scheduledSend,
        logId: emailLog?.id,
        stats: { total: activeUsers.length },
      })
    }

    const adminName = profile.full_name || 'Admin'

    // Send emails
    const sendPromises = activeUsers.map(async (recipient: any) => {
      try {
        await sendSingleEmail({
          recipient,
          subject,
          body: emailBody,
          tone,
          priority,
          trackingEnabled,
          replyTo,
          cc,
          bcc,
          adminName,
          isTest: false,
        })

        return { success: true, email: recipient.email, userId: recipient.id }
      } catch (err: any) {
        console.error(`Failed to send email to ${recipient.email}:`, err)
        return { success: false, email: recipient.email, userId: recipient.id, error: err?.message || 'Unknown error' }
      }
    })

    const results = await Promise.all(sendPromises)
    const successful = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length

    // Update email log
    if (emailLog) {
      await serviceSupabase
        .from('admin_email_logs')
        .update({
          status: failed === 0 ? 'sent' : failed === activeUsers.length ? 'failed' : 'partial',
          sent_at: new Date().toISOString(),
          success_count: successful,
          failed_count: failed,
          metadata: {
            tone,
            priority,
            tracking_enabled: trackingEnabled,
            results: results.map((r) => ({ email: r.email, success: r.success, error: r.error })),
          },
        })
        .eq('id', emailLog.id)

      await serviceSupabase.from('notifications').insert({
        user_id: user.id,
        type: 'email_campaign',
        title: 'Email Campaign Complete',
        message: `Successfully sent ${successful} of ${activeUsers.length} emails (${failed} failed)`,
        link: `/admin/emails?log=${emailLog.id}`,
        metadata: { log_id: emailLog.id, successful, failed, total: activeUsers.length },
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successful} of ${activeUsers.length} email(s)`,
      stats: { total: activeUsers.length, successful, failed },
      logId: emailLog?.id,
    })
  } catch (error: any) {
    console.error('Error sending emails:', error)

    // best-effort error logging
    try {
      const serviceSupabase = await createServiceRoleClient()
      const serverClient = await createServerSupabaseClient()
      const {
        data: { user },
      } = await serverClient.auth.getUser()

      await serviceSupabase.from('admin_email_logs').insert({
        subject: 'ERROR',
        body: error?.message || 'Unknown error',
        email_type: 'system',
        recipient_type: 'none',
        recipients_count: 0,
        recipient_ids: [],
        sent_by: user?.id || null,
        status: 'failed',
        metadata: { error: error?.message, stack: error?.stack },
      })
    } catch (logError) {
      console.error('Failed to log error:', logError)
    }

    return NextResponse.json({ error: error?.message || 'Failed to send emails' }, { status: 500 })
  }
}

// Handle test email
async function handleTestEmail({
  subject,
  body,
  testEmail,
  tone,
  priority,
  trackingEnabled,
  replyTo,
  cc,
  bcc,
  serviceSupabase,
  adminUser,
}: {
  subject: string
  body: string
  testEmail: string
  tone: EmailTone
  priority: Priority
  trackingEnabled: boolean
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  serviceSupabase: any
  adminUser: any
}) {
  try {
    const testRecipient = { id: 'test-user', full_name: 'Test User', email: testEmail }

    await sendSingleEmail({
      recipient: testRecipient,
      subject,
      body,
      tone,
      priority,
      trackingEnabled: false,
      replyTo,
      cc,
      bcc,
      adminName: 'Admin',
      isTest: true,
    })

    await serviceSupabase.from('admin_email_logs').insert({
      subject: `[TEST] ${subject}`,
      body,
      email_type: 'test',
      recipient_type: 'test',
      recipients_count: 1,
      recipient_ids: [adminUser.id],
      sent_by: adminUser.id,
      status: 'sent',
      sent_at: new Date().toISOString(),
      success_count: 1,
      failed_count: 0,
      metadata: { tone, priority, is_test: true, test_email: testEmail },
    })

    return NextResponse.json({ success: true, message: `Test email sent to ${testEmail}`, test: true })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: error?.message || 'Failed to send test email' }, { status: 500 })
  }
}

// Send a single email with professional formatting
async function sendSingleEmail({
  recipient,
  subject,
  body,
  tone,
  priority,
  trackingEnabled,
  replyTo,
  cc,
  bcc,
  adminName,
  isTest = false,
}: {
  recipient: any
  subject: string
  body: string
  tone: EmailTone
  priority: Priority
  trackingEnabled: boolean
  replyTo?: string
  cc?: string[]
  bcc?: string[]
  adminName: string
  isTest?: boolean
}) {
  // Personalize placeholders
  const personalizedBody = body
    .replace(/{name}/g, recipient.full_name || 'User')
    .replace(/{email}/g, recipient.email)
    .replace(
      /{date}/g,
      new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    )
    .replace(
      /{time}/g,
      new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      })
    )

  const formattedBody = formatBodyToHtml(personalizedBody)

  // ✅ Extract CTA link from the body
  const primaryCtaUrl = extractFirstUrl(personalizedBody)
  const ctaLabel = primaryCtaUrl?.includes('/verify') ? 'Verify Account →' : 'Take Action Now →'

  const htmlEmail = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
  </head>

  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; padding: 20px; background: #f9fafb;">
    
    ${
      trackingEnabled
        ? `
    <!-- Tracking Pixel (Open) -->
    <div style="font-size:0; line-height:0; opacity:0; height:0; width:0; overflow:hidden;">
      <img src="https://api.feyza.app/track/open?email=${encodeURIComponent(recipient.email)}&time=${Date.now()}" width="1" height="1" alt="" />
    </div>
    `
        : ''
    }

    <!-- HEADER (Gradient) -->
    <div style="background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 30px 20px; border-radius: 16px 16px 0 0; text-align: center;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td align="center" style="padding-bottom: 14px;">
            <img src="https://feyza.app/feyza.png" alt="Feyza" height="40" style="display:block; height:40px;" />
          </td>
        </tr>
      </table>

      <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: 0.5px;">
        ${subject}
      </h1>

      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0; font-size: 14px;">
        Feyza • Peer-to-Peer Lending Platform
      </p>
    </div>

    <!-- CONTENT -->
    <div style="background: #ffffff; padding: 28px; border-radius: 0 0 16px 16px; border: 1px solid #bbf7d0; border-top: none;">
      
      <!-- Body -->
      <div style="margin: 0; font-size: 15px; color: #334155;">
        ${formattedBody}
      </div>

      <!-- CTA (uses link from body) -->
      ${
        primaryCtaUrl
          ? `
      <div style="text-align: center; margin: 22px 0 6px;">
        <a
          href="${primaryCtaUrl}"
          style="display: inline-block; background: linear-gradient(135deg, #059669 0%, #047857 100%); color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 14px;"
          target="_blank"
          rel="noopener noreferrer"
        >
          ${ctaLabel}
        </a>
      </div>
      `
          : ''
      }

      <!-- Sender / Meta box -->
      <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin-top: 18px;">
        <p style="margin:0; color:#334155; font-size: 13px;">
          Sent by ${adminName} • Feyza Admin Team
        </p>

        ${
          replyTo
            ? `
        <p style="margin: 6px 0 0 0; font-size: 13px; color: #166534;">
          Reply to: <a href="mailto:${replyTo}" style="color: #059669; text-decoration: none;">${replyTo}</a>
        </p>
        `
            : ''
        }

        ${
          isTest
            ? `
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #b45309; background: #fffbeb; padding: 8px 10px; border-radius: 8px; display: inline-block;">
          ⚡ TEST EMAIL — No action required
        </p>
        `
            : ''
        }
      </div>

      <p style="text-align: center; margin: 14px 0 0 0; font-size: 12px; color: #94a3b8;">
        Feyza • ${new Date().getFullYear()} • All rights reserved
      </p>

      ${
        trackingEnabled
          ? `
      <!-- Tracking Pixel (Read) -->
      <div style="font-size:0; line-height:0; opacity:0; height:0; width:0; overflow:hidden;">
        <img src="https://api.feyza.app/track/read?email=${encodeURIComponent(recipient.email)}&id=${Date.now()}" width="1" height="1" alt="" />
      </div>
      `
          : ''
      }

    </div>
  </body>
</html>
`

  const result = await sendEmail({
    to: recipient.email,
    subject,
    html: htmlEmail,
  })

  if (!result.success) {
    throw new Error(result.error || 'Failed to send email')
  }

  return result
}

// GET endpoint to retrieve email logs
export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceSupabase = await createServiceRoleClient()
    const { data: profile } = await serviceSupabase.from('users').select('is_admin').eq('id', user.id).single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    let query = serviceSupabase
      .from('admin_email_logs')
      .select(
        `
        *,
        sender:users!sent_by(id, full_name, email)
      `
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) query = query.eq('status', status)
    if (type) query = query.eq('email_type', type)

    const { data: logs, error } = await query
    if (error) throw error

    return NextResponse.json({
      success: true,
      logs,
      pagination: { limit, offset, count: logs?.length || 0 },
    })
  } catch (error: any) {
    console.error('Error fetching email logs:', error)
    return NextResponse.json({ error: error?.message || 'Failed to fetch email logs' }, { status: 500 })
  }
}

// DELETE endpoint to cancel scheduled emails
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const serviceSupabase = await createServiceRoleClient()
    const { data: profile } = await serviceSupabase.from('users').select('is_admin').eq('id', user.id).single()

    if (!profile?.is_admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const logId = searchParams.get('id')

    if (!logId) return NextResponse.json({ error: 'Log ID required' }, { status: 400 })

    const { error } = await serviceSupabase
      .from('admin_email_logs')
      .update({
        status: 'cancelled',
        metadata: { cancelled_at: new Date().toISOString(), cancelled_by: user.id },
      })
      .eq('id', logId)
      .eq('status', 'scheduled')

    if (error) throw error

    return NextResponse.json({ success: true, message: 'Scheduled email cancelled successfully' })
  } catch (error: any) {
    console.error('Error cancelling email:', error)
    return NextResponse.json({ error: error?.message || 'Failed to cancel email' }, { status: 500 })
  }
}
