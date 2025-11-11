// hooks/useRecentDocuments.ts
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentStatus, UserDocument } from "../../types";

// Hook for fetching recent documents (non-admin users)
export const useRecentDocuments = (userRole: string) => {
  return useQuery({
    queryKey: ["recent-documents", userRole],
    queryFn: async (): Promise<UserDocument[]> => {
      if (userRole === "admin") {
        return [];
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      const { data: documents, error } = await supabase
        .from("documents")
        .select("id, title, user_id, status, created_at, updated_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (error) {
        console.error("Error fetching recent documents:", error);
        return [];
      }

      return (
        documents?.map((doc) => ({
          id: doc.id,
          title: doc.title,
          user_id: doc.user_id,
          status: doc.status as DocumentStatus,
          created_at: doc.created_at,
          updated_at: doc.updated_at,
        })) || []
      );
    },
    enabled: userRole !== "admin",
    refetchInterval: 60000,
  });
};
