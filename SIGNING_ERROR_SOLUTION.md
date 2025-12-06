# Solusi Error "Gagal Menandatangani Dokumen"

## Perbaikan yang Sudah Diterapkan

### 1. Enhanced Error Messages
File: `src/pages/DocumentSigningFlow.tsx`

Sekarang error messages lebih spesifik dan memberikan petunjuk solusi:
- "Data dokumen tidak ditemukan" → Buat ulang dokumen
- "Gagal mengambil data" → Periksa koneksi internet
- "Tidak memiliki izin" → Check RLS policies
- "Gagal generate PDF" → Refresh browser
- "Gagal memuat gambar" → Periksa koneksi internet

### 2. Pre-Signing Validation
Sebelum proses signing dimulai, sistem akan check:
- QR code sudah diisi
- Data sertifikat/ijazah ada di database
- User profile tersedia

### 3. Detailed Console Logging
Setiap step signing sekarang di-log ke console:
```
=== Signing Document ===
Document ID: xxx
Document Type: Sertifikat/Ijazah
Workflow Stage: pending_signer1
Next Stage: pending_signer2
Is Final Signature: false
QR Value: xxx

=== Generating Signed PDF ===
Document ID: xxx
Fetched updated document: {...}
Starting PDF generation...
PDF generated successfully, size: 123456 bytes
Uploading PDF to storage...
PDF uploaded successfully: https://...
```

### 4. Robust PDF Generation Error Handling
- Detailed error logging untuk PDF generation
- Signing tetap berhasil meskipun PDF generation gagal
- User diberi notifikasi jelas jika PDF gagal

## Cara Debugging

### Step 1: Buka Browser Console
1. Tekan F12 atau klik kanan → Inspect
2. Pilih tab "Console"
3. Coba sign dokumen
4. Perhatikan log messages dan error

### Step 2: Identifikasi Error Type

#### Error Type A: Data Tidak Ditemukan
**Symptoms**:
```
Error: Data sertifikat tidak ditemukan
Error: Data ijazah tidak ditemukan
```

**Solution**:
1. Jalankan query di Supabase SQL Editor:
```sql
-- Check sertifikat
SELECT * FROM sertifikat WHERE document_id = 'DOCUMENT_ID';

-- Check ijazah
SELECT * FROM ijazah WHERE document_id = 'DOCUMENT_ID';
```

2. Jika tidak ada data, buat ulang dokumen dari form
3. Atau jalankan `FIX_SIGNING_ISSUES.sql` untuk fix orphaned data

#### Error Type B: Permission Denied
**Symptoms**:
```
Error: permission denied for table sertifikat
Error: RLS policy violation
```

**Solution**:
1. Check RLS policies:
```sql
-- Run CHECK_SIGNING_DATA.sql query #8
```

2. Jika policy tidak ada, jalankan:
```sql
-- See FIX_IJAZAH_RLS_SIMPLE.sql
```

#### Error Type C: Image Load Failed
**Symptoms**:
```
Image failed to load
html2canvas snapshot failed
```

**Solution**:
1. Check file exists:
   - `/public/certificate-background.webp`
   - `/public/ijazah-background.webp`
   - `/public/logo-university.png`

2. Check Network tab di DevTools:
   - Pastikan images return 200 OK
   - Check CORS headers

3. Try refresh browser dan clear cache

#### Error Type D: PDF Generation Failed
**Symptoms**:
```
=== PDF Generation Error ===
Error type: Error
Error message: ...
```

**Solution**:
1. Check console logs untuk specific error
2. Try di browser lain (Chrome/Firefox)
3. Clear browser cache
4. Check memory usage (close other tabs)

### Step 3: Run Diagnostic Queries

Jalankan di Supabase SQL Editor:

```sql
-- 1. Check document data
SELECT * FROM documents WHERE id = 'DOCUMENT_ID';

-- 2. Check sertifikat/ijazah data
SELECT * FROM sertifikat WHERE document_id = 'DOCUMENT_ID';
SELECT * FROM ijazah WHERE document_id = 'DOCUMENT_ID';

-- 3. Check user data
SELECT u.* FROM users u
JOIN documents d ON d.user_id = u.id
WHERE d.id = 'DOCUMENT_ID';

-- 4. Check metadata
SELECT 
  id,
  title,
  status,
  metadata
FROM documents 
WHERE id = 'DOCUMENT_ID';
```

### Step 4: Apply Fixes

Pilih fix yang sesuai dari `FIX_SIGNING_ISSUES.sql`:

1. **Fix missing metadata**: Run FIX 2
2. **Fix missing signer IDs**: Run FIX 3
3. **Reset stuck documents**: Run FIX 4
4. **Fix RLS policies**: Run FIX 5
5. **Clean duplicates**: Run FIX 6

## Quick Fixes

### Fix 1: Refresh dan Retry
```
1. Refresh browser (Ctrl+F5)
2. Clear cache
3. Login ulang
4. Retry signing
```

### Fix 2: Recreate Document
```
1. Delete dokumen yang error
2. Buat ulang dari form
3. Pastikan semua field terisi
4. Retry signing
```

### Fix 3: Check Browser Console
```
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages
4. Copy error message
5. Search in this document for solution
```

### Fix 4: Check Network
```
1. Open DevTools (F12)
2. Go to Network tab
3. Filter by "Img" or "Fetch"
4. Look for failed requests (red)
5. Check status codes
```

## Common Error Messages

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "Silakan masukkan QR code terlebih dahulu" | QR code field kosong | Isi QR code sebelum sign |
| "Data sertifikat tidak ditemukan" | Sertifikat record tidak ada | Buat ulang dokumen |
| "Data ijazah tidak ditemukan" | Ijazah record tidak ada | Buat ulang dokumen |
| "Failed to fetch document" | Network error atau RLS | Check koneksi & RLS |
| "Updated document not found" | Document deleted/missing | Buat ulang dokumen |
| "Failed to upload PDF to storage" | Storage bucket issue | Check storage policies |
| "html2canvas snapshot failed" | Rendering error | Refresh browser |
| "Image failed to load" | Image tidak accessible | Check file di public/ |

## Testing Checklist

Sebelum sign dokumen:

- [ ] Browser console tidak ada error
- [ ] Network tab tidak ada failed requests
- [ ] User sudah login
- [ ] Dokumen status = "pending"
- [ ] QR code field terisi
- [ ] Data sertifikat/ijazah ada di database
- [ ] User penandatangan ada di database
- [ ] Background images accessible
- [ ] RLS policies allow read access

## Next Steps

Jika masih error setelah follow semua langkah:

1. **Collect Information**:
   - Full error message dari console
   - Document ID yang error
   - Screenshot dari Network tab
   - Browser dan version

2. **Run Diagnostics**:
   ```sql
   -- Run all queries in CHECK_SIGNING_DATA.sql
   ```

3. **Share Details**:
   - Error message
   - Console logs
   - Query results
   - Screenshots

4. **Contact Support**:
   - Provide all collected information
   - Mention steps already tried
   - Include document ID

## Files Created

1. `DEBUG_SIGNING_ERROR.md` - Detailed debugging guide
2. `CHECK_SIGNING_DATA.sql` - Diagnostic queries
3. `FIX_SIGNING_ISSUES.sql` - Quick fix scripts
4. `SIGNING_ERROR_SOLUTION.md` - This file

## Code Changes

1. `src/pages/DocumentSigningFlow.tsx`:
   - Enhanced error messages
   - Pre-signing validation
   - Detailed console logging
   - Robust PDF generation error handling

## How to Use

1. **Saat error terjadi**:
   - Buka browser console
   - Lihat error message
   - Cari error di tabel "Common Error Messages"
   - Follow solusi yang diberikan

2. **Untuk debugging**:
   - Follow "Cara Debugging" section
   - Run diagnostic queries
   - Apply fixes yang sesuai

3. **Untuk prevention**:
   - Follow "Testing Checklist" sebelum sign
   - Ensure data integrity
   - Check RLS policies
   - Verify file accessibility
