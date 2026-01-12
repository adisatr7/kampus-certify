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
            role,
            nip,
            jabatan
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

  // Convert status to JSON string to avoid object reference issues in dependency array
  const statusString = JSON.stringify(status);

  useEffect(() => {
    if (!enabled) {
      setData([]);
      return;
    }
    fetchData(status);
  }, [enabled, statusString]); // Include statusString so it re-fetches when status changes

  return { data, isLoading, refetch: () => fetchData(status) };
}
