# Alur Pembuatan Ijazah - Improved Workflow

## Overview
Dokumen ini menjelaskan alur pembuatan ijazah yang telah diperbaiki sesuai dengan requirement baru.

## Alur Lengkap Pembuatan Ijazah

### 1. Dekan Membuat Ijazah
**Halaman**: `/create-ijazah`  
**Role**: Dekan

**Input Data Manual pada Form**:
- Nama Mahasiswa *
- NIM *
- Nama Fakultas *
- Gelar *
- Tanggal Terbit *
- Rektor Penandatangan * (dropdown)
- Logo URL (optional)

**Validasi**:
- Semua field dengan * wajib diisi
- Rektor harus dipilih dari dropdown

### 2. Preview Ijazah Sebelum Dibuat
**Trigger**: Klik tombol "Preview"

**Kondisi**: 
- Nama mahasiswa, NIM, dan Rektor sudah diisi

**Tampilan**:
- Modal dialog dengan preview ijazah
- Menampilkan design lengkap tanpa QR code
- Catatan: "QR code akan ditambahkan setelah ijazah ditandatangani"

**Actions**:
- Close: Kembali ke form
- Dekan bisa edit data jika perlu

### 3. Buat Ijazah
**Trigger**: Klik tombol "Buat Ijazah"

**Proses Backend**:
```typescript
// 1. Create document record untuk Dekan
const document = await supabase.from("documents").insert({
  user_id: userProfile.id, // Dekan's ID
  title: `Ijazah - ${nama_mahasiswa}`,
  status: "pending", // Menunggu tanda tangan dekan
  document_type: "ijazah",
  recipient_name: nama_mahasiswa,
  recipient_student_number: nim,
  metadata: {
    workflow_stage: "dekan_pending",
    rektor_id: formData.rektor_id,
    created_by_id: userProfile.id,
  },
});

// 2. Create ijazah record
await supabase.from("ijazah").insert({
  document_id: document.id,
  nama_mahasiswa: formData.nama_mahasiswa,
  nim: formData.nim,
  gelar: formData.gelar,
  nama_fakultas: formData.nama_fakultas,
  tanggal_terbit: formData.tanggal_terbit,
  logo_url: formData.logo_url,
  is_validated: false,
});
```

**Result**:
- Document status: `pending`
- Workflow stage: `dekan_pending`
- Redirect ke `/document-signing/{document.id}`
- Toast: "Ijazah berhasil dibuat. Anda akan diarahkan untuk menandatangani dokumen."

### 4. Dekan Menandatangani Ijazah
**Halaman**: `/document-signing/{document.id}`  
**Role**: Dekan

**Proses**:
1. Dekan melihat ringkasan dokumen
2. Dekan mengisi QR code pada input field
3. Klik "Tanda Tangani Dokumen"

**Backend Process**:
```typescript
// 1. Update dokumen dekan
await supabase.from("documents").update({
  status: "signed", // ✅ Status dekan berubah menjadi "signed"
  metadata: {
    ...metadata,
    workflow_stage: "completed", // Untuk dekan sudah selesai
    dekan_signed: true,
    dekan_signed_at: new Date().toISOString(),
    dekan_qr_code: qrValue,
  },
}).eq("id", document.id);

// 2. Buat dokumen baru untuk Rektor (otomatis terkirim)
const rektorDocument = await supabase.from("documents").insert({
  user_id: metadata.rektor_id, // Rektor's ID
  title: document.title,
  status: "pending", // Menunggu tanda tangan rektor
  document_type: "ijazah",
  recipient_name: document.recipient_name,
  recipient_student_number: document.recipient_student_number,
  metadata: {
    ...metadata,
    workflow_stage: "rektor_pending",
    original_document_id: document.id,
    dekan_signed: true,
    dekan_signed_at: new Date().toISOString(),
    dekan_qr_code: qrValue,
  },
});

// 3. Link ijazah data ke dokumen rektor
await supabase.from("ijazah").insert({
  ...ijazahData,
  document_id: rektorDocument.id,
});
```

**Result**:
- ✅ Dokumen Dekan: status = `signed`, workflow_stage = `completed`
- ✅ QR code muncul pada nama Dekan
- ✅ Dokumen otomatis terkirim ke Rektor
- ✅ Dokumen Rektor: status = `pending`, workflow_stage = `rektor_pending`
- Toast: "Ijazah berhasil ditandatangani dan dikirim ke Rektor"

### 5. Dokumen Masuk ke Tabel Dokumen Dekan
**Automatic**: Setelah dekan menandatangani

**Visibility**:
- Dekan dapat melihat dokumen dengan status "signed" di `/user/documents`
- Dokumen muncul di tabel dengan badge "Signed"
- Dekan dapat download PDF (jika sudah di-generate)

**Query**:
```sql
SELECT * FROM documents 
WHERE user_id = dekan_id 
  AND status = 'signed'
  AND document_type = 'ijazah'
ORDER BY updated_at DESC;
```

### 6. Rektor Menerima Dokumen
**Halaman**: `/user/documents`  
**Role**: Rektor

**Visibility**:
- Rektor melihat dokumen baru dengan status "pending"
- Badge "Menunggu Tanda Tangan"
- Tombol "Tandatangani"

### 7. Rektor Menandatangani dan Isi QR Code
**Halaman**: `/document-signing/{rektorDocument.id}`  
**Role**: Rektor

**Proses**:
1. Rektor melihat ringkasan dokumen
2. Rektor mengisi QR code pada input field (pada kotak rektor)
3. Klik "Tanda Tangani Dokumen"

**Backend Process**:
```typescript
// 1. Update dokumen rektor
await supabase.from("documents").update({
  status: "signed", // ✅ Status rektor berubah menjadi "signed"
  metadata: {
    ...metadata,
    workflow_stage: "completed",
    rektor_signed: true,
    rektor_signed_at: new Date().toISOString(),
    rektor_qr_code: qrValue,
  },
}).eq("id", rektorDocument.id);

// 2. Update dokumen dekan untuk menandai bahwa rektor sudah tanda tangan
await supabase.from("documents").update({
  metadata: {
    ...dekanMetadata,
    rektor_signed: true,
    rektor_signed_at: new Date().toISOString(),
    rektor_qr_code: qrValue,
  },
}).eq("id", metadata.original_document_id);
```

**Result**:
- ✅ Dokumen Rektor: status = `signed`, workflow_stage = `completed`
- ✅ QR code muncul pada kotak Rektor
- ✅ Ijazah selesai
- Toast: "Ijazah berhasil ditandatangani. Dokumen selesai."

### 8. Dokumen Masuk ke Tabel Dokumen Dekan dan Rektor
**Automatic**: Setelah rektor menandatangani

**Visibility untuk Dekan**:
- Dekan dapat melihat dokumen dengan status "signed" di `/user/documents`
- Metadata menunjukkan bahwa rektor sudah tanda tangan
- Dokumen lengkap dengan QR code dekan dan rektor

**Visibility untuk Rektor**:
- Rektor dapat melihat dokumen dengan status "signed" di `/user/documents`
- Dokumen muncul di tabel dengan badge "Signed"
- Rektor dapat download PDF

**Query untuk Dekan**:
```sql
SELECT * FROM documents 
WHERE user_id = dekan_id 
  AND status = 'signed'
  AND document_type = 'ijazah'
  AND metadata->>'rektor_signed' = 'true'
ORDER BY updated_at DESC;
```

**Query untuk Rektor**:
```sql
SELECT * FROM documents 
WHERE user_id = rektor_id 
  AND status = 'signed'
  AND document_type = 'ijazah'
ORDER BY updated_at DESC;
```

## Workflow States

### Document Status
- `pending`: Menunggu tanda tangan
- `signed`: Sudah ditandatangani ✅
- `revoked`: Dibatalkan

### Workflow Stages
- `dekan_pending`: Menunggu tanda tangan dekan
- `rektor_pending`: Menunggu tanda tangan rektor
- `completed`: Selesai ✅

### State Transitions untuk Ijazah

**Dokumen Dekan**:
```
[Create] → dekan_pending (status: pending)
         ↓
[Dekan Signs] → completed (status: signed) ✅
              ↓
[Rektor Signs] → metadata updated (rektor_signed: true)
```

**Dokumen Rektor** (dibuat otomatis setelah dekan tanda tangan):
```
[Auto Created] → rektor_pending (status: pending)
               ↓
[Rektor Signs] → completed (status: signed) ✅
```

## Database Schema

### documents table
```sql
-- Dokumen Dekan (setelah dekan tanda tangan)
{
  id: uuid,
  user_id: dekan_id,
  title: "Ijazah - Nama Mahasiswa",
  status: "signed", ✅
  document_type: "ijazah",
  recipient_name: "Nama Mahasiswa",
  recipient_student_number: "NIM",
  metadata: {
    workflow_stage: "completed",
    rektor_id: uuid,
    created_by_id: dekan_id,
    dekan_signed: true,
    dekan_signed_at: timestamp,
    dekan_qr_code: string,
    rektor_signed: true, // Updated after rektor signs
    rektor_signed_at: timestamp,
    rektor_qr_code: string,
  },
}

-- Dokumen Rektor (dibuat otomatis)
{
  id: uuid,
  user_id: rektor_id,
  title: "Ijazah - Nama Mahasiswa",
  status: "signed", ✅
  document_type: "ijazah",
  recipient_name: "Nama Mahasiswa",
  recipient_student_number: "NIM",
  metadata: {
    workflow_stage: "completed",
    original_document_id: dekan_document_id,
    dekan_signed: true,
    dekan_signed_at: timestamp,
    dekan_qr_code: string,
    rektor_signed: true,
    rektor_signed_at: timestamp,
    rektor_qr_code: string,
  },
}
```

### ijazah table
```sql
-- Record untuk dokumen dekan
{
  id: uuid,
  document_id: dekan_document_id,
  nama_mahasiswa: string,
  nim: string,
  gelar: string,
  nama_fakultas: string,
  tanggal_terbit: date,
  logo_url: string,
  is_validated: boolean,
}

-- Record untuk dokumen rektor (copy)
{
  id: uuid,
  document_id: rektor_document_id,
  nama_mahasiswa: string,
  nim: string,
  gelar: string,
  nama_fakultas: string,
  tanggal_terbit: date,
  logo_url: string,
  is_validated: boolean,
}
```

## Key Improvements

### 1. Status Management
- ✅ Dokumen dekan langsung menjadi "signed" setelah dekan tanda tangan
- ✅ Dokumen rektor langsung menjadi "signed" setelah rektor tanda tangan
- ✅ Tidak ada status "pending" yang berkepanjangan

### 2. QR Code Integration
- ✅ QR code diisi manual oleh penandatangan
- ✅ QR code disimpan di metadata
- ✅ QR code muncul pada nama penandatangan di dokumen

### 3. Automatic Document Routing
- ✅ Setelah dekan tanda tangan, dokumen otomatis terkirim ke rektor
- ✅ Rektor menerima dokumen baru di dashboard mereka
- ✅ Tidak perlu manual routing

### 4. Document Visibility
- ✅ Dekan dapat melihat dokumen mereka dengan status "signed"
- ✅ Rektor dapat melihat dokumen mereka dengan status "signed"
- ✅ Kedua pihak memiliki copy dokumen di tabel masing-masing

### 5. Workflow Tracking
- ✅ Metadata mencatat semua tahapan workflow
- ✅ Timestamp untuk setiap tanda tangan
- ✅ QR code untuk setiap penandatangan
- ✅ Link antara dokumen dekan dan rektor

## Testing Checklist

### Create Flow
- [ ] Dekan dapat membuat ijazah dengan form
- [ ] Validasi form bekerja dengan baik
- [ ] Preview menampilkan data yang benar
- [ ] Dokumen dibuat dengan metadata yang benar
- [ ] Redirect ke halaman signing

### Dekan Signing Flow
- [ ] Dekan dapat melihat dokumen pending
- [ ] Dekan dapat mengisi QR code
- [ ] Dekan dapat menandatangani dokumen
- [ ] Status dokumen dekan berubah menjadi "signed"
- [ ] QR code tersimpan di metadata
- [ ] Dokumen otomatis terkirim ke rektor

### Rektor Signing Flow
- [ ] Rektor menerima dokumen pending
- [ ] Rektor dapat melihat data ijazah
- [ ] Rektor dapat mengisi QR code
- [ ] Rektor dapat menandatangani dokumen
- [ ] Status dokumen rektor berubah menjadi "signed"
- [ ] Metadata dokumen dekan ter-update

### Visibility
- [ ] Dekan dapat melihat dokumen signed di dashboard
- [ ] Rektor dapat melihat dokumen signed di dashboard
- [ ] Kedua dokumen memiliki status "signed"
- [ ] Metadata lengkap dengan QR code

## Error Handling

### Common Errors
1. **Rektor not found**: Verify rektor_id in metadata
2. **Document creation failed**: Check database constraints
3. **QR code not saved**: Verify metadata update
4. **Routing failed**: Check user_id and rektor_id

### Debugging
- Check console logs untuk detailed error messages
- Verify database records di Supabase dashboard
- Check metadata structure
- Verify RLS policies untuk document access

## Future Enhancements

1. **Email Notifications**: Send email when document needs signing
2. **PDF Generation**: Generate PDF with QR codes after signing
3. **Blockchain Verification**: Add blockchain verification for authenticity
4. **Bulk Creation**: Create multiple ijazah at once
5. **Template Customization**: Allow customization of ijazah template
