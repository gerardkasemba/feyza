'use client';

import React, { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@/components/ui';
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
  Building2
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
}

interface BorrowerTrustCardProps {
  userId: string;
}

export function BorrowerTrustCard({ userId }: BorrowerTrustCardProps) {
  const [trustRecords, setTrustRecords] = useState<BusinessTrust[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
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
        return 'Building Trust';
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

  if (loading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      </Card>
    );
  }

  // Count graduated vs building
  const graduatedCount = trustRecords.filter(r => r.has_graduated).length;
  const buildingCount = trustRecords.filter(r => r.trust_status === 'building').length;

  return (
    <Card>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-neutral-900 dark:text-white">Your Trust Level</h3>
          <div className="relative">
            <button
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            >
              <HelpCircle className="w-4 h-4 text-neutral-400" />
            </button>
            
            {/* Tooltip */}
            {showTooltip && (
              <div className="absolute left-0 top-8 z-50 w-72 p-4 bg-white dark:bg-neutral-800 rounded-xl shadow-lg border border-neutral-200 dark:border-neutral-700">
                <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">How Trust Works</h4>
                <p className="text-sm text-neutral-600 dark:text-neutral-300 mb-3">
                  Business lenders use a graduated trust system. New borrowers start with lower loan limits and can unlock higher amounts by building a good repayment history.
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-neutral-400"></div>
                    <span className="text-neutral-600 dark:text-neutral-300"><strong>New:</strong> First loan with a lender</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-neutral-600 dark:text-neutral-300"><strong>Building:</strong> 1-2 loans completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-neutral-600 dark:text-neutral-300"><strong>Trusted:</strong> 3+ loans, full access</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1"
        >
          {showDetails ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Show details
            </>
          )}
        </button>
      </div>

      {trustRecords.length === 0 ? (
        <div className="text-center py-6 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
          <Shield className="w-8 h-8 text-neutral-300 dark:text-neutral-600 mx-auto mb-2" />
          <p className="text-sm text-neutral-500 dark:text-neutral-400">No business lender history yet</p>
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            When you borrow from a business, your trust level will appear here
          </p>
        </div>
      ) : (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{graduatedCount}</p>
              <p className="text-xs text-green-700 dark:text-green-300">Trusted Status</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{buildingCount}</p>
              <p className="text-xs text-blue-700 dark:text-blue-300">Building Trust</p>
            </div>
          </div>

          {/* Details */}
          {showDetails && (
            <div className="space-y-3 border-t border-neutral-200 dark:border-neutral-700 pt-4">
              <p className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">
                Trust by Business
              </p>
              {trustRecords.map((record) => (
                <div 
                  key={record.business_id}
                  className="flex items-center justify-between p-3 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div>
                      <p className="font-medium text-neutral-900 dark:text-white text-sm">
                        {record.business_name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getTrustStatusColor(record.trust_status)}`}>
                          {getTrustStatusLabel(record.trust_status)}
                        </span>
                        {record.has_graduated ? (
                          <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Max: ${record.standard_max_amount.toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">
                            {record.loans_until_graduation} loan{record.loans_until_graduation !== 1 ? 's' : ''} to upgrade
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                      ${record.max_amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">max loan</p>
                  </div>
                </div>
              ))}
              
              {/* Tips to increase trust */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mt-4">
                <h4 className="font-semibold text-blue-800 dark:text-blue-200 text-sm mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  How to Increase Your Trust Level
                </h4>
                <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                  <li>• Complete 3 loans with a business to become "Trusted"</li>
                  <li>• Make all payments on time</li>
                  <li>• Start with smaller loans to build your history</li>
                  <li>• Trusted status unlocks higher loan amounts</li>
                </ul>
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  );
}
