import { CertificateStatus } from "./CertificateStatus";
import { User } from "./User";

export interface SigningKey {
  kid: string;
  kty?: string;
  crv?: string | null;
  x?: string | null;
  n?: string | null;
  e?: string | null;
  created_at: string;
  expires_at?: string | null;
  revoked_at?: string | null;
  assigned_to?: string | null;
  assigned_to_user?: User;
  status?: CertificateStatus;
}
