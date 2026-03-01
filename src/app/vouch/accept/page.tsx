'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('page');

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { 
  Award, 
  User, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle,
  Shield,
  Users,
  Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VouchRequest {
  id: string;
  requester_id: string;
  message: string;
  suggested_relationship: string;
  status: string;
  requester: {
    id: string;
    full_name: string;
    email: string;
  };
}

function VouchAcceptContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [request, setRequest] = useState<VouchRequest | null>(null);
  const [user, setUser] = useState<any>(null);

  // Form state
  const [vouchType, setVouchType] = useState('character');
  const [relationship, setRelationship] = useState('friend');
  const [relationshipDetails, setRelationshipDetails] = useState('');
  const [knownYears, setKnownYears] = useState(1);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRequest = async () => {
      if (!token) {
        setError('Invalid or missing token');
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        // Check if user is logged in
        const { data: { user: authUser } } = await supabase.auth.getUser();
        setUser(authUser);

        // Fetch vouch request by token using API (bypasses RLS)
        const response = await fetch(`/api/vouches/request?token=${encodeURIComponent(token)}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || 'Vouch request not found');
          setLoading(false);
          return;
        }

        setRequest(data.request as VouchRequest);
        if (data.request.suggested_relationship) {
          setRelationship(data.request.suggested_relationship);
        }
      } catch (err) {
        log.error('Error fetching vouch request:', err);
        setError('Failed to load vouch request');
      } finally {
        setLoading(false);
      }
    };

    fetchRequest();
  }, [token]);

  const handleSubmitVouch = async () => {
    if (!user) {
      // Redirect to sign in with return URL
      router.push(`/auth/signin?redirect=${encodeURIComponent(`/vouch/accept?token=${token}`)}`);
      return;
    }

    if (!request) return;

    // Can't vouch for yourself
    if (user.id === request.requester_id) {
      setError("You can't vouch for yourself");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'accept',
          requestId: request.id,
          vouch_type: vouchType,
          relationship,
          relationship_details: relationshipDetails,
          known_years: knownYears,
          message,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create vouch');
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to submit vouch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!user || !request) return;

    setSubmitting(true);
    try {
      await fetch('/api/vouches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline',
          requestId: request.id,
          reason: 'Declined by user',
        }),
      });

      router.push('/dashboard');
    } catch (err) {
      log.error('Error declining:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-primary-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-neutral-600 dark:text-neutral-400">Loading vouch request...</p>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Error state
  if (error && !request) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-primary-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Request Not Found
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              {error}
            </p>
            <Link href="/dashboard">
              <Button variant="outline">Go to Dashboard</Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Success state
  if (success) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-primary-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h1 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">
              Vouch Created! 🎉
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              You've vouched for {request?.requester?.full_name}. Your vouch will help boost their Trust Score.
            </p>
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 mb-6 text-left">
              <p className="text-sm text-purple-700 dark:text-purple-300">
                <strong>What happens now:</strong>
              </p>
              <ul className="text-sm text-purple-600 dark:text-purple-400 mt-2 space-y-1">
                <li>• {request?.requester?.full_name?.split(' ')[0]}'s Trust Score increases</li>
                <li>• Your vouch appears on their profile</li>
                <li>• If they default on a loan, your score may be affected</li>
              </ul>
            </div>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </Card>
        </div>
        <Footer />
      </>
    );
  }

  // Main vouch form
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-primary-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 py-12 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">
              Someone Needs Your Vouch
            </h1>
            <p className="text-neutral-600 dark:text-neutral-400">
              Help build trust in your community
            </p>
          </div>

          <Card>
            {/* Requester Info */}
            <div className="flex items-center gap-4 p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl mb-6">
              <div className="w-14 h-14 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold text-xl">
                {request?.requester?.full_name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-semibold text-neutral-900 dark:text-white">
                  {request?.requester?.full_name}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  is asking you to vouch for them
                </p>
              </div>
            </div>

            {/* Their message */}
            {request?.message && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <p className="text-sm text-blue-700 dark:text-blue-300 italic">
                  "{request.message}"
                </p>
              </div>
            )}

            {/* Warning */}
            <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800 dark:text-amber-300">
                  <p className="font-medium mb-1">Before you vouch</p>
                  <p>Only vouch for people you truly know and trust. If they default on a loan, your Trust Score may be affected.</p>
                </div>
              </div>
            </div>

            {/* Not logged in */}
            {!user && (
              <div className="mb-6 p-4 bg-neutral-100 dark:bg-neutral-800 rounded-xl text-center">
                <p className="text-neutral-600 dark:text-neutral-400 mb-3">
                  You need to sign in to vouch for someone
                </p>
                <div className="flex gap-3 justify-center">
                  <Link href={`/auth/signin?redirect=${encodeURIComponent(`/vouch/accept?token=${token}`)}`}>
                    <Button>Sign In</Button>
                  </Link>
                  <Link href={`/auth/signup?redirect=${encodeURIComponent(`/vouch/accept?token=${token}`)}`}>
                    <Button variant="outline">Create Account</Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Vouch Form */}
            {user && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Your relationship with {request?.requester?.full_name?.split(' ')[0]}
                  </label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value="family">Family</option>
                    <option value="friend">Friend</option>
                    <option value="colleague">Colleague</option>
                    <option value="neighbor">Neighbor</option>
                    <option value="business">Business Associate</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    More specific (optional)
                  </label>
                  <input
                    type="text"
                    value={relationshipDetails}
                    onChange={(e) => setRelationshipDetails(e.target.value)}
                    placeholder="e.g., college roommate, sister, manager"
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    How long have you known them?
                  </label>
                  <select
                    value={knownYears}
                    onChange={(e) => setKnownYears(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
                  >
                    <option value={1}>Less than 1 year</option>
                    <option value={2}>1-2 years</option>
                    <option value={3}>2-3 years</option>
                    <option value={5}>3-5 years</option>
                    <option value={7}>5-7 years</option>
                    <option value={10}>7-10 years</option>
                    <option value={15}>10+ years</option>
                    <option value={20}>20+ years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Your message (optional)
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={`Why do you trust ${request?.requester?.full_name?.split(' ')[0]}?`}
                    rows={3}
                    className="w-full px-4 py-3 border border-neutral-300 dark:border-neutral-600 rounded-xl bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white resize-none"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleDecline}
                    disabled={submitting}
                    className="flex-1"
                  >
                    Decline
                  </Button>
                  <Button
                    onClick={handleSubmitVouch}
                    disabled={submitting}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4 mr-2" />
                        Vouch for {request?.requester?.full_name?.split(' ')[0]}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          {/* What is vouching */}
          <div className="mt-8 text-center">
            <h3 className="font-semibold text-neutral-900 dark:text-white mb-3">
              What is vouching?
            </h3>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <Users className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  A vouch is your statement of trust in someone you know
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <Shield className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  It helps them get approved for loans by boosting their Trust Score
                </p>
              </div>
              <div className="p-4 bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700">
                <Award className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-neutral-600 dark:text-neutral-400">
                  Your reputation is linked to theirs - only vouch for trusted people
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}

export default function VouchAcceptPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    }>
      <VouchAcceptContent />
    </Suspense>
  );
}
