import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import { useToast } from "../useToast";

export default function useFetchDocumentsById(userId: string) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const [isLoading, setLoading] = useState(true);

  useEffect(() => {
    fetchData(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchData = async (userId: string) => {
    if (!userId) {
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

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

  return { documents: data, isLoading, refetch: fetchData };
}
