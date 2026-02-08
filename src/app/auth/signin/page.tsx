'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '@/components/ui';
import { signInSchema, SignInFormData } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, ArrowRight, Loader2 } from 'lucide-react';

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  const lenderSlug = searchParams.get('lender');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(!!lenderSlug);
  const [lenderInfo, setLenderInfo] = useState<{ name: string; slug: string } | null>(null);

  // If lender param exists, check if user is logged in and redirect appropriately
  useEffect(() => {
    if (!lenderSlug) return;

    const checkAuthAndRedirect = async () => {
      const supabase = createClient();
      
      // Fetch lender info
      const { data: lender } = await supabase
        .from('business_profiles')
        .select('business_name, slug')
        .eq('slug', lenderSlug)
        .eq('public_profile_enabled', true)
        .eq('verification_status', 'approved')
        .single();

      if (lender) {
        setLenderInfo({ name: lender.business_name, slug: lender.slug });
      }

      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // User is logged in - check verification status
        const { data: profile } = await supabase
          .from('users')
          .select('is_verified')
          .eq('id', user.id)
          .single();

        if (profile?.is_verified) {
          // Verified user - redirect to loan form with lender pre-selected
          router.push(`/loans/new?lender=${lenderSlug}`);
        } else {
          // Not verified - redirect to apply flow
          router.push(`/apply/${lenderSlug}`);
        }
      } else {
        // Not logged in - show option to go to apply page
        setCheckingAuth(false);
      }
    };

    checkAuthAndRedirect();
  }, [lenderSlug, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // If lender param exists, redirect to apply flow or loan form
      if (lenderSlug) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('users')
            .select('is_verified')
            .eq('id', user.id)
            .single();

          if (profile?.is_verified) {
            router.push(`/loans/new?lender=${lenderSlug}`);
          } else {
            router.push(`/apply/${lenderSlug}`);
          }
          router.refresh();
          return;
        }
      }

      // Redirect to the specified URL or dashboard
      router.push(redirectUrl || '/dashboard');
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Pass redirect to signup link if present
  const signupHref = lenderSlug
    ? `/apply/${lenderSlug}`
    : redirectUrl 
    ? `/auth/signup?redirect=${encodeURIComponent(redirectUrl)}`
    : '/auth/signup';
  
  // Show loading while checking auth for lender redirect
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400">Checking your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="animate-fade-in bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-xl dark:shadow-neutral-950/50">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">FZ</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">Welcome back</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Sign in to your Feyza account</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Lender info card when coming from a lender link */}
          {lenderInfo && (
            <div className="mb-6">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800 dark:text-green-300">
                      Apply with {lenderInfo.name}
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-400">
                      Sign in to continue your application
                    </p>
                  </div>
                </div>
              </div>
              
              <Link href={`/apply/${lenderInfo.slug}`}>
                <Button 
                  variant="outline" 
                  className="w-full mb-4 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20"
                >
                  New here? Start your application
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
              
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-neutral-200 dark:border-neutral-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-neutral-900 text-neutral-500">
                    or sign in below
                  </span>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              error={errors.email?.message}
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white placeholder:text-neutral-400 dark:placeholder:text-neutral-500 focus:border-primary-500 dark:focus:border-primary-400 focus:ring-primary-500 dark:focus:ring-primary-400"
            />

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800"
                />
                <span className="text-neutral-600 dark:text-neutral-400">Remember me</span>
              </label>
              <Link
                href="/auth/forgot-password"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              Sign In
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
            Don't have an account?{' '}
            <Link 
              href={signupHref} 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Sign up
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}