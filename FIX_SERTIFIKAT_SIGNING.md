# Fix: Sertifikat Signing - file_url Tidak Ter-update

## Masalah
PDF berhasil di-generate dan di-upload ke storage, tapi `file_url` tidak ter-update di table `documents`.

## Root Cause
Kondisi `shouldGeneratePDF` selalu `false` untuk sertifikat dengan 1 penandatangan karena:

1. `workflow_stage` = `"pending_signer1"`
2. `getNextStage("pending_signer1")` return `"pending_signer2"` (hardcoded)
3. `isFinalSignature = (nextStage === "completed")` = `false`
4. `shouldGeneratePDF = (!isIjazahWorkflow && isFinalSignature)` = `false`

Akibatnya, blok kode untuk generate dan upload PDF tidak dijalankan.

## Perbaikan

### 1. Fix `getNextStage` Function
Sekarang check apakah ada `signer2_id` di metadata:

```typescript
const getNextStage = (currentStage: string): string => {
  const metadata = (document?.metadata as any) || {};
  const hasSigner2 = metadata.signer2_id && metadata.signer2_id !== "none";
  
  switch (currentStage) {
    case "pending_signer1":
      // If no signer2, go directly to completed
      return hasSigner2 ? "pending_signer2" : "completed";
    // ... other cases
  }
};
```

### 2. Fix `shouldGeneratePDF` Condition
Tambahkan check khusus untuk sertifikat:

```typescript
const hasSigner2 = metadata.signer2_id && metadata.signer2_id !== "none";
const isSertifikatFinalSignature = isSertifikatDoc && (
  (workflowStage === "pending_signer1" && !hasSigner2) ||
  workflowStage === "pending_signer2"
);

const shouldGeneratePDF =
  (isIjazahWorkflow && isRektorSigning) ||
  (!isIjazahWorkflow && (isFinalSignature || isSertifikatFinalSignature));
```

### 3. Enhanced Logging
Tambahkan detailed logging untuk debug:

```typescript
console.log("=== PDF Generation Check ===");
console.log("isSertifikatDoc:", isSertifikatDoc);
console.log("hasSigner2:", hasSigner2);
console.log("workflowStage:", workflowStage);
console.log("isSertifikatFinalSignature:", isSertifikatFinalSignature);
console.log("shouldGeneratePDF:", shouldGeneratePDF);
```

### 4. Direct Update with Verification
Update `file_url` langsung dengan verification:

```typescript
const { data: updateResult, error: updateErr } = await supabase
  .from("documents")
  .update({ file_url: fileUrl })
  .eq("id", document.id)
  .select("id, file_url");

console.log(">>> Update result:", updateResult);
console.log(">>> Update error:", updateErr);
```

## Flow Setelah Fix

### Sertifikat dengan 1 Penandatangan:
1. Create sertifikat → `workflow_stage = "pending_signer1"`
2. Signer1 sign → `getNextStage` return `"completed"` (karena no signer2)
3. `isFinalSignature = true`
4. `shouldGeneratePDF = true`
5. Generate PDF → Upload → Update `file_url` ✅

### Sertifikat dengan 2 Penandatangan:
1. Create sertifikat → `workflow_stage = "pending_signer1"`
2. Signer1 sign → `getNextStage` return `"pending_signer2"`
3. `isFinalSignature = false`, `shouldGeneratePDF = false`
4. Dokumen dikirim ke signer2
5. Signer2 sign → `getNextStage` return `"completed"`
6. `isFinalSignature = true`
7. `shouldGeneratePDF = true`
8. Generate PDF → Upload → Update `file_url` ✅

## Testing

### Test 1: Sertifikat dengan 1 Penandatangan
1. Buat sertifikat baru dengan hanya 1 penandatangan
2. Sign dokumen
3. Check console logs:
   ```
   === PDF Generation Check ===
   isSertifikatDoc: true
   hasSigner2: false
   workflowStage: pending_signer1
   isSertifikatFinalSignature: true
   shouldGeneratePDF: true
   ```
4. Verify `file_url` ter-update di database

### Test 2: Sertifikat dengan 2 Penandatangan
1. Buat sertifikat dengan 2 penandatangan
2. Signer1 sign → `shouldGeneratePDF = false` (expected)
3. Signer2 sign → `shouldGeneratePDF = true`
4. Verify `file_url` ter-update setelah signer2 sign

## Console Logs Expected

### Successful Flow:
```
=== Signing Document ===
Document ID: xxx
Document Type: Sertifikat
Workflow Stage: pending_signer1
Next Stage: completed
Is Final Signature: true
QR Value: xxx

=== PDF Generation Check ===
isSertifikatDoc: true
hasSigner2: false
workflowStage: pending_signer1
isSertifikatFinalSignature: true
shouldGeneratePDF: true

=== Generating Signed PDF ===
Starting PDF generation...
PDF generated successfully, size: xxx bytes
Uploading PDF to storage...

=== Upload Signed PDF ===
Upload successful: {...}
Public URL generated: https://...

=== After uploadSignedPDF ===
fileUrl returned: https://...
PDF uploaded successfully, now updating document...
>>> Starting file_url update...
>>> Update result: [{id: 'xxx', file_url: 'https://...'}]
>>> Update error: null
>>> Direct update successful!
>>> Verifying update...
>>> Verify result: {file_url: 'https://...'}
✅ file_url update verified successfully
```

## Files Modified

1. `src/pages/DocumentSigningFlow.tsx`:
   - Fixed `getNextStage` to check for signer2
   - Fixed `shouldGeneratePDF` condition
   - Added detailed logging
   - Added direct update with verification

## Verification Query

```sql
-- Check if file_url is updated
SELECT 
  id,
  title,
  status,
  file_url,
  metadata->>'workflow_stage' as workflow_stage
FROM documents
WHERE id = 'DOCUMENT_ID';
```

Expected result after signing:
- `status = 'signed'`
- `file_url = 'https://...'` (not NULL)
- `workflow_stage = 'completed'`
