# Testing Guide - Ijazah dan Sertifikat

## Setup Dummy Users untuk Testing

### Cara 1: Menggunakan Script TypeScript (Recommended)

#### Prerequisites
1. Pastikan file `.env` sudah ada dengan konfigurasi berikut:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. Install dependencies jika belum:
   ```bash
   npm install
   # atau
   bun install
   ```

#### Menjalankan Script

**Dengan npm:**
```bash
npx tsx scripts/createDummyUsers.ts
```

**Dengan bun:**
```bash
bun run scripts/createDummyUsers.ts
```

#### Output yang Diharapkan
```
🚀 Memulai pembuatan dummy users...

📝 Membuat user: Dr. Ahmad Hidayat, S.T., M.T. (dekan.teknik@university.ac.id)
   ✅ Created auth user
   ℹ️  User ID: xxx-xxx-xxx
   ✅ Inserted into public.users
   ✅ Assigned role: dekan

📝 Membuat user: Prof. Dr. Ir. Budi Santoso, M.Sc. (rektor@university.ac.id)
   ✅ Created auth user
   ℹ️  User ID: xxx-xxx-xxx
   ✅ Inserted into public.users
   ✅ Assigned role: rektor

... (dan seterusnya)

✅ Selesai!

📋 Summary:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email                              | Password      | Role
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
dekan.teknik@university.ac.id      | Password123!  | dekan
rektor@university.ac.id            | Password123!  | rektor
dekan.ekonomi@university.ac.id     | Password123!  | dekan
warek@university.ac.id             | Password123!  | user
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### Cara 2: Manual via Supabase Dashboard

Jika script tidak bisa dijalankan, Anda bisa membuat user manual:

1. **Buka Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Pilih project Anda
   - Go to: Authentication → Users

2. **Buat User 1: Dekan Teknik**
   - Klik "Add User"
   - Email: `dekan.teknik@university.ac.id`
   - Password: `Password123!`
   - Auto Confirm User: ✅ Yes
   - Klik "Create User"
   - Copy User ID yang dibuat

3. **Insert ke public.users**
   - Go to: Table Editor → users
   - Klik "Insert row"
   - id: [paste User ID dari step 2]
   - name: `Dr. Ahmad Hidayat, S.T., M.T.`
   - email: `dekan.teknik@university.ac.id`
   - nip: `198501012010011001`
   - jabatan: `Dekan Fakultas Teknik`

4. **Assign Role**
   - Go to: Table Editor → user_roles
   - Klik "Insert row"
   - user_id: [paste User ID]
   - role: `dekan`

5. **Ulangi untuk user lainnya**:
   - Rektor: `rektor@university.ac.id`
   - Dekan Ekonomi: `dekan.ekonomi@university.ac.id`
   - Wakil Rektor: `warek@university.ac.id`

---

## Dummy Users yang Dibuat

### 1. Dekan Fakultas Teknik
- **Email**: `dekan.teknik@university.ac.id`
- **Password**: `Password123!`
- **Nama**: Dr. Ahmad Hidayat, S.T., M.T.
- **NIP**: 198501012010011001
- **Jabatan**: Dekan Fakultas Teknik
- **Role**: `dekan`
- **Untuk Testing**: Membuat dan menandatangani ijazah

### 2. Rektor
- **Email**: `rektor@university.ac.id`
- **Password**: `Password123!`
- **Nama**: Prof. Dr. Ir. Budi Santoso, M.Sc.
- **NIP**: 197801011998011001
- **Jabatan**: Rektor Universitas
- **Role**: `rektor`
- **Untuk Testing**: Menandatangani ijazah setelah dekan

### 3. Dekan Fakultas Ekonomi
- **Email**: `dekan.ekonomi@university.ac.id`
- **Password**: `Password123!`
- **Nama**: Dr. Siti Nurhaliza, S.E., M.M.
- **NIP**: 198701012012012001
- **Jabatan**: Dekan Fakultas Ekonomi
- **Role**: `dekan`
- **Untuk Testing**: Membuat dan menandatangani sertifikat

### 4. Wakil Rektor
- **Email**: `warek@university.ac.id`
- **Password**: `Password123!`
- **Nama**: Dr. Ir. Eko Prasetyo, M.T.
- **NIP**: 198001012005011001
- **Jabatan**: Wakil Rektor Bidang Akademik
- **Role**: `user`
- **Untuk Testing**: Penandatangan kedua untuk sertifikat

---

## Testing End-to-End

### Test 1: Alur Pembuatan Ijazah

#### Step 1: Login sebagai Dekan
```
Email: dekan.teknik@university.ac.id
Password: Password123!
```

#### Step 2: Buat Ijazah
1. Navigate ke `/create-ijazah`
2. Isi form:
   - Nama Mahasiswa: `Budi Setiawan`
   - NIM: `2020010001`
   - Nama Fakultas: `Teknik Informatika`
   - Gelar: `Sarjana Teknik (S.T.)`
   - Tanggal Terbit: `2024-12-06`
   - Rektor Penandatangan: Pilih `Prof. Dr. Ir. Budi Santoso, M.Sc.`
3. Klik **Preview** untuk melihat ijazah
4. Klik **Buat Ijazah**

#### Step 3: Dekan Menandatangani
1. Anda akan diarahkan ke halaman signing
2. Periksa data ijazah
3. Isi QR Code: `DEKAN-QR-001`
4. Klik **Tanda Tangani Dokumen**
5. ✅ Verify toast: "Ijazah berhasil ditandatangani dan dikirim ke Rektor"
6. ✅ Verify redirect ke `/user/documents`
7. ✅ Verify dokumen muncul dengan status "Signed"

#### Step 4: Logout dan Login sebagai Rektor
```
Logout dari dekan
Login dengan:
Email: rektor@university.ac.id
Password: Password123!
```

#### Step 5: Rektor Menandatangani
1. Navigate ke `/user/documents`
2. ✅ Verify dokumen baru muncul dengan status "Pending"
3. Klik **Tandatangani**
4. Periksa data ijazah
5. Isi QR Code: `REKTOR-QR-001`
6. Klik **Tanda Tangani Dokumen**
7. ✅ Verify toast: "Ijazah berhasil ditandatangani. Dokumen selesai."
8. ✅ Verify redirect ke `/user/documents`
9. ✅ Verify dokumen muncul dengan status "Signed"

#### Step 6: Verifikasi Final
1. Login kembali sebagai Dekan
2. Navigate ke `/user/documents`
3. ✅ Verify dokumen masih ada dengan status "Signed"
4. ✅ Verify metadata berisi QR code dekan dan rektor

---

### Test 2: Alur Pembuatan Sertifikat

#### Step 1: Login sebagai Dekan Ekonomi
```
Email: dekan.ekonomi@university.ac.id
Password: Password123!
```

#### Step 2: Buat Sertifikat
1. Navigate ke `/create-sertifikat`
2. Isi form:
   - Nama Peserta: `Andi Wijaya`
   - Template Sertifikat: `Template Default - Border Emas`
   - Jenis Sertifikat: `Pelatihan`
   - Nama Kegiatan: `Pelatihan Digital Marketing`
   - Penyelenggara: `Fakultas Ekonomi`
   - Tanggal Pelaksanaan: `2024-12-06`
   - Nomor Sertifikat: `001/CERT/FE/2024`
   - Penandatangan 1: Pilih `Dr. Siti Nurhaliza, S.E., M.M.`
   - Penandatangan 2: Pilih `Dr. Ir. Eko Prasetyo, M.T.`
3. Klik **Preview** untuk melihat sertifikat
4. Klik **Buat Sertifikat**

#### Step 3: Penandatangan 1 (Dekan Ekonomi)
1. Anda akan diarahkan ke halaman signing
2. Periksa data sertifikat
3. Isi QR Code: `DEKAN-EKONOMI-QR-001`
4. Klik **Tanda Tangani Dokumen**
5. ✅ Verify toast: "Dokumen berhasil ditandatangani"
6. ✅ Verify redirect ke `/user/documents`

#### Step 4: Logout dan Login sebagai Wakil Rektor
```
Logout dari dekan ekonomi
Login dengan:
Email: warek@university.ac.id
Password: Password123!
```

#### Step 5: Penandatangan 2 (Wakil Rektor)
1. Navigate ke `/user/documents`
2. ✅ Verify dokumen baru muncul dengan status "Pending"
3. Klik **Tandatangani**
4. Periksa data sertifikat
5. Isi QR Code: `WAREK-QR-001`
6. Klik **Tanda Tangani Dokumen**
7. ✅ Verify toast: "Dokumen berhasil ditandatangani"
8. ✅ Verify redirect ke `/user/documents`
9. ✅ Verify dokumen muncul dengan status "Signed"

#### Step 6: Verifikasi Final
1. Login kembali sebagai Dekan Ekonomi
2. Navigate ke `/user/documents`
3. ✅ Verify dokumen masih ada dengan status "Signed"
4. ✅ Verify metadata berisi QR code kedua penandatangan

---

## Checklist Testing

### Ijazah Testing Checklist

- [ ] Dekan dapat login
- [ ] Dekan dapat membuat ijazah
- [ ] Preview ijazah berfungsi
- [ ] Form validation bekerja
- [ ] Redirect ke signing page setelah create
- [ ] Dekan dapat mengisi QR code
- [ ] Dekan dapat menandatangani
- [ ] Status dokumen dekan berubah "signed"
- [ ] Toast message muncul dengan benar
- [ ] Dokumen muncul di dashboard dekan dengan status "signed"
- [ ] Rektor dapat login
- [ ] Rektor menerima dokumen dengan status "pending"
- [ ] Rektor dapat mengisi QR code
- [ ] Rektor dapat menandatangani
- [ ] Status dokumen rektor berubah "signed"
- [ ] Toast message muncul dengan benar
- [ ] Dokumen muncul di dashboard rektor dengan status "signed"
- [ ] Metadata berisi QR code dekan dan rektor
- [ ] Workflow stage: "completed"

### Sertifikat Testing Checklist

- [ ] Dekan Ekonomi dapat login
- [ ] Dekan dapat membuat sertifikat
- [ ] Preview sertifikat berfungsi
- [ ] Form validation bekerja
- [ ] Redirect ke signing page setelah create
- [ ] Penandatangan 1 dapat mengisi QR code
- [ ] Penandatangan 1 dapat menandatangani
- [ ] Status berubah "pending" untuk penandatangan 2
- [ ] Toast message muncul dengan benar
- [ ] Wakil Rektor dapat login
- [ ] Wakil Rektor menerima dokumen dengan status "pending"
- [ ] Penandatangan 2 dapat mengisi QR code
- [ ] Penandatangan 2 dapat menandatangani
- [ ] Status dokumen berubah "signed"
- [ ] Toast message muncul dengan benar
- [ ] Dokumen muncul di dashboard dengan status "signed"
- [ ] Metadata berisi QR code kedua penandatangan
- [ ] Workflow stage: "completed"

---

## Troubleshooting

### Issue: Script gagal dengan error "SUPABASE_SERVICE_ROLE_KEY not found"
**Solution**: 
1. Pastikan file `.env` ada di root project
2. Tambahkan `SUPABASE_SERVICE_ROLE_KEY` ke `.env`
3. Dapatkan service role key dari Supabase Dashboard → Settings → API

### Issue: User sudah ada
**Solution**: 
Script akan otomatis skip dan update data yang sudah ada. Tidak perlu khawatir.

### Issue: Role tidak ter-assign
**Solution**: 
1. Check table `user_roles` di Supabase Dashboard
2. Manual insert jika perlu:
   ```sql
   INSERT INTO user_roles (user_id, role) 
   VALUES ('user-id-here', 'dekan');
   ```

### Issue: Login gagal
**Solution**: 
1. Verify user ada di Authentication → Users
2. Verify email sudah confirmed
3. Reset password jika perlu via Supabase Dashboard

### Issue: Dokumen tidak muncul di dashboard
**Solution**: 
1. Check RLS policies di Supabase
2. Verify user_id di documents table
3. Check console logs untuk error

---

## Database Verification Queries

### Check Users
```sql
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
ORDER BY u.name;
```

### Check Documents
```sql
SELECT 
  d.id,
  d.title,
  d.status,
  d.recipient_name,
  d.metadata->>'workflow_stage' as workflow_stage,
  d.metadata->>'dekan_signed' as dekan_signed,
  d.metadata->>'rektor_signed' as rektor_signed,
  u.name as owner_name,
  u.email as owner_email
FROM documents d
JOIN users u ON d.user_id = u.id
ORDER BY d.created_at DESC
LIMIT 10;
```

### Check Ijazah
```sql
SELECT 
  i.*,
  d.status,
  d.metadata
FROM ijazah i
JOIN documents d ON i.document_id = d.id
ORDER BY i.created_at DESC
LIMIT 10;
```

### Check Sertifikat
```sql
SELECT 
  s.*,
  d.status,
  d.metadata
FROM sertifikat s
JOIN documents d ON s.document_id = d.id
ORDER BY s.created_at DESC
LIMIT 10;
```

---

## Notes

1. **Password Default**: Semua user menggunakan password `Password123!`
2. **Email**: Gunakan email dummy yang sudah disediakan
3. **QR Code**: Isi dengan string apapun untuk testing (contoh: `QR-001`)
4. **Cleanup**: Untuk reset testing, hapus dokumen dari database atau buat dokumen baru

---

## Support

Jika ada masalah saat testing:
1. Check console logs di browser (F12)
2. Check Supabase logs di Dashboard
3. Verify RLS policies
4. Check network requests di DevTools

Happy Testing! 🎉
