# Fix Background Putih Saat Print Sertifikat

## Masalah
Background image sertifikat tidak muncul (blank putih) saat print atau print preview, dan juga tidak muncul di PDF yang di-generate.

## Penyebab
1. Browser secara default tidak mencetak background images untuk menghemat tinta
2. `html2canvas` tidak mengcapture background images secara default
3. `SignedDocumentTemplate` tidak menggunakan `SertifikatTemplate` untuk sertifikat
4. CORS issues dengan loading background images

## Solusi yang Diterapkan

### 1. Menggunakan SertifikatTemplate untuk PDF Generation (src/lib/pdfSigner.ts)
Memodifikasi `generateSignedPDF` untuk:
- Mendeteksi apakah document adalah sertifikat
- Menggunakan `SertifikatTemplate` component untuk render sertifikat
- Fetch data sertifikat dan penandatangan dari database
- Render dengan background image yang benar

```typescript
const isSertifikat = doc.title?.toLowerCase().includes("sertifikat");

if (isSertifikat) {
  // Fetch sertifikat data and render with SertifikatTemplate
  root.render(
    React.createElement(SertifikatTemplate, {
      sertifikat: sertifikatData,
      qrValue: qrContent,
      showQR: true,
      penandatangan1: userData,
      templateId: sertifikatData.template_id,
    })
  );
}
```

### 2. html2canvas Configuration
Mengupdate opsi html2canvas untuk capture background:
- `allowTaint: true` - Mengizinkan tainted canvas untuk capture background images
- `foreignObjectRendering: false` - Menggunakan native rendering untuk support background lebih baik
- `imageTimeout: 15000` - Menunggu lebih lama untuk images load
- `crossOrigin: "anonymous"` - Set CORS untuk images

### 3. Image Loading Wait
Menambahkan wait logic yang lebih robust:
- Force set `crossOrigin` pada semua images
- Wait dengan timeout 10 detik per image
- Logging detail untuk debugging
- Extra settle time 1 detik setelah semua images loaded

### 4. CSS Print Styles (src/index.css)
Menambahkan print styles dengan properti:
- `-webkit-print-color-adjust: exact` - untuk Chrome/Safari
- `print-color-adjust: exact` - untuk Firefox
- `color-adjust: exact` - standar CSS

```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    color-adjust: exact !important;
  }
  
  img {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
    display: block !important;
    opacity: 1 !important;
  }
}
```

### 5. Inline Styles pada Komponen (SertifikatTemplate.tsx)
Menambahkan inline styles pada elemen img dan container:
```typescript
style={{
  WebkitPrintColorAdjust: "exact",
  printColorAdjust: "exact",
  colorAdjust: "exact",
}}
```

### 6. Tailwind Print Classes
Menambahkan utility classes:
- `print:bg-white` - memastikan background putih saat print
- `print:opacity-100` - memastikan opacity penuh
- `print:hidden` - menyembunyikan elemen yang tidak perlu
- `print:p-0` - menghilangkan padding saat print

### 7. Fallback Background
Menambahkan fallback background color jika image gagal load:
```typescript
style={{
  backgroundColor: "#f9fafb",
}}
```

### 8. Template Background URL
Memastikan semua template menggunakan background yang tersedia:
- Default: `/certificate-background.webp`
- Modern: `/certificate-background.webp` (sementara)
- Classic: `/certificate-background.webp` (sementara)

## Cara Menggunakan

### Print dari Browser
1. Buka preview sertifikat
2. Klik tombol "Print"
3. Di dialog print, pastikan:
   - "Background graphics" dicentang (Chrome)
   - "Print backgrounds" dicentang (Firefox)
4. Print atau Save as PDF

### Print Preview
Background akan otomatis muncul di print preview dengan CSS yang sudah diterapkan.

## Testing
1. Buka halaman sertifikat
2. Tekan Ctrl+P (Windows/Linux) atau Cmd+P (Mac)
3. Verifikasi background image muncul di preview
4. Test di berbagai browser:
   - Chrome/Edge
   - Firefox
   - Safari

## Catatan Penting

### Background Image Requirements
- File `public/certificate-background.webp` harus ada dan accessible
- Image harus bisa di-load dengan CORS (crossOrigin: "anonymous")
- Untuk template baru, tambahkan file background di folder `public/`
- Update `DEFAULT_CERTIFICATE_TEMPLATES` dengan URL background yang benar

### Debugging
Jika background masih tidak muncul, check console log untuk:
1. "Waiting for X images to load..." - berapa banyak images yang detected
2. "✅ Image loaded successfully" - apakah background image berhasil di-load
3. "❌ Image failed to load" - jika ada error loading image
4. "Full-page canvas dimensions" - ukuran canvas yang di-generate

### Common Issues
1. **CORS Error**: Pastikan image di-serve dari same origin atau dengan CORS headers yang benar
2. **Image Not Found**: Check path `/certificate-background.webp` accessible
3. **Timeout**: Jika image terlalu besar, increase `imageTimeout` di html2canvas options
4. **Browser Print Settings**: User harus enable "Background graphics" di print dialog

### Performance
- PDF generation akan memakan waktu ~2-3 detik karena:
  - Fetch sertifikat data dari database
  - Render React component offscreen
  - Wait untuk images load
  - Capture dengan html2canvas di high DPI (300)
  - Embed ke PDF dengan pdf-lib
