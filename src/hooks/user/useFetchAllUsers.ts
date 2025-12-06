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
      console.log("🔍 Fetching all users...");
      
      const { data, error } = await supabase
        .from("users")
        .select("id, name, email, role, nip, jabatan, created_at, updated_at")
        .order("name");

      console.log("👥 Users fetched:", data);
      console.log("❌ Error (if any):", error);

      if (error) {
        throw error;
      }
      
      setData((data as User[]) || []);
      console.log("✅ Users set to state:", data?.length, "users");
    } catch (error) {
      console.error("❌ Error fetching users:", error);
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
