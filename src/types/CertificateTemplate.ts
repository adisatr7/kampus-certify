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

export const DEFAULT_CERTIFICATE_TEMPLATES: CertificateTemplate[] = [
  {
    id: "default",
    name: "Template Default - Border Emas",
    background_url: "/certificate-background.webp",
    layout: "default",
    colors: {
      primary: "#B8860B", // darkgoldenrod - untuk judul
      secondary: "#6B7280", // gray-500 - untuk subtitle
      text: "#4B5563", // gray-600 - untuk body text
    },
    fonts: {
      heading: "serif",
      body: "serif",
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "modern",
    name: "Template Modern - Minimalis",
    background_url: "/certificate-background.webp", // Using same background for now
    layout: "modern",
    colors: {
      primary: "#2563EB", // blue-600
      secondary: "#3B82F6", // blue-500
      text: "#1E40AF", // blue-800
    },
    fonts: {
      heading: "sans-serif",
      body: "sans-serif",
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "classic",
    name: "Template Klasik - Formal",
    background_url: "/certificate-background.webp", // Using same background for now
    layout: "classic",
    colors: {
      primary: "#7C2D12", // brown-900
      secondary: "#92400E", // brown-800
      text: "#451A03", // brown-950
    },
    fonts: {
      heading: "serif",
      body: "serif",
    },
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
