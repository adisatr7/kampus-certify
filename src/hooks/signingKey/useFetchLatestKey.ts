import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function useFetchLatestKey(userId: string) {
  const [latestKey, setLatestKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestKey(userId);
  }, [userId]);

  const fetchLatestKey = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("signing_keys")
        .select("kid")
        .eq("assigned_to", userId)
        .eq("revoked_at", null)
        .eq("deleted_at", null)
        .eq("expires_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      setLatestKey(data?.[0]?.kid || null);
    } catch (error) {
      console.error("Error fetching latest signing key:", error);
    }
  };

  return { latestKey, refetch: fetchLatestKey };
}
