import { SupabaseClient } from "@supabase/supabase-js";
import html2canvas from "html2canvas";
import { PDFDocument, PDFPage, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import React from "react";
import { createRoot } from "react-dom/client";
import SignedDocumentTemplate from "@/components/SignedDocumentTemplate";
import { SertifikatTemplate } from "@/components/SertifikatTemplate";
import IjazahTemplate from "@/components/IjazahTemplate";
import { UserDocument, Sertifikat, Ijazah } from "@/types";

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
  const baseUrl = import.meta.env.BASE_URL || "/";
  const qrContent = `${window.location.origin}${baseUrl}verify?id=${doc.serial ?? doc.id}`;
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
        fetchOpts.headers = { Authorization: `Bearer ${options.accessToken}` };
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
      let container: HTMLDivElement | null = null;
      let root: any = null;
      
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

        container = document.createElement("div");
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

        root = createRoot(container);

        // Import supabase client
        const { supabase } = await import("@/integrations/supabase/client");

        // Check document type
        const isIjazah = doc.title?.toLowerCase().includes("ijazah");
        const isSertifikat = doc.title?.toLowerCase().includes("sertifikat");
        
        if (isIjazah) {
          console.log("Rendering ijazah template for document:", doc.id);
          
          console.log("Fetching ijazah data for document_id:", doc.id);
          const { data: ijazahData, error: ijazahError } = await supabase
            .from("ijazah")
            .select("*")
            .eq("document_id", doc.id)
            .maybeSingle();
          
          if (ijazahError) {
            console.error("Error fetching ijazah data:", ijazahError);
            throw new Error(`Failed to fetch ijazah data: ${ijazahError.message}`);
          }
          
          if (!ijazahData) {
            console.error("Ijazah data not found for document_id:", doc.id);
            throw new Error("Ijazah data not found");
          }
          
          console.log("Ijazah data fetched:", ijazahData);
          
          // Get metadata for dekan and rektor info
          const metadata = (doc.metadata as any) || {};
          
          // Fetch dekan data
          const dekanId = metadata.created_by_id || doc.user_id;
          const { data: dekanData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", dekanId)
            .maybeSingle();
          
          // Fetch rektor data
          const rektorId = metadata.rektor_id;
          const { data: rektorData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", rektorId)
            .maybeSingle();
          
          console.log("Dekan data:", dekanData);
          console.log("Rektor data:", rektorData);
          
          // Render IjazahTemplate
          root.render(
            React.createElement(IjazahTemplate, {
              nim: ijazahData.nim,
              nomorIjazah: ijazahData.nomor_seri || doc.serial || doc.id,
              logoUrl: ijazahData.logo_url || "/logo-umc.svg",
              namaMahasiswa: ijazahData.nama_mahasiswa,
              programStudi: "", // Not in database, can be added later if needed
              fakultas: ijazahData.nama_fakultas,
              gelar: ijazahData.gelar,
              tanggalTerbit: ijazahData.tanggal_terbit,
              dekanName: dekanData?.name,
              dekanNip: dekanData?.nip,
              dekanQrCode: metadata.dekan_qr_code,
              rektorName: rektorData?.name,
              rektorNip: rektorData?.nip,
              rektorQrCode: metadata.rektor_qr_code,
            })
          );
        } else if (isSertifikat) {
          console.log("Rendering sertifikat template for document:", doc.id);
          
          console.log("Fetching sertifikat data for document_id:", doc.id);
          const { data: sertifikatData, error: sertifikatError } = await supabase
            .from("sertifikat")
            .select("*")
            .eq("document_id", doc.id)
            .maybeSingle();
          
          if (sertifikatError) {
            console.error("Error fetching sertifikat data:", sertifikatError);
            throw new Error(`Failed to fetch sertifikat data: ${sertifikatError.message}`);
          }
          
          if (!sertifikatData) {
            console.error("Sertifikat data not found for document_id:", doc.id);
            throw new Error("Sertifikat data not found");
          }
          
          console.log("Sertifikat data fetched:", sertifikatData);
          
          // Fetch user data for penandatangan from document metadata or user_id
          const metadata = (doc.metadata as any) || {};
          const signerId = metadata.signer1_id || doc.user_id;
          
          console.log("Fetching user data for signer:", signerId);
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name, jabatan")
            .eq("id", signerId)
            .maybeSingle();
          
          if (userError) {
            console.warn("Error fetching user data:", userError);
          }
          
          console.log("User data fetched:", userData);
          
          // Render SertifikatTemplate
          root.render(
            React.createElement(SertifikatTemplate, {
              sertifikat: sertifikatData as Sertifikat,
              qrValue: qrContent,
              showQR: true,
              penandatangan1: userData
                ? { name: userData.name, jabatan: userData.jabatan || undefined }
                : undefined,
              templateId: sertifikatData.template_id || "default",
            })
          );
        } else {
          // Pass qr_code_url so the template renders the same QR we expect
          const renderDoc = { ...doc, qr_code_url: qrCodeDataUrl } as UserDocument;
          // Use React.createElement instead of JSX since this is a .ts file
          root.render(React.createElement(SignedDocumentTemplate, { document: renderDoc }));
        }

        // Wait for webfonts to be ready (ensures text metrics match preview)
        if (document.fonts && document.fonts.ready) {
          try {
            await document.fonts.ready;
          } catch (e) {
            // ignore font loading errors and proceed
          }
        }

        // Wait for any images inside the offscreen container to load (e.g., QR, background)
        const imgs = Array.from(container.querySelectorAll("img")) as HTMLImageElement[];
        console.log(`Waiting for ${imgs.length} images to load...`);
        
        // Force images to load by setting crossOrigin
        imgs.forEach((img) => {
          if (!img.crossOrigin) {
            img.crossOrigin = "anonymous";
          }
        });
        
        await Promise.all(
          imgs.map(
            (img, index) =>
              new Promise<void>((res) => {
                if (img.complete && img.naturalWidth > 0) {
                  console.log(`Image ${index + 1}/${imgs.length} already loaded: ${img.src.substring(0, 80)}`);
                  return res();
                }
                console.log(`Waiting for image ${index + 1}/${imgs.length}: ${img.src.substring(0, 80)}`);
                
                const timeout = setTimeout(() => {
                  console.warn(`Image ${index + 1} load timeout: ${img.src}`);
                  res();
                }, 10000);
                
                img.onload = () => {
                  clearTimeout(timeout);
                  console.log(`✅ Image ${index + 1}/${imgs.length} loaded successfully (${img.naturalWidth}x${img.naturalHeight})`);
                  res();
                };
                img.onerror = (e) => {
                  clearTimeout(timeout);
                  console.error(`❌ Image ${index + 1} failed to load: ${img.src}`, e);
                  res(); // Continue even if image fails
                };
              }),
          ),
        );

        // Small extra settle time for layout and background rendering
        console.log("Waiting for layout to settle...");
        await new Promise((res) => setTimeout(res, 1000));

        // Measure the actual rendered height of the template (in CSS px)
        const renderedHeightCss = Math.max(container.scrollHeight, heightCssPx);

        // Capture the container using html2canvas at higher scale so the final
        // canvas has DPI*inch pixels while keeping the same CSS layout.
        // Use the container's rendered height to avoid clipping.
        const canvas = await html2canvas(container as HTMLElement, {
          scale,
          useCORS: true,
          allowTaint: true, // Allow tainted canvas to capture background images
          backgroundColor: "#ffffff",
          width: widthCssPx,
          height: renderedHeightCss,
          windowWidth: widthCssPx,
          windowHeight: renderedHeightCss,
          logging: true,
          foreignObjectRendering: false, // Use native rendering for better background support
          imageTimeout: 15000, // Wait longer for images to load
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
        
        // Cleanup: unmount and remove container if it exists
        try {
          if (root) {
            root.unmount();
          }
          if (container && container.parentNode) {
            document.body.removeChild(container);
          }
        } catch (cleanupErr) {
          console.error("Error during cleanup:", cleanupErr);
        }
        
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
    console.log("=== Upload Signed PDF ===");
    console.log("User ID:", userId);
    console.log("Document ID:", documentId);
    console.log("PDF Blob size:", pdfBlob.size, "bytes");
    console.log("PDF Blob type:", pdfBlob.type);
    
    const signedFileName = `${userId}/${documentId}-signed-${Date.now()}.pdf`;
    console.log("Upload path:", signedFileName);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("signed-documents")
      .upload(signedFileName, pdfBlob, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      console.error("=== Upload Error ===");
      console.error("Error code:", uploadError.message);
      console.error("Error details:", uploadError);
      return null;
    }

    console.log("Upload successful:", uploadData);

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("signed-documents").getPublicUrl(signedFileName);

    console.log("Public URL generated:", publicUrl);
    
    // Verify the file exists by checking if we can get it
    const { data: fileData, error: fileError } = await supabase.storage
      .from("signed-documents")
      .list(userId, {
        search: `${documentId}-signed`,
      });
    
    if (fileError) {
      console.warn("Warning: Could not verify file upload:", fileError);
    } else {
      console.log("File verification:", fileData);
    }

    return publicUrl;
  } catch (error) {
    console.error("=== Exception in uploadSignedPDF ===");
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    console.error("Error stack:", error instanceof Error ? error.stack : "N/A");
    return null;
  }
}
