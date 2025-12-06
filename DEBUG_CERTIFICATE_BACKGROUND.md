# Debug Certificate Background Issue

## Masalah
Background sertifikat masih putih saat preview dokumen yang sudah dibuat sebelumnya.

## Debug Steps

### Step 1: Buka Browser Console
1. Buka aplikasi di browser
2. Tekan F12 untuk buka DevTools
3. Pilih tab "Console"

### Step 2: Preview Sertifikat
1. Buka sertifikat yang sudah dibuat
2. Klik tombol "Lihat" atau "Preview"
3. Perhatikan console logs

### Step 3: Periksa Console Logs

Anda harus melihat logs berikut:

```
Template selection: {
  templateId: undefined,
  sertifikatTemplateId: null,
  idToUse: "default"
}
Template found: Template Default - Border Emas
Certificate template: Template Default - Border Emas
Certificate background URL: /certificate-background.webp
Template object: { id: "default", name: "...", ... }
```

**Kemudian salah satu dari:**
- ✅ `Background image loaded successfully` - **BAGUS!**
- ❌ `Failed to load background image: /certificate-background.webp` - **MASALAH!**

### Step 4: Periksa Network Tab

1. Buka tab "Network" di DevTools
2. Filter: "certificate"
3. Preview sertifikat lagi
4. Periksa request ke `certificate-background.webp`

**Expected**:
- Status: 200 OK
- Type: image/webp
- Size: ~14KB

**If 404**:
- File tidak ditemukan
- Path salah

**If Failed**:
- CORS issue
- Network issue

### Step 5: Verifikasi File

```bash
# Check file exists
ls -la public/certificate-background.webp

# Check file size
du -h public/certificate-background.webp

# Check file type
file public/certificate-background.webp
```

**Expected output**:
```
-rw-rw-r-- 1 user user 14K Dec 4 21:44 public/certificate-background.webp
14K     public/certificate-background.webp
public/certificate-background.webp: RIFF (little-endian) data, Web/P image
```

### Step 6: Test Direct Access

Buka di browser:
```
http://localhost:8080/certificate-background.webp
```

**Expected**: Image harus muncul di browser

**If 404**: File tidak accessible, ada masalah dengan Vite config

### Step 7: Hard Reload

```bash
# Clear cache dan reload
Ctrl + Shift + R

# Atau clear all cache
Ctrl + Shift + Delete
```

### Step 8: Restart Dev Server

```bash
# Stop server
Ctrl + C

# Start again
npm run dev
```

## Common Issues & Solutions

### Issue 1: Template ID Null
**Symptom**: Console shows `sertifikatTemplateId: null`

**Solution**: Update database untuk set default template_id

```sql
-- Update existing sertifikat
UPDATE sertifikat 
SET template_id = 'default' 
WHERE template_id IS NULL;
```

### Issue 2: Background URL Wrong
**Symptom**: Console shows wrong URL like `undefined/certificate-background.webp`

**Solution**: Check `import.meta.env.BASE_URL`

```typescript
console.log("BASE_URL:", import.meta.env.BASE_URL);
```

### Issue 3: Image Not Loading
**Symptom**: Console shows `Failed to load background image`

**Solution A**: Check file permissions
```bash
chmod 644 public/certificate-background.webp
```

**Solution B**: Try absolute URL
```typescript
const backgroundUrl = "http://localhost:8080/certificate-background.webp";
```

**Solution C**: Convert to PNG
```bash
convert public/certificate-background.webp public/certificate-background.png
```

Update code:
```typescript
background_url: "/certificate-background.png",
```

### Issue 4: Vite Not Serving Public Files
**Symptom**: Direct access to `http://localhost:8080/certificate-background.webp` returns 404

**Solution**: Check `vite.config.ts`

```typescript
export default defineConfig({
  publicDir: 'public', // Should be set
  // ...
});
```

### Issue 5: Browser Cache
**Symptom**: Old version of image showing

**Solution**: 
```bash
# Hard reload
Ctrl + Shift + R

# Or add cache buster
const backgroundUrl = `/certificate-background.webp?v=${Date.now()}`;
```

## Quick Fix: Force Reload Image

Add to SertifikatTemplate.tsx:

```typescript
const [imageKey, setImageKey] = useState(Date.now());

// In img tag
<img
  key={imageKey}
  src={`${backgroundUrl}?v=${imageKey}`}
  // ...
/>

// Force reload button (for debugging)
<button onClick={() => setImageKey(Date.now())}>
  Reload Background
</button>
```

## Alternative: Use CSS Background

If img tag still not working, fallback to CSS:

```typescript
<div
  className="relative w-full bg-white"
  style={{
    aspectRatio: "1.414",
    background: `url(${backgroundUrl}) center/cover no-repeat`,
  }}
>
  {/* No img tag needed */}
  <div className="absolute inset-0 flex flex-col items-center justify-center p-12 z-10">
    {/* Content */}
  </div>
</div>
```

## Checklist

Untuk memastikan background muncul:

- [ ] File `public/certificate-background.webp` exists
- [ ] File size ~14KB (not 0 bytes)
- [ ] File type is WebP
- [ ] File permissions 644
- [ ] Direct access works: `http://localhost:8080/certificate-background.webp`
- [ ] Console shows "Template found: Template Default - Border Emas"
- [ ] Console shows correct background URL
- [ ] Console shows "✅ Background image loaded successfully"
- [ ] Network tab shows 200 OK for image
- [ ] Browser cache cleared
- [ ] Dev server restarted

## Expected Console Output

```
Template selection: {
  templateId: undefined,
  sertifikatTemplateId: null,
  idToUse: "default"
}
Template found: Template Default - Border Emas
Certificate template: Template Default - Border Emas
Certificate background URL: /certificate-background.webp
Template object: {
  id: "default",
  name: "Template Default - Border Emas",
  background_url: "/certificate-background.webp",
  ...
}
✅ Background image loaded successfully
```

## Next Steps

1. **Buka browser console** dan preview sertifikat
2. **Copy semua console logs** dan share jika masih ada masalah
3. **Screenshot Network tab** untuk melihat request
4. **Screenshot sertifikat** untuk melihat tampilan actual

Dengan debug logs yang ditambahkan, kita bisa identify masalah dengan lebih mudah!
