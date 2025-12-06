-- Script untuk check data integrity sebelum signing

-- 1. Check dokumen yang pending untuk di-sign
SELECT 
  d.id,
  d.title,
  d.status,
  d.user_id,
  d.created_at,
  d.metadata->>'workflow_stage' as workflow_stage,
  u.name as assigned_to,
  u.email as assigned_email
FROM documents d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.status = 'pending'
ORDER BY d.created_at DESC;

-- 2. Check sertifikat data completeness
SELECT 
  s.id,
  s.document_id,
  s.nama_peserta,
  s.nama_acara,
  s.template_id,
  d.id as doc_exists,
  d.title as doc_title,
  d.status as doc_status
FROM sertifikat s
LEFT JOIN documents d ON s.document_id = d.id
WHERE d.status = 'pending';

-- 3. Check ijazah data completeness
SELECT 
  i.id,
  i.document_id,
  i.nama_mahasiswa,
  i.nim,
  i.nama_fakultas,
  d.id as doc_exists,
  d.title as doc_title,
  d.status as doc_status
FROM ijazah i
LEFT JOIN documents d ON i.document_id = d.id
WHERE d.status = 'pending';

-- 4. Check penandatangan (users) data
SELECT 
  d.id as document_id,
  d.title,
  d.metadata->>'signer1_id' as signer1_id,
  u1.name as signer1_name,
  u1.jabatan as signer1_jabatan,
  d.metadata->>'signer2_id' as signer2_id,
  u2.name as signer2_name,
  u2.jabatan as signer2_jabatan
FROM documents d
LEFT JOIN users u1 ON (d.metadata->>'signer1_id')::uuid = u1.id
LEFT JOIN users u2 ON (d.metadata->>'signer2_id')::uuid = u2.id
WHERE d.status = 'pending';

-- 5. Check orphaned sertifikat (no document)
SELECT 
  s.id,
  s.document_id,
  s.nama_peserta,
  s.created_at
FROM sertifikat s
LEFT JOIN documents d ON s.document_id = d.id
WHERE d.id IS NULL;

-- 6. Check orphaned ijazah (no document)
SELECT 
  i.id,
  i.document_id,
  i.nama_mahasiswa,
  i.created_at
FROM ijazah i
LEFT JOIN documents d ON i.document_id = d.id
WHERE d.id IS NULL;

-- 7. Check documents without sertifikat/ijazah data
SELECT 
  d.id,
  d.title,
  d.status,
  CASE 
    WHEN d.title ILIKE '%sertifikat%' THEN 'sertifikat'
    WHEN d.title ILIKE '%ijazah%' THEN 'ijazah'
    ELSE 'other'
  END as expected_type,
  s.id as sertifikat_exists,
  i.id as ijazah_exists
FROM documents d
LEFT JOIN sertifikat s ON d.id = s.document_id
LEFT JOIN ijazah i ON d.id = i.document_id
WHERE d.status = 'pending'
  AND (
    (d.title ILIKE '%sertifikat%' AND s.id IS NULL) OR
    (d.title ILIKE '%ijazah%' AND i.id IS NULL)
  );

-- 8. Check RLS policies
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
WHERE tablename IN ('documents', 'sertifikat', 'ijazah', 'users')
ORDER BY tablename, policyname;

-- 9. Check storage buckets and policies
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets
WHERE name IN ('signed-documents', 'certificates', 'documents');

-- 10. Test query untuk specific document (ganti DOCUMENT_ID)
-- Uncomment dan ganti DOCUMENT_ID dengan ID dokumen yang error
/*
DO $$
DECLARE
  doc_id uuid := 'DOCUMENT_ID'; -- Ganti dengan ID dokumen
  doc_record record;
  sert_record record;
  ijazah_record record;
  user_record record;
BEGIN
  -- Get document
  SELECT * INTO doc_record FROM documents WHERE id = doc_id;
  RAISE NOTICE 'Document: %', doc_record;
  
  -- Get sertifikat if exists
  SELECT * INTO sert_record FROM sertifikat WHERE document_id = doc_id;
  RAISE NOTICE 'Sertifikat: %', sert_record;
  
  -- Get ijazah if exists
  SELECT * INTO ijazah_record FROM ijazah WHERE document_id = doc_id;
  RAISE NOTICE 'Ijazah: %', ijazah_record;
  
  -- Get user
  SELECT * INTO user_record FROM users WHERE id = doc_record.user_id;
  RAISE NOTICE 'User: %', user_record;
END $$;
*/
