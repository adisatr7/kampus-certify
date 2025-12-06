# Manual Testing Steps - Ijazah & Sertifikat

## 🎯 Cara Tercepat: Manual Create via Supabase Dashboard

Karena keterbatasan dengan service role key, cara termudah adalah membuat user manual via Supabase Dashboard.

---

## 📝 STEP 1: Buat Test Users (10 menit)

### 1.1 Buka Supabase Dashboard
1. Go to: https://supabase.com/dashboard
2. Pilih project: `zupygwgwsrcwhkwhuwtk`
3. Go to: **Authentication** → **Users**

### 1.2 Create User 1: Dekan Teknik
1. Klik **"Add User"** atau **"Invite"**
2. Isi form:
   - **Email**: `dekan.teknik@university.ac.id`
   - **Password**: `Password123!`
   - **Auto Confirm User**: ✅ **YES** (penting!)
3. Klik **"Create User"** atau **"Send Invite"**
4. **COPY USER ID** yang muncul (contoh: `abc123-def456-...`)

### 1.3 Insert ke public.users
1. Go to: **Table Editor** → **users**
2. Klik **"Insert"** → **"Insert row"**
3. Isi data:
   - **id**: [paste User ID dari step 1.2]
   - **name**: `Dr. Ahmad Hidayat, S.T., M.T.`
   - **email**: `dekan.teknik@university.ac.id`
   - **nip**: `198501012010011001`
   - **jabatan**: `Dekan Fakultas Teknik`
4. Klik **"Save"**

### 1.4 Assign Role
1. Go to: **Table Editor** → **user_roles**
2. Klik **"Insert"** → **"Insert row"**
3. Isi data:
   - **user_id**: [paste User ID dari step 1.2]
   - **role**: `dekan`
4. Klik **"Save"**

### 1.5 Ulangi untuk User Lainnya

**User 2: Rektor**
- Email: `rektor@university.ac.id`
- Password: `Password123!`
- Name: `Prof. Dr. Ir. Budi Santoso, M.Sc.`
- NIP: `197801011998011001`
- Jabatan: `Rektor Universitas`
- Role: `rektor`

**User 3: Dekan Ekonomi**
- Email: `dekan.ekonomi@university.ac.id`
- Password: `Password123!`
- Name: `Dr. Siti Nurhaliza, S.E., M.M.`
- NIP: `198701012012012001`
- Jabatan: `Dekan Fakultas Ekonomi`
- Role: `dekan`

**User 4: Wakil Rektor**
- Email: `warek@university.ac.id`
- Password: `Password123!`
- Name: `Dr. Ir. Eko Prasetyo, M.T.`
- NIP: `198001012005011001`
- Jabatan: `Wakil Rektor Bidang Akademik`
- Role: `user`

---

## 🧪 STEP 2: Test Ijazah End-to-End (15 menit)

### 2.1 Login sebagai Dekan Teknik
1. Buka aplikasi: http://localhost:5173 (atau URL Anda)
2. Klik **"Login"**
3. Masukkan:
   - Email: `dekan.teknik@university.ac.id`
   - Password: `Password123!`
4. Klik **"Sign In"**
5. ✅ **Verify**: Anda masuk ke dashboard

### 2.2 Buat Ijazah
1. Navigate ke: `/create-ijazah` atau klik menu **"Buat Ijazah"**
2. Isi form:
   - **Nama Mahasiswa**: `Budi Setiawan`
   - **NIM**: `2020010001`
   - **Nama Fakultas**: `Teknik Informatika`
   - **Gelar**: `Sarjana Teknik (S.T.)`
   - **Tanggal Terbit**: `2024-12-06` (atau tanggal hari ini)
   - **Rektor Penandatangan**: Pilih `Prof. Dr. Ir. Budi Santoso, M.Sc.`
   - **Logo URL**: (biarkan default)
3. Klik **"Preview"**
4. ✅ **Verify**: Modal preview muncul dengan data yang benar
5. Close preview
6. Klik **"Buat Ijazah"**
7. ✅ **Verify**: 
   - Toast muncul: "Ijazah berhasil dibuat..."
   - Redirect ke halaman signing

### 2.3 Dekan Menandatangani
1. ✅ **Verify**: Anda di halaman `/document-signing/{id}`
2. ✅ **Verify**: Data ijazah ditampilkan dengan benar
3. Isi **QR Code**: `DEKAN-QR-001` (atau string apapun)
4. Klik **"Tanda Tangani Dokumen"**
5. ✅ **Verify**:
   - Toast muncul: "Ijazah berhasil ditandatangani dan dikirim ke Rektor"
   - Redirect ke `/user/documents`
6. ✅ **Verify**: Dokumen muncul di tabel dengan:
   - Status: **"Signed"** (badge hijau)
   - Nama: "Ijazah - Budi Setiawan"

### 2.4 Logout dan Login sebagai Rektor
1. Klik profile/avatar di pojok kanan atas
2. Klik **"Logout"**
3. Klik **"Login"**
4. Masukkan:
   - Email: `rektor@university.ac.id`
   - Password: `Password123!`
5. Klik **"Sign In"**
6. ✅ **Verify**: Anda masuk sebagai Rektor

### 2.5 Rektor Melihat Dokumen
1. Navigate ke: `/user/documents` atau klik menu **"My Documents"**
2. ✅ **Verify**: Dokumen baru muncul dengan:
   - Status: **"Pending"** (badge kuning/orange)
   - Nama: "Ijazah - Budi Setiawan"
   - Tombol: **"Tandatangani"**

### 2.6 Rektor Menandatangani
1. Klik **"Tandatangani"** pada dokumen
2. ✅ **Verify**: Redirect ke halaman signing
3. ✅ **Verify**: Data ijazah ditampilkan dengan benar
4. ✅ **Verify**: Ada info bahwa dekan sudah tanda tangan
5. Isi **QR Code**: `REKTOR-QR-001` (atau string apapun)
6. Klik **"Tanda Tangani Dokumen"**
7. ✅ **Verify**:
   - Toast muncul: "Ijazah berhasil ditandatangani. Dokumen selesai."
   - Redirect ke `/user/documents`
8. ✅ **Verify**: Dokumen muncul dengan:
   - Status: **"Signed"** (badge hijau)

### 2.7 Verifikasi Final - Login Kembali sebagai Dekan
1. Logout dari Rektor
2. Login sebagai Dekan Teknik
3. Navigate ke `/user/documents`
4. ✅ **Verify**: Dokumen masih ada dengan status **"Signed"**
5. ✅ **Verify**: Metadata berisi QR code dekan dan rektor

### 2.8 Check Database (Optional)
1. Go to Supabase Dashboard → **Table Editor** → **documents**
2. Filter by title: "Ijazah - Budi Setiawan"
3. ✅ **Verify**: Ada 2 dokumen:
   - Dokumen 1: user_id = dekan_id, status = "signed"
   - Dokumen 2: user_id = rektor_id, status = "signed"
4. Click pada dokumen, check **metadata**:
   - ✅ dekan_signed: true
   - ✅ dekan_qr_code: "DEKAN-QR-001"
   - ✅ rektor_signed: true
   - ✅ rektor_qr_code: "REKTOR-QR-001"
   - ✅ workflow_stage: "completed"

---

## 🎓 STEP 3: Test Sertifikat End-to-End (15 menit)

### 3.1 Login sebagai Dekan Ekonomi
1. Logout dari user sebelumnya
2. Login dengan:
   - Email: `dekan.ekonomi@university.ac.id`
   - Password: `Password123!`
3. ✅ **Verify**: Anda masuk ke dashboard

### 3.2 Buat Sertifikat
1. Navigate ke: `/create-sertifikat` atau klik menu **"Buat Sertifikat"**
2. Isi form:
   - **Nama Peserta**: `Andi Wijaya`
   - **Template Sertifikat**: `Template Default - Border Emas`
   - **Jenis Sertifikat**: `Pelatihan`
   - **Nama Kegiatan**: `Pelatihan Digital Marketing`
   - **Penyelenggara**: `Fakultas Ekonomi`
   - **Tanggal Pelaksanaan**: `2024-12-06`
   - **Nomor Sertifikat**: `001/CERT/FE/2024`
   - **Penandatangan 1**: Pilih `Dr. Siti Nurhaliza, S.E., M.M.`
   - **Penandatangan 2**: Pilih `Dr. Ir. Eko Prasetyo, M.T.`
3. Klik **"Preview"**
4. ✅ **Verify**: Modal preview muncul dengan design sertifikat
5. Close preview
6. Klik **"Buat Sertifikat"**
7. ✅ **Verify**: 
   - Toast muncul: "Sertifikat berhasil dibuat..."
   - Redirect ke `/user/documents`

### 3.3 Penandatangan 1 (Dekan Ekonomi) Menandatangani
1. ✅ **Verify**: Dokumen muncul dengan status **"Pending"**
2. Klik **"Tandatangani"**
3. ✅ **Verify**: Data sertifikat ditampilkan dengan benar
4. Isi **QR Code**: `DEKAN-EKONOMI-QR-001`
5. Klik **"Tanda Tangani Dokumen"**
6. ✅ **Verify**:
   - Toast muncul: "Dokumen berhasil ditandatangani"
   - Redirect ke `/user/documents`
7. ✅ **Verify**: Status masih **"Pending"** (menunggu penandatangan 2)

### 3.4 Login sebagai Wakil Rektor
1. Logout dari Dekan Ekonomi
2. Login dengan:
   - Email: `warek@university.ac.id`
   - Password: `Password123!`
3. ✅ **Verify**: Anda masuk ke dashboard

### 3.5 Penandatangan 2 (Wakil Rektor) Menandatangani
1. Navigate ke `/user/documents`
2. ✅ **Verify**: Dokumen baru muncul dengan status **"Pending"**
3. Klik **"Tandatangani"**
4. ✅ **Verify**: Data sertifikat ditampilkan
5. Isi **QR Code**: `WAREK-QR-001`
6. Klik **"Tanda Tangani Dokumen"**
7. ✅ **Verify**:
   - Toast muncul: "Dokumen berhasil ditandatangani"
   - Redirect ke `/user/documents`
8. ✅ **Verify**: Status berubah menjadi **"Signed"**

### 3.6 Verifikasi Final
1. Login kembali sebagai Dekan Ekonomi
2. Navigate ke `/user/documents`
3. ✅ **Verify**: Dokumen dengan status **"Signed"**
4. ✅ **Verify**: Metadata berisi QR code kedua penandatangan

---

## ✅ Checklist Testing

### Ijazah
- [ ] User dekan dan rektor berhasil dibuat
- [ ] Login sebagai dekan berhasil
- [ ] Form create ijazah berfungsi
- [ ] Preview ijazah muncul
- [ ] Ijazah berhasil dibuat
- [ ] Redirect ke signing page
- [ ] Dekan dapat mengisi QR code
- [ ] Dekan dapat menandatangani
- [ ] Status dokumen dekan = "signed"
- [ ] Toast message muncul
- [ ] Dokumen muncul di dashboard dekan
- [ ] Login sebagai rektor berhasil
- [ ] Rektor menerima dokumen pending
- [ ] Rektor dapat mengisi QR code
- [ ] Rektor dapat menandatangani
- [ ] Status dokumen rektor = "signed"
- [ ] Dokumen muncul di dashboard rektor
- [ ] Metadata berisi QR code dekan & rektor
- [ ] Workflow stage = "completed"

### Sertifikat
- [ ] User dekan ekonomi dan warek berhasil dibuat
- [ ] Login sebagai dekan ekonomi berhasil
- [ ] Form create sertifikat berfungsi
- [ ] Preview sertifikat muncul
- [ ] Sertifikat berhasil dibuat
- [ ] Penandatangan 1 dapat mengisi QR code
- [ ] Penandatangan 1 dapat menandatangani
- [ ] Status = "pending" untuk penandatangan 2
- [ ] Login sebagai warek berhasil
- [ ] Warek menerima dokumen pending
- [ ] Penandatangan 2 dapat mengisi QR code
- [ ] Penandatangan 2 dapat menandatangani
- [ ] Status dokumen = "signed"
- [ ] Metadata berisi QR code kedua penandatangan
- [ ] Workflow stage = "completed"

---

## 🐛 Troubleshooting

### Issue: Login gagal
**Check**:
1. User ada di Authentication → Users?
2. Email confirmed?
3. Password benar?

**Solution**: Reset password via Supabase Dashboard

### Issue: Dropdown rektor/penandatangan kosong
**Check**:
1. User ada di table `users`?
2. Role sudah di-assign di `user_roles`?

**Solution**: Insert manual di table editor

### Issue: Dokumen tidak muncul di dashboard
**Check**:
1. Console logs (F12)
2. Network requests
3. RLS policies

**Solution**: Check user_id di documents table

### Issue: QR code tidak tersimpan
**Check**:
1. Metadata di documents table
2. Console logs

**Solution**: Verify update query berhasil

---

## 📊 Expected Results

### Database State After Testing

**documents table**:
- 2 dokumen ijazah (dekan + rektor), status = "signed"
- 1 dokumen sertifikat, status = "signed"

**ijazah table**:
- 2 records (linked ke dokumen dekan dan rektor)

**sertifikat table**:
- 1 record

**Metadata structure**:
```json
{
  "workflow_stage": "completed",
  "dekan_signed": true,
  "dekan_qr_code": "DEKAN-QR-001",
  "rektor_signed": true,
  "rektor_qr_code": "REKTOR-QR-001"
}
```

---

## 🎉 Success Criteria

✅ Semua user berhasil dibuat  
✅ Login berfungsi untuk semua user  
✅ Ijazah dapat dibuat dan ditandatangani  
✅ Sertifikat dapat dibuat dan ditandatangani  
✅ Status berubah menjadi "signed" dengan benar  
✅ QR code tersimpan di metadata  
✅ Workflow stage = "completed"  
✅ Dokumen muncul di dashboard dengan benar  

---

**Happy Testing! 🚀**
