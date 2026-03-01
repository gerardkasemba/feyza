// Email templates data, types, and configuration for admin email panel
// Auto-extracted from AdminEmailsPage for maintainability

import {
  Rocket, CreditCard, Bell, Shield, Server, Users, User, Building2,
  BadgeCheck, UserX, Activity, Star, Sparkles, Search, Lock,
  Briefcase, Heart, AlertTriangle, FileText, MessageCircle, ThumbsUp,
} from 'lucide-react';
// Megaphone and Headphones fall back to Bell (not all lucide versions include them)
const Megaphone = Bell;
const Headphones = Bell;

export interface EmailTemplate {
  id: string;
  name: string;
  category: 'onboarding' | 'transactional' | 'marketing' | 'notification' | 'support' | 'compliance' | 'system';
  subject: string;
  body: string;
  description: string;
  tags: string[];
  variables: string[];
  previewImage?: string;
  suggestedUse: string;
  tone: 'professional' | 'friendly' | 'urgent' | 'formal' | 'casual' | 'motivational';
  priority: 'low' | 'medium' | 'high';
}

export type EmailType = 'newsletter' | 'announcement' | 'personal' | 'promotional' | 'notification' | 'reminder' | 'welcome' | 'verification' | 'security' | 'transactional' | 'support' | 'feedback' | 'compliance' | 'system' | 'marketing';
export type RecipientType = 'all' | 'borrowers' | 'lenders' | 'business' | 'verified' | 'unverified' | 'suspended' | 'active' | 'inactive' | 'premium' | 'new' | 'custom';
export type TemplateCategory = 'all' | 'onboarding' | 'transactional' | 'marketing' | 'notification' | 'support' | 'compliance' | 'system';

// Professional Email Templates Library
export const EMAIL_TEMPLATES: Record<EmailType, EmailTemplate[]> = {
  welcome: [
    {
      id: 'welcome-basic',
      name: 'Welcome to Feyza',
      category: 'onboarding',
      subject: 'Welcome to Feyza, {name}! 🎉',
      body: `Dear {name},

Welcome to Feyza! We're thrilled to have you join our peer-to-peer lending community.

✨ **Getting Started**
1. Complete your profile
2. Verify your identity
3. Connect your payment method
4. Explore lending opportunities

📚 **Resources**
- [Help Center]({help_url})
- [Community Guidelines]({guidelines_url})
- [FAQ]({faq_url})

If you have any questions, our support team is here to help!

Best regards,
The Feyza Team`,
      description: 'Perfect for new user onboarding',
      tags: ['welcome', 'onboarding', 'getting-started'],
      variables: ['name', 'help_url', 'guidelines_url', 'faq_url'],
      suggestedUse: 'Send immediately after user registration',
      tone: 'friendly',
      priority: 'medium'
    },
    {
      id: 'welcome-premium',
      name: 'Welcome to Feyza Premium',
      category: 'onboarding',
      subject: 'Welcome to Feyza Premium, {name}! ⭐',
      body: `Dear {name},

Congratulations on upgrading to Feyza Premium! You now have access to exclusive benefits:

🌟 **Premium Features**
- Higher lending limits
- Priority support
- Advanced analytics
- Reduced fees
- Early access to new features

🚀 **Your Premium Benefits**
• Lending Limit: ${'{limit}'}
• Fee Discount: ${'{discount}'}%
• Dedicated Support Line: ${'{support_line}'}

Ready to maximize your experience? Check out our [Premium Guide]({guide_url}).

Welcome to the premium community!

Best regards,
The Feyza Team`,
      description: 'For premium tier users',
      tags: ['premium', 'welcome', 'upgrade'],
      variables: ['name', 'limit', 'discount', 'support_line', 'guide_url'],
      suggestedUse: 'Send after premium upgrade',
      tone: 'professional',
      priority: 'high'
    }
  ],
  
  verification: [
    {
      id: 'verify-identity',
      name: 'Identity Verification Required',
      category: 'compliance',
      subject: 'Action Required: Verify Your Identity',
      body: `Dear {name},

To continue using Feyza services, we need to verify your identity. This is a standard security measure to protect all users.

🔐 **Verification Steps**
1. Log into your account
2. Navigate to Settings → Verification
3. Upload required documents:
   - Government-issued ID
   - Proof of address
   - Selfie verification

⏰ **Deadline**: {deadline}

Verification typically takes 24-48 hours. You'll receive a confirmation once complete.

[Start Verification]({verification_url})

Need help? Contact our support team.

Best regards,
The Feyza Team`,
      description: 'Identity verification request',
      tags: ['verification', 'kyc', 'compliance', 'identity'],
      variables: ['name', 'deadline', 'verification_url'],
      suggestedUse: 'Send when verification is needed',
      tone: 'formal',
      priority: 'high'
    },
    {
      id: 'verify-success',
      name: 'Verification Successful',
      category: 'notification',
      subject: '✓ Identity Verified Successfully',
      body: `Dear {name},

Great news! Your identity has been successfully verified. You now have full access to all Feyza features.

🎉 **What's Next?**
- Your lending limit has been increased to {new_limit}
- You can now create loan requests
- Access to premium borrower features

Your verified status: ✓ Verified on {verification_date}

[Explore Opportunities]({dashboard_url})

Thank you for completing the verification process!

Best regards,
The Feyza Team`,
      description: 'Verification success notification',
      tags: ['verification', 'success', 'kyc-complete'],
      variables: ['name', 'new_limit', 'verification_date', 'dashboard_url'],
      suggestedUse: 'Send after successful verification',
      tone: 'friendly',
      priority: 'medium'
    }
  ],

  security: [
    {
      id: 'security-alert',
      name: 'Security Alert: New Login',
      category: 'notification',
      subject: '🔒 Security Alert: New Login Detected',
      body: `Dear {name},

We detected a new login to your Feyza account:

📍 **Location**: {location}
💻 **Device**: {device}
🌐 **Browser**: {browser}
🕐 **Time**: {time}

If this was you, no action is needed.

If you don't recognize this activity:
1. [Secure your account immediately]({security_url})
2. Change your password
3. Contact support

Stay safe,
The Feyza Team`,
      description: 'Security alert for new logins',
      tags: ['security', 'alert', 'login', 'notification'],
      variables: ['name', 'location', 'device', 'browser', 'time', 'security_url'],
      suggestedUse: 'Send immediately on suspicious login',
      tone: 'urgent',
      priority: 'high'
    },
    {
      id: 'password-reset',
      name: 'Password Reset Request',
      category: 'notification',
      subject: 'Password Reset Request',
      body: `Dear {name},

We received a request to reset your password.

🔑 **Reset Your Password**
Click the link below (valid for 1 hour):
[Reset Password]({reset_url})

If you didn't request this, please:
1. [Secure your account]({security_url})
2. Contact support immediately

For security, this link will expire at {expiry_time}.

Best regards,
The Feyza Team`,
      description: 'Password reset email',
      tags: ['security', 'password', 'reset'],
      variables: ['name', 'reset_url', 'security_url', 'expiry_time'],
      suggestedUse: 'Send on password reset request',
      tone: 'professional',
      priority: 'high'
    },
    {
      id: 'two-factor-enabled',
      name: '2FA Enabled Successfully',
      category: 'notification',
      subject: '✓ Two-Factor Authentication Enabled',
      body: `Dear {name},

Two-factor authentication (2FA) has been successfully enabled on your account.

🔐 **Security Enhanced**
Your account now has an extra layer of protection. From now on, you'll need both your password and a verification code to log in.

Recovery Codes: {recovery_codes_count} codes available
[View Recovery Codes]({recovery_url})

Keep your recovery codes in a safe place. You'll need them if you lose access to your authenticator app.

Best regards,
The Feyza Team`,
      description: '2FA enabled confirmation',
      tags: ['security', '2fa', 'authentication'],
      variables: ['name', 'recovery_codes_count', 'recovery_url'],
      suggestedUse: 'Send after enabling 2FA',
      tone: 'professional',
      priority: 'medium'
    }
  ],

  transactional: [
    {
      id: 'loan-approved',
      name: 'Loan Approved',
      category: 'transactional',
      subject: '✓ Your Loan Has Been Approved!',
      body: `Dear {name},

Congratulations! Your loan request has been approved.

📊 **Loan Details**
Amount: {amount}
Term: {term} months
Interest Rate: {rate}%
Monthly Payment: {monthly_payment}
First Payment Due: {first_payment_date}

💰 **Funds Disbursement**
Funds will be sent to your verified account within 1-2 business days.

[View Loan Details]({loan_url})

Questions? Our support team is here to help.

Best regards,
The Feyza Team`,
      description: 'Loan approval notification',
      tags: ['loan', 'approved', 'funding'],
      variables: ['name', 'amount', 'term', 'rate', 'monthly_payment', 'first_payment_date', 'loan_url'],
      suggestedUse: 'Send when loan is approved',
      tone: 'professional',
      priority: 'high'
    },
    {
      id: 'payment-received',
      name: 'Payment Received',
      category: 'transactional',
      subject: '✓ Payment Received - Thank You!',
      body: `Dear {name},

We've received your payment of {payment_amount}.

📝 **Payment Details**
Amount: {payment_amount}
Loan ID: {loan_id}
Payment Date: {payment_date}
Remaining Balance: {remaining_balance}
Next Payment Due: {next_payment_date}

[View Payment History]({payments_url})

Thank you for your timely payment!

Best regards,
The Feyza Team`,
      description: 'Payment confirmation',
      tags: ['payment', 'received', 'transaction'],
      variables: ['name', 'payment_amount', 'loan_id', 'payment_date', 'remaining_balance', 'next_payment_date', 'payments_url'],
      suggestedUse: 'Send after successful payment',
      tone: 'friendly',
      priority: 'medium'
    },
    {
      id: 'payment-reminder',
      name: 'Upcoming Payment Reminder',
      category: 'notification',
      subject: '⏰ Payment Reminder: Due in {days} Days',
      body: `Dear {name},

This is a friendly reminder that your payment of {payment_amount} is due in {days} days.

📅 **Payment Details**
Due Date: {due_date}
Amount: {payment_amount}
Loan ID: {loan_id}

💳 **Make a Payment**
[Pay Now]({payment_url})

To avoid late fees, please ensure payment is received by the due date.

Thank you for being a valued Feyza user!

Best regards,
The Feyza Team`,
      description: 'Payment reminder notification',
      tags: ['payment', 'reminder', 'due'],
      variables: ['name', 'payment_amount', 'due_date', 'days', 'loan_id', 'payment_url'],
      suggestedUse: 'Send 3-5 days before payment due',
      tone: 'friendly',
      priority: 'medium'
    }
  ],

  marketing: [
    {
      id: 'newsletter-monthly',
      name: 'Monthly Newsletter',
      category: 'marketing',
      subject: 'Feyza Monthly - {month} {year}',
      body: `Dear {name},

Welcome to the Feyza {month} newsletter! Here's what's happening in our community.

📈 **Market Update**
- Total loans funded this month: {loans_funded}
- Average interest rate: {avg_rate}%
- Community growth: {new_users} new members

✨ **Featured Opportunities**
{featured_loans}

📚 **Lending Tips**
{tips_content}

🎉 **Community Spotlight**
{community_spotlight}

[Read Full Newsletter]({newsletter_url})

Happy Lending!
The Feyza Team`,
      description: 'Monthly newsletter to all users',
      tags: ['newsletter', 'monthly', 'marketing', 'updates'],
      variables: ['name', 'month', 'year', 'loans_funded', 'avg_rate', 'new_users', 'featured_loans', 'tips_content', 'community_spotlight', 'newsletter_url'],
      suggestedUse: 'Send on the 1st of each month',
      tone: 'friendly',
      priority: 'low'
    },
    {
      id: 'promo-special',
      name: 'Special Promotion',
      category: 'marketing',
      subject: '✨ Special Offer: {discount}% Off Fees!',
      body: `Dear {name},

We're excited to offer you an exclusive promotion!

🎁 **Special Offer**
For a limited time, enjoy {discount}% off all platform fees!

⏰ **Offer Details**
Valid: {start_date} - {end_date}
Code: {promo_code}

📋 **How to Redeem**
1. Create or fund a loan
2. Enter promo code at checkout
3. Enjoy reduced fees!

[Start Now]({promo_url})

Don't miss out on this limited-time offer!

Best regards,
The Feyza Team`,
      description: 'Special promotional offer',
      tags: ['promo', 'special', 'discount', 'offer'],
      variables: ['name', 'discount', 'start_date', 'end_date', 'promo_code', 'promo_url'],
      suggestedUse: 'Send for limited-time promotions',
      tone: 'friendly',
      priority: 'medium'
    }
  ],

  support: [
    {
      id: 'support-ticket-received',
      name: 'Support Ticket Received',
      category: 'support',
      subject: 'Support Ticket #{ticket_id} Received',
      body: `Dear {name},

We've received your support request and will get back to you shortly.

🎫 **Ticket Details**
Ticket ID: {ticket_id}
Subject: {ticket_subject}
Priority: {priority}
Estimated Response: {response_time}

📝 **Your Message**
{ticket_message}

We'll notify you when our team responds.

[View Ticket Status]({ticket_url})

Thank you for your patience!

Best regards,
Feyza Support Team`,
      description: 'Support ticket confirmation',
      tags: ['support', 'ticket', 'help'],
      variables: ['name', 'ticket_id', 'ticket_subject', 'priority', 'response_time', 'ticket_message', 'ticket_url'],
      suggestedUse: 'Send immediately after ticket creation',
      tone: 'professional',
      priority: 'medium'
    },
    {
      id: 'support-resolved',
      name: 'Support Ticket Resolved',
      category: 'support',
      subject: '✓ Support Ticket #{ticket_id} Resolved',
      body: `Dear {name},

Great news! Your support ticket has been resolved.

✅ **Resolution Details**
Ticket ID: {ticket_id}
Issue: {ticket_subject}
Resolution: {resolution}
Resolved by: {agent_name}

📊 **How would you rate your experience?**
[Rate Support]({feedback_url})

We value your feedback to help us improve.

Need further assistance? Just reply to this email.

Best regards,
Feyza Support Team`,
      description: 'Support ticket resolved notification',
      tags: ['support', 'resolved', 'feedback'],
      variables: ['name', 'ticket_id', 'ticket_subject', 'resolution', 'agent_name', 'feedback_url'],
      suggestedUse: 'Send when ticket is resolved',
      tone: 'friendly',
      priority: 'medium'
    }
  ],

  compliance: [
    {
      id: 'terms-update',
      name: 'Terms of Service Update',
      category: 'compliance',
      subject: '📋 Important: Terms of Service Update',
      body: `Dear {name},

We're updating our Terms of Service to better serve you and comply with regulations.

📝 **What's Changing?**
{changes_summary}

⏰ **Effective Date**
These changes will take effect on {effective_date}.

✅ **Accept the New Terms**
To continue using Feyza, please review and accept the updated terms:
[Review and Accept]({accept_url})

If you have questions, please contact our support team.

Thank you for being part of Feyza!

Best regards,
The Feyza Team`,
      description: 'Terms of service update notification',
      tags: ['terms', 'legal', 'compliance', 'update'],
      variables: ['name', 'changes_summary', 'effective_date', 'accept_url'],
      suggestedUse: 'Send before terms changes take effect',
      tone: 'formal',
      priority: 'high'
    },
    {
      id: 'annual-report',
      name: 'Annual Compliance Report',
      category: 'compliance',
      subject: '📊 Your Feyza Annual Report {year}',
      body: `Dear {name},

Attached is your annual compliance report for the {year} tax year.

📑 **Report Includes**
- Total interest earned: {total_interest}
- Total fees paid: {total_fees}
- Number of transactions: {transaction_count}
- Tax documents: {tax_docs}

[Download Report]({report_url})

Please retain this report for your records. Consult your tax advisor for filing requirements.

Need assistance? Contact our support team.

Best regards,
The Feyza Team`,
      description: 'Annual compliance report',
      tags: ['compliance', 'tax', 'report', 'annual'],
      variables: ['name', 'year', 'total_interest', 'total_fees', 'transaction_count', 'tax_docs', 'report_url'],
      suggestedUse: 'Send annually in January',
      tone: 'formal',
      priority: 'medium'
    }
  ],

  system: [
    {
      id: 'system-maintenance',
      name: 'Scheduled Maintenance',
      category: 'system',
      subject: '🔧 Scheduled System Maintenance',
      body: `Dear {name},

We'll be performing scheduled maintenance to improve your Feyza experience.

🛠️ **Maintenance Details**
Date: {date}
Start Time: {start_time} UTC
End Time: {end_time} UTC
Duration: {duration} hours

⚠️ **What to Expect**
- Platform will be temporarily unavailable
- Automatic processes will pause
- Services will resume automatically

We recommend completing any pending transactions before maintenance begins.

Thank you for your patience!

Best regards,
The Feyza Team`,
      description: 'System maintenance notification',
      tags: ['system', 'maintenance', 'downtime'],
      variables: ['name', 'date', 'start_time', 'end_time', 'duration'],
      suggestedUse: 'Send 24-48 hours before maintenance',
      tone: 'professional',
      priority: 'high'
    },
    {
      id: 'feature-release',
      name: 'New Feature Release',
      category: 'system',
      subject: '🚀 Introducing {feature_name}!',
      body: `Dear {name},

We're excited to announce a new feature on Feyza!

✨ **Introducing {feature_name}**
{feature_description}

🎯 **Benefits**
{benefits_list}

📚 **Learn More**
[Watch Tutorial]({tutorial_url})
[Read Documentation]({docs_url})

We're constantly working to improve your experience. Have feedback? Let us know!

Best regards,
The Feyza Team`,
      description: 'New feature announcement',
      tags: ['feature', 'release', 'announcement'],
      variables: ['name', 'feature_name', 'feature_description', 'benefits_list', 'tutorial_url', 'docs_url'],
      suggestedUse: 'Send when new feature launches',
      tone: 'friendly',
      priority: 'medium'
    }
  ],

  // Original templates kept for backward compatibility
  newsletter: [
    {
      id: 'newsletter-default',
      name: 'Default Newsletter',
      category: 'marketing',
      subject: 'Feyza Newsletter - {month}',
      body: 'Hi {name},\n\nWelcome to this month\'s Feyza newsletter!\n\n[Your content here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic newsletter template',
      tags: ['newsletter'],
      variables: ['name', 'month'],
      suggestedUse: 'Monthly updates',
      tone: 'friendly',
      priority: 'low'
    }
  ],
  announcement: [
    {
      id: 'announcement-default',
      name: 'Default Announcement',
      category: 'notification',
      subject: 'Important Announcement from Feyza',
      body: 'Hi {name},\n\nWe have an important announcement to share with you.\n\n[Your announcement here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic announcement template',
      tags: ['announcement'],
      variables: ['name'],
      suggestedUse: 'General announcements',
      tone: 'professional',
      priority: 'medium'
    }
  ],
  personal: [
    {
      id: 'personal-default',
      name: 'Default Personal',
      category: 'support',
      subject: 'Message from Feyza',
      body: 'Hi {name},\n\n[Your personal message here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic personal message',
      tags: ['personal'],
      variables: ['name'],
      suggestedUse: 'Personal communications',
      tone: 'friendly',
      priority: 'low'
    }
  ],
  promotional: [
    {
      id: 'promotional-default',
      name: 'Default Promotional',
      category: 'marketing',
      subject: 'Special Offer from Feyza',
      body: 'Hi {name},\n\nWe have a special offer just for you!\n\n[Your promotion here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic promotional template',
      tags: ['promo', 'offer'],
      variables: ['name'],
      suggestedUse: 'Marketing promotions',
      tone: 'friendly',
      priority: 'medium'
    }
  ],
  notification: [
    {
      id: 'notification-default',
      name: 'Default Notification',
      category: 'notification',
      subject: 'Notification from Feyza',
      body: 'Hi {name},\n\n[Your notification here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic notification',
      tags: ['notification'],
      variables: ['name'],
      suggestedUse: 'System notifications',
      tone: 'professional',
      priority: 'medium'
    }
  ],
  reminder: [
    {
      id: 'reminder-default',
      name: 'Default Reminder',
      category: 'notification',
      subject: 'Reminder from Feyza',
      body: 'Hi {name},\n\nThis is a friendly reminder about:\n\n[Your reminder here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic reminder',
      tags: ['reminder'],
      variables: ['name'],
      suggestedUse: 'Payment or action reminders',
      tone: 'friendly',
      priority: 'medium'
    }
  ],
  feedback: [
    {
      id: 'feedback-default',
      name: 'Default Feedback',
      category: 'support',
      subject: 'We\'d Love Your Feedback',
      body: 'Hi {name},\n\nWe\'d love to hear your thoughts about your experience with Feyza.\n\n[Your feedback request here]\n\nBest regards,\nThe Feyza Team',
      description: 'Basic feedback request',
      tags: ['feedback'],
      variables: ['name'],
      suggestedUse: 'Collect user feedback',
      tone: 'friendly',
      priority: 'low'
    }
  ]
};

// Professional email categories with icons and colors
export const EMAIL_CATEGORIES = [
  { id: 'onboarding', name: 'Onboarding', icon: Rocket, color: 'blue', description: 'Welcome emails and getting started guides' },
  { id: 'transactional', name: 'Transactional', icon: CreditCard, color: 'green', description: 'Payment confirmations and loan updates' },
  { id: 'marketing', name: 'Marketing', icon: Megaphone, color: 'purple', description: 'Newsletters and promotional offers' },
  { id: 'notification', name: 'Notifications', icon: Bell, color: 'orange', description: 'System alerts and reminders' },
  { id: 'support', name: 'Support', icon: Headphones, color: 'indigo', description: 'Customer service communications' },
  { id: 'compliance', name: 'Compliance', icon: Shield, color: 'red', description: 'Legal and regulatory emails' },
  { id: 'system', name: 'System', icon: Server, color: 'gray', description: 'Technical and maintenance updates' },
];

// Recipient filters
export const RECIPIENT_FILTERS = [
  { value: 'all', label: 'All Users', icon: Users, description: 'Send to every registered user' },
  { value: 'borrowers', label: 'Borrowers', icon: User, description: 'Users with borrower accounts' },
  { value: 'lenders', label: 'Lenders', icon: User, description: 'Users with lender accounts' },
  { value: 'business', label: 'Business', icon: Building2, description: 'Business lenders and borrowers' },
  { value: 'verified', label: 'Verified Users', icon: BadgeCheck, description: 'Users with verified identity' },
  { value: 'unverified', label: 'Unverified', icon: UserX, description: 'Users pending verification' },
  { value: 'active', label: 'Active Users', icon: Activity, description: 'Active in last 30 days' },
  { value: 'inactive', label: 'Inactive', icon: UserX, description: 'No activity in 30+ days' },
  { value: 'premium', label: 'Premium Users', icon: Star, description: 'Premium tier subscribers' },
  { value: 'new', label: 'New Users', icon: Sparkles, description: 'Joined in last 7 days' },
  { value: 'suspended', label: 'Suspended', icon: Lock, description: 'Account suspended' },
  { value: 'custom', label: 'Custom Selection', icon: Search, description: 'Select specific users' },
];

// Professional tones with descriptions
export const EMAIL_TONES = [
  { value: 'professional', label: 'Professional', icon: Briefcase, description: 'Formal business communication' },
  { value: 'friendly', label: 'Friendly', icon: Heart, description: 'Warm and approachable' },
  { value: 'urgent', label: 'Urgent', icon: AlertTriangle, description: 'Time-sensitive matters' },
  { value: 'formal', label: 'Formal', icon: FileText, description: 'Official correspondence' },
  { value: 'casual', label: 'Casual', icon: MessageCircle, description: 'Relaxed and conversational' },
  { value: 'motivational', label: 'Motivational', icon: ThumbsUp, description: 'Encouraging and inspiring' },
];

