'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Shield, User, Briefcase, MapPin, FileText, 
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle,
  Upload, Calendar, Building2
} from 'lucide-react';
import { FaIdCard, FaPassport, FaCar, FaLandmark, FaFileInvoiceDollar, FaFileContract, FaEnvelope } from 'react-icons/fa';

export default function VerificationPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1); // 1: Identity, 2: Employment, 3: Address, 4: Review & Accept

  // Identity fields
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [idDocumentFile, setIdDocumentFile] = useState<File | null>(null);

  // Employment fields
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [employerAddress, setEmployerAddress] = useState('');
  const [employmentStartDate, setEmploymentStartDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentDocumentFile, setEmploymentDocumentFile] = useState<File | null>(null);

  // Address fields
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [addressDocumentType, setAddressDocumentType] = useState('');
  const [addressDocumentFile, setAddressDocumentFile] = useState<File | null>(null);

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  const idTypes = [
    { value: '', label: 'Select ID type', icon: null },
    { value: 'national_id', label: 'National ID', icon: <FaIdCard className="w-4 h-4" /> },
    { value: 'passport', label: 'Passport', icon: <FaPassport className="w-4 h-4" /> },
    { value: 'drivers_license', label: "Driver's License", icon: <FaCar className="w-4 h-4" /> },
  ];

  const employmentStatuses = [
    { value: '', label: 'Select employment status', icon: null },
    { value: 'employed', label: 'Employed (Full-time)', icon: null },
    { value: 'part_time', label: 'Employed (Part-time)', icon: null },
    { value: 'self_employed', label: 'Self-Employed', icon: null },
    { value: 'contractor', label: 'Independent Contractor', icon: null },
  ];

  const addressDocumentTypes = [
    { value: '', label: 'Select document type', icon: null },
    { value: 'utility_bill', label: 'Utility Bill (last 3 months)', icon: null },
    { value: 'bank_statement', label: 'Bank Statement (last 3 months)', icon: <FaLandmark className="w-4 h-4" /> },
    { value: 'lease_agreement', label: 'Lease/Rental Agreement', icon: <FaFileContract className="w-4 h-4" /> },
    { value: 'government_letter', label: 'Government Letter', icon: <FaEnvelope className="w-4 h-4" /> },
  ];

  const countries = [
    { value: '', label: 'Select country', icon: null },
    { value: 'US', label: 'United States', icon: null },
    { value: 'UK', label: 'United Kingdom', icon: null },
    { value: 'CA', label: 'Canada', icon: null },
    { value: 'NG', label: 'Nigeria', icon: null },
    { value: 'KE', label: 'Kenya', icon: null },
    { value: 'GH', label: 'Ghana', icon: null },
    { value: 'ZA', label: 'South Africa', icon: null },
    { value: 'OTHER', label: 'Other', icon: null },
  ];

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient();
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }
      
      setUser(authUser);

      // Get user profile
      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // If already verified, redirect
        if (profileData.verification_status === 'verified') {
          router.push('/dashboard');
          return;
        }

        // Pre-fill existing data
        if (profileData.id_type) setIdType(profileData.id_type);
        if (profileData.id_number) setIdNumber(profileData.id_number);
        if (profileData.employment_status) setEmploymentStatus(profileData.employment_status);
        if (profileData.employer_name) setEmployerName(profileData.employer_name);
        if (profileData.address_line1) setAddressLine1(profileData.address_line1);
        if (profileData.city) setCity(profileData.city);
        if (profileData.country) setCountry(profileData.country);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router]);

  const validateStep1 = () => {
    if (!idType) {
      setError('Please select an ID type');
      return false;
    }
    if (!idNumber.trim()) {
      setError('Please enter your ID number');
      return false;
    }
    if (!idDocumentFile && !profile?.id_document_url) {
      setError('Please upload your ID document');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!employmentStatus) {
      setError('Please select your employment status');
      return false;
    }
    if (!employerName.trim()) {
      setError('Please enter your employer/business name');
      return false;
    }
    if (!employmentStartDate) {
      setError('Please enter your employment start date');
      return false;
    }
    // Check if employment is at least 30 days
    const startDate = new Date(employmentStartDate);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (startDate > thirtyDaysAgo) {
      setError('Employment must be at least 30 days. Please wait or provide earlier employment proof.');
      return false;
    }
    if (!employmentDocumentFile && !profile?.employment_document_url) {
      setError('Please upload your employment proof document');
      return false;
    }
    return true;
  };

  const validateStep3 = () => {
    if (!addressLine1.trim()) {
      setError('Please enter your address');
      return false;
    }
    if (!city.trim()) {
      setError('Please enter your city');
      return false;
    }
    if (!country) {
      setError('Please select your country');
      return false;
    }
    if (!addressDocumentType) {
      setError('Please select an address document type');
      return false;
    }
    if (!addressDocumentFile && !profile?.address_document_url) {
      setError('Please upload your address proof document');
      return false;
    }
    return true;
  };

  const validateStep4 = () => {
    if (!termsAccepted) {
      setError('You must accept the terms and conditions');
      return false;
    }
    return true;
  };

  const goToNextStep = () => {
    setError(null);
    
    let isValid = false;
    if (step === 1) isValid = validateStep1();
    else if (step === 2) isValid = validateStep2();
    else if (step === 3) isValid = validateStep3();
    
    if (isValid) {
      setStep(step + 1);
    }
  };

  const uploadDocument = async (file: File, folder: string): Promise<string> => {
    const supabase = createClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const fileName = `${user.id}/${folder}/${Date.now()}.${fileExt}`;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error(`File ${file.name} is too large. Maximum size is 5MB.`);
    }

    // Validate file type
    const allowedTypes = ['jpg', 'jpeg', 'png', 'pdf', 'gif', 'webp'];
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    const { error, data } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (error) {
      console.error('Upload error:', error);
      throw new Error(`Failed to upload ${folder} document: ${error.message}`);
    }
    
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep4()) return;

    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      
      // Upload documents with error handling
      let idDocUrl = profile?.id_document_url;
      let employmentDocUrl = profile?.employment_document_url;
      let addressDocUrl = profile?.address_document_url;

      try {
        if (idDocumentFile) {
          idDocUrl = await uploadDocument(idDocumentFile, 'identity');
        }
      } catch (uploadError: any) {
        throw new Error(`Identity document: ${uploadError.message}`);
      }

      try {
        if (employmentDocumentFile) {
          employmentDocUrl = await uploadDocument(employmentDocumentFile, 'employment');
        }
      } catch (uploadError: any) {
        throw new Error(`Employment document: ${uploadError.message}`);
      }

      try {
        if (addressDocumentFile) {
          addressDocUrl = await uploadDocument(addressDocumentFile, 'address');
        }
      } catch (uploadError: any) {
        throw new Error(`Address document: ${uploadError.message}`);
      }

      // Verify all documents were uploaded
      if (!idDocUrl) {
        throw new Error('Failed to upload identity document. Please try again.');
      }
      if (!employmentDocUrl) {
        throw new Error('Failed to upload employment document. Please try again.');
      }
      if (!addressDocUrl) {
        throw new Error('Failed to upload address document. Please try again.');
      }

      // Update user profile
      const { error: updateError } = await supabase
        .from('users')
        .update({
          // Identity
          id_type: idType,
          id_number: idNumber,
          id_expiry_date: idExpiry || null,
          id_document_url: idDocUrl,
          // Employment
          employment_status: employmentStatus,
          employer_name: employerName,
          employer_address: employerAddress || null,
          employment_start_date: employmentStartDate,
          employment_document_url: employmentDocUrl,
          monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : null,
          // Address
          address_line1: addressLine1,
          address_line2: addressLine2 || null,
          city: city,
          state_province: stateProvince || null,
          postal_code: postalCode || null,
          country: country,
          address_document_type: addressDocumentType,
          address_document_url: addressDocUrl,
          // Status
          verification_status: 'submitted',
          verification_submitted_at: new Date().toISOString(),
          terms_accepted: true,
          terms_accepted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/dashboard?verification=submitted');
    } catch (err: any) {
      setError(err.message || 'Failed to submit verification');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-neutral-950">
        <div className="animate-pulse text-neutral-500 dark:text-neutral-400">Loading...</div>
      </div>
    );
  }

  // Already submitted
  if (profile?.verification_status === 'submitted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 p-4">
        <Card className="max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white mb-2">
            Verification In Progress
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 mb-6">
            Your documents have been submitted and are being reviewed. This usually takes 1-2 business days.
          </p>
          <Link href="/dashboard">
            <Button variant="outline">Go to Dashboard</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const totalSteps = 4;
  const progressPercent = (step / totalSteps) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 dark:from-neutral-900 dark:via-neutral-950 dark:to-neutral-900 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>

        <Card>
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
              Verify Your Identity
            </h1>
            <p className="text-neutral-500 dark:text-neutral-400 mt-2">
              Complete verification to start borrowing
            </p>
          </div>

          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-neutral-500 dark:text-neutral-400 mb-2">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progressPercent)}% complete</span>
            </div>
            <div className="h-2 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary-500 dark:bg-primary-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step indicators */}
          <div className="flex items-center justify-between mb-6 px-4">
            {[
              { num: 1, icon: User, label: 'Identity' },
              { num: 2, icon: Briefcase, label: 'Employment' },
              { num: 3, icon: MapPin, label: 'Address' },
              { num: 4, icon: FileText, label: 'Review' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div className={`flex flex-col items-center ${step >= s.num ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-400 dark:text-neutral-500'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step > s.num ? 'bg-green-500 dark:bg-green-600 text-white' : 
                    step === s.num ? 'bg-primary-500 dark:bg-primary-600 text-white' : 'bg-neutral-200 dark:bg-neutral-700'
                  }`}>
                    {step > s.num ? <CheckCircle className="w-5 h-5" /> : <s.icon className="w-4 h-4" />}
                  </div>
                  <span className="text-xs mt-1 hidden sm:block">{s.label}</span>
                </div>
                {idx < 3 && <div className="flex-1 h-0.5 bg-neutral-200 dark:bg-neutral-700 mx-2" />}
              </React.Fragment>
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Identity */}
            {step === 1 && (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <User className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Proof of Identity</h3>
                </div>

                <Select
                  label="ID Type *"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  options={idTypes}
                />

                <Input
                  label="ID Number *"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="Enter your ID number"
                />

                <Input
                  label="Expiry Date (if applicable)"
                  type="date"
                  value={idExpiry}
                  onChange={(e) => setIdExpiry(e.target.value)}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Upload ID Document *
                  </label>
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setIdDocumentFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="id-upload"
                    />
                    <label htmlFor="id-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                      {idDocumentFile ? (
                        <p className="text-sm text-primary-600 dark:text-primary-500 font-medium">{idDocumentFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Click to upload</p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">JPG, PNG or PDF (max 5MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Employment */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <Briefcase className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Proof of Employment</h3>
                </div>

                <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-xl mb-4">
                  <p className="text-sm text-blue-800 dark:text-blue-300">
                    <strong>Requirement:</strong> You must have been employed for at least 30 days to be eligible for loans.
                  </p>
                </div>

                <Select
                  label="Employment Status *"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  options={employmentStatuses}
                />

                <Input
                  label="Employer/Business Name *"
                  value={employerName}
                  onChange={(e) => setEmployerName(e.target.value)}
                  placeholder="Enter employer or business name"
                />

                <Input
                  label="Employer Address"
                  value={employerAddress}
                  onChange={(e) => setEmployerAddress(e.target.value)}
                  placeholder="Enter employer address"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Employment Start Date *"
                    type="date"
                    value={employmentStartDate}
                    onChange={(e) => setEmploymentStartDate(e.target.value)}
                  />
                  <Input
                    label="Monthly Income"
                    type="number"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(e.target.value)}
                    placeholder="e.g., 5000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Upload Employment Proof *
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Pay stub, employment letter, or business registration
                  </p>
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setEmploymentDocumentFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="employment-upload"
                    />
                    <label htmlFor="employment-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                      {employmentDocumentFile ? (
                        <p className="text-sm text-primary-600 dark:text-primary-500 font-medium">{employmentDocumentFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Click to upload</p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">JPG, PNG or PDF (max 5MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Address */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(2); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <MapPin className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Proof of Address</h3>
                </div>

                <Input
                  label="Address Line 1 *"
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="Street address"
                />

                <Input
                  label="Address Line 2"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="Apartment, suite, etc."
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="City *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                  <Input
                    label="State/Province"
                    value={stateProvince}
                    onChange={(e) => setStateProvince(e.target.value)}
                    placeholder="State or province"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postal Code"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="ZIP / Postal code"
                  />
                  <Select
                    label="Country *"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    options={countries}
                  />
                </div>

                <Select
                  label="Address Document Type *"
                  value={addressDocumentType}
                  onChange={(e) => setAddressDocumentType(e.target.value)}
                  options={addressDocumentTypes}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Upload Address Proof *
                  </label>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
                    Document must be dated within the last 3 months
                  </p>
                  <div className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl p-6 text-center hover:border-primary-400 dark:hover:border-primary-500 transition-colors">
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setAddressDocumentFile(e.target.files?.[0] || null)}
                      className="hidden"
                      id="address-upload"
                    />
                    <label htmlFor="address-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 text-neutral-400 dark:text-neutral-500 mx-auto mb-2" />
                      {addressDocumentFile ? (
                        <p className="text-sm text-primary-600 dark:text-primary-500 font-medium">{addressDocumentFile.name}</p>
                      ) : (
                        <>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">Click to upload</p>
                          <p className="text-xs text-neutral-400 dark:text-neutral-500">JPG, PNG or PDF (max 5MB)</p>
                        </>
                      )}
                    </label>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep}>
                    Continue
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Review & Accept */}
            {step === 4 && (
              <div className="space-y-4 animate-fade-in">
                <button
                  type="button"
                  onClick={() => { setStep(3); setError(null); }}
                  className="flex items-center gap-1 text-sm text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 mb-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>

                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-5 h-5 text-primary-600 dark:text-primary-500" />
                  <h3 className="font-semibold text-neutral-900 dark:text-white">Review & Submit</h3>
                </div>

                {/* Summary */}
                <div className="space-y-4">
                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                      <User className="w-4 h-4" /> Identity
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {idTypes.find(t => t.value === idType)?.label}: {idNumber}
                    </p>
                    {idDocumentFile && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Document uploaded</p>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4" /> Employment
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {employmentStatuses.find(s => s.value === employmentStatus)?.label} at {employerName}
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Since {employmentStartDate}</p>
                    {employmentDocumentFile && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Document uploaded</p>
                    )}
                  </div>

                  <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                    <h4 className="font-medium text-neutral-900 dark:text-white mb-2 flex items-center gap-2">
                      <MapPin className="w-4 h-4" /> Address
                    </h4>
                    <p className="text-sm text-neutral-600 dark:text-neutral-300">
                      {addressLine1}, {city}, {countries.find(c => c.value === country)?.label}
                    </p>
                    {addressDocumentFile && (
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Document uploaded</p>
                    )}
                  </div>
                </div>

                {/* Terms */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50 rounded-xl p-4 mb-4 max-h-48 overflow-y-auto text-sm text-neutral-600 dark:text-neutral-400">
                  <h4 className="font-semibold text-neutral-900 dark:text-white mb-2">Terms & Conditions</h4>
                  <p className="mb-2">By submitting this verification, you agree to:</p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>All information provided is accurate and truthful</li>
                    <li>Feyza may verify this information with third parties</li>
                    <li>Any false information may result in account suspension</li>
                    <li>You will repay any loans according to agreed terms</li>
                    <li>Feyza may report defaulted loans to credit bureaus</li>
                    <li>You are of legal age to enter into loan agreements</li>
                  </ul>
                </div>

                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 dark:text-primary-500 focus:ring-primary-500 dark:focus:ring-primary-400 bg-white dark:bg-neutral-800"
                  />
                  <span className="text-sm text-neutral-700 dark:text-neutral-300">
                    I confirm that all information provided is accurate and I agree to the <strong>Terms & Conditions</strong>.
                  </span>
                </label>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    loading={saving} 
                    className="w-full"
                    disabled={!termsAccepted}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Submit Verification
                  </Button>
                </div>
              </div>
            )}
          </form>

          <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center mt-6">
            Your documents will be reviewed within 1-2 business days.
          </p>
        </Card>
      </div>
    </div>
  );
}