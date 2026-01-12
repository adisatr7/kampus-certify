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
  X,
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
import { generateSignedPDF, uploadSignedPDF } from "@/lib/pdfSigner";
import html2canvas from "html2canvas";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";

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
    ["pending"],
    {
      enabled: userProfile?.role !== "admin",
    }
  );
  const allDocsHook = useFetchAllDocuments({
    enabled: userProfile?.role === "admin",
    status: ["pending"],
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

  // Dokumen yang sudah benar-benar final
  // - Untuk ijazah/sertifikat dengan workflow: workflow_stage = "completed"
  // - Untuk dokumen lain yang sudah ditandatangani: status = "signed"
  const rawCompletedDocs =
    (userProfile?.role === "admin"
      ? allCompletedDocsHook.data
      : completedDocsHook.data) || [];

  const completedFinalDocuments = rawCompletedDocs.filter((doc) => {
    const metadata = (doc.metadata || {}) as any;
    const workflowStage = metadata.workflow_stage;

    // Document with workflow (ijazah/sertifikat): must be completed
    if (workflowStage) {
      return workflowStage === "completed";
    }

    // Document without workflow (generic uploads): show if signed
    return doc.status === "signed";
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
  const [isCompletedPreviewOpen, setIsCompletedPreviewOpen] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState<UserDocument | null>(
    null
  );
  const [selectedCompletedDocument, setSelectedCompletedDocument] =
    useState<UserDocument | null>(null);
  const [selectedKeyId, setSelectedKeyId] = useState<string | null>(null);

  const openSignDialog = (document: UserDocument) => {
    setSelectedDocument(document);

    // For admin: automatically select the certificate that belongs to the document owner
    if (
      userProfile?.role === "admin" &&
      signingKeys &&
      signingKeys.length > 0
    ) {
      // Find certificate that belongs to the document's user_id
      const documentOwnerCert = signingKeys.find(
        (k) => k.assigned_to === document.user_id
      );

      if (documentOwnerCert) {
        setSelectedKeyId(documentOwnerCert.kid);
        console.log(
          `Admin: Auto-selected certificate for document owner: ${documentOwnerCert.kid}`
        );
      } else {
        // Fallback to first available key if no match found
        setSelectedKeyId(latestKey || signingKeys[0]?.kid || null);
        console.warn(
          `Admin: No certificate found for document owner (user_id: ${document.user_id}), using fallback`
        );
      }
    } else {
      // For non-admin: use latest or first key
      setSelectedKeyId(latestKey || signingKeys?.[0]?.kid || null);
    }

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

    // CRITICAL: Validate user has an active signing key/certificate
    if (!selectedKeyId || signingKeys.length === 0) {
      toast({
        title: "Error",
        description:
          "Anda tidak memiliki sertifikat digital aktif. Silakan buat sertifikat terlebih dahulu sebelum menandatangani dokumen.",
        variant: "destructive",
      });
      return;
    }

    // Validate passphrase was provided
    if (!passphraseInput || !passphraseInput.trim()) {
      toast({
        title: "Error",
        description: "Passphrase wajib diisi",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);
    try {
      // Sign the document
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      // Determine document type
      const isIjazahDoc = selectedDocument.title
        ?.toLowerCase()
        .includes("ijazah");
      const isSertifikatDoc = selectedDocument.title
        ?.toLowerCase()
        .includes("sertifikat");
      const isUploadedDoc =
        !isIjazahDoc && !isSertifikatDoc && selectedDocument.file_url;

      let signedPdfBlob: Blob;

      if (isSertifikatDoc) {
        // For sertifikat, use client-side PDF generation with SertifikatRenderer
        console.log(
          "🎯 Generating Sertifikat PDF using client-side renderer..."
        );

        // Get current metadata and workflow stage
        const metadata = (selectedDocument.metadata as any) || {};
        const workflowStage = metadata.workflow_stage;
        const isSigner1Signing = workflowStage === "pending_signer1";
        const isSigner2Signing = workflowStage === "pending_signer2";

        // Create updated document with signing status for PDF generation
        // This ensures QR code appears for the current signer
        const updatedMetadata = {
          ...metadata,
          ...(isSigner1Signing
            ? { signer1_signed: true }
            : isSigner2Signing
            ? { signer2_signed: true }
            : { signed: true }),
        };

        const documentForPdf = {
          ...selectedDocument,
          metadata: updatedMetadata,
        };

        signedPdfBlob = await generateSignedPDF(documentForPdf, {
          accessToken,
        });
        console.log(
          "✅ Sertifikat PDF generated, size:",
          signedPdfBlob.size,
          "bytes"
        );
      } else if (isUploadedDoc) {
        // For uploaded documents, use generateSignedPDF to add proper signature section
        console.log(
          "🎯 Generating signed PDF with full signature section for uploaded document..."
        );

        try {
          // Use generateSignedPDF which will:
          // 1. Fetch the original PDF
          // 2. Overlay SignedDocumentTemplate with QR code, name, NIK, and disclaimer
          signedPdfBlob = await generateSignedPDF(selectedDocument, {
            accessToken,
          });

          console.log(
            "✅ Uploaded PDF with signature section ready, size:",
            signedPdfBlob.size,
            "bytes"
          );
        } catch (err) {
          console.error("Failed to process uploaded document:", err);
          throw new Error(
            "Gagal memproses dokumen yang di-upload: " +
              (err instanceof Error ? err.message : String(err))
          );
        }
      } else {
        // For ijazah and other documents, use edge function
        console.log(
          "🎯 Generating PDF using Puppeteer edge function with template..."
        );

        // Determine current signer for ijazah workflow
        const metadata = (selectedDocument.metadata as any) || {};
        const workflowStage = metadata.workflow_stage;
        let currentSigner = undefined;

        if (selectedDocument.title?.toLowerCase().includes("ijazah")) {
          if (workflowStage === "dekan_pending") {
            currentSigner = "dekan";
          } else if (workflowStage === "rektor_pending") {
            currentSigner = "rektor";
          }
        }

        console.log("📋 Current signer for PDF generation:", currentSigner);

        const puppeteerResponse = await fetch(
          `${
            import.meta.env.VITE_SUPABASE_URL
          }/functions/v1/generate-ijazah-pdf`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              documentId: selectedDocument.id,
              currentSigner: currentSigner,
            }),
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
      }

      // REQUEST SERVER-SIDE SIGNING VIA DIRECT SIGNING SERVER API
      console.log(
        "🔐 Calling signing server directly to digitally sign PDF..."
      );
      let signedPdf = signedPdfBlob;
      try {
        // Convert PDF blob to base64
        const reader = new FileReader();
        const pdfBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]); // Get base64 part only
          };
          reader.onerror = reject;
          reader.readAsDataURL(signedPdfBlob);
        });

        const signingServerUrl =
          import.meta.env.VITE_SIGNING_SERVER_URL ||
          `${window.location.origin}/api`;
        console.log("   Signing server URL:", signingServerUrl);

        // Determine signing position based on user role and document type
        let signingPosition = "default"; // default = centered bottom
        const isIjazahDoc = selectedDocument.title
          ?.toLowerCase()
          .includes("ijazah");
        const isSertifikatDoc = selectedDocument.title
          ?.toLowerCase()
          .includes("sertifikat");

        if (isIjazahDoc) {
          // Ijazah: Dekan (left) or Rektor (right)
          if (userProfile?.role === "dekan") {
            signingPosition = "dekan"; // Left signature area
          } else if (userProfile?.role === "rektor") {
            signingPosition = "rektor"; // Right signature area
          }
        } else if (isSertifikatDoc) {
          // Sertifikat: Check workflow stage to determine signer position
          const metadata = (selectedDocument.metadata as any) || {};
          const workflowStage = metadata.workflow_stage;
          if (workflowStage === "pending_signer1") {
            signingPosition = "signer1"; // Left signature area
          } else if (workflowStage === "pending_signer2") {
            signingPosition = "signer2"; // Right signature area
          }
        }
        // else: use default for other document types

        console.log("   Signing position:", signingPosition);

        const signingResponse = await fetch(`${signingServerUrl}/sign`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pdfBase64: pdfBase64,
            userId: userProfile.id,
            userName: userProfile.name || userProfile.email,
            documentId: selectedDocument.id,
            qrContent: `https://kampus-certify.vercel.app/verify/${selectedDocument.id}`,
            signingPosition: signingPosition,
            kid: selectedKeyId,
            passphrase: passphraseInput,
          }),
        });

        if (!signingResponse.ok) {
          let errorMessage = `HTTP ${signingResponse.status}`;

          try {
            // Try to parse JSON error response
            const errorData = await signingResponse.json();
            errorMessage = errorData.error || errorData.message || errorMessage;
          } catch {
            // If not JSON, try to get text
            try {
              const errorText = await signingResponse.text();
              errorMessage = errorText || errorMessage;
            } catch {
              // Fall back to status message
              errorMessage = signingResponse.statusText || errorMessage;
            }
          }

          console.error(
            "❌ Signing server error:",
            signingResponse.status,
            errorMessage
          );
          throw new Error(errorMessage);
        }

        const signingResult = await signingResponse.json();
        console.log("✅ PDF digitally signed by signing server");

        // Decode signed PDF from base64
        const signedPdfBase64 = signingResult.signedPdfBase64;
        const binaryString = atob(signedPdfBase64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        signedPdf = new Blob([bytes], { type: "application/pdf" });
        console.log("✅ Decoded signed PDF, size:", signedPdf.size, "bytes");
      } catch (signingErr) {
        console.warn(
          "⚠️ Direct signing server call failed, will proceed without digital signature:",
          signingErr instanceof Error ? signingErr.message : String(signingErr)
        );
        // Continue without digital signature
      }

      // Upload signed PDF to storage
      console.log("📤 Uploading signed PDF to storage...");
      let uploadedFileUrl: string | null = null;
      try {
        const fileName = `${selectedDocument.id}-signed-${Date.now()}.pdf`;
        const filePath = `${userProfile.id}/${fileName}`;

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("signed-documents")
          .upload(filePath, signedPdf, {
            contentType: "application/pdf",
            upsert: false,
          });

        if (uploadError) {
          console.error("❌ Failed to upload PDF:", uploadError);
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("signed-documents")
          .getPublicUrl(filePath);

        uploadedFileUrl = publicUrlData.publicUrl;
        console.log("✅ PDF uploaded to storage:", uploadedFileUrl);
      } catch (uploadErr) {
        console.error(
          "❌ Upload failed:",
          uploadErr instanceof Error ? uploadErr.message : String(uploadErr)
        );
        throw new Error("Failed to upload signed PDF to storage");
      }

      // Request server-side signing via Supabase Edge Function
      console.log(
        "📤 Requesting server-side signing via Supabase function 'sign-document'..."
      );
      const { data: signResult, error: signError } =
        await supabase.functions.invoke("sign-document", {
          body: {
            documentId: selectedDocument.id,
            signerUserId: userProfile.id,
            passphrase: passphraseInput,
            kid: selectedKeyId,
          },
        });

      if (signError) {
        console.error("Sign-document function error:", signError);
        throw new Error("Server-side signing failed");
      }

      const signedDocumentUrl =
        uploadedFileUrl || signResult?.fileUrl || signResult?.file_url || null;
      console.log("✅ Server-side signing result:", signResult);
      console.log("✅ Final PDF URL:", signedDocumentUrl);

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
                  dekan_signed_by: userProfile.name,
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
                rektor_signed_by: userProfile.name,
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
        // For non-ijazah documents (including sertifikat)
        const isSertifikatWorkflow = selectedDocument.title
          ?.toLowerCase()
          .includes("sertifikat");
        const isSigner1Signing = workflowStage === "pending_signer1";
        const isSigner2Signing = workflowStage === "pending_signer2";
        const hasSigner2 = !!metadata.signer2_id;

        console.log("📋 Sertifikat workflow info:", {
          isSertifikatWorkflow,
          isSigner1Signing,
          isSigner2Signing,
          hasSigner2,
          signer2_id: metadata.signer2_id,
        });

        if (isSertifikatWorkflow && isSigner1Signing && hasSigner2) {
          // Sertifikat with 2 signers - signer1 signing, transfer to signer2
          console.log(
            "📋 Signer1 signing sertifikat - transferring to signer2 via edge function"
          );

          const signer2Id = metadata.signer2_id;

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
                newUserId: signer2Id,
                metadata: {
                  ...metadata,
                  workflow_stage: "pending_signer2",
                  signer1_signed: true,
                  signer1_signed_at: new Date().toISOString(),
                  signer1_signed_by: userProfile.name,
                  signer1_qr_code: passphraseInput,
                },
              }),
            }
          );

          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(
              "Failed to transfer document to signer2:",
              updateResponse.status,
              errorText
            );
            throw new Error(`Failed to transfer document: ${errorText}`);
          }

          console.log(
            "✅ Sertifikat transferred to signer2 via edge function (status remains pending)"
          );
        } else if (
          isSertifikatWorkflow &&
          (isSigner2Signing || (isSigner1Signing && !hasSigner2))
        ) {
          // Sertifikat - final signer (signer2 or signer1 if no signer2)
          console.log(
            "📋 Final signer signing sertifikat - marking as complete"
          );

          const { error: updateError } = await supabase
            .from("documents")
            .update({
              status: "signed",
              file_url: signedDocumentUrl,
              metadata: {
                ...metadata,
                workflow_stage: "completed",
                ...(isSigner2Signing
                  ? {
                      signer2_signed: true,
                      signer2_signed_at: new Date().toISOString(),
                      signer2_signed_by: userProfile.name,
                      signer2_qr_code: passphraseInput,
                    }
                  : {
                      signer1_signed: true,
                      signer1_signed_at: new Date().toISOString(),
                      signer1_signed_by: userProfile.name,
                      signer1_qr_code: passphraseInput,
                    }),
              },
            })
            .eq("id", selectedDocument.id);

          if (updateError) {
            console.error(
              "Failed to mark sertifikat as complete:",
              updateError
            );
            throw updateError;
          }

          console.log("✅ Sertifikat marked as complete (status: signed)");
        } else {
          // For other non-ijazah, non-sertifikat documents: mark as signed immediately
          console.log("📋 Other document - marking as 'signed'");

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
      const docType = selectedDocument.title?.toLowerCase().includes("ijazah")
        ? "ijazah"
        : selectedDocument.title?.toLowerCase().includes("sertifikat")
        ? "sertifikat"
        : "other";
      const auditAction =
        docType === "ijazah"
          ? "IJAZAH_SIGN"
          : docType === "sertifikat"
          ? "SERTIFIKAT_SIGN"
          : "DOCUMENT_SIGN";

      await createAuditEntry(
        userProfile.id,
        auditAction as any,
        `Menandatangani dokumen "${selectedDocument.title}" (Tipe: ${docType})`
      );

      // Determine toast message based on workflow
      const isSertifikatWorkflow = selectedDocument.title
        ?.toLowerCase()
        .includes("sertifikat");
      const hasSigner2 = !!metadata.signer2_id;
      const isSigner1Signing = workflowStage === "pending_signer1";

      if (isIjazahWorkflow && isDekanSigning) {
        toast({
          title: "Berhasil",
          description:
            "Ijazah berhasil ditandatangani dan dikirim ke Rektor. Rektor perlu refresh halaman untuk melihat dokumen.",
        });
      } else if (isSertifikatWorkflow && isSigner1Signing && hasSigner2) {
        toast({
          title: "Berhasil",
          description:
            "Sertifikat berhasil ditandatangani dan dikirim ke penandatangan kedua.",
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

      // Extract error message from various sources
      let errorMessage = "Gagal menandatangani dokumen";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err?.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err?.data?.error) {
        errorMessage = err.data.error;
      }

      toast({
        title: "❌ Tanda Tangan Gagal",
        description: errorMessage,
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

  const handleCompletedPreview = (document: UserDocument) => {
    setSelectedCompletedDocument(document);
    setIsCompletedPreviewOpen(true);
  };

  const handleRejectSignature = async (
    documentId: string,
    documentTitle: string
  ) => {
    if (!userProfile) return;

    console.log(
      "🔍 Starting reject - User:",
      userProfile.id,
      "Role:",
      userProfile.role,
      "Doc:",
      documentId
    );

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Apakah Anda yakin ingin menolak penandatanganan dokumen "${documentTitle}"?`
    );
    if (!confirmed) return;

    try {
      // CRITICAL: Verify user has an active signing certificate
      // Both admin and regular users need a certificate to reject signing
      if (!signingKeys || signingKeys.length === 0) {
        throw new Error(
          "Anda tidak memiliki sertifikat digital aktif. Silakan buat sertifikat digital terlebih dahulu sebelum menolak penandatanganan."
        );
      }

      // Step 2: Verify document exists
      console.log("📄 Fetching document...");
      const { data: doc, error: fetchError } = await supabase
        .from("documents")
        .select("id, document_type, status, user_id")
        .eq("id", documentId)
        .single();

      if (fetchError) {
        console.error("Error fetching document:", fetchError);
        throw new Error(`Dokumen tidak ditemukan: ${fetchError.message}`);
      }

      if (!doc) {
        throw new Error("Dokumen tidak ditemukan");
      }

      console.log("✅ Document found:", doc);

      // Step 3: Update document status - should work now with relaxed RLS
      console.log("✏️ Updating document status to revoked...");
      const { error: updateError, count } = await supabase
        .from("documents")
        .update({
          status: "revoked",
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId);

      console.log("Update result - Count:", count, "Error:", updateError);

      if (updateError) {
        console.error("Update error:", updateError);
        throw new Error(`Gagal update dokumen: ${updateError.message}`);
      }

      if (count === 0) {
        throw new Error(
          "Dokumen tidak dapat diubah - dokumen tidak ditemukan atau akses ditolak"
        );
      }

      console.log("✅ Document rejected successfully");

      // Step 4: Create audit entry
      const docType = doc?.document_type || "other";
      const auditAction =
        docType === "ijazah"
          ? "IJAZAH_REJECT"
          : docType === "sertifikat"
          ? "SERTIFIKAT_REJECT"
          : "DOCUMENT_REJECT";

      await createAuditEntry(
        userProfile.id,
        auditAction as any,
        `Menolak penandatanganan dokumen "${documentTitle}"`
      );

      toast({
        title: "✅ Berhasil",
        description:
          "Dokumen telah ditolak dan dihapus dari daftar penandatanganan",
      });

      // Refetch after delay
      setTimeout(() => {
        refetchDocuments();
      }, 800);
    } catch (error) {
      console.error("❌ Error:", error);
      const msg =
        error instanceof Error ? error.message : "Gagal menolak dokumen";
      toast({
        title: "❌ Error",
        description: msg,
        variant: "destructive",
      });
    }
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
                                title="Preview dokumen"
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

                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() =>
                                  handleRejectSignature(doc.id, doc.title)
                                }
                                title="Tolak penandatanganan"
                              >
                                <X className="h-4 w-4" />
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
                            title="Preview dokumen"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>

                          <Button size="sm" onClick={() => openSignDialog(doc)}>
                            <PenTool className="mr-2 h-4 w-4" />
                            Tanda Tangan
                          </Button>

                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleRejectSignature(doc.id, doc.title)
                            }
                            title="Tolak penandatanganan"
                          >
                            <X className="h-4 w-4" />
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
              Dokumen Selesai Ditandatangani ({completedFinalDocuments.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {completedFinalDocuments.length === 0 ? (
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
                      {completedFinalDocuments.map((doc) => (
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
                              onClick={() => handleCompletedPreview(doc)}
                              title="Preview dokumen"
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
                  {completedFinalDocuments.map((doc) => (
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
                            onClick={() => handleCompletedPreview(doc)}
                            title="Preview dokumen"
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
                      <>
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
                          <SelectContent className="max-w-md">
                            {signingKeys.map((k) => (
                              <SelectItem
                                key={k.kid}
                                value={k.kid}
                                className="cursor-pointer text-left"
                              >
                                {userProfile?.role === "admin" &&
                                k.assigned_to_user ? (
                                  <div className="flex flex-col py-1 text-left">
                                    <span className="font-medium text-sm text-left">
                                      {k.kid}
                                    </span>
                                    <span className="text-xs text-muted-foreground text-left">
                                      {k.assigned_to_user.name} •{" "}
                                      {k.assigned_to_user.email}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="font-medium text-sm text-left">
                                    {k.kid}
                                  </span>
                                )}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        {/* Warning if admin selects wrong certificate */}
                        {userProfile?.role === "admin" &&
                          selectedKeyId &&
                          selectedDocument &&
                          signingKeys.find((k) => k.kid === selectedKeyId)
                            ?.assigned_to !== selectedDocument.user_id && (
                            <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/30 rounded border border-yellow-200 dark:border-yellow-800">
                              <p className="text-xs text-yellow-700 dark:text-yellow-200">
                                ⚠️ Perhatian: Sertifikat yang dipilih bukan
                                milik pemilik dokumen. Dokumen sebaiknya
                                ditandatangani dengan sertifikat milik{" "}
                                <span className="font-semibold">
                                  {selectedDocument.user?.name ||
                                    selectedDocument.user?.email}
                                </span>
                                .
                              </p>
                            </div>
                          )}
                      </>
                    ) : (
                      <div className="bg-red-50 dark:bg-red-950/30 p-3 rounded-lg border border-red-200 dark:border-red-800">
                        <p className="text-sm text-red-700 dark:text-red-200 font-medium">
                          ❌{" "}
                          {userProfile?.role === "admin"
                            ? "Tidak ada sertifikat digital aktif untuk user ini"
                            : "Anda tidak memiliki sertifikat digital aktif"}
                        </p>
                        <p className="text-xs text-red-600 dark:text-red-300 mt-1">
                          {userProfile?.role === "admin"
                            ? "User yang memiliki dokumen ini belum memiliki sertifikat digital. Silakan buat sertifikat untuk user tersebut terlebih dahulu."
                            : "Silakan buat sertifikat digital terlebih dahulu di menu 'Manajemen Sertifikat' sebelum menandatangani dokumen."}
                        </p>
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
                <Button
                  onClick={signDocument}
                  disabled={
                    isSigning || !selectedKeyId || signingKeys.length === 0
                  }
                  title={
                    signingKeys.length === 0
                      ? "Anda tidak memiliki sertifikat digital aktif"
                      : ""
                  }
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

        {/* Preview Dialog for Documents to Sign - Using IjazahSignPreview for ijazah/sertifikat */}
        {selectedDocument && (
          <>
            {selectedDocument.title?.toLowerCase().includes("ijazah") ||
            selectedDocument.title?.toLowerCase().includes("sertifikat") ? (
              <IjazahSignPreview
                isOpen={isPreviewOpen}
                onClose={() => setIsPreviewOpen(false)}
                document={selectedDocument}
              />
            ) : (
              <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
                  <DialogHeader>
                    <DialogTitle>{selectedDocument.title}</DialogTitle>
                  </DialogHeader>
                  <div className="flex-1 overflow-auto">
                    {selectedDocument.file_url ? (
                      <>
                        {selectedDocument.file_url
                          .toLowerCase()
                          .endsWith(".pdf") ? (
                          <iframe
                            src={selectedDocument.file_url}
                            className="w-full h-full min-h-[500px]"
                            title="PDF Preview"
                          />
                        ) : (
                          <div className="p-8 text-center">
                            <p className="text-muted-foreground mb-4">
                              Dokumen ini tidak dapat ditampilkan di preview.
                              Klik tombol Download untuk melihat file.
                            </p>
                            <Button
                              onClick={() => {
                                const link = document.createElement("a");
                                link.href = selectedDocument.file_url!;
                                link.download = selectedDocument.title;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              Download {selectedDocument.title}
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        Tidak ada file untuk ditampilkan.
                      </div>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </>
        )}

        {/* Preview Dialog for Completed Documents - PDF only */}
        {selectedCompletedDocument && (
          <Dialog
            open={isCompletedPreviewOpen}
            onOpenChange={setIsCompletedPreviewOpen}
          >
            <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>{selectedCompletedDocument.title}</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-auto">
                {selectedCompletedDocument.file_url ? (
                  <iframe
                    src={selectedCompletedDocument.file_url}
                    className="w-full h-full min-h-[500px]"
                    title="PDF Preview"
                  />
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    PDF belum tersedia untuk ditampilkan.
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DashboardLayout>
  );
}
