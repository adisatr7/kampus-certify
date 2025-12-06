# Implementation Plan

- [x] 1. Create shared PDF generator module for edge functions
  - Create `supabase/functions/_shared/pdfGenerator.ts` with PDF generation utilities
  - Implement function to generate signed PDF from document data
  - Implement function to upload PDF to storage bucket
  - Use Deno-compatible libraries (pdf-lib, qrcode from esm.sh)
  - _Requirements: 1.1, 1.2_

- [ ]* 1.1 Write property test for PDF generation
  - **Property 1: Signed documents have PDFs**
  - **Validates: Requirements 1.1**

- [ ]* 1.2 Write property test for upload path consistency
  - **Property 2: PDF upload path consistency**
  - **Validates: Requirements 1.2**

- [x] 2. Update sign-document edge function to generate and upload PDFs
  - Add PDF generation logic after signature creation
  - Upload generated PDF to storage bucket
  - Update document record with file_url
  - Implement retry logic for upload and database update (3 retries with exponential backoff)
  - Add error handling to continue signing even if PDF generation fails
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [ ]* 2.1 Write property test for file_url update
  - **Property 3: file_url is set after upload**
  - **Validates: Requirements 1.3**

- [ ]* 2.2 Write property test for signing resilience
  - **Property 4: Signing succeeds despite PDF failure**
  - **Validates: Requirements 1.4**

- [x] 3. Implement multi-stage workflow PDF generation logic
  - Detect if document is part of multi-signer workflow
  - Only generate PDF at final stage (after all required signatures)
  - For Ijazah: generate PDF only after Rektor signs
  - For Sertifikat: generate PDF only after final signer
  - _Requirements: 1.5_

- [ ]* 3.1 Write property test for workflow PDF generation
  - **Property 5: Multi-stage workflow PDF generation**
  - **Validates: Requirements 1.5**

- [x] 4. Update client-side DocumentSigningFlow component
  - Remove client-side PDF generation code (generateSignedPDF call)
  - Remove client-side PDF upload code (uploadSignedPDF call)
  - Remove file_url update logic
  - Simplify to only call edge function and handle response
  - Update error handling to show warnings if PDF generation failed
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 5. Update SignedDocumentViewer component for better UX
  - Ensure download button is only shown when file_url is not null
  - Add message when file_url is null: "PDF sedang di-generate atau tidak tersedia"
  - Verify content-type headers are correct when serving PDFs
  - _Requirements: 2.1, 2.3, 2.4_

- [ ]* 5.1 Write property test for download button visibility
  - **Property 6: Download button visibility**
  - **Validates: Requirements 2.1**

- [ ]* 5.2 Write property test for PDF content-type headers
  - **Property 7: Content-type headers for PDFs**
  - **Validates: Requirements 2.4**

- [x] 6. Create repair script edge function
  - Create `supabase/functions/repair-signed-documents/index.ts`
  - Implement query to find documents with status='signed' and file_url IS NULL
  - Implement batch processing (10 documents at a time)
  - For each document, fetch signature data and regenerate PDF
  - Upload PDF and update file_url
  - Track success/failure counts and error details
  - Return summary report with counts and errors
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ]* 6.1 Write property test for document identification
  - **Property 8: Repair script identifies broken documents**
  - **Validates: Requirements 3.1**

- [ ]* 6.2 Write property test for PDF regeneration
  - **Property 9: Repair regenerates PDFs**
  - **Validates: Requirements 3.2**

- [ ]* 6.3 Write property test for repair file_url update
  - **Property 10: Repair updates file_url**
  - **Validates: Requirements 3.3**

- [ ]* 6.4 Write property test for repair error handling
  - **Property 11: Repair continues on failure**
  - **Validates: Requirements 3.4**

- [ ]* 6.5 Write property test for repair summary report
  - **Property 12: Repair reports summary**
  - **Validates: Requirements 3.5**

- [x] 7. Ensure template consistency between preview and PDF
  - Verify IjazahTemplate is used for Ijazah documents
  - Verify SertifikatTemplate is used for Sertifikat documents
  - Verify SignedDocumentTemplate is used for generic documents
  - Ensure all signature information and QR codes are included
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 7.1 Write property test for template consistency
  - **Property 13: Template consistency**
  - **Validates: Requirements 4.1**

- [ ]* 7.2 Write property test for signature data in PDFs
  - **Property 14: Signature data in PDFs**
  - **Validates: Requirements 4.5**

- [ ] 8. Add database indexes for performance
  - Create index on documents(status, file_url) for repair script query
  - Create index on documents(serial) for verification lookups
  - _Requirements: 3.1_

- [ ] 9. Configure storage bucket permissions
  - Verify signed-documents bucket has public read access
  - Verify authenticated write access for edge function
  - Configure CORS for downloads
  - _Requirements: 1.2, 2.2_

- [ ] 10. Add admin UI for repair script
  - Create admin page to trigger repair script
  - Display progress and results
  - Show list of failed documents with error details
  - Add dry-run option to preview without making changes
  - _Requirements: 3.1, 3.5_

- [ ]* 10.1 Write integration test for repair script UI
  - Test triggering repair from admin page
  - Test displaying results
  - Test dry-run mode

- [ ] 11. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Deploy and test in staging environment
  - Deploy edge function changes to staging
  - Deploy client changes to staging
  - Test complete signing flow with all document types
  - Test repair script on staging data
  - Monitor logs for errors
  - _Requirements: All_

- [ ]* 12.1 Write end-to-end integration tests
  - Test complete signing flow (create → sign → verify PDF)
  - Test multi-signer workflow
  - Test repair script flow

- [ ] 13. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.
