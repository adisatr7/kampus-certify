/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Calendar,
  Calendar1,
  Eye,
  EyeOff,
  FileText,
  Loader2,
  PenTool,
  QrCode,
} from "lucide-react";
import { useState } from "react";
import IjazahSignPreview from "@/components/IjazahSignPreview";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
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
import { uploadSignedPDF } from "@/lib/pdfSigner";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";

import { UserDocument } from "@/types";
import { Label } from "../../components/ui/Label";

export default function DocumentSigning() {
  const { toast } = useToast();
  const { userProfile } = useAuth();

  const { data: signingKeys, isLoading: isLoadingKeys } = useFetchSigningKeys(
    userProfile?.id ?? ""
  );
  const { latestKey } = useFetchLatestKey(userProfile?.id ?? "");

  const docsByUserHook = useFetchDocumentsByUserId(
    userProfile?.id ?? "",
    ["pending", "revoked"],
    {
      enabled: userProfile?.role !== "admin",
    }
  );
  const allDocsHook = useFetchAllDocuments({
    enabled: userProfile?.role === "admin",
    status: ["pending", "revoked"],
  });

  // Hook to fetch completed ijazah documents (status = "signed")
  const completedDocsHook = useFetchDocumentsByUserId(
    userProfile?.id ?? "",
    ["signed"],
    {
      enabled: userProfile?.role !== "admin",
    }
  );
  const allCompletedDocsHook = useFetchAllDocuments({
    enabled: userProfile?.role === "admin",
    status: ["signed"],
  });

  const documents =
    (userProfile?.role === "admin" ? allDocsHook.data : docsByUserHook.data) ||
    [];
  const isLoadingDocuments =
    userProfile?.role === "admin"
      ? allDocsHook.isLoading
      : docsByUserHook.isLoading;
  const refetchDocuments =
    userProfile?.role === "admin"
      ? allDocsHook.refetch
      : docsByUserHook.refetch;

  const [passphraseInput, setPassphraseInput] = useState("");
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [isSigning, setIsSigning] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(
    null
  );
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

      // Generate signed PDF using Puppeteer edge function with template support
      console.log(
        "🎯 Generating PDF using Puppeteer edge function with template..."
      );

      const puppeteerResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-ijazah-pdf`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ documentId: selectedDocument.id }),
        }
      );

      if (!puppeteerResponse.ok) {
        const errorText = await puppeteerResponse.text();
        console.error(
          "Puppeteer PDF generation failed:",
          puppeteerResponse.status,
          errorText
        );
        throw new Error(
          `Puppeteer PDF generation failed: ${puppeteerResponse.status} - ${errorText}`
        );
      }

      // Check response content type
      const contentType = puppeteerResponse.headers.get("content-type");
      console.log("Response content-type:", contentType);

      let signedPdfBlob: Blob;

      if (contentType?.includes("text/html")) {
        // Edge function returns HTML - need to convert to PDF in browser
        console.log(
          "📄 Received HTML from edge function, converting to PDF..."
        );
        const htmlText = await puppeteerResponse.text();

        // Create a temporary container to render the HTML
        const tempContainer = document.createElement("div");
        tempContainer.innerHTML = htmlText;
        tempContainer.style.position = "absolute";
        tempContainer.style.left = "-9999px";
        tempContainer.style.top = "-9999px";
        tempContainer.style.width = "794px";
        tempContainer.style.height = "1123px";
        document.body.appendChild(tempContainer);

        // Wait for fonts and images to load
        await new Promise((resolve) => {
          setTimeout(resolve, 2500);
        });

        try {
          // Convert HTML to canvas
          console.log("🎨 Converting HTML to canvas...");
          const canvas = await html2canvas(tempContainer, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: "#ffffff",
            width: 794,
            height: 1123,
          });

          // Convert canvas to image
          const imgData = canvas.toDataURL("image/png");
          console.log("✅ Canvas created, size:", imgData.length, "bytes");

          // Create PDF from image
          console.log("📄 Creating PDF from canvas...");
          const pdfDoc = await PDFDocument.create();
          const page = pdfDoc.addPage([794, 1123]);

          const pngImage = await pdfDoc.embedPng(imgData);
          page.drawImage(pngImage, {
            x: 0,
            y: 0,
            width: 794,
            height: 1123,
          });

          const pdfBytes = await pdfDoc.save();
          const uint8Array = new Uint8Array(
            pdfBytes.buffer as ArrayBuffer,
            pdfBytes.byteOffset,
            pdfBytes.byteLength
          );
          signedPdfBlob = new Blob([uint8Array], { type: "application/pdf" });
          console.log(
            "✅ PDF generated from HTML, size:",
            signedPdfBlob.size,
            "bytes"
          );
        } finally {
          // Clean up temporary container
          document.body.removeChild(tempContainer);
        }
      } else if (contentType?.includes("application/pdf")) {
        // Direct PDF response
        signedPdfBlob = await puppeteerResponse.blob();
        console.log(
          "✅ PDF generated with Puppeteer, size:",
          signedPdfBlob.size,
          "bytes"
        );

        // Validate PDF size
        if (signedPdfBlob.size < 1000) {
          console.warn(
            "PDF size is suspiciously small:",
            signedPdfBlob.size,
            "bytes"
          );
          throw new Error("PDF generation may have failed - file too small");
        }
      } else {
        throw new Error(`Unexpected content-type: ${contentType}`);
      }

      // Upload the generated signed PDF to storage
      console.log("📤 Uploading signed PDF to storage...");
      const signedDocumentUrl = await uploadSignedPDF(
        signedPdfBlob,
        userProfile.id,
        selectedDocument.id,
        supabase
      );

      // If upload fails, throw error
      if (!signedDocumentUrl) {
        console.error(
          "uploadSignedPDF returned null for document",
          selectedDocument.id
        );
        throw new Error("Failed to upload signed PDF");
      }

      console.log("✅ PDF uploaded successfully:", signedDocumentUrl);

      // Get document metadata for workflow handling
      const metadata = (selectedDocument.metadata as any) || {};
      const workflowStage = metadata.workflow_stage;
      const isIjazahWorkflow = selectedDocument.title
        ?.toLowerCase()
        .includes("ijazah");
      const isDekanSigning = workflowStage === "dekan_pending";
      const isRektorSigning = workflowStage === "rektor_pending";

      console.log("📋 Workflow info:", {
        isIjazahWorkflow,
        isDekanSigning,
        isRektorSigning,
        workflowStage,
        selectedDocumentTitle: selectedDocument.title,
        selectedDocumentMetadata: metadata,
      });

      console.log("🔍 Debug - Checking conditions:");
      console.log("  isIjazahWorkflow:", isIjazahWorkflow);
      console.log("  isDekanSigning:", isDekanSigning);
      console.log("  isRektorSigning:", isRektorSigning);
      console.log(
        "  Will enter dekan branch:",
        isIjazahWorkflow && isDekanSigning
      );
      console.log(
        "  Will enter rektor branch:",
        isIjazahWorkflow && isRektorSigning
      );
      console.log(
        "  Will enter else branch:",
        !(isIjazahWorkflow && (isDekanSigning || isRektorSigning))
      );

      // Handle document signing based on workflow stage
      if (isIjazahWorkflow) {
        if (isDekanSigning) {
          console.log(
            "📋 Dekan signing - transferring document to rektor via edge function"
          );

          const rektorId = metadata.rektor_id;
          if (!rektorId) {
            throw new Error("Rektor ID tidak ditemukan dalam metadata");
          }

          // Use edge function to bypass RLS policy for changing user_id
          const { data: sessionData } = await supabase.auth.getSession();
          const accessToken = sessionData.session?.access_token;

          const updateResponse = await fetch(
            `${
              import.meta.env.VITE_SUPABASE_URL
            }/functions/v1/update-document-workflow`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                documentId: selectedDocument.id,
                fileUrl: signedDocumentUrl,
                newUserId: rektorId,
                metadata: {
                  ...metadata,
                  workflow_stage: "rektor_pending",
                  dekan_signed: true,
                  dekan_signed_at: new Date().toISOString(),
                  dekan_qr_code: passphraseInput,
                },
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(
              "Failed to transfer document to rektor:",
              updateResponse.status,
              errorText
            );
            throw new Error(`Failed to transfer document: ${errorText}`);
          }

          console.log(
            "✅ Document transferred to rektor via edge function (status remains pending)"
          );
        } else if (isRektorSigning) {
          console.log("📋 Rektor signing - marking document as complete");

          // Mark document as signed (workflow complete)
          const { error: updateError } = await supabase
            .from("documents")
            .update({
              status: "signed",
              file_url: signedDocumentUrl,
              metadata: {
                ...metadata,
                workflow_stage: "completed",
                rektor_signed: true,
                rektor_signed_at: new Date().toISOString(),
                rektor_qr_code: passphraseInput,
              },
            })
            .eq("id", selectedDocument.id);

          if (updateError) {
            console.error("Failed to mark document as complete:", updateError);
            throw updateError;
          }

          console.log("✅ Document marked as complete (status: signed)");
        }
      } else {
        // For non-ijazah documents: mark as signed immediately
        console.log("📋 Non-ijazah document - marking as 'signed'");

        const { error: updateError } = await supabase
          .from("documents")
          .update({
            status: "signed",
            file_url: signedDocumentUrl,
            metadata: {
              ...metadata,
              signed: true,
              signed_at: new Date().toISOString(),
              qr_code: passphraseInput,
            },
          })
          .eq("id", selectedDocument.id);

        if (updateError) {
          console.error("Failed to update document status:", updateError);
          throw updateError;
        }

        console.log("✅ Document status updated to 'signed'");
      }

      // Call create-signature-record edge function to create signature record for verification
      // This function ONLY creates signature record without changing document status
      console.log(
        "🔐 Creating signature record via create-signature-record edge function..."
      );
      try {
        const { data: signResult, error: signError } =
          await supabase.functions.invoke("create-signature-record", {
            body: {
              documentId: selectedDocument.id,
              signerUserId: userProfile.id,
              passphrase: passphraseInput,
            },
          });

        if (signError) {
          console.error(
            "⚠️ Create-signature-record edge function error:",
            signError
          );
          // Don't throw - document is already signed, just log the error
        } else {
          console.log("✅ Signature record created:", signResult);
        }
      } catch (signErr) {
        console.error("⚠️ Failed to create signature record:", signErr);
        // Don't throw - document is already signed, just log the error
      }

      // Audit and success toast only after full success
      await createAuditEntry(
        userProfile.id,
        "SIGN_DOCUMENT",
        `Menandatangani dokumen "${selectedDocument.title}"`
      );

      if (isIjazahWorkflow && isDekanSigning) {
        toast({
          title: "Berhasil",
          description:
            "Ijazah berhasil ditandatangani dan dikirim ke Rektor. Rektor perlu refresh halaman untuk melihat dokumen.",
        });
      } else {
        toast({
          title: "Berhasil",
          description: "Dokumen berhasil ditandatangani",
        });
      }

      setSelectedDocument(null);
      closeDialog();
    } catch (err) {
      console.error("Gagal menandatangani dokumen:", err);

      toast({
        title: "Error",
        description:
          err?.response?.data?.error || "Gagal menandatangani dokumen",
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

  const handlePreview = (document: UserDocument) => {
    setSelectedDocument(document);
    setIsPreviewOpen(true);
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
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Tanda Tangan Dokumen
            </h1>
            <p className="text-muted-foreground">
              Tandatangani dokumen Anda dengan sertifikat digital
            </p>
          </div>
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
                <h3 className="text-lg font-medium mb-2">
                  Tidak Ada Dokumen Pending
                </h3>
                <p className="text-muted-foreground">
                  Semua dokumen Anda sudah ditandatangani atau belum ada dokumen
                  yang diupload
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul Dokumen</TableHead>
                        {userProfile?.role === "admin" && (
                          <TableHead>Penandatangan</TableHead>
                        )}
                        <TableHead>Status</TableHead>
                        <TableHead>Dibuat</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {documents.map((doc) => (
                        <TableRow key={doc.id}>
                          {/* Judul dokumen */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc.title}</span>
                            </div>
                          </TableCell>

                          {/* (Admin only) Penandatangan */}
                          {userProfile?.role === "admin" && (
                            <TableCell>
                              <div className="font-semibold">
                                {doc.user.name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doc.user.email}
                              </div>
                            </TableCell>
                          )}

                          {/* Status */}
                          <TableCell>
                            <StatusBadge status={doc.status as any} />
                          </TableCell>

                          {/* Dibuat */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(doc.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </span>
                            </div>
                          </TableCell>

                          {/* Aksi */}
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePreview(doc)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </Button>

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

                {/* Mobile Cards */}
                <div className="block md:hidden space-y-4">
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
                          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {doc.title}
                          </CardTitle>
                          <div className="ml-auto">
                            <StatusBadge status={doc.status} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 gap-1">
                        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                          Penandatangan:
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-200">
                          {doc.user.name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-200">
                          {doc.user.email}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 flex flex-row items-center">
                          <Calendar1 className="h-3 w-3 inline-block mr-1 text-muted-foreground" />
                          {new Date(doc.created_at).toLocaleDateString("id-ID")}
                        </p>

                        <div className="flex items-center gap-2 justify-end mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>

                          <Button size="sm" onClick={() => openSignDialog(doc)}>
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

        {/* Completed Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Dokumen Selesai Ditandatangani (
              {(userProfile?.role === "admin"
                ? allCompletedDocsHook.data
                : completedDocsHook.data
              )?.length || 0}
              )
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(
              (userProfile?.role === "admin"
                ? allCompletedDocsHook.data
                : completedDocsHook.data) || []
            ).length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  Tidak Ada Dokumen Selesai
                </h3>
                <p className="text-muted-foreground">
                  Dokumen akan muncul di sini setelah ditandatangani oleh semua
                  pihak
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Judul Dokumen</TableHead>
                        {userProfile?.role === "admin" && (
                          <TableHead>Penerima</TableHead>
                        )}
                        <TableHead>Status</TableHead>
                        <TableHead>Selesai</TableHead>
                        <TableHead>Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(
                        (userProfile?.role === "admin"
                          ? allCompletedDocsHook.data
                          : completedDocsHook.data) || []
                      ).map((doc) => (
                        <TableRow key={doc.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc.title}</span>
                            </div>
                          </TableCell>

                          {userProfile?.role === "admin" && (
                            <TableCell>
                              <div className="font-semibold">
                                {doc.recipient_name}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {doc.recipient_student_number}
                              </div>
                            </TableCell>
                          )}

                          <TableCell>
                            <StatusBadge status={doc.status as any} />
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">
                                {new Date(doc.created_at).toLocaleDateString(
                                  "id-ID"
                                )}
                              </span>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handlePreview(doc)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Lihat
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="block md:hidden space-y-4">
                  {(
                    (userProfile?.role === "admin"
                      ? allCompletedDocsHook.data
                      : completedDocsHook.data) || []
                  ).map((doc) => (
                    <Card
                      key={doc.id}
                      className="border border-slate-200 dark:border-slate-700 shadow-sm bg-white/80 dark:bg-zinc-800 backdrop-blur-sm"
                    >
                      <CardHeader className="border-b border-slate-200/60 dark:border-slate-700/50 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 dark:from-green-400 dark:to-emerald-500">
                            <FileText className="h-5 w-5 text-white" />
                          </div>
                          <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {doc.title}
                          </CardTitle>
                          <div className="ml-auto">
                            <StatusBadge status={doc.status} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 gap-1">
                        <p className="text-sm text-slate-500 dark:text-slate-300 mt-1">
                          Penerima:
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-200">
                          {doc.recipient_name}
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-200">
                          {doc.recipient_student_number}
                        </p>

                        <p className="text-xs text-slate-500 dark:text-slate-300 mt-2 flex flex-row items-center">
                          <Calendar1 className="h-3 w-3 inline-block mr-1 text-muted-foreground" />
                          {new Date(doc.created_at).toLocaleDateString("id-ID")}
                        </p>

                        <div className="flex items-center gap-2 justify-end mt-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePreview(doc)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Lihat
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
        <Dialog open={isSignDialogOpen} onOpenChange={closeDialog}>
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
                    <Label htmlFor="signing-key">
                      Pilih kunci digital untuk menandatangani:
                    </Label>
                    {signingKeys && signingKeys.length > 0 ? (
                      <Select
                        value={selectedKeyId ?? ""}
                        onValueChange={(v) => setSelectedKeyId(v || null)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              isLoadingKeys
                                ? "Memuat kunci digital..."
                                : "Pilih kunci digital..."
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {signingKeys.map((k) => (
                            <SelectItem key={k.kid} value={k.kid}>
                              {k.kid}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        (Tidak ada kunci digital tersedia)
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
                        aria-label={
                          showPassphrase ? "Hide passphrase" : "Show passphrase"
                        }
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
                      Dokumen akan mendapatkan QR code untuk verifikasi dan
                      tidak dapat diubah lagi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={closeDialog}>
                  Batal
                </Button>
                <Button onClick={signDocument} disabled={isSigning}>
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

        {/* Preview Dialog */}
        {selectedDocument && (
          <IjazahSignPreview
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            document={selectedDocument}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
