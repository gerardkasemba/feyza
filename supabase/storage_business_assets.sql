-- =====================================================
-- STORAGE BUCKET SETUP FOR BUSINESS LOGOS
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. First, create the bucket (if not already created via Dashboard)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'business-assets',
  'business-assets',
  true,  -- Public bucket
  2097152,  -- 2MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Allow anyone to view/download files (public bucket)
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-assets');

-- 3. Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-assets'
  AND auth.role() = 'authenticated'
);

-- 4. Allow users to update their own files
CREATE POLICY "Users can update own logos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'business-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'business-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 5. Allow users to delete their own files
CREATE POLICY "Users can delete own logos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-assets'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =====================================================
-- ALTERNATIVE: Simpler policies (if above doesn't work)
-- =====================================================

-- Drop existing policies first if needed:
-- DROP POLICY IF EXISTS "Public Access" ON storage.objects;
-- DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can update own logos" ON storage.objects;
-- DROP POLICY IF EXISTS "Users can delete own logos" ON storage.objects;

-- Simple policy: Allow all authenticated users to do everything
-- CREATE POLICY "Allow authenticated users full access"
-- ON storage.objects
-- FOR ALL
-- USING (bucket_id = 'business-assets' AND auth.role() = 'authenticated')
-- WITH CHECK (bucket_id = 'business-assets' AND auth.role() = 'authenticated');
