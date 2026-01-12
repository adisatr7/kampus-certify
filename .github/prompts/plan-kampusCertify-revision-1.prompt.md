# Fix Document Management & Audit Logging - Kampus Certify

**TL;DR:** Fix 10 issues spanning document signing/deletion UI, preview functionality, audit logging completeness, and address duplicate login entries. Key improvements: consolidate audit logging (currently partial), fix signed/unsigned document filtering, implement comprehensive event tracking across all document operations, and resolve auto-certificate creation timing.

## Implementation Steps

### 1. Fix signed documents table display
- **File:** [MyDocuments.tsx](MyDocuments.tsx#L100-L189)
- **Issue:** Signed documents table incorrectly shows unsigned documents
- **Fix:** Correct filter logic to properly check document status column
- **Details:** Verify status column filtering works correctly for both signed and unsigned states

### 2. Add delete/reject button for unsigned documents
- **File:** [MyDocuments.tsx](MyDocuments.tsx) - unsigned documents table section
- **Issue:** No way to delete/reject pending documents in user view
- **Fix:** Add action buttons with delete and status change functionality
- **Details:** Include confirmation modal; use existing `deleteDocument()` function

### 3. Enable preview for uploaded documents
- **File:** [DocumentSigning.tsx](DocumentSigning.tsx)
- **Issue:** Preview not shown for non-ijazah/non-sertifikat documents
- **Fix:** Add generic PDF viewer component for generic document types
- **Details:** Detect document type and render appropriate preview (template-specific vs. generic PDF viewer)

### 4. Fix uploaded document signing failures
- **File:** [sign-document.ts](supabase/functions/sign-document/index.ts)
- **Issue:** Signing fails for generic uploaded documents
- **Fix:** Handle non-standard document types in signing flow
- **Details:** Add error logging and fallback for generic document signing; verify PDF signing works without template constraints

### 5. Remove "Fill Document Form" on upload
- **File:** [MyDocuments.tsx](MyDocuments.tsx)
- **Issue:** Unnecessary form input during document upload
- **Fix:** Remove form input component from upload flow
- **Details:** Simplify to file upload only; remove metadata form if not essential

### 6. Consolidate duplicate login audit entries
- **File:** [auth.tsx](src/lib/auth.tsx)
- **Issue:** Login audit entries created in multiple places (lines 123 and elsewhere)
- **Fix:** Keep single login audit entry in primary auth location; remove redundant entries
- **Details:** Ensure only one audit entry per login session; test login cycles to verify no duplicates

### 7. Fix delete document admin page
- **File:** [adminDocuments.tsx](pages/admin/adminDocuments.tsx)
- **Issue:** Delete button not functioning on admin document list
- **Fix:** Verify delete endpoint and RLS policies
- **Details:** Check [admin-documents RPC](supabase/functions/admin-documents/index.ts); verify RLS policies allow admin deletion; test deletion of various document types

### 8. Implement comprehensive audit logging
- **Issue:** Only login/logout logged; missing document operations, certificate actions, user management
- **Required new audit event types:**
  - Ijazah: CREATE, DELETE, SIGN, VERIFY, VIEW, DOWNLOAD
  - Sertifikat: CREATE, DELETE, SIGN, VERIFY, VIEW, DOWNLOAD
  - Generic Documents: UPLOAD, DELETE, SIGN, VERIFY, VIEW, DOWNLOAD
  - Certificates: PUBLISH, REVOKE
  - User: PASSWORD_CHANGE (Passphrase Edit), CREATE, UPDATE
  - Templates: CREATE, UPDATE, DELETE
- **Implementation:**
  1. Update [createAuditEntry()][src/lib/audit.ts](src/lib/audit.ts) to support all new event types
  2. Add audit logging calls to:
     - Document creation flows (ijazah, sertifikat, upload)
     - Document deletion operations
     - Document signing completion
     - Document view operations
     - Document download operations
     - Certificate publishing flow
     - Certificate revocation flow
     - User management (create, edit passphrase)
     - Template management (create, update, delete)
  3. Update audit trail UI to display all event types with appropriate filtering

### 9. Fix login/logout duplicate database entries
- **Files:** [auth.tsx](src/lib/auth.tsx), authentication flow
- **Issue:** Single login/logout creates multiple database entries
- **Fix:** Identify and consolidate duplicate RPC calls
- **Details:** 
  - Check both session initialization and email verification paths
  - Ensure single `create_audit_entry` RPC call per login event
  - Test login/logout cycles; verify only one entry per action in database

### 10. Disable auto-certificate creation on login
- **File:** [signing-keys.ts](src/lib/signing-keys.ts)
- **Issue:** Digital certificates created automatically on login (unexpected behavior)
- **Fix:** Move auto-key generation from session initialization to signing operation
- **Details:**
  - Add flag to check if auto-generation already occurred in session
  - Only generate keys on actual signature attempt (first sign operation)
  - Remove automatic generation from login/session initialization
  - Verify users can still sign documents on first attempt (key generated on-demand)

## Testing Checklist

- [ ] **Document Filtering:** Verify signed/unsigned documents appear in correct tables
- [ ] **Delete Operations:** Test document deletion from both user and admin views with confirmation
- [ ] **Preview:** Upload generic document and verify preview renders in signing interface
- [ ] **Generic Document Signing:** Upload PDF and successfully sign it
- [ ] **Upload Form:** Verify no form fields shown during upload, only file selection
- [ ] **Audit Entries:** Login once, verify exactly one LOGIN entry (not duplicates)
- [ ] **Admin Delete:** Admin can delete documents from admin panel
- [ ] **Audit Trail:** Verify all operations logged:
  - Document create/delete/sign/verify/view/download
  - Certificate publish/revoke
  - User create/password change
  - Template create/update/delete
- [ ] **Login/Logout:** Single login creates 1 entry, single logout creates 1 entry
- [ ] **No Auto-Cert:** New user logs in, no certificates created until first signature attempt

## Database Considerations

- Verify RLS policies in [audit_trail_rls.sql](supabase/migrations/13_audit_trail_rls.sql) after changes
- Check document deletion RLS policies allow admin deletion
- Ensure audit entries include proper user_id and action description for traceability

## Files to Modify Summary

**Core Files:**
- [MyDocuments.tsx](MyDocuments.tsx) - Document table display, delete buttons, upload form
- [DocumentSigning.tsx](DocumentSigning.tsx) - Document preview handling
- [adminDocuments.tsx](pages/admin/adminDocuments.tsx) - Admin delete functionality
- [auth.tsx](src/lib/auth.tsx) - Login audit consolidation
- [src/lib/audit.ts](src/lib/audit.ts) - Audit logging infrastructure
- [signing-keys.ts](src/lib/signing-keys.ts) - Auto-certificate creation timing

**Backend Functions:**
- [sign-document.ts](supabase/functions/sign-document/index.ts) - Generic document signing
- [admin-documents RPC](supabase/functions/admin-documents/index.ts) - Admin operations

**Database:**
- [audit_trail_rls.sql](supabase/migrations/13_audit_trail_rls.sql) - RLS policy verification
