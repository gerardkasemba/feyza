'use client';

import { useState } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { 
  Mail, 
  Send, 
  Users, 
  User, 
  Eye, 
  X,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

type EmailType = 'newsletter' | 'announcement' | 'personal' | 'marketing' | 'support' | 'other';
type RecipientType = 'all' | 'individual' | 'group' | 'custom';

interface EmailComposerProps {
  users: Record<string, unknown>[];
}

export function EmailComposer({ users }: EmailComposerProps) {
  const [emailType, setEmailType] = useState<EmailType>('newsletter');
  const [recipientType, setRecipientType] = useState<RecipientType>('all');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const emailTypes = [
    { value: 'newsletter', label: 'Newsletter', icon: Mail, color: 'blue' },
    { value: 'announcement', label: 'Announcement', icon: AlertCircle, color: 'orange' },
    { value: 'personal', label: 'Personal', icon: User, color: 'green' },
    { value: 'marketing', label: 'Marketing', icon: Users, color: 'purple' },
    { value: 'support', label: 'Support', icon: Mail, color: 'indigo' },
    { value: 'other', label: 'Other', icon: Mail, color: 'gray' },
  ];

  const recipientTypes = [
    { value: 'all', label: 'All Users', description: 'Send to everyone' },
    { value: 'individual', label: 'Individual', description: 'Select specific users' },
    { value: 'group', label: 'Group', description: 'Select by user type' },
    { value: 'custom', label: 'Custom', description: 'Advanced selection' },
  ];

  const groupOptions = [
    { value: 'borrowers', label: 'All Borrowers', count: users.filter(u => u.user_type === 'borrower').length },
    { value: 'lenders', label: 'All Lenders', count: users.filter(u => u.user_type === 'lender').length },
    { value: 'business', label: 'Business Lenders', count: users.filter(u => u.user_type === 'business').length },
    { value: 'admins', label: 'Admins', count: users.filter(u => u.user_type === 'admin').length },
  ];

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    (user.full_name as string | undefined)?.toLowerCase().includes((String(searchQuery)).toLowerCase()) ||
    (user.email as string | undefined)?.toLowerCase().includes((String(searchQuery)).toLowerCase())
  );

  // Calculate recipient count
  const getRecipientCount = () => {
    if (recipientType === 'all') return users.length;
    if (recipientType === 'individual') return selectedUsers.length;
    if (recipientType === 'group') {
      let count = 0;
      selectedGroups.forEach(group => {
        if (group === 'borrowers') count += users.filter(u => u.user_type === 'borrower').length;
        if (group === 'lenders') count += users.filter(u => u.user_type === 'lender').length;
        if (group === 'business') count += users.filter(u => u.user_type === 'business').length;
        if (group === 'admins') count += users.filter(u => u.user_type === 'admin').length;
      });
      return count;
    }
    return 0;
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleGroup = (group: string) => {
    setSelectedGroups(prev =>
      prev.includes(group)
        ? prev.filter(g => g !== group)
        : [...prev, group]
    );
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      setError('Please fill in subject and message');
      return;
    }

    if (getRecipientCount() === 0) {
      setError('Please select at least one recipient');
      return;
    }

    setSending(true);
    setError('');

    try {
      const response = await fetch('/api/admin/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailType,
          recipientType,
          subject,
          body,
          selectedUsers,
          selectedGroups,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setSuccess(true);
      setSubject('');
      setBody('');
      setSelectedUsers([]);
      setSelectedGroups([]);
      
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-blue-600" />
          <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Compose Email</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPreview(!showPreview)}
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>

      {showPreview ? (
        // Preview Mode
        <div className="space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6">
            <div className="mb-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Type</div>
              <Badge variant="info">{emailType}</Badge>
            </div>
            <div className="mb-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Recipients</div>
              <div className="text-neutral-900 dark:text-white font-medium">
                {getRecipientCount()} user{getRecipientCount() !== 1 ? 's' : ''}
              </div>
            </div>
            <div className="mb-4">
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Subject</div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">{subject}</div>
            </div>
            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Message</div>
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-neutral-700 dark:text-neutral-300">
                {body}
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={handleSend} disabled={sending} className="flex-1">
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : `Send to ${getRecipientCount()} recipient${getRecipientCount() !== 1 ? 's' : ''}`}
            </Button>
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Back to Edit
            </Button>
          </div>
        </div>
      ) : (
        // Edit Mode
        <div className="space-y-6">
          {/* Success Message */}
          {success && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-green-800 dark:text-green-300">Email sent successfully!</span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-red-800 dark:text-red-300">{error}</span>
            </div>
          )}

          {/* Email Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Email Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {emailTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    onClick={() => setEmailType(type.value as EmailType)}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      emailType === type.value
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mb-1 ${emailType === type.value ? 'text-blue-600' : 'text-neutral-500'}`} />
                    <div className={`text-sm font-medium ${emailType === type.value ? 'text-blue-900 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {type.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Recipients ({getRecipientCount()} selected)
            </label>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {recipientTypes.map((type) => (
                <button
                  key={type.value}
                  onClick={() => setRecipientType(type.value as RecipientType)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    recipientType === type.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300'
                  }`}
                >
                  <div className={`text-sm font-medium mb-1 ${recipientType === type.value ? 'text-blue-900 dark:text-blue-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                    {type.label}
                  </div>
                  <div className="text-xs text-neutral-500">{type.description}</div>
                </button>
              ))}
            </div>

            {/* Group Selection */}
            {recipientType === 'group' && (
              <div className="space-y-2">
                {groupOptions.map((group) => (
                  <label
                    key={group.value}
                    className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.value)}
                        onChange={() => toggleGroup(group.value)}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <div>
                        <div className="font-medium text-neutral-900 dark:text-white">{group.label}</div>
                        <div className="text-sm text-neutral-500">{group.count} users</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            {/* Individual Selection */}
            {recipientType === 'individual' && (
              <div>
                <div className="mb-2">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800"
                  />
                </div>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.map((user) => (
                    <label
                      key={user.id as string}
                      className="flex items-center justify-between p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedUsers.includes(user.id as string)}
                          onChange={() => toggleUser(user.id as string)}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <div>
                          <div className="font-medium text-neutral-900 dark:text-white">{String(user.full_name ?? "")}</div>
                          <div className="text-sm text-neutral-500">{String(user.email ?? "")}</div>
                        </div>
                      </div>
                      <Badge variant="secondary" size="sm">{String(user.user_type ?? "")}</Badge>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Subject
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter email subject..."
              className="w-full px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
            />
          </div>

          {/* Body */}
          <div>
            <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
              Message
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type your message here...&#10;&#10;Available variables:&#10;{user_name} - Recipient's name&#10;{user_email} - Recipient's email"
              rows={10}
              className="w-full px-4 py-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none font-mono text-sm"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              onClick={() => setShowPreview(true)}
              variant="outline"
              disabled={!subject.trim() || !body.trim()}
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              onClick={handleSend}
              disabled={sending || !subject.trim() || !body.trim() || getRecipientCount() === 0}
              className="flex-1"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Sending...' : 'Send Email'}
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
