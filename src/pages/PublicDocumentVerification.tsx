import { AlertTriangle, Calendar, CheckCircle, FileText, Shield, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import campusBackground from "@/assets/campus-bg.jpg";
import { AppHeader } from "@/components/layout/AppHeader";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
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
  } | null;
  user?: {
    name: string;
    role: string;
    nidn: string | null;
  } | null;
}

export default function PublicDocumentVerification() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(true);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const documentId = searchParams.get("id") || searchParams.get("documentId");

    if (!documentId) {
      toast({
        title: "Error",
        description: "ID dokumen tidak ditemukan",
        variant: "destructive",
      });
      navigate("/verify");
      return;
    }

    verifyDocument(documentId);
  }, [searchParams]);

  const verifyDocument = async (docId: string) => {
    setVerifying(true);

    try {
      const { data, error } = await supabase
        .from("documents")
        .select(`
          *,
          certificate:certificates!documents_certificate_id_fkey (
            serial_number,
            status
          ),
          user:users!documents_user_id_fkey (
            name,
            role,
            nidn
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

      // Log verification attempt
      try {
        await supabase.rpc("create_audit_entry", {
          p_user_id: null,
          p_action: "VERIFY_DOCUMENT",
          p_description: `Verifikasi dokumen "${data.title}" dari QR code`,
        });
      } catch (auditError) {
        console.error("Failed to log verification:", auditError);
      }
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
      return <CheckCircle className="h-12 w-12 text-status-valid" />;
    }
    if (documentStatus === "revoked" || certificateStatus === "revoked") {
      return <XCircle className="h-12 w-12 text-status-invalid" />;
    }
    return <AlertTriangle className="h-12 w-12 text-orange-500" />;
  };

  const getStatusMessage = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === "signed" && certificateStatus === "active") {
      return "adalah benar, sah, dan tercatat dalam data kami serta diterbitkan oleh Certificate Authority UMC melalui Sistem Certificate Authority Berbasis Digital.";
    }
    if (documentStatus === "revoked") {
      return "telah dicabut dan tidak lagi valid.";
    }
    if (certificateStatus === "revoked") {
      return "memiliki sertifikat yang telah dicabut dan tidak lagi valid.";
    }
    if (documentStatus === "pending") {
      return "masih dalam proses penandatanganan.";
    }
    return "memiliki status yang tidak valid.";
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

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      rektor: "Rektor",
      dekan: "Dekan",
      dosen: "Dosen",
      admin: "Administrator",
    };
    return roleMap[role] || role;
  };

  if (verifying) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
          <div className="text-center animate-fade-in">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl blur-2xl opacity-40 animate-pulse-soft"></div>
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <Shield className="h-12 w-12 text-white animate-pulse" />
              </div>
            </div>
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-border/50 max-w-md">
              <h3 className="text-2xl font-bold text-foreground mb-3">Memverifikasi Dokumen</h3>
              <p className="text-muted-foreground mb-6">Sedang memeriksa keaslian dokumen...</p>
              <div className="flex justify-center gap-2">
                <div
                  className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-3 h-3 bg-yellow-500 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!verificationResult) {
    return (
      <>
        <AppHeader />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
          <div className="text-center animate-fade-in max-w-md">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-gradient-to-br from-red-400 to-red-600 rounded-3xl blur-2xl opacity-40 animate-pulse-soft"></div>
              <div className="relative w-24 h-24 mx-auto bg-gradient-to-br from-red-400 to-red-600 rounded-3xl flex items-center justify-center shadow-2xl">
                <XCircle className="h-12 w-12 text-white" />
              </div>
            </div>
            <div className="bg-card/95 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-border/50">
              <h3 className="text-2xl font-bold text-foreground mb-3">Dokumen Tidak Ditemukan</h3>
              <p className="text-muted-foreground mb-6">
                ID dokumen tidak valid atau dokumen tidak ada dalam sistem
              </p>
              <Button
                onClick={() => navigate("/verify")}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
              >
                Kembali ke Portal Verifikasi
              </Button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AppHeader />
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-yellow-200/30 to-yellow-400/20 dark:from-yellow-500/10 dark:to-yellow-700/5 rounded-full blur-3xl animate-pulse-soft"></div>
          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-blue-200/30 to-indigo-400/20 dark:from-blue-500/10 dark:to-indigo-700/5 rounded-full blur-3xl animate-pulse-soft"
            style={{ animationDelay: "1s" }}
          ></div>
        </div>

        <main className="relative z-10 container mx-auto px-6 py-12 flex items-center justify-center animate-fade-in-up">
          <Card className="max-w-3xl w-full shadow-2xl border-0 bg-card/95 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
            <CardHeader className="text-center pb-6 border-b border-border/50">
              <div className="relative group inline-block mx-auto mb-4">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 animate-pulse-soft"></div>
                <div className="relative w-24 h-24 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                  <span className="text-white font-bold text-2xl">UMC</span>
                </div>
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-3">
                Certificate Authority
              </CardTitle>
              <div className="space-y-2">
                <p className="text-xl font-semibold">Universitas Muhammadiyah Cirebon</p>
                <p className="text-sm text-muted-foreground">
                  Jl. Tuparev No.70, Kedawung, Kec. Cirebon, Kota Cirebon
                </p>
                <p className="text-sm text-muted-foreground">Jawa Barat 45153, Indonesia</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full mt-3">
                  <Shield className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold text-primary">
                    Sistem Certificate Authority Berbasis Digital
                  </p>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-border/50">
                <p className="text-xl font-bold text-foreground mb-2">
                  SURAT KETERANGAN VERIFIKASI
                </p>
                <p className="text-base text-muted-foreground">menyatakan bahwa :</p>
              </div>
            </CardHeader>

            <CardContent className="space-y-6 p-8">
              {/* Document ID */}
              <div className="text-center bg-gradient-to-r from-muted/50 to-muted/30 p-5 rounded-xl border border-border/50 shadow-sm">
                <p className="text-sm text-muted-foreground mb-2 font-medium uppercase tracking-wide">
                  ID Dokumen
                </p>
                <p className="font-mono font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  {verificationResult.id}
                </p>
              </div>

              {/* Document Information */}
              <div className="space-y-5 bg-gradient-to-br from-card to-card/50 p-6 rounded-xl border-2 border-border/30 shadow-lg">
                <div className="pb-4 border-b border-border/50">
                  <h3 className="text-xl font-bold text-foreground mb-2 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Informasi Dokumen
                  </h3>
                  <p className="text-sm text-muted-foreground">Detail dokumen yang diverifikasi</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Judul Dokumen
                    </p>
                    <p className="font-semibold text-lg">{verificationResult.title}</p>
                  </div>

                  {verificationResult.user && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Nama Penandatangan
                          </p>
                          <p className="font-semibold">{verificationResult.user.name}</p>
                        </div>
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Jabatan
                          </p>
                          <p className="font-semibold">
                            {getRoleLabel(verificationResult.user.role)}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {verificationResult.user.nidn && (
                          <div className="bg-muted/30 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                              NIDN
                            </p>
                            <p className="font-semibold font-mono">
                              {verificationResult.user.nidn}
                            </p>
                          </div>
                        )}
                        <div className="bg-muted/30 p-4 rounded-lg">
                          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                            Institusi
                          </p>
                          <p className="font-semibold">Universitas Muhammadiyah Cirebon</p>
                        </div>
                      </div>
                    </>
                  )}

                  {verificationResult.certificate && (
                    <div className="bg-muted/30 p-4 rounded-lg">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                        Nomor Serial Sertifikat Digital
                      </p>
                      <p className="font-mono text-sm font-semibold">
                        {verificationResult.certificate.serial_number}
                      </p>
                    </div>
                  )}

                  {verificationResult.signed_at && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Tanggal Penandatanganan
                        </p>
                        <p className="font-semibold">
                          {new Date(verificationResult.signed_at).toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="bg-muted/30 p-4 rounded-lg">
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                          Waktu Penandatanganan
                        </p>
                        <p className="font-semibold">
                          {new Date(verificationResult.signed_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: false,
                          })}{" "}
                          WIB
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted/30 p-4 rounded-lg">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                      Metode Verifikasi
                    </p>
                    <p className="font-semibold">QR Code - Blockchain-based Digital Signature</p>
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center space-y-4 bg-gradient-to-br from-primary/5 via-primary/10 to-primary/5 p-8 rounded-xl border-2 border-primary/30 shadow-xl">
                <div className="pb-4 border-b border-primary/30">
                  <h3 className="text-xl font-bold text-foreground mb-2 flex items-center justify-center gap-2">
                    <CheckCircle className="h-6 w-6 text-primary" />
                    Status Verifikasi
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Hasil pemeriksaan keaslian dokumen
                  </p>
                </div>

                <div className="flex flex-col items-center gap-5 py-6">
                  {getStatusIcon(verificationResult.status, verificationResult.certificate?.status)}
                  <StatusBadge
                    status={
                      getOverallStatus(
                        verificationResult.status,
                        verificationResult.certificate?.status,
                      ) as any
                    }
                    className="text-xl px-10 py-4 shadow-2xl transform hover:scale-105 transition-transform duration-200"
                  />
                </div>

                <div className="bg-background/50 backdrop-blur-sm p-6 rounded-xl border border-border/50 shadow-inner">
                  <p className="text-base leading-relaxed font-medium">
                    Dokumen dengan judul{" "}
                    <span className="font-bold text-primary">"{verificationResult.title}"</span>{" "}
                    {getStatusMessage(
                      verificationResult.status,
                      verificationResult.certificate?.status,
                    )}
                  </p>
                </div>

                {verificationResult.status === "signed" &&
                  verificationResult.certificate?.status === "active" && (
                    <div className="pt-4 space-y-3">
                      <div className="flex items-center justify-center gap-3 text-base text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Tanda tangan digital terverifikasi</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-base text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Sertifikat digital aktif dan valid</span>
                      </div>
                      <div className="flex items-center justify-center gap-3 text-base text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 p-3 rounded-lg">
                        <CheckCircle className="h-5 w-5" />
                        <span className="font-semibold">Integritas dokumen terjaga</span>
                      </div>
                    </div>
                  )}
              </div>

              {/* Verification Link */}
              <div className="text-center text-sm text-muted-foreground bg-gradient-to-r from-muted/50 to-muted/30 p-5 rounded-xl border border-border/50 shadow-sm">
                Pastikan Anda mengakses data yang benar melalui{" "}
                <a
                  href="https://ca-umc.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-primary hover:underline transition-all duration-200"
                >
                  https://ca-umc.vercel.app
                </a>
              </div>

              {/* Download Button */}
              {verificationResult.file_url && verificationResult.status === "signed" && (
                <div className="text-center pt-4">
                  <Button
                    onClick={() => setIsViewerOpen(true)}
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-12 py-6 text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  >
                    <FileText className="mr-3 h-6 w-6" />
                    Unduh PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>

      {/* Signed Document Viewer */}
      {verificationResult && (
        <SignedDocumentViewer
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          document={verificationResult}
        />
      )}
    </>
  );
}
