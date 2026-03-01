import { NextResponse } from 'next/server';
import { sendEmail, emailWrapper } from '@/lib/email-core';

const SUPPORT_EMAIL = 'support@feyza.app';

const topicLabels: Record<string, string> = {
  general: 'General Inquiry',
  support: 'Technical Support',
  billing: 'Billing Question',
  partnership: 'Partnership Opportunity',
  press: 'Press Inquiry',
  other: 'Other',
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, topic, message } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    const topicLabel = topicLabels[topic] || topic || 'General Inquiry';
    const subject = `[Feyza Contact] ${topicLabel} from ${name.trim()}`;

    const content = `
      <p><strong>From:</strong> ${escapeHtml(name.trim())}<br>
      <strong>Email:</strong> <a href="mailto:${escapeHtml(email.trim())}">${escapeHtml(email.trim())}</a><br>
      <strong>Topic:</strong> ${escapeHtml(topicLabel)}</p>
      <div style="margin-top: 16px; padding: 16px; background: #fff; border-radius: 8px; border: 1px solid #d1d5db;">
        <strong>Message:</strong><br>
        ${escapeHtml(message.trim()).replace(/\n/g, '<br>')}
      </div>
    `;

    const html = emailWrapper({
      title: 'Contact Form Submission',
      subtitle: topicLabel,
      content,
      footerNote: `Reply directly to ${escapeHtml(email.trim())} to respond.`,
    });

    const result = await sendEmail({
      to: SUPPORT_EMAIL,
      subject,
      html,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: 'Failed to send message. Please try again or email us directly.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Contact form error:', e);
    return NextResponse.json(
      { error: 'Something went wrong. Please try again later.' },
      { status: 500 }
    );
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
