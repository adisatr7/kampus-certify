import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";
import { useToast } from "../useToast";

export default function useFetchAllUsers() {
  const [data, setData] = useState<User[]>([]);
  const [isLoading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role")
        .order("name");

      if (error) {
        throw error;
      }
      setData((data as User[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat daftar pengguna: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, refetch: fetchData };
}
