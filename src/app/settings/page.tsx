'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  User, Bell, Shield, LogOut, CreditCard, CheckCircle, 
  AlertCircle, ExternalLink, Wallet, Key, Eye, EyeOff, Globe 
} from 'lucide-react';

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get('tab') || 'profile';
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Form state
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [reminderDays, setReminderDays] = useState('3');
  const [timezone, setTimezone] = useState('America/New_York');
  
  // Payment methods state
  const [paypalEmail, setPaypalEmail] = useState('');
  const [cashappUsername, setCashappUsername] = useState('');
  const [venmoUsername, setVenmoUsername] = useState('');
  const [preferredPaymentMethod, setPreferredPaymentMethod] = useState<'paypal' | 'cashapp' | 'venmo' | ''>('');
  const [savingPayPal, setSavingPayPal] = useState(false);
  const [savingPaymentMethods, setSavingPaymentMethods] = useState(false);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/signin');
        return;
      }
      setUser(user);

      try {
        const { data: profileData } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || '');
          setPhone(profileData.phone || '');
          setPaypalEmail(profileData.paypal_email || '');
          setCashappUsername(profileData.cashapp_username || '');
          setVenmoUsername(profileData.venmo_username || '');
          setPreferredPaymentMethod(profileData.preferred_payment_method || '');
          setEmailNotifications(profileData.email_reminders !== false);
          setReminderDays(String(profileData.reminder_days_before || 3));
          setTimezone(profileData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        } else {
          setFullName(user.user_metadata?.full_name || '');
          // Set default timezone based on browser
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      } catch (error) {
        console.log('Error fetching profile');
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

  // Set active tab from URL
  useEffect(() => {
    if (initialTab === 'payments') {
      setActiveTab('payments');
    }
  }, [initialTab]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: fullName,
          phone: phone,
          email_reminders: emailNotifications,
          reminder_days_before: parseInt(reminderDays),
          timezone: timezone,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleConnectPayPal = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paypalEmail || !paypalEmail.includes('@')) {
      setMessage({ type: 'error', text: 'Please enter a valid PayPal email address' });
      return;
    }

    setSavingPayPal(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({
          paypal_email: paypalEmail,
          paypal_connected: true,
          paypal_connected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, paypal_email: paypalEmail, paypal_connected: true });
      setMessage({ type: 'success', text: 'PayPal connected successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to connect PayPal' });
    } finally {
      setSavingPayPal(false);
    }
  };

  const handleDisconnectPayPal = async () => {
    if (!confirm('Are you sure you want to disconnect PayPal?')) return;

    setSavingPayPal(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({
          paypal_email: null,
          paypal_connected: false,
          paypal_connected_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setProfile({ ...profile, paypal_email: null, paypal_connected: false });
      setPaypalEmail('');
      setMessage({ type: 'success', text: 'PayPal disconnected' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to disconnect PayPal' });
    } finally {
      setSavingPayPal(false);
    }
  };

  const handleSavePaymentMethods = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPaymentMethods(true);
    setMessage(null);

    // Format usernames
    let formattedCashapp = cashappUsername.trim();
    if (formattedCashapp && !formattedCashapp.startsWith('$')) {
      formattedCashapp = '$' + formattedCashapp;
    }

    let formattedVenmo = venmoUsername.trim();
    if (formattedVenmo && !formattedVenmo.startsWith('@')) {
      formattedVenmo = '@' + formattedVenmo;
    }

    // Validate preferred method has the corresponding account set up
    if (preferredPaymentMethod === 'paypal' && !profile?.paypal_email) {
      setMessage({ type: 'error', text: 'Please connect PayPal first before selecting it as preferred' });
      setSavingPaymentMethods(false);
      return;
    }
    if (preferredPaymentMethod === 'cashapp' && !formattedCashapp) {
      setMessage({ type: 'error', text: 'Please enter your Cash App username first' });
      setSavingPaymentMethods(false);
      return;
    }
    if (preferredPaymentMethod === 'venmo' && !formattedVenmo) {
      setMessage({ type: 'error', text: 'Please enter your Venmo username first' });
      setSavingPaymentMethods(false);
      return;
    }

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({
          cashapp_username: formattedCashapp || null,
          venmo_username: formattedVenmo || null,
          preferred_payment_method: preferredPaymentMethod || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;

      setCashappUsername(formattedCashapp);
      setVenmoUsername(formattedVenmo);
      setProfile({ 
        ...profile, 
        cashapp_username: formattedCashapp, 
        venmo_username: formattedVenmo,
        preferred_payment_method: preferredPaymentMethod 
      });
      setMessage({ type: 'success', text: 'Payment methods saved!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save payment methods' });
    } finally {
      setSavingPaymentMethods(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setChangingPassword(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  const userProfile = profile || {
    id: user?.id,
    email: user?.email || '',
    full_name: user?.user_metadata?.full_name || 'User',
    user_type: user?.user_metadata?.user_type || 'individual',
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      <Navbar user={userProfile} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-display font-bold text-neutral-900 mb-8">Settings</h1>

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 border border-green-200 text-green-700' 
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
              )}
              {message.text}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar Tabs */}
            <div className="md:w-48 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 text-primary-700 font-medium'
                        : 'text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-primary-100 rounded-xl">
                      <User className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900">Profile Information</h2>
                      <p className="text-sm text-neutral-500">Update your personal details</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <Input
                      label="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="John Doe"
                    />
                    
                    <Input
                      label="Email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 234 567 8900"
                    />

                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Payments Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  {/* PayPal Connection */}
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-blue-100 rounded-xl">
                        <Wallet className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">PayPal Connection</h2>
                        <p className="text-sm text-neutral-500">Connect PayPal to send and receive payments</p>
                      </div>
                    </div>

                    {profile?.paypal_connected ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                          <div className="flex-1">
                            <p className="font-medium text-green-800">PayPal Connected</p>
                            <p className="text-sm text-green-700">{profile.paypal_email}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-neutral-500">
                              Connected on {new Date(profile.paypal_connected_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={handleDisconnectPayPal}
                            loading={savingPayPal}
                            className="text-red-600 border-red-300 hover:bg-red-50"
                          >
                            Disconnect
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <form onSubmit={handleConnectPayPal} className="space-y-4">
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                          <div className="flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-yellow-800">PayPal Required</p>
                              <p className="text-sm text-yellow-700">
                                You need to connect PayPal to create loan requests and receive payments.
                              </p>
                            </div>
                          </div>
                        </div>

                        <Input
                          label="PayPal Email Address"
                          type="email"
                          value={paypalEmail}
                          onChange={(e) => setPaypalEmail(e.target.value)}
                          placeholder="your@paypal.com"
                          helperText="Enter the email address associated with your PayPal account"
                        />

                        <div className="bg-neutral-50 rounded-xl p-4">
                          <h4 className="font-medium text-neutral-900 mb-2">How it works:</h4>
                          <ul className="text-sm text-neutral-600 space-y-1">
                            <li>• As a <strong>borrower</strong>: Payments are automatically sent from your PayPal</li>
                            <li>• As a <strong>lender</strong>: Repayments are received directly to your PayPal</li>
                            <li>• You'll receive email confirmations for all transactions</li>
                          </ul>
                        </div>

                        <div className="flex justify-end">
                          <Button type="submit" loading={savingPayPal}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            Connect PayPal
                          </Button>
                        </div>
                      </form>
                    )}
                  </Card>

                  {/* Cash App & Venmo */}
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <Wallet className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">Payment Methods</h2>
                        <p className="text-sm text-neutral-500">Set up how others can pay you</p>
                      </div>
                    </div>

                    <form onSubmit={handleSavePaymentMethods} className="space-y-6">
                      {/* Payment Method Inputs */}
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Cash App Username
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-600 font-medium">$</span>
                            <input
                              type="text"
                              value={cashappUsername.replace('$', '')}
                              onChange={(e) => setCashappUsername(e.target.value.replace('$', ''))}
                              placeholder="yourname"
                              className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-neutral-700 mb-1">
                            Venmo Username
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600 font-medium">@</span>
                            <input
                              type="text"
                              value={venmoUsername.replace('@', '')}
                              onChange={(e) => setVenmoUsername(e.target.value.replace('@', ''))}
                              placeholder="yourname"
                              className="w-full pl-8 pr-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Preferred Payment Method Selector */}
                      <div className="border-t border-neutral-200 pt-6">
                        <label className="block text-sm font-medium text-neutral-700 mb-3">
                          Preferred Payment Method ⭐
                        </label>
                        <p className="text-sm text-neutral-500 mb-4">
                          This is what others will see when they need to pay you
                        </p>
                        
                        <div className="grid grid-cols-3 gap-3">
                          {/* PayPal Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('paypal')}
                            disabled={!profile?.paypal_email}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'paypal'
                                ? 'border-[#0070ba] bg-[#0070ba]/10 ring-2 ring-[#0070ba]/30'
                                : !profile?.paypal_email
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#0070ba] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <CreditCard className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-sm font-medium block">PayPal</span>
                            {profile?.paypal_email ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{profile.paypal_email}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'paypal' && (
                              <span className="inline-block mt-2 text-xs bg-[#0070ba] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>

                          {/* Cash App Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('cashapp')}
                            disabled={!cashappUsername}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'cashapp'
                                ? 'border-[#00D632] bg-[#00D632]/10 ring-2 ring-[#00D632]/30'
                                : !cashappUsername
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#00D632] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">$</span>
                            </div>
                            <span className="text-sm font-medium block">Cash App</span>
                            {cashappUsername ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{cashappUsername.startsWith('$') ? cashappUsername : '$' + cashappUsername}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'cashapp' && (
                              <span className="inline-block mt-2 text-xs bg-[#00D632] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>

                          {/* Venmo Option */}
                          <button
                            type="button"
                            onClick={() => setPreferredPaymentMethod('venmo')}
                            disabled={!venmoUsername}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              preferredPaymentMethod === 'venmo'
                                ? 'border-[#3D95CE] bg-[#3D95CE]/10 ring-2 ring-[#3D95CE]/30'
                                : !venmoUsername
                                ? 'border-neutral-200 bg-neutral-50 opacity-50 cursor-not-allowed'
                                : 'border-neutral-200 hover:border-neutral-300'
                            }`}
                          >
                            <div className="w-10 h-10 bg-[#3D95CE] rounded-lg mx-auto mb-2 flex items-center justify-center">
                              <span className="text-white font-bold text-lg">V</span>
                            </div>
                            <span className="text-sm font-medium block">Venmo</span>
                            {venmoUsername ? (
                              <span className="text-xs text-neutral-500 block mt-1 truncate">{venmoUsername.startsWith('@') ? venmoUsername : '@' + venmoUsername}</span>
                            ) : (
                              <span className="text-xs text-red-500 block mt-1">Not set up</span>
                            )}
                            {preferredPaymentMethod === 'venmo' && (
                              <span className="inline-block mt-2 text-xs bg-[#3D95CE] text-white px-2 py-0.5 rounded-full">⭐ Preferred</span>
                            )}
                          </button>
                        </div>

                        {!preferredPaymentMethod && (profile?.paypal_email || cashappUsername || venmoUsername) && (
                          <p className="text-sm text-amber-600 mt-3">
                            ⚠️ Please select a preferred payment method
                          </p>
                        )}
                      </div>

                      <div className="flex justify-end">
                        <Button type="submit" loading={savingPaymentMethods}>
                          Save Payment Methods
                        </Button>
                      </div>
                    </form>
                  </Card>

                  {/* Auto-Payment Info */}
                  <Card>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-purple-100 rounded-xl">
                        <CreditCard className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">Automatic Payments</h2>
                        <p className="text-sm text-neutral-500">Set up auto-pay for your loans</p>
                      </div>
                    </div>

                    <p className="text-neutral-600 mb-4">
                      When you have active loans, you can enable automatic payments to never miss a due date. 
                      Payments will be processed from your PayPal on the scheduled dates.
                    </p>

                    <div className="text-sm text-neutral-500">
                      <p>Auto-payment settings are configured per loan from the loan details page.</p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-blue-100 rounded-xl">
                      <Bell className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-neutral-900">Notifications</h2>
                      <p className="text-sm text-neutral-500">Manage your notification preferences</p>
                    </div>
                  </div>

                  <form onSubmit={handleSaveProfile} className="space-y-6">
                    <label className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl cursor-pointer">
                      <div>
                        <p className="font-medium text-neutral-900">Email Notifications</p>
                        <p className="text-sm text-neutral-500">Receive updates via email</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                      />
                    </label>

                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <label className="block">
                        <span className="font-medium text-neutral-900">Payment Reminders</span>
                        <p className="text-sm text-neutral-500 mb-3">How many days before due date?</p>
                        <select
                          value={reminderDays}
                          onChange={(e) => setReminderDays(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value="1">1 day before</option>
                          <option value="3">3 days before</option>
                          <option value="7">1 week before</option>
                        </select>
                      </label>
                    </div>

                    <div className="p-4 bg-neutral-50 rounded-xl">
                      <label className="block">
                        <div className="flex items-center gap-2 mb-1">
                          <Globe className="w-4 h-4 text-neutral-600" />
                          <span className="font-medium text-neutral-900">Timezone</span>
                        </div>
                        <p className="text-sm text-neutral-500 mb-3">Used for payment due dates and reminders</p>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <optgroup label="North America">
                            <option value="America/New_York">Eastern Time (ET)</option>
                            <option value="America/Chicago">Central Time (CT)</option>
                            <option value="America/Denver">Mountain Time (MT)</option>
                            <option value="America/Los_Angeles">Pacific Time (PT)</option>
                            <option value="America/Anchorage">Alaska Time</option>
                            <option value="Pacific/Honolulu">Hawaii Time</option>
                          </optgroup>
                          <optgroup label="Europe">
                            <option value="Europe/London">London (GMT/BST)</option>
                            <option value="Europe/Paris">Paris (CET)</option>
                            <option value="Europe/Berlin">Berlin (CET)</option>
                            <option value="Europe/Amsterdam">Amsterdam (CET)</option>
                            <option value="Europe/Rome">Rome (CET)</option>
                          </optgroup>
                          <optgroup label="Africa">
                            <option value="Africa/Lagos">Lagos (WAT)</option>
                            <option value="Africa/Johannesburg">Johannesburg (SAST)</option>
                            <option value="Africa/Cairo">Cairo (EET)</option>
                            <option value="Africa/Nairobi">Nairobi (EAT)</option>
                            <option value="Africa/Casablanca">Casablanca (WET)</option>
                          </optgroup>
                          <optgroup label="Asia">
                            <option value="Asia/Dubai">Dubai (GST)</option>
                            <option value="Asia/Kolkata">India (IST)</option>
                            <option value="Asia/Singapore">Singapore (SGT)</option>
                            <option value="Asia/Hong_Kong">Hong Kong (HKT)</option>
                            <option value="Asia/Tokyo">Tokyo (JST)</option>
                            <option value="Asia/Shanghai">Shanghai (CST)</option>
                          </optgroup>
                          <optgroup label="Australia & Pacific">
                            <option value="Australia/Sydney">Sydney (AEST)</option>
                            <option value="Australia/Melbourne">Melbourne (AEST)</option>
                            <option value="Australia/Perth">Perth (AWST)</option>
                            <option value="Pacific/Auckland">Auckland (NZST)</option>
                          </optgroup>
                          <optgroup label="South America">
                            <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                            <option value="America/Buenos_Aires">Buenos Aires (ART)</option>
                            <option value="America/Lima">Lima (PET)</option>
                            <option value="America/Bogota">Bogotá (COT)</option>
                          </optgroup>
                        </select>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" loading={saving}>
                        Save Preferences
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="p-3 bg-yellow-100 rounded-xl">
                        <Shield className="w-5 h-5 text-yellow-600" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-neutral-900">Security</h2>
                        <p className="text-sm text-neutral-500">Manage your account security</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Password Change */}
                      <div className="p-4 bg-neutral-50 rounded-xl">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Key className="w-5 h-5 text-neutral-600" />
                            <div>
                              <p className="font-medium text-neutral-900">Password</p>
                              <p className="text-sm text-neutral-500">Change your account password</p>
                            </div>
                          </div>
                          {!showPasswordForm && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setShowPasswordForm(true)}
                            >
                              Change Password
                            </Button>
                          )}
                        </div>

                        {showPasswordForm && (
                          <form onSubmit={handleChangePassword} className="space-y-4 pt-4 border-t border-neutral-200">
                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                New Password
                              </label>
                              <div className="relative">
                                <input
                                  type={showNewPassword ? 'text' : 'password'}
                                  value={newPassword}
                                  onChange={(e) => setNewPassword(e.target.value)}
                                  placeholder="Enter new password"
                                  className="w-full px-4 py-2 pr-10 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                  required
                                  minLength={6}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowNewPassword(!showNewPassword)}
                                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                                >
                                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                              <p className="text-xs text-neutral-500 mt-1">Minimum 6 characters</p>
                            </div>

                            <div>
                              <label className="block text-sm font-medium text-neutral-700 mb-1">
                                Confirm New Password
                              </label>
                              <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                                className="w-full px-4 py-2 border border-neutral-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                required
                              />
                            </div>

                            {newPassword && confirmPassword && newPassword !== confirmPassword && (
                              <p className="text-sm text-red-600">Passwords do not match</p>
                            )}

                            <div className="flex gap-3">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setShowPasswordForm(false);
                                  setNewPassword('');
                                  setConfirmPassword('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                loading={changingPassword}
                                disabled={!newPassword || !confirmPassword || newPassword !== confirmPassword}
                              >
                                Update Password
                              </Button>
                            </div>
                          </form>
                        )}
                      </div>

                      <div className="flex items-center justify-between p-4 bg-neutral-50 rounded-xl">
                        <div>
                          <p className="font-medium text-neutral-900">Two-Factor Authentication</p>
                          <p className="text-sm text-neutral-500">Add an extra layer of security</p>
                        </div>
                        <Button variant="outline" size="sm" disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Sign Out */}
                  <Card className="border-red-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 rounded-xl">
                          <LogOut className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <h2 className="font-semibold text-neutral-900">Sign Out</h2>
                          <p className="text-sm text-neutral-500">Sign out of your account</p>
                        </div>
                      </div>
                      <Button variant="danger" onClick={handleSignOut}>
                        Sign Out
                      </Button>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
