import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UserRole } from "@/types";
import { useToast } from "../useToast";

interface CreateUserData {
  email: string;
  name: string;
  role: UserRole;
  nip?: string;
  jabatan?: string;
}

export function useCreateUser() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      try {
        // Call Edge Function to create user (bypasses RLS)
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
            },
            body: JSON.stringify({
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
          throw new Error(error.message || "Gagal membuat pengguna");
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
