import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../useToast";

export function useDeleteUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (userId: string) => {
      try {
        // Call Edge Function to delete user (bypasses RLS)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({ id: userId }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Gagal menghapus pengguna");
        }

        return await response.json();
      } catch (error) {
        throw error;
      }
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
