# Quick Start - Testing Ijazah & Sertifikat

## 🚀 Setup Dummy Users (5 menit)

### Option 1: Automatic (Recommended)
```bash
# Pastikan .env sudah ada dengan SUPABASE_SERVICE_ROLE_KEY
npx tsx scripts/createDummyUsers.ts
```

### Option 2: Manual
Lihat file `TESTING_GUIDE.md` untuk instruksi lengkap.

---

## 👥 Login Credentials

| Role | Email | Password | Untuk Testing |
|------|-------|----------|---------------|
| Dekan Teknik | `dekan.teknik@university.ac.id` | `Password123!` | Buat & TTD Ijazah |
| Rektor | `rektor@university.ac.id` | `Password123!` | TTD Ijazah |
| Dekan Ekonomi | `dekan.ekonomi@university.ac.id` | `Password123!` | Buat & TTD Sertifikat |
| Wakil Rektor | `warek@university.ac.id` | `Password123!` | TTD Sertifikat |

---

## 📝 Test Ijazah (10 menit)

### 1. Login sebagai Dekan Teknik
```
Email: dekan.teknik@university.ac.id
Password: Password123!
```

### 2. Buat Ijazah
- Go to: `/create-ijazah`
- Isi form (Nama: Budi Setiawan, NIM: 2020010001, dll)
- Pilih Rektor: Prof. Dr. Ir. Budi Santoso, M.Sc.
- Preview → Buat Ijazah

### 3. Dekan TTD
- Isi QR Code: `DEKAN-QR-001`
- Tanda Tangani
- ✅ Check: Status "Signed" di dashboard

### 4. Login sebagai Rektor
```
Email: rektor@university.ac.id
Password: Password123!
```

### 5. Rektor TTD
- Go to: `/user/documents`
- Klik Tandatangani
- Isi QR Code: `REKTOR-QR-001`
- Tanda Tangani
- ✅ Check: Status "Signed" di dashboard

### 6. Verify
- Login kembali sebagai Dekan
- ✅ Check: Dokumen masih "Signed"
- ✅ Check: Metadata berisi QR code dekan & rektor

---

## 🎓 Test Sertifikat (10 menit)

### 1. Login sebagai Dekan Ekonomi
```
Email: dekan.ekonomi@university.ac.id
Password: Password123!
```

### 2. Buat Sertifikat
- Go to: `/create-sertifikat`
- Isi form (Nama: Andi Wijaya, Kegiatan: Pelatihan Digital Marketing, dll)
- Penandatangan 1: Dr. Siti Nurhaliza, S.E., M.M.
- Penandatangan 2: Dr. Ir. Eko Prasetyo, M.T.
- Preview → Buat Sertifikat

### 3. Penandatangan 1 TTD
- Isi QR Code: `DEKAN-EKONOMI-QR-001`
- Tanda Tangani
- ✅ Check: Dokumen terkirim ke penandatangan 2

### 4. Login sebagai Wakil Rektor
```
Email: warek@university.ac.id
Password: Password123!
```

### 5. Penandatangan 2 TTD
- Go to: `/user/documents`
- Klik Tandatangani
- Isi QR Code: `WAREK-QR-001`
- Tanda Tangani
- ✅ Check: Status "Signed" di dashboard

### 6. Verify
- Login kembali sebagai Dekan Ekonomi
- ✅ Check: Dokumen "Signed"
- ✅ Check: Metadata berisi QR code kedua penandatangan

---

## ✅ Expected Results

### Ijazah
- ✅ Dokumen dekan: status "signed"
- ✅ Dokumen rektor: status "signed"
- ✅ QR code dekan tersimpan
- ✅ QR code rektor tersimpan
- ✅ Workflow stage: "completed"

### Sertifikat
- ✅ Dokumen dengan status "signed"
- ✅ QR code penandatangan 1 tersimpan
- ✅ QR code penandatangan 2 tersimpan
- ✅ Workflow stage: "completed"

---

## 🐛 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Script gagal | Check `.env` ada `SUPABASE_SERVICE_ROLE_KEY` |
| Login gagal | Verify user di Supabase Dashboard → Authentication |
| Dokumen tidak muncul | Check RLS policies & console logs |
| QR code tidak tersimpan | Check metadata di database |

---

## 📚 Full Documentation

- **Detailed Testing Guide**: `TESTING_GUIDE.md`
- **Workflow Documentation**: `IJAZAH_WORKFLOW_IMPROVED.md`
- **Flow Comparison**: `IJAZAH_FLOW_COMPARISON.md`
- **Verification Checklist**: `FLOW_VERIFICATION_CHECKLIST.md`

---

## 🎉 Happy Testing!

Jika ada masalah, check:
1. Browser console (F12)
2. Supabase logs
3. Network requests
4. Database records
