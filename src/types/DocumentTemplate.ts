import { DocumentType } from "./DocumentType";

export interface DocumentTemplate {
  id: string;
  name: string;
  type: DocumentType;
  html_content: string;
  css_content?: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}
