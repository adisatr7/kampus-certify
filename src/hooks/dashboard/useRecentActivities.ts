// hooks/useRecentActivities.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ActivityType, DocumentStatus } from "../../types";
import { RecentActivity } from "../../types/RecentActivity";

// Hook for fetching recent activities (admin only)
export const useRecentActivities = (userRole?: string) => {
  return useQuery({
    queryKey: ["recent-activities", userRole],
    queryFn: async (): Promise<RecentActivity[]> => {
      if (userRole !== "admin") {
        return [];
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Fetch recent audit trail entries
      const { data: auditData, error } = await supabase
        .from("audit_trail")
        .select(`
          id,
          action,
          description,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching activities:", error);
        return [];
      }

      // Get user IDs from audit data
      const userIds = [...new Set(auditData?.map((item) => item.user_id).filter(Boolean) || [])];

      // Fetch user data separately
      const { data: userData } = await supabase.from("users").select("id, name").in("id", userIds);

      const userMap = new Map(userData?.map((user) => [user.id, user]) || []);

      // Transform audit data to activity format
      const activities: RecentActivity[] = (auditData || []).map((item) => {
        const activity = item;
        const title = activity.action || "Unknown Action";
        const description = activity.description || "";
        let type: ActivityType = "verification";
        let status: DocumentStatus | "valid" = "valid";

        // Determine activity type and status based on action
        if (activity.action?.toLowerCase().includes("document")) {
          type = "document";
          if (activity.action?.toLowerCase().includes("sign")) {
            status = "signed";
          }
        } else if (activity.action?.toLowerCase().includes("verification")) {
          type = "verification";
          status = description.toLowerCase().includes("invalid") ? "revoked" : "valid";
        }

        // Calculate time ago
        const createdAt = new Date(activity.created_at);
        const now = new Date();
        const diffInMs = now.getTime() - createdAt.getTime();
        const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
        const diffInDays = Math.floor(diffInHours / 24);

        let timeAgo: string;
        if (diffInDays > 0) {
          timeAgo = `${diffInDays} hari yang lalu`;
        } else if (diffInHours > 0) {
          timeAgo = `${diffInHours} jam yang lalu`;
        } else {
          const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
          timeAgo = diffInMinutes > 0 ? `${diffInMinutes} menit yang lalu` : "Baru saja";
        }

        const user = userMap.get(activity.user_id);

        return {
          id: activity.id,
          type,
          title,
          description,
          time: timeAgo,
          status,
          user_name: user?.name,
          created_at: activity.created_at,
        };
      });

      return activities;
    },
    enabled: userRole === "admin",
    refetchInterval: 60000, // Refresh every minute
  });
};
