import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../useToast";
import { UserRole } from "@/types";

interface UpdateUserData {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nidn?: string;
  jabatan?: string;
}

export function useUpdateUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...data }: UpdateUserData) => {
      const { data: result, error } = await supabase
        .from("users")
        .update({
          email: data.email,
          name: data.name,
          role: data.role,
          nidn: data.nidn || null,
          jabatan: data.jabatan || null,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return result;
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
