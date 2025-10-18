export interface DocumentSignature {
  id: string;
  document_id: string;
  key_id: string;
  payload_hash: string;
  signature: string;
  signed_at: string;
  signer_user_id?: string | null;
}
