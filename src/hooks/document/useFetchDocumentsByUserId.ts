import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import type { DocumentStatus } from "@/types/DocumentStatus";
import { useToast } from "../useToast";

export default function useFetchDocumentsByUserId(userId: string, status?: DocumentStatus) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(userId, status);
  }, [userId, status]);

  const fetchData = async (userId: string, statusParam?: DocumentStatus) => {
    if (!userId) {
      return;
    }
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

      if (statusParam) {
        query = query.eq("status", statusParam);
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
