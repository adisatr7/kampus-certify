import { CheckCircle, AlertCircle, QrCode, FileText } from "lucide-react";
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
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { UserDocument, Ijazah, Sertifikat } from "@/types";
import { generateSignedPDFWithPuppeteer } from "@/lib/puppeteerPdfSigner";

export default function DocumentSigningFlow() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [document, setDocument] = useState<UserDocument | null>(null);
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [qrValue, setQrValue] = useState("");
  const [testingPuppeteer, setTestingPuppeteer] = useState(false);

  const handleTestPuppeteer = async () => {
    if (!document) return;

    setTestingPuppeteer(true);
    try {
      console.log("Testing Puppeteer PDF generation...");
      const pdfBlob = await generateSignedPDFWithPuppeteer(document);

      // Download the PDF
      const url = URL.createObjectURL(pdfBlob);
      const link = globalThis.document.createElement("a");
      link.href = url;
      link.download = `${document.title}_puppeteer_test.pdf`;
      globalThis.document.body.appendChild(link);
      link.click();
      globalThis.document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Berhasil",
        description: "PDF berhasil di-generate dengan Puppeteer dan didownload",
        variant: "default",
      });
    } catch (error) {
      console.error("Puppeteer PDF generation error:", error);
      toast({
        title: "Error",
        description: `Gagal generate PDF dengan Puppeteer: ${
          error instanceof Error ? error.message : String(error)
        }`,
        variant: "destructive",
      });
    } finally {
      setTestingPuppeteer(false);
    }
  };

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
      // Validate QR code input
      if (!qrValue.trim()) {
        toast({
          title: "Error",
          description: "Silakan masukkan QR code terlebih dahulu",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const metadata = (document.metadata as any) || {};
      const workflowStage = metadata.workflow_stage;

      // Validate document type data exists
      const isIjazahDoc = document.title?.toLowerCase().includes("ijazah");
      const isSertifikatDoc = document.title
        ?.toLowerCase()
        .includes("sertifikat");

      if (isIjazahDoc && !ijazahData) {
        throw new Error(
          "Data ijazah tidak ditemukan. Silakan buat ulang dokumen."
        );
      }

      if (isSertifikatDoc && !sertifikatData) {
        throw new Error(
          "Data sertifikat tidak ditemukan. Silakan buat ulang dokumen."
        );
      }

      // For ijazah workflow
      const isIjazahWorkflow = document.title?.toLowerCase().includes("ijazah");
      const isDekanSigning = workflowStage === "dekan_pending";
      const isRektorSigning = workflowStage === "rektor_pending";

      console.log("=== Signing Document ===");
      console.log("Document ID:", document.id);
      console.log(
        "Document Type:",
        isIjazahWorkflow ? "Ijazah" : isSertifikatDoc ? "Sertifikat" : "Other"
      );
      console.log("Workflow Stage:", workflowStage);
      console.log("QR Value:", qrValue);

      // Call edge function to sign document
      // The edge function will handle:
      // 1. Creating the cryptographic signature
      // 2. Updating document status
      // 3. Generating and uploading the signed PDF
      // 4. Updating file_url in the database
      const { data: signResult, error: signError } =
        await supabase.functions.invoke("sign-document", {
          body: {
            documentId: document.id,
            signerUserId: userProfile.id,
            passphrase: qrValue, // Using QR code as passphrase
          },
        });

      if (signError) {
        console.error("Edge function error:", signError);
        throw new Error(signError.message || "Failed to sign document");
      }

      if (!signResult?.ok) {
        throw new Error(signResult?.error || "Failed to sign document");
      }

      console.log("=== Sign Result ===");
      console.log("Signature created:", signResult.signature);
      console.log("PDF generated:", signResult.pdfGenerated);
      console.log("File URL:", signResult.fileUrl);

      // Show warning if PDF generation failed but signing succeeded
      if (!signResult.pdfGenerated) {
        toast({
          title: "Peringatan",
          description:
            "Dokumen berhasil ditandatangani, tetapi PDF gagal di-generate. " +
            "Silakan hubungi admin untuk regenerate PDF.",
          variant: "default",
        });
      }

      // The edge function already handles all the database updates
      // including QR code storage and workflow stage transitions

      // Create audit entry for signing
      if (userProfile?.id) {
        await createAuditEntry(
          userProfile.id,
          "SIGN_DOCUMENT",
          `Menandatangani dokumen "${document.title}"`
        );
      }

      // Show appropriate success message based on workflow stage
      if (isIjazahWorkflow && isDekanSigning) {
        toast({
          title: "Berhasil",
          description: "Ijazah berhasil ditandatangani dan dikirim ke Rektor",
        });
      } else if (isIjazahWorkflow && isRektorSigning) {
        toast({
          title: "Berhasil",
          description:
            "Ijazah berhasil ditandatangani" +
            (signResult.pdfGenerated ? " dan PDF telah di-generate" : ""),
        });
      } else {
        toast({
          title: "Berhasil",
          description:
            "Dokumen berhasil ditandatangani" +
            (signResult.pdfGenerated ? " dan PDF telah di-generate" : ""),
        });
      }

      navigate("/user/documents");
    } catch (error) {
      console.error("Error signing document:", error);

      // Provide more specific error messages
      let errorMessage = "Gagal menandatangani dokumen";

      if (error instanceof Error) {
        errorMessage = error.message;

        // Add helpful context based on error type
        if (error.message.includes("not found")) {
          errorMessage +=
            "\n\nData dokumen tidak ditemukan. Silakan buat ulang dokumen.";
        } else if (error.message.includes("fetch")) {
          errorMessage +=
            "\n\nGagal mengambil data. Periksa koneksi internet Anda.";
        } else if (
          error.message.includes("permission") ||
          error.message.includes("RLS")
        ) {
          errorMessage +=
            "\n\nAnda tidak memiliki izin untuk menandatangani dokumen ini.";
        }
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return (
      <DashboardLayout userRole={userProfile?.role}>
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
    <DashboardLayout userRole={userProfile?.role}>
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
                    <li>Isi QR code pada kotak yang tersedia</li>
                    <li>Klik tombol "Tanda Tangani" untuk menandatangani</li>
                    <li>QR code akan muncul pada nama penandatangan</li>
                    <li>Status dokumen akan berubah menjadi "signed"</li>
                    {isIjazah &&
                      metadata.workflow_stage === "dekan_pending" && (
                        <li>Dokumen akan otomatis terkirim ke Rektor</li>
                      )}
                  </ol>
                </div>
              </div>
            </div>

            {/* QR Code Input Section */}
            <div className="bg-amber-50 dark:bg-amber-950/20 p-4 rounded-lg border border-amber-200 dark:border-amber-800/30">
              <div className="flex gap-3">
                <QrCode className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-3">
                    Isi QR Code Penandatangan
                  </p>
                  <input
                    type="text"
                    placeholder="Masukkan kode QR atau scan QR code..."
                    value={qrValue}
                    onChange={(e) => setQrValue(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                    required
                  />
                  <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                    QR code ini akan ditampilkan pada nama Anda di dokumen
                  </p>
                </div>
              </div>
            </div>

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
                type="button"
                variant="outline"
                onClick={handleTestPuppeteer}
                disabled={testingPuppeteer}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <FileText className="w-4 h-4 mr-2" />
                {testingPuppeteer ? "Generating..." : "Test Puppeteer PDF"}
              </Button>
              <Button
                onClick={handleSign}
                disabled={loading || !qrValue.trim()}
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
