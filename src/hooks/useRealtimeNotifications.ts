import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "./useToast";

interface PendingDocument {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
}

export function useRealtimeNotifications() {
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupRealtimeSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Initial fetch of pending documents
      const fetchPendingDocuments = async () => {
        const { data, error } = await supabase
          .from("documents")
          .select("id, title, document_type, created_at")
          .eq("user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (!error && data) {
          setPendingDocuments(data);
          setPendingCount(data.length);
        }
      };

      await fetchPendingDocuments();

      // Setup realtime subscription
      channel = supabase
        .channel("document-changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "documents",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newDoc = payload.new as any;
            if (newDoc.status === "pending") {
              toast({
                title: "Dokumen Baru Perlu Ditandatangani",
                description: `${newDoc.title} menunggu tanda tangan Anda`,
                duration: 5000,
              });
              fetchPendingDocuments();
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "documents",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const updatedDoc = payload.new as any;
            if (updatedDoc.status === "pending") {
              toast({
                title: "Dokumen Memerlukan Tanda Tangan",
                description: `${updatedDoc.title} telah diteruskan kepada Anda`,
                duration: 5000,
              });
              fetchPendingDocuments();
            } else if (updatedDoc.status === "signed") {
              fetchPendingDocuments();
            }
          },
        )
        .subscribe();
    };

    setupRealtimeSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [toast]);

  return {
    pendingCount,
    pendingDocuments,
  };
}
