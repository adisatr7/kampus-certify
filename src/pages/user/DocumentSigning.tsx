import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PenTool, FileText, Shield, Calendar, QrCode, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { createAuditEntry } from "@/lib/audit";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { generateSignedPDF, uploadSignedPDF } from "@/lib/pdfSigner";

interface Document {
  id: string;
  title: string;
  content?: string | null;
  file_url: string | null;
  status: 'pending' | 'signed' | 'revoked';
  created_at: string;
}

interface Certificate {
  id: string;
  serial_number: string;
  status: string;
  expires_at: string;
}

export default function DocumentSigning() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const { userProfile } = useAuth();
  const { toast } = useToast();

  // Signing form state
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [selectedCertificate, setSelectedCertificate] = useState("");
  const [certificateCode, setCertificateCode] = useState("");

  useEffect(() => {
    if (userProfile) {
      fetchDocuments();
      fetchCertificates();
    }
  }, [userProfile]);

  const fetchDocuments = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat dokumen",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCertificates = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, serial_number, status, expires_at')
        .eq('user_id', userProfile.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
    }
  };

  const openSignDialog = (document: Document) => {
    setSelectedDocument(document);
    setIsSignDialogOpen(true);
  };

  const signDocument = async () => {
    if (!selectedDocument || !selectedCertificate || !userProfile) {
      toast({
        title: "Error",
        description: "Pilih sertifikat untuk menandatangani dokumen",
        variant: "destructive",
      });
      return;
    }

    if (!certificateCode.trim()) {
      toast({
        title: "Error",
        description: "Masukkan kode sertifikat untuk autentikasi",
        variant: "destructive",
      });
      return;
    }

    setSigning(true);

    try {
      // Get certificate details and verify code
      const { data: certData, error: certError } = await supabase
        .from('certificates')
        .select('serial_number, certificate_code')
        .eq('id', selectedCertificate)
        .single();

      if (certError || !certData) {
        throw new Error('Failed to fetch certificate details');
      }

      // Verify certificate code
      if (certData.certificate_code !== certificateCode) {
        toast({
          title: "Error",
          description: "Kode sertifikat tidak valid",
          variant: "destructive",
        });
        setSigning(false);
        return;
      }

      // Generate verification URL with document ID
      const verificationUrl = `${window.location.origin}/document-verification?id=${selectedDocument.id}`;
      
      let signedDocumentUrl = null;

      // Generate cryptographically signed PDF with QR code
      try {
        const signedPdfBlob = await generateSignedPDF(
          selectedDocument.file_url,
          {
            documentId: selectedDocument.id,
            documentTitle: selectedDocument.title,
            documentContent: selectedDocument.content || undefined,
            signerName: userProfile.name,
            signerRole: userProfile.role,
            signedAt: new Date().toISOString(),
            certificateSerial: certData.serial_number,
            verificationUrl: verificationUrl
          }
        );

        // Upload signed PDF to storage
        signedDocumentUrl = await uploadSignedPDF(
          signedPdfBlob,
          userProfile.id,
          selectedDocument.id,
          supabase
        );

        if (!signedDocumentUrl) {
          throw new Error('Failed to upload signed document');
        }
      } catch (pdfError) {
        console.error('Error generating/uploading signed PDF:', pdfError);
        throw pdfError;
      }
      
      // Update document with signature information
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          status: 'signed',
          signed_at: new Date().toISOString(),
          certificate_id: selectedCertificate,
          qr_code_url: verificationUrl,
          signed_document_url: signedDocumentUrl
        })
        .eq('id', selectedDocument.id);

      if (updateError) throw updateError;

      await createAuditEntry(
        userProfile.id,
        'SIGN_DOCUMENT',
        `Menandatangani dokumen "${selectedDocument.title}"`
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil ditandatangani dan disimpan",
      });

      setIsSignDialogOpen(false);
      setSelectedDocument(null);
      setSelectedCertificate("");
      fetchDocuments();
    } catch (error) {
      console.error('Signing error:', error);
      toast({
        title: "Error",
        description: "Gagal menandatangani dokumen",
        variant: "destructive",
      });
    } finally {
      setSigning(false);
    }
  };

  const closeDialog = () => {
    setIsSignDialogOpen(false);
    setSelectedDocument(null);
    setSelectedCertificate("");
    setCertificateCode("");
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout userRole={userProfile?.role as any}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Tanda Tangan Dokumen</h1>
          <p className="text-muted-foreground">Tandatangani dokumen Anda dengan sertifikat digital</p>
        </div>

        {/* Active Certificates Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sertifikat Aktif Anda
            </CardTitle>
          </CardHeader>
          <CardContent>
            {certificates.length === 0 ? (
              <div className="text-center py-6">
                <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Anda belum memiliki sertifikat aktif. Hubungi administrator untuk mendapatkan sertifikat.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {certificates.map((cert) => (
                  <Card key={cert.id} className="border-2">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge className="bg-status-valid text-white">Aktif</Badge>
                        </div>
                        <div>
                          <p className="font-mono text-sm">{cert.serial_number}</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Berlaku hingga: {new Date(cert.expires_at).toLocaleDateString('id-ID')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Documents to Sign */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumen Belum Ditandatangani ({documents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <PenTool className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Tidak Ada Dokumen Pending</h3>
                <p className="text-muted-foreground">
                  Semua dokumen Anda sudah ditandatangani atau belum ada dokumen yang diupload
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Judul Dokumen</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Dibuat</TableHead>
                    <TableHead>Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{doc.title}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={doc.status as any} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {new Date(doc.created_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {doc.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.file_url!, '_blank')}
                            >
                              Lihat
                            </Button>
                          )}
                          <Button
                            onClick={() => openSignDialog(doc)}
                            disabled={certificates.length === 0}
                            size="sm"
                          >
                            <PenTool className="mr-2 h-4 w-4" />
                            Tanda Tangan
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Sign Dialog */}
        <Dialog open={isSignDialogOpen} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tanda Tangan Dokumen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDocument && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-medium mb-2">Dokumen yang akan ditandatangani:</h4>
                  <p className="text-sm">{selectedDocument.title}</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium mb-2">
                  Pilih Sertifikat untuk Menandatangani
                </label>
                <Select value={selectedCertificate} onValueChange={setSelectedCertificate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Pilih sertifikat..." />
                  </SelectTrigger>
                  <SelectContent>
                    {certificates.map((cert) => (
                      <SelectItem key={cert.id} value={cert.id}>
                        <div className="flex flex-col">
                          <span>{cert.serial_number}</span>
                          <span className="text-xs text-muted-foreground">
                            Berlaku hingga {new Date(cert.expires_at).toLocaleDateString('id-ID')}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="certificateCode" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Kode Sertifikat
                </Label>
                <Input
                  id="certificateCode"
                  type="password"
                  placeholder="Masukkan kode sertifikat Anda"
                  value={certificateCode}
                  onChange={(e) => setCertificateCode(e.target.value)}
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  Masukkan kode rahasia sertifikat Anda untuk autentikasi
                </p>
              </div>

              <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900">Setelah ditandatangani:</p>
                    <p className="text-blue-700">
                      Dokumen akan mendapatkan QR code untuk verifikasi dan tidak dapat diubah lagi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button 
                  onClick={signDocument}
                  disabled={signing || !selectedCertificate || !certificateCode.trim()}
                >
                  {signing ? (
                    <>
                      <PenTool className="mr-2 h-4 w-4 animate-pulse" />
                      Menandatangani...
                    </>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Tanda Tangan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}