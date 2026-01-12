# Requirements Document

## Introduction

Sistem saat ini memiliki masalah dimana field `file_url` pada tabel `documents` bernilai null meskipun dokumen sudah di-sign. Hal ini terjadi karena proses signing hanya menyimpan signature cryptographic di database tanpa menggenerate dan meng-upload file PDF yang sudah ditandatangani. Fitur ini akan memperbaiki workflow signing agar menghasilkan signed PDF dan menyimpan URL-nya ke database.

## Glossary

- **SigningSystem**: Sistem yang menangani proses penandatanganan dokumen digital
- **SignedPDF**: File PDF yang sudah ditandatangani dan berisi QR code verifikasi
- **EdgeFunction**: Serverless function yang berjalan di Supabase Edge Runtime
- **StorageBucket**: Tempat penyimpanan file di Supabase Storage
- **DocumentRecord**: Record di tabel `documents` yang menyimpan metadata dokumen

## Requirements

### Requirement 1

**User Story:** Sebagai sistem, saya ingin menggenerate signed PDF setelah dokumen ditandatangani, sehingga file PDF yang sudah ditandatangani tersedia untuk diunduh dan diverifikasi.

#### Acceptance Criteria

1. WHEN a document is successfully signed THEN the SigningSystem SHALL generate a signed PDF with QR code and signature information
2. WHEN the signed PDF is generated THEN the SigningSystem SHALL upload it to the StorageBucket under the path `signed-documents/{user_id}/{document_id}-signed-{timestamp}.pdf`
3. WHEN the signed PDF is uploaded successfully THEN the SigningSystem SHALL update the DocumentRecord's `file_url` field with the public URL
4. WHEN the signed PDF generation fails THEN the SigningSystem SHALL log the error but still complete the signing process
5. WHEN a document has multiple signers (workflow) THEN the SigningSystem SHALL only generate the final signed PDF after all required signatures are collected

### Requirement 2

**User Story:** Sebagai user, saya ingin melihat dan mengunduh dokumen yang sudah saya tandatangani, sehingga saya memiliki bukti penandatanganan.

#### Acceptance Criteria

1. WHEN a user views their signed documents THEN the system SHALL display a download button for documents with non-null `file_url`
2. WHEN a user clicks the download button THEN the system SHALL fetch the signed PDF from the `file_url`
3. WHEN the `file_url` is null for a signed document THEN the system SHALL display a message indicating the PDF is being generated or unavailable
4. WHEN a signed PDF is accessed THEN the system SHALL serve it with proper content-type headers

### Requirement 3

**User Story:** Sebagai administrator, saya ingin memperbaiki dokumen yang sudah di-sign tetapi tidak memiliki `file_url`, sehingga semua dokumen signed memiliki file PDF yang dapat diakses.

#### Acceptance Criteria

1. WHEN an administrator runs a repair script THEN the system SHALL identify all documents with status 'signed' and null `file_url`
2. WHEN a document needs repair THEN the system SHALL regenerate the signed PDF using the existing signature data
3. WHEN the PDF is regenerated successfully THEN the system SHALL update the `file_url` field in the database
4. WHEN regeneration fails for a document THEN the system SHALL log the error and continue with the next document
5. WHEN the repair script completes THEN the system SHALL report the number of documents repaired and any failures

### Requirement 4

**User Story:** Sebagai sistem, saya ingin memastikan signed PDF yang dihasilkan konsisten dengan template yang digunakan saat preview, sehingga tidak ada perbedaan visual antara preview dan hasil akhir.

#### Acceptance Criteria

1. WHEN generating a signed PDF THEN the SigningSystem SHALL use the same template component used for preview (IjazahTemplate, SertifikatTemplate, or SignedDocumentTemplate)
2. WHEN the document type is Ijazah THEN the SigningSystem SHALL fetch ijazah data and render IjazahTemplate
3. WHEN the document type is Sertifikat THEN the SigningSystem SHALL fetch sertifikat data and render SertifikatTemplate
4. WHEN the document type is generic THEN the SigningSystem SHALL render SignedDocumentTemplate
5. WHEN rendering templates THEN the SigningSystem SHALL include all signature information and QR codes for verification
