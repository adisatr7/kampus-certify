import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Download,
  FileText,
  QrCode,
  Search,
  Shield,
  University,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import campusBackground from "@/assets/campus-bg.jpg";
import { AppHeader } from "@/components/layout/AppHeader";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";

interface VerificationResult {
  id: string;
  title: string;
  status: "signed" | "revoked" | "pending";
  signed_at: string | null;
  file_url: string | null;
  qr_code_url: string | null;
  content?: string | null;
  certificate?: {
    serial_number: string;
    status: string;
  };
  users?: {
    name: string;
    role: string;
  };
}

export default function VerificationPortal() {
  const [documentId, setDocumentId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { toast } = useToast();

  // Auto-fill document ID from URL parameter (QR code scan)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const idFromUrl = urlParams.get("id") || urlParams.get("documentId");
    if (idFromUrl) {
      setDocumentId(idFromUrl);
      // Auto-verify if ID comes from QR code
      setTimeout(() => {
        verifyDocument(idFromUrl);
      }, 500);
    }
  }, []);

  const verifyDocument = async (idOverride?: string) => {
    const docId = idOverride || documentId;
    if (!docId.trim()) {
      toast({
        title: "Error",
        description: "Masukkan ID dokumen atau scan QR code",
        variant: "destructive",
      });
      return;
    }

    setVerifying(true);

    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          certificates (
            serial_number,
            status
          ),
          users (
            name,
            role
          )
        `)
        .eq("id", docId.trim())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        toast({
          title: "Dokumen Tidak Ditemukan",
          description: "ID dokumen tidak valid atau dokumen tidak ada dalam sistem",
          variant: "destructive",
        });
        setVerificationResult(null);
        return;
      }

      setVerificationResult(data);

      // Log verification attempt (optional - for audit purposes)
      try {
        await supabase.rpc("create_audit_entry", {
          p_user_id: null,
          p_action: "VERIFY_DOCUMENT",
          p_description: `Verifikasi dokumen "${data.title}" dari portal publik`,
        });
      } catch (auditError) {
        // Don't fail verification if audit logging fails
        console.error("Failed to log verification:", auditError);
      }

      toast({
        title: "Verifikasi Berhasil",
        description: `Status dokumen: ${getStatusMessage(data.status, data.certificates?.status)}`,
      });
    } catch (error) {
      toast({
        title: "Error Verifikasi",
        description: "Terjadi kesalahan saat memverifikasi dokumen",
        variant: "destructive",
      });
      setVerificationResult(null);
    } finally {
      setVerifying(false);
    }
  };

  const getStatusIcon = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === "signed" && certificateStatus === "active") {
      return <CheckCircle className="h-8 w-8 text-status-valid" />;
    }
    if (documentStatus === "revoked" || certificateStatus === "revoked") {
      return <XCircle className="h-8 w-8 text-status-invalid" />;
    }
    return <AlertTriangle className="h-8 w-8 text-orange-500" />;
  };

  const getStatusMessage = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === "signed" && certificateStatus === "active") {
      return "VALID - Dokumen sah dan sertifikat aktif";
    }
    if (documentStatus === "revoked") {
      return "REVOKED - Dokumen telah dicabut";
    }
    if (certificateStatus === "revoked") {
      return "INVALID - Sertifikat telah dicabut";
    }
    if (documentStatus === "pending") {
      return "PENDING - Dokumen belum ditandatangani";
    }
    return "INVALID - Status tidak valid";
  };

  const getOverallStatus = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === "signed" && certificateStatus === "active") {
      return "valid";
    }
    if (documentStatus === "revoked" || certificateStatus === "revoked") {
      return "revoked";
    }
    return "invalid";
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      verifyDocument();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader />

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-yellow-200/30 to-yellow-400/20 dark:from-yellow-500/10 dark:to-yellow-700/5 rounded-full blur-3xl animate-pulse-soft"></div>
        <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-700/5 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: "1s" }}
        ></div>
      </div>

      <div className="flex-1 relative z-10">
        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-6 py-12 animate-fade-in-up">
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Verification Form */}
            <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader className="text-center pb-6">
                <div className="flex justify-center mb-6">
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 animate-pulse-soft"></div>
                    <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                      <QrCode className="h-10 w-10 text-white" />
                    </div>
                  </div>
                </div>
                <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
                  Verifikasi Dokumen Digital
                </CardTitle>
                <p className="text-base text-muted-foreground">
                  Masukkan ID dokumen atau scan QR code untuk memverifikasi keaslian dokumen
                </p>
              </CardHeader>
              <CardContent className="space-y-6 p-8">
                <div className="space-y-3">
                  <Label htmlFor="documentId" className="text-base font-semibold">
                    ID Dokumen
                  </Label>
                  <div className="flex gap-3">
                    <Input
                      id="documentId"
                      placeholder="Masukkan ID dokumen atau hasil scan QR code"
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1 h-12 text-base border-2 focus:border-primary/50 transition-all duration-200"
                    />
                    <Button
                      onClick={() => verifyDocument()}
                      disabled={verifying}
                      className="h-12 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                    >
                      {verifying ? (
                        <>
                          <Search className="mr-2 h-5 w-5 animate-spin" />
                          Memverifikasi...
                        </>
                      ) : (
                        <>
                          <Search className="mr-2 h-5 w-5" />
                          Verifikasi
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800/30 shadow-sm">
                  <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <FileText className="h-4 w-4 text-white" />
                    </div>
                    Cara Verifikasi:
                  </h4>
                  <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                    <li className="pl-2">Scan QR code pada dokumen dengan kamera ponsel</li>
                    <li className="pl-2">Salin dan tempel ID dokumen ke kolom di atas</li>
                    <li className="pl-2">Klik tombol "Verifikasi" untuk mengecek status dokumen</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Verification Result */}
            {verificationResult && (
              <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-xl animate-scale-in">
                <CardHeader className="text-center pb-4">
                  <div className="w-16 h-16 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-sm">UMC</span>
                  </div>
                  <CardTitle className="text-xl">
                    Certificate Authority Universitas Muhammadiyah Cirebon
                  </CardTitle>
                  <p className="text-muted-foreground">menyatakan bahwa :</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Document ID */}
                  <div className="text-center">
                    <p className="text-lg font-semibold">ID Dokumen: {verificationResult.id}</p>
                  </div>

                  {/* Document Information */}
                  <div className="space-y-3">
                    <div className="flex justify-between border-b pb-2">
                      <span className="text-muted-foreground">Judul Dokumen:</span>
                      <span className="font-medium">{verificationResult.title}</span>
                    </div>

                    {verificationResult.users && (
                      <>
                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted-foreground">Nama Penandatangan:</span>
                          <span className="font-medium">{verificationResult.users.name}</span>
                        </div>

                        <div className="flex justify-between border-b pb-2">
                          <span className="text-muted-foreground">Jabatan:</span>
                          <span className="font-medium">
                            {verificationResult.users.role === "rektor"
                              ? "Rektor"
                              : verificationResult.users.role === "dekan"
                                ? "Dekan"
                                : verificationResult.users.role === "dosen"
                                  ? "Dosen"
                                  : verificationResult.users.role}
                          </span>
                        </div>
                      </>
                    )}

                    {verificationResult.certificate && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Serial Sertifikat:</span>
                        <span className="font-mono text-sm">
                          {verificationResult.certificate.serial_number}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Information */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      adalah benar, sah, dan tercatat dalam data kami serta diterbitkan oleh
                      Certificate Authority UMC melalui Sistem Certificate Authority Berbasis
                      Digital.
                    </p>

                    <div className="flex items-center justify-center gap-2 mt-4">
                      {getStatusIcon(
                        verificationResult.status,
                        verificationResult.certificate?.status,
                      )}
                      <StatusBadge
                        status={
                          getOverallStatus(
                            verificationResult.status,
                            verificationResult.certificate?.status,
                          ) as any
                        }
                        className="text-lg px-6 py-2"
                      />
                    </div>

                    {verificationResult.signed_at && (
                      <p className="text-sm text-center text-muted-foreground mt-2">
                        Ditandatangani pada:{" "}
                        {new Date(verificationResult.signed_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                    )}
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Pastikan Anda mengakses data yang benar melalui{" "}
                    <span className="font-semibold">https://ca-umc.vercel.app</span>
                  </p>

                  {/* Download Button */}
                  {verificationResult.file_url && verificationResult.status === "signed" && (
                    <div className="text-center space-y-2">
                      <Button
                        onClick={() => setIsViewerOpen(true)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-medium"
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        Unduh PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Information Card */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="text-lg">Tentang Verifikasi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-status-valid mt-0.5" />
                    <div>
                      <p className="font-medium text-status-valid">VALID</p>
                      <p className="text-muted-foreground">Dokumen asli dan sah</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <XCircle className="h-5 w-5 text-status-invalid mt-0.5" />
                    <div>
                      <p className="font-medium text-status-invalid">INVALID</p>
                      <p className="text-muted-foreground">Dokumen tidak sah</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-orange-600">REVOKED</p>
                      <p className="text-muted-foreground">Dokumen dicabut</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Signed Document Viewer */}
        {verificationResult && (
          <SignedDocumentViewer
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            document={verificationResult}
          />
        )}

        {/* Footer */}
        <footer className="relative z-10 bg-card/50 backdrop-blur-lg border-t border-border/30 mt-12">
          <div className="container mx-auto px-6 py-6">
            <div className="text-center text-muted-foreground text-sm">
              <p className="font-medium">© 2025 Universitas Muhammadiyah Cirebon</p>
              <p className="text-xs mt-1">
                Certificate Authority System - Powered by Digital Technology
              </p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
