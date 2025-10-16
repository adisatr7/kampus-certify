export interface AuditTrail {
  id: string;
  user_id?: string | null;
  action: string;
  description?: string | null;
  created_at: string;
}
