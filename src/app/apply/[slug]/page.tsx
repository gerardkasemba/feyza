'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GuestLoanRequestForm from '@/components/loans/GuestLoanRequestForm';
import { Card } from '@/components/ui';
import { Building2, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import Link from 'next/link';

interface BusinessLender {
  id: string;
  business_name: string;
  slug: string;
  logo_url?: string;
  description?: string;
  tagline?: string;
  is_verified: boolean;
  verification_status: string;
  default_interest_rate: number;
  interest_type: string;
  first_time_borrower_amount: number;
  min_loan_amount: number | null;
  max_loan_amount: number | null;
}

export default function ApplyWithSlugPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const supabase = createClient();

  const [business, setBusiness] = useState<BusinessLender | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBusiness = async () => {
      if (!slug) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('business_profiles')
          .select(`
            id, 
            business_name, 
            slug, 
            logo_url, 
            description, 
            tagline,
            is_verified, 
            verification_status,
            default_interest_rate,
            interest_type,
            first_time_borrower_amount,
            min_loan_amount,
            max_loan_amount
          `)
          .eq('slug', slug)
          .single();

        if (fetchError || !data) {
          console.error('Business fetch error:', fetchError);
          setError('Business lender not found');
        } else if (data.verification_status !== 'approved') {
          setError('This lender is not currently accepting applications');
        } else {
          setBusiness(data);
        }
      } catch (err) {
        console.error('Error fetching business:', err);
        setError('Failed to load lender information');
      } finally {
        setLoading(false);
      }
    };

    fetchBusiness();
  }, [slug, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">{error}</h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            The lender you're looking for may not exist or is no longer accepting applications.
          </p>
          <Link href="/apply" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Apply without a specific lender
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900">
      {/* Header */}
      <div className="bg-white dark:bg-neutral-800 border-b border-neutral-200 dark:border-neutral-700">
        <div className="max-w-3xl mx-auto px-4 py-6">
          {business ? (
            <div className="flex items-center gap-4">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.business_name} className="w-16 h-16 rounded-xl object-cover" />
              ) : (
                <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-600" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{business.business_name}</h1>
                  {business.is_verified && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <p className="text-neutral-500 dark:text-neutral-400">
                  {business.tagline || 'Apply for a loan'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Apply for a Loan</h1>
              <p className="text-neutral-500 dark:text-neutral-400">Get started with your loan application</p>
            </div>
          )}
        </div>
      </div>

      {/* Lender Info Card */}
      {business && (
        <div className="max-w-3xl mx-auto px-4 pt-6">
          <Card className="p-4 bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-800">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <span className="text-primary-600 dark:text-primary-400">Interest Rate:</span>
                <span className="ml-1 font-medium text-neutral-900 dark:text-white">
                  {business.default_interest_rate}% {business.interest_type}
                </span>
              </div>
              <div>
                <span className="text-primary-600 dark:text-primary-400">First-Time Limit:</span>
                <span className="ml-1 font-medium text-neutral-900 dark:text-white">
                  ${business.first_time_borrower_amount?.toLocaleString() || '50'}
                </span>
              </div>
              {business.max_loan_amount && (
                <div>
                  <span className="text-primary-600 dark:text-primary-400">Max Loan:</span>
                  <span className="ml-1 font-medium text-neutral-900 dark:text-white">
                    ${business.max_loan_amount.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card className="p-6 md:p-8">
          <GuestLoanRequestForm 
            businessSlug={business?.slug || null}
            businessLenderId={business?.id || null}
            businessName={business?.business_name || null}
            businessInterestRate={business?.default_interest_rate || null}
            businessInterestType={business?.interest_type as 'simple' | 'compound' | null || null}
            businessFirstTimeLimit={business?.first_time_borrower_amount || null}
            businessMaxLoanAmount={business?.max_loan_amount || null}
          />
        </Card>
      </div>

      {/* Footer */}
      <div className="max-w-3xl mx-auto px-4 pb-8">
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-400">
          By applying, you agree to our{' '}
          <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
