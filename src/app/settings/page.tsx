'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Navbar, Footer } from '@/components/layout';
import { Card, Button, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { PlaidLinkButton, ConnectedBank, BankConnectionRequired } from '@/components/payments/PlaidLink';
import { 
  User, Bell, Shield, LogOut, Building, CheckCircle, 
  AlertCircle, Key, Eye, EyeOff, Globe, Trash2
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

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Bank connection state
  const [disconnectingBank, setDisconnectingBank] = useState(false);

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
          setEmailNotifications(profileData.email_reminders !== false);
          setReminderDays(String(profileData.reminder_days_before || 3));
          setTimezone(profileData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);
        } else {
          setFullName(user.user_metadata?.full_name || '');
          setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
        }
      } catch (error) {
        console.log('Error fetching profile');
      }

      setLoading(false);
    };

    fetchData();
  }, [router]);

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
          phone: phone || null,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      setProfile({ ...profile, full_name: fullName, phone });
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({
          email_reminders: emailNotifications,
          reminder_days_before: parseInt(reminderDays) || 3,
          timezone: timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Notification settings updated!' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update settings' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    
    if (newPassword.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
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

  const handleBankConnected = (data: any) => {
    setProfile({
      ...profile,
      bank_connected: true,
      bank_name: data.bank_name,
      bank_account_mask: data.account_mask,
      bank_account_type: data.account_type,
      dwolla_funding_source_id: data.funding_source_id,
    });
    setMessage({ type: 'success', text: 'Bank account connected successfully!' });
  };

  const handleDisconnectBank = async () => {
    if (!confirm('Are you sure you want to disconnect your bank account?')) return;
    
    setDisconnectingBank(true);
    try {
      const supabase = createClient();
      
      const { error } = await supabase
        .from('users')
        .update({
          plaid_access_token: null,
          plaid_item_id: null,
          plaid_account_id: null,
          dwolla_funding_source_url: null,
          dwolla_funding_source_id: null,
          bank_name: null,
          bank_account_mask: null,
          bank_account_type: null,
          bank_connected: false,
          bank_connected_at: null,
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile({
        ...profile,
        bank_connected: false,
        bank_name: null,
        bank_account_mask: null,
      });
      setMessage({ type: 'success', text: 'Bank account disconnected' });
    } catch (error: any) {
      setMessage({ type: 'error', text: 'Failed to disconnect bank account' });
    } finally {
      setDisconnectingBank(false);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    );
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'payments', label: 'Bank Account', icon: Building },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const userProfile = profile || {
    id: user?.id,
    email: user?.email,
    full_name: fullName || 'User',
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50 dark:bg-neutral-950">
      <Navbar user={userProfile} />

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-6">Settings</h1>

          {message && (
            <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 ${
              message.type === 'success' 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {message.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span className={message.type === 'success' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}>
                {message.text}
              </span>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6">
            {/* Sidebar */}
            <div className="md:w-64 flex-shrink-0">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                        : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <tab.icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                ))}
                
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors mt-4"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1">
              {/* Profile Tab */}
              {activeTab === 'profile' && (
                <Card>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Profile Information</h2>
                  
                  <form onSubmit={handleSaveProfile} className="space-y-4">
                    <Input
                      label="Email"
                      type="email"
                      value={user?.email || ''}
                      disabled
                      helperText="Email cannot be changed"
                    />
                    
                    <Input
                      label="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your full name"
                    />
                    
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                    />

                    <div className="flex justify-end pt-4">
                      <Button type="submit" loading={saving}>
                        Save Changes
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Bank Account Tab */}
              {activeTab === 'payments' && (
                <div className="space-y-6">
                  <Card>
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center">
                        <Building className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-neutral-900 dark:text-white">Bank Account</h2>
                        <p className="text-sm text-neutral-500 dark:text-neutral-400">Connect your bank to send and receive payments</p>
                      </div>
                    </div>

                    {profile?.bank_connected ? (
                      <ConnectedBank
                        bankName={profile.bank_name}
                        accountMask={profile.bank_account_mask}
                        accountType={profile.bank_account_type}
                        onDisconnect={handleDisconnectBank}
                      />
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center">
                          <Building className="w-8 h-8 text-neutral-400" />
                        </div>
                        <h3 className="font-semibold text-neutral-900 dark:text-white mb-2">No Bank Connected</h3>
                        <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
                          Connect your bank account to receive loan funds and make repayments securely.
                        </p>
                        <PlaidLinkButton
                          onSuccess={handleBankConnected}
                          onError={(err) => setMessage({ type: 'error', text: err })}
                          buttonText="Connect Bank Account"
                        />
                      </div>
                    )}
                  </Card>

                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <div className="flex items-start gap-3">
                      <Shield className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-blue-800 dark:text-blue-300">Secure & Protected</h4>
                        <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                          We use Plaid to securely connect to your bank. We never store your bank login credentials. 
                          All transfers are processed through Dwolla, a licensed money transmitter.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Notifications Tab */}
              {activeTab === 'notifications' && (
                <Card>
                  <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Notification Settings</h2>
                  
                  <form onSubmit={handleSaveNotifications} className="space-y-6">
                    <div className="space-y-4">
                      <label className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl cursor-pointer">
                        <div>
                          <span className="font-medium text-neutral-900 dark:text-white">Email Notifications</span>
                          <p className="text-sm text-neutral-500 dark:text-neutral-400">Receive reminders about upcoming payments</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={emailNotifications}
                          onChange={(e) => setEmailNotifications(e.target.checked)}
                          className="w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                        />
                      </label>

                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <label className="block font-medium text-neutral-900 dark:text-white mb-2">
                          Remind me before payment is due
                        </label>
                        <select
                          value={reminderDays}
                          onChange={(e) => setReminderDays(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                        >
                          <option value="1">1 day before</option>
                          <option value="2">2 days before</option>
                          <option value="3">3 days before</option>
                          <option value="5">5 days before</option>
                          <option value="7">1 week before</option>
                        </select>
                      </div>

                      <div className="p-4 bg-neutral-50 dark:bg-neutral-800 rounded-xl">
                        <label className="block font-medium text-neutral-900 dark:text-white mb-2">
                          <Globe className="w-4 h-4 inline mr-2" />
                          Timezone
                        </label>
                        <select
                          value={timezone}
                          onChange={(e) => setTimezone(e.target.value)}
                          className="w-full px-4 py-2 rounded-lg border border-neutral-200 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
                        >
                          <option value="America/New_York">Eastern Time (ET)</option>
                          <option value="America/Chicago">Central Time (CT)</option>
                          <option value="America/Denver">Mountain Time (MT)</option>
                          <option value="America/Los_Angeles">Pacific Time (PT)</option>
                          <option value="America/Anchorage">Alaska Time</option>
                          <option value="Pacific/Honolulu">Hawaii Time</option>
                          <option value="UTC">UTC</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <Button type="submit" loading={saving}>
                        Save Settings
                      </Button>
                    </div>
                  </form>
                </Card>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <Card>
                    <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6">Change Password</h2>
                    
                    {!showPasswordForm ? (
                      <Button variant="outline" onClick={() => setShowPasswordForm(true)}>
                        <Key className="w-4 h-4 mr-2" />
                        Change Password
                      </Button>
                    ) : (
                      <form onSubmit={handleChangePassword} className="space-y-4">
                        <div className="relative">
                          <Input
                            label="New Password"
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Enter new password"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-9 text-neutral-400 hover:text-neutral-600"
                          >
                            {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        
                        <Input
                          label="Confirm New Password"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
                        />

                        <div className="flex gap-3 pt-2">
                          <Button type="submit" loading={changingPassword}>
                            Update Password
                          </Button>
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
                        </div>
                      </form>
                    )}
                  </Card>

                  <Card className="border-red-200 dark:border-red-800">
                    <h2 className="text-lg font-semibold text-red-800 dark:text-red-300 mb-4">Danger Zone</h2>
                    <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                    <Button 
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Account
                    </Button>
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-neutral-500">Loading...</div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
