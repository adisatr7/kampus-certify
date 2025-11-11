import { UserRole } from "./UserRole";

export interface User {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  created_at: string;
  updated_at?: string;
  nidn?: string | null;
}
