export interface IjazahTemplate {
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

// Note: Templates are now fetched from the database via /admin/templates
// Use useFetchDocumentTemplates("ijazah") hook to get available templates

// Jenjang options for ijazah
export const JENJANG_OPTIONS = [
  { value: "D3", label: "Diploma 3 (D3)" },
  { value: "S1", label: "Sarjana (S1)" },
  { value: "S2", label: "Magister (S2)" },
  { value: "S3", label: "Doktor (S3)" },
];