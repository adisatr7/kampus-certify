import { CertificateStatus } from "./CertificateStatus";

export interface SigningKey {
  kid: string;
  kty: string;
  crv?: string | null;
  x?: string | null;
  n?: string | null;
  e?: string | null;
  active: boolean;
  created_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  assigned_to?: string | null;
  users?: {
    name: string;
    email: string;
    role: string;
  };
  status?: CertificateStatus;
}
