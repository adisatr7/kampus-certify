import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DocumentTemplate, DocumentType } from "@/types";

export default function useFetchDocumentTemplates(type?: DocumentType) {
  return useQuery({
    queryKey: ["document-templates", type],
    queryFn: async (): Promise<DocumentTemplate[]> => {
      try {
        let query = supabase
          .from("document_templates")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (type) {
          query = query.eq("type", type);
        }

        const { data, error } = await query;

        if (error) {
          // If table doesn't exist or other error, return empty array instead of throwing
          console.warn("Error fetching document templates:", error.message);
          return [];
        }

        return data || [];
      } catch (err) {
        // Catch any unexpected errors and return empty array
        console.warn("Unexpected error fetching document templates:", err);
        return [];
      }
    },
    // Don't retry on error - table might not exist
    retry: false,
    // Return empty array as placeholder while loading
    placeholderData: [],
  });
}