-- ============================================================================
-- FIX USER MANAGEMENT - RLS Policy Issue
-- ============================================================================
-- Jalankan di Supabase SQL Editor jika user tidak muncul di User Management
-- ============================================================================

-- STEP 1: Check existing RLS policies for users table
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
WHERE tablename = 'users';

-- STEP 2: Check if RLS is enabled
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'users';

-- STEP 3: Check current users in table
SELECT 
  id,
  email,
  name,
  role,
  nip,
  jabatan,
  created_at
FROM users
ORDER BY created_at DESC
LIMIT 10;

-- ============================================================================
-- FIX: Create or Update RLS Policy
-- ============================================================================

-- Drop existing policies if needed (uncomment if you want to recreate)
/*
DROP POLICY IF EXISTS "Users can read all users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admin can manage users" ON users;
*/

-- Create policy to allow authenticated users to read all users
CREATE POLICY IF NOT EXISTS "Authenticated users can read all users"
ON users FOR SELECT
TO authenticated
USING (true);

-- Create policy to allow users to read their own data
CREATE POLICY IF NOT EXISTS "Users can read own data"
ON users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Create policy for admin to manage users
CREATE POLICY IF NOT EXISTS "Admin can manage all users"
ON users FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'admin'
  )
);

-- ============================================================================
-- ALTERNATIVE: Temporarily disable RLS for testing
-- ============================================================================
-- HANYA UNTUK TESTING - JANGAN DI PRODUCTION!
-- Uncomment jika ingin disable RLS sementara

/*
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
*/

-- Setelah testing, enable kembali:
/*
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
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
WHERE tablename = 'users'
ORDER BY policyname;

-- Test query as authenticated user would see
SELECT 
  id,
  email,
  name,
  role,
  nip,
  jabatan
FROM users
ORDER BY name;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- Should show all users including newly created ones
-- If still empty, check:
-- 1. User is authenticated (has valid JWT token)
-- 2. RLS policies are correct
-- 3. Users actually exist in table
-- ============================================================================

-- ============================================================================
-- TROUBLESHOOTING QUERIES
-- ============================================================================

-- Check if current user is authenticated
SELECT auth.uid() as current_user_id;

-- Check current user's role
SELECT id, email, name, role
FROM users
WHERE id = auth.uid();

-- Count total users
SELECT COUNT(*) as total_users FROM users;

-- Check users by role
SELECT role, COUNT(*) as count
FROM users
GROUP BY role
ORDER BY role;

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. RLS policies control who can see what data
-- 2. If policy is too restrictive, users won't appear
-- 3. Admin users should be able to see all users
-- 4. Regular users might only see their own data
-- 5. For User Management page, we need policy that allows reading all users
-- ============================================================================
