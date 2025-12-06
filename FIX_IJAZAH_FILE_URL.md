# Fix: file_url Tidak Tergenerate di Ijazah

## Masalah
`file_url` tidak tergenerate setelah ijazah ditandatangani, sehingga PDF tidak bisa didownload.

## Penyebab
1. `DocumentSigningFlow.tsx` tidak memanggil fungsi PDF generation setelah signing
2. `pdfSigner.ts` tidak support rendering `IjazahTemplate` (hanya support `SertifikatTemplate` dan `SignedDocumentTemplate`)
3. Tidak ada proses upload PDF ke storage setelah generation

## Solusi

### 1. Update DocumentSigningFlow.tsx
**File**: `src/pages/DocumentSigningFlow.tsx`

**Changes**:
- Import `generateSignedPDF` dan `uploadSignedPDF` dari `@/lib/pdfSigner`
- Tambahkan proses PDF generation setelah signing berhasil
- Generate PDF hanya untuk final signature:
  - Ijazah: setelah rektor menandatangani
  - Sertifikat: setelah penandatangan terakhir
- Upload PDF ke Supabase Storage
- Update `file_url` di database

**Code**:
```typescript
// Generate and upload PDF after signing
const shouldGeneratePDF = 
  (isIjazahWorkflow && isRektorSigning) || 
  (!isIjazahWorkflow && isFinalSignature);

if (shouldGeneratePDF) {
  // Fetch updated document with all metadata
  const { data: updatedDoc } = await supabase
    .from("documents")
    .select("*")
    .eq("id", document.id)
    .single();

  if (updatedDoc) {
    // Generate PDF
    const pdfBlob = await generateSignedPDF(updatedDoc);
    
    // Upload PDF
    const fileUrl = await uploadSignedPDF(
      pdfBlob,
      userProfile.id,
      document.id,
      supabase
    );

    if (fileUrl) {
      // Update document with file_url
      await supabase
        .from("documents")
        .update({ file_url: fileUrl })
        .eq("id", document.id);

      // For ijazah: also update original dekan document
      if (isIjazahWorkflow && isRektorSigning && metadata.original_document_id) {
        await supabase
          .from("documents")
          .update({ file_url: fileUrl })
          .eq("id", metadata.original_document_id);
      }
    }
  }
}
```

### 2. Update pdfSigner.ts
**File**: `src/lib/pdfSigner.ts`

**Changes**:
- Import `IjazahTemplate` dan `Ijazah` type
- Tambahkan logic untuk detect ijazah document
- Fetch ijazah data dari database
- Fetch dekan dan rektor data untuk ditampilkan di template
- Render `IjazahTemplate` dengan data yang lengkap

**Code**:
```typescript
const isIjazah = doc.title?.toLowerCase().includes("ijazah");

if (isIjazah) {
  // Fetch ijazah data
  const { data: ijazahData } = await supabase
    .from("ijazah")
    .select("*")
    .eq("document_id", doc.id)
    .maybeSingle();

  // Fetch dekan and rektor data
  const metadata = (doc.metadata as any) || {};
  const { data: dekanData } = await supabase
    .from("users")
    .select("name, nip")
    .eq("id", metadata.created_by_id || doc.user_id)
    .maybeSingle();
    
  const { data: rektorData } = await supabase
    .from("users")
    .select("name, nip")
    .eq("id", metadata.rektor_id)
    .maybeSingle();

  // Render IjazahTemplate
  root.render(
    React.createElement(IjazahTemplate, {
      nim: ijazahData.nim,
      nomorIjazah: ijazahData.nomor_seri || doc.serial || doc.id,
      logoUrl: ijazahData.logo_url || "/logo-university.png",
      namaMahasiswa: ijazahData.nama_mahasiswa,
      programStudi: "",
      fakultas: ijazahData.nama_fakultas,
      gelar: ijazahData.gelar,
      tanggalTerbit: ijazahData.tanggal_terbit,
      dekanName: dekanData?.name,
      dekanNip: dekanData?.nip,
      dekanQrCode: metadata.dekan_qr_code,
      rektorName: rektorData?.name,
      rektorNip: rektorData?.nip,
      rektorQrCode: metadata.rektor_qr_code,
    })
  );
}
```

## Workflow PDF Generation

### Ijazah
1. Dekan membuat ijazah → status: `pending`
2. Dekan menandatangani → status: `signed` (dekan's document)
3. Dokumen otomatis terkirim ke Rektor → status: `pending` (rektor's document)
4. Rektor menandatangani → status: `signed` (rektor's document)
5. **PDF di-generate** dengan IjazahTemplate (includes both QR codes)
6. PDF di-upload ke storage
7. `file_url` di-update di kedua dokumen (dekan & rektor)

### Sertifikat
1. Admin membuat sertifikat → status: `pending`
2. Penandatangan 1 menandatangani → status: `pending`
3. Penandatangan 2 menandatangani → status: `signed`
4. **PDF di-generate** dengan SertifikatTemplate
5. PDF di-upload ke storage
6. `file_url` di-update

## Testing

### Test Ijazah PDF Generation
1. Login sebagai Dekan
2. Buat ijazah baru
3. Dekan menandatangani dengan QR code
4. Login sebagai Rektor
5. Rektor menandatangani dengan QR code
6. **Verify**: 
   - Check console logs untuk "Generating signed PDF"
   - Check database: `file_url` harus terisi di kedua dokumen
   - Download PDF dari dashboard
   - PDF harus menampilkan ijazah dengan kedua QR code

### Test Sertifikat PDF Generation
1. Login sebagai admin
2. Buat sertifikat dengan 2 penandatangan
3. Penandatangan 1 menandatangani
4. Penandatangan 2 menandatangani
5. **Verify**:
   - Check console logs untuk "Generating signed PDF"
   - Check database: `file_url` harus terisi
   - Download PDF dari dashboard
   - PDF harus menampilkan sertifikat dengan background

## Error Handling

### PDF Generation Gagal
Jika PDF generation gagal, signing tetap berhasil dan user akan menerima warning:
```
"Dokumen berhasil ditandatangani, tetapi PDF gagal di-generate. 
Silakan coba generate ulang nanti."
```

### Upload Gagal
Jika upload gagal, PDF generation berhasil tapi `file_url` tidak ter-update.
Check console logs untuk error details.

## Files Modified
- ✅ `src/pages/DocumentSigningFlow.tsx`
- ✅ `src/lib/pdfSigner.ts`

## Next Steps
- Test end-to-end ijazah workflow
- Verify PDF generation dengan QR codes
- Test download PDF dari dashboard
- Verify file_url di database

## Known Issues
- `program_studi` field tidak ada di database, sementara di-set empty string
- Jika perlu, bisa ditambahkan field `program_studi` ke tabel `ijazah` nanti
