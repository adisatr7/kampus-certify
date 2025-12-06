# Sistem Template Sertifikat

## Overview
Sistem template yang fleksibel memungkinkan admin untuk membuat berbagai jenis sertifikat dengan background, warna, dan font yang berbeda.

## Fitur

### 1. Multiple Templates
- **Default**: Border emas, formal, serif fonts
- **Modern**: Minimalis, blue colors, sans-serif fonts
- **Classic**: Formal, brown colors, serif fonts

### 2. Customizable Properties
Setiap template memiliki:
- **Background URL**: Path ke background image
- **Layout**: default | modern | classic | elegant
- **Colors**: primary, secondary, text
- **Fonts**: heading, body

### 3. Template Selection
User dapat memilih template saat membuat sertifikat.

## File Structure

```
src/
├── types/
│   └── CertificateTemplate.ts       # Template type & defaults
├── components/
│   ├── SertifikatTemplate.tsx       # Template renderer
│   └── SertifikatPreview.tsx        # Preview with template
└── pages/
    └── CreateSertifikatNew.tsx      # Form with template selector

public/
├── certificate-background.webp      # Default template
├── certificate-modern.webp          # Modern template (optional)
└── certificate-classic.webp         # Classic template (optional)
```

## Template Definition

### CertificateTemplate Interface
```typescript
export interface CertificateTemplate {
  id: string;
  name: string;
  background_url: string;
  layout: "default" | "modern" | "classic" | "elegant";
  colors: {
    primary: string;
    secondary: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
```

### Default Templates
```typescript
export const DEFAULT_CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "default",
    name: "Template Default - Border Emas",
    background_url: "/certificate-background.webp",
    layout: "default",
    colors: {
      primary: "#1F2937", // gray-800
      secondary: "#4B5563", // gray-600
      text: "#374151", // gray-700
    },
    fonts: {
      heading: "serif",
      body: "sans-serif",
    },
    is_active: true,
  },
  // ... more templates
];
```

## Usage

### 1. Selecting Template in Form
```typescript
<Select
  value={formData.template_id}
  onValueChange={(value) =>
    setFormData({ ...formData, template_id: value })
  }
>
  <SelectContent>
    {DEFAULT_CERTIFICATE_TEMPLATES.filter((t) => t.is_active).map(
      (template) => (
        <SelectItem key={template.id} value={template.id}>
          {template.name}
        </SelectItem>
      )
    )}
  </SelectContent>
</Select>
```

### 2. Rendering with Template
```typescript
<SertifikatTemplate
  sertifikat={sertifikatData}
  templateId={templateId}
  showQR={true}
  penandatangan1={...}
/>
```

### 3. Template Loading
```typescript
useEffect(() => {
  if (templateId) {
    const foundTemplate = DEFAULT_CERTIFICATE_TEMPLATES.find(
      (t) => t.id === templateId
    );
    if (foundTemplate) {
      setTemplate(foundTemplate);
    }
  }
}, [templateId]);
```

### 4. Applying Template Styles
```typescript
<h1
  style={{
    color: template.colors.primary,
    fontFamily: template.fonts.heading,
  }}
>
  SERTIFIKAT
</h1>
```

## Adding New Templates

### Step 1: Add Background Image
```bash
# Copy background to public folder
cp /path/to/new-background.webp public/certificate-elegant.webp
```

### Step 2: Define Template
Edit `src/types/CertificateTemplate.ts`:

```typescript
{
  id: "elegant",
  name: "Template Elegant - Premium",
  background_url: "/certificate-elegant.webp",
  layout: "elegant",
  colors: {
    primary: "#7C3AED", // purple-600
    secondary: "#8B5CF6", // purple-500
    text: "#6D28D9", // purple-700
  },
  fonts: {
    heading: "serif",
    body: "serif",
  },
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
}
```

### Step 3: Test Template
1. Restart dev server
2. Buka "Buat Sertifikat"
3. Pilih template baru dari dropdown
4. Klik "Preview"
5. Verify background dan colors

## Template Properties

### Colors
```typescript
colors: {
  primary: "#1F2937",   // Main heading color
  secondary: "#4B5563", // Subheading color
  text: "#374151",      // Body text color
}
```

**Usage**:
- `primary`: Judul utama, nama peserta, nama acara
- `secondary`: Subtitle, nama universitas
- `text`: Body text, deskripsi

### Fonts
```typescript
fonts: {
  heading: "serif",     // Font for headings
  body: "sans-serif",   // Font for body text
}
```

**Options**:
- `serif`: Times New Roman, Georgia
- `sans-serif`: Arial, Helvetica
- `monospace`: Courier, Monaco
- Custom: "Poppins", "Roboto", etc.

### Layout
```typescript
layout: "default" | "modern" | "classic" | "elegant"
```

**Future**: Different layouts can have different positioning, spacing, etc.

## Database Integration (Future)

### Create Table
```sql
CREATE TABLE certificate_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  background_url TEXT NOT NULL,
  layout TEXT NOT NULL,
  colors JSONB NOT NULL,
  fonts JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Fetch from Database
```typescript
const { data: templates } = await supabase
  .from("certificate_templates")
  .select("*")
  .eq("is_active", true)
  .order("name");
```

### Admin Template Management
Create admin page to:
- Upload background images
- Configure colors and fonts
- Preview templates
- Activate/deactivate templates

## Best Practices

### 1. Background Images
- **Size**: 1920x1357 pixels (A4 landscape)
- **Format**: WebP for optimization
- **File size**: < 500KB
- **Quality**: 85-90%

### 2. Colors
- Use hex colors for consistency
- Ensure good contrast with background
- Test in both light and dark modes

### 3. Fonts
- Use web-safe fonts for reliability
- Test font rendering in PDF
- Consider font licensing

### 4. Template Naming
- Descriptive names: "Template Default - Border Emas"
- Include key feature: "Modern - Minimalis"
- User-friendly language

## Testing

### 1. Visual Testing
- [ ] Background loads correctly
- [ ] Colors applied to all elements
- [ ] Fonts render properly
- [ ] Layout looks good

### 2. Functional Testing
- [ ] Template selection works
- [ ] Preview shows correct template
- [ ] PDF generation uses template
- [ ] QR code visible

### 3. Cross-browser Testing
- [ ] Chrome/Chromium
- [ ] Firefox
- [ ] Safari
- [ ] Edge

## Troubleshooting

### Template not showing
1. Check template ID matches
2. Verify `is_active` is true
3. Check console for errors

### Background not loading
1. Verify file exists in `public/`
2. Check `background_url` path
3. Clear browser cache

### Colors not applied
1. Check color hex values
2. Verify inline styles applied
3. Check CSS specificity

## Future Enhancements

### 1. Layout Variations
Different layouts for different template types:
- Landscape vs Portrait
- Single vs Multiple signatures
- With/without logo

### 2. Custom Fonts
Support for custom font uploads:
- Google Fonts integration
- Font file uploads
- Font preview

### 3. Template Builder
Visual template builder for admin:
- Drag-and-drop elements
- Color picker
- Font selector
- Live preview

### 4. Template Categories
Organize templates by category:
- Academic (Ijazah, Diploma)
- Training (Pelatihan, Workshop)
- Achievement (Lomba, Penghargaan)

## Summary

✅ Multiple template support
✅ Customizable colors and fonts
✅ Template selection in form
✅ Preview with template
✅ Easy to add new templates
✅ Fallback to default template
✅ Production ready

Sistem template memberikan fleksibilitas untuk membuat berbagai jenis sertifikat dengan tampilan yang berbeda!
