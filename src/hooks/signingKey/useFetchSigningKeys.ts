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
    if (!userIdParam) {
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();

      // If the user is an admin, fetch all keys; otherwise fetch only keys
      // assigned to the given user ID.
      let isAdmin = false;
      try {
        const { data: userRow, error: userErr } = await supabase
          .from("users")
          .select("role")
          .eq("id", userIdParam)
          .maybeSingle();

        if (userErr) {
          throw userErr;
        }
        // userRow can be null if the user doesn't exist; treat as non-admin
        const userRowTyped = userRow as { role?: string } | null;
        isAdmin = userRowTyped?.role === "admin";
      } catch (e) {
        // If we fail to fetch the user role for any reason, default to
        // non-admin behavior (safer) but log a warning to aid debugging.
        console.warn("Failed to fetch user role for signing keys query:", e);
        isAdmin = false;
      }

      // Build base query
      const baseQuery = supabase
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
        .is("deleted_at", null)
        .is("revoked_at", null)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false });

      const result = !isAdmin ? await baseQuery.eq("assigned_to", userIdParam) : await baseQuery;
      const { data: rows, error } = result;

      if (error) {
        throw error;
      }

      const rowsArr = (rows || []) as unknown[];
      const keys: SigningKey[] = rowsArr.map((row) => {
        const k = row as Record<string, unknown>;
        const key: SigningKey = {
          kid: (k.kid as string) || "",
          kty: (k.kty as string) || undefined,
          crv: (k.crv as string) ?? null,
          x: (k.x as string) ?? null,
          created_at: (k.created_at as string) || new Date().toISOString(),
          expires_at: (k.expires_at as string) ?? null,
          revoked_at: (k.revoked_at as string) ?? null,
          assigned_to: (k.assigned_to as string) ?? null,
        };
        key.status = getStatus(key);
        return key;
      });

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
