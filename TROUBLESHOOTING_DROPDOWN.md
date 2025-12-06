# Troubleshooting: Dropdown Rektor/Dekan Kosong

## Problem
Di halaman "Create Ijazah Digital", dropdown "Rektor Penandatangan" kosong meskipun sudah ada user dengan role rektor.

## Root Causes

Ada beberapa kemungkinan penyebab:

1. ❌ User belum dibuat di `auth.users`
2. ❌ User belum di-insert ke `public.users`
3. ❌ Role belum di-assign di `public.user_roles`
4. ❌ RLS policy memblokir query
5. ❌ Data tidak sinkron antara auth.users dan public.users

---

## Solution Steps

### STEP 1: Verify Data di Database

#### 1.1 Buka Supabase SQL Editor
1. Go to: Supabase Dashboard → SQL Editor
2. Klik "New Query"
3. Paste script di bawah:

```sql
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
WHERE u.email IN (
  'dekan.teknik@university.ac.id',
  'rektor@university.ac.id',
  'dekan.ekonomi@university.ac.id',
  'warek@university.ac.id'
)
ORDER BY u.email;
```

4. Klik "Run"
5. **Check hasil**:
   - ✅ Jika ada data → Lanjut ke Step 1.2
   - ❌ Jika kosong → Lanjut ke Step 2

#### 1.2 Check User Roles
```sql
-- Check specifically rektor role
SELECT 
  ur.user_id,
  ur.role,
  u.email,
  u.name
FROM public.user_roles ur
LEFT JOIN public.users u ON ur.user_id = u.id
WHERE ur.role = 'rektor';
```

**Expected Result**:
```
user_id                              | role   | email                        | name
-------------------------------------|--------|------------------------------|---------------------------
abc-123-def-456...                   | rektor | rektor@university.ac.id      | Prof. Dr. Ir. Budi Santoso
```

---

### STEP 2: Create Missing Users

Jika user belum ada, buat manual via Supabase Dashboard:

#### 2.1 Create User di Authentication
1. Go to: **Authentication** → **Users**
2. Klik **"Add User"** atau **"Invite"**
3. Isi:
   - Email: `rektor@university.ac.id`
   - Password: `Password123!`
   - **Auto Confirm User**: ✅ **YES** (PENTING!)
4. Klik **"Create User"**
5. **COPY USER ID** (contoh: `abc-123-def-456-...`)

#### 2.2 Insert ke public.users
1. Go to: **Table Editor** → **users**
2. Klik **"Insert"** → **"Insert row"**
3. Isi:
   - **id**: [paste User ID dari step 2.1]
   - **name**: `Prof. Dr. Ir. Budi Santoso, M.Sc.`
   - **email**: `rektor@university.ac.id`
   - **nip**: `197801011998011001`
   - **jabatan**: `Rektor Universitas`
4. Klik **"Save"**

#### 2.3 Assign Role
1. Go to: **Table Editor** → **user_roles**
2. Klik **"Insert"** → **"Insert row"**
3. Isi:
   - **user_id**: [paste User ID dari step 2.1]
   - **role**: `rektor`
4. Klik **"Save"**

---

### STEP 3: Fix Missing Roles (Jika User Ada tapi Role Tidak)

Jika user sudah ada di `public.users` tapi tidak ada di `public.user_roles`:

#### Via SQL Editor:
```sql
-- Assign role rektor
INSERT INTO public.user_roles (user_id, role, created_at)
SELECT id, 'rektor', NOW()
FROM public.users
WHERE email = 'rektor@university.ac.id'
ON CONFLICT (user_id, role) DO NOTHING;

-- Verify
SELECT 
  u.email,
  u.name,
  ur.role
FROM public.users u
JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'rektor@university.ac.id';
```

---

### STEP 4: Check RLS Policies

Jika data ada tapi dropdown masih kosong, mungkin RLS policy memblokir:

#### 4.1 Check RLS di table users
```sql
-- Check RLS policies for users table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'users';
```

#### 4.2 Temporary Disable RLS (untuk testing)
```sql
-- HANYA UNTUK TESTING - JANGAN DI PRODUCTION!
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Setelah testing, enable kembali:
-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

---

### STEP 5: Check Console Logs

Setelah update kode dengan logging (sudah saya tambahkan), check browser console:

1. Buka aplikasi
2. Tekan **F12** untuk buka DevTools
3. Go to **Console** tab
4. Navigate ke `/create-ijazah`
5. Lihat logs:

**Expected logs**:
```
🔍 Fetching rektors...
📋 Rektor roles: [{user_id: "abc-123..."}]
🔑 Rektor IDs: ["abc-123..."]
👥 Rektors: [{id: "abc-123...", name: "Prof. Dr. Ir. Budi Santoso", nip: "..."}]
✅ Rektor list set: 1 rektors
```

**If error**:
```
❌ Error fetching rektor roles: {message: "..."}
```

---

### STEP 6: Verify Fix

Setelah fix, verify:

1. **Refresh halaman** `/create-ijazah`
2. **Check dropdown** "Rektor Penandatangan"
3. ✅ **Should show**: `Prof. Dr. Ir. Budi Santoso, M.Sc. (NIP: 197801011998011001)`

---

## Quick Fix Script

Jika ingin cepat, jalankan script ini di SQL Editor:

```sql
-- ============================================================================
-- QUICK FIX: Create Rektor User
-- ============================================================================

-- Step 1: Check if user exists in auth.users
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT := 'rektor@university.ac.id';
BEGIN
  -- Get user ID from auth.users
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = v_email;
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User not found in auth.users. Please create via Authentication UI first.';
  ELSE
    RAISE NOTICE 'User found: %', v_user_id;
    
    -- Insert into public.users if not exists
    INSERT INTO public.users (id, name, email, nip, jabatan, created_at, updated_at)
    VALUES (
      v_user_id,
      'Prof. Dr. Ir. Budi Santoso, M.Sc.',
      v_email,
      '197801011998011001',
      'Rektor Universitas',
      NOW(),
      NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      nip = EXCLUDED.nip,
      jabatan = EXCLUDED.jabatan,
      updated_at = NOW();
    
    RAISE NOTICE 'User inserted/updated in public.users';
    
    -- Assign role
    INSERT INTO public.user_roles (user_id, role, created_at)
    VALUES (v_user_id, 'rektor', NOW())
    ON CONFLICT (user_id, role) DO NOTHING;
    
    RAISE NOTICE 'Role assigned';
  END IF;
END $$;

-- Verify
SELECT 
  u.id,
  u.name,
  u.email,
  u.nip,
  u.jabatan,
  ur.role
FROM public.users u
LEFT JOIN public.user_roles ur ON u.id = ur.user_id
WHERE u.email = 'rektor@university.ac.id';
```

---

## Common Issues & Solutions

### Issue 1: "No rektor roles found" warning
**Cause**: Tidak ada user dengan role rektor di `user_roles` table  
**Solution**: Run Step 2.3 atau Quick Fix Script

### Issue 2: Dropdown shows but empty
**Cause**: User ada di `user_roles` tapi tidak di `public.users`  
**Solution**: Run Step 2.2

### Issue 3: Error "permission denied"
**Cause**: RLS policy memblokir query  
**Solution**: Check Step 4 atau temporary disable RLS

### Issue 4: User ada tapi tidak muncul
**Cause**: Data tidak sinkron atau cache  
**Solution**: 
1. Hard refresh browser (Ctrl+Shift+R)
2. Clear browser cache
3. Check console logs

---

## Verification Checklist

Setelah fix, verify semua ini:

- [ ] User ada di `auth.users` dengan email confirmed
- [ ] User ada di `public.users` dengan data lengkap
- [ ] Role ada di `public.user_roles`
- [ ] Console logs tidak ada error
- [ ] Dropdown muncul dan berisi nama rektor
- [ ] Bisa select rektor dari dropdown
- [ ] Bisa submit form

---

## Prevention

Untuk mencegah masalah ini di masa depan:

1. **Selalu create user via Authentication UI dulu**
2. **Auto confirm email** saat create user
3. **Langsung insert ke public.users** setelah create
4. **Langsung assign role** setelah insert
5. **Verify dengan query** sebelum testing

---

## Need Help?

Jika masih bermasalah:

1. **Check console logs** (F12 → Console)
2. **Run verification script**: `supabase/verify_and_fix_users.sql`
3. **Check RLS policies** di Supabase Dashboard
4. **Screenshot error** dan share untuk debugging

---

## Files Reference

- **Verification Script**: `supabase/verify_and_fix_users.sql`
- **Create Users Script**: `supabase/create_test_users.sql`
- **Manual Steps**: `MANUAL_TESTING_STEPS.md`
- **This Guide**: `TROUBLESHOOTING_DROPDOWN.md`
