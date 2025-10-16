import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Certificate } from "@/types";
import { useToast } from "../useToast";

export default function useFetchCertificatesById(userId: string) {
  const { toast } = useToast();
  const [data, setData] = useState<Certificate[]>([]);
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
        .from("certificates")
        .select("id, serial_number, status, expires_at")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }
      setData((data as Certificate[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat sertifikat: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { certificates: data, isLoading, refetch: fetchData };
}
