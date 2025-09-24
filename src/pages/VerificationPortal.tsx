import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Shield, FileText, Calendar, Download, CheckCircle, XCircle, AlertTriangle, QrCode, University } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import campusBackground from "@/assets/campus-bg.jpg";

interface VerificationResult {
  id: string;
  title: string;
  status: 'signed' | 'revoked' | 'pending';
  signed_at: string | null;
  file_url: string | null;
  qr_code_url: string | null;
  certificate?: {
    serial_number: string;
    algorithm: string;
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
  const { toast } = useToast();

  const verifyDocument = async () => {
    if (!documentId.trim()) {
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
        .from('documents')
        .select(`
          *,
          certificates (
            serial_number,
            algorithm,
            status
          ),
          users (
            name,
            role
          )
        `)
        .eq('id', documentId.trim())
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
        await supabase.rpc('create_audit_entry', {
          p_user_id: null,
          p_action: 'VERIFY_DOCUMENT',
          p_description: `Verifikasi dokumen "${data.title}" dari portal publik`
        });
      } catch (auditError) {
        // Don't fail verification if audit logging fails
        console.error('Failed to log verification:', auditError);
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
    if (documentStatus === 'signed' && certificateStatus === 'active') {
      return <CheckCircle className="h-8 w-8 text-status-valid" />;
    }
    if (documentStatus === 'revoked' || certificateStatus === 'revoked') {
      return <XCircle className="h-8 w-8 text-status-invalid" />;
    }
    return <AlertTriangle className="h-8 w-8 text-orange-500" />;
  };

  const getStatusMessage = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === 'signed' && certificateStatus === 'active') {
      return 'VALID - Dokumen sah dan sertifikat aktif';
    }
    if (documentStatus === 'revoked') {
      return 'REVOKED - Dokumen telah dicabut';
    }
    if (certificateStatus === 'revoked') {
      return 'INVALID - Sertifikat telah dicabut';
    }
    if (documentStatus === 'pending') {
      return 'PENDING - Dokumen belum ditandatangani';
    }
    return 'INVALID - Status tidak valid';
  };

  const getOverallStatus = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === 'signed' && certificateStatus === 'active') {
      return 'valid';
    }
    if (documentStatus === 'revoked' || certificateStatus === 'revoked') {
      return 'revoked';
    }
    return 'invalid';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      verifyDocument();
    }
  };

  return (
    <div 
      className="min-h-screen"
      style={{
        backgroundImage: `url(${campusBackground})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-lg backdrop-blur-sm">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-white">Portal Verifikasi</h1>
                  <p className="text-sm text-white/80">CA UMC - Certificate Authority</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-white/80">
                <University className="h-4 w-4" />
                <span className="text-sm">Universitas Muhammadiyah Cirebon</span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-6 py-12">
          <div className="max-w-2xl mx-auto space-y-8">
            
            {/* Verification Form */}
            <Card className="glass-card">
              <CardHeader className="text-center">
                <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                  <QrCode className="h-6 w-6" />
                  Verifikasi Dokumen Digital
                </CardTitle>
                <p className="text-muted-foreground">
                  Masukkan ID dokumen atau scan QR code untuk memverifikasi keaslian dokumen
                </p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="documentId">ID Dokumen</Label>
                  <div className="flex gap-2">
                    <Input
                      id="documentId"
                      placeholder="Masukkan ID dokumen atau hasil scan QR code"
                      value={documentId}
                      onChange={(e) => setDocumentId(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                    />
                    <Button 
                      onClick={verifyDocument}
                      disabled={verifying}
                      className="bg-primary hover:bg-primary/90"
                    >
                      {verifying ? (
                        <>
                          <Search className="mr-2 h-4 w-4 animate-spin" />
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
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Cara Verifikasi:</h4>
                  <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                    <li>Scan QR code pada dokumen dengan kamera ponsel</li>
                    <li>Salin dan tempel ID dokumen ke kolom di atas</li>
                    <li>Klik tombol "Verifikasi" untuk mengecek status dokumen</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Verification Result */}
            {verificationResult && (
              <Card className="glass-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Hasil Verifikasi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Status Overview */}
                  <div className="text-center space-y-4">
                    {getStatusIcon(verificationResult.status, verificationResult.certificate?.status)}
                    <div>
                      <StatusBadge 
                        status={getOverallStatus(verificationResult.status, verificationResult.certificate?.status) as any}
                        className="text-lg px-6 py-2"
                      />
                      <p className="mt-2 text-sm text-muted-foreground">
                        {getStatusMessage(verificationResult.status, verificationResult.certificate?.status)}
                      </p>
                    </div>
                  </div>

                  {/* Document Details */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3">
                      <h4 className="font-medium">Informasi Dokumen</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Judul:</span>
                          <p className="font-medium">{verificationResult.title}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">ID Dokumen:</span>
                          <p className="font-mono text-xs">{verificationResult.id}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Status:</span>
                          <StatusBadge status={verificationResult.status as any} />
                        </div>
                        {verificationResult.signed_at && (
                          <div>
                            <span className="text-muted-foreground">Tanggal Tanda Tangan:</span>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4" />
                              {new Date(verificationResult.signed_at).toLocaleString('id-ID')}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Informasi Penandatangan</h4>
                      <div className="space-y-2 text-sm">
                        {verificationResult.users && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Nama:</span>
                              <p className="font-medium">{verificationResult.users.name}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Jabatan:</span>
                              <Badge variant="outline">{verificationResult.users.role}</Badge>
                            </div>
                          </>
                        )}
                        {verificationResult.certificate && (
                          <>
                            <div>
                              <span className="text-muted-foreground">Sertifikat:</span>
                              <p className="font-mono text-xs">{verificationResult.certificate.serial_number}</p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Algoritma:</span>
                              <Badge variant="outline">{verificationResult.certificate.algorithm}</Badge>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Download Button */}
                  {verificationResult.file_url && verificationResult.status === 'signed' && (
                    <div className="text-center">
                      <Button
                        onClick={() => window.open(verificationResult.file_url!, '_blank')}
                        className="bg-primary hover:bg-primary/90"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Unduh Dokumen Asli
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

        {/* Footer */}
        <footer className="bg-white/10 backdrop-blur-lg border-t border-white/20">
          <div className="container mx-auto px-6 py-4">
            <div className="text-center text-white/70 text-sm">
              © 2025 Universitas Muhammadiyah Cirebon - Certificate Authority System
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}