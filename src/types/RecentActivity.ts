import { ActivityType } from "./ActivityType";
import { DocumentStatus } from "./DocumentStatus";

export interface RecentActivity {
  id: string;
  type: ActivityType;
  title: string;
  description: string;
  time: string;
  status: DocumentStatus | "valid";
  user_name?: string;
  created_at: string;
}
