'use client';
import { clientLogger } from '@/lib/client-logger';
const log = clientLogger('admin_page');

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  MapPin,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Search,
  Globe,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface Country {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

interface State {
  id: string;
  code: string;
  name: string;
  country_id: string;
  country_code?: string;
  country_name?: string;
  is_active: boolean;
}

export default function AdminStatesPage() {
  const [states, setStates] = useState<State[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingState, setEditingState] = useState<State | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string>('all');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const supabase = createClient();

  const [newState, setNewState] = useState({
    code: '',
    name: '',
    country_id: '',
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch countries
      const { data: countriesData, error: countriesError } = await supabase
        .from('countries')
        .select('id, code, name, is_active')
        .order('name');

      if (countriesError) throw countriesError;
      setCountries(countriesData || []);

      // Fetch states with country info
      const { data: statesData, error: statesError } = await supabase
        .from('states')
        .select(`
          id,
          code,
          name,
          country_id,
          is_active,
          countries (
            code,
            name
          )
        `)
        .order('name');

      if (statesError) throw statesError;
      
      // Map the data to include country info at top level
      const mappedStates = (statesData || []).map((s: any) => ({
        ...s,
        country_code: (s.countries as any)?.code,
        country_name: (s.countries as any)?.name,
      }));
      
      setStates(mappedStates);
    } catch (err: unknown) {
      log.error('Error fetching data:', err);
      setError((err as Error).message || 'Failed to fetch data');
    }
    setLoading(false);
  };

  const handleAddState = async () => {
    if (!newState.code || !newState.name || !newState.country_id) {
      setError('Please fill in all required fields');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('states')
        .insert({
          code: newState.code.toUpperCase(),
          name: newState.name,
          country_id: newState.country_id,
          is_active: newState.is_active,
        });

      if (error) throw error;

      setSuccess('State added successfully');
      setNewState({ code: '', name: '', country_id: '', is_active: true });
      setIsAddingNew(false);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to add state');
    }
    setSaving(false);
  };

  const handleUpdateState = async () => {
    if (!editingState) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('states')
        .update({
          code: editingState.code.toUpperCase(),
          name: editingState.name,
          country_id: editingState.country_id,
          is_active: editingState.is_active,
        })
        .eq('id', editingState.id);

      if (error) throw error;

      setSuccess('State updated successfully');
      setEditingState(null);
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update state');
    }
    setSaving(false);
  };

  const handleDeleteState = async (state: State) => {
    if (!confirm(`Are you sure you want to delete "${state.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('states')
        .delete()
        .eq('id', state.id);

      if (error) throw error;

      setSuccess('State deleted successfully');
      await fetchData();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to delete state');
    }
  };

  const handleToggleActive = async (state: State) => {
    try {
      const { error } = await supabase
        .from('states')
        .update({ is_active: !state.is_active })
        .eq('id', state.id);

      if (error) throw error;
      await fetchData();
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to update state');
    }
  };

  // Filter states
  const filteredStates = states.filter(state => {
    const matchesSearch = 
      state.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      state.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCountry = selectedCountry === 'all' || state.country_id === selectedCountry;
    return matchesSearch && matchesCountry;
  });

  // Group states by country for display
  const statesByCountry = filteredStates.reduce((acc, state) => {
    const countryName = state.country_name || 'Unknown';
    if (!acc[countryName]) {
      acc[countryName] = [];
    }
    acc[countryName].push(state);
    return acc;
  }, {} as Record<string, State[]>);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-800 rounded w-48" />
          <div className="h-64 bg-neutral-200 dark:bg-neutral-800 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-white flex items-center gap-3">
            <MapPin className="w-7 h-7 text-blue-500" />
            States / Regions
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mt-1">
            Manage states and regions for each country
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddingNew(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add State
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4 text-red-500" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <p className="text-green-700 dark:text-green-300">{success}</p>
        </div>
      )}

      {/* Add New State Form */}
      {isAddingNew && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">Add New State</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                Country *
              </label>
              <select
                value={newState.country_id}
                onChange={(e) => setNewState({ ...newState, country_id: e.target.value })}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              >
                <option value="">Select Country</option>
                {countries.map(country => (
                  <option key={country.id} value={country.id}>
                    {country.name} ({country.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                State Code *
              </label>
              <input
                type="text"
                value={newState.code}
                onChange={(e) => setNewState({ ...newState, code: e.target.value.toUpperCase() })}
                placeholder="e.g., CA, NY, TX"
                maxLength={5}
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                State Name *
              </label>
              <input
                type="text"
                value={newState.name}
                onChange={(e) => setNewState({ ...newState, name: e.target.value })}
                placeholder="e.g., California"
                className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newState.is_active}
                  onChange={(e) => setNewState({ ...newState, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-500 rounded"
                />
                <span className="text-sm text-neutral-700 dark:text-neutral-300">Active</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={() => {
                setIsAddingNew(false);
                setNewState({ code: '', name: '', country_id: '', is_active: true });
              }}
              className="px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddState}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save State
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search states..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
          />
        </div>
        <select
          value={selectedCountry}
          onChange={(e) => setSelectedCountry(e.target.value)}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white"
        >
          <option value="all">All Countries</option>
          {countries.map(country => (
            <option key={country.id} value={country.id}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Total States</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">{states.length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Active</p>
          <p className="text-2xl font-bold text-green-600">{states.filter(s => s.is_active).length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Inactive</p>
          <p className="text-2xl font-bold text-neutral-500">{states.filter(s => !s.is_active).length}</p>
        </div>
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Countries with States</p>
          <p className="text-2xl font-bold text-blue-600">{Object.keys(statesByCountry).length}</p>
        </div>
      </div>

      {/* States List by Country */}
      {Object.keys(statesByCountry).length === 0 ? (
        <div className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 p-12 text-center">
          <MapPin className="w-12 h-12 text-neutral-300 dark:text-neutral-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-neutral-900 dark:text-white mb-2">No States Found</h3>
          <p className="text-neutral-500 dark:text-neutral-400 mb-4">
            {searchTerm || selectedCountry !== 'all' 
              ? 'No states match your filters. Try adjusting your search.'
              : 'Get started by adding states for your supported countries.'}
          </p>
          {!isAddingNew && (
            <button
              onClick={() => setIsAddingNew(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add First State
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(statesByCountry).map(([countryName, countryStates]) => (
            <div key={countryName} className="bg-white dark:bg-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-700 overflow-hidden">
              <div className="px-6 py-4 bg-neutral-50 dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-700">
                <h3 className="font-semibold text-neutral-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-5 h-5 text-green-500" />
                  {countryName}
                  <span className="text-sm font-normal text-neutral-500 dark:text-neutral-400">
                    ({countryStates.length} states)
                  </span>
                </h3>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-700">
                {countryStates.map(state => (
                  <div key={state.id} className="px-6 py-4 flex items-center justify-between">
                    {editingState?.id === state.id ? (
                      // Edit mode
                      <div className="flex-1 flex items-center gap-4">
                        <select
                          value={editingState.country_id}
                          onChange={(e) => setEditingState({ ...editingState, country_id: e.target.value })}
                          className="px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-sm"
                        >
                          {countries.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={editingState.code}
                          onChange={(e) => setEditingState({ ...editingState, code: e.target.value.toUpperCase() })}
                          className="w-20 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-sm"
                        />
                        <input
                          type="text"
                          value={editingState.name}
                          onChange={(e) => setEditingState({ ...editingState, name: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 text-sm"
                        />
                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={editingState.is_active}
                            onChange={(e) => setEditingState({ ...editingState, is_active: e.target.checked })}
                            className="w-4 h-4 text-blue-500 rounded"
                          />
                          <span className="text-sm">Active</span>
                        </label>
                        <button
                          onClick={handleUpdateState}
                          disabled={saving}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingState(null)}
                          className="p-2 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-lg"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      // View mode
                      <>
                        <div className="flex items-center gap-4">
                          <span className="w-12 font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                            {state.code}
                          </span>
                          <span className="text-neutral-900 dark:text-white">{state.name}</span>
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            state.is_active 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                              : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400'
                          }`}>
                            {state.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleToggleActive(state)}
                            className={`p-2 rounded-lg transition-colors ${
                              state.is_active
                                ? 'text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={state.is_active ? 'Deactivate' : 'Activate'}
                          >
                            {state.is_active ? (
                              <X className="w-4 h-4" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => setEditingState(state)}
                            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteState(state)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
