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
      const { data: rows, error } = await supabase
        .from("signing_keys")
        .select(`
          kid,
          kty,
          crv,
          x,
          created_at,
          expires_at,
          revoked_at,
          assigned_to
        `)
        .eq("assigned_to", userIdParam)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rowsArr = rows || [];
      const keys: SigningKey[] = rowsArr.map((r) => ({
        kid: r.kid,
        kty: r.kty,
        crv: r.crv,
        x: r.x,
        created_at: r.created_at,
        expires_at: r.expires_at,
        revoked_at: r.revoked_at,
        assigned_to: r.assigned_to,
        status: getStatus(r),
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
