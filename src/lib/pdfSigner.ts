import { SupabaseClient } from "@supabase/supabase-js";
import html2canvas from "html2canvas";
import { PDFDocument } from "pdf-lib";
import QRCode from "qrcode";
import { generateIjazahPDF } from "./puppeteerPdfGenerator";
import React from "react";
import { createRoot } from "react-dom/client";
import SignedDocumentTemplate from "@/components/SignedDocumentTemplate";
import SertifikatRenderer from "@/components/SertifikatRenderer";
import IjazahRenderer from "@/components/IjazahRenderer";
import { UserDocument, Sertifikat, DocumentTemplate } from "@/types";
import { createAuditEntry } from "@/lib/audit";

/**
 * Generate a signed PDF with QR code and cryptographic signature
 * Based on Indonesian official document format
 */
export async function generateSignedPDF(
  doc: UserDocument,
  options?: { accessToken?: string; usePuppeteer?: boolean },
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

        // Check document type for orientation (declare once at the top)
        const isIjazahDoc = doc.title?.toLowerCase().includes("ijazah");
        const isSertifikatDoc = doc.title?.toLowerCase().includes("sertifikat");
        
        // A4 dimensions in mm
        const A4_WIDTH_MM = 210;
        const A4_HEIGHT_MM = 297;
        const mmToInch = (mm: number) => mm / 25.4;

        // CSS pixels viewport based on 96 DPI (so Tailwind breakpoints match)
        const CSS_DPI = 96;
        
        // Use landscape for sertifikat, portrait for ijazah
        const widthCssPx = isSertifikatDoc 
          ? Math.round(mmToInch(A4_HEIGHT_MM) * CSS_DPI) // ~1123 (landscape width)
          : Math.round(mmToInch(A4_WIDTH_MM) * CSS_DPI);  // ~794 (portrait width)
        const heightCssPx = isSertifikatDoc 
          ? Math.round(mmToInch(A4_WIDTH_MM) * CSS_DPI)  // ~794 (landscape height)
          : Math.round(mmToInch(A4_HEIGHT_MM) * CSS_DPI); // ~1123 (portrait height)

        // Compute scale for html2canvas to reach desired DPI
        const scale = DPI / CSS_DPI; // e.g. 300/96 ~= 3.125

        container = document.createElement("div");
        container.style.position = "fixed";
        container.style.left = "-9999px";
        container.style.top = "0";
        container.style.width = `${widthCssPx}px`;
        container.style.height = `${heightCssPx}px`;
        container.style.background = isSertifikatDoc ? "#f5f5f0" : "white";

        // Insert a style override to make the template fill the container and match preview styling
        const overrideStyle = document.createElement("style");
        overrideStyle.innerText = `
          .max-w-4xl { max-width: none !important; width: 100% !important; }
          .max-w-5xl { max-width: none !important; width: 100% !important; }
          html, body { margin: 0; padding: 0; }
          img { max-width: 100%; height: auto; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .bg-gray-100 { background-color: #f5f5f0 !important; }
          .bg-gradient-to-br { background: linear-gradient(to bottom right, var(--tw-gradient-stops)) !important; }
          .from-slate-50 { --tw-gradient-from: #f8fafc !important; }
          .to-slate-100 { --tw-gradient-to: #f1f5f9 !important; }
          .shadow-2xl { box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25) !important; }
          .border-amber-500 { border-color: #f59e0b !important; }
          .bg-amber-500 { background-color: #f59e0b !important; }
          .text-white { color: white !important; }
          .font-bold { font-weight: 700 !important; }
          .font-medium { font-weight: 500 !important; }
          .font-semibold { font-weight: 600 !important; }
          /* Preserve Tailwind padding classes for ijazah - FORCE OVERRIDE */
          .p-24, div.p-24, [class*="p-24"] { 
            padding: 6rem !important; 
            box-sizing: border-box !important;
          }
          .p-16, div.p-16, [class*="p-16"] { 
            padding: 4rem !important; 
            box-sizing: border-box !important;
          }
          .px-8, div.px-8, [class*="px-8"] { 
            padding-left: 2rem !important; 
            padding-right: 2rem !important; 
            box-sizing: border-box !important;
          }
          /* Force all padding to be preserved */
          * { box-sizing: border-box !important; }
          .mb-6 { margin-bottom: 1.5rem !important; }
          .mb-4 { margin-bottom: 1rem !important; }
          .mb-2 { margin-bottom: 0.5rem !important; }
          .mt-auto { margin-top: auto !important; }
          .text-center { text-align: center !important; }
          .flex { display: flex !important; }
          .flex-col { flex-direction: column !important; }
          .justify-between { justify-content: space-between !important; }
          .justify-center { justify-content: center !important; }
          .items-start { align-items: flex-start !important; }
          .items-center { align-items: center !important; }
          .items-end { align-items: flex-end !important; }
          .relative { position: relative !important; }
          .absolute { position: absolute !important; }
          .w-full { width: 100% !important; }
          .h-full { height: 100% !important; }
          .flex-1 { flex: 1 1 0% !important; }
          /* Ensure landscape layout for sertifikat */
          ${isSertifikatDoc ? `
            .mb-8 { margin-bottom: 2rem !important; }
            .px-16 { padding-left: 4rem !important; padding-right: 4rem !important; }
          ` : ''}
        `;
        container.appendChild(overrideStyle);

        document.body.appendChild(container);

        root = createRoot(container);

        // Import supabase client
        const { supabase } = await import("@/integrations/supabase/client");

        // Use the document type variables declared above
        if (isIjazahDoc) {
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
          console.log("Ijazah template_id from DB:", ijazahData.template_id);
          
          // Cast ijazahData to include optional fields
          const ijazah = ijazahData as any;
          
          // Get metadata for dekan and rektor info
          const metadata = (doc.metadata as any) || {};
          
          // Fetch dekan data
          const dekanId = ijazah.dekan_id || metadata.dekan_id || metadata.created_by_id || doc.user_id;
          const { data: dekanData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", dekanId)
            .maybeSingle();
          
          // Fetch rektor data
          const rektorId = ijazah.rektor_id || metadata.rektor_id;
          const { data: rektorData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", rektorId)
            .maybeSingle();
          
          console.log("Dekan data:", dekanData);
          console.log("Rektor data:", rektorData);
          
          // Get signing status from metadata
          // IMPORTANT: Only check explicit signing flags in metadata
          // Do NOT fallback to doc.status because it becomes "signed" only after BOTH sign
          // which would incorrectly show both QR codes when only one has signed
          const dekanSigned = !!metadata.dekan_signed;
          const rektorSigned = !!metadata.rektor_signed;
          
          console.log("Signing status:", {
            dekanSigned,
            rektorSigned,
            workflow_stage: metadata.workflow_stage,
            doc_status: doc.status,
            metadata_dekan_signed: metadata.dekan_signed,
            metadata_rektor_signed: metadata.rektor_signed,
          });

          // Always render IjazahRenderer component to ensure consistency with preview
          console.log("Rendering IjazahRenderer component for ijazah");
          console.log("Container dimensions:", widthCssPx, "x", heightCssPx);
          root.render(
            React.createElement(IjazahRenderer, {
              nim: ijazah.nim,
              nomorIjazah: ijazah.nomor_seri || doc.serial || doc.id,
              namaMahasiswa: ijazah.nama_mahasiswa,
              programStudi: ijazah.program_studi || "Teknik Informatika",
              fakultas: ijazah.nama_fakultas,
              gelar: ijazah.gelar,
              tanggalTerbit: ijazah.tanggal_terbit,
              dekanName: dekanData?.name,
              dekanNip: dekanData?.nip,
              rektorName: rektorData?.name,
              rektorNip: rektorData?.nip,
              dekanSigned, // Pass signing status
              rektorSigned, // Pass signing status
              templateId: ijazah.template_id,
              qrCodeUrl: qrContent,
              renderMode: 'pdf-generation',
            })
          );
        } else if (isSertifikatDoc) {
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
          
          // Fetch signer2 data if exists
          const signer2Id = metadata.signer2_id;
          let signer2Data: { name: string; jabatan: string | null } | null = null;
          if (signer2Id) {
            const { data: signer2 } = await supabase
              .from("users")
              .select("name, jabatan")
              .eq("id", signer2Id)
              .maybeSingle();
            signer2Data = signer2;
          }

          // Get signing status from metadata
          // IMPORTANT: Only check explicit signing flags in metadata
          // Do NOT fallback to doc.status because it becomes "signed" only after BOTH sign
          // which would incorrectly show both QR codes when only one has signed
          const signer1Signed = !!metadata.signer1_signed;
          const signer2Signed = !!metadata.signer2_signed;
          
          // Check if there's actually a second signer
          const hasSigner2 = !!(signer2Id && signer2Data?.name);

          console.log("Sertifikat signing status:", { 
            signer1Signed, 
            signer2Signed, 
            signer2Data, 
            hasSigner2,
            signer2Id,
            workflow_stage: metadata.workflow_stage,
            doc_status: doc.status,
            metadata_signer1_signed: metadata.signer1_signed,
            metadata_signer2_signed: metadata.signer2_signed,
          });

          // Render SertifikatRenderer with proper landscape layout
          root.render(
            React.createElement("div", {
              style: {
                backgroundColor: "#f5f5f0",
                padding: "0",
                width: `${widthCssPx}px`,
                height: `${heightCssPx}px`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
              }
            },
              React.createElement(SertifikatRenderer, {
                nomorSertifikat: sertifikatData.nomor_sertifikat,
                namaPeserta: sertifikatData.nama_peserta,
                namaAcara: sertifikatData.nama_acara,
                tanggalAcara: sertifikatData.tanggal_acara,
                penandatanganName: userData?.name,
                penandatanganJabatan: userData?.jabatan || undefined,
                // Only pass signer2 data if there's actually a second signer
                penandatangan2Name: hasSigner2 ? signer2Data?.name : undefined,
                penandatangan2Jabatan: hasSigner2 ? (signer2Data?.jabatan || undefined) : undefined,
                signer1Signed: signer1Signed,
                // signer2Signed only matters if there's a second signer
                signer2Signed: hasSigner2 ? signer2Signed : false,
                templateId: sertifikatData.template_id || undefined,
                qrCodeUrl: qrContent,
                renderMode: "pdf-generation",
              })
            )
          );
        } else {
          // Generic document upload - fetch user data for signature
          console.log("Rendering generic document template for document:", doc.id);
          
          const metadata = (doc.metadata as any) || {};
          const signerId = metadata.signer1_id || doc.user_id;
          
          console.log("Fetching user data for signer:", signerId);
          const { data: userData, error: userError } = await supabase
            .from("users")
            .select("name, nip, jabatan")
            .eq("id", signerId)
            .maybeSingle();
          
          if (userError) {
            console.warn("Error fetching user data:", userError);
          }
          
          console.log("User data fetched for generic document:", userData);
          
          // Pass qr_code_url and user data so the template renders properly
          const renderDoc = { 
            ...doc, 
            qr_code_url: qrCodeDataUrl,
            user: userData ? {
              name: userData.name,
              nip: userData.nip,
              jabatan: userData.jabatan
            } : doc.user
          } as UserDocument;
          
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
        
        // Helper function to convert image URL to data URL
        const imageUrlToDataUrl = async (url: string): Promise<string> => {
          try {
            const response = await fetch(url, { mode: 'no-cors' });
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn('Failed to convert image to data URL:', url, err);
            return url; // Return original URL if conversion fails
          }
        };

        // Convert external QR code images from api.qrserver.com to data URLs
        // This ensures they're embedded directly and not blocked by CORS
        for (const img of imgs) {
          if (img.src && img.src.includes('api.qrserver.com')) {
            try {
              console.log('Converting QR image to data URL:', img.src.substring(0, 80));
              const dataUrl = await imageUrlToDataUrl(img.src);
              img.src = dataUrl;
              console.log('QR image converted to data URL (length:', dataUrl.length, ')');
            } catch (err) {
              console.warn('Failed to convert QR image:', err);
            }
          }
        }

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

        // Debug: log canvas elements present in the rendered container before
        // calling html2canvas. This helps determine if the QR canvas exists
        // in the source DOM (it should be present when renderMode === 'pdf-generation').
        try {
          const canvasesInContainer = Array.from(container.querySelectorAll('canvas')) as HTMLCanvasElement[];
          console.log('Canvases found inside container before capture:', canvasesInContainer.length);
          canvasesInContainer.forEach((c, i) => {
            console.log(`canvas[${i}] width/height:`, c.width, c.height, 'clientW/H:', c.clientWidth, c.clientHeight);
            try {
              const ctx = c.getContext('2d');
              console.log(`canvas[${i}] has context:`, !!ctx);
            } catch (e) {
              console.warn(`canvas[${i}] context check failed:`, e);
            }
          });
        } catch (e) {
          console.warn('Error enumerating canvases in container:', e);
        }

        // Measure the actual rendered height of the template (in CSS px)
        const renderedHeightCss = Math.max(container.scrollHeight, heightCssPx);

        // Capture the container using html2canvas at higher scale so the final
        // canvas has DPI*inch pixels while keeping the same CSS layout.
        // Use the container's rendered height to avoid clipping.
        console.log("Capturing canvas with dimensions:", widthCssPx, "x", renderedHeightCss);
        const canvas = await html2canvas(container as HTMLElement, {
          scale,
          useCORS: true,
          allowTaint: true, // Allow tainted canvas to capture background images
          backgroundColor: isSertifikatDoc ? "#f5f5f0" : "#ffffff", // Match sertifikat background
          width: widthCssPx,
          height: renderedHeightCss,
          windowWidth: widthCssPx,
          windowHeight: renderedHeightCss,
          logging: true,
          foreignObjectRendering: false, // Use native rendering for better background support
          imageTimeout: 15000, // Wait longer for images to load
          onclone: (clonedDoc) => {
            // Ensure all styles are properly applied in the cloned document
            const clonedContainer = clonedDoc.body.querySelector('div');
            if (clonedContainer) {
              clonedContainer.style.fontFamily = "'Times New Roman', serif";
              (clonedContainer.style as any).webkitPrintColorAdjust = "exact";
              clonedContainer.style.printColorAdjust = "exact";
            }

            // Copy canvas contents from the original document into the cloned
            // document. html2canvas clones nodes but doesn't automatically copy
            // the bitmap content of <canvas> elements, so QR canvases can be
            // blank in the clone unless we copy them here.
            try {
              const origCanvases = Array.from(document.querySelectorAll('canvas')) as HTMLCanvasElement[];
              const cloneCanvases = Array.from(clonedDoc.querySelectorAll('canvas')) as HTMLCanvasElement[];

              if (origCanvases.length && cloneCanvases.length) {
                for (let i = 0; i < cloneCanvases.length; i++) {
                  const src = origCanvases[i];
                  const dst = cloneCanvases[i];
                  if (!src || !dst) continue;
                  try {
                    const dstCtx = dst.getContext('2d');
                    if (!dstCtx) continue;
                    // Resize cloned canvas to match source dimensions
                    dst.width = src.width;
                    dst.height = src.height;
                    dstCtx.drawImage(src, 0, 0);
                  } catch (cErr) {
                    // Non-fatal: continue copying other canvases
                    console.warn('Failed to copy canvas content in onclone:', cErr);
                  }
                }
              }
            } catch (err) {
              console.warn('Canvas copy in onclone failed:', err);
            }
          }
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
        // Use landscape orientation for sertifikat, portrait for ijazah
        const page = isSertifikatDoc 
          ? pdfDoc.addPage([841.89, 595.28]) // A4 landscape (width x height)
          : pdfDoc.addPage([595.28, 841.89]); // A4 portrait (width x height)

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

  // Skip footer overlay for sertifikat and ijazah - they already have QR code and signature section
  const isIjazahDoc = doc.title?.toLowerCase().includes("ijazah");
  const isSertifikatDoc = doc.title?.toLowerCase().includes("sertifikat");
  
  if (isIjazahDoc || isSertifikatDoc) {
    console.log("Skipping SignedDocumentTemplate footer overlay for", isIjazahDoc ? "ijazah" : "sertifikat");
    const pdfBytes = await pdfDoc.save();
    return new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" });
  }

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

    // Import supabase client
    const { supabase } = await import("@/integrations/supabase/client");

    // Fetch user data for signature overlay
    const metadata = (doc.metadata as any) || {};
    const signerId = metadata.signer1_id || doc.user_id;
    
    console.log("Fetching user data for footer overlay, signer:", signerId);
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name, nip, jabatan")
      .eq("id", signerId)
      .maybeSingle();
    
    if (userError) {
      console.warn("Error fetching user data for footer:", userError);
    }
    
    console.log("User data fetched for footer overlay:", userData);

    const renderDoc = { 
      ...doc, 
      qr_code_url: qrCodeDataUrl,
      user: userData ? {
        name: userData.name,
        nip: userData.nip,
        jabatan: userData.jabatan
      } : doc.user
    } as UserDocument;
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
  options?: { serverSign?: boolean },
): Promise<string | null> {
  try {
    console.log("=== Upload Signed PDF ===");
    console.log("User ID:", userId);
    console.log("Document ID:", documentId);
    console.log("PDF Blob size:", pdfBlob.size, "bytes");
    console.log("PDF Blob type:", pdfBlob.type);
    
    // Only call the signing server when explicitly requested via options
    const signingServer = import.meta.env.VITE_SIGNING_SERVER_URL as string | undefined;
    const shouldServerSign = options?.serverSign === true;
    if (shouldServerSign && signingServer) {
      try {
        // Audit: sign request
        try {
          await createAuditEntry(userId, "SIGN_DOCUMENT_REQUEST", `Requesting server-side signature for document ${documentId}`);
        } catch (auditErr) {
          console.warn("Failed to create audit entry for sign request:", auditErr);
        }
        console.log("Sending PDF to signing server:", signingServer);
        const arrayBuffer = await pdfBlob.arrayBuffer();
        // convert to base64 safely in chunks
        const bytes = new Uint8Array(arrayBuffer);
        const chunkSize = 0x8000;
        let binary = "";
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
        }
        const b64 = btoa(binary);

        const qrContent = `${window.location.origin}${(import.meta.env.BASE_URL || '/') }verify?id=${documentId}`;
        const resp = await fetch(`${signingServer.replace(/\/$/, "")}/sign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pdfBase64: b64, userId, documentId, qrContent }),
        });
        if (!resp.ok) {
          const txt = await resp.text();
          console.error("Signing server returned error:", resp.status, txt);
          try {
            await createAuditEntry(userId, "SIGN_DOCUMENT_FAILURE", `Signing server error for document ${documentId}: ${resp.status} ${txt}`);
          } catch (auditErr) {
            console.warn("Failed to create audit entry for sign failure:", auditErr);
          }
          // Fall back to uploading unsigned PDF
        } else {
          const json = await resp.json();
          if (json?.signedPdfBase64) {
            const signedB64 = json.signedPdfBase64 as string;
            const signedBinary = atob(signedB64);
            const signedLen = signedBinary.length;
            const signedBytes = new Uint8Array(signedLen);
            for (let i = 0; i < signedLen; i++) signedBytes[i] = signedBinary.charCodeAt(i);
            pdfBlob = new Blob([signedBytes], { type: "application/pdf" });
            console.log("Received signed PDF from signing server, size:", pdfBlob.size);
            try {
              await createAuditEntry(userId, "SIGN_DOCUMENT_SUCCESS", `Server-side signature applied for document ${documentId}, size ${pdfBlob.size} bytes`);
            } catch (auditErr) {
              console.warn("Failed to create audit entry for sign success:", auditErr);
            }
          }
        }
      } catch (signErr) {
        console.error("Error contacting signing server:", signErr);
        try {
          await createAuditEntry(userId, "SIGN_DOCUMENT_FAILURE", `Signing server contact error for document ${documentId}: ${String(signErr)}`);
        } catch (auditErr) {
          console.warn("Failed to create audit entry for sign contact error:", auditErr);
        }
        // proceed to upload unsigned PDF but record in audit later
      }
    }

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
      try {
        await createAuditEntry(userId, "UPLOAD_SIGNED_DOCUMENT_FAILURE", `Upload failed for document ${documentId}: ${uploadError.message}`);
      } catch (auditErr) {
        console.warn("Failed to create audit entry for upload failure:", auditErr);
      }
      return null;
    }

    console.log("Upload successful:", uploadData);
    try {
      await createAuditEntry(userId, "UPLOAD_SIGNED_DOCUMENT", `Signed document uploaded for ${documentId} at ${signedFileName}`);
    } catch (auditErr) {
      console.warn("Failed to create audit entry for upload success:", auditErr);
    }

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
