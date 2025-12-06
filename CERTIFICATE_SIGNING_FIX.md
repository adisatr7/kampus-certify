# Fix Error Gagal Menandatangani Dokumen Sertifikat

## Masalah
Error "Gagal menandatangani dokumen" saat mencoba sign sertifikat.

## Penyebab Potensial
1. Sertifikat data tidak ditemukan di database
2. User data penandatangan tidak ditemukan
3. Background image gagal load
4. html2canvas timeout atau error
5. Memory leak dari React component yang tidak di-cleanup

## Perbaikan yang Diterapkan

### 1. Improved Error Logging
Menambahkan detailed logging di setiap step:
```typescript
console.log("Rendering sertifikat template for document:", doc.id);
console.log("Fetching sertifikat data for document_id:", doc.id);
console.log("Sertifikat data fetched:", sertifikatData);
console.log("Fetching user data for signer:", signerId);
console.log("User data fetched:", userData);
```

### 2. Better Error Handling
Menambahkan error handling untuk setiap database query:
```typescript
const { data: sertifikatData, error: sertifikatError } = await supabase
  .from("sertifikat")
  .select("*")
  .eq("document_id", doc.id)
  .maybeSingle();

if (sertifikatError) {
  console.error("Error fetching sertifikat data:", sertifikatError);
  throw new Error(`Failed to fetch sertifikat data: ${sertifikatError.message}`);
}
```

### 3. Proper Signer ID Resolution
Menggunakan metadata untuk mendapatkan signer yang benar:
```typescript
const metadata = (doc.metadata as any) || {};
const signerId = metadata.signer1_id || doc.user_id;
```

### 4. Memory Leak Prevention
Menambahkan proper cleanup di catch block:
```typescript
let container: HTMLDivElement | null = null;
let root: any = null;

try {
  // ... rendering code
} catch (err) {
  // Cleanup
  if (root) {
    root.unmount();
  }
  if (container && container.parentNode) {
    document.body.removeChild(container);
  }
  throw err;
}
```

### 5. Image Loading Improvements
- Set `crossOrigin: "anonymous"` pada semua images
- Timeout 10 detik per image
- Continue meskipun ada image yang gagal load
- Extra settle time 1 detik setelah semua images loaded

## Debugging Steps

### 1. Check Console Logs
Buka browser console dan lihat log messages:
```
Rendering sertifikat template for document: xxx
Fetching sertifikat data for document_id: xxx
Sertifikat data fetched: {...}
Fetching user data for signer: xxx
User data fetched: {...}
Waiting for X images to load...
✅ Image 1/2 loaded successfully (1208x854)
✅ Image 2/2 loaded successfully (200x200)
Waiting for layout to settle...
Full-page canvas dimensions: 2481 x 3508
```

### 2. Check Database
Pastikan data ada di database:
```sql
-- Check sertifikat data
SELECT * FROM sertifikat WHERE document_id = 'xxx';

-- Check document metadata
SELECT metadata FROM documents WHERE id = 'xxx';

-- Check user data
SELECT id, name, jabatan FROM users WHERE id = 'xxx';
```

### 3. Check Network
Di browser DevTools > Network tab:
- Pastikan background image berhasil di-load (200 OK)
- Check CORS headers jika ada error

### 4. Check Supabase RLS
Pastikan RLS policies mengizinkan:
- Read access ke table `sertifikat`
- Read access ke table `users`

## Common Errors

### Error: "Sertifikat data not found"
**Penyebab**: Tidak ada record di table `sertifikat` dengan `document_id` yang sesuai

**Solusi**:
1. Check apakah sertifikat sudah dibuat dengan benar
2. Verify `document_id` di table `sertifikat` match dengan `documents.id`

### Error: "Supabase configuration missing"
**Penyebab**: Environment variables tidak tersedia di runtime

**Solusi**: ✅ **FIXED** - Menggunakan existing supabase client
```typescript
// Fixed: Use existing client instead of creating new one
const { supabase } = await import("@/integrations/supabase/client");
```

### Error: "Failed to fetch sertifikat data: ..."
**Penyebab**: RLS policy atau permission issue

**Solusi**:
1. Check RLS policies di Supabase dashboard
2. Pastikan anon key memiliki read access
3. Check apakah user authenticated

### Error: "Image failed to load"
**Penyebab**: Background image tidak accessible atau CORS issue

**Solusi**:
1. Verify file `/certificate-background.webp` exists di `public/`
2. Check CORS headers di server
3. Try dengan `allowTaint: true` di html2canvas options

### Error: "html2canvas snapshot failed"
**Penyebab**: Timeout, memory issue, atau rendering error

**Solusi**:
1. Increase `imageTimeout` di html2canvas options
2. Check browser console untuk detailed error
3. Try dengan browser yang berbeda
4. Clear browser cache

## Testing

### Manual Test
1. Buat sertifikat baru dari form
2. Klik "Buat Sertifikat"
3. Buka halaman "Dokumen Saya"
4. Klik "Tandatangani" pada sertifikat
5. Masukkan passphrase
6. Klik "Tandatangani Dokumen"
7. Check console logs untuk errors
8. Verify PDF ter-generate dengan background

### Check Generated PDF
1. Setelah signing berhasil, buka dokumen
2. Verify background image muncul
3. Verify QR code muncul
4. Verify semua text readable
5. Download PDF dan check di PDF reader

## Performance Notes
- PDF generation memakan waktu 2-5 detik
- Tergantung ukuran background image
- Tergantung kecepatan network untuk fetch data
- Browser memory usage akan spike sementara

## Next Steps
Jika masih ada error:
1. Copy full error message dari console
2. Copy network requests dari DevTools
3. Check Supabase logs untuk database errors
4. Share error details untuk debugging lebih lanjut
