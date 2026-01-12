// Supabase Edge Function: convert-html-to-signed-pdf
// Purpose: Convert HTML from generate-ijazah-pdf to PDF and embed digital signature

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
 * Add digital signature to PDF
 */
async function addSignatureToPDF(
  pdfBytes: Uint8Array,
  supabase: any,
  documentId: string
): Promise<Uint8Array> {
  try {
    console.log("🔐 Embedding digital signature...");
    
    const pdfDoc = await PDFDocument.load(pdfBytes);
    
    // Fetch signature from database
    const { data: docSig } = await supabase
      .from("document_signatures")
      .select("signature, signer_name, signed_at")
      .eq("document_id", documentId)
      .order("signed_at", { ascending: false })
      .maybeSingle();
    
    if (!docSig?.signature) {
      console.log("⚠️ No signature found, returning unsigned PDF");
      return pdfBytes;
    }
    
    const pages = pdfDoc.getPages();
    if (pages.length === 0) return pdfBytes;
    
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();
    
    // Create signature field
    const signatureField = pdfDoc.getForm().createSignatureField('adobe_signature');
    const signatureWidth = 200;
    const signatureHeight = 80;
    const signatureX = width - signatureWidth - 50;
    const signatureY = 50;
    
    const signatureWidget = signatureField.acroField.getWidgets()[0];
    signatureWidget.setRectangle({
      x: signatureX,
      y: signatureY,
      width: signatureWidth,
      height: signatureHeight
    });
    
    // Add visual appearance
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const displayName = docSig.signer_name || "Kampus Certify";
    const displayDate = new Date(docSig.signed_at).toLocaleDateString("id-ID");
    
    firstPage.drawText('Digitally Signed', {
      x: signatureX + 10,
      y: signatureY + signatureHeight - 20,
      size: 11,
      font: helvetica,
      color: rgb(0, 0, 0),
    });
    
    firstPage.drawText(`by: ${displayName}`, {
      x: signatureX + 10,
      y: signatureY + signatureHeight - 35,
      size: 8,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText(`Date: ${displayDate}`, {
      x: signatureX + 10,
      y: signatureY + signatureHeight - 50,
      size: 8,
      font: helvetica,
      color: rgb(0.2, 0.2, 0.2),
    });
    
    firstPage.drawText('Kampus Certify', {
      x: signatureX + 10,
      y: signatureY + signatureHeight - 65,
      size: 7,
      font: helvetica,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // Decode and wrap signature in DER format
    let signatureContents = new Uint8Array(4096);
    try {
      const sigBytes = Uint8Array.from(atob(docSig.signature), c => c.charCodeAt(0));
      
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
      
      // Pad to 4096 bytes
      signatureContents.set(sequence, 0);
      console.log("✅ DER-wrapped signature embedded:", sequence.length, "bytes");
    } catch (e) {
      console.warn("⚠️ Failed to wrap signature:", e);
    }
    
    // Create signature dictionary
    const sigDict = pdfDoc.context.obj({
      Type: PDFName.of('Sig'),
      Filter: PDFName.of('Adobe.PPKLite'),
      SubFilter: PDFName.of('adbe.pkcs7.detached'),
      Name: displayName,
      Reason: 'Document Authentication',
      Location: 'Indonesia',
      Contents: signatureContents,
      ByteRange: [0, 0, pdfBytes.length, 0],
    });
    
    signatureField.acroField.set(PDFName.of('V'), sigDict);
    
    const signed = await pdfDoc.save();
    console.log("✅ PDF signed successfully");
    return signed;
  } catch (error) {
    console.error("❌ Error signing PDF:", error);
    return pdfBytes;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { pdfBytes, documentId } = await req.json();
    
    if (!pdfBytes || !documentId) {
      return new Response(
        JSON.stringify({ error: "Missing pdfBytes or documentId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    
    // Convert base64 PDF bytes to Uint8Array
    const pdfUint8 = Uint8Array.from(atob(pdfBytes), c => c.charCodeAt(0));
    
    // Add signature
    const signedPdfUint8 = await addSignatureToPDF(pdfUint8, supabase, documentId);
    
    // Convert back to base64
    const signedBase64 = btoa(String.fromCharCode(...signedPdfUint8));
    
    return new Response(
      JSON.stringify({ signedPdfBytes: signedBase64 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
