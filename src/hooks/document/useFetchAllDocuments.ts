import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import type { DocumentStatus } from "@/types/DocumentStatus";
import { useToast } from "../useToast";

export default function useFetchAllDocuments({
  enabled = true,
  status,
}: {
  enabled?: boolean;
  status?: DocumentStatus | DocumentStatus[];
} = {}) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const [isLoading, setLoading] = useState<boolean>(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    fetchData(status);
  }, [enabled]);

  const fetchData = async (statusParam?: DocumentStatus | DocumentStatus[]) => {
    if (!enabled) {
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
            email,
            role
          )
        `)
        .order("created_at", { ascending: false });

      if (statuses && statuses.length > 0) {
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
      setData((data as unknown as UserDocument[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat daftar dokumen: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, refetch: () => fetchData(status) };
}
