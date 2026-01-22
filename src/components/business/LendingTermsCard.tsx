'use client';

import React, { useState } from 'react';
import { Button, Card } from '@/components/ui';
import { 
  FileText, 
  Edit2, 
  Check, 
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface LendingTermsCardProps {
  businessId: string;
  initialTerms?: string | null;
}

export function LendingTermsCard({ businessId, initialTerms }: LendingTermsCardProps) {
  const [terms, setTerms] = useState(initialTerms || '');
  const [editedTerms, setEditedTerms] = useState(initialTerms || '');
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/business/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lending_terms: editedTerms }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setTerms(editedTerms);
      setMessage({ type: 'success', text: 'Terms updated!' });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save terms' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/business/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lending_terms: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete');
      }

      setTerms('');
      setEditedTerms('');
      setMessage({ type: 'success', text: 'Terms deleted!' });
      setShowDeleteConfirm(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to delete terms' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditedTerms(terms);
    setIsEditing(false);
  };

  // Truncate terms for preview
  const previewLength = 200;
  const needsTruncation = terms.length > previewLength;
  const displayText = isExpanded || !needsTruncation 
    ? terms 
    : terms.substring(0, previewLength) + '...';

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">Lending Terms & Policy</h3>
        </div>
        {!isEditing && terms && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(true)}>
              <Trash2 className="w-4 h-4 text-red-500" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Edit2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
        )}
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} loading={saving}>
              <Check className="w-4 h-4 mr-1" />
              Save
            </Button>
          </div>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-700 border border-green-200' 
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Delete confirmation */}
      {showDeleteConfirm && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium text-red-800">Delete lending terms?</p>
              <p className="text-sm text-red-600 mt-1">This will remove your terms from all loan requests.</p>
              <div className="flex gap-2 mt-3">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  className="bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleDelete}
                  loading={saving}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isEditing ? (
        <div>
          <textarea
            value={editedTerms}
            onChange={(e) => setEditedTerms(e.target.value)}
            placeholder="Enter your lending terms and conditions. Borrowers will see these when requesting a loan from you.

Example:
• Loans must be repaid on schedule
• Late payments may incur a fee
• Early repayment is allowed without penalty"
            className="w-full h-48 p-4 border border-neutral-200 dark:border-neutral-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-neutral-800 dark:text-white text-sm resize-none"
          />
          <p className="text-xs text-neutral-400 mt-2">
            These terms will be shown to borrowers before they request a loan.
          </p>
        </div>
      ) : terms ? (
        <>
          <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
              {displayText}
            </p>
          </div>
          
          {needsTruncation && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-sm text-neutral-500 hover:text-neutral-700 flex items-center gap-1"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  Read more
                </>
              )}
            </button>
          )}
        </>
      ) : (
        <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <FileText className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
          <p className="text-sm text-neutral-500">No lending terms set</p>
          <p className="text-xs text-neutral-400 mt-1">Add terms borrowers must agree to</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-3"
            onClick={() => setIsEditing(true)}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Add Terms
          </Button>
        </div>
      )}
    </Card>
  );
}
