# Update Desain Sertifikat - Sesuai Mockup

## Perubahan Desain

### Layout Baru
Sertifikat sekarang mengikuti desain mockup dengan:
- Background dengan border emas di sudut
- Judul "SERTIFIKAT" dengan warna emas (darkgoldenrod)
- Subtitle "PENGHARGAAN" dengan letter-spacing lebar
- Nama peserta dengan font script/cursive yang elegan
- Deskripsi lengkap dengan format paragraph
- QR code di atas nama penandatangan

### Warna Template Default

**Before**:
```typescript
colors: {
  primary: "#1F2937", // gray-800
  secondary: "#4B5563", // gray-600
  text: "#374151", // gray-700
}
```

**After**:
```typescript
colors: {
  primary: "#B8860B", // darkgoldenrod - untuk judul & nama
  secondary: "#6B7280", // gray-500 - untuk subtitle
  text: "#4B5563", // gray-600 - untuk body text
}
```

### Typography

**Judul "SERTIFIKAT"**:
- Font size: 5xl (3rem)
- Font weight: bold
- Letter spacing: 0.3em
- Color: darkgoldenrod (#B8860B)

**Subtitle "PENGHARGAAN"**:
- Font size: xl (1.25rem)
- Letter spacing: 0.5em
- Uppercase
- Color: gray-500

**Nama Peserta**:
- Font size: 5xl (3rem)
- Font family: 'Brush Script MT', cursive
- Italic
- Color: darkgoldenrod (#B8860B)

**Body Text**:
- Font size: sm (0.875rem)
- Line height: 1.8
- Color: gray-600
- Serif font

### Content Structure

**Header**:
```
SERTIFIKAT
PENGHARGAAN
No. CERT/0001/UMC/XI/2025
```

**Body**:
```
Dengan rasa hormat dan bangga, kami
menganugerahkan penghargaan ini kepada

[Nama Lengkap]

Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya 
dalam kegiatan sosial dan budaya yang diselenggarakan oleh 
Universitas Muhammadiyah Cirebon dengan tema [Nama Acara] 
pada tanggal [Tanggal]. Semoga ilmu yang didapat membawa 
keberkahan dan menjadi amal jariyah.
```

**Footer**:
```
[QR Code]              [QR Code]
Nama Lengkap + Gelar   Nama Lengkap + Gelar
NIP                    NIP
[Nama]                 [Nama]
[Jabatan]              [Jabatan]
```

## File yang Dimodifikasi

### 1. src/types/CertificateTemplate.ts
- Update warna template default ke emas/coklat
- Font heading dan body keduanya serif

### 2. src/components/SertifikatTemplate.tsx
- Update header dengan letter-spacing lebar
- Tambah subtitle "PENGHARGAAN"
- Nama peserta dengan font cursive
- Body text dengan paragraph lengkap
- Footer dengan QR code di atas nama
- Label "Nama Lengkap + Gelar" dan "NIP"

## Implementasi Detail

### Header Section
```typescript
<h1
  className="text-5xl font-bold mb-1 tracking-widest"
  style={{
    color: template.colors.primary,
    fontFamily: template.fonts.heading,
    letterSpacing: "0.3em",
  }}
>
  SERTIFIKAT
</h1>
<p
  className="text-xl tracking-widest uppercase mb-3"
  style={{
    color: template.colors.secondary,
    fontFamily: template.fonts.body,
    letterSpacing: "0.5em",
  }}
>
  PENGHARGAAN
</p>
```

### Nama Peserta
```typescript
<h2
  className="text-5xl font-bold mb-8 italic"
  style={{
    color: template.colors.primary,
    fontFamily: "'Brush Script MT', cursive",
  }}
>
  {sertifikat.nama_peserta}
</h2>
```

### Body Text
```typescript
<p
  className="text-sm leading-relaxed max-w-2xl mx-auto"
  style={{
    color: template.colors.text,
    fontFamily: template.fonts.body,
    lineHeight: "1.8",
  }}
>
  Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya 
  dalam kegiatan sosial dan budaya yang diselenggarakan oleh 
  Universitas Muhammadiyah Cirebon dengan tema{" "}
  <span className="font-semibold">{sertifikat.nama_acara}</span> 
  pada tanggal{" "}
  <span className="font-semibold">{tanggal}</span>. 
  Semoga ilmu yang didapat membawa keberkahan dan menjadi amal jariyah.
</p>
```

### Signature Section
```typescript
<div className="text-center">
  {showQR && qrValue && (
    <div className="flex justify-center mb-2">
      <canvas ref={qrRef1} />
    </div>
  )}
  <p className="text-xs mb-1">Nama Lengkap + Gelar</p>
  <p className="text-xs mb-1">NIP</p>
  <p className="text-sm font-bold mt-2">{penandatangan1.name}</p>
  <p className="text-xs">{penandatangan1.jabatan}</p>
</div>
```

## Font Fallbacks

Untuk font cursive nama peserta:
```css
font-family: 'Brush Script MT', cursive
```

Fallback fonts:
- Brush Script MT (Windows)
- Apple Chancery (Mac)
- cursive (generic)

## Testing

### Visual Testing
- [ ] Background dengan border emas muncul
- [ ] Judul "SERTIFIKAT" warna emas
- [ ] Subtitle "PENGHARGAAN" dengan spacing lebar
- [ ] Nama peserta dengan font cursive
- [ ] Body text readable dengan line-height 1.8
- [ ] QR code di atas nama penandatangan
- [ ] Layout seimbang dan proporsional

### Content Testing
- [ ] Nomor sertifikat ditampilkan
- [ ] Nama peserta ditampilkan dengan benar
- [ ] Nama acara ditampilkan dalam paragraph
- [ ] Tanggal ditampilkan dengan format Indonesia
- [ ] Nama penandatangan ditampilkan
- [ ] Jabatan penandatangan ditampilkan

### Responsive Testing
- [ ] Layout baik di desktop
- [ ] Layout baik di tablet
- [ ] Layout baik di mobile
- [ ] Print preview sesuai

## Preview

Untuk melihat hasil:
1. Buka "Buat Sertifikat"
2. Pilih "Template Default - Border Emas"
3. Isi data sertifikat
4. Klik "Preview"
5. Sertifikat harus sesuai dengan mockup

## Notes

- Font cursive mungkin berbeda di setiap OS
- Warna emas (#B8860B) sesuai dengan mockup
- Letter-spacing membuat judul lebih elegan
- Line-height 1.8 membuat text lebih readable
- QR code size 80x80 pixels

## Summary

✅ Layout sesuai mockup
✅ Warna emas untuk judul dan nama
✅ Font cursive untuk nama peserta
✅ Letter-spacing lebar untuk judul
✅ Body text dengan paragraph lengkap
✅ QR code di atas nama penandatangan
✅ Label "Nama Lengkap + Gelar" dan "NIP"

Desain sertifikat sekarang sesuai dengan mockup yang Anda berikan!
