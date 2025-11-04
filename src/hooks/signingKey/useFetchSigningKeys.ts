import { useEffect, useState } from "react";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import type { SigningKey } from "@/types/SigningKey";

export default function useFetchSigningKeys(userId: string) {
  const { toast } = useToast();
  const [data, setData] = useState<SigningKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData(userId);
  }, [userId]);

  const getStatus = (key: SigningKey) => {
    if (key.revoked_at) {
      return "revoked" as const;
    }
    if (key.expires_at && new Date(key.expires_at) < new Date()) {
      return "expired" as const;
    }
    return "active" as const;
  };

  const fetchData = async (userIdParam: string) => {
    if (!userIdParam) return;

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const { data: rows, error } = await supabase
        .from("signing_keys")
        .select(`
          kid,
          kty,
          crv,
          x,
          created_at,
          expires_at,
          assigned_to
        `)
        .eq("assigned_to", userIdParam)
        .is("deleted_at", null)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rowsArr = rows || [];
      const keys: SigningKey[] = rowsArr.map((key) => ({
        ...key,
        status: getStatus(key),
      }));

      setData(keys);
    } catch (error) {
      console.error("Error fetching signing keys:", error);
      toast({
        title: "Error",
        description: `Gagal memuat signing keys: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, refetch: () => fetchData(userId) };
}
