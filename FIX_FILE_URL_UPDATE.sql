-- Fix file_url not updating issue

-- ============================================
-- DIAGNOSIS: Check documents without file_url
-- ============================================

-- 1. Find signed documents without file_url
SELECT 
  d.id,
  d.title,
  d.status,
  d.file_url,
  d.user_id,
  d.metadata->>'workflow_stage' as workflow_stage,
  d.created_at,
  d.updated_at,
  u.name as user_name,
  u.email as user_email
FROM documents d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.status = 'signed'
  AND d.file_url IS NULL
ORDER BY d.updated_at DESC;

-- 2. Check if files exist in storage for these documents
SELECT 
  d.id as document_id,
  d.title,
  d.user_id,
  o.name as storage_file_name,
  o.created_at as file_created_at,
  o.metadata->>'size' as file_size
FROM documents d
LEFT JOIN storage.objects o ON 
  o.bucket_id = 'signed-documents' AND
  o.name LIKE d.user_id::text || '/' || d.id::text || '%'
WHERE d.status = 'signed'
  AND d.file_url IS NULL
ORDER BY d.updated_at DESC;

-- 3. Check RLS policies on documents table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'documents'
  AND cmd = 'UPDATE'
ORDER BY policyname;

-- ============================================
-- FIX 1: Manually update file_url for documents
-- ============================================
-- If files exist in storage but file_url is not set

-- First, check what files exist
SELECT 
  name,
  created_at,
  metadata->>'size' as size_bytes
FROM storage.objects
WHERE bucket_id = 'signed-documents'
ORDER BY created_at DESC
LIMIT 20;

-- Then manually update file_url (replace values as needed)
/*
UPDATE documents
SET file_url = 'https://YOUR_SUPABASE_URL/storage/v1/object/public/signed-documents/USER_ID/DOCUMENT_ID-signed-TIMESTAMP.pdf'
WHERE id = 'DOCUMENT_ID';
*/

-- ============================================
-- FIX 2: Batch update file_url from storage
-- ============================================
-- Automatically match documents with storage files

/*
WITH storage_files AS (
  SELECT 
    split_part(name, '/', 1)::uuid as user_id,
    split_part(split_part(name, '/', 2), '-signed-', 1)::uuid as document_id,
    name as file_path,
    created_at
  FROM storage.objects
  WHERE bucket_id = 'signed-documents'
    AND name LIKE '%/%-%'
),
matched_docs AS (
  SELECT 
    d.id,
    'https://' || current_setting('app.settings.supabase_url', true) || 
    '/storage/v1/object/public/signed-documents/' || sf.file_path as public_url
  FROM documents d
  JOIN storage_files sf ON d.id = sf.document_id AND d.user_id = sf.user_id
  WHERE d.status = 'signed'
    AND d.file_url IS NULL
)
UPDATE documents d
SET file_url = md.public_url
FROM matched_docs md
WHERE d.id = md.id;
*/

-- ============================================
-- FIX 3: Add trigger to auto-update file_url
-- ============================================
-- Create a trigger that watches storage.objects and updates documents

/*
CREATE OR REPLACE FUNCTION update_document_file_url()
RETURNS TRIGGER AS $$
DECLARE
  doc_id uuid;
  user_id uuid;
  public_url text;
BEGIN
  -- Extract document_id and user_id from file path
  -- Format: user_id/document_id-signed-timestamp.pdf
  IF NEW.bucket_id = 'signed-documents' AND NEW.name LIKE '%/%-%' THEN
    user_id := split_part(NEW.name, '/', 1)::uuid;
    doc_id := split_part(split_part(NEW.name, '/', 2), '-signed-', 1)::uuid;
    
    -- Generate public URL
    public_url := 'https://' || current_setting('app.settings.supabase_url', true) || 
                  '/storage/v1/object/public/signed-documents/' || NEW.name;
    
    -- Update document
    UPDATE documents
    SET file_url = public_url
    WHERE id = doc_id AND user_id = user_id;
    
    RAISE NOTICE 'Updated document % with file_url: %', doc_id, public_url;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_update_document_file_url ON storage.objects;
CREATE TRIGGER trigger_update_document_file_url
AFTER INSERT ON storage.objects
FOR EACH ROW
EXECUTE FUNCTION update_document_file_url();
*/

-- ============================================
-- FIX 4: Check and fix RLS policies
-- ============================================
-- Ensure authenticated users can update documents

-- Check current UPDATE policies
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'documents' AND cmd = 'UPDATE';

-- If no policy allows updates, create one:
/*
CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
*/

-- ============================================
-- FIX 5: Verify specific document update
-- ============================================
-- Test if you can manually update a specific document

DO $$
DECLARE
  test_doc_id uuid := 'DOCUMENT_ID'; -- Replace with actual ID
  test_url text := 'https://test.com/test.pdf';
  rows_affected int;
BEGIN
  -- Try to update
  UPDATE documents
  SET file_url = test_url
  WHERE id = test_doc_id;
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  IF rows_affected > 0 THEN
    RAISE NOTICE 'Successfully updated document %', test_doc_id;
    
    -- Rollback the test update
    UPDATE documents
    SET file_url = NULL
    WHERE id = test_doc_id AND file_url = test_url;
  ELSE
    RAISE NOTICE 'Failed to update document % - check RLS policies', test_doc_id;
  END IF;
END $$;

-- ============================================
-- FIX 6: Check for locks or conflicts
-- ============================================

-- Check for any locks on documents table
SELECT 
  locktype,
  relation::regclass,
  mode,
  granted,
  pid
FROM pg_locks
WHERE relation = 'documents'::regclass;

-- Check for long-running transactions
SELECT 
  pid,
  usename,
  state,
  query,
  query_start,
  state_change
FROM pg_stat_activity
WHERE state != 'idle'
  AND query ILIKE '%documents%'
ORDER BY query_start;

-- ============================================
-- MONITORING: Track file_url updates
-- ============================================

-- Create a log table to track updates (optional)
/*
CREATE TABLE IF NOT EXISTS document_file_url_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id uuid REFERENCES documents(id),
  old_file_url text,
  new_file_url text,
  updated_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Create trigger to log changes
CREATE OR REPLACE FUNCTION log_file_url_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.file_url IS DISTINCT FROM NEW.file_url THEN
    INSERT INTO document_file_url_log (document_id, old_file_url, new_file_url, updated_by)
    VALUES (NEW.id, OLD.file_url, NEW.file_url, auth.uid());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_log_file_url_changes ON documents;
CREATE TRIGGER trigger_log_file_url_changes
AFTER UPDATE ON documents
FOR EACH ROW
EXECUTE FUNCTION log_file_url_changes();
*/
