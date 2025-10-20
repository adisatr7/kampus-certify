import { SupabaseClient } from "@supabase/supabase-js";
import html2canvas from "html2canvas";
import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import React from "react";
import { createRoot } from "react-dom/client";
import SignedDocumentTemplate from "@/components/SignedDocumentTemplate";
import { UserDocument } from "@/types";

/**
 * Generate a signed PDF with QR code and cryptographic signature
 * Based on Indonesian official document format
 */
export async function generateSignedPDF(doc: UserDocument): Promise<Blob> {
  const { file_url: originalPdfUrl } = doc;
  let pdfDoc: PDFDocument;

  const shouldUseHtmlSnapshot = !originalPdfUrl;

  // Pre-generate QR code (used both for programmatic and html snapshot flows)
  const qrContent = `${window.location.origin}${import.meta.env.BASE_URL}/verify?id=${doc.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  // Load existing PDF or create new one. If there is no original PDF, prefer
  // the html2canvas snapshot path to produce a pixel-perfect PDF from the
  // HTML template (identical to the dev preview). If that fails, fall back
  // to the programmatic pdf-lib renderer.
  if (originalPdfUrl) {
    try {
      const response = await fetch(originalPdfUrl);
      const existingPdfBytes = await response.arrayBuffer();
      pdfDoc = await PDFDocument.load(existingPdfBytes);
    } catch (error) {
      console.error("Error loading existing PDF, creating new one:", error);
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      await addDocumentContent(pdfDoc, page, doc.title);
    }
  } else {
    if (shouldUseHtmlSnapshot) {
      try {
        // Robust A4 rendering while preserving responsive layout: render the
        // template at the same CSS viewport used by preview (A4 @ 96 DPI) and
        // ask html2canvas to scale up the raster to the desired DPI. This
        // prevents Tailwind responsive classes from changing and keeps text
        // vertical alignment identical to the preview.
        const DPI = 300; // desired output DPI (changeable)

        // A4 in mm and helper
        const A4_WIDTH_MM = 210;
        const A4_HEIGHT_MM = 297;
        const mmToInch = (mm: number) => mm / 25.4;

        // CSS pixels viewport based on 96 DPI (so Tailwind breakpoints match)
        const CSS_DPI = 96;
        const widthCssPx = Math.round(mmToInch(A4_WIDTH_MM) * CSS_DPI); // ~794
        const heightCssPx = Math.round(mmToInch(A4_HEIGHT_MM) * CSS_DPI); // ~1123

        // Compute scale for html2canvas to reach desired DPI
        const scale = DPI / CSS_DPI; // e.g. 300/96 ~= 3.125

        const container = document.createElement("div");
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = `${widthCssPx}px`;
        // Do NOT set a fixed height or overflow: hidden here — allow the
        // rendered content to size the container so we capture everything.
        container.style.background = "white";

        // Insert a style override to make the template fill the container (disable max-width)
        const overrideStyle = document.createElement("style");
        overrideStyle.innerText = `
          .max-w-4xl { max-width: none !important; width: 100% !important; }
          html, body { margin: 0; padding: 0; }
          img { max-width: 100%; }
        `;
        container.appendChild(overrideStyle);

        document.body.appendChild(container);

        const root = createRoot(container);

        // Pass qr_code_url so the template renders the same QR we expect
        const renderDoc = { ...doc, qr_code_url: qrCodeDataUrl } as UserDocument;
        // Use React.createElement instead of JSX since this is a .ts file
        root.render(React.createElement(SignedDocumentTemplate, { document: renderDoc }));

        // Wait for webfonts to be ready (ensures text metrics match preview)
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (e) {
            // ignore font loading errors and proceed
          }
        }

        // Wait for any images inside the offscreen container to load (e.g., QR)
        const imgs = Array.from(container.querySelectorAll("img")) as HTMLImageElement[];
        await Promise.all(
          imgs.map(
            (img) =>
              new Promise<void>((res) => {
                if (img.complete) return res();
                img.onload = img.onerror = () => res();
              }),
          ),
        );

        // Small extra settle time for layout
        await new Promise((res) => setTimeout(res, 120));

        // Measure the actual rendered height of the template (in CSS px)
        const renderedHeightCss = Math.max(container.scrollHeight, heightCssPx);

        // Capture the container using html2canvas at higher scale so the final
        // canvas has DPI*inch pixels while keeping the same CSS layout.
        // Use the container's rendered height to avoid clipping.
        const canvas = await html2canvas(container as HTMLElement, {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: widthCssPx,
          height: renderedHeightCss,
          windowWidth: widthCssPx,
          windowHeight: renderedHeightCss,
        });

        const dataUrl = canvas.toDataURL("image/png");

        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);
        const pngImage = await pdfDoc.embedPng(dataUrl);
        const { width, height } = page.getSize();

        // Scale the embedded PNG to fit within the A4 page while preserving
        // aspect ratio to avoid cropping. If the captured content is taller
        // than the page, this will scale it down so nothing is cut off.
        const imgW = pngImage.width;
        const imgH = pngImage.height;
        const fitScale = Math.min(width / imgW, height / imgH);
        const drawWidth = imgW * fitScale;
        const drawHeight = imgH * fitScale;
        const x = (width - drawWidth) / 2;
        const y = (height - drawHeight) / 2;

        page.drawImage(pngImage, { x, y, width: drawWidth, height: drawHeight });

        const pdfBytes = await pdfDoc.save();

        root.unmount();
        document.body.removeChild(container);

        return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
      } catch (err) {
        console.error("html2canvas snapshot failed, falling back to pdf-lib generator:", err);
        // Fall through and use the programmatic generator
        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
        await addDocumentContent(pdfDoc, page, doc.title, doc.content);
      }
    } else {
      pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595.28, 841.89]); // A4 size
      await addDocumentContent(pdfDoc, page, doc.title, doc.content);
    }
  }

  // Convert QR code to PDF-compatible format for the programmatic path
  const qrCodeImage = await pdfDoc.embedPng(qrCodeDataUrl);

  // Get the last page to add signature elements
  const pages = pdfDoc.getPages();
  const lastPage = pages[pages.length - 1];
  const { width, height } = lastPage.getSize();

  // Load fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Format dates
  const signedDate = new Date(doc.updated_at ?? doc.created_at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const printDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const documentSignature = (doc.document_signatures ?? []).sort((a, b) => {
    const aTime = a.signed_at ? Date.parse(a.signed_at) : -Infinity;
    const bTime = b.signed_at ? Date.parse(b.signed_at) : -Infinity;
    return bTime - aTime;
  })[0];

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
  const roleTitle = getRoleTitle(documentSignature?.signer?.role ?? doc.user?.role);

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
  const signerNameWidth = helvetica.widthOfTextAtSize(
    documentSignature.signer?.name ?? doc.user?.name,
    10,
  );
  const nameX = width - 50 - qrSize - 10 + (qrSize - signerNameWidth) / 2;
  lastPage.drawText(documentSignature.signer?.name ?? doc.user?.name, {
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
