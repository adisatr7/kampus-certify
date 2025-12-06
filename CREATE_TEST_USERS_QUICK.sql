-- ============================================================================
-- QUICK CREATE TEST USERS - Jalankan di Supabase SQL Editor
-- ============================================================================
-- Copy paste script ini ke Supabase SQL Editor dan klik "Run"
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================================

-- Create test users directly in users table
-- Note: Ini akan membuat user tanpa authentication (hanya untuk testing dropdown)

-- User 1: Rektor
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'rektor@university.ac.id',
  'Prof. Dr. Ir. Budi Santoso, M.Sc.',
  'rektor',
  '197801011998011001',
  'Rektor Universitas',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 2: Dekan Fakultas Teknik
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dekan.teknik@university.ac.id',
  'Dr. Ahmad Hidayat, S.T., M.T.',
  'dekan',
  '198501012010011001',
  'Dekan Fakultas Teknik',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 3: Dekan Fakultas Ekonomi
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'dekan.ekonomi@university.ac.id',
  'Dr. Siti Nurhaliza, S.E., M.M.',
  'dekan',
  '198701012012012001',
  'Dekan Fakultas Ekonomi',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 4: Wakil Rektor
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'warek@university.ac.id',
  'Dr. Ir. Eko Prasetyo, M.T.',
  'user',
  '198001012005011001',
  'Wakil Rektor Bidang Akademik',
  NOW(),
  NOW()
) ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- Verify users created
SELECT 
  id,
  email,
  name,
  role,
  nip,
  jabatan,
  created_at
FROM users
WHERE email IN (
  'rektor@university.ac.id',
  'dekan.teknik@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
ORDER BY role, name;

-- ============================================================================
-- EXPECTED RESULT:
-- ============================================================================
-- Should show 4 users:
-- 1. Prof. Dr. Ir. Budi Santoso, M.Sc. (rektor)
-- 2. Dr. Ahmad Hidayat, S.T., M.T. (dekan)
-- 3. Dr. Siti Nurhaliza, S.E., M.M. (dekan)
-- 4. Dr. Ir. Eko Prasetyo, M.T. (user)
-- ============================================================================

-- ============================================================================
-- NOTES:
-- ============================================================================
-- 1. Users ini HANYA untuk testing dropdown
-- 2. Mereka TIDAK bisa login karena tidak ada di auth.users
-- 3. Untuk login, buat user via Authentication → Users di dashboard
-- 4. Script ini menggunakan ON CONFLICT untuk update jika sudah ada
-- ============================================================================

-- ============================================================================
-- CLEANUP (jika perlu hapus test users):
-- ============================================================================
/*
DELETE FROM users 
WHERE email IN (
  'rektor@university.ac.id',
  'dekan.teknik@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
);
*/
