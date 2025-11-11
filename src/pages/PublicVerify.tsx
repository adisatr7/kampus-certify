// ! Unused

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  FileText,
  QrCode,
  Search,
  Shield,
  University,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentStatus } from "@/types";

type VerificationStatus = DocumentStatus | "valid" | "invalid";

interface VerificationResult {
  documentId: string;
  title: string;
  signerName: string;
  signerRole: string;
  signedDate: string;
  status: VerificationStatus;
  certificateSerial: string;
  downloadUrl?: string;
}
// TODO: Implement the revamped verification logic with latest API integration

export default function PublicVerify() {
  const [documentId, setDocumentId] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // Mock verification function
  const handleVerify = async () => {
    if (!documentId.trim()) {
      toast.error("Masukkan ID dokumen untuk verifikasi");
      return;
    }

    setIsVerifying(true);

    // Simulate API call
    setTimeout(() => {
      // Mock verification result
      const mockResult: VerificationResult = {
        documentId: documentId,
        title: "Surat Keputusan Rektor No. 123/SK/2025",
        signerName: "Prof. Dr. Ahmad Zain, M.Pd.",
        signerRole: "Rektor",
        signedDate: "15 Januari 2025",
        status: documentId.includes("invalid")
          ? "invalid"
          : documentId.includes("revoked")
            ? "revoked"
            : "valid",
        certificateSerial: "UMC-CERT-2025-001",
        downloadUrl: "#",
      };

      setVerificationResult(mockResult);
      setIsVerifying(false);

      if (mockResult.status === "valid") {
        toast.success("Dokumen berhasil diverifikasi");
      } else if (mockResult.status === "invalid") {
        toast.error("Dokumen tidak valid atau telah dimodifikasi");
      } else {
        toast.warning("Sertifikat telah dicabut");
      }
    }, 2000);
  };

  const getStatusIcon = (status: VerificationStatus) => {
    switch (status) {
      case "valid":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "invalid":
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case "revoked":
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusMessage = (status: VerificationStatus) => {
    switch (status) {
      case "valid":
        return "Dokumen ini asli dan belum pernah dimodifikasi sejak ditandatangani.";
      case "invalid":
        return "Dokumen ini tidak valid atau telah dimodifikasi setelah ditandatangani.";
      case "revoked":
        return "Sertifikat yang digunakan untuk menandatangani dokumen ini telah dicabut.";
      default:
        return "Status tidak diketahui.";
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
        <div className="container mx-auto px-4 py-12 animate-fade-in-up">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-3xl blur-2xl opacity-50 group-hover:opacity-75 transition-opacity duration-300 animate-pulse-soft"></div>
                <div className="relative w-20 h-20 bg-gradient-to-br from-yellow-400 via-yellow-500 to-yellow-600 rounded-3xl flex items-center justify-center shadow-2xl transform group-hover:scale-110 transition-transform duration-300">
                  <Shield className="h-10 w-10 text-white" />
                </div>
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent mb-4">
              Portal Verifikasi Publik
            </h1>
            <p className="text-lg text-muted-foreground mb-2 font-medium">
              Certificate Authority UMC
            </p>
            <div className="flex items-center justify-center gap-2 text-base text-muted-foreground">
              <University className="h-5 w-5" />
              <span>Universitas Muhammadiyah Cirebon</span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto space-y-6">
            {/* Verification Form */}
            <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-xl hover:shadow-3xl transition-all duration-300">
              <CardHeader>
                <CardTitle className="text-2xl font-bold flex items-center gap-3">
                  <Search className="h-6 w-6 text-primary" />
                  Verifikasi Dokumen Digital
                </CardTitle>
                <CardDescription className="text-base">
                  Masukkan ID dokumen atau scan QR Code untuk memverifikasi keaslian dokumen
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 p-6">
                <div className="flex gap-3">
                  <Input
                    placeholder="Masukkan ID Dokumen (contoh: DOC-2025-001)"
                    value={documentId}
                    onChange={(e) => setDocumentId(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleVerify()}
                    className="flex-1 h-12 text-base border-2 focus:border-primary/50 transition-all duration-200"
                  />
                  <Button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="h-12 px-8 bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    {isVerifying ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full mr-2" />
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

                <div className="flex items-center justify-center pt-2">
                  <Button
                    variant="outline"
                    className="flex items-center gap-2 border-2 hover:bg-accent/50 transition-all duration-200"
                  >
                    <QrCode className="h-5 w-5" />
                    Scan QR Code
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Verification Result */}
            {verificationResult && (
              <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur-xl animate-scale-in">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(verificationResult.status)}
                    Hasil Verifikasi
                    {/* Map verification status to DocumentStatus for StatusBadge */}
                    <StatusBadge
                      status={
                        verificationResult.status === "valid"
                          ? ("signed" as DocumentStatus)
                          : verificationResult.status === "revoked"
                            ? ("revoked" as DocumentStatus)
                            : ("pending" as DocumentStatus)
                      }
                    />
                  </CardTitle>
                  <CardDescription>{getStatusMessage(verificationResult.status)}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Judul Dokumen</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.title}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Penandatangan</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.signerName}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {verificationResult.signerRole}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Tanggal Ditandatangani</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.signedDate}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3">
                        <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Sertifikat Serial</p>
                          <p className="text-sm text-muted-foreground">
                            {verificationResult.certificateSerial}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {verificationResult.status === "valid" && verificationResult.downloadUrl && (
                    <div className="pt-4 border-t border-border">
                      <Button className="w-full bg-primary hover:bg-primary/90">
                        <Download className="mr-2 h-4 w-4" />
                        Unduh Dokumen PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Information */}
            <Card className="border-0 shadow-xl bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-primary" />
                  Informasi Penting
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>
                    Dokumen yang valid menandakan bahwa dokumen tersebut asli dan belum dimodifikasi
                    sejak ditandatangani.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <p>
                    Dokumen yang invalid mungkin telah dimodifikasi atau tidak berasal dari sumber
                    resmi.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p>
                    Dokumen dengan sertifikat revoked tidak lagi dapat dipercaya meskipun sebelumnya
                    valid.
                  </p>
                </div>
                <div className="flex items-start gap-3 p-3 bg-card/50 rounded-lg">
                  <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p>Sistem ini hanya memverifikasi dokumen yang diterbitkan melalui CA UMC.</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Footer */}
          <div className="text-center mt-12 text-sm text-muted-foreground space-y-1 pb-8">
            <p className="font-medium">
              © 2025 Universitas Muhammadiyah Cirebon - Certificate Authority
            </p>
            <p className="text-xs">Sistem Verifikasi Dokumen Digital Internal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
