export interface UserDevice {
  id: string;
  user_id: string;
  device_name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public_key_jwk: Record<string, any>;
  revoked: boolean;
  created_at: string;
}
