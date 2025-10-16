import { CertificateStatus } from "./CertificateStatus";

export interface Certificate {
  id: string;
  user_id: string;
  serial_number: string;
  issued_at: string;
  expires_at: string;
  status: CertificateStatus;
  revoked_at?: string | null;
  created_at: string;
  updated_at: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  payload?: Record<string, any> | null;
  approved_by?: string | null;
  approved_at?: string | null;
  rejected_by?: string | null;
  rejected_at?: string | null;
  revoked_by?: string | null;
}
