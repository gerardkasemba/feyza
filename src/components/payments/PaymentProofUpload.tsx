'use client';

import React, { useState } from 'react';
import { Card, Button, Input } from '@/components/ui';
import { createClient } from '@/lib/supabase/client';
import {
  Upload,
  Camera,
  FileText,
  Hash,
  Check,
  Loader2,
  AlertCircle,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface PaymentProofUploadProps {
  loanId: string;
  paymentScheduleId?: string;
  paymentProviderId: string;
  providerName: string;
  amount: number;
  currency: string;
  transactionType: 'disbursement' | 'repayment';
  receiverIdentifier?: string; // $cashtag, phone number, etc.
  onSuccess: (transaction: any) => void;
  onCancel?: () => void;
}

type ProofType = 'screenshot' | 'receipt' | 'reference_number' | 'photo';

export default function PaymentProofUpload({
  loanId,
  paymentScheduleId,
  paymentProviderId,
  providerName,
  amount,
  currency,
  transactionType,
  receiverIdentifier,
  onSuccess,
  onCancel,
}: PaymentProofUploadProps) {
  const supabase = createClient();
  
  const [proofType, setProofType] = useState<ProofType>('screenshot');
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        setError('Please upload an image (JPG, PNG, GIF) or PDF');
        return;
      }
      
      // Validate file size (max 10MB)
      if (selectedFile.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      setFile(selectedFile);
      setError(null);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setFilePreview(e.target?.result as string);
        reader.readAsDataURL(selectedFile);
      } else {
        setFilePreview(null);
      }
    }
  };

  const removeFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `payment-proofs/${loanId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('payment-proofs')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('payment-proofs')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate
    if (proofType !== 'reference_number' && !file) {
      setError('Please upload proof of payment');
      return;
    }
    if (proofType === 'reference_number' && !referenceNumber.trim()) {
      setError('Please enter the transaction reference number');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Upload file if provided
      let proofUrl = null;
      if (file) {
        proofUrl = await uploadFile(file);
        if (!proofUrl) {
          throw new Error('Failed to upload file');
        }
      }

      // Submit payment proof
      const response = await fetch('/api/payments/proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loan_id: loanId,
          payment_schedule_id: paymentScheduleId,
          payment_provider_id: paymentProviderId,
          amount,
          currency,
          transaction_type: transactionType,
          proof_type: proofType,
          proof_url: proofUrl,
          proof_reference: referenceNumber || null,
          description,
          receiver_payment_identifier: receiverIdentifier,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit payment proof');
      }

      onSuccess(data.transaction);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const proofTypeOptions = [
    { value: 'screenshot', label: 'Screenshot', icon: Camera, description: 'Screenshot of payment confirmation' },
    { value: 'receipt', label: 'Receipt', icon: FileText, description: 'Digital or paper receipt' },
    { value: 'reference_number', label: 'Reference #', icon: Hash, description: 'Transaction ID or confirmation code' },
    { value: 'photo', label: 'Photo', icon: ImageIcon, description: 'Photo of cash or receipt' },
  ];

  return (
    <Card className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
          Upload Payment Proof
        </h3>
        <p className="text-sm text-neutral-500 mt-1">
          Confirm you sent {currency} {amount.toLocaleString()} via {providerName}
          {receiverIdentifier && ` to ${receiverIdentifier}`}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Proof Type Selection */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Type of Proof
          </label>
          <div className="grid grid-cols-2 gap-2">
            {proofTypeOptions.map(option => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setProofType(option.value as ProofType)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    proofType === option.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${proofType === option.value ? 'text-primary-600' : 'text-neutral-500'}`} />
                    <span className={`text-sm font-medium ${proofType === option.value ? 'text-primary-700' : 'text-neutral-700'}`}>
                      {option.label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* File Upload (for screenshot, receipt, photo) */}
        {proofType !== 'reference_number' && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Upload {proofType === 'screenshot' ? 'Screenshot' : proofType === 'receipt' ? 'Receipt' : 'Photo'}
            </label>
            
            {!file ? (
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-neutral-300 rounded-xl p-8 text-center hover:border-primary-400 hover:bg-primary-50/50 transition-all">
                  <Upload className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
                  <p className="text-sm text-neutral-600">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-neutral-400 mt-1">
                    PNG, JPG, GIF or PDF up to 10MB
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="relative border border-neutral-200 rounded-xl p-4">
                <button
                  type="button"
                  onClick={removeFile}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-100 hover:bg-red-200 rounded-full flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-red-600" />
                </button>

                {filePreview ? (
                  <img
                    src={filePreview}
                    alt="Payment proof preview"
                    className="max-h-48 mx-auto rounded-lg"
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-neutral-400" />
                    <div>
                      <p className="text-sm font-medium text-neutral-700">{file.name}</p>
                      <p className="text-xs text-neutral-500">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Reference Number Input */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Transaction Reference / Confirmation Code
            {proofType === 'reference_number' ? ' *' : ' (Optional)'}
          </label>
          <Input
            type="text"
            value={referenceNumber}
            onChange={(e) => setReferenceNumber(e.target.value)}
            placeholder="e.g., TXN123456, M-Pesa Code, etc."
            required={proofType === 'reference_number'}
          />
          <p className="text-xs text-neutral-500 mt-1">
            The transaction ID or confirmation code from {providerName}
          </p>
        </div>

        {/* Description (Optional) */}
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Note (Optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Any additional details about this payment..."
            rows={2}
            className="w-full px-4 py-2.5 border border-neutral-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={uploading} className="flex-1">
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Submit Proof
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Info */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-700">
          <strong>What happens next?</strong> The recipient will be notified to confirm they received the payment. 
          Once confirmed, the payment will be marked as complete.
        </p>
      </div>
    </Card>
  );
}
