-- ============================================================================
-- CREATE TEST USERS FOR IJAZAH & SERTIFIKAT TESTING
-- ============================================================================
-- Jalankan script ini di Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste & Run
-- ============================================================================

-- STEP 1: Create users in auth.users (menggunakan extension)
-- Note: Ini memerlukan extension pgcrypto untuk hash password

-- Enable extension jika belum
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function helper untuk create user
CREATE OR REPLACE FUNCTION create_test_user(
  user_email TEXT,
  user_password TEXT,
  user_name TEXT,
  user_nip TEXT,
  user_jabatan TEXT,
  user_role TEXT
) RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
  encrypted_password TEXT;
BEGIN
  -- Generate UUID
  new_user_id := gen_random_uuid();
  
  -- Encrypt password (Supabase uses bcrypt, but for testing we'll use a simple hash)
  encrypted_password := crypt(user_password, gen_salt('bf'));
  
  -- Insert into auth.users
  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role
  ) VALUES (
    new_user_id,
    '00000000-0000-0000-0000-000000000000',
    user_email,
    encrypted_password,
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', user_name, 'nip', user_nip, 'jabatan', user_jabatan),
    'authenticated',
    'authenticated'
  ) ON CONFLICT (email) DO NOTHING;
  
  -- Insert into public.users
  INSERT INTO public.users (
    id,
    name,
    email,
    nip,
    jabatan,
    created_at,
    updated_at
  ) VALUES (
    new_user_id,
    user_name,
    user_email,
    user_nip,
    user_jabatan,
    NOW(),
    NOW()
  ) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    nip = EXCLUDED.nip,
    jabatan = EXCLUDED.jabatan,
    updated_at = NOW();
  
  -- Insert role
  INSERT INTO public.user_roles (
    user_id,
    role,
    created_at
  ) VALUES (
    new_user_id,
    user_role,
    NOW()
  ) ON CONFLICT (user_id, role) DO NOTHING;
  
  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- CREATE TEST USERS
-- ============================================================================

-- User 1: Dekan Fakultas Teknik
SELECT create_test_user(
  'dekan.teknik@university.ac.id',
  'Password123!',
  'Dr. Ahmad Hidayat, S.T., M.T.',
  '198501012010011001',
  'Dekan Fakultas Teknik',
  'dekan'
) AS dekan_teknik_id;

-- User 2: Rektor
SELECT create_test_user(
  'rektor@university.ac.id',
  'Password123!',
  'Prof. Dr. Ir. Budi Santoso, M.Sc.',
  '197801011998011001',
  'Rektor Universitas',
  'rektor'
) AS rektor_id;

-- User 3: Dekan Fakultas Ekonomi
SELECT create_test_user(
  'dekan.ekonomi@university.ac.id',
  'Password123!',
  'Dr. Siti Nurhaliza, S.E., M.M.',
  '198701012012012001',
  'Dekan Fakultas Ekonomi',
  'dekan'
) AS dekan_ekonomi_id;

-- User 4: Wakil Rektor
SELECT create_test_user(
  'warek@university.ac.id',
  'Password123!',
  'Dr. Ir. Eko Prasetyo, M.T.',
  '198001012005011001',
  'Wakil Rektor Bidang Akademik',
  'user'
) AS warek_id;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check created users
SELECT 
  u.id,
  u.name,
  u.email,
  u.nip,
  u.jabatan,
  ur.role,
  u.created_at
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
ORDER BY u.name;

-- ============================================================================
-- CLEANUP (jika perlu reset)
-- ============================================================================

-- Uncomment untuk delete test users
/*
DELETE FROM public.user_roles 
WHERE user_id IN (
  SELECT id FROM public.users 
  WHERE email IN (
    'dekan.teknik@university.ac.id',
    'rektor@university.ac.id',
    'dekan.ekonomi@university.ac.id',
    'warek@university.ac.id'
  )
);

DELETE FROM public.users 
WHERE email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
);

DELETE FROM auth.users 
WHERE email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
);
*/

-- ============================================================================
-- NOTES
-- ============================================================================
-- Password untuk semua user: Password123!
-- 
-- Credentials:
-- 1. dekan.teknik@university.ac.id | Password123! | dekan
-- 2. rektor@university.ac.id | Password123! | rektor
-- 3. dekan.ekonomi@university.ac.id | Password123! | dekan
-- 4. warek@university.ac.id | Password123! | user
-- ============================================================================
