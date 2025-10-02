import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { FileText, Calendar, CheckCircle, XCircle, AlertTriangle, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import campusBackground from "@/assets/campus-bg.jpg";
import SignedDocumentViewer from "@/components/SignedDocumentViewer";
import { useSearchParams, useNavigate } from "react-router-dom";

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
  } | null;
  user?: {
    name: string;
    role: string;
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
    const documentId = searchParams.get('id') || searchParams.get('documentId');
    
    if (!documentId) {
      toast({
        title: "Error",
        description: "ID dokumen tidak ditemukan",
        variant: "destructive",
      });
      navigate('/verify');
      return;
    }

    verifyDocument(documentId);
  }, [searchParams]);

  const verifyDocument = async (docId: string) => {
    setVerifying(true);

    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          certificate:certificates!documents_certificate_id_fkey (
            serial_number,
            status
          ),
          user:users!documents_user_id_fkey (
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
      
      // Log verification attempt
      try {
        await supabase.rpc('create_audit_entry', {
          p_user_id: null,
          p_action: 'VERIFY_DOCUMENT',
          p_description: `Verifikasi dokumen "${data.title}" dari QR code`
        });
      } catch (auditError) {
        console.error('Failed to log verification:', auditError);
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
    if (documentStatus === 'signed' && certificateStatus === 'active') {
      return <CheckCircle className="h-12 w-12 text-status-valid" />;
    }
    if (documentStatus === 'revoked' || certificateStatus === 'revoked') {
      return <XCircle className="h-12 w-12 text-status-invalid" />;
    }
    return <AlertTriangle className="h-12 w-12 text-orange-500" />;
  };

  const getStatusMessage = (documentStatus: string, certificateStatus?: string) => {
    if (documentStatus === 'signed' && certificateStatus === 'active') {
      return 'adalah benar, sah, dan tercatat dalam data kami serta diterbitkan oleh Certificate Authority UMC melalui Sistem Certificate Authority Berbasis Digital.';
    }
    if (documentStatus === 'revoked') {
      return 'telah dicabut dan tidak lagi valid.';
    }
    if (certificateStatus === 'revoked') {
      return 'memiliki sertifikat yang telah dicabut dan tidak lagi valid.';
    }
    if (documentStatus === 'pending') {
      return 'masih dalam proses penandatanganan.';
    }
    return 'memiliki status yang tidak valid.';
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

  const getRoleLabel = (role: string) => {
    const roleMap: Record<string, string> = {
      'rektor': 'Rektor',
      'dekan': 'Dekan',
      'dosen': 'Dosen',
      'admin': 'Administrator'
    };
    return roleMap[role] || role;
  };

  if (verifying) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${campusBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent" />
        <Card className="relative z-10 glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <Shield className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
            <p className="text-lg font-medium">Memverifikasi dokumen...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!verificationResult) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: `url(${campusBackground})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent" />
        <Card className="relative z-10 glass-card max-w-md">
          <CardContent className="pt-6 text-center">
            <XCircle className="h-16 w-16 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium">Dokumen tidak ditemukan</p>
            <Button onClick={() => navigate('/verify')} className="mt-4">
              Kembali ke Portal Verifikasi
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
      <div className="absolute inset-0 bg-gradient-to-br from-umc-maroon/60 via-umc-dark/40 to-transparent" />
      
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <header className="bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="container mx-auto px-6 py-4">
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-lg">UMC</span>
                </div>
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-white">Certificate Authority</h1>
                  <p className="text-sm text-white/90">Universitas Muhammadiyah Cirebon</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 container mx-auto px-6 py-12 flex items-center justify-center">
          <Card className="glass-card max-w-3xl w-full">
            <CardHeader className="text-center pb-6">
              <div className="w-20 h-20 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-4">
                <span className="text-white font-bold text-xl">UMC</span>
              </div>
              <CardTitle className="text-2xl mb-2">
                Certificate Authority
              </CardTitle>
              <p className="text-lg font-medium">Universitas Muhammadiyah Cirebon</p>
              <p className="text-muted-foreground mt-4">menyatakan bahwa :</p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Document ID */}
              <div className="text-center bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">ID Dokumen</p>
                <p className="font-mono font-semibold text-lg">{verificationResult.id}</p>
              </div>

              {/* Document Information */}
              <div className="space-y-4 bg-card p-6 rounded-lg border">
                <div className="grid grid-cols-[180px_1fr] gap-x-4 gap-y-3">
                  <span className="text-muted-foreground font-medium">Judul Dokumen:</span>
                  <span className="font-medium">{verificationResult.title}</span>
                  
                  {verificationResult.user && (
                    <>
                      <span className="text-muted-foreground font-medium">Nama Penandatangan:</span>
                      <span className="font-medium">{verificationResult.user.name}</span>

                      <span className="text-muted-foreground font-medium">Jabatan:</span>
                      <span className="font-medium">{getRoleLabel(verificationResult.user.role)}</span>
                    </>
                  )}

                  {verificationResult.certificate && (
                    <>
                      <span className="text-muted-foreground font-medium">Serial Sertifikat:</span>
                      <span className="font-mono text-sm">{verificationResult.certificate.serial_number}</span>
                    </>
                  )}

                  {verificationResult.signed_at && (
                    <>
                      <span className="text-muted-foreground font-medium">Tanggal Ditandatangani:</span>
                      <span className="font-medium">
                        {new Date(verificationResult.signed_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric'
                        })}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <div className="text-center space-y-4">
                <p className="text-base leading-relaxed">
                  {getStatusMessage(verificationResult.status, verificationResult.certificate?.status)}
                </p>
                
                <div className="flex flex-col items-center gap-3 py-4">
                  {getStatusIcon(verificationResult.status, verificationResult.certificate?.status)}
                  <StatusBadge 
                    status={getOverallStatus(verificationResult.status, verificationResult.certificate?.status) as any}
                    className="text-xl px-8 py-3"
                  />
                </div>
              </div>

              {/* Verification Link */}
              <div className="text-center text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg">
                Pastikan Anda mengakses data yang benar melalui{' '}
                <a 
                  href="https://ca-umc.vercel.app" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  https://ca-umc.vercel.app
                </a>
              </div>

              {/* Download Button */}
              {verificationResult.file_url && verificationResult.status === 'signed' && (
                <div className="text-center pt-2">
                  <Button
                    onClick={() => setIsViewerOpen(true)}
                    size="lg"
                    className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-6 text-lg"
                  >
                    <FileText className="mr-2 h-5 w-5" />
                    Unduh PDF
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
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
        <footer className="bg-umc-maroon/90 backdrop-blur-lg border-t border-white/20">
          <div className="container mx-auto px-6 py-6">
            <div className="grid md:grid-cols-2 gap-6 text-white">
              <div>
                <h3 className="font-bold text-lg mb-2">Certificate Authority Berbasis Digital</h3>
                <p className="text-sm text-white/80">
                  Jl. Tuparev No.70, Kedawung, Kec. Cirebon, Kota Cirebon, Jawa Barat 45153
                </p>
              </div>
              <div className="md:text-right">
                <p className="text-sm text-white/80">
                  © 2025 Universitas Muhammadiyah Cirebon
                </p>
                <p className="text-sm text-white/80">
                  Certificate Authority System
                </p>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
