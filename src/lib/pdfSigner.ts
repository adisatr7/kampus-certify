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
export async function generateSignedPDF(
  doc: UserDocument,
  options?: { accessToken?: string },
): Promise<Blob> {
  const { file_url: originalPdfUrl } = doc;
  let pdfDoc: PDFDocument;

  const shouldUseHtmlSnapshot = !originalPdfUrl;

  // Pre-generate QR code (used both for programmatic and html snapshot flows)
  const qrContent = `${window.location.origin}${import.meta.env.BASE_URL}verify?id=${doc.id}`;
  const qrCodeDataUrl = await QRCode.toDataURL(qrContent, {
    width: 200,
    margin: 2,
    color: {
      dark: "#000000",
      light: "#FFFFFF",
    },
  });

  if (originalPdfUrl) {
    try {
      const fetchOpts: RequestInit = {};
      if (options?.accessToken) {
        fetchOpts.headers = { Authorization: `Bearer ${options.accessToken}` } as HeadersInit;
      }
      const response = await fetch(originalPdfUrl, fetchOpts);
      if (!response.ok) throw new Error(`Failed to fetch original PDF: ${response.status}`);
      const existingPdfBytes = await response.arrayBuffer();
      pdfDoc = await PDFDocument.load(existingPdfBytes);
    } catch (error) {
      console.error("Error fetching original PDF:", error);
      // We enforce using the SignedDocumentTemplate for all signed PDFs.
      // If fetching the original PDF fails, abort rather than falling back
      // to the programmatic generator to avoid visual mismatches.
      throw new Error(
        `Failed to fetch original PDF for document ${doc.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  } else {
    if (shouldUseHtmlSnapshot) {
      try {
        const DPI = 300; // Desired output DPI (changeable)

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
          allowTaint: false,
          backgroundColor: "#ffffff",
          width: widthCssPx,
          height: renderedHeightCss,
          windowWidth: widthCssPx,
          windowHeight: renderedHeightCss,
          logging: true,
        });

        console.debug("Full-page canvas dimensions:", canvas.width, "x", canvas.height);

        // Prefer using canvas.toBlob() and reading the ArrayBuffer — this avoids
        // data URL encoding issues and is generally more reliable for binary data.
        // If toBlob fails (CORS/taint), fall back to toDataURL.
        let pngBytes: Uint8Array;
        try {
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
          if (!blob) {
            console.warn("Full-page toBlob returned null, falling back to toDataURL");
            throw new Error("toBlob failed");
          }
          const ab = await blob.arrayBuffer();
          pngBytes = new Uint8Array(ab);
        } catch (blobErr) {
          console.warn("Full-page toBlob failed, using toDataURL fallback:", blobErr);
          const dataUrl = canvas.toDataURL("image/png");
          const base64 = dataUrl.split(",")[1];
          const binaryString = atob(base64);
          pngBytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            pngBytes[i] = binaryString.charCodeAt(i);
          }
        }

        pdfDoc = await PDFDocument.create();
        const page = pdfDoc.addPage([595.28, 841.89]);

        // Debug: log PNG signature
        const sig = pngBytes.slice(0, 8);
        console.debug(
          "Full-page PNG signature:",
          Array.from(sig)
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" "),
        );
        console.debug("Full-page PNG size:", pngBytes.length, "bytes");

        // Validate PNG signature
        const expectedSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
        const isValidPng = expectedSig.every((byte, i) => pngBytes[i] === byte);
        if (!isValidPng) {
          console.error(
            "Invalid PNG signature! Expected 89 50 4E 47 0D 0A 1A 0A, got:",
            Array.from(sig)
              .map((b) => b.toString(16).padStart(2, "0"))
              .join(" "),
          );
          throw new Error("Full-page canvas produced invalid PNG data");
        }

        const pngImage = await pdfDoc.embedPng(pngBytes);
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
        console.error("html2canvas snapshot failed — aborting (template required):", err);
        throw new Error(
          `Signed document snapshot failed for document ${doc.id}: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }
    } else {
      // This branch would perform programmatic PDF generation. We intentionally
      // remove that path so all PDFs are produced from the SignedDocumentTemplate.
      throw new Error("Programmatic PDF generation is disabled — use SignedDocumentTemplate");
    }
  }

  const pages = pdfDoc.getPages();
  const targetPage = pages[pages.length - 1];

  try {
    const DPI = 300;
    const CSS_DPI = 96;
    const A4_WIDTH_MM = 210;
    const mmToInch = (mm: number) => mm / 25.4;
    const widthCssPx = Math.round(mmToInch(A4_WIDTH_MM) * CSS_DPI);

    const container = document.createElement("div");
    container.style.position = "fixed";
    container.style.left = "-9999px";
    container.style.top = "0";
    container.style.width = `${widthCssPx}px`;
    container.style.minHeight = "400px";
    container.style.background = "transparent";

    const overrideStyle = document.createElement("style");
    overrideStyle.innerText = `
      .max-w-4xl { max-width: none !important; width: 100% !important; }
      html, body { margin: 0; padding: 0; }
      img { max-width: 100%; }
    `;
    container.appendChild(overrideStyle);

    document.body.appendChild(container);
    const root = createRoot(container);

    const renderDoc = { ...doc, qr_code_url: qrCodeDataUrl } as UserDocument;
    root.render(React.createElement(SignedDocumentTemplate, { document: renderDoc }));

    // Wait for React to complete the render by checking for content
    let attempts = 0;
    while (container.scrollHeight === 0 && attempts < 50) {
      await new Promise((res) => setTimeout(res, 50));
      attempts++;
    }

    if (container.scrollHeight === 0) {
      console.error(
        "Container still has zero height after waiting. HTML:",
        container.innerHTML.substring(0, 200),
      );
      throw new Error("React render produced no content in footer container");
    }

    if (document.fonts && document.fonts.ready) {
      try {
        await document.fonts.ready;
      } catch (e) {
        // ignore
      }
    }

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

    // Capture the footer area (marked in the template) or the article as a whole
    // Note: For now, just capture the entire container to ensure we get valid content
    const captureEl = container;

    console.debug(
      "Footer capture element:",
      captureEl.tagName,
      "clientWidth:",
      captureEl.clientWidth,
      "clientHeight:",
      captureEl.clientHeight,
      "scrollHeight:",
      captureEl.scrollHeight,
    );

    // Ensure the element has dimensions before capturing
    if (captureEl.clientWidth === 0 || captureEl.scrollHeight === 0) {
      console.error("Container HTML preview:", container.innerHTML.substring(0, 500));
      throw new Error(
        `Footer capture element has zero dimensions: ${captureEl.clientWidth}x${captureEl.scrollHeight}. This means React hasn't rendered content yet or the template is empty.`,
      );
    }

    // Add a small delay to ensure layout is complete
    await new Promise((res) => setTimeout(res, 100));

    const scale = DPI / CSS_DPI;
    // Use scrollHeight for height since clientHeight may be 0 for offscreen elements
    const captureHeight = Math.max(captureEl.clientHeight, captureEl.scrollHeight, 100);
    const canvas = await html2canvas(captureEl as HTMLElement, {
      scale,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      width: captureEl.clientWidth,
      height: captureHeight,
    });

    console.debug("Footer canvas dimensions:", canvas.width, "x", canvas.height);

    // Check if canvas is empty
    if (canvas.width === 0 || canvas.height === 0) {
      throw new Error(
        `Footer canvas has zero dimensions: ${canvas.width}x${canvas.height}. Element to capture: ${captureEl.tagName} ${captureEl.clientWidth}x${captureEl.clientHeight}`,
      );
    }

    // Try toBlob first, fall back to toDataURL if it fails (CORS/taint issues)
    let footerBytes: Uint8Array;
    try {
      const footerBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
      if (!footerBlob) {
        console.warn("toBlob returned null, falling back to toDataURL");
        throw new Error("toBlob failed");
      }
      const footerAb = await footerBlob.arrayBuffer();
      footerBytes = new Uint8Array(footerAb);
    } catch (blobErr) {
      console.warn("toBlob failed, using toDataURL fallback:", blobErr);
      // Fallback: use toDataURL and decode
      const dataUrl = canvas.toDataURL("image/png");
      const base64 = dataUrl.split(",")[1];
      const binaryString = atob(base64);
      footerBytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        footerBytes[i] = binaryString.charCodeAt(i);
      }
    }

    // Debug: log PNG signature to diagnose "not a PNG" errors
    const sig = footerBytes.slice(0, 8);
    console.debug(
      "Footer PNG signature:",
      Array.from(sig)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(" "),
    );
    console.debug("Footer PNG size:", footerBytes.length, "bytes");

    // Validate PNG signature: should be 89 50 4E 47 0D 0A 1A 0A
    const expectedSig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    const isValidPng = expectedSig.every((byte, i) => footerBytes[i] === byte);
    if (!isValidPng) {
      console.error(
        "Invalid PNG signature! Expected 89 50 4E 47 0D 0A 1A 0A, got:",
        Array.from(sig)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join(" "),
      );
      throw new Error("Footer canvas produced invalid PNG data");
    }

    const footerImg = await pdfDoc.embedPng(footerBytes);

    // Draw footer image on the last page with left/right margins matching programmatic layout
    const marginX = 50;
    // Determine the page size from the target page so width/height are defined
    const { width } = targetPage.getSize();
    const drawWidth = width - marginX * 2;
    const fitScale = drawWidth / footerImg.width;
    const drawHeight = footerImg.height * fitScale;
    const x = marginX;

    // Position the footer at the bottom with proper margin
    const bottomMargin = 40;
    const y = bottomMargin;

    // Overlay the footer on the existing last page (transparent background allows content to show through)
    targetPage.drawImage(footerImg, {
      x,
      y,
      width: drawWidth,
      height: drawHeight,
    });

    root.unmount();
    document.body.removeChild(container);
  } catch (err) {
    console.error("Template overlay failed — aborting signed PDF generation:", err);
    throw err;
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
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
