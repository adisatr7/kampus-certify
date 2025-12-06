# Certificate Workflow Documentation

## Design Sertifikat

### Visual Design
Sertifikat menggunakan design elegant dengan:
- **Border**: Golden double border dengan decorative corners
- **Corner Decorations**: Multiple golden lines di sudut kiri atas dan kanan bawah
- **Background**: Light cream (#f5f5f0)
- **Color Scheme**: 
  - Primary: Golden (#B8860B)
  - Secondary: Gray (#6B7280)
  - Text: Dark Gray (#4B5563)

### Typography
- **Heading "SERTIFIKAT"**: Playfair Display, 6xl, Bold, Golden, Letter-spacing 0.3em
- **Subheading "PENGHARGAAN"**: Playfair Display, 2xl, Medium, Gray, Letter-spacing 0.4em
- **Nama Peserta**: Great Vibes (cursive), 6xl, Golden
- **Body Text**: Times New Roman, Base size, Dark Gray
- **Signatures**: Times New Roman, Bold with underline

### Layout
```
┌─────────────────────────────────────────────┐
│ ╔══════════════════════════════════════╗    │
│ ║  [Corner Decoration]                 ║    │
│ ║                                      ║    │
│ ║         SERTIFIKAT                   ║    │
│ ║         PENGHARGAAN                  ║    │
│ ║         No. XXX                      ║    │
│ ║                                      ║    │
│ ║    Dengan rasa hormat...             ║    │
│ ║    menganugerahkan...                ║    │
│ ║                                      ║    │
│ ║         Nama Lengkap                 ║    │
│ ║                                      ║    │
│ ║    Sebagai bentuk apresiasi...       ║    │
│ ║                                      ║    │
│ ║  [QR Code 1]        [QR Code 2]      ║    │
│ ║  Penandatangan 1    Penandatangan 2  ║    │
│ ║                [Corner Decoration]   ║    │
│ ╚══════════════════════════════════════╝    │
└─────────────────────────────────────────────┘
```

## Workflow Pembuatan Sertifikat

### Step 1: User Membuat Sertifikat
**Halaman**: `/create-sertifikat`

**Input Data Manual**:
1. Nama Peserta *
2. Template Sertifikat * (dropdown: Default, Modern, Classic)
3. Jenis Sertifikat * (dropdown: Pelatihan, Ujian Kompetensi, Workshop, Seminar, Juara Lomba)
4. Nama Kegiatan *
5. Penyelenggara *
6. Tanggal Pelaksanaan *
7. Nomor Sertifikat *
8. Penandatangan 1 * (dropdown: list users)
9. Penandatangan 2 (optional, dropdown: list users)

**Validasi**:
- Semua field dengan * wajib diisi
- Penandatangan 1 harus dipilih
- Penandatangan 2 opsional

### Step 2: Preview Sertifikat
**Trigger**: Klik tombol "Preview"

**Kondisi**: 
- Nama peserta, nama acara, dan penandatangan 1 sudah diisi

**Tampilan**:
- Modal dialog dengan preview sertifikat
- Menampilkan design lengkap tanpa QR code
- Catatan: "QR code akan ditambahkan setelah sertifikat ditandatangani"

**Actions**:
- Close: Kembali ke form
- User bisa edit data jika perlu

### Step 3: Buat Sertifikat
**Trigger**: Klik tombol "Buat Sertifikat"

**Proses Backend**:
```typescript
// 1. Create document record
const document = await supabase.from("documents").insert({
  user_id: userProfile.id,
  title: `Sertifikat - ${nama_peserta}`,
  status: "pending",
  document_type: "sertifikat",
  recipient_name: nama_peserta,
  metadata: {
    workflow_stage: "pending_signer1",
    signer1_id: formData.signer1_id,
    signer2_id: formData.signer2_id || null,
    created_by_id: userProfile.id,
  },
});

// 2. Create sertifikat record
await supabase.from("sertifikat").insert({
  document_id: document.id,
  nama_peserta: formData.nama_peserta,
  nama_acara: formData.nama_acara,
  tanggal_acara: formData.tanggal_acara,
  nomor_sertifikat: formData.nomor_sertifikat,
  penandatangan: formData.signer1_id,
  template_id: formData.template_id || "default",
});
```

**Result**:
- Document status: `pending`
- Workflow stage: `pending_signer1`
- Redirect ke `/user/documents`
- Toast: "Sertifikat berhasil dibuat dan dikirim ke penandatangan pertama"

### Step 4: Penandatangan 1 Menandatangani
**Halaman**: `/user/documents` (untuk penandatangan 1)

**Proses**:
1. Penandatangan 1 melihat dokumen dengan status "pending"
2. Klik "Tandatangani"
3. Input passphrase
4. Klik "Tandatangani Dokumen"

**Backend Process**:
```typescript
// 1. Generate signed PDF with SertifikatTemplate
const signedPdfBlob = await generateSignedPDF(document);

// 2. Cryptographic signing
await signDocument(documentId, signerUserId, passphrase);

// 3. Upload PDF to storage
const signedDocumentUrl = await uploadSignedPDF(signedPdfBlob);

// 4. Update document
await supabase.from("documents").update({
  status: "pending", // Still pending for signer2
  file_url: signedDocumentUrl,
  metadata: {
    ...metadata,
    workflow_stage: "pending_signer2",
    signer1_signed_at: new Date().toISOString(),
  },
});
```

**Result**:
- Document status: `pending` (masih menunggu signer2)
- Workflow stage: `pending_signer2`
- PDF ter-generate dengan QR code penandatangan 1
- Otomatis terkirim ke penandatangan 2

### Step 5: Penandatangan 2 Menandatangani
**Halaman**: `/user/documents` (untuk penandatangan 2)

**Proses**:
1. Penandatangan 2 melihat dokumen dengan status "pending"
2. Klik "Tandatangani"
3. Input passphrase
4. Klik "Tandatangani Dokumen"

**Backend Process**:
```typescript
// Similar to signer1, but:
await supabase.from("documents").update({
  status: "signed", // NOW it's fully signed
  metadata: {
    ...metadata,
    workflow_stage: "completed",
    signer2_signed_at: new Date().toISOString(),
  },
});
```

**Result**:
- Document status: `signed` ✅
- Workflow stage: `completed`
- PDF ter-update dengan QR code kedua penandatangan
- Sertifikat selesai

### Step 6: Dokumen Masuk ke Tabel Dekan dan Rektor
**Automatic**: Setelah status menjadi "signed"

**Visibility**:
- Dekan dapat melihat semua dokumen dengan status "signed" di dashboard mereka
- Rektor dapat melihat semua dokumen dengan status "signed" di dashboard mereka
- Ini dikontrol oleh RLS (Row Level Security) di Supabase

**Query untuk Dekan/Rektor**:
```sql
SELECT * FROM documents 
WHERE status = 'signed' 
  AND document_type = 'sertifikat'
ORDER BY updated_at DESC;
```

## Workflow States

### Document Status
- `pending`: Menunggu tanda tangan
- `signed`: Sudah ditandatangani lengkap
- `revoked`: Dibatalkan

### Workflow Stages
- `pending_signer1`: Menunggu penandatangan 1
- `pending_signer2`: Menunggu penandatangan 2 (jika ada)
- `completed`: Selesai

### State Transitions
```
[Create] → pending_signer1 (status: pending)
         ↓
[Signer1 Signs] → pending_signer2 (status: pending)
                ↓
[Signer2 Signs] → completed (status: signed)
```

**Special Case**: Jika hanya 1 penandatangan:
```
[Create] → pending_signer1 (status: pending)
         ↓
[Signer1 Signs] → completed (status: signed)
```

## Database Schema

### documents table
```sql
{
  id: uuid,
  user_id: uuid,
  title: string,
  status: 'pending' | 'signed' | 'revoked',
  document_type: 'sertifikat',
  recipient_name: string,
  file_url: string (after signing),
  metadata: {
    workflow_stage: string,
    signer1_id: uuid,
    signer2_id: uuid | null,
    created_by_id: uuid,
    signer1_signed_at: timestamp,
    signer2_signed_at: timestamp,
  },
  created_at: timestamp,
  updated_at: timestamp,
}
```

### sertifikat table
```sql
{
  id: uuid,
  document_id: uuid,
  nama_peserta: string,
  nama_acara: string,
  tanggal_acara: date,
  nomor_sertifikat: string,
  penandatangan: uuid,
  template_id: string,
  created_at: timestamp,
  updated_at: timestamp,
}
```

## User Roles & Permissions

### Creator (User yang membuat sertifikat)
- Dapat membuat sertifikat
- Dapat memilih penandatangan
- Dapat preview sebelum dibuat
- Dapat melihat status sertifikat yang dibuat

### Penandatangan 1 & 2
- Menerima notifikasi (via dashboard)
- Dapat melihat dokumen yang perlu ditandatangani
- Dapat menandatangani dengan passphrase
- Dapat melihat dokumen yang sudah ditandatangani

### Dekan & Rektor
- Dapat melihat semua dokumen dengan status "signed"
- Dapat download PDF sertifikat
- Dapat verify authenticity
- Read-only access

### Admin
- Full access ke semua dokumen
- Dapat revoke sertifikat jika perlu
- Dapat melihat audit trail

## Error Handling

### Common Errors
1. **Sertifikat data not found**: Check database records
2. **User data not found**: Verify signer IDs
3. **PDF generation failed**: Check console logs
4. **Signing failed**: Verify passphrase and signing key

### Debugging
- Check console logs untuk detailed error messages
- Verify database records di Supabase dashboard
- Check network requests di DevTools
- Verify RLS policies

## Testing Checklist

### Create Flow
- [ ] Form validation works
- [ ] Preview shows correct data
- [ ] Document created with correct metadata
- [ ] Sertifikat record created
- [ ] Redirect to documents page

### Signing Flow
- [ ] Signer1 sees pending document
- [ ] Signer1 can sign successfully
- [ ] PDF generated with QR code
- [ ] Status updates to pending_signer2
- [ ] Signer2 sees pending document
- [ ] Signer2 can sign successfully
- [ ] Status updates to signed
- [ ] Workflow stage updates to completed

### Visibility
- [ ] Creator can see their documents
- [ ] Signers can see documents to sign
- [ ] Dekan can see signed documents
- [ ] Rektor can see signed documents
- [ ] Admin can see all documents

## Performance Considerations

### PDF Generation
- Takes 2-5 seconds depending on network and image size
- Uses html2canvas at 300 DPI
- Generates high-quality PDF suitable for printing

### Database Queries
- Indexed on user_id, status, document_type
- RLS policies optimized for role-based access
- Efficient queries with proper joins

### Storage
- PDFs stored in Supabase Storage
- Public URLs for easy access
- Automatic cleanup for revoked documents

## Future Enhancements

1. **Email Notifications**: Send email when document needs signing
2. **Bulk Creation**: Create multiple certificates at once
3. **Template Editor**: Allow admins to customize templates
4. **Digital Signature Verification**: Add blockchain verification
5. **Mobile App**: Native mobile app for signing on the go
