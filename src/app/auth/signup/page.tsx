'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '@/components/ui';
import { signUpSchema, SignUpFormData } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, User } from 'lucide-react';

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      userType: 'individual',
    },
  });

  const userType = watch('userType');

  const onSubmit = async (data: SignUpFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: data.userType,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Redirect based on user type, or to redirect URL if provided
      if (data.userType === 'business') {
        router.push('/business/setup');
      } else if (redirectUrl) {
        router.push(redirectUrl);
      } else {
        router.push('/dashboard');
      }
      router.refresh();
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

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

        <Card className="animate-fade-in bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">FZ</span>
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">Create your account</h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-1">Start tracking loans in minutes</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Account Type</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setValue('userType', 'individual')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    userType === 'individual'
                      ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium">Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('userType', 'business')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    userType === 'business'
                      ? 'border-primary-500 dark:border-primary-400 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600 bg-white dark:bg-neutral-800'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium">Business</span>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              {...register('fullName')}
              error={errors.fullName?.message}
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              error={errors.email?.message}
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              helperText="At least 8 characters"
              className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white"
            />

            <div className="text-sm text-neutral-500 dark:text-neutral-400">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-primary-600 dark:text-primary-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-primary-600 dark:text-primary-400 hover:underline">
                Privacy Policy
              </Link>
            </div>

            <Button type="submit" loading={isLoading} className="w-full">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
            Already have an account?{' '}
            <Link 
              href={redirectUrl ? `/auth/signin?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/signin'} 
              className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
            >
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    }>
      <SignUpContent />
    </Suspense>
  );
}