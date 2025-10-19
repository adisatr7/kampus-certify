import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import type { DocumentStatus } from "@/types/DocumentStatus";
import { useToast } from "../useToast";

export default function useFetchDocumentsByUserId(
  userId: string,
  status?: DocumentStatus | DocumentStatus[],
) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(userId, status);
  }, [userId]);

  const fetchData = async (userId: string, statusParam?: DocumentStatus | DocumentStatus[]) => {
    if (!userId) {
      return;
    }

    const statuses = Array.isArray(statusParam) ? statusParam : statusParam ? [statusParam] : [];

    setLoading(true);
    try {
      let query = supabase
        .from("documents")
        .select(`
          *,
          user:users (
            name,
            role
          )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (statuses && statuses.length > 0) {
        // Use .in() when multiple statuses provided, .eq() for a single value
        if (statuses.length === 1) {
          query = query.eq("status", statuses[0]);
        } else {
          query = query.in("status", statuses as DocumentStatus[]);
        }
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }
      setData((data as UserDocument[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat dokumen: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, refetch: () => fetchData(userId, status) };
}
