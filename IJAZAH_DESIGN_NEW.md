# Design Ijazah Baru - Sesuai Template UMC

## Overview
Design ijazah baru dibuat sesuai dengan template resmi Universitas Muhammadiyah Cirebon.

## Design Features

### Visual Design
- **Background**: Coklat/tan dengan texture gradient
- **Border**: Purple/ungu 4px
- **Paper**: White inner dengan shadow
- **Logo**: Red circle di atas
- **Seal**: Golden seal di tengah bawah

### Typography
- **Nama Mahasiswa**: Great Vibes (script font), 5xl
- **Gelar**: Great Vibes (script font), 4xl
- **Header**: Gray, semibold, small
- **Body**: Gray, regular, small
- **University Name**: Bold, large

### Layout Structure
```
┌─────────────────────────────────────────────┐
│ [Coklat Background dengan Texture]          │
│  ┌───────────────────────────────────────┐  │
│  │ [White Paper]                         │  │
│  │  ┌─────────────────────────────────┐  │  │
│  │  │ [Purple Border]                 │  │  │
│  │  │                                 │  │  │
│  │  │  NIM.XXX        No: IZH/XXX    │  │  │
│  │  │                                 │  │  │
│  │  │         [Logo Merah]            │  │  │
│  │  │                                 │  │  │
│  │  │  KEMENTRIAN PENDIDIKAN...       │  │  │
│  │  │  UNIVERSITAS MUHAMMADIYAH...    │  │  │
│  │  │  ─────────────────────────      │  │  │
│  │  │                                 │  │  │
│  │  │  Dengan ini kami menyatakan...  │  │  │
│  │  │                                 │  │  │
│  │  │      Muhammad Hidayat           │  │  │
│  │  │      (Script Font)              │  │  │
│  │  │                                 │  │  │
│  │  │  telah berhasil menyelesaikan...│  │  │
│  │  │  Program Studi Teknik Informatika│  │  │
│  │  │                                 │  │  │
│  │  │      Sarjana Teknik             │  │  │
│  │  │      (Script Font)              │  │  │
│  │  │                                 │  │  │
│  │  │  dengan singkatan S.E.          │  │  │
│  │  │  Diterbitkan di Cirebon...      │  │  │
│  │  │                                 │  │  │
│  │  │  [QR]    [Seal]    [QR]        │  │  │
│  │  │  Dekan            Rektor        │  │  │
│  │  │  Nama             Nama          │  │  │
│  │  │  NIP              NIP           │  │  │
│  │  └─────────────────────────────────┘  │  │
│  └───────────────────────────────────────┘  │
└─────────────────────────────────────────────┘
```

## Component: IjazahTemplate

### Props
```typescript
interface IjazahTemplateProps {
  nim: string;                    // NIM mahasiswa
  nomorIjazah: string;           // Nomor ijazah (IZH/0001/XI/2025)
  logoUrl: string;               // URL logo universitas
  namaMahasiswa: string;         // Nama lengkap mahasiswa
  programStudi: string;          // Program studi
  fakultas: string;              // Nama fakultas
  gelar: string;                 // Gelar (Sarjana Teknik)
  tanggalTerbit: string;         // Tanggal terbit
  dekanName?: string;            // Nama dekan
  dekanNip?: string;             // NIP dekan
  dekanQrCode?: string;          // QR code dekan
  rektorName?: string;           // Nama rektor
  rektorNip?: string;            // NIP rektor
  rektorQrCode?: string;         // QR code rektor
}
```

### Usage
```typescript
import IjazahTemplate from "@/components/IjazahTemplate";

<IjazahTemplate
  nim="220511111"
  nomorIjazah="IZH/0001/XI/2025"
  logoUrl="https://..."
  namaMahasiswa="Muhammad Hidayat"
  programStudi="Teknik Informatika"
  fakultas="Fakultas Teknik"
  gelar="Sarjana Teknik"
  tanggalTerbit="2025-12-06"
  dekanName="Dr. Ahmad Hidayat, S.T., M.T."
  dekanNip="198501012010011001"
  dekanQrCode="QR-DEKAN-001"
  rektorName="Prof. Dr. Ir. Budi Santoso, M.Sc."
  rektorNip="197801011998011001"
  rektorQrCode="QR-REKTOR-001"
/>
```

## Color Palette

### Background
- **Primary**: `#c9a66b` (Tan/Coklat muda)
- **Secondary**: `#d4b896` (Tan/Coklat lebih terang)
- **Texture**: Radial gradients dengan opacity 0.05-0.1

### Border & Accents
- **Purple Border**: `#7c3aed` (purple-600)
- **Red Logo Circle**: `#dc2626` (red-600)
- **Golden Seal**: `#f59e0b` to `#d97706` (amber-400 to amber-600)
- **Golden Line**: `#f59e0b` (amber-500)

### Text
- **Primary Text**: `#1f2937` (gray-800)
- **Secondary Text**: `#4b5563` (gray-600)
- **Muted Text**: `#6b7280` (gray-500)

## Fonts

### Script Fonts (Nama & Gelar)
```css
font-family: 'Great Vibes', 'Brush Script MT', cursive;
```

### Regular Fonts
```css
font-family: system-ui, -apple-system, sans-serif;
```

## Dimensions

### Container
- **Width**: 794px (A4 width at 96 DPI)
- **Height**: 1123px (A4 height at 96 DPI)

### Spacing
- **Outer Padding**: 48px (inset-12)
- **Inner Padding**: 16px (inset-4)
- **Content Padding**: 32px (p-8)

### Elements
- **Logo Circle**: 96px (w-24 h-24)
- **QR Code**: 80px
- **Seal**: 96px (w-24 h-24)
- **Border**: 4px

## QR Codes

### Position
- **Left**: Dekan signature
- **Right**: Rektor signature

### Content
- Dekan QR: Contains dekan signature data
- Rektor QR: Contains rektor signature data

### Styling
- Size: 80x80px
- Background: White
- Border: 1px gray
- Padding: 4px

## Seal/Stempel

### Design
- Circular golden gradient
- Shield icon in center
- Size: 96x96px
- Position: Center bottom, between QR codes

### Colors
- Gradient: amber-400 to amber-600
- Border: 4px amber-500
- Icon: White

## Files

### Components
- **`src/components/IjazahTemplate.tsx`** - Main template component
- **`src/components/IjazahPreview.tsx`** - Preview modal (updated)

### Documentation
- **`IJAZAH_DESIGN_NEW.md`** - This file

## Testing

### Preview
1. Navigate to `/create-ijazah`
2. Fill form data
3. Click "Preview"
4. Should show new design with:
   - Coklat background
   - Purple border
   - Script fonts for nama & gelar
   - QR codes (placeholder)
   - Golden seal

### Print
- Design is A4 size (794x1123px)
- Can be printed directly
- High quality at 300 DPI

## Notes

1. **Script Font**: Uses 'Great Vibes' for elegant handwriting style
2. **Responsive**: Fixed size for print consistency
3. **QR Codes**: Added after signing, not in preview
4. **Seal**: Decorative, represents official stamp
5. **Colors**: Match official UMC branding

## Future Enhancements

- [ ] Add watermark for draft/preview
- [ ] Support multiple templates
- [ ] Customizable colors per faculty
- [ ] PDF generation with high DPI
- [ ] Digital signature integration

---

**Design Status**: ✅ Complete and ready for use
**Last Updated**: 2025-12-06
