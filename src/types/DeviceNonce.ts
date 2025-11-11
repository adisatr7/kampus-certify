export interface DeviceNonce {
  id: string;
  user_id: string;
  device_id: string;
  nonce: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}
