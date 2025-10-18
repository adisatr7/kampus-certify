export interface SigningKey {
  kid: string;
  kty: string;
  crv?: string | null;
  x?: string | null;
  n?: string | null;
  e?: string | null;
  active: boolean;
  created_at: string;
}
