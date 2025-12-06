-- ============================================================================
-- VERIFY AND FIX TEST USERS
-- ============================================================================
-- Script ini untuk:
-- 1. Verify apakah user sudah ada
-- 2. Check apakah role sudah di-assign
-- 3. Fix jika ada yang missing
-- ============================================================================

-- STEP 1: Check existing users
SELECT 
  'EXISTING USERS' as info,
  u.id,
  u.name,
  u.email,
  u.nip,
  u.jabatan,
  ur.role
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
ORDER BY u.email;

-- STEP 2: Check users in auth.users
SELECT 
  'AUTH USERS' as info,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
ORDER BY email;

-- STEP 3: Check user_roles table
SELECT 
  'USER ROLES' as info,
  ur.user_id,
  ur.role,
  u.email,
  u.name
FROM public.user_roles ur
LEFT JOIN public.users u ON ur.user_id = u.id
WHERE ur.role IN ('dekan', 'rektor')
ORDER BY ur.role, u.email;

-- STEP 4: Find users in auth.users but not in public.users
SELECT 
  'MISSING IN PUBLIC.USERS' as info,
  au.id,
  au.email,
  au.created_at
FROM auth.users au
WHERE au.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
);

-- STEP 5: Find users in public.users but missing roles
SELECT 
  'MISSING ROLES' as info,
  u.id,
  u.email,
  u.name
FROM public.users u
WHERE u.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
AND NOT EXISTS (
  SELECT 1 FROM public.user_roles ur WHERE ur.user_id = u.id
);

-- ============================================================================
-- FIX SCRIPT (Uncomment jika perlu fix)
-- ============================================================================

-- FIX 1: Insert missing users to public.users
-- Jalankan ini jika ada user di auth.users tapi tidak di public.users
/*
INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
SELECT 
  au.id,
  COALESCE(au.raw_user_meta_data->>'name', 'Unknown'),
  au.email,
  COALESCE(au.raw_user_meta_data->>'nip', ''),
  COALESCE(au.raw_user_meta_data->>'jabatan', ''),
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
AND NOT EXISTS (
  SELECT 1 FROM public.users pu WHERE pu.id = au.id
)
ON CONFLICT (id) DO NOTHING;
*/

-- FIX 2: Assign missing roles
-- Uncomment dan sesuaikan user_id dengan ID yang sebenarnya
/*
-- Assign role dekan untuk dekan.teknik@university.ac.id
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'dekan', NOW()
FROM public.users
WHERE email = 'dekan.teknik@university.ac.id'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role rektor untuk rektor@university.ac.id
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'rektor', NOW()
FROM public.users
WHERE email = 'rektor@university.ac.id'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role dekan untuk dekan.ekonomi@university.ac.id
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'dekan', NOW()
FROM public.users
WHERE email = 'dekan.ekonomi@university.ac.id'
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign role user untuk warek@university.ac.id
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'user', NOW()
FROM public.users
WHERE email = 'warek@university.ac.id'
ON CONFLICT (user_id, role) DO NOTHING;
*/

-- ============================================================================
-- VERIFICATION AFTER FIX
-- ============================================================================

-- Run this after fix to verify
SELECT 
  'FINAL CHECK' as info,
  u.id,
  u.name,
  u.email,
  u.nip,
  u.jabatan,
  STRING_AGG(ur.role, ', ') as roles
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
GROUP BY u.id, u.name, u.email, u.nip, u.jabatan
ORDER BY u.email;

-- ============================================================================
-- QUICK FIX: Jika user sudah ada tapi role belum
-- ============================================================================
-- Copy paste dan jalankan satu per satu, ganti 'USER_ID_HERE' dengan ID sebenarnya

/*
-- Template untuk assign role:
INSERT INTO public.user_roles (user_id, role, created_at)
VALUES ('USER_ID_HERE', 'rektor', NOW())
ON CONFLICT (user_id, role) DO NOTHING;
*/
