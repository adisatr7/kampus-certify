import { CheckCircle, AlertCircle, QrCode } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
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
import { useAuth } from "@/lib/auth";
import { UserDocument, Ijazah, Sertifikat } from "@/types";

export default function DocumentSigningFlow() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<UserDocument | null>(null);
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [showQrInput, setShowQrInput] = useState(false);
  const [qrValue, setQrValue] = useState("");

  useEffect(() => {
    const fetchDocument = async () => {
      if (!documentId) return;

      const { data: doc } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();

      if (doc) {
        setDocument(doc as unknown as UserDocument);

        // Fetch additional data based on document type
        if (doc.title?.toLowerCase().includes("ijazah")) {
          const { data: ijazah } = await supabase
            .from("ijazah")
            .select("*")
            .eq("document_id", doc.id)
            .maybeSingle();
          setIjazahData(ijazah as Ijazah | null);
        } else if (doc.title?.toLowerCase().includes("sertifikat")) {
          const { data: sertifikat } = await supabase
            .from("sertifikat")
            .select("*")
            .eq("document_id", doc.id)
            .maybeSingle();
          setSertifikatData(sertifikat as Sertifikat | null);
        }
      }
    };

    fetchDocument();
  }, [documentId]);

  const handleSign = async () => {
    if (!document || !userProfile) return;

    setLoading(true);
    try {
      const metadata = (document.metadata as any) || {};
      const workflowStage = metadata.workflow_stage;

      // Update document status to signed
      const { error: updateError } = await supabase
        .from("documents")
        .update({
          status: "signed",
          metadata: {
            ...metadata,
            workflow_stage: getNextStage(workflowStage),
            [`${getCurrentSignerPosition(workflowStage)}_signed_at`]:
              new Date().toISOString(),
          },
        })
        .eq("id", document.id);

      if (updateError) throw updateError;

      // Log workflow progression for audit trail
      if (
        document.title?.toLowerCase().includes("ijazah") &&
        workflowStage === "dekan_pending"
      ) {
        // Document will be sent to rektor in next stage
        await supabase.rpc("create_audit_entry", {
          p_user_id: userProfile.id,
          p_action: "SIGN_DOCUMENT",
          p_description: `Dekan menandatangani ijazah untuk ${document.recipient_name}`,
        });
      }

      if (
        document.title?.toLowerCase().includes("sertifikat") &&
        workflowStage === "pending_signer1"
      ) {
        // Document will be sent to signer2 in next stage
        await supabase.rpc("create_audit_entry", {
          p_user_id: userProfile.id,
          p_action: "SIGN_DOCUMENT",
          p_description: `Penandatangan 1 menandatangani sertifikat untuk ${document.recipient_name}`,
        });
      }

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil ditandatangani",
      });

      navigate("/user/documents");
    } catch (error) {
      console.error("Error signing document:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error
            ? error.message
            : "Gagal menandatangani dokumen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getNextStage = (currentStage: string): string => {
    switch (currentStage) {
      case "dekan_pending":
        return "rektor_pending";
      case "rektor_pending":
        return "completed";
      case "pending_signer1":
        return "pending_signer2";
      case "pending_signer2":
        return "completed";
      default:
        return "completed";
    }
  };

  const getCurrentSignerPosition = (stage: string): string => {
    if (stage === "dekan_pending" || stage === "pending_signer1")
      return "signer1";
    if (stage === "rektor_pending" || stage === "pending_signer2")
      return "signer2";
    return "signer1";
  };

  if (!document) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Memuat dokumen...
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const isIjazah = document.title?.toLowerCase().includes("ijazah");
  const isSertifikat = document.title?.toLowerCase().includes("sertifikat");
  const metadata = (document.metadata as any) || {};

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Tanda Tangani Dokumen</CardTitle>
            <CardDescription>{document.title}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Document Preview */}
            <div className="bg-slate-50 dark:bg-slate-900/30 p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">Ringkasan Dokumen</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Jenis Dokumen:</span>
                  <span className="font-medium capitalize">
                    {isIjazah
                      ? "Ijazah"
                      : isSertifikat
                      ? "Sertifikat"
                      : "Surat"}
                  </span>
                </div>

                {isIjazah && ijazahData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Nama Mahasiswa:
                      </span>
                      <span className="font-medium">
                        {ijazahData.nama_mahasiswa}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">NIM:</span>
                      <span className="font-medium">{ijazahData.nim}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Program Studi:
                      </span>
                      <span className="font-medium">
                        {ijazahData.nama_fakultas}
                      </span>
                    </div>
                  </>
                )}

                {isSertifikat && sertifikatData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Nama Peserta:
                      </span>
                      <span className="font-medium">
                        {sertifikatData.nama_peserta}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Nama Kegiatan:
                      </span>
                      <span className="font-medium">
                        {sertifikatData.nama_acara}
                      </span>
                    </div>
                  </>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="font-medium capitalize">
                    {document.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Signing Instructions */}
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
              <div className="flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-semibold mb-2">
                    Instruksi Penandatanganan:
                  </p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Periksa data dokumen dengan teliti</li>
                    <li>Klik tombol "Tanda Tangani" untuk menandatangani</li>
                    <li>
                      Scan QR code yang muncul dengan perangkat penandatangan
                    </li>
                    <li>
                      Dokumen akan dikirim ke penandatangan berikutnya (jika
                      ada)
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            {showQrInput && (
              <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
                <div className="flex gap-3">
                  <QrCode className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
                      Scan QR Code Penandatangan
                    </p>
                    <input
                      type="text"
                      placeholder="Arahkan kamera ke QR code..."
                      value={qrValue}
                      onChange={(e) => setQrValue(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      autoFocus
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/user/documents")}
              >
                Batal
              </Button>
              <Button
                onClick={handleSign}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                {loading ? "Menandatangani..." : "Tanda Tangani Dokumen"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
