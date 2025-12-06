# Quick Fix: file_url Tidak Ter-update

## Cek Cepat (5 Menit)

### 1. Buka Browser Console (F12)
Saat sign dokumen, lihat apakah ada error:

✅ **Success** - Harus muncul:
```
✅ file_url update verified successfully
```

❌ **Error** - Jika muncul:
```
Error updating document with file_url
```

### 2. Check Database
```sql
-- Ganti DOCUMENT_ID dengan ID dokumen yang error
SELECT id, status, file_url 
FROM documents 
WHERE id = 'DOCUMENT_ID';
```

**Hasil**:
- `status = 'signed'` dan `file_url = NULL` → Ada masalah
- `status = 'signed'` dan `file_url = 'https://...'` → OK

### 3. Check Storage
```sql
SELECT name, created_at
FROM storage.objects
WHERE bucket_id = 'signed-documents'
  AND name LIKE '%DOCUMENT_ID%'
ORDER BY created_at DESC;
```

**Hasil**:
- Ada file → Upload berhasil, masalah di update
- Tidak ada file → Upload gagal

## Quick Fixes

### Fix A: Manual Update file_url
Jika file ada di storage tapi `file_url` NULL:

```sql
-- 1. Get file path
SELECT name FROM storage.objects
WHERE bucket_id = 'signed-documents'
  AND name LIKE '%DOCUMENT_ID%'
ORDER BY created_at DESC LIMIT 1;

-- 2. Update document (ganti FILE_PATH dan SUPABASE_URL)
UPDATE documents
SET file_url = 'https://YOUR_SUPABASE_URL/storage/v1/object/public/signed-documents/FILE_PATH'
WHERE id = 'DOCUMENT_ID';
```

### Fix B: Check RLS Policy
```sql
-- Check if UPDATE policy exists
SELECT policyname FROM pg_policies
WHERE tablename = 'documents' AND cmd = 'UPDATE';

-- If empty, create policy:
CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### Fix C: Check Storage Bucket
```sql
-- Check bucket exists
SELECT * FROM storage.buckets WHERE name = 'signed-documents';

-- If empty, create bucket:
INSERT INTO storage.buckets (id, name, public)
VALUES ('signed-documents', 'signed-documents', true);
```

### Fix D: Batch Fix All Missing file_url
```sql
-- Auto-match documents with storage files
WITH storage_files AS (
  SELECT 
    split_part(name, '/', 1)::uuid as user_id,
    split_part(split_part(name, '/', 2), '-signed-', 1)::uuid as document_id,
    name as file_path
  FROM storage.objects
  WHERE bucket_id = 'signed-documents'
)
UPDATE documents d
SET file_url = 'https://YOUR_SUPABASE_URL/storage/v1/object/public/signed-documents/' || sf.file_path
FROM storage_files sf
WHERE d.id = sf.document_id 
  AND d.user_id = sf.user_id
  AND d.status = 'signed'
  AND d.file_url IS NULL;
```

## Perbaikan yang Sudah Diterapkan

✅ **Retry Mechanism** - Update file_url retry 3x jika gagal
✅ **Verification** - Verify file_url ter-update dengan benar
✅ **Enhanced Logging** - Detailed logs di console
✅ **Better Error Messages** - Error messages lebih jelas

## Testing

Setelah apply fix, test dengan:

1. **Sign dokumen baru**
2. **Check console** - Harus muncul `✅ file_url update verified successfully`
3. **Check database** - `file_url` harus terisi
4. **Open file_url** - PDF harus bisa di-download

## Jika Masih Error

1. Copy full error dari console
2. Run diagnostic queries di `FIX_FILE_URL_UPDATE.sql`
3. Check `TROUBLESHOOT_FILE_URL.md` untuk detailed guide
4. Share error details untuk help lebih lanjut

## Files Reference

- `TROUBLESHOOT_FILE_URL.md` - Detailed troubleshooting guide
- `FIX_FILE_URL_UPDATE.sql` - Diagnostic and fix queries
- `CHECK_STORAGE_BUCKET.sql` - Storage bucket checks
- `QUICK_FIX_FILE_URL.md` - This file (quick reference)
