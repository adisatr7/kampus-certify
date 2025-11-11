import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import type { DocumentStatus } from "@/types/DocumentStatus";
import { useToast } from "../useToast";

export default function useFetchDocumentsByUserId(
  userId: string,
  status?: DocumentStatus | DocumentStatus[],
  options?: { enabled?: boolean },
) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const enabled = options?.enabled !== undefined ? options.enabled : true;
  const [isLoading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    fetchData(userId, status);
  }, [userId, enabled]);

  const fetchData = async (userId: string, statusParam?: DocumentStatus | DocumentStatus[]) => {
    if (!userId || !enabled) {
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
            id,
            email,
            name,
            role,
            created_at,
            nidn
          ),
          document_signatures (
            key_id,
            signature,
            signed_at,
            signer_user_id,
            signer:users (
              id,
              email,
              name,
              role,
              created_at,
              nidn
            )
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
      setData((data as unknown as UserDocument[]) || []);
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
