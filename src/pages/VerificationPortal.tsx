import axios from "axios";
import {
  AlertTriangle,
  CheckCircle,
  FileText,
  Menu,
  QrCode,
  Search,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { DocumentStatus, UserDocument, Ijazah, Sertifikat } from "@/types";
import { UserRole } from "@/types/UserRole";

export default function VerificationPortal() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const { userProfile } = useAuth();
  const isLoggedIn = Boolean(userProfile);
  const [documentId, setDocumentId] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] =
    useState<UserDocument | null>(null);
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

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
      // Call the new Edge Function
      const url = `${
        import.meta.env.VITE_SUPABASE_URL
      }/functions/v1/verify-document`;
      const session = await supabase.auth.getSession();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session.data.session?.access_token) {
        headers[
          "Authorization"
        ] = `Bearer ${session.data.session.access_token}`;
      }
      const response = await axios.post(
        url,
        { documentId: docId.trim() },
        { headers }
      );

      const result = response.data; // result = { valid, keyId, signedAt, reason }

      if (!result.valid) {
        toast({
          title: "Dokumen Tidak Valid",
          description:
            result.reason === "PAYLOAD_HASH_MISMATCH"
              ? "Isi dokumen telah berubah atau tidak sesuai tanda tangan."
              : result.reason === "SIGNATURE_INVALID"
              ? "Tanda tangan digital tidak cocok."
              : "Tanda tangan tidak valid.",
          variant: "destructive",
        });
        setVerificationResult(null);
        return;
      }

      // Fetch the document for display
      const isUuid = (id: string) =>
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
          id.trim()
        );

      const trimmedId = docId.trim();

      const baseSelect = `
          *,
          document_signatures (
            key_id
          )
        `;

      // Query by `id` when the input is a UUID, otherwise query by `serial`
      const { data: docData } = isUuid(trimmedId)
        ? await supabase
            .from("documents")
            .select(baseSelect)
            .eq("id", trimmedId)
            .maybeSingle()
        : await supabase
            .from("documents")
            .select(baseSelect)
            .eq("serial", trimmedId)
            .maybeSingle();

      setVerificationResult(docData as unknown as UserDocument);

      // Fetch additional data based on document type
      if (docData?.title?.toLowerCase().includes("ijazah")) {
        const { data: ijazah } = await supabase
          .from("ijazah")
          .select("*")
          .eq("document_id", docData.id)
          .maybeSingle();
        setIjazahData(ijazah as Ijazah | null);
      } else if (docData?.title?.toLowerCase().includes("sertifikat")) {
        const { data: sertifikat } = await supabase
          .from("sertifikat")
          .select("*")
          .eq("document_id", docData.id)
          .maybeSingle();
        setSertifikatData(sertifikat as Sertifikat | null);
      }

      toast({
        title: "Verifikasi Berhasil",
        description: `Dokumen valid (key: ${result.keyId})`,
      });

      // Optional audit entry
      await supabase.rpc("create_audit_entry", {
        p_user_id: null,
        p_action: "VERIFY_DOCUMENT",
        p_description: `Verifikasi dokumen "${docData?.title}" dari portal publik`,
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      const message =
        err.response?.data?.error ??
        err.message ??
        "Terjadi kesalahan saat memverifikasi dokumen";
      console.error("Verification error:", err);

      toast({
        title: "Error Verifikasi",
        description: message,
        variant: "destructive",
      });
      setVerificationResult(null);
      setIjazahData(null);
      setSertifikatData(null);
    } finally {
      setVerifying(false);
    }
  };

  const handleReset = () => {
    setVerificationResult(null);
    setIjazahData(null);
    setSertifikatData(null);
    setDocumentId("");
  };

  const getStatusIcon = (documentStatus: DocumentStatus) => {
    if (documentStatus === "signed") {
      return <CheckCircle className="h-8 w-8 text-status-valid" />;
    }
    if (documentStatus === "revoked") {
      return <XCircle className="h-8 w-8 text-status-invalid" />;
    }
    return <AlertTriangle className="h-8 w-8 text-orange-500" />;
  };

  const getStatusLabel = (documentStatus: DocumentStatus) => {
    if (documentStatus === "signed") {
      return "VALID";
    }
    if (documentStatus === "revoked") {
      return "DIBATALKAN";
    }
    if (documentStatus === "pending") {
      return "PENDING";
    }
    return "TIDAK DITEMUKAN";
  };

  const getDocumentType = () => {
    if (!verificationResult) return null;
    const title = verificationResult.title?.toLowerCase() || "";
    if (title.includes("ijazah")) return "ijazah";
    if (title.includes("sertifikat")) return "sertifikat";
    if (title.includes("surat")) return "surat";
    return "lainnya";
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <AppHeader />

      {/* Mobile Overlay */}
      {!sidebarCollapsed && isLoggedIn && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {isLoggedIn && (
        <AppSidebar
          userRole={(userProfile?.role as UserRole) ?? "dosen"}
          collapsed={sidebarCollapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      )}

      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-yellow-200/30 to-yellow-400/20 dark:from-yellow-500/10 dark:to-yellow-700/5 rounded-full blur-3xl animate-pulse-soft"></div>
        {/* This causes the background colors to not be scrollable, and for that reason is disabled. */}
        {/* <div
          className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-700/5 rounded-full blur-3xl animate-pulse-soft"
          style={{ animationDelay: "1s" }}
        /> */}
      </div>

      <div className="flex-1 relative z-10">
        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-6 py-4 lg:py-12 animate-fade-in-up">
          {/* Mobile Menu Button */}
          {isLoggedIn && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarCollapsed(false)}
              className="lg:hidden mb-4"
            >
              <Menu className="h-4 w-4 mr-2" />
              Menu
            </Button>
          )}
          <div className="max-w-2xl mx-auto space-y-8">
            {/* Verification Form */}
            {!verificationResult && (
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
                    Masukkan ID dokumen atau scan QR code untuk memverifikasi
                    keaslian dokumen
                  </p>
                </CardHeader>
                <CardContent className="space-y-6 p-8">
                  <div className="space-y-3">
                    <Label
                      htmlFor="documentId"
                      className="text-base font-semibold"
                    >
                      ID Dokumen atau Nomor Seri Ijazah
                    </Label>
                    <div className="flex flex-col md:flex-row gap-3">
                      <Input
                        id="documentId"
                        placeholder="Contoh: IZH-0001-UMC-2025 atau ID dokumen"
                        value={documentId}
                        onChange={(e) => setDocumentId(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && verifyDocument()}
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
                      <Button
                        onClick={() => navigate("/qr-scanner")}
                        className="flex md:hidden justify-center h-12 px-6 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                      >
                        <QrCode className="mr-2 h-5 w-5" />
                        Scan QR
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
                      <li className="pl-2">
                        Scan QR code pada dokumen dengan kamera ponsel.
                      </li>
                      <li className="pl-2">
                        Atau masukkan Nomor Seri Ijazah (contoh:
                        IZH-0001-UMC-2025) atau ID dokumen ke kolom di atas dan
                        klik tombol "Verifikasi".
                      </li>
                      <li className="pl-2">
                        Nomor seri ijazah dapat ditemukan pada dokumen ijazah
                        yang diterbitkan.
                      </li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Verification Result */}
            {verificationResult && (
              <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-xl animate-scale-in">
                {/* Header Section */}
                <CardHeader className="text-center pb-6 border-b">
                  <div className="w-16 h-16 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                    <span className="text-white font-bold text-sm">UMC</span>
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">
                    Universitas Muhammadiyah Cirebon
                  </CardTitle>
                  <p className="text-muted-foreground mb-4">
                    Certificate Authority System
                  </p>

                  {/* Status Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
                    <div className="flex items-center justify-center gap-3 mb-2">
                      {getStatusIcon(verificationResult.status)}
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Status Verifikasi
                        </p>
                        <p className="text-lg font-bold">
                          {getStatusLabel(verificationResult.status)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6 pt-6">
                  {/* Document Type & Number */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Jenis Dokumen
                      </p>
                      <p className="text-lg font-semibold capitalize">
                        {getDocumentType()}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Nomor Dokumen
                      </p>
                      <p className="text-lg font-semibold font-mono">
                        {ijazahData?.nomor_seri ||
                          sertifikatData?.nomor_sertifikat ||
                          verificationResult.serial ||
                          verificationResult.id.slice(0, 8)}
                      </p>
                    </div>
                  </div>

                  {/* Tanggal Verifikasi */}
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Tanggal Verifikasi
                    </p>
                    <p className="text-lg font-semibold">
                      {new Date().toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {/* Ijazah Details */}
                  {ijazahData && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-bold text-lg">Detail Ijazah</h3>
                      <div className="grid gap-4">
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Nama Lengkap
                          </span>
                          <span className="font-medium">
                            {ijazahData.nama_mahasiswa}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">NIM</span>
                          <span className="font-medium font-mono">
                            {ijazahData.nim}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Program Studi
                          </span>
                          <span className="font-medium">
                            {ijazahData.nama_fakultas}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">Jenjang</span>
                          <span className="font-medium">
                            {ijazahData.gelar}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Tanggal Lulus
                          </span>
                          <span className="font-medium">
                            {new Date(
                              ijazahData.tanggal_terbit
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Tanggal Penerbitan
                          </span>
                          <span className="font-medium">
                            {new Date(
                              ijazahData.tanggal_terbit
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sertifikat Details */}
                  {sertifikatData && (
                    <div className="space-y-4 border-t pt-6">
                      <h3 className="font-bold text-lg">Detail Sertifikat</h3>
                      <div className="grid gap-4">
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Nama Lengkap
                          </span>
                          <span className="font-medium">
                            {sertifikatData.nama_peserta}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Jenis Sertifikat
                          </span>
                          <span className="font-medium">
                            Sertifikat Pelatihan
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Nama Kegiatan
                          </span>
                          <span className="font-medium">
                            {sertifikatData.nama_acara}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Tanggal Pelaksanaan
                          </span>
                          <span className="font-medium">
                            {new Date(
                              sertifikatData.tanggal_acara
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                        <div className="flex justify-between border-b pb-3">
                          <span className="text-muted-foreground">
                            Tanggal Penerbitan
                          </span>
                          <span className="font-medium">
                            {new Date(
                              sertifikatData.created_at
                            ).toLocaleDateString("id-ID", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Verification Info */}
                  <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800/30">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      ✓ Dokumen telah diverifikasi dan terbukti sah serta
                      tercatat dalam sistem Certificate Authority Universitas
                      Muhammadiyah Cirebon.
                    </p>
                  </div>

                  <p className="text-center text-xs text-muted-foreground">
                    Pastikan Anda mengakses melalui{" "}
                    <span className="font-semibold">
                      https://ca-umc.vercel.app
                    </span>
                  </p>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {verificationResult.file_url &&
                      verificationResult.status === "signed" && (
                        <Button
                          onClick={() => setIsViewerOpen(true)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          <FileText className="mr-2 h-4 w-4" />
                          Lihat PDF
                        </Button>
                      )}
                    <Button
                      onClick={handleReset}
                      variant="outline"
                      className="flex-1"
                    >
                      Verifikasi Lagi
                    </Button>
                  </div>
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
                      <p className="text-muted-foreground">
                        Dokumen asli dan sah
                      </p>
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
              <p className="font-medium">
                © 2025 Universitas Muhammadiyah Cirebon
              </p>
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
