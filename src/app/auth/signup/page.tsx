'use client';

import React, { useState, useEffect, Suspense, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '@/components/ui';
import { signUpSchema, SignUpFormData } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { Building2, User, CheckCircle, Mail, AlertCircle, Loader2 } from 'lucide-react';
import { Footer, Navbar } from '@/components/layout';

// Debounce hook for email validation
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');
  
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  // Email validation states
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [emailValid, setEmailValid] = useState(false);

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
  const email = watch('email');
  const debouncedEmail = useDebounce(email, 500);

  // Check if email exists when user types
  const checkEmailExists = useCallback(async (emailToCheck: string) => {
    if (!emailToCheck || emailToCheck.length < 5 || !emailToCheck.includes('@')) {
      setEmailValid(false);
      setEmailExists(false);
      return;
    }

    setEmailChecking(true);
    try {
      const response = await fetch(`/api/auth/user?email=${encodeURIComponent(emailToCheck)}`);
      const data = await response.json();
      
      setEmailExists(data.exists);
      setEmailValid(!data.exists);
    } catch (err) {
      console.error('Error checking email:', err);
      setEmailValid(true); // Assume valid if check fails
    } finally {
      setEmailChecking(false);
    }
  }, []);

  // Debounced email check
  useEffect(() => {
    if (debouncedEmail) {
      checkEmailExists(debouncedEmail);
    }
  }, [debouncedEmail, checkEmailExists]);

  const onSubmit = async (data: SignUpFormData) => {
    if (emailExists) {
      setError('This email is already registered. Please sign in instead.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = createClient();
      
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            user_type: data.userType,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.');
          setEmailExists(true);
        } else {
          setError(signUpError.message);
        }
        return;
      }

      // Check if email confirmation is required
      if (authData.user && !authData.session) {
        // Email confirmation required
        setUserEmail(data.email);
        setSignupSuccess(true);
        return;
      }

      // If we have a session, create the user record immediately
      if (authData.session) {
        try {
          await fetch('/api/auth/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fullName: data.fullName,
              userType: data.userType,
            }),
          });
        } catch (err) {
          console.error('Error creating user record:', err);
          // Don't fail signup if user record creation fails
        }

        // Redirect based on user type
        if (data.userType === 'business') {
          router.push('/business/setup');
        } else if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.push('/dashboard');
        }
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Success screen after signup (when email confirmation required)
  if (signupSuccess) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <Card className="animate-fade-in bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">
                Check your email
              </h1>
              
              <p className="text-neutral-600 dark:text-neutral-400 mb-6">
                We have sent a confirmation link to:
              </p>
              
              <div className="bg-neutral-100 dark:bg-neutral-800 rounded-lg px-4 py-3 mb-6">
                <p className="font-medium text-neutral-900 dark:text-white">{userEmail}</p>
              </div>
              
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div className="text-left text-sm">
                    <p className="text-blue-800 dark:text-blue-300 font-medium mb-1">What is next?</p>
                    <ol className="text-blue-700 dark:text-blue-400 space-y-1 list-decimal list-inside">
                      <li>Open the email we sent you</li>
                      <li>Click the confirmation link</li>
                      <li>You will be signed in automatically</li>
                    </ol>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-4">
                Did not receive the email? Check your spam folder or{' '}
                <button 
                  onClick={() => {
                    setSignupSuccess(false);
                    setError(null);
                  }}
                  className="text-primary-600 dark:text-primary-400 hover:underline"
                >
                  try again
                </button>
              </p>
              
              <div className="pt-4 border-t border-neutral-200 dark:border-neutral-700">
                <Link 
                  href="/auth/signin"
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  Already confirmed? Sign in
                </Link>
              </div>
            </Card>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="animate-fade-in bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
            <div className="text-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 dark:from-primary-600 dark:to-primary-700 rounded-xl flex items-center justify-center mx-auto mb-4">
                <span className="text-white font-bold text-xl">FZ</span>
              </div>
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">Create your account</h1>
              <p className="text-neutral-500 dark:text-neutral-400 mt-1">Start tracking loans in minutes</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  {error}
                  {emailExists && (
                    <Link 
                      href={redirectUrl ? `/auth/signin?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/signin'}
                      className="block mt-2 font-medium underline"
                    >
                      Sign in instead
                    </Link>
                  )}
                </div>
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

              {/* Email with live validation */}
              <div className="space-y-1">
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="you@example.com"
                    {...register('email')}
                    className={`w-full px-4 py-3 pr-10 rounded-xl border transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0
                      bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white
                      ${emailExists 
                        ? 'border-red-300 dark:border-red-700 focus:border-red-500 focus:ring-red-200 dark:focus:ring-red-800' 
                        : emailValid && email
                          ? 'border-green-300 dark:border-green-700 focus:border-green-500 focus:ring-green-200 dark:focus:ring-green-800'
                          : 'border-neutral-200 dark:border-neutral-700 focus:border-primary-500 focus:ring-primary-200 dark:focus:ring-primary-800'
                      }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {emailChecking && (
                      <Loader2 className="w-5 h-5 text-neutral-400 animate-spin" />
                    )}
                    {!emailChecking && emailExists && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                    {!emailChecking && emailValid && email && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
                {errors.email?.message && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
                {emailExists && !errors.email?.message && (
                  <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
                    This email is already registered.{' '}
                    <Link 
                      href={redirectUrl ? `/auth/signin?redirect=${encodeURIComponent(redirectUrl)}` : '/auth/signin'}
                      className="underline font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                )}
                {emailValid && email && !emailExists && !errors.email?.message && (
                  <p className="text-sm text-green-600 dark:text-green-400">Email available</p>
                )}
              </div>

              <Input
                label="Password"
                type="password"
                placeholder="********"
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

              <Button 
                type="submit" 
                loading={isLoading} 
                disabled={emailExists}
                className="w-full"
              >
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
      <Footer />
    </>
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
