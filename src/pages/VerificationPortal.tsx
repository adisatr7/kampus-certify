import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { AppHeader } from "@/components/layout/AppHeader";
import { Search, Shield, FileText, Calendar, Download, CheckCircle, XCircle, AlertTriangle, QrCode, University } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import campusBackground from "@/assets/campus-bg.jpg";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";

interface VerificationResult {
  id: string;
  title: string;
  status: 'signed' | 'revoked' | 'pending';
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
    const idFromUrl = urlParams.get('id') || urlParams.get('documentId');
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
        .from('documents')
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
        .eq('id', docId.trim())
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
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      
      <div 
        className="flex-1 relative"
        style={{
          backgroundImage: `url(${campusBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      >
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent dark:from-umc-maroon/80 dark:via-umc-dark/60 dark:to-transparent" />

        {/* Main Content */}
        <main className="relative z-10 container mx-auto px-6 py-12">
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
                      onClick={() => verifyDocument()}
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
                            {verificationResult.users.role === 'rektor' ? 'Rektor' : 
                             verificationResult.users.role === 'dekan' ? 'Dekan' :
                             verificationResult.users.role === 'dosen' ? 'Dosen' : 
                             verificationResult.users.role}
                          </span>
                        </div>
                      </>
                    )}

                    {verificationResult.certificate && (
                      <div className="flex justify-between border-b pb-2">
                        <span className="text-muted-foreground">Serial Sertifikat:</span>
                        <span className="font-mono text-sm">{verificationResult.certificate.serial_number}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Information */}
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700 mb-2">
                      adalah benar, sah, dan tercatat dalam data kami serta diterbitkan oleh Certificate Authority UMC
                      melalui Sistem Certificate Authority Berbasis Digital.
                    </p>
                    
                    <div className="flex items-center justify-center gap-2 mt-4">
                      {getStatusIcon(verificationResult.status, verificationResult.certificate?.status)}
                      <StatusBadge 
                        status={getOverallStatus(verificationResult.status, verificationResult.certificate?.status) as any}
                        className="text-lg px-6 py-2"
                      />
                    </div>

                    {verificationResult.signed_at && (
                      <p className="text-sm text-center text-muted-foreground mt-2">
                        Ditandatangani pada: {new Date(verificationResult.signed_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </p>
                    )}
                  </div>

                  <p className="text-center text-sm text-muted-foreground">
                    Pastikan Anda mengakses data yang benar melalui{' '}
                    <span className="font-semibold">https://ca-umc.vercel.app</span>
                  </p>

                  {/* Download Button */}
                  {verificationResult.file_url && verificationResult.status === 'signed' && (
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
        <footer className="relative z-10 bg-background/10 backdrop-blur-lg border-t border-border/20">
          <div className="container mx-auto px-6 py-4">
            <div className="text-center text-muted-foreground text-sm">
              © 2025 Universitas Muhammadiyah Cirebon - Certificate Authority System
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}