import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export default function useFetchLatestKey() {
  const [latestKey, setLatestKey] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestKey();
  }, []);

  const fetchLatestKey = async () => {
    try {
      const { data, error } = await supabase
        .from("signing_keys")
        .select("kid")
        .order("created_at", { ascending: false })
        .limit(1);

      if (error) {
        throw error;
      }

      setLatestKey(data[0]?.kid || null);
    } catch (error) {
      console.error("Error fetching latest signing key:", error);
    }
  };

  return { latestKey, refetch: fetchLatestKey };
}
