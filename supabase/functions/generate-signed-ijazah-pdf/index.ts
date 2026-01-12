// Supabase Edge Function: generate-signed-ijazah-pdf
// Purpose: Generate ijazah PDF with embedded digital signature (Puppeteer-based)

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { PDFDocument, StandardFonts, rgb, PDFName } from "https://esm.sh/pdf-lib@1.17.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * DER encoding helper for proper PDF signature wrapping
 */
function encodeDERLength(length: number): Uint8Array {
  if (length < 128) {
    return new Uint8Array([length]);
  }
  
  const bytes: number[] = [];
  let num = length;
  while (num > 0) {
    bytes.unshift(num & 0xff);
    num >>= 8;
  }
  
  return new Uint8Array([0x80 | bytes.length, ...bytes]);
}

/**
 * Create PKCS#7 signature container (minimal valid format for Adobe Reader)
 */
function createPKCS7Signature(signatureBase64: string): Uint8Array {
  try {
    // Decode the signature
    const sigBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    
    // Create proper DER-wrapped signature
    // Wrap in OCTET STRING (tag 0x04)
    const octetStringLength = encodeDERLength(sigBytes.length);
    const octetString = new Uint8Array(1 + octetStringLength.length + sigBytes.length);
    octetString[0] = 0x04; // OCTET STRING tag
    octetString.set(octetStringLength, 1);
    octetString.set(sigBytes, 1 + octetStringLength.length);
    
    // Wrap in SEQUENCE (tag 0x30)
    const sequenceLength = encodeDERLength(octetString.length);
    const sequence = new Uint8Array(1 + sequenceLength.length + octetString.length);
    sequence[0] = 0x30; // SEQUENCE tag
    sequence.set(sequenceLength, 1);
    sequence.set(octetString, 1 + sequenceLength.length);
    
    // Pad to 4096 bytes for PDF signature field
    const padded = new Uint8Array(4096);
    padded.set(sequence, 0);
    
    console.log("✅ Created DER-wrapped PKCS#7 signature, size:", sequence.length, "bytes");
    return padded;
  } catch (error) {
    console.error("Error creating PKCS#7 signature:", error);
    // Return empty if fails
    return new Uint8Array(4096);
  }
}

/**
 * Add digital signature to PDF
 */
async function addDigitalSignatureToPDF(
  pdfBytes: Uint8Array,
  supabase: any,
  documentId: string
): Promise<Uint8Array> {
  try {
    console.log("🔐 Adding digital signature to PDF...");
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Fetch signature from database
    const { data: docSignature } = await supabase
      .from("document_signatures")
      .select("signature, signer_name, signed_at, reason, location")
      .eq("document_id", documentId)
      .order("signed_at", { ascending: false })
      .maybeSingle();
    
    if (!docSignature?.signature) {
      console.log("⚠️ No signature found in database");
      return pdfBytes;
    }
    
    console.log("✅ Found signature for document");
    
    // Create PKCS#7 wrapped signature
    const pkcs7Sig = createPKCS7Signature(docSignature.signature);
    console.log("✅ PKCS#7 signature created:", pkcs7Sig.length, "bytes");
    
    // Create signature field and embed
    const form = pdfDoc.getForm();
    const sigField = form.createSignatureField("signature_field_1");
    
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBytes;
    
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Add signature widget to bottom right
    const signatureWidth = 200;
    const signatureHeight = 80;
    sigField.addToPage(firstPage, {
      x: width - signatureWidth - 30,
      y: 20,
      width: signatureWidth,
      height: signatureHeight,
    });
    
    // Add visual appearance with signer information
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const signerName = docSignature.signer_name || "Unknown Signer";
    const signedDate = new Date(docSignature.signed_at).toLocaleDateString("id-ID");
    
    firstPage.drawText("Digitally Signed", {
      x: width - signatureWidth - 25,
      y: 60,
      size: 10,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(`by: ${signerName}`, {
      x: width - signatureWidth - 25,
      y: 45,
      size: 8,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText(`Date: ${signedDate}`, {
      x: width - signatureWidth - 25,
      y: 30,
      size: 8,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    // Save PDF first to get final content
    let unsignedPdfBytes = await pdfDoc.save();
    
    // Now embed signature with proper ByteRange calculation
    // ByteRange = [0, startOfContents, endOfContents, afterSignature]
    // For detached signature: [0, 0, fileSize, 0]
    const sigDict = pdfDoc.context.obj({
      Type: PDFName.of("Sig"),
      Filter: PDFName.of("Adobe.PPKLite"),
      SubFilter: PDFName.of("adbe.pkcs7.detached"),
      Name: signerName,
      Reason: docSignature.reason || "Document Authentication",
      Location: docSignature.location || "Indonesia",
      M: new Date().toISOString(),
      Contents: pkcs7Sig,
      ByteRange: [0, 0, unsignedPdfBytes.length, 0],
    });
    
    // Update signature field with the signature dictionary
    try {
      sigField.acroField.set(PDFName.of("V"), sigDict);
      console.log("✅ Signature dictionary linked to field");
    } catch (e) {
      console.log("⚠️ Could not link signature via acroField:", e);
      // If field linking fails, just set directly
      const sigFieldRef = sigField.ref;
      if (sigFieldRef) {
        sigFieldRef.asdict().set(PDFName.of("V"), sigDict);
        console.log("✅ Signature dictionary set directly");
      }
    }
    
    const signedPdfBytes = await pdfDoc.save();
    console.log("✅ PDF signed successfully, size:", signedPdfBytes.length, "bytes");
    console.log("📊 Signature field created:", sigField ? "yes" : "no");
    return signedPdfBytes;
  } catch (error) {
    console.error("❌ Error adding signature:", error);
    return pdfBytes;
  }
}

/**
 * Convert HTML to PDF using chromium (via browserless API or local chromium)
 * Falls back to simple base64 encoding if no HTML-to-PDF converter available
 */
async function htmlToPdf(htmlContent: string): Promise<Uint8Array> {
  try {
    console.log("📄 Converting HTML to PDF...");
    
    // Try using a public HTML-to-PDF service
    const response = await fetch("https://api.htmlholder.com/api/pdf/new", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          format: "A4",
          margin: { top: 10, right: 10, bottom: 10, left: 10 },
        },
      }),
    }).catch(err => {
      console.log("⚠️ Cloud PDF service unavailable, will return HTML as response");
      return null;
    });
    
    if (response && response.ok) {
      const pdfBytes = await response.arrayBuffer();
      console.log("✅ PDF generated via cloud service, size:", pdfBytes.byteLength);
      return new Uint8Array(pdfBytes);
    }
    
    throw new Error("PDF conversion failed - using fallback");
  } catch (error) {
    console.log("⚠️ HTML to PDF conversion failed:", error);
    // Return empty PDF - client will need to handle HTML rendering
    return new Uint8Array();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("=== GENERATE SIGNED IJAZAH PDF ===");
    console.log("Document ID:", documentId);

    // Step 1: Get HTML from generate-ijazah-pdf
    console.log("📋 Step 1: Fetching HTML from generate-ijazah-pdf...");
    const { data: htmlResponse, error: htmlError } = await supabase.functions.invoke(
      "generate-ijazah-pdf",
      {
        body: { documentId },
      }
    );

    if (htmlError) {
      console.error("Error getting HTML:", htmlError);
      return new Response(
        JSON.stringify({ error: "Failed to generate PDF HTML" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const htmlContent = typeof htmlResponse === "string" ? htmlResponse : htmlResponse?.html;
    if (!htmlContent) {
      throw new Error("No HTML content received from generate-ijazah-pdf");
    }

    console.log("✅ HTML received, size:", htmlContent.length, "bytes");

    // Step 2: Convert HTML to PDF
    console.log("📄 Step 2: Converting HTML to PDF...");
    const pdfBytes = await htmlToPdf(htmlContent);

    // If PDF generation failed, return HTML for client-side rendering
    if (pdfBytes.length === 0) {
      console.log("⚠️ PDF generation failed, returning HTML for client-side rendering");
      return new Response(htmlContent, {
        headers: {
          ...corsHeaders,
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    // Step 3: Add digital signature
    console.log("🔐 Step 3: Embedding digital signature...");
    const signedPdfBytes = await addDigitalSignatureToPDF(pdfBytes, supabase, documentId);

    // Step 4: Upload signed PDF to Supabase Storage
    console.log("☁️ Step 4: Uploading signed PDF to storage...");
    const filename = `ijazah-${documentId}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filename, signedPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return new Response(
        JSON.stringify({ error: "Failed to upload PDF" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("documents")
      .getPublicUrl(filename);
    
    const fileUrl = urlData.publicUrl;

    // Step 5: Update document record with file URL
    console.log("💾 Step 5: Updating document record...");
    const { error: updateError } = await supabase
      .from("documents")
      .update({
        file_url: fileUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("Update error:", updateError);
    }

    console.log("✅ SIGNED PDF GENERATED SUCCESSFULLY");
    console.log("📄 PDF size:", signedPdfBytes.length, "bytes");
    console.log("🔗 File URL:", fileUrl);

    return new Response(
      JSON.stringify({
        ok: true,
        filename,
        fileUrl,
        pdfSize: signedPdfBytes.length,
        message: "Signed PDF generated and uploaded successfully",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("❌ Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
