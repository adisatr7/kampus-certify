-- Check storage bucket configuration

-- 1. Check if signed-documents bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'signed-documents';

-- 2. Check storage policies for signed-documents
SELECT 
  id,
  name,
  bucket_id,
  definition
FROM storage.policies
WHERE bucket_id = 'signed-documents';

-- 3. List all buckets
SELECT 
  id,
  name,
  public,
  file_size_limit
FROM storage.buckets
ORDER BY created_at DESC;

-- 4. Check recent uploads to signed-documents
SELECT 
  name,
  bucket_id,
  owner,
  created_at,
  updated_at,
  last_accessed_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'signed-documents'
ORDER BY created_at DESC
LIMIT 10;

-- 5. Check storage quota usage
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  SUM((metadata->>'size')::bigint) as total_size_bytes,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
GROUP BY bucket_id
ORDER BY total_size_bytes DESC;

-- ============================================
-- CREATE BUCKET IF NOT EXISTS
-- ============================================
-- Run this if bucket doesn't exist:

/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  true,
  52428800, -- 50MB
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- CREATE STORAGE POLICIES
-- ============================================
-- Run these if policies don't exist:

/*
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload signed documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'signed-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Allow users to read their own signed documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'signed-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow public to read all signed documents (for verification)
CREATE POLICY "Allow public to read signed documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signed-documents');

-- Allow authenticated users to update their own files
CREATE POLICY "Allow users to update their own signed documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'signed-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Allow users to delete their own signed documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'signed-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
*/
