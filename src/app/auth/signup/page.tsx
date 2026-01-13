'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Card } from '@/components/ui';
import { signUpSchema, SignUpFormData } from '@/lib/validations';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, Building2, User, Mail, CheckCircle, Inbox, AlertCircle, RefreshCw } from 'lucide-react';

export default function SignUpPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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

      // Show success message
      setUserEmail(data.email);
      setIsSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: userEmail,
      });
      
      if (error) {
        setError(error.message);
      } else {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 5000);
      }
    } catch (err) {
      setError('Failed to resend email');
    } finally {
      setResendLoading(false);
    }
  };

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="animate-fade-in text-center">
            {/* Success Icon */}
            <div className="relative mx-auto w-20 h-20 mb-6">
              <div className="absolute inset-0 bg-green-100 dark:bg-green-900/30 rounded-full animate-ping opacity-25" />
              <div className="relative w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full flex items-center justify-center border-4 border-white dark:border-neutral-900">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Success Message */}
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Check Your Email
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We've sent a confirmation link to
            </p>
            
            {/* Email Display */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-full mb-6">
              <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-medium text-green-700 dark:text-green-400">{userEmail}</span>
            </div>

            {/* Instructions */}
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-xl p-4 mb-6 text-left">
              <h3 className="font-semibold text-neutral-900 dark:text-white mb-3 flex items-center gap-2">
                <Inbox className="w-4 h-4" />
                Next Steps
              </h3>
              <ol className="space-y-3 text-sm text-neutral-600 dark:text-neutral-400">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">1</span>
                  <span>Open your email inbox</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">2</span>
                  <span>Look for an email from <strong className="text-neutral-900 dark:text-white">Feyza</strong></span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">3</span>
                  <span>Click the confirmation link to activate your account</span>
                </li>
              </ol>
            </div>

            {/* Spam Warning */}
            <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl mb-6 text-left">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Can't find the email?
                </p>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Check your <strong>spam</strong> or <strong>junk</strong> folder. Sometimes confirmation emails end up there.
                </p>
              </div>
            </div>

            {/* Resend Button */}
            <div className="space-y-3">
              {resendSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Email sent! Check your inbox.
                </div>
              )}
              
              <Button
                variant="outline"
                onClick={handleResendEmail}
                disabled={resendLoading}
                className="w-full"
              >
                {resendLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Resend Confirmation Email
                  </>
                )}
              </Button>

              <Link href="/auth/signin" className="block">
                <Button variant="ghost" className="w-full text-neutral-600 dark:text-neutral-400">
                  Back to Sign In
                </Button>
              </Link>
            </div>

            {/* Help Text */}
            <p className="text-xs text-neutral-500 dark:text-neutral-500 mt-6">
              Having trouble? Contact us at{' '}
              <a href="mailto:support@feyza.com" className="text-green-600 dark:text-green-400 hover:underline">
                support@feyza.com
              </a>
            </p>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 hover:text-neutral-700 dark:hover:text-neutral-300 mb-6 sm:mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </Link>

        <Card className="animate-fade-in">
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-xl">F</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white">Create your account</h1>
            <p className="text-sm sm:text-base text-neutral-500 dark:text-neutral-400 mt-1">Start tracking loans in minutes</p>
          </div>

          {error && (
            <div className="mb-6 p-3 sm:p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-400 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Account Type Selection */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Account Type</label>
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setValue('userType', 'individual')}
                  className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    userType === 'individual'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <User className="w-5 h-5" />
                  <span className="font-medium text-sm sm:text-base">Individual</span>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('userType', 'business')}
                  className={`flex items-center justify-center gap-2 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    userType === 'business'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                      : 'border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300 dark:hover:border-neutral-600'
                  }`}
                >
                  <Building2 className="w-5 h-5" />
                  <span className="font-medium text-sm sm:text-base">Business</span>
                </button>
              </div>
            </div>

            <Input
              label="Full Name"
              type="text"
              placeholder="John Doe"
              {...register('fullName')}
              error={errors.fullName?.message}
            />

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              {...register('email')}
              error={errors.email?.message}
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              {...register('password')}
              error={errors.password?.message}
              helperText="At least 8 characters"
            />

            <div className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              By signing up, you agree to our{' '}
              <Link href="/terms" className="text-green-600 dark:text-green-400 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-green-600 dark:text-green-400 hover:underline">
                Privacy Policy
              </Link>
            </div>

            <Button type="submit" loading={isLoading} className="w-full bg-green-600 hover:bg-green-700">
              Create Account
            </Button>
          </form>

          <p className="text-center text-sm text-neutral-500 dark:text-neutral-400 mt-6">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium">
              Sign in
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}