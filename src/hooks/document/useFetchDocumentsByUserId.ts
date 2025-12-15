import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import type { DocumentStatus } from "@/types/DocumentStatus";
import { useToast } from "../useToast";

export default function useFetchDocumentsByUserId(
  userId: string,
  status?: DocumentStatus | DocumentStatus[],
  options?: { enabled?: boolean },
) {
  const { toast } = useToast();
  const [data, setData] = useState<UserDocument[]>([]);
  const enabled = options?.enabled !== undefined ? options.enabled : true;
  const [isLoading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    fetchData(userId, status);
  }, [userId, enabled]);

  const fetchData = async (userId: string, statusParam?: DocumentStatus | DocumentStatus[]) => {
    if (!userId || !enabled) {
      return;
    }

    const statuses = Array.isArray(statusParam) ? statusParam : statusParam ? [statusParam] : [];

    setLoading(true);
    try {
      let query = supabase
        .from("documents")
        .select(`
          *,
          user:users (
            id,
            email,
            name,
            role,
            created_at,
            nip,
            jabatan
          ),
          document_signatures (
            key_id,
            signature,
            signed_at,
            signer_user_id,
            signer:users (
              id,
              email,
              name,
              role,
              created_at,
              nip,
              jabatan
            )
          )
        `)
        .order("created_at", { ascending: false });

      // For ijazah documents in workflow, show to both dekan and rektor
      // Otherwise, only show documents owned by the user
      const { data: allDocs, error: queryError } = await query;

      if (queryError) {
        throw queryError;
      }

      if (!allDocs) {
        setData([]);
        return;
      }

      // Filter documents based on ownership and workflow
      const filteredDocs = allDocs.filter((doc: any) => {
        const metadata = doc.metadata as any;

        // For ijazah documents, check dekan_id and rektor_id from metadata
        if (doc.document_type === "ijazah") {
          // Show to dekan if they're the dekan_id
          if (metadata?.dekan_id === userId) {
            // If status filter includes "pending", only show if workflow_stage is "dekan_pending"
            if (statuses.includes("pending")) {
              return metadata?.workflow_stage === "dekan_pending";
            }
            // Otherwise show all ijazah documents owned by dekan
            return true;
          }
          // Show to rektor if they're the rektor_id and workflow is in progress or completed
          if (
            (metadata?.workflow_stage === "rektor_pending" ||
              metadata?.workflow_stage === "completed") &&
            metadata?.rektor_id === userId
          ) {
            // If status filter includes "pending", only show if workflow_stage is "rektor_pending"
            if (statuses.includes("pending")) {
              return metadata?.workflow_stage === "rektor_pending";
            }
            // Otherwise show all ijazah documents for rektor
            return true;
          }
        }

        // For sertifikat documents, check signer1_id and signer2_id from metadata
        if (doc.document_type === "sertifikat") {
          const isSigner1 = metadata?.signer1_id === userId;
          const isSigner2 = metadata?.signer2_id === userId;

          // If user is signer1
          if (isSigner1) {
            // If status filter includes "pending", only show if workflow_stage is "pending_signer1"
            if (statuses.includes("pending")) {
              return metadata?.workflow_stage === "pending_signer1";
            }
            // For signed status, show if signer1 has signed (completed or signer1_signed)
            if (statuses.includes("signed")) {
              return metadata?.signer1_signed === true || metadata?.workflow_stage === "completed";
            }
            // Otherwise show all sertifikat documents for signer1
            return true;
          }

          // If user is signer2
          if (isSigner2) {
            // If status filter includes "pending", only show if workflow_stage is "pending_signer2"
            if (statuses.includes("pending")) {
              return metadata?.workflow_stage === "pending_signer2";
            }
            // For signed status, show if workflow is completed
            if (statuses.includes("signed")) {
              return metadata?.workflow_stage === "completed";
            }
            // Otherwise show all sertifikat documents for signer2 (after signer1 signed)
            return (
              metadata?.workflow_stage === "pending_signer2" ||
              metadata?.workflow_stage === "completed"
            );
          }
        }

        // For other documents, show if user owns it
        if (doc.user_id === userId) {
          return true;
        }

        return false;
      });

      // Apply status filter if provided
      let finalDocs = filteredDocs;
      if (statuses && statuses.length > 0) {
        finalDocs = filteredDocs.filter((doc: any) => {
          if (statuses.length === 1) {
            return doc.status === statuses[0];
          } else {
            return statuses.includes(doc.status);
          }
        });
      }

      setData((finalDocs as unknown as UserDocument[]) || []);
    } catch (error) {
      toast({
        title: "Error",
        description: `Gagal memuat dokumen: ${error instanceof Error ? error.message : "Tidak diketahui"}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return { data, isLoading, refetch: () => fetchData(userId, status) };
}
