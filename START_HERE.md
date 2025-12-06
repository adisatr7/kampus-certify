# 🚀 START HERE - Testing Ijazah & Sertifikat

## Quick Guide untuk Testing End-to-End

### 📋 Yang Perlu Anda Lakukan:

## STEP 1: Buat Test Users (10 menit)

### Cara Termudah: Manual via Supabase Dashboard

1. **Buka Supabase Dashboard**
   - URL: https://supabase.com/dashboard
   - Project: `zupygwgwsrcwhkwhuwtk`

2. **Buat 4 Users** di Authentication → Users:

| Email | Password | Name | Role |
|-------|----------|------|------|
| `dekan.teknik@university.ac.id` | `Password123!` | Dr. Ahmad Hidayat, S.T., M.T. | dekan |
| `rektor@university.ac.id` | `Password123!` | Prof. Dr. Ir. Budi Santoso, M.Sc. | rektor |
| `dekan.ekonomi@university.ac.id` | `Password123!` | Dr. Siti Nurhaliza, S.E., M.M. | dekan |
| `warek@university.ac.id` | `Password123!` | Dr. Ir. Eko Prasetyo, M.T. | user |

3. **Untuk setiap user**:
   - Create di Authentication → Users (Auto Confirm: YES)
   - Insert ke table `users` (copy user ID)
   - Insert ke table `user_roles` (assign role)

**Detail lengkap**: Lihat file `MANUAL_TESTING_STEPS.md`

---

## STEP 2: Test Ijazah (15 menit)

### Quick Flow:

1. **Login**: `dekan.teknik@university.ac.id` / `Password123!`
2. **Buat Ijazah**: `/create-ijazah`
   - Nama: Budi Setiawan
   - NIM: 2020010001
   - Pilih Rektor: Prof. Dr. Ir. Budi Santoso
3. **Dekan TTD**: QR Code = `DEKAN-QR-001`
4. **Logout → Login**: `rektor@university.ac.id` / `Password123!`
5. **Rektor TTD**: QR Code = `REKTOR-QR-001`
6. **✅ Verify**: Kedua dokumen status "Signed"

---

## STEP 3: Test Sertifikat (15 menit)

### Quick Flow:

1. **Login**: `dekan.ekonomi@university.ac.id` / `Password123!`
2. **Buat Sertifikat**: `/create-sertifikat`
   - Nama: Andi Wijaya
   - Kegiatan: Pelatihan Digital Marketing
   - Penandatangan 1: Dr. Siti Nurhaliza
   - Penandatangan 2: Dr. Ir. Eko Prasetyo
3. **Penandatangan 1 TTD**: QR Code = `DEKAN-EKONOMI-QR-001`
4. **Logout → Login**: `warek@university.ac.id` / `Password123!`
5. **Penandatangan 2 TTD**: QR Code = `WAREK-QR-001`
6. **✅ Verify**: Dokumen status "Signed"

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| **`MANUAL_TESTING_STEPS.md`** | 📖 Panduan lengkap step-by-step |
| **`QUICK_START_TESTING.md`** | ⚡ Quick reference |
| **`TESTING_GUIDE.md`** | 📚 Full testing guide |
| `IJAZAH_WORKFLOW_IMPROVED.md` | 📋 Workflow documentation |
| `FLOW_VERIFICATION_CHECKLIST.md` | ✅ Checklist verifikasi |

---

## ✅ Success Criteria

Setelah testing, Anda harus bisa:

- ✅ Login dengan semua test users
- ✅ Buat ijazah dan sertifikat
- ✅ Lihat preview sebelum dibuat
- ✅ Tanda tangani dengan QR code
- ✅ Status berubah "signed" dengan benar
- ✅ Dokumen muncul di dashboard
- ✅ Workflow otomatis (dekan → rektor)
- ✅ Metadata berisi QR codes

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Login gagal | Check user di Authentication, verify email confirmed |
| Dropdown kosong | Check table `users` dan `user_roles` |
| Dokumen tidak muncul | Check console logs, verify RLS policies |
| QR code tidak tersimpan | Check metadata di documents table |

---

## 🎯 Next Steps

1. **Baca**: `MANUAL_TESTING_STEPS.md` untuk detail lengkap
2. **Buat**: Test users di Supabase Dashboard
3. **Test**: Ikuti flow ijazah dan sertifikat
4. **Verify**: Check database dan dashboard
5. **Report**: Catat hasil testing

---

## 💡 Tips

- Gunakan browser incognito untuk testing multiple users
- Check console logs (F12) jika ada error
- Verify database records di Supabase Dashboard
- Screenshot hasil testing untuk dokumentasi

---

**Ready to test? Start with `MANUAL_TESTING_STEPS.md`! 🚀**
