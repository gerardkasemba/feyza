-- Migration: Storage policies for KYC documents bucket
-- Run this in Supabase Dashboard > SQL Editor

-- First, create the bucket if it doesn't exist (run in Storage settings)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', false);

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can upload own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own KYC docs" ON storage.objects;
DROP POLICY IF EXISTS "Admins can view all KYC docs" ON storage.objects;

-- Policy: Users can upload their own KYC documents
CREATE POLICY "Users can upload own KYC docs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own KYC documents
CREATE POLICY "Users can view own KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own KYC documents
CREATE POLICY "Users can update own KYC docs"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own KYC documents
CREATE POLICY "Users can delete own KYC docs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admins can view all KYC documents
CREATE POLICY "Admins can view all KYC docs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents' 
  AND EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND is_admin = true
  )
);

-- Alternative: Make bucket public for easier access (less secure but simpler)
-- UPDATE storage.buckets SET public = true WHERE id = 'kyc-documents';
