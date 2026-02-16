'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Mail,
  Send,
  Users,
  User,
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  Calendar,
  Download,
  Clock,
  TrendingUp,
  AlertTriangle,
  Award,
  Bell,
  MessageSquare,
  FileCheck,
  CreditCard,
  Shield,
  Zap,
  Globe,
  DollarSign,
  BarChart,
  HelpCircle,
  Sparkles,
  UserCheck,
  UserX,
  Lock,
  Unlock,
  ThumbsUp,
  ThumbsDown,
  AlertCircle,
  Info,
  Plus,
  Copy,
  Trash2,
  Save,
  Settings,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Edit,
  Archive,
  SendHorizonal,
  MailCheck,
  MailOpen,
  MailQuestion,
  MailWarning,
  MailX,
  PenTool,
  Layout,
  MessageCircle,
  Megaphone,
  Newspaper,
  CalendarDays,
  Gift,
  Heart,
  Star,
  Rocket,
  ShieldCheck,
  BadgeCheck,
  Briefcase,
  Building2,
  Users2,
  PieChart,
  LineChart,
  Activity,
  Database,
  Globe2,
  Network,
  Cpu,
  HardDrive,
  Server,
  Cloud,
  Lock as LockIcon,
  Key,
  Fingerprint,
  ScanFace,
  Webcam,
  Camera,
  Video,
  Headphones,
  Mic,
  Volume2,
  VolumeX,
  Play,
  Pause,
  StopCircle,
  SkipForward,
  SkipBack,
  Repeat,
  Shuffle,
  Music,
  Radio,
  Podcast,
  Tv,
  Monitor,
  Smartphone,
  Tablet,
  Laptop,
  Watch,
  Headset,
  Gamepad,
  Keyboard,
  Mouse,
  Printer,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  PhoneOff,
  Voicemail,
  MessageSquareText,
  MessageSquareQuote,
  MessageSquarePlus,
  MessageSquareDot,
  MessageSquareOff,
  MessageSquareWarning,
  MailPlus,
  MailMinus,
  MailSearch,
  MailCheck as MailCheckIcon,
  MailOpen as MailOpenIcon,
  MailQuestion as MailQuestionIcon,
  MailWarning as MailWarningIcon,
  MailX as MailXIcon,
} from 'lucide-react';

// Professional Email Templates Library
interface EmailTemplate {
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

type EmailType = 'newsletter' | 'announcement' | 'personal' | 'promotional' | 'notification' | 'reminder' | 'welcome' | 'verification' | 'security' | 'transactional' | 'support' | 'feedback' | 'compliance' | 'system' | 'marketing';
type RecipientType = 'all' | 'borrowers' | 'lenders' | 'business' | 'verified' | 'unverified' | 'suspended' | 'active' | 'inactive' | 'premium' | 'new' | 'custom';
type TemplateCategory = 'all' | 'onboarding' | 'transactional' | 'marketing' | 'notification' | 'support' | 'compliance' | 'system';

// Professional Email Templates Library
const EMAIL_TEMPLATES: Record<EmailType, EmailTemplate[]> = {
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
const EMAIL_CATEGORIES = [
  { id: 'onboarding', name: 'Onboarding', icon: Rocket, color: 'blue', description: 'Welcome emails and getting started guides' },
  { id: 'transactional', name: 'Transactional', icon: CreditCard, color: 'green', description: 'Payment confirmations and loan updates' },
  { id: 'marketing', name: 'Marketing', icon: Megaphone, color: 'purple', description: 'Newsletters and promotional offers' },
  { id: 'notification', name: 'Notifications', icon: Bell, color: 'orange', description: 'System alerts and reminders' },
  { id: 'support', name: 'Support', icon: Headphones, color: 'indigo', description: 'Customer service communications' },
  { id: 'compliance', name: 'Compliance', icon: Shield, color: 'red', description: 'Legal and regulatory emails' },
  { id: 'system', name: 'System', icon: Server, color: 'gray', description: 'Technical and maintenance updates' },
];

// Recipient filters
const RECIPIENT_FILTERS = [
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
const EMAIL_TONES = [
  { value: 'professional', label: 'Professional', icon: Briefcase, description: 'Formal business communication' },
  { value: 'friendly', label: 'Friendly', icon: Heart, description: 'Warm and approachable' },
  { value: 'urgent', label: 'Urgent', icon: AlertTriangle, description: 'Time-sensitive matters' },
  { value: 'formal', label: 'Formal', icon: FileText, description: 'Official correspondence' },
  { value: 'casual', label: 'Casual', icon: MessageCircle, description: 'Relaxed and conversational' },
  { value: 'motivational', label: 'Motivational', icon: ThumbsUp, description: 'Encouraging and inspiring' },
];

export default function AdminEmailsPage() {
  const supabase = createClient();
  
  // State
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [recipientCount, setRecipientCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>('all');
  const [searchTemplate, setSearchTemplate] = useState('');
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [scheduledSend, setScheduledSend] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [replyTo, setReplyTo] = useState('');
  const [ccEmails, setCcEmails] = useState('');
  const [bccEmails, setBccEmails] = useState('');
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    loadUsers();
    loadSavedTemplates();
  }, [recipientType, searchTerm]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('users')
        .select('id, full_name, email, user_type, verification_status, verified_at, country, created_at, is_suspended')
        .order('created_at', { ascending: false });

      // Filter by recipient type
      switch (recipientType) {
        case 'borrowers':
          query = query.eq('user_type', 'borrower');
          break;
        case 'lenders':
          query = query.eq('user_type', 'lender');
          break;
        case 'business':
          query = query.eq('user_type', 'business');
          break;
        case 'verified':
          query = query.eq('verification_status', 'verified');
          break;
        case 'unverified':
          query = query.neq('verification_status', 'verified');
          break;
        case 'active':
          query = query.gt('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          break;
        case 'inactive':
          query = query.lt('last_sign_in_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
          break;
        case 'premium':
          query = query.eq('borrowing_tier', 3);
          break;
        case 'new':
          query = query.gt('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
          break;
        case 'suspended':
          query = query.eq('is_suspended', true);
          break;
      }

      // Apply search filter
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query.limit(200);

      if (error) throw error;
      setUsers(data || []);
      
      // Update recipient count
      if (recipientType === 'custom') {
        setRecipientCount(selectedUsers.length);
      } else {
        setRecipientCount(data?.length || 0);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Failed to load users' });
    } finally {
      setLoading(false);
    }
  };

  const loadSavedTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('admin_emails')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!error) {
        setSavedTemplates(data || []);
      }
    } catch (error) {
      console.error('Error loading saved templates:', error);
    }
  };

  const useTemplate = (template: EmailTemplate) => {
    setSubject(template.subject);
    setBody(template.body);
    setEmailType(template.id.split('-')[0] as EmailType);
    setSelectedTone(template.tone);
    setPriority(template.priority);
    setMessage({ type: 'info', text: `Template "${template.name}" loaded` });
    setTimeout(() => setMessage(null), 3000);
  };

  const saveAsTemplate = async () => {
    if (!subject || !body) {
      setMessage({ type: 'error', text: 'Please fill in subject and body first' });
      return;
    }

    setSavingTemplate(true);
    try {
      const { error } = await supabase
        .from('email_templates')
        .insert({
          name: prompt('Enter template name:') || 'Custom Template',
          subject,
          body,
          type: emailType,
          tone: selectedTone,
          created_by: (await supabase.auth.getUser()).data.user?.id,
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Template saved successfully!' });
      loadSavedTemplates();
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: 'Failed to save template' });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSendEmail = async () => {
    if (!subject || !body) {
      setMessage({ type: 'error', text: 'Please fill in subject and body' });
      return;
    }

    if (recipientType === 'custom' && selectedUsers.length === 0) {
      setMessage({ type: 'error', text: 'Please select at least one recipient' });
      return;
    }

    setSending(true);
    setMessage(null);

    try {
      let recipients: string[] = [];
      
      if (recipientType === 'custom') {
        recipients = selectedUsers;
      } else {
        recipients = users.map(u => u.id);
      }

      const payload: any = {
        subject,
        body,
        emailType,
        recipientType,
        recipients,
        tone: selectedTone,
        priority,
        trackingEnabled,
        scheduledSend: scheduledSend ? `${scheduleDate}T${scheduleTime}` : null,
      };

      if (replyTo) payload.replyTo = replyTo;
      if (ccEmails) payload.cc = ccEmails.split(',').map(e => e.trim());
      if (bccEmails) payload.bcc = bccEmails.split(',').map(e => e.trim());

      if (testMode && testEmail) {
        // Send test email to single address
        const response = await fetch('/api/admin/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, testEmail }),
        });

        if (!response.ok) throw new Error('Test email failed');
        setMessage({ type: 'success', text: `Test email sent to ${testEmail}` });
      } else {
        // Send to actual recipients
        const response = await fetch('/api/admin/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || 'Failed to send emails');
        }

        setMessage({ 
          type: 'success', 
          text: scheduledSend 
            ? `Email scheduled for ${scheduleDate} at ${scheduleTime}` 
            : `Email sent successfully to ${recipients.length} recipient(s)!` 
        });

        // Clear form if not scheduled
        if (!scheduledSend) {
          setSubject('');
          setBody('');
          setSelectedUsers([]);
          setReplyTo('');
          setCcEmails('');
          setBccEmails('');
        }
      }

      // Reload users to refresh counts
      loadUsers();

    } catch (error: any) {
      console.error('Error sending email:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to send email' });
    } finally {
      setSending(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
    setRecipientCount(prev => 
      selectedUsers.includes(userId) ? prev - 1 : prev + 1
    );
  };

  const selectAllUsers = () => {
    setSelectedUsers(users.map(u => u.id));
    setRecipientCount(users.length);
  };

  const clearSelection = () => {
    setSelectedUsers([]);
    setRecipientCount(0);
  };

  const previewEmail = () => {
    return body
      .replace(/{name}/g, 'John Doe')
      .replace(/{email}/g, 'john@example.com')
      .replace(/{date}/g, new Date().toLocaleDateString())
      .replace(/{time}/g, new Date().toLocaleTimeString());
  };

  // Get filtered templates
  const getFilteredTemplates = () => {
    let templates: EmailTemplate[] = [];
    Object.values(EMAIL_TEMPLATES).forEach(typeTemplates => {
      templates = [...templates, ...typeTemplates];
    });

    return templates.filter(template => {
      if (selectedCategory !== 'all' && template.category !== selectedCategory) return false;
      if (searchTemplate && !template.name.toLowerCase().includes(searchTemplate.toLowerCase()) && 
          !template.description.toLowerCase().includes(searchTemplate.toLowerCase())) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2 flex items-center gap-3">
                <Mail className="w-10 h-10 text-blue-600" />
                Professional Email Management
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 text-lg">
                Create, schedule, and send professional emails with our comprehensive template library
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowTemplateLibrary(!showTemplateLibrary)}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {showTemplateLibrary ? 'Hide Templates' : 'Template Library'}
              </button>
              <button
                onClick={loadUsers}
                className="px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg border ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
              : message.type === 'error'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
          }`}>
            <div className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : 
               message.type === 'error' ? <XCircle className="w-5 h-5" /> : 
               <Info className="w-5 h-5" />}
              <span className="font-medium">{message.text}</span>
            </div>
          </div>
        )}

        {/* Template Library Modal */}
        {showTemplateLibrary && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-neutral-800 rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
              <div className="p-6 border-b border-neutral-200 dark:border-neutral-700">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-6 h-6 text-blue-600" />
                    Professional Email Templates
                  </h2>
                  <button
                    onClick={() => setShowTemplateLibrary(false)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-neutral-400" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                {/* Filters */}
                <div className="flex gap-4 mb-6">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as TemplateCategory)}
                    className="px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                  >
                    <option value="all">All Categories</option>
                    {EMAIL_CATEGORIES.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>

                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchTemplate}
                      onChange={(e) => setSearchTemplate(e.target.value)}
                      placeholder="Search templates..."
                      className="w-full pl-10 pr-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg text-neutral-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Templates Grid */}
                <div className="grid grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
                  {getFilteredTemplates().map((template) => {
                    const CategoryIcon = EMAIL_CATEGORIES.find(c => c.id === template.category)?.icon || FileText;
                    const categoryColor = EMAIL_CATEGORIES.find(c => c.id === template.category)?.color || 'blue';
                    
                    return (
                      <div
                        key={template.id}
                        onClick={() => {
                          useTemplate(template);
                          setShowTemplateLibrary(false);
                        }}
                        className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:border-blue-500 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-3 mb-3">
                          <div className={`p-2 bg-${categoryColor}-100 dark:bg-${categoryColor}-900/20 rounded-lg`}>
                            <CategoryIcon className={`w-5 h-5 text-${categoryColor}-600 dark:text-${categoryColor}-400`} />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-neutral-900 dark:text-white">
                              {template.name}
                            </h3>
                            <p className="text-sm text-neutral-500 dark:text-neutral-400">
                              {template.description}
                            </p>
                          </div>
                        </div>
                        
                        <div className="mb-3">
                          <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Subject:</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">{template.subject}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-3">
                          {template.tags.map(tag => (
                            <span key={tag} className="px-2 py-1 bg-neutral-200 dark:bg-neutral-700 rounded-full text-xs">
                              #{tag}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span className={`px-2 py-1 rounded-full bg-${categoryColor}-100 dark:bg-${categoryColor}-900/20 text-${categoryColor}-600 dark:text-${categoryColor}-400`}>
                            {template.category}
                          </span>
                          <span className="text-neutral-500">
                            Tone: {template.tone}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-6">
          
          {/* Left Column - Email Composer */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Email Type & Categories */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Layout className="w-5 h-5 text-blue-600" />
                Email Category
              </h3>
              
              <div className="grid grid-cols-4 gap-3 mb-4">
                {EMAIL_CATEGORIES.map((category) => {
                  const Icon = category.icon;
                  const isActive = EMAIL_TEMPLATES[emailType]?.some(t => t.category === category.id);
                  return (
                    <div
                      key={category.id}
                      className={`p-3 rounded-lg border ${
                        isActive ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500' : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-neutral-500'}`} />
                        <span className="font-medium text-sm">{category.name}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{category.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Email Content */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <PenTool className="w-5 h-5 text-blue-600" />
                Compose Email
              </h3>

              {/* Tone Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email Tone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {EMAIL_TONES.map((tone) => {
                    const Icon = tone.icon;
                    return (
                      <button
                        key={tone.value}
                        onClick={() => setSelectedTone(tone.value)}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          selectedTone === tone.value
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 mb-1 text-blue-600" />
                        <div className="text-sm font-medium">{tone.label}</div>
                        <div className="text-xs text-neutral-500">{tone.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Subject */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Subject Line
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Enter email subject..."
                  className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Body */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Email Body
                </label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Enter email content... Use {name} for personalization, {date} for current date"
                  rows={15}
                  className="w-full px-4 py-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex justify-between mt-2">
                  <p className="text-xs text-neutral-500">
                    Available variables: {'{name}'}, {'{email}'}, {'{date}'}, {'{time}'}
                  </p>
                  <button
                    onClick={saveAsTemplate}
                    disabled={savingTemplate || !subject || !body}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    {savingTemplate ? 'Saving...' : 'Save as Template'}
                  </button>
                </div>
              </div>

              {/* Advanced Options */}
              <div className="mb-4">
                <button
                  onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                  className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white"
                >
                  <Settings className="w-4 h-4" />
                  Advanced Options
                  {showAdvancedOptions ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showAdvancedOptions && (
                  <div className="mt-4 space-y-4 p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg">
                    {/* Priority */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Priority
                      </label>
                      <select
                        value={priority}
                        onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                        className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>

                    {/* Reply To */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        Reply-To Email
                      </label>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        placeholder="reply@feyza.com"
                        className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                      />
                    </div>

                    {/* CC */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        CC (comma separated)
                      </label>
                      <input
                        type="text"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                        placeholder="cc@example.com, another@example.com"
                        className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                      />
                    </div>

                    {/* BCC */}
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                        BCC (comma separated)
                      </label>
                      <input
                        type="text"
                        value={bccEmails}
                        onChange={(e) => setBccEmails(e.target.value)}
                        placeholder="bcc@example.com"
                        className="w-full px-4 py-2 bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600 rounded-lg"
                      />
                    </div>

                    {/* Tracking */}
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                        Enable Tracking
                      </label>
                      <input
                        type="checkbox"
                        checked={trackingEnabled}
                        onChange={(e) => setTrackingEnabled(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule & Send */}
              <div className="space-y-4">
                {/* Test Mode */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={testMode}
                      onChange={(e) => setTestMode(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Send Test Email</span>
                  </label>
                  {testMode && (
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1 px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
                    />
                  )}
                </div>

                {/* Schedule */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={scheduledSend}
                      onChange={(e) => setScheduledSend(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm font-medium">Schedule for later</span>
                  </label>
                  {scheduledSend && (
                    <>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
                      />
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900"
                      />
                    </>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex-1 px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 flex items-center justify-center gap-2 transition-colors"
                  >
                    <Eye className="w-5 h-5" />
                    {showPreview ? 'Hide' : 'Show'} Preview
                  </button>
                  <button
                    onClick={handleSendEmail}
                    disabled={sending || !subject || !body || (recipientType === 'custom' && selectedUsers.length === 0) || (testMode && !testEmail)}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
                  >
                    {sending ? <RefreshCw className="w-5 h-5 animate-spin" /> : 
                     scheduledSend ? <Calendar className="w-5 h-5" /> : 
                     testMode ? <Mail className="w-5 h-5" /> : 
                     <Send className="w-5 h-5" />}
                    {sending ? 'Processing...' : 
                     scheduledSend ? 'Schedule Email' : 
                     testMode ? 'Send Test' : 
                     `Send to ${recipientCount} Recipient(s)`}
                  </button>
                </div>
              </div>

              {/* Preview */}
              {showPreview && (
                <div className="mt-6 p-6 bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-900 dark:to-neutral-950 rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Preview
                    </h4>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 rounded-full text-blue-600">
                        {selectedTone} tone
                      </span>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 rounded-full text-purple-600">
                        {priority} priority
                      </span>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 shadow-sm">
                    <div className="mb-4 pb-4 border-b border-neutral-200 dark:border-neutral-700">
                      <div className="text-sm text-neutral-500 mb-1">Subject:</div>
                      <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                        {subject.replace(/{name}/g, 'John Doe').replace(/{date}/g, new Date().toLocaleDateString())}
                      </div>
                    </div>
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="whitespace-pre-wrap text-neutral-700 dark:text-neutral-300 leading-relaxed">
                        {previewEmail()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recipients */}
          <div className="space-y-6">
            
            {/* Recipient Type */}
            <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Recipients
              </h3>

              <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
                {RECIPIENT_FILTERS.map((option) => {
                  const Icon = option.icon;
                  return (
                    <label
                      key={option.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        recipientType === option.value
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="recipientType"
                        value={option.value}
                        checked={recipientType === option.value}
                        onChange={(e) => setRecipientType(e.target.value as RecipientType)}
                        className="mt-1 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4" />
                          <span className="font-medium text-sm">{option.label}</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">{option.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>

              <div className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                    Total Recipients:
                  </span>
                  <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {recipientCount.toLocaleString()}
                  </span>
                </div>
                {recipientType === 'custom' && (
                  <p className="text-xs text-neutral-500 mt-2">
                    {selectedUsers.length} selected • {users.length - selectedUsers.length} available
                  </p>
                )}
              </div>
            </div>

            {/* Custom User Selection */}
            {recipientType === 'custom' && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-600" />
                  Select Users
                </h3>

                {/* Search */}
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name or email..."
                      className="w-full pl-10 pr-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Select All / Clear */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={selectAllUsers}
                    className="flex-1 px-3 py-2 text-sm bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Select All ({users.length})
                  </button>
                  <button
                    onClick={clearSelection}
                    className="flex-1 px-3 py-2 text-sm bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors font-medium flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" />
                    Clear ({selectedUsers.length})
                  </button>
                </div>

                {/* User List */}
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {loading ? (
                    <div className="text-center py-8 text-neutral-500">
                      <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
                      <p>Loading users...</p>
                    </div>
                  ) : users.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No users found</p>
                    </div>
                  ) : (
                    users.map((user) => (
                      <label
                        key={user.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedUsers.includes(user.id)
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                            : 'border-neutral-200 dark:border-neutral-700 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleUserSelection(user.id)}
                          className="mt-1 text-blue-600"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                              {user.full_name}
                            </span>
                            {user.verification_status === 'verified' && (
                              <div title="Verified">
                                <BadgeCheck className="w-4 h-4 text-green-500 flex-shrink-0" />
                              </div>
                            )}
                            {user.is_suspended && (
                              <div title="Suspended">
                                <Lock className="w-4 h-4 text-red-500 flex-shrink-0" />
                              </div>
                            )}
                          </div>
                          <p className="text-xs text-neutral-500 truncate">{user.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs px-2 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded-full">
                              {user.user_type}
                            </span>
                            {user.country && (
                              <span className="text-xs text-neutral-500">{user.country}</span>
                            )}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Saved Templates */}
            {savedTemplates.length > 0 && (
              <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center gap-2">
                  <Archive className="w-5 h-5 text-blue-600" />
                  Saved Templates
                </h3>
                <div className="space-y-2">
                  {savedTemplates.slice(0, 5).map((template) => (
                    <button
                      key={template.id}
                      onClick={() => {
                        setSubject(template.subject);
                        setBody(template.body);
                        setMessage({ type: 'info', text: `Template "${template.name}" loaded` });
                        setTimeout(() => setMessage(null), 3000);
                      }}
                      className="w-full p-3 text-left bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors border border-neutral-200 dark:border-neutral-700"
                    >
                      <p className="font-medium text-sm text-neutral-900 dark:text-white truncate">
                        {template.name}
                      </p>
                      <p className="text-xs text-neutral-500 truncate mt-1">
                        {template.subject}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}