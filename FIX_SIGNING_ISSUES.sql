-- Quick fixes untuk common signing issues

-- ============================================
-- FIX 1: Link orphaned sertifikat to documents
-- ============================================
-- Jika ada sertifikat yang document_id-nya tidak valid

-- First, check orphaned sertifikat
SELECT 
  s.id as sertifikat_id,
  s.document_id as invalid_doc_id,
  s.nama_peserta,
  s.created_at
FROM sertifikat s
LEFT JOIN documents d ON s.document_id = d.id
WHERE d.id IS NULL;

-- If found, you can either:
-- Option A: Delete orphaned sertifikat
-- DELETE FROM sertifikat WHERE document_id NOT IN (SELECT id FROM documents);

-- Option B: Create missing documents for orphaned sertifikat
-- (Manual process - need to create documents first)


-- ============================================
-- FIX 2: Add missing metadata to documents
-- ============================================
-- Ensure all pending documents have proper workflow_stage

UPDATE documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{workflow_stage}',
  '"pending_signer1"'::jsonb
)
WHERE status = 'pending'
  AND (metadata IS NULL OR metadata->>'workflow_stage' IS NULL)
  AND title ILIKE '%sertifikat%';

UPDATE documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{workflow_stage}',
  '"dekan_pending"'::jsonb
)
WHERE status = 'pending'
  AND (metadata IS NULL OR metadata->>'workflow_stage' IS NULL)
  AND title ILIKE '%ijazah%';


-- ============================================
-- FIX 3: Ensure signer IDs are set
-- ============================================
-- For sertifikat: set signer1_id to document creator
UPDATE documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{signer1_id}',
  to_jsonb(user_id::text)
)
WHERE status = 'pending'
  AND title ILIKE '%sertifikat%'
  AND (metadata->>'signer1_id' IS NULL);

-- For ijazah: set created_by_id (dekan) to document creator
UPDATE documents
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{created_by_id}',
  to_jsonb(user_id::text)
)
WHERE status = 'pending'
  AND title ILIKE '%ijazah%'
  AND (metadata->>'created_by_id' IS NULL);


-- ============================================
-- FIX 4: Reset stuck documents
-- ============================================
-- If a document is stuck in signing process, reset it

-- Check stuck documents (signed but no file_url)
SELECT 
  id,
  title,
  status,
  file_url,
  metadata->>'workflow_stage' as workflow_stage,
  updated_at
FROM documents
WHERE status = 'signed'
  AND file_url IS NULL
  AND updated_at < NOW() - INTERVAL '1 hour';

-- Reset to pending if needed (uncomment to execute)
/*
UPDATE documents
SET 
  status = 'pending',
  metadata = jsonb_set(
    metadata,
    '{workflow_stage}',
    CASE 
      WHEN title ILIKE '%ijazah%' THEN '"dekan_pending"'::jsonb
      ELSE '"pending_signer1"'::jsonb
    END
  )
WHERE status = 'signed'
  AND file_url IS NULL
  AND updated_at < NOW() - INTERVAL '1 hour';
*/


-- ============================================
-- FIX 5: Ensure RLS policies allow signing
-- ============================================

-- Check if authenticated users can read sertifikat
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'sertifikat' 
    AND cmd = 'SELECT'
    AND roles @> ARRAY['authenticated']
) as sertifikat_read_policy_exists;

-- Check if authenticated users can read ijazah
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'ijazah' 
    AND cmd = 'SELECT'
    AND roles @> ARRAY['authenticated']
) as ijazah_read_policy_exists;

-- Check if authenticated users can read users table
SELECT EXISTS (
  SELECT 1 FROM pg_policies 
  WHERE tablename = 'users' 
    AND cmd = 'SELECT'
    AND roles @> ARRAY['authenticated']
) as users_read_policy_exists;

-- If any of the above returns false, you need to add RLS policies
-- See FIX_IJAZAH_RLS_SIMPLE.sql for policy examples


-- ============================================
-- FIX 6: Clean up duplicate documents
-- ============================================

-- Find duplicate documents (same title, same user, created within 1 minute)
WITH duplicates AS (
  SELECT 
    id,
    title,
    user_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY title, user_id, DATE_TRUNC('minute', created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM documents
  WHERE status = 'pending'
)
SELECT * FROM duplicates WHERE rn > 1;

-- Delete duplicates (uncomment to execute)
/*
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY title, user_id, DATE_TRUNC('minute', created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM documents
  WHERE status = 'pending'
)
DELETE FROM documents
WHERE id IN (SELECT id FROM duplicates WHERE rn > 1);
*/


-- ============================================
-- FIX 7: Verify storage bucket exists
-- ============================================

-- Check if signed-documents bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name = 'signed-documents';

-- If not exists, create it (run in Supabase dashboard)
/*
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-documents', 'signed-documents', true);
*/

-- Add storage policy for signed-documents
/*
CREATE POLICY "Allow authenticated users to upload signed documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'signed-documents');

CREATE POLICY "Allow public to read signed documents"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'signed-documents');
*/


-- ============================================
-- FIX 8: Test specific document
-- ============================================

-- Replace DOCUMENT_ID with actual document ID that's failing
DO $$
DECLARE
  doc_id uuid := 'DOCUMENT_ID'; -- GANTI INI
  doc_exists boolean;
  sert_exists boolean;
  ijazah_exists boolean;
  user_exists boolean;
  has_workflow boolean;
BEGIN
  -- Check document exists
  SELECT EXISTS(SELECT 1 FROM documents WHERE id = doc_id) INTO doc_exists;
  RAISE NOTICE 'Document exists: %', doc_exists;
  
  -- Check sertifikat exists
  SELECT EXISTS(SELECT 1 FROM sertifikat WHERE document_id = doc_id) INTO sert_exists;
  RAISE NOTICE 'Sertifikat exists: %', sert_exists;
  
  -- Check ijazah exists
  SELECT EXISTS(SELECT 1 FROM ijazah WHERE document_id = doc_id) INTO ijazah_exists;
  RAISE NOTICE 'Ijazah exists: %', ijazah_exists;
  
  -- Check user exists
  SELECT EXISTS(
    SELECT 1 FROM documents d 
    JOIN users u ON d.user_id = u.id 
    WHERE d.id = doc_id
  ) INTO user_exists;
  RAISE NOTICE 'User exists: %', user_exists;
  
  -- Check workflow_stage exists
  SELECT EXISTS(
    SELECT 1 FROM documents 
    WHERE id = doc_id 
      AND metadata->>'workflow_stage' IS NOT NULL
  ) INTO has_workflow;
  RAISE NOTICE 'Has workflow_stage: %', has_workflow;
  
  -- Show full document data
  RAISE NOTICE 'Document data: %', (SELECT row_to_json(d.*) FROM documents d WHERE id = doc_id);
END $$;
