'use client';

import { useState } from 'react';
import { Card, Badge } from '@/components/ui';
import { Clock, Mail, Users, Eye, CheckCircle, XCircle, Loader } from 'lucide-react';

interface EmailHistoryProps {
  emails: Record<string, unknown>[];
}

export function EmailHistory({ emails }: EmailHistoryProps) {
  const [selectedEmail, setSelectedEmail] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="success" size="sm"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="danger" size="sm"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="warning" size="sm"><Loader className="w-3 h-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="secondary" size="sm">{status}</Badge>;
    }
  };

  const getTypeBadge = (type: string) => {
    const colors: Record<string, any> = {
      newsletter: 'info',
      announcement: 'warning',
      personal: 'success',
      marketing: 'purple',
      support: 'indigo',
      other: 'neutral',
    };
    return <Badge variant={colors[type] || 'neutral'} size="sm">{type}</Badge>;
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="w-5 h-5 text-blue-600" />
        <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Email History</h2>
      </div>

      {selectedEmail ? (
        // Email Detail View
        <div className="space-y-4">
          <button
            onClick={() => setSelectedEmail(null)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-4"
          >
            ← Back to list
          </button>

          <div className="bg-neutral-50 dark:bg-neutral-900 rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              {getTypeBadge(selectedEmail.email_type)}
              {getStatusBadge(selectedEmail.status)}
            </div>

            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Subject</div>
              <div className="text-lg font-semibold text-neutral-900 dark:text-white">
                {selectedEmail.subject}
              </div>
            </div>

            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Recipients</div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-neutral-500" />
                <span className="text-neutral-900 dark:text-white">
                  {selectedEmail.recipient_count} user{selectedEmail.recipient_count !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-1">Sent</div>
              <div className="text-neutral-900 dark:text-white">
                {new Date(selectedEmail.created_at).toLocaleString()}
              </div>
            </div>

            <div>
              <div className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">Message</div>
              <div className="bg-white dark:bg-neutral-800 rounded-lg p-4 prose dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">
                  {selectedEmail.body}
                </div>
              </div>
            </div>

            {selectedEmail.error_message && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error</div>
                <div className="text-sm text-red-700 dark:text-red-400">{selectedEmail.error_message}</div>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Email List View
        <div className="space-y-3">
          {emails.length === 0 ? (
            <div className="text-center py-12">
              <Mail className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-3" />
              <p className="text-neutral-500 dark:text-neutral-400">No emails sent yet</p>
            </div>
          ) : (
            <div className="max-h-[600px] overflow-y-auto space-y-3">
              {emails.map((email) => (
                <div
                  key={String(email.id ?? "")}
                  onClick={() => setSelectedEmail(email)}
                  className="p-4 bg-neutral-50 dark:bg-neutral-900 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer transition-colors border border-neutral-200 dark:border-neutral-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-neutral-900 dark:text-white truncate mb-1">
                        {String(email.subject ?? "")}
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {getTypeBadge(String((email as any).email_type ?? ""))}
                        <span className="text-xs text-neutral-500">
                          <Users className="w-3 h-3 inline mr-1" />
                          {String(email.recipient_count ?? "")} recipient{email.recipient_count !== 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="ml-2">
                      {getStatusBadge(String((email as any).status ?? ""))}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">
                      {new Date(email.created_at as string).toLocaleString()}
                    </div>
                    <button className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
