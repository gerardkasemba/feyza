-- Supabase Storage Policies for Documents Bucket
-- Run this in your Supabase SQL Editor after creating the 'documents' bucket

-- First, make sure the bucket exists and is public
-- Go to Supabase Dashboard > Storage > Create bucket named 'documents'
-- Check "Public bucket" option

-- Policy: Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload their own documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access (since bucket is public)
CREATE POLICY "Public read access for documents"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'documents');

-- Alternative: If you want only authenticated users to view documents
-- CREATE POLICY "Authenticated users can read documents"
-- ON storage.objects
-- FOR SELECT
-- TO authenticated
-- USING (bucket_id = 'documents');
