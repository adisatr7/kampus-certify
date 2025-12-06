# 🚀 Quick Fix: Dropdown Kosong

## Problem
Dropdown rektor/dekan kosong karena tidak ada user di database.

## ⚡ Solution Tercepat (5 menit)

### STEP 1: Buka Supabase SQL Editor

1. Go to: https://supabase.com/dashboard
2. Login dan pilih project: **zupygwgwsrcwhkwhuwtk**
3. Klik menu: **SQL Editor**
4. Klik: **New Query**

### STEP 2: Copy & Paste Script

Copy semua isi file **`CREATE_TEST_USERS_QUICK.sql`** dan paste ke SQL Editor.

Atau copy script di bawah:

```sql
-- Create test users
INSERT INTO users (id, email, name, role, nip, jabatan, created_at, updated_at)
VALUES 
  (gen_random_uuid(), 'rektor@university.ac.id', 'Prof. Dr. Ir. Budi Santoso, M.Sc.', 'rektor', '197801011998011001', 'Rektor Universitas', NOW(), NOW()),
  (gen_random_uuid(), 'dekan.teknik@university.ac.id', 'Dr. Ahmad Hidayat, S.T., M.T.', 'dekan', '198501012010011001', 'Dekan Fakultas Teknik', NOW(), NOW()),
  (gen_random_uuid(), 'dekan.ekonomi@university.ac.id', 'Dr. Siti Nurhaliza, S.E., M.M.', 'dekan', '198701012012012001', 'Dekan Fakultas Ekonomi', NOW(), NOW()),
  (gen_random_uuid(), 'warek@university.ac.id', 'Dr. Ir. Eko Prasetyo, M.T.', 'user', '198001012005011001', 'Wakil Rektor Bidang Akademik', NOW(), NOW())
ON CONFLICT (email) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  nip = EXCLUDED.nip,
  jabatan = EXCLUDED.jabatan,
  updated_at = NOW();

-- Verify
SELECT id, email, name, role, nip, jabatan FROM users 
WHERE email IN ('rektor@university.ac.id', 'dekan.teknik@university.ac.id', 'dekan.ekonomi@university.ac.id', 'warek@university.ac.id')
ORDER BY role, name;
```

### STEP 3: Run Script

1. Klik tombol **"Run"** atau tekan **Ctrl+Enter**
2. ✅ Check hasil: Should show 4 users created

### STEP 4: Test di Aplikasi

1. **Refresh aplikasi** (Ctrl+Shift+R)
2. **Navigate ke**: `/create-ijazah`
3. **Check dropdown**: "Rektor Penandatangan"
4. ✅ **Should show**: `Prof. Dr. Ir. Budi Santoso, M.Sc. (NIP: 197801011998011001)`

---

## ✅ Expected Result

Dropdown akan menampilkan:

### Dropdown Rektor:
```
Prof. Dr. Ir. Budi Santoso, M.Sc. (NIP: 197801011998011001)
```

### Dropdown Dekan:
```
Dr. Ahmad Hidayat, S.T., M.T. (NIP: 198501012010011001)
Dr. Siti Nurhaliza, S.E., M.M. (NIP: 198701012012012001)
```

### Dropdown Penandatangan (Sertifikat):
```
Dr. Ahmad Hidayat, S.T., M.T. (NIP: 198501012010011001)
Dr. Siti Nurhaliza, S.E., M.M. (NIP: 198701012012012001)
Dr. Ir. Eko Prasetyo, M.T. (NIP: 198001012005011001)
Prof. Dr. Ir. Budi Santoso, M.Sc. (NIP: 197801011998011001)
```

---

## ⚠️ Important Notes

1. **Users ini HANYA untuk testing dropdown**
2. **Mereka TIDAK bisa login** karena tidak ada di `auth.users`
3. **Untuk login**, buat user via Authentication → Users di dashboard
4. **Script menggunakan ON CONFLICT** jadi aman dijalankan berulang kali

---

## 🔄 Alternative: Deploy Edge Function

Jika ingin menggunakan Edge Function untuk create user dengan authentication:

```bash
# Deploy function
npx supabase functions deploy create-user --project-ref zupygwgwsrcwhkwhuwtk

# Atau via dashboard:
# Dashboard → Edge Functions → create-user → Deploy
```

Tapi untuk testing dropdown, cara SQL di atas sudah cukup! ✅

---

## 🐛 Troubleshooting

### Issue: "permission denied for table users"
**Solution**: Jalankan sebagai superuser atau via SQL Editor (sudah punya permission)

### Issue: "duplicate key value violates unique constraint"
**Solution**: User sudah ada, script akan update data yang ada (ON CONFLICT)

### Issue: Dropdown masih kosong setelah run script
**Solutions**:
1. Hard refresh browser (Ctrl+Shift+R)
2. Check console logs (F12)
3. Verify data dengan query:
   ```sql
   SELECT * FROM users WHERE role = 'rektor';
   ```

---

## 📚 Files Reference

- **`CREATE_TEST_USERS_QUICK.sql`** - Script lengkap dengan comments
- **`CREATE_TEST_USER_GUIDE.md`** - Panduan manual create user
- **`DEPLOY_EDGE_FUNCTION.md`** - Panduan deploy Edge Function

---

**Total waktu: ~5 menit** ⚡

**Langsung jalankan script SQL dan test!** 🚀
