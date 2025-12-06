# Template Consistency Verification

## Task 7: Ensure template consistency between preview and PDF

### Implementation Summary

This document verifies that the PDF generator uses the correct templates based on document type, matching the preview templates used in the UI.

### Changes Made

1. **Updated Document Interface** (`supabase/functions/_shared/pdfGenerator.ts`)
   - Added `document_type` field to Document interface
   - Added Ijazah and Sertifikat data interfaces

2. **Implemented Ijazah PDF Generation** (`generateIjazahSignedPDF`)
   - Matches `IjazahTemplate.tsx` layout
   - Includes:
     - NIM and Nomor Ijazah header
     - University name and golden border
     - Student name in italic font
     - Degree information (full name and abbreviation)
     - Dekan and Rektor signatures with QR codes
     - Proper positioning matching the template

3. **Implemented Sertifikat PDF Generation** (`generateSertifikatSignedPDF`)
   - Matches `SertifikatTemplate.tsx` layout
   - Includes:
     - Certificate title and number
     - Participant name in italic font
     - Event details (name, date, location)
     - Two signer positions with QR codes
     - Golden borders and decorative elements

4. **Updated Main PDF Generator** (`generateSignedPDF`)
   - Uses `document.document_type` field to determine template
   - Fetches appropriate data from `ijazah` or `sertifikat` tables
   - Fetches all signer user data for signature blocks
   - Falls back to generic template for 'other' document types

### Template Mapping

| Document Type | Database Field | Template Component | PDF Generator Function |
|--------------|----------------|-------------------|----------------------|
| Ijazah | `document_type = 'ijazah'` | `IjazahTemplate.tsx` | `generateIjazahSignedPDF()` |
| Sertifikat | `document_type = 'sertifikat'` | `SertifikatTemplate.tsx` | `generateSertifikatSignedPDF()` |
| Generic | `document_type = 'other'` or null | `SignedDocumentTemplate.tsx` | `generateGenericSignedPDF()` |

### Verification Checklist

- [x] IjazahTemplate is used for Ijazah documents (Requirement 4.2)
- [x] SertifikatTemplate is used for Sertifikat documents (Requirement 4.3)
- [x] SignedDocumentTemplate is used for generic documents (Requirement 4.4)
- [x] All signature information is included in PDFs (Requirement 4.5)
- [x] QR codes are included for verification (Requirement 4.5)
- [x] Document type is determined by `document_type` field (Requirement 4.1)

### Data Flow

1. **Document Creation**
   - Document is created with `document_type` field set to 'ijazah', 'sertifikat', or 'other'
   - Related data is stored in `ijazah` or `sertifikat` tables

2. **Signing Process**
   - `sign-document` edge function fetches document with all fields (including `document_type`)
   - After final signature, calls `generateSignedPDF()`

3. **PDF Generation**
   - `generateSignedPDF()` checks `document.document_type`
   - Fetches appropriate data from `ijazah` or `sertifikat` table
   - Fetches all signer user data
   - Calls appropriate template-specific generator function
   - Returns PDF bytes

4. **PDF Upload**
   - PDF is uploaded to storage bucket
   - `file_url` is updated in documents table

### Signature Information Included

All PDF templates include:
- Signer names
- Signer NIP (if available)
- Signer roles/positions
- QR codes for verification
- Verification URL
- Document serial number
- Signing dates

### Requirements Validation

**Requirement 4.1**: Template consistency
- ✅ PDF generator uses same template logic as preview components
- ✅ Document type determines which template is used

**Requirement 4.2**: Ijazah template usage
- ✅ `document_type === 'ijazah'` triggers `generateIjazahSignedPDF()`
- ✅ Fetches data from `ijazah` table
- ✅ Includes all Ijazah-specific fields (NIM, gelar, fakultas, etc.)

**Requirement 4.3**: Sertifikat template usage
- ✅ `document_type === 'sertifikat'` triggers `generateSertifikatSignedPDF()`
- ✅ Fetches data from `sertifikat` table
- ✅ Includes all Sertifikat-specific fields (nama_acara, tanggal_acara, etc.)

**Requirement 4.4**: Generic template usage
- ✅ `document_type === 'other'` or null triggers `generateGenericSignedPDF()`
- ✅ Uses document title and content

**Requirement 4.5**: Signature information and QR codes
- ✅ All templates include signer names and roles
- ✅ All templates include QR codes for verification
- ✅ QR codes link to verification URL with document serial

### Testing Recommendations

1. **Manual Testing**
   - Create and sign an Ijazah document
   - Verify PDF matches IjazahTemplate preview
   - Create and sign a Sertifikat document
   - Verify PDF matches SertifikatTemplate preview
   - Create and sign a generic document
   - Verify PDF matches SignedDocumentTemplate preview

2. **Verification Points**
   - Check that all text content matches
   - Verify QR codes are present and scannable
   - Confirm signature blocks are in correct positions
   - Validate that all signer information is displayed

### Notes

- The PDF generator runs server-side in Deno environment
- Templates use pdf-lib for PDF generation (not HTML rendering)
- Layout is approximated to match React components
- Fonts are limited to standard PDF fonts (Times Roman, Times Roman Bold, Times Roman Italic)
- QR codes are generated using the qrcode library and embedded as PNG images
