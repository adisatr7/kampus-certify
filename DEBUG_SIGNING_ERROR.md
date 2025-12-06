# Debug: Error Gagal Menandatangani Dokumen

## Langkah-langkah Debugging

### 1. Buka Browser Console
Saat mencoba sign dokumen, buka browser console (F12) dan perhatikan error messages.

### 2. Kemungkinan Penyebab Error

#### A. Data Tidak Ditemukan
**Error**: "Sertifikat data not found" atau "Ijazah data not found"

**Cek di Console**:
```javascript
// Buka browser console dan jalankan:
const { createClient } = await import('@supabase/supabase-js');
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
);

// Ganti DOCUMENT_ID dengan ID dokumen yang error
const documentId = 'DOCUMENT_ID';

// Check document
const { data: doc, error: docError } = await supabase
  .from('documents')
  .select('*')
  .eq('id', documentId)
  .single();

console.log('Document:', doc);
console.log('Document Error:', docError);

// Check sertifikat (jika sertifikat)
const { data: sertifikat, error: sertError } = await supabase
  .from('sertifikat')
  .select('*')
  .eq('document_id', documentId)
  .maybeSingle();

console.log('Sertifikat:', sertifikat);
console.log('Sertifikat Error:', sertError);

// Check ijazah (jika ijazah)
const { data: ijazah, error: ijazahError } = await supabase
  .from('ijazah')
  .select('*')
  .eq('document_id', documentId)
  .maybeSingle();

console.log('Ijazah:', ijazah);
console.log('Ijazah Error:', ijazahError);
```

**Solusi**: Pastikan data sertifikat/ijazah sudah dibuat dengan `document_id` yang benar.

#### B. User/Penandatangan Tidak Ditemukan
**Error**: "Error fetching user data"

**Cek**:
```sql
-- Di Supabase SQL Editor
SELECT d.id, d.title, d.user_id, d.metadata
FROM documents d
WHERE d.id = 'DOCUMENT_ID';

-- Check user exists
SELECT id, name, jabatan, nip
FROM users
WHERE id = 'USER_ID_FROM_METADATA';
```

**Solusi**: Pastikan user yang ditunjuk sebagai penandatangan ada di database.

#### C. Background Image Gagal Load
**Error**: "Image failed to load" atau timeout

**Cek**:
1. Buka DevTools > Network tab
2. Filter by "Img"
3. Cari `certificate-background.webp` atau `ijazah-background.webp`
4. Check status code (harus 200 OK)

**Solusi**:
- Pastikan file ada di folder `public/`
- Check CORS settings jika file dari external source
- Try dengan format lain (jpg/png) jika webp bermasalah

#### D. Memory/Timeout Issue
**Error**: "html2canvas snapshot failed" atau browser freeze

**Solusi**:
1. Refresh browser
2. Clear cache
3. Close tabs lain untuk free up memory
4. Try di browser lain (Chrome/Firefox)

#### E. RLS Policy Issue
**Error**: "permission denied" atau "row level security"

**Cek RLS Policies**:
```sql
-- Check policies untuk table sertifikat
SELECT * FROM pg_policies WHERE tablename = 'sertifikat';

-- Check policies untuk table ijazah
SELECT * FROM pg_policies WHERE tablename = 'ijazah';

-- Check policies untuk table users
SELECT * FROM pg_policies WHERE tablename = 'users';
```

**Solusi**: Pastikan ada SELECT policy yang mengizinkan authenticated users membaca data.

### 3. Quick Fixes

#### Fix 1: Regenerate Document
Jika data corrupt atau incomplete:
1. Delete dokumen yang error
2. Buat ulang dari form
3. Pastikan semua field terisi dengan benar

#### Fix 2: Check Supabase Connection
```javascript
// Di browser console
const { supabase } = await import('@/integrations/supabase/client');
const { data: { session } } = await supabase.auth.getSession();
console.log('Session:', session);
console.log('User:', session?.user);
```

Jika session null, login ulang.

#### Fix 3: Clear Browser State
```javascript
// Di browser console
localStorage.clear();
sessionStorage.clear();
// Kemudian refresh page dan login ulang
```

### 4. Collect Error Details

Jika masih error, collect informasi berikut:

1. **Full Error Message** dari console
2. **Document ID** yang error
3. **Document Type** (Sertifikat/Ijazah)
4. **User Role** (Admin/Dekan/Rektor)
5. **Browser** dan version
6. **Network Requests** dari DevTools (screenshot)

### 5. Common Error Messages

| Error Message | Penyebab | Solusi |
|--------------|----------|--------|
| "Sertifikat data not found" | Tidak ada record di table sertifikat | Buat ulang sertifikat |
| "Failed to fetch sertifikat data: ..." | RLS policy atau permission | Check RLS policies |
| "Error fetching user data" | User tidak ditemukan | Check user_id di metadata |
| "Image failed to load" | Background image tidak accessible | Check file di public/ |
| "html2canvas snapshot failed" | Rendering error atau timeout | Refresh browser, clear cache |
| "Invalid PNG signature" | Canvas tainted atau CORS issue | Check CORS, try allowTaint |
| "Supabase configuration missing" | Env vars tidak tersedia | Check .env file |

## Testing Checklist

Sebelum sign dokumen, pastikan:

- [ ] Dokumen sudah dibuat dengan benar
- [ ] Data sertifikat/ijazah ada di database
- [ ] User penandatangan ada di database
- [ ] Background image accessible
- [ ] Browser console tidak ada error
- [ ] Network tab tidak ada failed requests
- [ ] User sudah login dengan benar
- [ ] RLS policies mengizinkan read access

## Next Steps

Jika sudah follow semua langkah di atas dan masih error:

1. Share full error message dari console
2. Share screenshot dari Network tab
3. Share document ID yang error
4. Saya akan help debug lebih detail
