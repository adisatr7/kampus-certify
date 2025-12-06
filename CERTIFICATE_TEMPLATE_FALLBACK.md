# Template Fallback Logic

## Overview
Sistem template sertifikat memiliki fallback logic yang robust untuk memastikan selalu ada template yang digunakan, bahkan jika template_id tidak ada atau tidak valid.

## Fallback Priority

### 1. Template Selection Priority
```
templateId prop → sertifikat.template_id → "default" → DEFAULT_CERTIFICATE_TEMPLATES[0]
```

**Penjelasan**:
1. **templateId prop**: Jika component menerima prop `templateId`, gunakan itu
2. **sertifikat.template_id**: Jika tidak ada prop, gunakan dari data sertifikat
3. **"default"**: Jika keduanya kosong, gunakan ID "default"
4. **DEFAULT_CERTIFICATE_TEMPLATES[0]**: Jika template tidak ditemukan, gunakan template pertama

### 2. Implementation

#### SertifikatTemplate.tsx
```typescript
useEffect(() => {
  // Priority: templateId prop > sertifikat.template_id > default
  const idToUse = templateId || sertifikat.template_id || "default";
  
  const foundTemplate = DEFAULT_CERTIFICATE_TEMPLATES.find(
    (t) => t.id === idToUse
  );
  
  if (foundTemplate) {
    setTemplate(foundTemplate);
  } else {
    // Fallback to first template (default) if not found
    setTemplate(DEFAULT_CERTIFICATE_TEMPLATES[0]);
  }
}, [templateId, sertifikat.template_id]);
```

#### CreateSertifikatNew.tsx
```typescript
// Form default
const [formData, setFormData] = useState({
  // ...
  template_id: "default", // Default ke "default"
});

// Saat insert ke database
template_id: formData.template_id || "default", // Fallback ke "default"
```

## Scenarios

### Scenario 1: User Memilih Template
```
User pilih "modern" → template_id = "modern" → Gunakan template modern
```

### Scenario 2: User Tidak Memilih Template
```
Form default → template_id = "default" → Gunakan template default (border emas)
```

### Scenario 3: Template ID Tidak Valid
```
template_id = "invalid" → Template tidak ditemukan → Fallback ke DEFAULT_CERTIFICATE_TEMPLATES[0]
```

### Scenario 4: Template ID Null/Empty
```
template_id = null → idToUse = "default" → Gunakan template default
```

### Scenario 5: Sertifikat Lama Tanpa Template ID
```
sertifikat.template_id = null → idToUse = "default" → Gunakan template default
```

## Benefits

### 1. Backward Compatibility
Sertifikat lama yang dibuat sebelum sistem template akan otomatis menggunakan template default.

### 2. Error Prevention
Tidak ada error jika template_id tidak valid atau tidak ada.

### 3. Consistent Experience
Semua sertifikat selalu memiliki tampilan yang konsisten.

### 4. Easy Migration
Sertifikat existing tidak perlu diupdate, akan otomatis menggunakan template default.

## Testing

### Test Case 1: New Certificate with Template
```typescript
// Input
formData.template_id = "modern"

// Expected
Template modern digunakan
```

### Test Case 2: New Certificate without Template
```typescript
// Input
formData.template_id = ""

// Expected
Template default (border emas) digunakan
```

### Test Case 3: Old Certificate without Template ID
```typescript
// Input
sertifikat.template_id = null

// Expected
Template default (border emas) digunakan
```

### Test Case 4: Invalid Template ID
```typescript
// Input
sertifikat.template_id = "nonexistent"

// Expected
Template default (border emas) digunakan
```

### Test Case 5: Preview with Template
```typescript
// Input
<SertifikatPreview templateId="classic" />

// Expected
Template classic digunakan untuk preview
```

## Database Schema

### Sertifikat Table
```sql
CREATE TABLE sertifikat (
  id UUID PRIMARY KEY,
  document_id UUID REFERENCES documents(id),
  nama_peserta TEXT NOT NULL,
  nama_acara TEXT NOT NULL,
  tanggal_acara DATE NOT NULL,
  nomor_sertifikat TEXT NOT NULL,
  penandatangan TEXT,
  template_id TEXT DEFAULT 'default', -- Default ke "default"
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Note**: Column `template_id` memiliki default value "default" di database level.

## Migration for Existing Data

Jika ada sertifikat existing dengan `template_id = null`:

```sql
-- Update semua sertifikat tanpa template_id
UPDATE sertifikat 
SET template_id = 'default' 
WHERE template_id IS NULL;

-- Set default value untuk future inserts
ALTER TABLE sertifikat 
ALTER COLUMN template_id SET DEFAULT 'default';
```

## Code Flow

### 1. Form Submission
```
User submit form
  ↓
formData.template_id = "default" (or user selection)
  ↓
Insert to database with template_id
  ↓
Sertifikat created with template_id
```

### 2. Viewing Certificate
```
Load sertifikat from database
  ↓
sertifikat.template_id = "default" (or saved value)
  ↓
SertifikatTemplate component
  ↓
Load template by ID
  ↓
If not found, fallback to DEFAULT_CERTIFICATE_TEMPLATES[0]
  ↓
Render with template
```

### 3. Preview
```
User click preview
  ↓
Pass formData.template_id to SertifikatPreview
  ↓
SertifikatPreview pass to SertifikatTemplate
  ↓
Load template by ID
  ↓
Render preview with template
```

## Error Handling

### Template Not Found
```typescript
const foundTemplate = DEFAULT_CERTIFICATE_TEMPLATES.find(
  (t) => t.id === idToUse
);

if (foundTemplate) {
  setTemplate(foundTemplate);
} else {
  // Fallback to first template
  setTemplate(DEFAULT_CERTIFICATE_TEMPLATES[0]);
  console.warn(`Template ${idToUse} not found, using default`);
}
```

### Empty Template ID
```typescript
const idToUse = templateId || sertifikat.template_id || "default";
// Always has a value, never undefined
```

### Invalid Template Data
```typescript
const [template, setTemplate] = useState<CertificateTemplate>(
  DEFAULT_CERTIFICATE_TEMPLATES[0]
);
// Initial state is always valid template
```

## Best Practices

### 1. Always Provide Default
```typescript
// ✅ Good
template_id: formData.template_id || "default"

// ❌ Bad
template_id: formData.template_id || null
```

### 2. Validate Template ID
```typescript
// ✅ Good
const foundTemplate = DEFAULT_CERTIFICATE_TEMPLATES.find(
  (t) => t.id === idToUse
);
if (!foundTemplate) {
  // Fallback logic
}

// ❌ Bad
const template = DEFAULT_CERTIFICATE_TEMPLATES.find(
  (t) => t.id === idToUse
);
// Might be undefined
```

### 3. Use Consistent Default
```typescript
// ✅ Good - Always use "default"
const DEFAULT_TEMPLATE_ID = "default";

// ❌ Bad - Different defaults in different places
// Some places use "default", others use null
```

## Summary

✅ Template default (border emas) selalu digunakan jika tidak ada template lain
✅ Backward compatible dengan sertifikat lama
✅ Error-proof dengan multiple fallback levels
✅ Consistent experience untuk semua user
✅ Easy to maintain dan extend

Sistem fallback memastikan tidak ada sertifikat yang tampil tanpa template!
