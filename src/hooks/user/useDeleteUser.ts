import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../useToast";

export function useDeleteUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.from("users").delete().eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Pengguna berhasil dihapus",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Gagal menghapus pengguna: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}
