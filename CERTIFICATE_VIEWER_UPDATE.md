# Update Certificate Viewer

## Masalah
Sertifikat yang sudah ditandatangani masih menggunakan template generik (SignedDocumentTemplate) yang tidak menampilkan background custom.

## Solusi
Update `SignedDocumentViewer` untuk mendeteksi jenis dokumen dan menggunakan `SertifikatTemplate` untuk sertifikat.

## Perubahan di SignedDocumentViewer.tsx

### 1. Import Dependencies
```typescript
import { SertifikatTemplate } from "./SertifikatTemplate";
import { Sertifikat } from "../types";
import { supabase } from "@/integrations/supabase/client";
```

### 2. State Management
```typescript
const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
const [userData, setUserData] = useState<{ name: string; jabatan?: string } | null>(null);
const [loading, setLoading] = useState(false);
```

### 3. Fetch Data
```typescript
useEffect(() => {
  const fetchData = async () => {
    if (!document || !document.title?.toLowerCase().includes("sertifikat")) {
      return;
    }

    setLoading(true);
    try {
      // Fetch sertifikat data
      const { data: sertifikat } = await supabase
        .from("sertifikat")
        .select("*")
        .eq("document_id", document.id)
        .maybeSingle();

      if (sertifikat) {
        setSertifikatData(sertifikat as Sertifikat);
      }

      // Fetch user data
      if (!document.user && document.user_id) {
        const { data: user } = await supabase
          .from("users")
          .select("name, jabatan")
          .eq("id", document.user_id)
          .maybeSingle();

        if (user) {
          setUserData(user);
        }
      } else if (document.user) {
        setUserData({
          name: document.user.name,
          jabatan: document.user.jabatan || undefined,
        });
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  if (isOpen) {
    fetchData();
  }
}, [document, isOpen]);
```

### 4. Conditional Rendering
```typescript
{document.file_url ? (
  // Show PDF iframe
  <iframe src={document.file_url} />
) : loading ? (
  // Show loading state
  <p>Memuat dokumen...</p>
) : isSertifikat && sertifikatData ? (
  // Show certificate template
  <SertifikatTemplate
    sertifikat={sertifikatData}
    qrValue={verificationUrl}
    showQR={true}
    penandatangan1={userData}
  />
) : (
  // Show generic template
  <SignedDocumentTemplate document={document} />
)}
```

## Fitur

### 1. Auto-Detection
- Mendeteksi jenis dokumen dari title
- Jika title mengandung "sertifikat", gunakan `SertifikatTemplate`
- Jika tidak, gunakan `SignedDocumentTemplate`

### 2. Data Fetching
- Fetch data sertifikat dari tabel `sertifikat`
- Fetch data user (penandatangan) dari tabel `users`
- Handle RLS dengan fetch terpisah

### 3. Loading State
- Tampilkan loading indicator saat fetch data
- Prevent render sebelum data tersedia

### 4. QR Code
- Generate QR code dengan verification URL
- Tampilkan di template sertifikat

## Testing

### 1. Buat Sertifikat Baru
1. Buka halaman "Buat Sertifikat"
2. Isi form dan buat sertifikat
3. Tanda tangani sertifikat

### 2. Lihat Sertifikat
1. Buka halaman "Daftar Dokumen"
2. Klik tombol "Lihat" pada sertifikat yang sudah ditandatangani
3. Sertifikat harus menampilkan background custom dengan border emas
4. QR code harus muncul di bawah nama penandatangan

### 3. Verifikasi
1. Scan QR code dengan ponsel
2. Harus redirect ke halaman verifikasi
3. Data sertifikat harus ditampilkan dengan benar

## Troubleshooting

### Background tidak muncul
- Pastikan file `public/certificate-background.webp` ada
- Clear browser cache
- Periksa console untuk error loading image

### Data tidak muncul
- Periksa console untuk error fetch
- Pastikan RLS policy mengizinkan read dari tabel `sertifikat` dan `users`
- Periksa bahwa `document_id` benar

### QR Code tidak muncul
- Periksa bahwa `showQR` prop adalah `true`
- Periksa bahwa `qrValue` tidak kosong
- Periksa console untuk error QRCode library

## File yang Dimodifikasi

- `src/components/SignedDocumentViewer.tsx` - Tambah detection dan rendering sertifikat

## Dependencies

- `SertifikatTemplate` component
- `qrcode` library (sudah terinstall)
- Supabase client untuk fetch data
