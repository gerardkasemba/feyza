'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('BusinessLoanTypesCard');

import React, { useState, useEffect } from 'react';
import { Button, Card, Badge } from '@/components/ui';
import { 
  CreditCard, 
  Plus, 
  X, 
  Check, 
  ChevronDown, 
  ChevronUp,
  Edit2,
  Loader2
} from 'lucide-react';

interface LoanType {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  isSelected?: boolean;
}

interface BusinessLoanTypesCardProps {
  businessId: string;
  initialLoanTypes?: LoanType[];
  initialSelectedIds?: string[];
}

export function BusinessLoanTypesCard({ 
  businessId, 
  initialLoanTypes = [],
  initialSelectedIds = []
}: BusinessLoanTypesCardProps) {
  const [loanTypes, setLoanTypes] = useState<LoanType[]>(initialLoanTypes);
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(initialLoanTypes.length === 0);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch loan types if not provided
  useEffect(() => {
    if (initialLoanTypes.length === 0) {
      fetchLoanTypes();
    }
  }, []);

  const fetchLoanTypes = async () => {
    try {
      const response = await fetch('/api/business/loan-types');
      if (response.ok) {
        const data = await response.json();
        setLoanTypes(data.loanTypes || []);
        const selected = (data.loanTypes || [])
          .filter((lt: LoanType) => lt.isSelected)
          .map((lt: LoanType) => lt.id);
        setSelectedIds(selected);
      }
    } catch (error) {
      log.error('Failed to fetch loan types:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLoanType = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch('/api/business/loan-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loanTypeIds: selectedIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to save');
      }

      setMessage({ type: 'success', text: 'Loan types updated!' });
      setIsEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save loan types' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original selection
    const selected = loanTypes
      .filter(lt => lt.isSelected)
      .map(lt => lt.id);
    setSelectedIds(selected);
    setIsEditing(false);
  };

  const selectedLoanTypes = loanTypes.filter(lt => selectedIds.includes(lt.id));
  const unselectedLoanTypes = loanTypes.filter(lt => !selectedIds.includes(lt.id));

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CreditCard className="w-5 h-5 text-purple-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">Loan Types You Offer</h3>
          <Badge variant="info" size="sm">{selectedIds.length}</Badge>
        </div>
        {!isEditing ? (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        ) : (
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

      {isEditing ? (
        <div className="space-y-4">
          {/* Selected types */}
          {selectedIds.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Selected</p>
              <div className="flex flex-wrap gap-2">
                {selectedLoanTypes.map(lt => (
                  <button
                    key={lt.id}
                    onClick={() => toggleLoanType(lt.id)}
                    className="px-3 py-1.5 bg-purple-100 text-purple-800 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-purple-200 transition-colors"
                  >
                    {lt.name}
                    <X className="w-3.5 h-3.5" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Available types */}
          {unselectedLoanTypes.length > 0 && (
            <div>
              <p className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">Available</p>
              <div className="flex flex-wrap gap-2">
                {unselectedLoanTypes.map(lt => (
                  <button
                    key={lt.id}
                    onClick={() => toggleLoanType(lt.id)}
                    className="px-3 py-1.5 bg-neutral-100 text-neutral-700 rounded-full text-sm font-medium flex items-center gap-1 hover:bg-neutral-200 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {lt.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {selectedIds.length === 0 ? (
            <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
              <CreditCard className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
              <p className="text-sm text-neutral-500">No loan types selected</p>
              <p className="text-xs text-neutral-400 mt-1">You'll match with all loan requests</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3"
                onClick={() => setIsEditing(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Loan Types
              </Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                {selectedLoanTypes.slice(0, isExpanded ? undefined : 5).map(lt => (
                  <span
                    key={lt.id}
                    className="px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full text-sm font-medium"
                  >
                    {lt.name}
                  </span>
                ))}
              </div>
              
              {selectedLoanTypes.length > 5 && (
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
                      +{selectedLoanTypes.length - 5} more
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </>
      )}
    </Card>
  );
}
