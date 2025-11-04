import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import { useToast } from "../useToast";

export default function useFetchAllDocuments({ enabled = true }: { enabled?: boolean } = {}) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const [isLoading, setLoading] = useState<boolean>(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    fetchData();
  }, [enabled]);

  const fetchData = async () => {
    if (!enabled) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
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

      if (error) {
        throw error;
      }
      setData((data as UserDocument[]) || []);
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

  return { data, isLoading, refetch: fetchData };
}
