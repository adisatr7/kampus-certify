# Troubleshooting: file_url Tidak Ter-update

## Masalah
PDF berhasil di-generate dan di-upload ke storage, tapi `file_url` tidak ter-update di table `documents`.

## Penyebab Potensial

### 1. RLS Policy Blocking Update
**Symptoms**: Console log menunjukkan "Error updating document with file_url: permission denied"

**Check**:
```sql
-- Run in Supabase SQL Editor
SELECT policyname, qual, with_check
FROM pg_policies
WHERE tablename = 'documents' AND cmd = 'UPDATE';
```

**Fix**:
```sql
-- Ensure policy allows user to update their own documents
CREATE POLICY "Users can update their own documents"
ON documents FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

### 2. Storage Bucket Tidak Ada
**Symptoms**: Console log menunjukkan "bucket not found" atau upload error

**Check**:
```sql
SELECT * FROM storage.buckets WHERE name = 'signed-documents';
```

**Fix**: Run `CHECK_STORAGE_BUCKET.sql` dan create bucket jika belum ada.

### 3. Upload Gagal Tapi Tidak Terdeteksi
**Symptoms**: `fileUrl` is null atau undefined

**Check**: Browser console untuk log dari `uploadSignedPDF`:
```
=== Upload Signed PDF ===
User ID: xxx
Document ID: xxx
PDF Blob size: xxx bytes
Upload path: xxx
```

**Fix**: Check storage policies dan quota.

### 4. Race Condition
**Symptoms**: Update terjadi terlalu cepat sebelum transaction selesai

**Fix**: ✅ **FIXED** - Added retry mechanism dengan 3 attempts dan 1 second delay.

### 5. Network Error
**Symptoms**: Request timeout atau connection error

**Fix**: ✅ **FIXED** - Added retry mechanism dan better error logging.

## Perbaikan yang Sudah Diterapkan

### 1. Enhanced Upload Logging
File: `src/lib/pdfSigner.ts`

Sekarang setiap step upload di-log:
```
=== Upload Signed PDF ===
User ID: xxx
Document ID: xxx
PDF Blob size: xxx bytes
Upload path: xxx
Upload successful: {...}
Public URL generated: xxx
File verification: {...}
```

### 2. Retry Mechanism
File: `src/pages/DocumentSigningFlow.tsx`

Update `file_url` sekarang retry sampai 3x jika gagal:
```typescript
let updateSuccess = false;
let retryCount = 0;
const maxRetries = 3;

while (!updateSuccess && retryCount < maxRetries) {
  // Try update
  // If error, wait 1 second and retry
}
```

### 3. Update Verification
Setelah update, sistem verify bahwa `file_url` benar-benar ter-update:
```typescript
const { data: verifyData } = await supabase
  .from("documents")
  .select("file_url")
  .eq("id", document.id)
  .single();

if (verifyData?.file_url === fileUrl) {
  console.log("✅ file_url update verified successfully");
}
```

### 4. Better Error Messages
Jika update gagal setelah 3 attempts, error message sekarang include file URL:
```
Failed to update document with file_url after 3 attempts. 
File uploaded to: https://...
```

## Cara Debug

### Step 1: Check Console Logs
Saat signing dokumen, perhatikan console logs:

**Expected Success Flow**:
```
=== Signing Document ===
Document ID: xxx
...
=== Generating Signed PDF ===
Starting PDF generation...
PDF generated successfully, size: xxx bytes
=== Upload Signed PDF ===
Upload successful: {...}
Public URL generated: https://...
Attempting to update file_url (attempt 1/3)...
Document updated with file_url: [...]
✅ file_url update verified successfully
```

**If Error Occurs**:
```
Error updating document with file_url (attempt 1): {...}
Retrying in 1 second...
Attempting to update file_url (attempt 2/3)...
```

### Step 2: Check Database
```sql
-- Check if document exists and status
SELECT id, title, status, file_url, user_id
FROM documents
WHERE id = 'DOCUMENT_ID';

-- Check if file exists in storage
SELECT name, created_at, metadata->>'size' as size
FROM storage.objects
WHERE bucket_id = 'signed-documents'
  AND name LIKE '%DOCUMENT_ID%';
```

### Step 3: Check RLS Policies
```sql
-- Run FIX_FILE_URL_UPDATE.sql query #3
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'documents'
ORDER BY policyname;
```

### Step 4: Manual Fix
Jika file ada di storage tapi `file_url` tidak ter-update:

```sql
-- Get file path from storage
SELECT name FROM storage.objects
WHERE bucket_id = 'signed-documents'
  AND name LIKE '%DOCUMENT_ID%'
ORDER BY created_at DESC
LIMIT 1;

-- Manually update file_url
UPDATE documents
SET file_url = 'https://YOUR_SUPABASE_URL/storage/v1/object/public/signed-documents/FILE_PATH'
WHERE id = 'DOCUMENT_ID';
```

## Diagnostic Queries

### Query 1: Find Documents Without file_url
```sql
SELECT 
  d.id,
  d.title,
  d.status,
  d.user_id,
  d.created_at,
  u.name as user_name
FROM documents d
LEFT JOIN users u ON d.user_id = u.id
WHERE d.status = 'signed'
  AND d.file_url IS NULL
ORDER BY d.created_at DESC;
```

### Query 2: Match Documents with Storage Files
```sql
SELECT 
  d.id as document_id,
  d.title,
  d.status,
  d.file_url as current_file_url,
  o.name as storage_file_path,
  'https://' || current_setting('app.settings.supabase_url', true) || 
    '/storage/v1/object/public/signed-documents/' || o.name as should_be_url
FROM documents d
LEFT JOIN storage.objects o ON 
  o.bucket_id = 'signed-documents' AND
  o.name LIKE d.user_id::text || '/' || d.id::text || '%'
WHERE d.status = 'signed'
ORDER BY d.created_at DESC;
```

### Query 3: Check Storage Upload Success Rate
```sql
SELECT 
  DATE(created_at) as date,
  COUNT(*) as uploads,
  COUNT(DISTINCT split_part(name, '/', 1)) as unique_users
FROM storage.objects
WHERE bucket_id = 'signed-documents'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Automated Fixes

### Fix 1: Batch Update Missing file_url
Run `FIX_FILE_URL_UPDATE.sql` FIX #2 untuk automatically match documents dengan storage files.

### Fix 2: Create Trigger for Auto-Update
Run `FIX_FILE_URL_UPDATE.sql` FIX #3 untuk create trigger yang automatically update `file_url` saat file di-upload.

### Fix 3: Enable Monitoring
Run `FIX_FILE_URL_UPDATE.sql` MONITORING section untuk create log table yang track semua `file_url` changes.

## Prevention

### 1. Always Check Console
Sebelum report issue, check browser console untuk detailed logs.

### 2. Verify Storage Bucket
Pastikan bucket `signed-documents` exists dan accessible:
```sql
SELECT * FROM storage.buckets WHERE name = 'signed-documents';
```

### 3. Test RLS Policies
Pastikan authenticated users bisa update documents:
```sql
-- Test as specific user
SET LOCAL role = authenticated;
SET LOCAL request.jwt.claims = '{"sub": "USER_ID"}';

UPDATE documents
SET file_url = 'test'
WHERE id = 'DOCUMENT_ID';

-- Should succeed without error
```

### 4. Monitor Storage Quota
Check storage usage untuk ensure tidak exceed quota:
```sql
SELECT 
  bucket_id,
  COUNT(*) as file_count,
  pg_size_pretty(SUM((metadata->>'size')::bigint)) as total_size
FROM storage.objects
GROUP BY bucket_id;
```

## Testing

### Manual Test
1. Sign dokumen
2. Check console logs untuk success messages
3. Verify di database:
   ```sql
   SELECT file_url FROM documents WHERE id = 'DOCUMENT_ID';
   ```
4. Verify file accessible:
   - Copy `file_url` dari database
   - Paste di browser
   - Should download PDF

### Automated Test
```javascript
// In browser console after signing
const { supabase } = await import('@/integrations/supabase/client');

// Check document
const { data: doc } = await supabase
  .from('documents')
  .select('*')
  .eq('id', 'DOCUMENT_ID')
  .single();

console.log('Document:', doc);
console.log('file_url:', doc.file_url);

// Try to fetch the file
if (doc.file_url) {
  const response = await fetch(doc.file_url);
  console.log('File accessible:', response.ok);
  console.log('File size:', response.headers.get('content-length'));
}
```

## Common Errors

| Error | Penyebab | Solusi |
|-------|----------|--------|
| "permission denied for table documents" | RLS policy blocking | Add UPDATE policy |
| "bucket not found" | Storage bucket tidak ada | Create bucket |
| "Failed to update file_url after 3 attempts" | Network/RLS/Lock issue | Check logs, run manual fix |
| "File verification mismatch" | Race condition | Retry mechanism should handle |
| "Upload error: quota exceeded" | Storage quota full | Clean old files or upgrade |

## Files Created

1. `CHECK_STORAGE_BUCKET.sql` - Check bucket configuration
2. `FIX_FILE_URL_UPDATE.sql` - Diagnostic and fix queries
3. `TROUBLESHOOT_FILE_URL.md` - This file

## Code Changes

1. `src/lib/pdfSigner.ts`:
   - Enhanced upload logging
   - File verification after upload
   - Better error messages

2. `src/pages/DocumentSigningFlow.tsx`:
   - Retry mechanism (3 attempts)
   - Update verification
   - Better error handling
   - Separate retry for dekan document

## Next Steps

Jika masih ada issue:

1. **Collect Logs**:
   - Full console output
   - Document ID
   - User ID
   - Timestamp

2. **Run Diagnostics**:
   ```sql
   -- Run all queries in FIX_FILE_URL_UPDATE.sql
   ```

3. **Manual Fix**:
   - Find file in storage
   - Manually update `file_url`
   - Verify file accessible

4. **Report Issue**:
   - Include all logs
   - Include query results
   - Include steps to reproduce
