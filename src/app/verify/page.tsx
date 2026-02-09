'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Input, Select } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import { 
  ArrowLeft, Shield, User, Briefcase, MapPin, FileText, 
  CheckCircle, ChevronRight, ChevronLeft, AlertCircle,
  Upload, Calendar, Camera, X, Lock, Clock, Smartphone,
  CreditCard, RefreshCw, Info, Fingerprint, ShieldCheck, 
  UserCheck, Eye, EyeOff, HelpCircle, Loader2
} from 'lucide-react';

// Step configuration
const STEPS = [
  { id: 1, name: 'Personal', icon: User, description: 'Basic info' },
  { id: 2, name: 'Identity', icon: CreditCard, description: 'ID document' },
  { id: 3, name: 'Selfie', icon: Camera, description: 'Photo verification' },
  { id: 4, name: 'Employment', icon: Briefcase, description: 'Income proof' },
  { id: 5, name: 'Address', icon: MapPin, description: 'Residence' },
  { id: 6, name: 'Review', icon: CheckCircle, description: 'Submit' },
];

// ID document types
const ID_TYPES = [
  { value: '', label: 'Select ID type' },
  { value: 'passport', label: '🛂 Passport' },
  { value: 'national_id', label: '🪪 National ID Card' },
  { value: 'drivers_license', label: '🚗 Driver\'s License' },
  { value: 'residence_permit', label: '📄 Residence Permit' },
];

// Employment statuses
const EMPLOYMENT_STATUSES = [
  { value: '', label: 'Select status' },
  { value: 'employed_fulltime', label: 'Full-time Employee' },
  { value: 'employed_parttime', label: 'Part-time Employee' },
  { value: 'self_employed', label: 'Self-Employed / Freelancer' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'contractor', label: 'Independent Contractor' },
  { value: 'retired', label: 'Retired' },
  { value: 'student', label: 'Student' },
  { value: 'unemployed', label: 'Currently Unemployed' },
];

// Income ranges
const INCOME_RANGES = [
  { value: '', label: 'Select range' },
  { value: '0-1000', label: '$0 - $1,000/month' },
  { value: '1000-2500', label: '$1,000 - $2,500/month' },
  { value: '2500-5000', label: '$2,500 - $5,000/month' },
  { value: '5000-10000', label: '$5,000 - $10,000/month' },
  { value: '10000+', label: '$10,000+/month' },
];

// Address document types
const ADDRESS_DOC_TYPES = [
  { value: '', label: 'Select document type' },
  { value: 'utility_bill', label: '💡 Utility Bill (last 3 months)' },
  { value: 'bank_statement', label: '🏦 Bank Statement (last 3 months)' },
  { value: 'lease_agreement', label: '📋 Lease / Rental Agreement' },
  { value: 'government_letter', label: '📬 Government Letter' },
  { value: 'tax_document', label: '📊 Tax Document' },
];

// Countries
const COUNTRIES = [
  { value: '', label: 'Select country' },
  { value: 'US', label: '🇺🇸 United States' },
  { value: 'GB', label: '🇬🇧 United Kingdom' },
  { value: 'CA', label: '🇨🇦 Canada' },
  { value: 'NG', label: '🇳🇬 Nigeria' },
  { value: 'KE', label: '🇰🇪 Kenya' },
  { value: 'GH', label: '🇬🇭 Ghana' },
  { value: 'ZA', label: '🇿🇦 South Africa' },
  { value: 'IN', label: '🇮🇳 India' },
  { value: 'PH', label: '🇵🇭 Philippines' },
  { value: 'MX', label: '🇲🇽 Mexico' },
  { value: 'AU', label: '🇦🇺 Australia' },
  { value: 'DE', label: '🇩🇪 Germany' },
  { value: 'FR', label: '🇫🇷 France' },
  { value: 'OTHER', label: '🌍 Other' },
];

// US States
const US_STATES = [
  { value: '', label: 'Select state' },
  { value: 'AL', label: 'Alabama' }, { value: 'AK', label: 'Alaska' }, { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' }, { value: 'CA', label: 'California' }, { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' }, { value: 'DE', label: 'Delaware' }, { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' }, { value: 'HI', label: 'Hawaii' }, { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' }, { value: 'IN', label: 'Indiana' }, { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' }, { value: 'KY', label: 'Kentucky' }, { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' }, { value: 'MD', label: 'Maryland' }, { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' }, { value: 'MN', label: 'Minnesota' }, { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' }, { value: 'MT', label: 'Montana' }, { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' }, { value: 'NH', label: 'New Hampshire' }, { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' }, { value: 'NY', label: 'New York' }, { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' }, { value: 'OH', label: 'Ohio' }, { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' }, { value: 'PA', label: 'Pennsylvania' }, { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' }, { value: 'SD', label: 'South Dakota' }, { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' }, { value: 'UT', label: 'Utah' }, { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' }, { value: 'WA', label: 'Washington' }, { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' }, { value: 'WY', label: 'Wyoming' }, { value: 'DC', label: 'Washington D.C.' },
];

export default function VerificationPage() {
  const router = useRouter();
  const supabase = createClient();
  
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  
  // Re-verification state
  const [isReverification, setIsReverification] = useState(false);
  const [lastVerifiedAt, setLastVerifiedAt] = useState<string | null>(null);
  
  // Camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Step 1: Personal Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [ssn, setSsn] = useState('');
  const [showSsn, setShowSsn] = useState(false);
  
  // Step 2: Identity
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [idExpiry, setIdExpiry] = useState('');
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);

  // Step 3: Selfie
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);

  // Step 4: Employment
  const [employmentStatus, setEmploymentStatus] = useState('');
  const [employerName, setEmployerName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [employmentStartDate, setEmploymentStartDate] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState('');
  const [employmentDocFile, setEmploymentDocFile] = useState<File | null>(null);
  const [employmentDocPreview, setEmploymentDocPreview] = useState<string | null>(null);

  // Step 5: Address
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [addressDocType, setAddressDocType] = useState('');
  const [addressDocFile, setAddressDocFile] = useState<File | null>(null);
  const [addressDocPreview, setAddressDocPreview] = useState<string | null>(null);

  // Step 6: Terms
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Load user data
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        router.push('/auth/signin');
        return;
      }
      
      setUser(authUser);

      const { data: profileData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
        
        // Check if re-verification needed (every 3 months)
        if (profileData.verification_status === 'verified' && profileData.verified_at) {
          const verifiedDate = new Date(profileData.verified_at);
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
          
          if (verifiedDate < threeMonthsAgo) {
            setIsReverification(true);
            setLastVerifiedAt(profileData.verified_at);
            // For re-verification, skip to selfie step
            setStep(3);
          } else {
            // Already verified and not due
            router.push('/dashboard');
            return;
          }
        }

        // Pre-fill data
        if (profileData.full_name) {
          const names = profileData.full_name.split(' ');
          setFirstName(names[0] || '');
          setLastName(names.slice(1).join(' ') || '');
        }
        if (profileData.date_of_birth) setDateOfBirth(profileData.date_of_birth);
        if (profileData.phone_number) setPhoneNumber(profileData.phone_number);
        if (profileData.id_type) setIdType(profileData.id_type);
        if (profileData.id_number) setIdNumber(profileData.id_number);
        if (profileData.employment_status) setEmploymentStatus(profileData.employment_status);
        if (profileData.employer_name) setEmployerName(profileData.employer_name);
        if (profileData.address_line1) setAddressLine1(profileData.address_line1);
        if (profileData.city) setCity(profileData.city);
        if (profileData.state_province) setStateProvince(profileData.state_province);
        if (profileData.postal_code) setPostalCode(profileData.postal_code);
        if (profileData.country) setCountry(profileData.country);
      }
      
      setLoading(false);
    };

    checkAuth();
  }, [router, supabase]);

  // Camera functions
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraActive(true);
      }
    } catch (err) {
      setCameraError('Camera access denied. Please allow camera or upload a photo instead.');
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: 'image/jpeg' });
            setSelfieFile(file);
            setSelfiePreview(canvas.toDataURL('image/jpeg'));
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  }, [stopCamera]);

  // File upload handler
  const handleFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (f: File | null) => void,
    setPreview: (p: string | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('File must be less than 10MB');
        return;
      }
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setPreview(reader.result as string);
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  // Validation
  const validateStep = (stepNum: number): boolean => {
    setError(null);
    
    switch (stepNum) {
      case 1:
        if (!firstName.trim()) { setError('First name is required'); return false; }
        if (!lastName.trim()) { setError('Last name is required'); return false; }
        if (!dateOfBirth) { setError('Date of birth is required'); return false; }
        const dob = new Date(dateOfBirth);
        const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
        if (age < 18) { setError('You must be 18 or older'); return false; }
        if (!phoneNumber.trim()) { setError('Phone number is required'); return false; }
        if (country === 'US' && ssn.length !== 4) { setError('Last 4 digits of SSN required'); return false; }
        return true;

      case 2:
        if (!idType) { setError('Please select ID type'); return false; }
        if (!idNumber.trim()) { setError('ID number is required'); return false; }
        if (!idFrontFile && !profile?.id_front_url) { setError('Please upload front of ID'); return false; }
        if ((idType === 'drivers_license' || idType === 'national_id') && !idBackFile && !profile?.id_back_url) {
          setError('Please upload back of ID');
          return false;
        }
        return true;

      case 3:
        if (!selfieFile && !profile?.selfie_url) { setError('Please take or upload a selfie'); return false; }
        return true;

      case 4:
        if (!employmentStatus) { setError('Select employment status'); return false; }
        if (employmentStatus !== 'unemployed' && employmentStatus !== 'student' && employmentStatus !== 'retired') {
          if (!employerName.trim()) { setError('Employer name is required'); return false; }
        }
        if (!monthlyIncome) { setError('Select income range'); return false; }
        return true;

      case 5:
        if (!addressLine1.trim()) { setError('Address is required'); return false; }
        if (!city.trim()) { setError('City is required'); return false; }
        if (!country) { setError('Country is required'); return false; }
        if (!postalCode.trim()) { setError('Postal code is required'); return false; }
        if (!addressDocType) { setError('Select document type'); return false; }
        if (!addressDocFile && !profile?.address_document_url) { setError('Upload address proof'); return false; }
        return true;

      case 6:
        if (!termsAccepted) { setError('Accept terms to continue'); return false; }
        if (!privacyAccepted) { setError('Accept privacy policy'); return false; }
        return true;

      default:
        return true;
    }
  };

  const goToNextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, STEPS.length));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrevStep = () => {
    setError(null);
    // For re-verification, don't go back past selfie step
    if (isReverification && step <= 3) return;
    setStep(s => Math.max(s - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(6)) return;

    setSaving(true);
    setError(null);

    try {
      const uploadFile = async (file: File | null, path: string): Promise<string | null> => {
        if (!file) return null;
        const ext = file.name.split('.').pop();
        const fileName = `${user.id}/${path}-${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('kyc-documents')
          .upload(fileName, file, { upsert: true });
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage.from('kyc-documents').getPublicUrl(fileName);
        return publicUrl;
      };

      const [idFrontUrl, idBackUrl, selfieUrl, empDocUrl, addrDocUrl] = await Promise.all([
        uploadFile(idFrontFile, 'id-front'),
        uploadFile(idBackFile, 'id-back'),
        uploadFile(selfieFile, 'selfie'),
        uploadFile(employmentDocFile, 'employment'),
        uploadFile(addressDocFile, 'address'),
      ]);

      const updateData: any = {
        verification_status: 'pending',
        verification_submitted_at: new Date().toISOString(),
        terms_accepted_at: new Date().toISOString(),
      };

      // Only update fields if not re-verification (or if they're new)
      if (!isReverification) {
        Object.assign(updateData, {
          full_name: `${firstName} ${lastName}`.trim(),
          date_of_birth: dateOfBirth,
          phone_number: phoneNumber,
          ssn_last4: country === 'US' ? ssn : null,
          id_type: idType,
          id_number: idNumber,
          id_expiry: idExpiry || null,
          employment_status: employmentStatus,
          employer_name: employerName || null,
          job_title: jobTitle || null,
          employment_start_date: employmentStartDate || null,
          monthly_income_range: monthlyIncome,
          address_line1: addressLine1,
          address_line2: addressLine2 || null,
          city: city,
          state_province: stateProvince || null,
          postal_code: postalCode,
          country: country,
          address_document_type: addressDocType,
        });
      }

      // Always update document URLs if new ones were uploaded
      if (idFrontUrl) updateData.id_front_url = idFrontUrl;
      if (idBackUrl) updateData.id_back_url = idBackUrl;
      if (selfieUrl) updateData.selfie_url = selfieUrl;
      if (empDocUrl) updateData.employment_document_url = empDocUrl;
      if (addrDocUrl) updateData.address_document_url = addrDocUrl;

      const { error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id);

      if (updateError) throw updateError;

      router.push('/verify/pending');
    } catch (err: any) {
      setError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-50 to-neutral-100 dark:from-neutral-950 dark:to-neutral-900">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary-500 animate-spin mx-auto mb-4" />
          <p className="text-neutral-500">Loading...</p>
        </div>
      </div>
    );
  }

  // For re-verification, show simplified flow
  const effectiveSteps = isReverification 
    ? [STEPS[2], STEPS[5]] // Only Selfie and Review for re-verification
    : STEPS;

  const currentStepIndex = isReverification 
    ? (step === 3 ? 0 : 1) 
    : step - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-white to-neutral-100 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white">
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-neutral-900 dark:text-white">
              {isReverification ? 'Re-verification' : 'Identity Verification'}
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Lock className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Encrypted</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 sm:py-10">
        {/* Re-verification Banner */}
        {isReverification && (
          <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
            <div className="flex items-start gap-3">
              <RefreshCw className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-amber-800 dark:text-amber-300">Periodic Re-verification</h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                  Your verification expired. Take a new selfie to continue using Feyza.
                  {lastVerifiedAt && ` Last verified: ${new Date(lastVerifiedAt).toLocaleDateString()}`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Progress Stepper */}
        {!isReverification && (
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              <div className="absolute top-5 left-0 right-0 h-0.5 bg-neutral-200 dark:bg-neutral-800" />
              <div 
                className="absolute top-5 left-0 h-0.5 bg-primary-500 transition-all duration-500"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
              
              {STEPS.map((s) => {
                const isCompleted = step > s.id;
                const isCurrent = step === s.id;
                const Icon = s.icon;
                
                return (
                  <div key={s.id} className="relative flex flex-col items-center z-10">
                    <button
                      onClick={() => isCompleted && setStep(s.id)}
                      disabled={!isCompleted}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isCompleted 
                          ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30 cursor-pointer' 
                          : isCurrent 
                            ? 'bg-white dark:bg-neutral-800 border-2 border-primary-500 text-primary-600 shadow-lg'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </button>
                    <span className={`mt-2 text-xs font-medium hidden sm:block ${
                      isCurrent ? 'text-primary-600' : 'text-neutral-500'
                    }`}>
                      {s.name}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <p className="mt-4 text-center text-sm text-primary-600 sm:hidden">
              Step {step} of {STEPS.length}: {STEPS[step - 1].name}
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
            <button onClick={() => setError(null)}>
              <X className="w-4 h-4 text-red-400" />
            </button>
          </div>
        )}

        {/* Form Card */}
        <Card className="p-6 sm:p-8 shadow-xl border-0">
          <form onSubmit={handleSubmit}>
            {/* Step 1: Personal Info */}
            {step === 1 && !isReverification && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <User className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Personal Information</h2>
                    <p className="text-sm text-neutral-500">Basic details about you</p>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="John"
                  />
                  <Input
                    label="Last Name *"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                  />
                </div>

                <Input
                  label="Date of Birth *"
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                />

                <Input
                  label="Phone Number *"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 123-4567"
                />

                <Select
                  label="Country *"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  options={COUNTRIES}
                />

                {country === 'US' && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                      SSN (Last 4 digits) *
                    </label>
                    <div className="relative">
                      <input
                        type={showSsn ? 'text' : 'password'}
                        value={ssn}
                        onChange={(e) => setSsn(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        maxLength={4}
                        className="w-full px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSsn(!showSsn)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                      >
                        {showSsn ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500 flex items-center gap-1">
                      <Lock className="w-3 h-3" />
                      Required for US residents. Encrypted and secure.
                    </p>
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep} className="min-w-[140px]">
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Identity Document */}
            {step === 2 && !isReverification && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button type="button" onClick={goToPrevStep} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <CreditCard className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Identity Document</h2>
                    <p className="text-sm text-neutral-500">Upload a government-issued ID</p>
                  </div>
                </div>

                <Select
                  label="ID Type *"
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  options={ID_TYPES}
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="ID Number *"
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="Enter ID number"
                  />
                  <Input
                    label="Expiry Date"
                    type="date"
                    value={idExpiry}
                    onChange={(e) => setIdExpiry(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>

                {/* ID Front */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    ID Front Side *
                  </label>
                  {idFrontPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img src={idFrontPreview} alt="ID Front" className="w-full h-48 object-contain bg-neutral-100 dark:bg-neutral-800" />
                      <button
                        type="button"
                        onClick={() => { setIdFrontFile(null); setIdFrontPreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all">
                      <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Upload front of ID</span>
                      <span className="text-xs text-neutral-400 mt-1">PNG, JPG (max 10MB)</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setIdFrontFile, setIdFrontPreview)} className="hidden" />
                    </label>
                  )}
                </div>

                {/* ID Back (for DL and National ID) */}
                {(idType === 'drivers_license' || idType === 'national_id') && (
                  <div>
                    <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                      ID Back Side *
                    </label>
                    {idBackPreview ? (
                      <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                        <img src={idBackPreview} alt="ID Back" className="w-full h-48 object-contain bg-neutral-100 dark:bg-neutral-800" />
                        <button
                          type="button"
                          onClick={() => { setIdBackFile(null); setIdBackPreview(null); }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all">
                        <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">Upload back of ID</span>
                        <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setIdBackFile, setIdBackPreview)} className="hidden" />
                      </label>
                    )}
                  </div>
                )}

                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                  <h4 className="font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4" /> Photo Tips
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• All corners visible</li>
                    <li>• Text readable, not blurry</li>
                    <li>• No glare or shadows</li>
                  </ul>
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep} className="min-w-[140px]">
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Selfie */}
            {step === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {!isReverification && (
                  <button type="button" onClick={goToPrevStep} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2">
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                )}

                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                    <Camera className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Selfie Verification</h2>
                    <p className="text-sm text-neutral-500">
                      {isReverification ? 'Take a new selfie to confirm your identity' : 'Hold your ID next to your face'}
                    </p>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
                  <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-3 flex items-center gap-2">
                    <UserCheck className="w-5 h-5" /> How to take the photo
                  </h4>
                  <div className="grid sm:grid-cols-2 gap-3 text-sm text-purple-700 dark:text-purple-400">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-bold">1</div>
                      <span>{isReverification ? 'Face the camera directly' : 'Hold ID next to your face'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-bold">2</div>
                      <span>Use good lighting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-bold">3</div>
                      <span>{isReverification ? 'Keep neutral expression' : 'Face and ID clearly visible'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center text-xs font-bold">4</div>
                      <span>Remove glasses/hats</span>
                    </div>
                  </div>
                </div>

                {/* Camera or Upload */}
                {cameraActive ? (
                  <div className="relative rounded-xl overflow-hidden">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-72 object-cover bg-black transform scale-x-[-1]"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-3">
                      <Button type="button" onClick={capturePhoto} className="shadow-lg">
                        <Camera className="w-5 h-5 mr-2" /> Capture
                      </Button>
                      <Button type="button" variant="outline" onClick={stopCamera} className="bg-white/90 dark:bg-neutral-900/90">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : selfiePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                    <img src={selfiePreview} alt="Selfie" className="w-full h-72 object-cover" />
                    <button
                      type="button"
                      onClick={() => { setSelfieFile(null); setSelfiePreview(null); }}
                      className="absolute top-3 right-3 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 bg-green-500 text-white rounded-full text-sm font-medium flex items-center gap-1">
                      <CheckCircle className="w-4 h-4" /> Photo captured
                    </div>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={startCamera}
                      className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all"
                    >
                      <Camera className="w-10 h-10 text-neutral-400 mb-3" />
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">Use Camera</span>
                      <span className="text-xs text-neutral-500 mt-1">Take photo now</span>
                    </button>
                    
                    <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl hover:border-primary-400 hover:bg-primary-50/50 dark:hover:bg-primary-900/10 transition-all cursor-pointer">
                      <Upload className="w-10 h-10 text-neutral-400 mb-3" />
                      <span className="font-medium text-neutral-700 dark:text-neutral-300">Upload Photo</span>
                      <span className="text-xs text-neutral-500 mt-1">From your device</span>
                      <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, setSelfieFile, setSelfiePreview)} className="hidden" />
                    </label>
                  </div>
                )}

                {cameraError && (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
                    {cameraError}
                  </div>
                )}

                <div className="pt-4 flex justify-end">
                  <Button 
                    type="button" 
                    onClick={() => isReverification ? setStep(6) : goToNextStep()} 
                    className="min-w-[140px]"
                    disabled={!selfieFile && !selfiePreview}
                  >
                    {isReverification ? 'Review' : 'Continue'} <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 4: Employment */}
            {step === 4 && !isReverification && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button type="button" onClick={goToPrevStep} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                    <Briefcase className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Employment & Income</h2>
                    <p className="text-sm text-neutral-500">Your financial situation</p>
                  </div>
                </div>

                <Select
                  label="Employment Status *"
                  value={employmentStatus}
                  onChange={(e) => setEmploymentStatus(e.target.value)}
                  options={EMPLOYMENT_STATUSES}
                />

                {employmentStatus && !['unemployed', 'student', 'retired'].includes(employmentStatus) && (
                  <>
                    <Input
                      label="Employer / Business Name *"
                      value={employerName}
                      onChange={(e) => setEmployerName(e.target.value)}
                      placeholder="Company name"
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Job Title"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        placeholder="Your position"
                      />
                      <Input
                        label="Start Date"
                        type="date"
                        value={employmentStartDate}
                        onChange={(e) => setEmploymentStartDate(e.target.value)}
                        max={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  </>
                )}

                <Select
                  label="Monthly Income Range *"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  options={INCOME_RANGES}
                />

                {/* Employment doc (optional) */}
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Income Proof (optional)
                  </label>
                  <p className="text-xs text-neutral-500 mb-2">Pay stub, bank statement, or employment letter</p>
                  {employmentDocPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img src={employmentDocPreview} alt="Employment Doc" className="w-full h-32 object-contain bg-neutral-100 dark:bg-neutral-800" />
                      <button
                        type="button"
                        onClick={() => { setEmploymentDocFile(null); setEmploymentDocPreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-primary-400 transition-all">
                      <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                      <span className="text-sm text-neutral-500">Click to upload</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setEmploymentDocFile, setEmploymentDocPreview)} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep} className="min-w-[140px]">
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 5: Address */}
            {step === 5 && !isReverification && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button type="button" onClick={goToPrevStep} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">Residential Address</h2>
                    <p className="text-sm text-neutral-500">Where you currently live</p>
                  </div>
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
                  placeholder="Apt, suite, unit (optional)"
                />

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="City *"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="City"
                  />
                  {country === 'US' ? (
                    <Select
                      label="State *"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      options={US_STATES}
                    />
                  ) : (
                    <Input
                      label="State / Province"
                      value={stateProvince}
                      onChange={(e) => setStateProvince(e.target.value)}
                      placeholder="State or province"
                    />
                  )}
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Postal Code *"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder={country === 'US' ? '12345' : 'Postal code'}
                  />
                  <Select
                    label="Country *"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    options={COUNTRIES}
                  />
                </div>

                <Select
                  label="Address Proof Type *"
                  value={addressDocType}
                  onChange={(e) => setAddressDocType(e.target.value)}
                  options={ADDRESS_DOC_TYPES}
                />

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Upload Address Proof *
                  </label>
                  <p className="text-xs text-neutral-500 mb-2">Document dated within last 3 months</p>
                  {addressDocPreview ? (
                    <div className="relative rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-700">
                      <img src={addressDocPreview} alt="Address Doc" className="w-full h-32 object-contain bg-neutral-100 dark:bg-neutral-800" />
                      <button
                        type="button"
                        onClick={() => { setAddressDocFile(null); setAddressDocPreview(null); }}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl cursor-pointer hover:border-primary-400 transition-all">
                      <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                      <span className="text-sm text-neutral-500">Click to upload</span>
                      <input type="file" accept="image/*,.pdf" onChange={(e) => handleFileUpload(e, setAddressDocFile, setAddressDocPreview)} className="hidden" />
                    </label>
                  )}
                </div>

                <div className="pt-4 flex justify-end">
                  <Button type="button" onClick={goToNextStep} className="min-w-[140px]">
                    Continue <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 6: Review */}
            {step === 6 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <button type="button" onClick={() => isReverification ? setStep(3) : goToPrevStep()} className="flex items-center gap-1 text-sm text-neutral-500 hover:text-neutral-700 mb-2">
                  <ChevronLeft className="w-4 h-4" /> Back
                </button>

                <div className="flex items-center gap-3 pb-4 border-b border-neutral-200 dark:border-neutral-800">
                  <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                    <ShieldCheck className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white">
                      {isReverification ? 'Confirm Re-verification' : 'Review & Submit'}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {isReverification ? 'Review your selfie before submitting' : 'Verify your information'}
                    </p>
                  </div>
                </div>

                {/* Summary */}
                {!isReverification ? (
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-neutral-500" />
                          <h4 className="font-medium text-neutral-900 dark:text-white">Personal</h4>
                        </div>
                        <button type="button" onClick={() => setStep(1)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{firstName} {lastName}</p>
                      <p className="text-xs text-neutral-500">{dateOfBirth}</p>
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-neutral-500" />
                          <h4 className="font-medium text-neutral-900 dark:text-white">Identity</h4>
                        </div>
                        <button type="button" onClick={() => setStep(2)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{ID_TYPES.find(t => t.value === idType)?.label?.replace(/^[^\s]+\s/, '')}</p>
                      <p className="text-xs text-neutral-500">{idNumber}</p>
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-neutral-500" />
                          <h4 className="font-medium text-neutral-900 dark:text-white">Employment</h4>
                        </div>
                        <button type="button" onClick={() => setStep(4)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{EMPLOYMENT_STATUSES.find(s => s.value === employmentStatus)?.label}</p>
                      <p className="text-xs text-neutral-500">{employerName || 'N/A'}</p>
                    </div>

                    <div className="p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-neutral-500" />
                          <h4 className="font-medium text-neutral-900 dark:text-white">Address</h4>
                        </div>
                        <button type="button" onClick={() => setStep(5)} className="text-xs text-primary-600 hover:underline">Edit</button>
                      </div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-300">{city}, {stateProvince || country}</p>
                      <p className="text-xs text-neutral-500">{postalCode}</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Your new selfie</h4>
                    {selfiePreview && (
                      <img src={selfiePreview} alt="Selfie" className="w-full h-48 object-cover rounded-lg" />
                    )}
                  </div>
                )}

                {/* Document thumbnails */}
                {!isReverification && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                    <h4 className="font-medium text-green-800 dark:text-green-300 mb-3">Documents Uploaded</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {/* ID Front */}
                      {idFrontPreview && (
                        <div className="relative">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1">ID Front</p>
                          <img src={idFrontPreview} alt="ID Front" className="w-full h-20 object-cover rounded-lg border border-green-200 dark:border-green-800" />
                          <CheckCircle className="absolute bottom-1 right-1 w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                      {/* ID Back */}
                      {idBackPreview && (
                        <div className="relative">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1">ID Back</p>
                          <img src={idBackPreview} alt="ID Back" className="w-full h-20 object-cover rounded-lg border border-green-200 dark:border-green-800" />
                          <CheckCircle className="absolute bottom-1 right-1 w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                      {/* Selfie */}
                      {selfiePreview && (
                        <div className="relative">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1">Selfie</p>
                          <img src={selfiePreview} alt="Selfie" className="w-full h-20 object-cover rounded-lg border border-green-200 dark:border-green-800" />
                          <CheckCircle className="absolute bottom-1 right-1 w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                      {/* Employment Document */}
                      {employmentDocPreview && (
                        <div className="relative">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1">Employment Proof</p>
                          <img src={employmentDocPreview} alt="Employment" className="w-full h-20 object-cover rounded-lg border border-green-200 dark:border-green-800" />
                          <CheckCircle className="absolute bottom-1 right-1 w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                      {/* Address Document */}
                      {addressDocPreview && (
                        <div className="relative">
                          <p className="text-xs text-green-700 dark:text-green-400 mb-1">Address Proof</p>
                          <img src={addressDocPreview} alt="Address" className="w-full h-20 object-cover rounded-lg border border-green-200 dark:border-green-800" />
                          <CheckCircle className="absolute bottom-1 right-1 w-5 h-5 text-green-500 bg-white rounded-full" />
                        </div>
                      )}
                    </div>
                    {/* Show count */}
                    <p className="text-xs text-green-600 dark:text-green-400 mt-3">
                      {[idFrontPreview, idBackPreview, selfiePreview, employmentDocPreview, addressDocPreview].filter(Boolean).length} document(s) ready to upload
                    </p>
                  </div>
                )}

                {/* Terms */}
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      I confirm all information is accurate and agree to the <Link href="/terms" className="text-primary-600 hover:underline">Terms of Service</Link>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <input
                      type="checkbox"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500"
                    />
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      I agree to the <Link href="/privacy" className="text-primary-600 hover:underline">Privacy Policy</Link> and consent to verification
                    </span>
                  </label>
                </div>

                {/* Re-verification info */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start gap-3">
                    <RefreshCw className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-800 dark:text-blue-300">Re-verification Policy</h4>
                      <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">
                        For your security, we require a new selfie every 3 months.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button 
                    type="submit" 
                    loading={saving} 
                    className="w-full h-12 text-base"
                    disabled={!termsAccepted || !privacyAccepted}
                  >
                    <ShieldCheck className="w-5 h-5 mr-2" />
                    {isReverification ? 'Complete Re-verification' : 'Submit Verification'}
                  </Button>
                  <p className="text-xs text-neutral-500 text-center mt-3">
                    Review typically takes 1-2 business days
                  </p>
                </div>
              </div>
            )}
          </form>
        </Card>

        {/* Security Footer */}
        <div className="mt-8 text-center">
          <div className="flex items-center justify-center gap-6 text-xs text-neutral-400">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>256-bit SSL</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Bank-level security</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Fingerprint className="w-3.5 h-3.5" />
              <span>GDPR compliant</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
