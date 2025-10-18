// hooks/useDashboardStats.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DashboardStats } from "../../types/DashboardStats";

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
        totalDocuments: 0,
        signedDocuments: 0,
        pendingDocuments: 0,
        totalUsers: 0,
        adminUsers: 0,
        staffUsers: 0,
        todayVerifications: 0,
        validVerifications: 0,
        invalidVerifications: 0,
      };

      try {
        // Fetch documents data
        const documentsQuery =
          userRole === "admin"
            ? supabase.from("documents").select("status, user_id")
            : supabase.from("documents").select("status, user_id").eq("user_id", user.id);

        const { data: documents } = await documentsQuery;

        if (documents) {
          stats.totalDocuments = documents.length;
          stats.signedDocuments = documents.filter((doc) => doc.status === "signed").length;
          stats.pendingDocuments = documents.filter((doc) => doc.status === "pending").length;
        }

        // Fetch users data (only for admin)
        if (userRole === "admin") {
          const { data: users } = await supabase.from("users").select("role");

          if (users) {
            stats.totalUsers = users.length;
            stats.adminUsers = users.filter((u) => u.role === "admin").length;
            stats.staffUsers = users.filter((u) => u.role !== "admin").length;
          }

          // Fetch today's audit trail for verifications
          const today = new Date().toISOString().split("T")[0];
          const { data: auditData } = await supabase
            .from("audit_trail")
            .select("action, description")
            .gte("created_at", `${today}T00:00:00.000Z`)
            .lt("created_at", `${today}T23:59:59.999Z`)
            .ilike("action", "%verification%");

          if (auditData) {
            stats.todayVerifications = auditData.length;
            stats.validVerifications = auditData.filter(
              (a) =>
                a.description?.toLowerCase().includes("valid") ||
                a.description?.toLowerCase().includes("berhasil"),
            ).length;
            stats.invalidVerifications = stats.todayVerifications - stats.validVerifications;
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
