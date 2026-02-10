'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';
import Link from 'next/link';
import { 
  Shield, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp,
  Star,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  Plus,
  History
} from 'lucide-react';

interface BusinessTrust {
  business_id: string;
  business_name: string;
  completed_loan_count: number;
  has_graduated: boolean;
  trust_status: string;
  max_amount: number;
  first_time_amount: number;
  standard_max_amount: number;
  loans_until_graduation: number;
  last_loan_date?: string;
}

interface BorrowerTrustCardProps {
  userId: string;
  compact?: boolean;
}

export function BorrowerTrustCard({ userId, compact = false }: BorrowerTrustCardProps) {
  const [trustRecords, setTrustRecords] = useState<BusinessTrust[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(!compact);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    fetchTrustData();
  }, [userId]);

  const fetchTrustData = async () => {
    try {
      const response = await fetch('/api/borrower/trust');
      if (response.ok) {
        const data = await response.json();
        setTrustRecords(data.trustRecords || []);
      }
    } catch (error) {
      console.error('Failed to fetch trust data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrustStatusColor = (status: string) => {
    switch (status) {
      case 'graduated':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20';
      case 'building':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      case 'new':
        return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800';
      case 'suspended':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'banned':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      default:
        return 'text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-800';
    }
  };

  const getTrustStatusLabel = (status: string) => {
    switch (status) {
      case 'graduated':
        return 'Trusted';
      case 'building':
        return 'Building';
      case 'new':
        return 'New';
      case 'suspended':
        return 'Suspended';
      case 'banned':
        return 'Banned';
      default:
        return status;
    }
  };

  const getTrustIcon = (status: string) => {
    switch (status) {
      case 'graduated':
        return <Star className="w-4 h-4 text-green-500" fill="currentColor" />;
      case 'building':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      default:
        return <Shield className="w-4 h-4 text-neutral-400" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  const graduatedCount = trustRecords.filter(r => r.has_graduated).length;
  const buildingCount = trustRecords.filter(r => r.trust_status === 'building').length;
  const totalCount = trustRecords.length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="font-semibold text-neutral-900 dark:text-white">Business Relationships</h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">Your trust with specific lenders</p>
          </div>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-neutral-400" />
            </button>
            
            {showTooltip && (
              <div className="absolute left-0 top-8 z-50 w-80 p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Business Trust vs Trust Score</h4>
                <div className="space-y-3 text-sm">
                  <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="font-medium text-blue-800 dark:text-blue-200 flex items-center gap-1">
                      <Building2 className="w-4 h-4" /> Business Relationships
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                      Your history with each specific business lender. Build trust through repeat loans to unlock higher amounts.
                    </p>
                  </div>
                  <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                    <p className="font-medium text-purple-800 dark:text-purple-200 flex items-center gap-1">
                      <Shield className="w-4 h-4" /> Trust Score
                    </p>
                    <p className="text-purple-700 dark:text-purple-300 text-xs mt-1">
                      Your universal score (0-100) visible to ALL lenders. Based on payment history, vouches, and verification.
                    </p>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    <strong>Tip:</strong> When you apply for a new loan, lenders see your Trust Score. Business relationships are private.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        {trustRecords.length > 0 && (
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
          >
            {showDetails ? <><ChevronUp className="w-4 h-4" />Hide</> : <><ChevronDown className="w-4 h-4" />Show all</>}
          </button>
        )}
      </div>

      {trustRecords.length === 0 ? (
        <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <Building2 className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No business lender history yet</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 mb-4">
            Borrow from a business lender to start building trust
          </p>
          <Link href="/marketplace">
            <Button size="sm" variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Browse Lenders
            </Button>
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-neutral-900 dark:text-white">{totalCount}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">Businesses</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-green-600 dark:text-green-400">{graduatedCount}</p>
              <p className="text-xs text-green-700 dark:text-green-300">Trusted</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{buildingCount}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Building</p>
            </div>
          </div>

          {showDetails && (
            <div className="space-y-2 border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide mb-2">
                Your Business Lenders
              </p>
              
              {trustRecords.map((record) => (
                <div key={record.business_id} className="p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                        {getTrustIcon(record.trust_status)}
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-white text-sm">{record.business_name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getTrustStatusColor(record.trust_status)}`}>
                            {getTrustStatusLabel(record.trust_status)}
                          </span>
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {record.completed_loan_count} loan{record.completed_loan_count !== 1 ? 's' : ''} completed
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">${record.max_amount.toLocaleString()}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400">max available</p>
                      </div>
                      <Link href={`/borrow?business=${record.business_id}&max=${record.max_amount}`}>
                        <Button size="sm" variant="outline" className="whitespace-nowrap">
                          <Plus className="w-3 h-3 mr-1" />Request
                        </Button>
                      </Link>
                    </div>
                  </div>
                  
                  {!record.has_graduated && record.loans_until_graduation > 0 && (
                    <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-neutral-500 dark:text-neutral-400">Progress to Trusted</span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {record.loans_until_graduation} more loan{record.loans_until_graduation !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${((3 - record.loans_until_graduation) / 3) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  
                  {record.has_graduated && (
                    <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                      <CheckCircle className="w-3 h-3" />Full trust unlocked
                    </div>
                  )}
                </div>
              ))}
              
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 mt-4">
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>💡 Tip:</strong> Your Trust Score is visible to all lenders, but business relationships are private. Request loans directly from businesses you have built trust with!
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
