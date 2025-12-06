-- ============================================================================
-- FIX IJAZAH RLS POLICY - Simple Version
-- ============================================================================
-- Jalankan di Supabase SQL Editor
-- ============================================================================

-- STEP 1: Drop existing policies (if any)
DROP POLICY IF EXISTS "Authenticated users can insert ijazah" ON ijazah;
DROP POLICY IF EXISTS "Authenticated users can read all ijazah" ON ijazah;
DROP POLICY IF EXISTS "Users can update own ijazah" ON ijazah;

-- STEP 2: Create new policies
-- Policy 1: Allow INSERT for authenticated users
CREATE POLICY "Authenticated users can insert ijazah"
ON ijazah FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 2: Allow SELECT for authenticated users
CREATE POLICY "Authenticated users can read all ijazah"
ON ijazah FOR SELECT
TO authenticated
USING (true);

-- Policy 3: Allow UPDATE for document owners
CREATE POLICY "Users can update own ijazah"
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

-- STEP 3: Verify policies created
SELECT 
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'ijazah'
ORDER BY policyname;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- Should show 3 policies:
-- 1. Authenticated users can insert ijazah (INSERT)
-- 2. Authenticated users can read all ijazah (SELECT)
-- 3. Users can update own ijazah (UPDATE)
-- ============================================================================
