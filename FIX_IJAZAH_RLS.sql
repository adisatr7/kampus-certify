-- ============================================================================
-- FIX IJAZAH RLS POLICY - Allow Insert
-- ============================================================================
-- Jalankan di Supabase SQL Editor untuk fix error saat create ijazah
-- Error: "new row violates row-level security policy for table ijazah"
-- ============================================================================

-- STEP 1: Check existing RLS policies for ijazah table
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
WHERE tablename = 'ijazah';

-- STEP 2: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'ijazah';

-- ============================================================================
-- FIX: Create or Update RLS Policy for INSERT
-- ============================================================================

-- Drop existing restrictive policies if needed (uncomment if necessary)
/*
DROP POLICY IF EXISTS "Users can insert own ijazah" ON ijazah;
DROP POLICY IF EXISTS "Users can read own ijazah" ON ijazah;
*/

-- Create policy to allow authenticated users to insert ijazah
CREATE POLICY IF NOT EXISTS "Authenticated users can insert ijazah"
ON ijazah FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy to allow authenticated users to read all ijazah
CREATE POLICY IF NOT EXISTS "Authenticated users can read all ijazah"
ON ijazah FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow users to update their own ijazah
CREATE POLICY IF NOT EXISTS "Users can update own ijazah"
ON ijazah FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = ijazah.document_id
    AND documents.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM documents
    WHERE documents.id = ijazah.document_id
    AND documents.user_id = auth.uid()
  )
);

-- ============================================================================
-- ALTERNATIVE: Temporarily disable RLS for testing
-- ============================================================================
-- HANYA UNTUK TESTING - JANGAN DI PRODUCTION!
-- Uncomment jika ingin disable RLS sementara

/*
ALTER TABLE ijazah DISABLE ROW LEVEL SECURITY;
*/

-- Setelah testing, enable kembali:
/*
ALTER TABLE ijazah ENABLE ROW LEVEL SECURITY;
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check policies after creation
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'ijazah'
ORDER BY policyname;

-- Test insert (replace with actual values)
/*
INSERT INTO ijazah (
  document_id,
  nama_mahasiswa,
  nim,
  gelar,
  nama_fakultas,
  tanggal_terbit,
  nomor_seri,
  logo_url,
  is_validated
) VALUES (
  'test-document-id',
  'Test Mahasiswa',
  '12345678',
  'Sarjana Teknik (S.T)',
  'Fakultas Teknik',
  '2025-12-06',
  '',
  'https://example.com/logo.png',
  false
);
*/

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. RLS policies control who can insert/read/update data
-- 2. Policy "WITH CHECK (true)" allows all authenticated users to insert
-- 3. For production, you might want more restrictive policies
-- 4. Consider role-based policies (only dekan can create ijazah)
-- ============================================================================

-- ============================================================================
-- PRODUCTION-READY POLICY (Optional - More Restrictive)
-- ============================================================================
-- Uncomment if you want only dekan/admin to create ijazah

/*
-- Drop the permissive policy
DROP POLICY IF EXISTS "Authenticated users can insert ijazah" ON ijazah;

-- Create restrictive policy
CREATE POLICY "Only dekan and admin can insert ijazah"
ON ijazah FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('dekan', 'admin')
  )
);
*/
