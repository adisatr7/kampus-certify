# Design Document

## Overview

Sistem saat ini memiliki gap dalam workflow signing dimana dokumen berhasil di-sign secara cryptographic (signature tersimpan di `document_signatures`) tetapi file PDF yang sudah ditandatangani tidak di-generate dan di-upload ke storage. Hal ini menyebabkan field `file_url` pada tabel `documents` bernilai null.

Solusi yang akan diimplementasikan adalah:
1. Memindahkan logika PDF generation dari client-side (DocumentSigningFlow.tsx) ke server-side (edge function)
2. Edge function `sign-document` akan menggenerate dan upload signed PDF setelah signature berhasil dibuat
3. Membuat repair script untuk dokumen yang sudah signed tetapi belum memiliki file_url
4. Memastikan konsistensi template antara preview dan hasil akhir

## Architecture

### Current Architecture (Problem)

```
User clicks "Sign" 
  → DocumentSigningFlow.tsx calls edge function
    → Edge function creates signature in DB
    → Edge function updates document status to "signed"
  → DocumentSigningFlow.tsx generates PDF (client-side)
  → DocumentSigningFlow.tsx uploads PDF to storage
  → DocumentSigningFlow.tsx updates file_url
```

**Problems:**
- PDF generation happens on client-side (slow, unreliable)
- If client disconnects after signing, PDF is never generated
- Client-side PDF generation can fail due to browser limitations
- Inconsistent results between different browsers

### New Architecture (Solution)

```
User clicks "Sign"
  → DocumentSigningFlow.tsx calls edge function with passphrase
    → Edge function validates passphrase
    → Edge function creates signature in DB
    → Edge function updates document status
    → Edge function generates signed PDF (server-side)
    → Edge function uploads PDF to storage
    → Edge function updates file_url in DB
  → DocumentSigningFlow.tsx receives success response
```

**Benefits:**
- Atomic operation: signing and PDF generation happen together
- Server-side PDF generation is more reliable
- No dependency on client staying connected
- Consistent PDF output across all users

## Components and Interfaces

### 1. Edge Function: sign-document (Modified)

**Location:** `supabase/functions/sign-document/index.ts`

**New Responsibilities:**
- Generate signed PDF after creating signature
- Upload PDF to storage bucket
- Update document record with file_url

**Interface Changes:**
```typescript
// Request (unchanged)
interface SignDocumentRequest {
  documentId: string;
  signerUserId: string;
  passphrase: string;
}

// Response (enhanced)
interface SignDocumentResponse {
  ok: boolean;
  keyId: string;
  hash: string;
  signature: string;
  fileUrl?: string;  // NEW: URL of generated PDF
  pdfGenerated: boolean;  // NEW: indicates if PDF was generated
}
```

### 2. PDF Generator Module (New)

**Location:** `supabase/functions/_shared/pdfGenerator.ts`

**Purpose:** Server-side PDF generation using Deno-compatible libraries

**Key Functions:**
```typescript
// Generate signed PDF from document data
async function generateSignedPDF(
  document: Document,
  signatures: DocumentSignature[],
  supabaseClient: SupabaseClient
): Promise<Uint8Array>

// Upload PDF to storage
async function uploadPDF(
  pdfBytes: Uint8Array,
  userId: string,
  documentId: string,
  supabaseClient: SupabaseClient
): Promise<string>
```

### 3. Repair Script (New)

**Location:** `supabase/functions/repair-signed-documents/index.ts`

**Purpose:** Regenerate PDFs for documents that are signed but missing file_url

**Interface:**
```typescript
interface RepairRequest {
  adminUserId: string;  // Only admins can run repair
  dryRun?: boolean;     // Preview without making changes
  documentIds?: string[];  // Specific documents to repair (optional)
}

interface RepairResponse {
  totalDocuments: number;
  repaired: number;
  failed: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}
```

### 4. Client-Side Changes

**DocumentSigningFlow.tsx:**
- Remove PDF generation logic
- Remove PDF upload logic
- Simplify to just call edge function and handle response

**SignedDocumentViewer.tsx:**
- No changes needed (already handles file_url)

## Data Models

### documents table (existing)

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  content TEXT,
  status TEXT NOT NULL,  -- 'pending', 'signed', 'revoked'
  file_url TEXT,  -- This field will be populated by edge function
  serial TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### document_signatures table (existing)

```sql
CREATE TABLE document_signatures (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  key_id UUID REFERENCES signing_keys(kid),
  payload_hash TEXT NOT NULL,
  signature TEXT NOT NULL,
  signer_user_id UUID REFERENCES users(id),
  signer_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Storage Bucket: signed-documents (existing)

```
signed-documents/
  {user_id}/
    {document_id}-signed-{timestamp}.pdf
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Signed documents have PDFs

*For any* document that is successfully signed, the system should generate a signed PDF containing QR code and signature information.
**Validates: Requirements 1.1**

### Property 2: PDF upload path consistency

*For any* signed PDF that is uploaded, the storage path should match the pattern `signed-documents/{user_id}/{document_id}-signed-{timestamp}.pdf`.
**Validates: Requirements 1.2**

### Property 3: file_url is set after upload

*For any* document where a signed PDF is successfully uploaded, the `file_url` field in the database should be updated with the public URL of that PDF.
**Validates: Requirements 1.3**

### Property 4: Signing succeeds despite PDF failure

*For any* document where PDF generation fails, the cryptographic signature should still be created and the document status should be updated to "signed".
**Validates: Requirements 1.4**

### Property 5: Multi-stage workflow PDF generation

*For any* document with multiple required signers, the signed PDF should only be generated after all required signatures have been collected (final stage).
**Validates: Requirements 1.5**

### Property 6: Download button visibility

*For any* signed document with a non-null `file_url`, the UI should render a download button.
**Validates: Requirements 2.1**

### Property 7: Content-type headers for PDFs

*For any* signed PDF that is served, the HTTP response should include `Content-Type: application/pdf` header.
**Validates: Requirements 2.4**

### Property 8: Repair script identifies broken documents

*For any* execution of the repair script, it should identify all documents where `status = 'signed'` AND `file_url IS NULL`.
**Validates: Requirements 3.1**

### Property 9: Repair regenerates PDFs

*For any* document identified by the repair script, a signed PDF should be regenerated using the existing signature data from `document_signatures` table.
**Validates: Requirements 3.2**

### Property 10: Repair updates file_url

*For any* document successfully repaired, the `file_url` field should be updated with the URL of the regenerated PDF.
**Validates: Requirements 3.3**

### Property 11: Repair continues on failure

*For any* document that fails during repair, the script should log the error and continue processing the remaining documents.
**Validates: Requirements 3.4**

### Property 12: Repair reports summary

*For any* execution of the repair script, it should return a summary containing the total number of documents processed, number repaired, number failed, and details of any errors.
**Validates: Requirements 3.5**

### Property 13: Template consistency

*For any* document, the template used for PDF generation should be the same template used for preview rendering.
**Validates: Requirements 4.1**

### Property 14: Signature data in PDFs

*For any* generated signed PDF, it should contain all signature information (signer names, dates, roles) and QR codes for verification.
**Validates: Requirements 4.5**


## Error Handling

### Edge Function Errors

1. **PDF Generation Failure**
   - Log detailed error with document ID and user ID
   - Continue with signing process (signature is still valid)
   - Return response indicating PDF generation failed
   - Client should display warning to user

2. **Storage Upload Failure**
   - Log error with document ID and file size
   - Retry upload up to 3 times with exponential backoff
   - If all retries fail, log error but don't fail the signing
   - Document can be repaired later using repair script

3. **Database Update Failure**
   - Log error with document ID and attempted file_url
   - Retry update up to 3 times
   - If all retries fail, log error for manual investigation
   - File exists in storage but file_url is not set (repair script can fix)

### Repair Script Errors

1. **Document Fetch Failure**
   - Log error and skip to next document
   - Include in failure count and error report

2. **Signature Data Missing**
   - Log warning that document cannot be repaired
   - Skip document and continue
   - Include in error report with reason

3. **PDF Generation Failure**
   - Log detailed error
   - Skip document and continue
   - Include in failure count and error report

4. **Upload or Update Failure**
   - Same retry logic as edge function
   - Log final failure and continue
   - Include in error report

### Client-Side Errors

1. **Edge Function Call Failure**
   - Display error message to user
   - Suggest retrying or contacting admin
   - Don't proceed with navigation

2. **Missing Document Data**
   - Display error message indicating data is incomplete
   - Suggest recreating the document
   - Provide link back to document list

## Testing Strategy

### Unit Tests

Unit tests will cover specific functions and edge cases:

1. **PDF Generator Module**
   - Test PDF generation with valid document data
   - Test handling of missing optional fields
   - Test QR code generation
   - Test signature information formatting

2. **Storage Upload Function**
   - Test successful upload
   - Test retry logic on failure
   - Test path formatting

3. **Database Update Function**
   - Test successful update
   - Test retry logic on failure

4. **Repair Script**
   - Test document identification query
   - Test filtering logic (only signed documents with null file_url)
   - Test summary report generation

### Property-Based Tests

Property-based tests will verify universal properties across many inputs:

1. **Property 3: file_url is set after upload**
   - Generate random documents with various types (Ijazah, Sertifikat, generic)
   - Sign each document
   - Verify file_url is non-null and points to valid storage URL
   - Run 100+ iterations with different document configurations

2. **Property 5: Multi-stage workflow PDF generation**
   - Generate random documents with 1 or 2 signers
   - Sign documents through workflow stages
   - Verify PDF is only generated at final stage
   - Run 100+ iterations with different workflow configurations

3. **Property 8: Repair script identifies broken documents**
   - Generate random mix of documents (signed with file_url, signed without file_url, pending)
   - Run repair script
   - Verify only signed documents with null file_url are identified
   - Run 100+ iterations with different document mixes

4. **Property 13: Template consistency**
   - Generate random documents of each type
   - Render preview and generate PDF
   - Compare visual elements (presence of QR code, signature blocks, document data)
   - Run 100+ iterations per document type

### Integration Tests

Integration tests will verify end-to-end workflows:

1. **Complete Signing Flow**
   - Create document → Sign document → Verify PDF exists → Download PDF
   - Test with all document types (Ijazah, Sertifikat, generic)
   - Verify file_url is set correctly

2. **Multi-Signer Workflow**
   - Create document with 2 signers → First signer signs → Verify no PDF yet
   - Second signer signs → Verify PDF is generated
   - Test with Ijazah (Dekan → Rektor) and Sertifikat workflows

3. **Repair Script Flow**
   - Create signed documents without file_url (simulate old data)
   - Run repair script
   - Verify PDFs are generated and file_url is set
   - Verify summary report is accurate

### Manual Testing

Manual testing checklist:

1. Sign a new Ijazah document and verify PDF is generated
2. Sign a new Sertifikat document and verify PDF is generated
3. View signed document and verify download button works
4. Run repair script on test database and verify results
5. Test error scenarios (disconnect during signing, invalid data)

## Implementation Notes

### Deno Compatibility

The edge function runs on Deno, which has different APIs than Node.js:

1. **PDF Generation Library**
   - Use `pdf-lib` (works in Deno)
   - Import from `https://esm.sh/pdf-lib`

2. **HTML to Canvas**
   - Cannot use `html2canvas` in Deno (browser-only)
   - Alternative: Use `puppeteer` or `playwright` for server-side rendering
   - Or: Pre-render templates to images on client, send to server

3. **QR Code Generation**
   - Use `qrcode` library
   - Import from `https://esm.sh/qrcode`

### Template Rendering Strategy

Since we can't use React components directly in Deno, we have two options:

**Option A: Client-side pre-rendering (Recommended)**
1. Client renders template to canvas using html2canvas
2. Client converts canvas to PNG data URL
3. Client sends PNG data to edge function
4. Edge function embeds PNG into PDF

**Option B: Server-side HTML rendering**
1. Edge function uses Puppeteer/Playwright to render HTML
2. Requires additional Deno dependencies
3. More complex but fully server-side

We'll use **Option A** for initial implementation as it reuses existing client-side rendering code and is simpler to implement.

### Storage Bucket Configuration

Ensure the `signed-documents` bucket has:
- Public read access (for file_url to work)
- Authenticated write access (only edge function can upload)
- Proper CORS configuration for downloads

### Database Indexes

Add indexes to improve query performance:

```sql
-- For repair script query
CREATE INDEX idx_documents_status_file_url 
ON documents(status, file_url) 
WHERE status = 'signed' AND file_url IS NULL;

-- For document lookup by serial
CREATE INDEX idx_documents_serial 
ON documents(serial) 
WHERE serial IS NOT NULL;
```

## Security Considerations

1. **Edge Function Authentication**
   - Verify user has permission to sign the document
   - Validate passphrase before generating PDF
   - Use service role key only for storage operations

2. **Storage Access**
   - PDFs are public (needed for verification)
   - But document IDs are UUIDs (hard to guess)
   - Consider adding signed URLs for extra security

3. **Repair Script Access**
   - Only admins can run repair script
   - Verify admin role before processing
   - Rate limit to prevent abuse

4. **Input Validation**
   - Validate document ID format (UUID)
   - Validate user ID format (UUID)
   - Sanitize any user-provided data in PDFs

## Performance Considerations

1. **PDF Generation Time**
   - Expected: 2-5 seconds per document
   - Timeout edge function at 30 seconds
   - If timeout occurs, log error and allow retry

2. **Storage Upload Time**
   - Expected: 1-3 seconds for typical PDF (500KB-2MB)
   - Use streaming upload for large files
   - Implement retry with exponential backoff

3. **Repair Script Batch Size**
   - Process documents in batches of 10
   - Add delay between batches to avoid overload
   - Provide progress updates

4. **Database Queries**
   - Use indexes for efficient lookups
   - Limit repair script to 100 documents per run
   - Allow filtering by date range if needed

## Deployment Plan

1. **Phase 1: Deploy Edge Function Changes**
   - Deploy updated `sign-document` function
   - Test with new documents
   - Monitor logs for errors

2. **Phase 2: Deploy Client Changes**
   - Remove client-side PDF generation code
   - Update UI to handle new response format
   - Test signing flow end-to-end

3. **Phase 3: Deploy Repair Script**
   - Deploy repair script as new edge function
   - Test on small batch of documents
   - Run full repair on production data

4. **Phase 4: Monitoring**
   - Monitor edge function logs
   - Track file_url null rate
   - Set up alerts for failures

## Rollback Plan

If issues occur:

1. **Revert Edge Function**
   - Redeploy previous version of `sign-document`
   - Client will handle PDF generation again

2. **Revert Client Changes**
   - Restore client-side PDF generation code
   - System returns to previous behavior

3. **Data Cleanup**
   - If partial data exists, run cleanup script
   - Remove any incomplete PDF uploads
