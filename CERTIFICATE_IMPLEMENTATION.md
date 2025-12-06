# Implementasi Template Sertifikat

## Overview
Sistem sertifikat digital dengan background custom dan QR code untuk verifikasi.

## File yang Dibuat

### 1. Background Image
**File**: `public/certificate-background.webp`
- Background dengan border emas/kuning
- Desain elegan untuk sertifikat formal
- Format: WebP untuk optimasi ukuran

**Catatan**: Copy file background image yang sebenarnya ke lokasi ini.

### 2. Komponen Template Sertifikat
**File**: `src/components/SertifikatTemplate.tsx`

Komponen untuk menampilkan sertifikat dengan:
- Background image custom
- Header dengan judul dan nomor sertifikat
- Body dengan nama peserta dan detail acara
- Footer dengan tanda tangan dan QR code
- Responsive design

**Props**:
```typescript
interface SertifikatTemplateProps {
  sertifikat: Sertifikat;
  qrValue?: string;
  showQR?: boolean;
  penandatangan1?: { name: string; jabatan?: string };
  penandatangan2?: { name: string; jabatan?: string };
}
```

### 3. Komponen Preview Sertifikat
**File**: `src/components/SertifikatPreview.tsx`

Dialog untuk preview sertifikat sebelum dibuat:
- Menampilkan template sertifikat
- Tanpa QR code (preview only)
- Informasi catatan untuk user

**Props**:
```typescript
interface SertifikatPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nama_peserta: string;
    nama_acara: string;
    tanggal_acara: string;
    nomor_sertifikat: string;
    jenis_sertifikat: string;
    penyelenggara: string;
  };
  signer1Name?: string;
  signer1Jabatan?: string;
  signer2Name?: string;
  signer2Jabatan?: string;
}
```

## Integrasi dengan CreateSertifikatNew

### Perubahan di `src/pages/CreateSertifikatNew.tsx`:

1. **Import komponen preview**:
```typescript
import SertifikatPreview from "@/components/SertifikatPreview";
import { Eye } from "lucide-react";
```

2. **State untuk preview**:
```typescript
const [showPreview, setShowPreview] = useState(false);
```

3. **Fetch jabatan user**:
```typescript
const { data: users } = await supabase
  .from("users")
  .select("id, name, nip, jabatan")  // Tambah jabatan
  .in("id", userIds)
  .order("name");
```

4. **Tombol preview**:
```typescript
<Button
  type="button"
  variant="secondary"
  onClick={() => setShowPreview(true)}
  disabled={!formData.nama_peserta || !formData.nama_acara || !formData.signer1_id}
>
  <Eye className="w-4 h-4 mr-2" />
  Preview
</Button>
```

5. **Komponen preview**:
```typescript
<SertifikatPreview
  isOpen={showPreview}
  onClose={() => setShowPreview(false)}
  formData={formData}
  signer1Name={userList.find((u) => u.id === formData.signer1_id)?.name}
  signer1Jabatan={userList.find((u) => u.id === formData.signer1_id)?.jabatan}
  signer2Name={formData.signer2_id ? userList.find((u) => u.id === formData.signer2_id)?.name : undefined}
  signer2Jabatan={formData.signer2_id ? userList.find((u) => u.id === formData.signer2_id)?.jabatan : undefined}
/>
```

## Fitur Template Sertifikat

### 1. Background Custom
- Background image dengan border emas
- Aspect ratio 1.414 (A4 landscape)
- Background cover untuk full coverage

### 2. Layout
- **Header**: Judul "SERTIFIKAT", nama universitas, nomor sertifikat
- **Body**: Nama peserta, nama acara, tanggal pelaksanaan
- **Footer**: Tanda tangan dengan QR code

### 3. QR Code
- Menggunakan library `qrcode`
- Size: 80x80 pixels
- Canvas-based rendering
- Ditampilkan di bawah nama penandatangan

### 4. Responsive
- Menggunakan Tailwind CSS
- Flexible layout dengan grid
- Text sizing yang proporsional

## Cara Penggunaan

### 1. Upload Background Image
```bash
# Copy background image ke public folder
cp /path/to/background.webp public/certificate-background.webp
```

### 2. Buat Sertifikat Baru
1. Buka halaman "Buat Sertifikat"
2. Isi form dengan data sertifikat
3. Pilih penandatangan 1 dan 2
4. Klik tombol "Preview" untuk melihat preview
5. Klik "Buat Sertifikat" untuk membuat

### 3. Preview Sertifikat
- Preview menampilkan template tanpa QR code
- QR code akan ditambahkan setelah ditandatangani
- Preview membantu memastikan data sudah benar

## Customization

### Mengubah Background
Ganti file `public/certificate-background.webp` dengan background baru.

### Mengubah Layout
Edit file `src/components/SertifikatTemplate.tsx`:
- Ubah spacing dengan class Tailwind
- Ubah font size dan weight
- Ubah warna text

### Mengubah QR Code Size
```typescript
QRCode.toCanvas(qrRef.current, qrValue, { width: 100 }); // Ubah width
```

## Best Practices

1. **Background Image**:
   - Gunakan format WebP untuk optimasi
   - Resolusi minimal 1920x1357 (A4 landscape)
   - File size < 500KB

2. **Text Content**:
   - Gunakan font yang readable
   - Contrast yang baik dengan background
   - Spacing yang cukup

3. **QR Code**:
   - Size minimal 80x80 pixels
   - Error correction level: M (default)
   - Pastikan scannable

## Troubleshooting

### Background tidak muncul
- Pastikan file `certificate-background.webp` ada di folder `public/`
- Periksa path di `backgroundImage` CSS
- Clear browser cache

### QR Code tidak muncul
- Pastikan `showQR` prop adalah `true`
- Pastikan `qrValue` tidak kosong
- Periksa console untuk error

### Preview tidak muncul
- Pastikan semua field required sudah diisi
- Periksa state `showPreview`
- Periksa console untuk error

## File yang Dimodifikasi

- `src/pages/CreateSertifikatNew.tsx` - Tambah preview functionality
- `public/certificate-background.webp` - Background image (perlu di-copy manual)

## File yang Dibuat

- `src/components/SertifikatTemplate.tsx` - Template component
- `src/components/SertifikatPreview.tsx` - Preview dialog component
