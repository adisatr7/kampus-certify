/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Calendar, FileText, PenTool, QrCode } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import useFetchDocumentsByUserId from "@/hooks/document/useFetchDocumentsByUserId";
import useFetchLatestKey from "@/hooks/signingKey/useFetchLatestKey";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { generateSignedPDF, uploadSignedPDF } from "@/lib/pdfSigner";
import { UserDocument } from "@/types";

export default function DocumentSigning() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const { latestKey } = useFetchLatestKey();
  const {
    data: documents,
    isLoading: isLoadingDocuments,
    refetch: refetchDocuments,
  } = useFetchDocumentsByUserId(userProfile?.id ?? "", ["pending", "revoked"]);

  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);

  const openSignDialog = (document: UserDocument) => {
    setSelectedDocument(document);
    setIsSignDialogOpen(true);
  };

  const signDocument = async () => {
    if (!selectedDocument || !userProfile) {
      toast({
        title: "Error",
        description: "Pilih dokumen dan sertifikat terlebih dahulu",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);
    try {
      // current auth session
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-document`;

      const response = await axios.post(
        url,
        {
          documentId: selectedDocument.id,
          signerUserId: userProfile.id,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      const result = response.data;
      console.log("Signature result:", result);

      let signedDocumentUrl = "";

      // Use canonical programmatic generator which will create a PDF if the document has no file_url
      const signedPdfBlob = await generateSignedPDF(selectedDocument);

      // Upload signed PDF to storage
      signedDocumentUrl = await uploadSignedPDF(
        signedPdfBlob,
        userProfile.id,
        selectedDocument.id,
        supabase,
      );

      if (!signedDocumentUrl) {
        throw new Error("Gagal mengunggah dokumen yang telah ditandatangani");
      }

      // Persist the signed file URL back to the document record
      try {
        const { error: updateError } = await supabase
          .from("documents")
          .update({ file_url: signedDocumentUrl })
          .eq("id", selectedDocument.id);

        if (updateError) {
          console.error("Failed to update document file_url:", updateError);
          // Not fatal for the signing flow, but surface to user
          toast({
            title: "Peringatan",
            description:
              "Dokumen telah ditandatangani tetapi URL file gagal disimpan. Silakan hubungi admin.",
            variant: "destructive",
          });
        }
      } catch (updateErr) {
        console.error("Error updating document with file_url:", updateErr);
      }

      await createAuditEntry(
        userProfile.id,
        "SIGN_DOCUMENT",
        `Menandatangani dokumen "${selectedDocument.title}"`,
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil ditandatangani dan disimpan",
      });

      setSelectedDocument(null);
      closeDialog();
    } catch (err) {
      // Improve axios error logging
      const serverMessage =
        (err as any)?.response?.data?.message ??
        (err as any)?.response?.data ??
        (err as Error)?.message ??
        String(err);

      toast({
        title: "Gagal menandatangani dokumen",
        description: String(serverMessage),
        variant: "destructive",
      });

      console.error("Gagal menandatangani dokumen:", err);

      toast({
        title: "Error",
        description: "Gagal menandatangani dokumen",
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
      refetchDocuments();
    }
  };

  const closeDialog = () => {
    setIsSignDialogOpen(false);
    setSelectedDocument(null);
  };

  if (isLoadingDocuments) {
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
          <p className="text-muted-foreground">
            Tandatangani dokumen Anda dengan sertifikat digital
          </p>
        </div>

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
              <>
                <div className="hidden md:block">
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
                                {new Date(doc.created_at).toLocaleDateString("id-ID")}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {doc.file_url && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(doc.file_url!, "_blank")}
                                >
                                  Lihat
                                </Button>
                              )}
                              <Button
                                onClick={() => openSignDialog(doc)}
                                size="sm"
                              >
                                <PenTool className="mr-2 h-4 w-4" />
                                {doc.status === "pending" ? "Tanda Tangan" : "Tanda Tangan Ulang"}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="block md:hidden space-y-4 max-h-[450px] overflow-y-auto pr-1">
                  <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">
                    Daftar Dokumen
                  </h2>
                  {documents.map((doc) => (
                    <Card
                      key={doc.id}
                      className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white/80 dark:bg-zinc-800 backdrop-blur-sm"
                    >
                      <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-600 dark:from-blue-400 dark:to-indigo-500">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <div>
                            <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                              {doc.title}
                            </CardTitle>
                            <p className="text-sm text-slate-600 dark:text-slate-400">
                              Dibuat: {new Date(doc.created_at).toLocaleDateString("id-ID")}
                            </p>
                          </div>
                          <div className="ml-auto">
                            <StatusBadge status={doc.status} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center gap-2 justify-end">
                          {doc.file_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(doc.file_url!, "_blank")}
                            >
                              Lihat
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => openSignDialog(doc)}
                          >
                            <PenTool className="mr-2 h-4 w-4" />
                            Tanda Tangan
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Sign Dialog */}
        <Dialog
          open={isSignDialogOpen}
          onOpenChange={closeDialog}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Tanda Tangan Dokumen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedDocument && (
                <>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Anda akan menandatangani:</h4>
                    <p className="text-sm">{selectedDocument.title}</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Dengan key ID:</h4>
                    <p className="text-sm">{latestKey}</p>
                  </div>
                </>
              )}

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
                <Button
                  variant="outline"
                  onClick={closeDialog}
                >
                  Batal
                </Button>
                <Button
                  onClick={signDocument}
                  disabled={isSigning}
                >
                  {isSigning ? (
                    <>
                      <PenTool className="mr-2 h-4 w-4 animate-pulse" />
                      Menandatangani...
                    </>
                  ) : (
                    <>
                      <PenTool className="mr-2 h-4 w-4" />
                      Beri Tanda Tangan
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
