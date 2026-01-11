'use client';

import React, { useState } from 'react';
import { Button, Input, Card } from '@/components/ui';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';

export default function CreateAgentPage() {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: 'agent',
    country: '',
    region: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch('/api/agent/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create agent');
      }

      setSuccess(true);
      setFormData({
        email: '',
        full_name: '',
        phone: '',
        role: 'agent',
        country: '',
        region: '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to create agent');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <UserPlus className="w-7 h-7 text-primary-600" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">Create Agent</h1>
          <p className="text-neutral-500 mt-1">Add a new agent to handle disbursements</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
            <p className="text-sm text-green-700">Agent created successfully!</p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Full Name *"
            name="full_name"
            placeholder="John Doe"
            value={formData.full_name}
            onChange={handleChange}
            required
          />

          <Input
            label="Email *"
            name="email"
            type="email"
            placeholder="agent@company.com"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <Input
            label="Phone"
            name="phone"
            type="tel"
            placeholder="+254 700 000 000"
            value={formData.phone}
            onChange={handleChange}
          />

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Role *
            </label>
            <select
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="agent">Agent</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Country *"
              name="country"
              placeholder="Kenya"
              value={formData.country}
              onChange={handleChange}
              required
            />

            <Input
              label="Region"
              name="region"
              placeholder="Nairobi"
              value={formData.region}
              onChange={handleChange}
            />
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            <UserPlus className="w-4 h-4 mr-2" />
            Create Agent
          </Button>
        </form>
      </Card>
    </div>
  );
}
