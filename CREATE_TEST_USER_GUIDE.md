# Panduan Membuat Test User - Step by Step

## Problem
Dropdown kosong karena **tidak ada user di database** atau RLS policy memblokir query.

Response dari API:
```bash
curl '.../users?role=eq.rektor'
# Response: []
```

---

## Solution: Buat User Manual via Supabase Dashboard

### STEP 1: Buka Supabase Dashboard

1. Go to: https://supabase.com/dashboard
2. Login dengan akun Anda
3. Pilih project: **zupygwgwsrcwhkwhuwtk**

---

### STEP 2: Create User di Authentication

1. **Klik menu**: Authentication → Users
2. **Klik tombol**: "Add User" atau "Invite User"
3. **Isi form**:
   - **Email**: `rektor@university.ac.id`
   - **Password**: `Password123!`
   - **Auto Confirm User**: ✅ **CENTANG INI** (penting!)
4. **Klik**: "Create User" atau "Send Invite"
5. **COPY USER ID** yang muncul (contoh: `abc-123-def-456-...`)

**Screenshot lokasi**:
```
Dashboard → Authentication → Users → Add User
```

---

### STEP 3: Insert ke Table `users`

1. **Klik menu**: Table Editor → **users**
2. **Klik tombol**: "Insert" → "Insert row"
3. **Isi data**:
   - **id**: [paste User ID dari STEP 2]
   - **name**: `Prof. Dr. Ir. Budi Santoso, M.Sc.`
   - **email**: `rektor@university.ac.id`
   - **role**: `rektor` ⭐ **PENTING!**
   - **nip**: `197801011998011001`
   - **jabatan**: `Rektor Universitas`
   - **created_at**: (auto-filled)
   - **updated_at**: (auto-filled)
4. **Klik**: "Save"

**Screenshot lokasi**:
```
Dashboard → Table Editor → users → Insert row
```

---

### STEP 4: Verify User Berhasil Dibuat

#### Via Table Editor:
1. Go to: Table Editor → **users**
2. Filter by email: `rektor@university.ac.id`
3. ✅ **Check**: User muncul dengan role = "rektor"

#### Via SQL Editor:
1. Go to: SQL Editor → New Query
2. Paste query:
```sql
SELECT id, name, email, role, nip, jabatan
FROM users
WHERE email = 'rektor@university.ac.id';
```
3. Klik "Run"
4. ✅ **Check**: Ada 1 row result

#### Via API (curl):
```bash
curl 'https://zupygwgwsrcwhkwhuwtk.supabase.co/rest/v1/users?select=id,name,email,role&email=eq.rektor@university.ac.id' \
  -H 'apikey: YOUR_ANON_KEY'
```

Expected response:
```json
[
  {
    "id": "abc-123-...",
    "name": "Prof. Dr. Ir. Budi Santoso, M.Sc.",
    "email": "rektor@university.ac.id",
    "role": "rektor"
  }
]
```

---

### STEP 5: Test di Aplikasi

1. **Refresh aplikasi** (Ctrl+Shift+R)
2. **Navigate ke**: `/create-ijazah`
3. **Check dropdown**: "Rektor Penandatangan"
4. ✅ **Should show**: `Prof. Dr. Ir. Budi Santoso, M.Sc. (NIP: 197801011998011001)`

---

## Buat User Lainnya (Opsional)

Ulangi STEP 2-4 untuk user lain:

### User 2: Dekan Fakultas Teknik
- **Email**: `dekan.teknik@university.ac.id`
- **Password**: `Password123!`
- **Name**: `Dr. Ahmad Hidayat, S.T., M.T.`
- **Role**: `dekan` ⭐
- **NIP**: `198501012010011001`
- **Jabatan**: `Dekan Fakultas Teknik`

### User 3: Dekan Fakultas Ekonomi
- **Email**: `dekan.ekonomi@university.ac.id`
- **Password**: `Password123!`
- **Name**: `Dr. Siti Nurhaliza, S.E., M.M.`
- **Role**: `dekan` ⭐
- **NIP**: `198701012012012001`
- **Jabatan**: `Dekan Fakultas Ekonomi`

### User 4: Wakil Rektor
- **Email**: `warek@university.ac.id`
- **Password**: `Password123!`
- **Name**: `Dr. Ir. Eko Prasetyo, M.T.`
- **Role**: `user` ⭐
- **NIP**: `198001012005011001`
- **Jabatan**: `Wakil Rektor Bidang Akademik`

---

## Quick SQL Script (Alternatif)

Jika Anda sudah create user di Authentication, bisa langsung insert via SQL:

```sql
-- GANTI 'USER_ID_HERE' dengan ID dari Authentication
INSERT INTO users (id, name, email, role, nip, jabatan, created_at, updated_at)
VALUES (
  'USER_ID_HERE', -- Ganti dengan UUID dari auth.users
  'Prof. Dr. Ir. Budi Santoso, M.Sc.',
  'rektor@university.ac.id',
  'rektor',
  '197801011998011001',
  'Rektor Universitas',
  NOW(),
  NOW()
);

-- Verify
SELECT * FROM users WHERE email = 'rektor@university.ac.id';
```

---

## Troubleshooting

### Issue 1: "User already exists" saat create di Authentication
**Solution**: User sudah ada, langsung lanjut ke STEP 3 (insert ke table users)

### Issue 2: "Duplicate key value" saat insert ke table users
**Solution**: User sudah ada di table users, check dengan:
```sql
SELECT * FROM users WHERE email = 'rektor@university.ac.id';
```

### Issue 3: User ada tapi dropdown masih kosong
**Possible causes**:
1. Field `role` tidak diisi atau salah
2. RLS policy memblokir query
3. Browser cache

**Solutions**:
```sql
-- Check role
SELECT id, name, email, role FROM users WHERE email = 'rektor@university.ac.id';

-- Update role jika salah
UPDATE users SET role = 'rektor' WHERE email = 'rektor@university.ac.id';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'users';
```

### Issue 4: RLS Policy memblokir
**Temporary solution** (untuk testing):
```sql
-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Setelah testing, enable kembali:
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
```

---

## Verification Checklist

Setelah create user, verify:

- [ ] User ada di Authentication → Users
- [ ] Email confirmed (ada timestamp)
- [ ] User ada di Table Editor → users
- [ ] Field `role` = "rektor" (atau role lain)
- [ ] Field `name`, `nip`, `jabatan` terisi
- [ ] Query API return data (test dengan curl)
- [ ] Dropdown muncul di aplikasi
- [ ] Bisa select user dari dropdown

---

## Summary

**Root cause**: Tidak ada user di database  
**Solution**: Create user manual via Supabase Dashboard  
**Steps**: 
1. Create di Authentication (Auto Confirm: YES)
2. Insert ke table users (dengan field `role`)
3. Verify dengan query
4. Test di aplikasi

**Important**: Field `role` di table `users` harus diisi dengan nilai yang benar:
- `rektor` - untuk rektor
- `dekan` - untuk dekan
- `user` - untuk user biasa
- `admin` - untuk admin

---

## Next Steps

Setelah user berhasil dibuat:
1. ✅ Refresh aplikasi
2. ✅ Test create ijazah
3. ✅ Test create sertifikat
4. ✅ Test signing flow

**Happy Testing! 🎉**
