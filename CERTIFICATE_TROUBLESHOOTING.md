# Certificate Background Troubleshooting

## Masalah: Background Tidak Muncul (Putih Polos)

### Langkah-langkah Troubleshooting:

#### 1. Verifikasi File Background Ada
```bash
ls -la public/certificate-background.webp
```

Jika file tidak ada, copy dari lokasi asli:
```bash
cp /home/krisna/Downloads/4c98172c-4e1d-455c-be3c-e9eef2cbfa73_1764726977.webp public/certificate-background.webp
```

#### 2. Periksa Console Browser
1. Buka browser DevTools (F12)
2. Buka tab Console
3. Cari log: "Certificate background URL: ..."
4. Periksa apakah URL benar

#### 3. Periksa Network Tab
1. Buka browser DevTools (F12)
2. Buka tab Network
3. Filter: "certificate-background"
4. Reload halaman
5. Periksa status request:
   - **200 OK**: File berhasil dimuat
   - **404 Not Found**: File tidak ditemukan
   - **Failed**: CORS atau network error

#### 4. Clear Browser Cache
```bash
# Chrome/Chromium
Ctrl + Shift + Delete
# Atau hard reload
Ctrl + Shift + R
```

#### 5. Restart Vite Dev Server
```bash
# Stop server (Ctrl + C)
# Start again
npm run dev
```

#### 6. Periksa Path di Code
File: `src/components/SertifikatTemplate.tsx`

```typescript
const backgroundUrl = `${import.meta.env.BASE_URL || "/"}certificate-background.webp`;
```

Pastikan:
- `import.meta.env.BASE_URL` benar
- Path tidak ada typo
- File extension benar (.webp)

#### 7. Test dengan URL Absolut
Temporary test dengan URL absolut:

```typescript
const backgroundUrl = "http://localhost:8080/certificate-background.webp";
```

Jika ini berhasil, masalahnya ada di BASE_URL.

#### 8. Periksa File Permissions
```bash
chmod 644 public/certificate-background.webp
```

#### 9. Periksa File Size
```bash
ls -lh public/certificate-background.webp
```

Jika file terlalu besar (>5MB), compress:
```bash
# Install imagemagick jika belum
sudo apt install imagemagick

# Compress
convert public/certificate-background.webp -quality 85 public/certificate-background-compressed.webp
mv public/certificate-background-compressed.webp public/certificate-background.webp
```

#### 10. Test dengan Format Lain
Convert ke PNG untuk test:
```bash
convert public/certificate-background.webp public/certificate-background.png
```

Update code untuk gunakan PNG:
```typescript
const backgroundUrl = `${import.meta.env.BASE_URL || "/"}certificate-background.png`;
```

## Fallback Border

Saya sudah menambahkan border kuning sebagai fallback:
```typescript
className="relative w-full bg-white border-8 border-yellow-500"
```

Jika background tidak load, border kuning akan terlihat.

## Debug Console Log

Saya sudah menambahkan console log untuk debug:
```typescript
useEffect(() => {
  console.log("Certificate background URL:", backgroundUrl);
}, [backgroundUrl]);
```

Periksa console untuk melihat URL yang digunakan.

## Solusi Alternatif: Inline Base64

Jika masalah persist, convert image ke base64:

```bash
# Generate base64
base64 public/certificate-background.webp > certificate-base64.txt
```

Kemudian gunakan di code:
```typescript
const backgroundUrl = "data:image/webp;base64,<paste-base64-here>";
```

**Catatan**: Base64 akan membuat file component besar.

## Solusi Alternatif: Import Image

Import image langsung di component:

```typescript
import certificateBackground from "/certificate-background.webp";

// Di component
style={{
  backgroundImage: `url(${certificateBackground})`,
}}
```

## Checklist Debugging

- [ ] File ada di `public/certificate-background.webp`
- [ ] File permissions benar (644)
- [ ] File size reasonable (<2MB)
- [ ] Browser cache cleared
- [ ] Dev server restarted
- [ ] Console log menunjukkan URL benar
- [ ] Network tab menunjukkan 200 OK
- [ ] Border kuning terlihat (fallback)
- [ ] Tested dengan URL absolut
- [ ] Tested dengan format lain (PNG)

## Jika Semua Gagal

1. **Gunakan CSS background dengan Tailwind**:
```typescript
<div className="relative w-full bg-white bg-[url('/certificate-background.webp')] bg-cover bg-center bg-no-repeat">
```

2. **Gunakan img tag dengan absolute positioning**:
```typescript
<div className="relative w-full">
  <img 
    src="/certificate-background.webp" 
    alt="background"
    className="absolute inset-0 w-full h-full object-cover"
  />
  <div className="relative z-10">
    {/* Content */}
  </div>
</div>
```

3. **Contact support** dengan:
   - Screenshot console errors
   - Screenshot network tab
   - Browser version
   - OS version
