import { AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";

interface PendingDocumentsProps {
  userId: string;
}

export function PendingDocuments({ userId }: PendingDocumentsProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPendingDocuments = async () => {
      try {
        // Fetch documents where user is involved in workflow
        const { data: docs } = await supabase
          .from("documents")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (docs) {
          // Filter documents where current user is involved and needs to sign
          const filteredDocs = docs.filter((doc: any) => {
            const metadata = doc.metadata || {};

            // For ijazah documents, check workflow_stage
            if (doc.document_type === "ijazah") {
              // Show to dekan only if workflow_stage is "dekan_pending"
              if (
                metadata.dekan_id === userId &&
                metadata.workflow_stage === "dekan_pending"
              ) {
                return true;
              }
              // Show to rektor only if workflow_stage is "rektor_pending"
              if (
                metadata.rektor_id === userId &&
                metadata.workflow_stage === "rektor_pending"
              ) {
                return true;
              }
              return false;
            }

            // For other documents, check if user is involved
            return (
              doc.user_id === userId ||
              metadata.signer1_id === userId ||
              metadata.signer2_id === userId ||
              metadata.rektor_id === userId
            );
          });
          setDocuments(filteredDocs as unknown as UserDocument[]);
        }
      } catch (error) {
        console.error("Error fetching pending documents:", error);
        toast({
          title: "Error",
          description: "Gagal memuat dokumen yang menunggu",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchPendingDocuments();
  }, [userId, toast]);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">Memuat dokumen...</p>
        </CardContent>
      </Card>
    );
  }

  if (documents.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
            <p className="text-muted-foreground">
              Tidak ada dokumen yang menunggu
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Dokumen Menunggu Tanda Tangan
        </CardTitle>
        <CardDescription>
          {documents.length} dokumen menunggu tanda tangan Anda
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
            >
              <div className="flex-1">
                <p className="font-medium">{doc.title}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.recipient_name && `Penerima: ${doc.recipient_name}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Dibuat: {new Date(doc.created_at).toLocaleDateString("id-ID")}
                </p>
              </div>
              <Button
                onClick={() => navigate(`/documents/${doc.id}/sign`)}
                size="sm"
                className="ml-4"
              >
                Tanda Tangani
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
