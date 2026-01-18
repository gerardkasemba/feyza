'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button, Badge } from '@/components/ui';
import { 
  Globe,
  Save, 
  AlertCircle, 
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Country {
  code: string;
  name: string;
  enabled: boolean;
}

export default function AdminCountriesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [countries, setCountries] = useState<Country[]>([]);
  const [newCountry, setNewCountry] = useState({ code: '', name: '' });

  useEffect(() => {
    async function checkAdminAndFetch() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push('/auth/signin');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/dashboard');
        return;
      }

      setIsAdmin(true);

      try {
        const res = await fetch('/api/admin/countries');
        const data = await res.json();
        if (data.allCountries) {
          setCountries(data.allCountries);
        }
      } catch (error) {
        console.error('Failed to fetch countries:', error);
      }

      setLoading(false);
    }

    checkAdminAndFetch();
  }, [router]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/countries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ countries }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: 'Countries saved successfully!' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to save' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    setSaving(false);
  };

  const toggleCountry = (code: string) => {
    setCountries(prev => prev.map(c => 
      c.code === code ? { ...c, enabled: !c.enabled } : c
    ));
  };

  const addCountry = () => {
    if (!newCountry.code || !newCountry.name) {
      setMessage({ type: 'error', text: 'Please enter both country code and name' });
      return;
    }
    
    if (countries.some(c => c.code === newCountry.code.toUpperCase())) {
      setMessage({ type: 'error', text: 'Country code already exists' });
      return;
    }
    
    setCountries(prev => [...prev, {
      code: newCountry.code.toUpperCase(),
      name: newCountry.name,
      enabled: true,
    }]);
    setNewCountry({ code: '', name: '' });
    setMessage(null);
  };

  const removeCountry = (code: string) => {
    setCountries(prev => prev.filter(c => c.code !== code));
  };

  const enableAll = () => {
    setCountries(prev => prev.map(c => ({ ...c, enabled: true })));
  };

  const disableAll = () => {
    setCountries(prev => prev.map(c => ({ ...c, enabled: false })));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-neutral-950">
        <RefreshCw className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const enabledCount = countries.filter(c => c.enabled).length;

  return (
    <main className="min-h-screen bg-neutral-50 dark:bg-neutral-950 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="mb-6">
          {/* <Link 
            href="/admin" 
            className="inline-flex items-center text-sm text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admin
          </Link> */}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                <Globe className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-neutral-900 dark:text-white">
                  Supported Countries
                </h1>
                <p className="text-sm text-neutral-500">
                  Manage lending regions
                </p>
              </div>
            </div>
            
            <Badge variant="info">
              {enabledCount} of {countries.length} active
            </Badge>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
              : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Quick Actions */}
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-neutral-900 dark:text-white">Quick Actions</h3>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={enableAll}>
                  Enable All
                </Button>
                <Button variant="outline" size="sm" onClick={disableAll}>
                  Disable All
                </Button>
              </div>
            </div>
          </Card>

          {/* Add New Country */}
          <Card className="p-4">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-3">Add New Country</h3>
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Code (e.g. US)"
                value={newCountry.code}
                onChange={(e) => setNewCountry(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                maxLength={3}
                className="w-20 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm uppercase"
              />
              <input
                type="text"
                placeholder="Country name"
                value={newCountry.name}
                onChange={(e) => setNewCountry(prev => ({ ...prev, name: e.target.value }))}
                className="flex-1 px-3 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white text-sm"
              />
              <Button size="sm" onClick={addCountry}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </Card>

          {/* Countries List */}
          <Card className="p-4">
            <h3 className="font-medium text-neutral-900 dark:text-white mb-3">Countries</h3>
            <div className="space-y-2">
              {countries.map((country) => (
                <div
                  key={country.code}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    country.enabled
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-sm font-mono font-medium text-neutral-500">
                      {country.code}
                    </span>
                    <span className={`font-medium ${
                      country.enabled 
                        ? 'text-neutral-900 dark:text-white' 
                        : 'text-neutral-500 dark:text-neutral-400'
                    }`}>
                      {country.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleCountry(country.code)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        country.enabled 
                          ? 'bg-green-500' 
                          : 'bg-neutral-300 dark:bg-neutral-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        country.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </button>
                    <button
                      onClick={() => removeCountry(country.code)}
                      className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              
              {countries.length === 0 && (
                <div className="text-center py-8 text-neutral-500">
                  No countries added yet. Add your first country above.
                </div>
              )}
            </div>
          </Card>

          {/* Info Box */}
          <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
            <div className="flex gap-3 text-sm">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
              <div className="text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">How it works</p>
                <ul className="list-disc list-inside space-y-1 text-blue-700 dark:text-blue-400">
                  <li>Enabled countries appear in lender preferences</li>
                  <li>Lenders can only select from enabled countries</li>
                  <li>Disabling a country won't affect existing preferences</li>
                </ul>
              </div>
            </div>
          </Card>

          {/* Save Button */}
          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Countries
              </>
            )}
          </Button>
        </div>
      </div>
    </main>
  );
}
