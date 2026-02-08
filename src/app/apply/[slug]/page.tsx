'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import GuestLoanRequestForm from '@/components/loans/GuestLoanRequestForm';
import { Card } from '@/components/ui';
import { Building2, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface BusinessLender {
  id: string;
  business_name: string;
  business_slug: string;
  logo_url?: string;
  description?: string;
  is_verified: boolean;
  is_active: boolean;
}

export default function ApplyPage() {
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
          .from('users')
          .select('id, business_name, business_slug, logo_url, description, is_verified, is_active')
          .eq('business_slug', slug)
          .eq('is_business', true)
          .single();

        if (fetchError || !data) {
          setError('Business lender not found');
        } else if (!data.is_active) {
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
          <Link href="/" className="text-primary-600 hover:text-primary-700 font-medium">
            ← Go to homepage
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
                <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">{business.business_name}</h1>
                <p className="text-neutral-500 dark:text-neutral-400">Apply for a loan</p>
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

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Card className="p-6 md:p-8">
          <GuestLoanRequestForm 
            businessSlug={business?.business_slug || null}
            businessLenderId={business?.id || null}
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
