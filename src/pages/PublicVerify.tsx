import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { 
  Search, 
  FileText, 
  Calendar,
  User,
  Shield,
  Download,
  QrCode,
  AlertCircle,
  CheckCircle2,
  University
} from "lucide-react";
import { toast } from "sonner";

interface VerificationResult {
  documentId: string;
  title: string;
  signerName: string;
  signerRole: string;
  signedDate: string;
  status: 'valid' | 'invalid' | 'revoked';
  certificateSerial: string;
  downloadUrl?: string;
}

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
        status: documentId.includes("invalid") ? "invalid" : 
                documentId.includes("revoked") ? "revoked" : "valid",
        certificateSerial: "UMC-CERT-2025-001",
        downloadUrl: "#"
      };
      
      setVerificationResult(mockResult);
      setIsVerifying(false);
      
      if (mockResult.status === 'valid') {
        toast.success("Dokumen berhasil diverifikasi");
      } else if (mockResult.status === 'invalid') {
        toast.error("Dokumen tidak valid atau telah dimodifikasi");
      } else {
        toast.warning("Sertifikat telah dicabut");
      }
    }, 2000);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'valid':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'revoked':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusMessage = (status: string) => {
    switch (status) {
      case 'valid':
        return "Dokumen ini asli dan belum pernah dimodifikasi sejak ditandatangani.";
      case 'invalid':
        return "Dokumen ini tidak valid atau telah dimodifikasi setelah ditandatangani.";
      case 'revoked':
        return "Sertifikat yang digunakan untuk menandatangani dokumen ini telah dicabut.";
      default:
        return "Status tidak diketahui.";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-umc-light-gray via-background to-umc-light-gray">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-4 rounded-full">
              <Shield className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-primary mb-2">Portal Verifikasi Publik</h1>
          <p className="text-muted-foreground mb-1">Certificate Authority UMC</p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <University className="h-4 w-4" />
            <span>Universitas Muhammadiyah Cirebon</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Verification Form */}
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Verifikasi Dokumen Digital
              </CardTitle>
              <CardDescription>
                Masukkan ID dokumen atau scan QR Code untuk memverifikasi keaslian dokumen
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Masukkan ID Dokumen (contoh: DOC-2025-001)"
                  value={documentId}
                  onChange={(e) => setDocumentId(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                  className="flex-1"
                />
                <Button 
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Memverifikasi...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Verifikasi
                    </>
                  )}
                </Button>
              </div>
              
              <div className="flex items-center justify-center">
                <Button variant="outline" className="flex items-center gap-2">
                  <QrCode className="h-4 w-4" />
                  Scan QR Code
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Verification Result */}
          {verificationResult && (
            <Card className="fade-in-up">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {getStatusIcon(verificationResult.status)}
                  Hasil Verifikasi
                  <StatusBadge status={verificationResult.status} />
                </CardTitle>
                <CardDescription>
                  {getStatusMessage(verificationResult.status)}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Judul Dokumen</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.title}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Penandatangan</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.signerName}</p>
                        <p className="text-xs text-muted-foreground">{verificationResult.signerRole}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Tanggal Ditandatangani</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.signedDate}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start gap-3">
                      <Shield className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Sertifikat Serial</p>
                        <p className="text-sm text-muted-foreground">{verificationResult.certificateSerial}</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                {verificationResult.status === 'valid' && verificationResult.downloadUrl && (
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
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-base">Informasi Penting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>• Dokumen yang valid menandakan bahwa dokumen tersebut asli dan belum dimodifikasi sejak ditandatangani.</p>
              <p>• Dokumen yang invalid mungkin telah dimodifikasi atau tidak berasal dari sumber resmi.</p>
              <p>• Dokumen dengan sertifikat revoked tidak lagi dapat dipercaya meskipun sebelumnya valid.</p>
              <p>• Sistem ini hanya memverifikasi dokumen yang diterbitkan melalui CA UMC.</p>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>© 2025 Universitas Muhammadiyah Cirebon - Certificate Authority</p>
          <p>Sistem Verifikasi Dokumen Digital Internal</p>
        </div>
      </div>
    </div>
  );
}