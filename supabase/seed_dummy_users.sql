-- ============================================================================
-- SEED DATA DUMMY UNTUK TESTING IJAZAH DAN SERTIFIKAT
-- ============================================================================
-- File ini berisi data dummy untuk:
-- 1. User Dekan (untuk membuat dan menandatangani ijazah/sertifikat)
-- 2. User Rektor (untuk menandatangani ijazah)
-- 3. User Penandatangan (untuk menandatangani sertifikat)
-- ============================================================================

-- ============================================================================
-- STEP 1: CREATE DUMMY USERS IN AUTH.USERS
-- ============================================================================
-- Note: Password untuk semua user: "Password123!"
-- Anda perlu menjalankan ini melalui Supabase Dashboard atau menggunakan
-- Supabase Auth API karena auth.users tidak bisa di-insert langsung

-- CARA ALTERNATIF: Gunakan Supabase Dashboard
-- 1. Buka Supabase Dashboard → Authentication → Users
-- 2. Klik "Add User" untuk setiap user di bawah
-- 3. Atau gunakan script ini sebagai referensi untuk membuat user via API

-- ============================================================================
-- STEP 2: INSERT USERS INTO PUBLIC.USERS TABLE
-- ============================================================================

-- Catatan: Ganti UUID di bawah dengan UUID yang sebenarnya dari auth.users
-- setelah Anda membuat user di Supabase Auth

-- User 1: Dekan Fakultas Teknik
INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
VALUES 
  (
    'dekan-uuid-1111-1111-1111-111111111111', -- Ganti dengan UUID sebenarnya
    'Dr. Ahmad Hidayat, S.T., M.T.',
    'dekan.teknik@university.ac.id',
    '198501012010011001',
    'Dekan Fakultas Teknik',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 2: Rektor
INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
VALUES 
  (
    'rektor-uuid-2222-2222-2222-222222222222', -- Ganti dengan UUID sebenarnya
    'Prof. Dr. Ir. Budi Santoso, M.Sc.',
    'rektor@university.ac.id',
    '197801011998011001',
    'Rektor Universitas',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 3: Dekan Fakultas Ekonomi (untuk sertifikat)
INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
VALUES 
  (
    'dekan-uuid-3333-3333-3333-333333333333', -- Ganti dengan UUID sebenarnya
    'Dr. Siti Nurhaliza, S.E., M.M.',
    'dekan.ekonomi@university.ac.id',
    '198701012012012001',
    'Dekan Fakultas Ekonomi',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- User 4: Wakil Rektor (untuk sertifikat penandatangan 2)
INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
VALUES 
  (
    'warek-uuid-4444-4444-4444-444444444444', -- Ganti dengan UUID sebenarnya
    'Dr. Ir. Eko Prasetyo, M.T.',
    'warek@university.ac.id',
    '198001012005011001',
    'Wakil Rektor Bidang Akademik',
    NOW(),
    NOW()
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  email = EXCLUDED.email,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- ============================================================================
-- STEP 3: ASSIGN ROLES TO USERS
-- ============================================================================

-- Assign role "dekan" to Dekan Fakultas Teknik
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES 
  ('dekan-uuid-1111-1111-1111-111111111111', 'dekan', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role "rektor" to Rektor
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES 
  ('rektor-uuid-2222-2222-2222-222222222222', 'rektor', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role "dekan" to Dekan Fakultas Ekonomi
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES 
  ('dekan-uuid-3333-3333-3333-333333333333', 'dekan', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role "user" to Wakil Rektor (untuk sertifikat)
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES 
  ('warek-uuid-4444-4444-4444-444444444444', 'user', NOW())
ON CONFLICT (user_id, role) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check users
SELECT 
  u.id,
  u.name,
  u.email,
  u.nip,
  u.jabatan,
  ur.role
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.id IN (
  'dekan-uuid-1111-1111-1111-111111111111',
  'rektor-uuid-2222-2222-2222-222222222222',
  'dekan-uuid-3333-3333-3333-333333333333',
  'warek-uuid-4444-4444-4444-444444444444'
)
ORDER BY u.name;

-- ============================================================================
-- NOTES
-- ============================================================================
-- 1. Setelah menjalankan script ini, Anda perlu membuat user di Supabase Auth
-- 2. Ganti UUID placeholder dengan UUID sebenarnya dari auth.users
-- 3. Password default untuk testing: "Password123!"
-- 4. Email harus unik dan valid
-- 5. NIP harus unik
-- ============================================================================
