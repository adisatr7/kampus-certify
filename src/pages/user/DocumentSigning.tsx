/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from "axios";
import { Calendar, Eye, EyeOff, FileText, Loader2, PenTool, QrCode } from "lucide-react";
import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/Select";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";
import useFetchAllDocuments from "@/hooks/document/useFetchAllDocuments";
import useFetchDocumentsByUserId from "@/hooks/document/useFetchDocumentsByUserId";
import useFetchLatestKey from "@/hooks/signingKey/useFetchLatestKey";
import useFetchSigningKeys from "@/hooks/signingKey/useFetchSigningKeys";
import { useToast } from "@/hooks/useToast";
import { supabase } from "@/integrations/supabase/client";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";
import { generateSignedPDF, uploadSignedPDF } from "@/lib/pdfSigner";
import { UserDocument } from "@/types";
import { Label } from "../../components/ui/Label";

export default function DocumentSigning() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const { data: signingKeys, isLoading: isLoadingKeys } = useFetchSigningKeys(
    userProfile?.id ?? "",
  );
  const { latestKey } = useFetchLatestKey(userProfile?.id ?? "");

  const docsByUserHook = useFetchDocumentsByUserId(userProfile?.id ?? "", ["pending", "revoked"], {
    enabled: userProfile?.role !== "admin",
  });
  const allDocsHook = useFetchAllDocuments({
    enabled: userProfile?.role === "admin",
    status: ["pending", "revoked"],
  });

  const documents = (userProfile?.role === "admin" ? allDocsHook.data : docsByUserHook.data) || [];
  const isLoadingDocuments =
    userProfile?.role === "admin" ? allDocsHook.isLoading : docsByUserHook.isLoading;
  const refetchDocuments =
    userProfile?.role === "admin" ? allDocsHook.refetch : docsByUserHook.refetch;

  const [passphraseInput, setPassphraseInput] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const openSignDialog = (document: UserDocument) => {
    setSelectedDocument(document);
    setSelectedKeyId(latestKey || signingKeys?.[0]?.kid || null);
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
      // Sign the document
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // Generate signed PDF. This is done first before crypto signing because this part is more prone to errors
      const signedPdfBlob = await generateSignedPDF(selectedDocument, { accessToken });

      // Now sign the document object using the selected key and passphrase
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/sign-document`;
      const response = await axios.post(
        url,
        {
          documentId: selectedDocument.id,
          signerUserId: userProfile.id,
          passphrase: passphraseInput,
          recipientName: selectedDocument.recipient_name || "",
          recipientStudentNumber: selectedDocument.recipient_student_number || "",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );

      // If signing succeed, upload the generated signed PDF to storage
      const signedDocumentUrl = await uploadSignedPDF(
        signedPdfBlob,
        userProfile.id,
        selectedDocument.id,
        supabase,
      );

      // If upload fail, revert document status in the db to pending
      if (!signedDocumentUrl) {
        await supabase
          .from("documents")
          .update({ status: "pending" })
          .eq("id", selectedDocument.id);

        console.error("uploadSignedPDF returned null for document", selectedDocument.id);
        throw new Error("Failed to upload signed PDF");
      }

      // If upload succeed, persist the signed file URL back to the document record
      const { error: updateError } = await supabase
        .from("documents")
        .update({ file_url: signedDocumentUrl })
        .eq("id", selectedDocument.id);

      if (updateError) {
        console.error("Failed to update document file_url:", updateError);
        throw updateError;
      }

      // Audit and success toast only after full success
      await createAuditEntry(
        userProfile.id,
        "SIGN_DOCUMENT",
        `Menandatangani dokumen "${selectedDocument.title}"`,
      );

      toast({
        title: "Berhasil",
        description: "Dokumen berhasil ditandatangani",
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

      console.error("Gagal menandatangani dokumen:", err);

      toast({
        title: "Error",
        description: err?.response?.data?.error || "Gagal menandatangani dokumen",
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
                                Tanda Tangan
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
                  {/* Document title */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label>Anda akan menandatangani:</Label>
                    <p className="text-sm">{selectedDocument.title}</p>
                  </div>

                  {/* Certificate (internally: signing key) selection */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label htmlFor="signing-key">Pilih sertifikat untuk menandatangani:</Label>
                    {signingKeys && signingKeys.length > 0 ? (
                      <Select
                        value={selectedKeyId ?? ""}
                        onValueChange={(v) => setSelectedKeyId(v || null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingKeys ? "Memuat sertifikat..." : "Pilih sertifikat..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {signingKeys.map((k) => (
                            <SelectItem
                              key={k.kid}
                              value={k.kid}
                            >
                              {k.kid}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        (Tidak ada sertifikat tersedia)
                      </div>
                    )}
                  </div>

                  {/* Passphrase */}
                  <div className="p-4 bg-muted rounded-lg">
                    <Label htmlFor="passphrase">Masukkan passphrase:</Label>
                    <div className="relative">
                      <Input
                        id="passphrase"
                        type={showPassphrase ? "text" : "password"}
                        placeholder="Passphrase"
                        value={passphraseInput}
                        onChange={(e) => setPassphraseInput(e.target.value)}
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassphrase(!showPassphrase)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                        aria-label={showPassphrase ? "Hide passphrase" : "Show passphrase"}
                      >
                        {showPassphrase ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg">
                <div className="flex items-start gap-3">
                  <QrCode className="h-5 w-5 text-blue-600 dark:text-blue-300 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Setelah ditandatangani:
                    </p>
                    <p className="text-blue-700 dark:text-blue-200">
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
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
