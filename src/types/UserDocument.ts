import { DocumentStatus } from "./DocumentStatus";
import { User } from "./User";

export interface UserDocument {
  id: string;
  user_id: string;
  title: string;
  file_url?: string | null;
  qr_code_url?: string | null;
  status: DocumentStatus;
  certificate_id?: string | null;
  created_at: string;
  updated_at: string;
  content?: string | null;
  user?: User;
  document_signatures?: {
    key_id: string;
  }[];
}
