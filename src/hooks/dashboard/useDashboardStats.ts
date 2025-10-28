// hooks/useDashboardStats.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "../../types/DashboardStats";

function getRecentData(createdAt: string): boolean {
  const createdDate = new Date(createdAt);
  const now = new Date();

  return (
    createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear()
  );
}

// Hook for fetching dashboard statistics
export const useDashboardStats = (userRole: string) => {
  return useQuery({
    queryKey: ["dashboard-stats", userRole],
    queryFn: async (): Promise<DashboardStats> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error("User not authenticated");
      }

      const stats: DashboardStats = {
        activeSigningKeys: 0,
        recentlyAddedKeys: 0,
        totalUsers: 0,
        recentlyAddedAdmins: 0,
        recentlyAddedStaff: 0,
        totalDocuments: 0,
        recentlyAddedDocuments: 0,
        signedDocuments: 0,
        unsignedDocuments: 0,
        pendingDocuments: 0,
      };

      try {
        // Fetch documents data
        const documentsQuery = supabase.from("documents").select("status, user_id, created_at");
        if (userRole !== "admin") {
          documentsQuery.eq("user_id", user.id);
        }

        const { data: documents } = await documentsQuery;

        if (documents) {
          stats.totalDocuments = documents.length;
          stats.recentlyAddedDocuments = documents.filter((doc) =>
            getRecentData(doc.created_at),
          ).length;
          stats.signedDocuments = documents.filter((doc) => doc.status === "signed").length;
          stats.unsignedDocuments = documents.filter((doc) => doc.status !== "signed").length;
          stats.pendingDocuments = documents.filter((doc) => doc.status === "pending").length;
        }

        // Fetch total active signing keys
        const { data: activeSigningKeys } = await supabase
          .from("signing_keys")
          .select("kid, created_at")
          .eq("active", true);

        if (Array.isArray(activeSigningKeys)) {
          stats.activeSigningKeys = activeSigningKeys.length;
          stats.recentlyAddedKeys = activeSigningKeys.filter((key) =>
            getRecentData(key.created_at),
          ).length;
        }

        // Fetch users data (only for admin)
        if (userRole === "admin") {
          const { data: users } = await supabase.from("users").select("role, created_at");

          if (users) {
            stats.totalUsers = users.length;
            stats.recentlyAddedAdmins = users.filter(
              (u) => u.role === "admin" && getRecentData(u.created_at),
            ).length;
            stats.recentlyAddedStaff = users.filter(
              (u) => u.role !== "admin" && getRecentData(u.created_at),
            ).length;
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
      }

      return stats;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });
};
