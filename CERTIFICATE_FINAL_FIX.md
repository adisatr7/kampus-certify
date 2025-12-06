# Certificate Background - Final Fix

## Masalah
Background sertifikat tidak muncul (putih polos) meskipun file sudah ada di `public/certificate-background.webp`.

## Root Cause
CSS `backgroundImage` dengan `url()` kadang tidak reliable di Vite dev server, terutama untuk file di folder `public/`.

## Solusi Final
Menggunakan `<img>` tag dengan absolute positioning sebagai background, bukan CSS `backgroundImage`.

## Implementasi

### Before (CSS Background):
```typescript
<div
  style={{
    backgroundImage: `url(${backgroundUrl})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  }}
>
  {/* Content */}
</div>
```

### After (IMG Tag):
```typescript
<div className="relative w-full bg-white" style={{ aspectRatio: "1.414" }}>
  {/* Background Image */}
  <img
    src={backgroundUrl}
    alt="Certificate Background"
    className="absolute inset-0 w-full h-full object-cover"
    onError={(e) => {
      console.error("Failed to load background image");
      e.currentTarget.style.display = "none";
    }}
  />

  {/* Content Container */}
  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
    {/* Content */}
  </div>
</div>
```

## Keuntungan Solusi Ini

### 1. More Reliable
- `<img>` tag lebih reliable untuk loading images
- Browser handle caching lebih baik
- Easier to debug (visible in Network tab)

### 2. Error Handling
```typescript
onError={(e) => {
  console.error("Failed to load background image");
  e.currentTarget.style.display = "none";
}}
```
- Jika image gagal load, hide img tag
- Log error ke console untuk debugging
- Fallback ke background putih

### 3. Better Performance
- Browser can preload image
- Better caching strategy
- Faster rendering

### 4. Easier Debugging
- Visible in Network tab dengan nama file
- Can inspect img element in DevTools
- Can see actual src URL

## Testing

### 1. Buka Preview Sertifikat
```bash
npm run dev
```

1. Login ke aplikasi
2. Buka "Buat Sertifikat"
3. Isi form
4. Klik "Preview"
5. Background harus muncul dengan border emas

### 2. Periksa Console
```javascript
// Harus muncul log:
"Certificate background URL: /certificate-background.webp"
```

### 3. Periksa Network Tab
1. Buka DevTools (F12)
2. Tab Network
3. Filter: "certificate"
4. Harus ada request ke `certificate-background.webp`
5. Status: 200 OK

### 4. Periksa Element
1. Inspect element sertifikat
2. Harus ada `<img>` tag dengan src ke background
3. Image harus visible (not display: none)

## Fallback Strategy

### Level 1: IMG Tag
Primary method - paling reliable

### Level 2: Hide on Error
Jika image gagal load, hide img tag:
```typescript
onError={(e) => {
  e.currentTarget.style.display = "none";
}}
```

### Level 3: White Background
Jika img hidden, fallback ke white background:
```typescript
className="relative w-full bg-white"
```

### Level 4: Border (Optional)
Bisa tambahkan border sebagai visual indicator:
```typescript
className="relative w-full bg-white border-8 border-yellow-500"
```

## File Structure

```
public/
  └── certificate-background.webp  (14KB)

src/
  └── components/
      ├── SertifikatTemplate.tsx   (Uses img tag)
      ├── SertifikatPreview.tsx    (Preview dialog)
      └── SignedDocumentViewer.tsx (Viewer with detection)
```

## Environment Variables

```typescript
const backgroundUrl = `${import.meta.env.BASE_URL || "/"}certificate-background.webp`;
```

- `import.meta.env.BASE_URL`: Vite base URL (default: "/")
- Fallback: "/" if BASE_URL not set
- Result: "/certificate-background.webp"

## Production Build

Untuk production build:

```bash
npm run build
```

File di `public/` akan di-copy ke `dist/`:
```
dist/
  └── certificate-background.webp
```

URL tetap sama: `/certificate-background.webp`

## Troubleshooting

### Background masih tidak muncul?

1. **Clear cache**:
```bash
Ctrl + Shift + R  # Hard reload
```

2. **Restart dev server**:
```bash
# Stop (Ctrl + C)
npm run dev
```

3. **Check file exists**:
```bash
ls -la public/certificate-background.webp
```

4. **Check console for errors**:
```
Failed to load background image
```

5. **Check Network tab**:
- Status 404: File not found
- Status 200: File loaded successfully

### Image terlalu besar?

Compress dengan imagemagick:
```bash
convert public/certificate-background.webp -quality 85 -resize 1920x1357 public/certificate-background.webp
```

## Summary

✅ Menggunakan `<img>` tag untuk background
✅ Error handling dengan onError
✅ Fallback ke white background
✅ Debug logging
✅ Better performance
✅ Easier to debug
✅ Production ready

Background sertifikat sekarang harus muncul dengan border emas yang elegan!
