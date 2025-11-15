import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "../useToast";
import { UserRole } from "@/types";

interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  nidn?: string;
  jabatan?: string;
}

export function useCreateUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const { data: result, error } = await supabase
        .from("users")
        .insert({
          email: data.email,
          name: data.name,
          role: data.role,
          nidn: data.nidn || null,
          jabatan: data.jabatan || null,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({
        title: "Berhasil",
        description: "Pengguna berhasil ditambahkan",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: `Gagal menambahkan pengguna: ${error.message}`,
        variant: "destructive",
      });
    },
  });
}
