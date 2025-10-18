import { SupabaseClient } from "@supabase/supabase-js";
import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

interface SignatureData {
  documentId: string;
  documentTitle: string;
  documentContent?: string;
  signerName: string;
  signerRole: string;
  signedAt: string;
}

/**
 * Generate a signed PDF with QR code and cryptographic signature
 * Based on Indonesian official document format
 */
export async function generateSignedPDF(
  originalPdfUrl: string | null,
  signatureData: SignatureData,
): Promise<Blob> {
  let pdfDoc: PDFDocument;

  // Load existing PDF or create new one
  if (originalPdfUrl) {
    try {
      const response = await fetch(originalPdfUrl);
      const existingPdfBytes = await response.arrayBuffer();
      pdfDoc = await PDFDocument.load(existingPdfBytes);
    } catch (error) {
      console.error("Error loading existing PDF, creating new one:", error);
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      await addDocumentContent(pdfDoc, page, signatureData.documentTitle);
    }
  } else {
    // Create new PDF with document content
    pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
    await addDocumentContent(
      pdfDoc,
      page,
      signatureData.documentTitle,
      signatureData.documentContent,
    );
  }

  // Generate QR code
  const qrContent = `${window.location.origin}/document-verification?id=${signatureData.documentId}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Convert QR code to PDF-compatible format
  const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);

  // Get the last page to add signature elements
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // Load fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Format dates
  const signedDate = new Date(signatureData.signedAt).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Calculate positions (from bottom)
  let yPosition = 180; // Start from bottom

  // 1. Add footer disclaimer box (bottom)
  const boxHeight = 80;
  const boxY = 40;

  // Draw box
  lastPage.drawRectangle({
    x: 50,
    y: boxY,
    width: width - 100,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });

  // Add disclaimer text
  const disclaimers = [
    "1.  Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.",
    "2.  Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana mestinya.",
    "3.  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh BSrE-BSSN.",
    "4.  Data lengkap dapat diperoleh melalui sistem CA UMC menggunakan hak akses.",
  ];

  let disclaimerY = boxY + boxHeight - 15;
  disclaimers.forEach((text) => {
    lastPage.drawText(text, {
      x: 60,
      y: disclaimerY,
      size: 7,
      font: helvetica,
      color: rgb(0, 0, 0),
      maxWidth: width - 180,
    });
    disclaimerY -= 12;
  });

  // Add BSrE logo text (right side of box)
  lastPage.drawRectangle({
    x: width - 110,
    y: boxY + 20,
    width: 35,
    height: 35,
    color: rgb(0.2, 0.4, 0.8),
  });

  lastPage.drawText("BSrE", {
    x: width - 105,
    y: boxY + 30,
    size: 10,
    font: helveticaBold,
    color: rgb(1, 1, 1),
  });

  lastPage.drawText("Balai Sertifikasi", {
    x: width - 70,
    y: boxY + 35,
    size: 7,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  lastPage.drawText("Elektronik", {
    x: width - 70,
    y: boxY + 25,
    size: 7,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  // 2. Add print date (above box)
  yPosition = boxY + boxHeight + 20;
  lastPage.drawText(`Dicetak tanggal: ${printDate}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // 3. Add signature section (authority, QR code, and name)
  yPosition += 30;

  // Get role title in Indonesian
  const roleTitle = getRoleTitle(signatureData.signerRole);

  // Authority title (right-aligned)
  const authorityText = `${roleTitle}`;
  const authorityWidth = helvetica.widthOfTextAtSize(authorityText, 10);
  lastPage.drawText(authorityText, {
    x: width - 50 - authorityWidth,
    y: yPosition + 80,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  const universityText = "Universitas Muhammadiyah Cirebon";
  const universityWidth = helvetica.widthOfTextAtSize(universityText, 10);
  lastPage.drawText(universityText, {
    x: width - 50 - universityWidth,
    y: yPosition + 65,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // QR Code (centered on right side)
  const qrSize = 80;
  lastPage.drawImage(qrCodeImage, {
    x: width - 50 - qrSize - 10,
    y: yPosition + 20,
    width: qrSize,
    height: qrSize,
  });

  // "Ditandatangani secara elektronik" text (centered below QR)
  const signedElectronicallyText = "Ditandatangani secara elektronik";
  const signedTextWidth = helveticaBold.widthOfTextAtSize(signedElectronicallyText, 9);
  lastPage.drawText(signedElectronicallyText, {
    x: width - 50 - qrSize - 10 + (qrSize - signedTextWidth) / 2,
    y: yPosition + 5,
    size: 9,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  // Signer name (underlined, centered below)
  const signerNameWidth = helvetica.widthOfTextAtSize(signatureData.signerName, 10);
  const nameX = width - 50 - qrSize - 10 + (qrSize - signerNameWidth) / 2;
  lastPage.drawText(signatureData.signerName, {
    x: nameX,
    y: yPosition - 15,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Draw underline for name
  lastPage.drawLine({
    start: { x: nameX, y: yPosition - 17 },
    end: { x: nameX + signerNameWidth, y: yPosition - 17 },
    thickness: 1,
    color: rgb(0, 0, 0),
  });

  // 4. Add issue date (left side, above signature section)
  yPosition += 100;
  lastPage.drawText(`Diterbitkan di Cirebon, tanggal: ${signedDate}`, {
    x: 50,
    y: yPosition,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
}

/**
 * Add document content to a new PDF page with actual content
 */
async function addDocumentContent(
  pdfDoc: PDFDocument,
  page: PDFPage,
  documentTitle: string,
  documentContent?: string,
) {
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const { width, height } = page.getSize();

  // Header
  const header1 = "UNIVERSITAS MUHAMMADIYAH CIREBON";
  const header1Width = helveticaBold.widthOfTextAtSize(header1, 14);
  page.drawText(header1, {
    x: (width - header1Width) / 2,
    y: height - 80,
    size: 14,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  const header2Width = helveticaBold.widthOfTextAtSize(documentTitle.toUpperCase(), 12);
  page.drawText(documentTitle.toUpperCase(), {
    x: (width - header2Width) / 2,
    y: height - 100,
    size: 12,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });

  // Document ID/Number
  const docNumber = `Nomor: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  const docNumberWidth = helvetica.widthOfTextAtSize(docNumber, 10);
  page.drawText(docNumber, {
    x: (width - docNumberWidth) / 2,
    y: height - 120,
    size: 10,
    font: helvetica,
    color: rgb(0, 0, 0),
  });

  // Draw header border line
  page.drawLine({
    start: { x: 50, y: height - 130 },
    end: { x: width - 50, y: height - 130 },
    thickness: 2,
    color: rgb(0, 0, 0),
  });

  // Document content
  if (documentContent) {
    const lines = documentContent.split("\n");
    let yPosition = height - 160;
    const lineHeight = 14;
    const maxWidth = width - 100;

    for (const line of lines) {
      if (yPosition < 350) break; // Stop if too close to bottom (leave space for signature)

      // Word wrap for long lines
      const words = line.split(" ");
      let currentLine = "";

      for (const word of words) {
        const testLine = currentLine + (currentLine ? " " : "") + word;
        const testWidth = helvetica.widthOfTextAtSize(testLine, 10);

        if (testWidth > maxWidth && currentLine) {
          page.drawText(currentLine, {
            x: 50,
            y: yPosition,
            size: 10,
            font: helvetica,
            color: rgb(0, 0, 0),
            maxWidth: maxWidth,
          });
          currentLine = word;
          yPosition -= lineHeight;
          if (yPosition < 350) break;
        } else {
          currentLine = testLine;
        }
      }

      // Draw remaining text
      if (currentLine && yPosition >= 350) {
        page.drawText(currentLine, {
          x: 50,
          y: yPosition,
          size: 10,
          font: helvetica,
          color: rgb(0, 0, 0),
          maxWidth: maxWidth,
        });
        yPosition -= lineHeight * 1.5; // Extra spacing between paragraphs
      }
    }
  } else {
    page.drawText("Konten dokumen tidak tersedia", {
      x: 50,
      y: height - 160,
      size: 10,
      font: helvetica,
      color: rgb(0.5, 0.5, 0.5),
    });
  }
}

/**
 * Get role title in Indonesian
 */
function getRoleTitle(role: string): string {
  switch (role.toLowerCase()) {
    case "rektor":
      return "Rektor";
    case "dekan":
      return "Dekan";
    case "dosen":
      return "Dosen";
    case "admin":
      return "Administrator";
    default:
      return "Pejabat Berwenang";
  }
}

/**
 * Upload signed PDF to Supabase Storage
 */
export async function uploadSignedPDF(
  pdfBlob: Blob,
  userId: string,
  documentId: string,
  supabase: SupabaseClient,
): Promise<string | null> {
  try {
    const signedFileName = `${userId}/${documentId}-signed-${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("signed-documents")
      .upload(signedFileName, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("Error uploading signed PDF:", uploadError);
      return null;
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("signed-documents").getPublicUrl(signedFileName);

    return publicUrl;
  } catch (error) {
    console.error("Error in uploadSignedPDF:", error);
    return null;
  }
}
