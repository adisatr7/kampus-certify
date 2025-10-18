export interface CertificateSignature {
  id: string;
  certificate_id: string;
  key_id: string;
  payload_hash: string;
  signature: string;
  signed_at: string;
  signer_user_id?: string | null;
}
