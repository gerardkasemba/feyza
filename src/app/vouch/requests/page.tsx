'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Badge } from '@/components/ui';
import { Navbar, Footer } from '@/components/layout';
import { 
  Award, 
  UserPlus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronRight,
  Send,
  Inbox
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface VouchRequest {
  id: string;
  status: string;
  message: string;
  suggested_relationship: string;
  created_at: string;
  requester?: {
    id: string;
    full_name: string;
  };
  requested_user?: {
    id: string;
    full_name: string;
  };
}

interface Vouch {
  id: string;
  vouch_type: string;
  relationship: string;
  vouch_strength: number;
  trust_score_boost: number;
  status: string;
  created_at: string;
  voucher?: {
    id: string;
    full_name: string;
  };
  vouchee?: {
    id: string;
    full_name: string;
  };
}

export default function VouchRequestsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  
  const [incomingRequests, setIncomingRequests] = useState<VouchRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<VouchRequest[]>([]);
  const [vouchesReceived, setVouchesReceived] = useState<Vouch[]>([]);
  const [vouchesGiven, setVouchesGiven] = useState<Vouch[]>([]);
  
  const [activeTab, setActiveTab] = useState<'incoming' | 'outgoing' | 'received' | 'given'>('incoming');

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        router.push('/auth/signin?redirect=/vouch/requests');
        return;
      }
      
      setUser(authUser);

      // Fetch incoming requests (requests sent to me)
      const { data: incoming } = await supabase
        .from('vouch_requests')
        .select(`
          id,
          status,
          message,
          suggested_relationship,
          created_at,
          requester:users!requester_id(id, full_name)
        `)
        .eq('requested_user_id', authUser.id)
        .order('created_at', { ascending: false });

      // Fetch outgoing requests (requests I sent)
      const { data: outgoing } = await supabase
        .from('vouch_requests')
        .select(`
          id,
          status,
          message,
          suggested_relationship,
          created_at,
          requested_email
        `)
        .eq('requester_id', authUser.id)
        .order('created_at', { ascending: false });

      // Fetch vouches I received
      const { data: received } = await supabase
        .from('vouches')
        .select(`
          id,
          vouch_type,
          relationship,
          vouch_strength,
          trust_score_boost,
          status,
          created_at,
          voucher:users!voucher_id(id, full_name)
        `)
        .eq('vouchee_id', authUser.id)
        .order('created_at', { ascending: false });

      // Fetch vouches I gave
      const { data: given } = await supabase
        .from('vouches')
        .select(`
          id,
          vouch_type,
          relationship,
          vouch_strength,
          trust_score_boost,
          status,
          created_at,
          vouchee:users!vouchee_id(id, full_name)
        `)
        .eq('voucher_id', authUser.id)
        .order('created_at', { ascending: false });

      setIncomingRequests((incoming || []) as unknown as VouchRequest[]);
      setOutgoingRequests((outgoing || []) as unknown as VouchRequest[]);
      setVouchesReceived((received || []) as unknown as Vouch[]);
      setVouchesGiven((given || []) as unknown as Vouch[]);
      
      setLoading(false);
    };

    fetchData();
  }, [router]);

  const pendingIncoming = incomingRequests.filter(r => r.status === 'pending');

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
                <Award className="w-8 h-8 text-purple-500" />
                Vouches & Requests
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-1">
                Manage your vouch requests and see who trusts you
              </p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Pending Alert */}
          {pendingIncoming.length > 0 && (
            <div className="mb-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center">
                  <Inbox className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900 dark:text-purple-100">
                    You have {pendingIncoming.length} pending vouch request{pendingIncoming.length !== 1 ? 's' : ''}
                  </p>
                  <p className="text-sm text-purple-700 dark:text-purple-300">
                    Review and respond to help build trust
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => setActiveTab('incoming')}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Review
              </Button>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            {[
              { key: 'incoming', label: 'Incoming Requests', count: pendingIncoming.length, icon: Inbox },
              { key: 'outgoing', label: 'Sent Requests', count: outgoingRequests.filter(r => r.status === 'pending').length, icon: Send },
              { key: 'received', label: 'Vouches Received', count: vouchesReceived.length, icon: Award },
              { key: 'given', label: 'Vouches Given', count: vouchesGiven.length, icon: UserPlus },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? 'bg-purple-600 text-white'
                    : 'bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    activeTab === tab.key
                      ? 'bg-white/20'
                      : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <Card>
            {/* Incoming Requests */}
            {activeTab === 'incoming' && (
              <div className="space-y-4">
                {incomingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Inbox className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">No incoming vouch requests</p>
                  </div>
                ) : (
                  incomingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-300 font-semibold">
                          {(request.requester as any)?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {(request.requester as any)?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={request.status === 'pending' ? 'warning' : request.status === 'accepted' ? 'success' : 'default'}>
                          {request.status}
                        </Badge>
                        {request.status === 'pending' && (
                          <Button size="sm" variant="outline">
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Outgoing Requests */}
            {activeTab === 'outgoing' && (
              <div className="space-y-4">
                {outgoingRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">No sent vouch requests</p>
                    <Link href="/dashboard">
                      <Button variant="outline" size="sm" className="mt-4">
                        Request a Vouch
                      </Button>
                    </Link>
                  </div>
                ) : (
                  outgoingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-200 dark:bg-blue-800 rounded-full flex items-center justify-center text-blue-700 dark:text-blue-300">
                          <Send className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {(request as any).requested_email || 'User'}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">
                            Sent {new Date(request.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Badge variant={
                        request.status === 'pending' ? 'warning' : 
                        request.status === 'accepted' ? 'success' : 
                        'default'
                      }>
                        {request.status === 'pending' ? 'Awaiting response' : request.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Vouches Received */}
            {activeTab === 'received' && (
              <div className="space-y-4">
                {vouchesReceived.length === 0 ? (
                  <div className="text-center py-12">
                    <Award className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">No vouches received yet</p>
                    <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
                      Ask friends and family to vouch for you
                    </p>
                  </div>
                ) : (
                  vouchesReceived.map((vouch) => (
                    <div
                      key={vouch.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center text-green-700 dark:text-green-300 font-semibold">
                          {(vouch.voucher as any)?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {(vouch.voucher as any)?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                            {vouch.relationship} • Strength: {vouch.vouch_strength}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="success">+{vouch.trust_score_boost} pts</Badge>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {new Date(vouch.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Vouches Given */}
            {activeTab === 'given' && (
              <div className="space-y-4">
                {vouchesGiven.length === 0 ? (
                  <div className="text-center py-12">
                    <UserPlus className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-3" />
                    <p className="text-neutral-500 dark:text-neutral-400">You haven't vouched for anyone yet</p>
                  </div>
                ) : (
                  vouchesGiven.map((vouch) => (
                    <div
                      key={vouch.id}
                      className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-200 dark:bg-purple-800 rounded-full flex items-center justify-center text-purple-700 dark:text-purple-300 font-semibold">
                          {(vouch.vouchee as any)?.full_name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-white">
                            {(vouch.vouchee as any)?.full_name || 'Unknown'}
                          </p>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400 capitalize">
                            {vouch.relationship} • {vouch.vouch_type}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={vouch.status === 'active' ? 'success' : 'default'}>
                          {vouch.status}
                        </Badge>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                          {new Date(vouch.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
      <Footer />
    </>
  );
}
