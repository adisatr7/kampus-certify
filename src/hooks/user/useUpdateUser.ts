import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { useToast } from "../useToast";

interface UpdateUserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nip?: string;
  jabatan?: string;
}

export function useUpdateUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateUserData) => {
      try {
        // Call Edge Function to update user (bypasses RLS)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
              id,
              email: data.email,
              name: data.name,
              role: data.role,
              nip: data.nip || null,
              jabatan: data.jabatan || null,
            }),
          }
        );

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || "Gagal memperbarui pengguna");
        }

        const result = await response.json();
        return result;
      } catch (error) {
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Data pengguna berhasil diperbarui",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Gagal memperbarui pengguna: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}
