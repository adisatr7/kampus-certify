# Fix: CORS Error pada Logo External

## Masalah
Error CORS saat generate PDF karena logo menggunakan URL external:
```
Access to image at 'https://muslimahnews.id/...' from origin 'http://localhost:8080' 
has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present
```

## Root Cause
- Logo ijazah menggunakan URL external (`muslimahnews.id`)
- Server external tidak mengirim CORS headers
- html2canvas tidak bisa load image dari external URL tanpa CORS headers
- PDF generation gagal karena image tidak ter-load

## Perbaikan

### 1. Buat Logo Lokal
File: `public/logo-umc.svg`

SVG placeholder logo yang bisa digunakan tanpa CORS issues.

### 2. Update Default Logo URL
Files yang diupdate:
- `src/pages/CreateIjazahNew.tsx` - Default logo_url ke `/logo-umc.svg`
- `src/pages/admin/CreateIjazah.tsx` - Default logo_url ke `/logo-umc.svg`
- `src/components/IjazahPreview.tsx` - Fallback logo ke `/logo-umc.svg`
- `src/lib/pdfSigner.ts` - Fallback logo ke `/logo-umc.svg`

### 3. Add Error Handler dengan Fallback
File: `src/components/IjazahTemplate.tsx`

```tsx
<img
  src={logoUrl}
  alt="Logo"
  crossOrigin="anonymous"
  onError={(e) => {
    // Fallback to local logo if external URL fails (CORS)
    const target = e.currentTarget;
    if (!target.src.includes("/logo-umc.svg")) {
      console.warn("Logo failed to load, using fallback:", logoUrl);
      target.src = "/logo-umc.svg";
    } else {
      target.style.display = "none";
    }
  }}
/>
```

### 4. Fix Data yang Sudah Ada
Jalankan `FIX_LOGO_URL.sql` di Supabase SQL Editor:

```sql
-- Update semua ijazah dengan external URL ke local logo
UPDATE ijazah
SET logo_url = '/logo-umc.svg'
WHERE logo_url LIKE 'http%'
  AND logo_url NOT LIKE '%supabase%';
```

## Files Created/Modified

### Created:
- `public/logo-umc.svg` - Logo placeholder lokal
- `FIX_LOGO_URL.sql` - Script untuk fix data di database
- `FIX_CORS_LOGO.md` - Dokumentasi ini

### Modified:
- `src/pages/CreateIjazahNew.tsx`
- `src/pages/admin/CreateIjazah.tsx`
- `src/components/IjazahPreview.tsx`
- `src/components/IjazahTemplate.tsx`
- `src/lib/pdfSigner.ts`

## Testing

### Test 1: Buat Ijazah Baru
1. Buat ijazah baru (logo_url default ke `/logo-umc.svg`)
2. Sign ijazah
3. Verify PDF ter-generate tanpa CORS error

### Test 2: Fix Ijazah yang Sudah Ada
1. Jalankan `FIX_LOGO_URL.sql`
2. Sign ijazah yang sudah ada
3. Verify PDF ter-generate tanpa CORS error

### Test 3: Custom Logo
Jika ingin menggunakan logo custom:
1. Upload logo ke Supabase Storage
2. Gunakan URL dari Supabase Storage (sudah handle CORS)
3. Atau simpan logo di folder `public/` dan gunakan path relatif

## Catatan Penting

### Menggunakan Logo Custom
Jika ingin menggunakan logo universitas yang sebenarnya:

**Option A: Upload ke Supabase Storage**
1. Upload file logo ke bucket di Supabase
2. Gunakan public URL dari Supabase
3. Supabase sudah handle CORS headers

**Option B: Simpan di folder public/**
1. Download logo dan simpan di `public/logo-umc.png`
2. Update default logo_url ke `/logo-umc.png`
3. Path relatif tidak kena CORS

**Option C: Proxy melalui backend**
1. Buat endpoint backend yang fetch image
2. Return image dengan CORS headers
3. Gunakan URL endpoint sebagai logo_url

### Jangan Gunakan External URL
External URL seperti:
- `https://muslimahnews.id/...`
- `https://example.com/logo.png`
- `https://cdn.somewhere.com/image.jpg`

Akan menyebabkan CORS error kecuali server mengirim header:
```
Access-Control-Allow-Origin: *
```

## Troubleshooting

### Error: "Image failed to load"
1. Check console untuk URL yang gagal
2. Pastikan file ada di `public/` folder
3. Pastikan path benar (case-sensitive)

### Error: "CORS policy"
1. Jangan gunakan external URL
2. Upload ke Supabase Storage atau simpan di `public/`
3. Jalankan `FIX_LOGO_URL.sql` untuk fix data lama

### Logo Tidak Muncul di PDF
1. Check console untuk error
2. Verify file logo ada dan accessible
3. Try dengan browser lain
4. Clear browser cache
