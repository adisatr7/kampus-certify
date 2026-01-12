import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, PDFName, PDFHexString } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/**
 * Create DER SEQUENCE helper
 */
function createDERSequence(elements: Uint8Array[]): Uint8Array {
  const totalLength = elements.reduce((sum, elem) => sum + elem.byteLength, 0);
  const result: number[] = [0x30]; // SEQUENCE tag

  if (totalLength < 128) {
    result.push(totalLength);
  } else {
    const lengthBytes: number[] = [];
    let len = totalLength;
    while (len > 0) {
      lengthBytes.unshift(len & 0xff);
      len >>= 8;
    }
    result.push(0x80 | lengthBytes.length);
    result.push(...lengthBytes);
  }

  for (const elem of elements) {
    result.push(...Array.from(elem));
  }

  return new Uint8Array(result);
}

/**
 * Create DER OCTET STRING
 */
function createDEROctetString(data: Uint8Array): Uint8Array {
  const result: number[] = [0x04]; // OCTET STRING tag

  if (data.byteLength < 128) {
    result.push(data.byteLength);
  } else {
    const lengthBytes: number[] = [];
    let len = data.byteLength;
    while (len > 0) {
      lengthBytes.unshift(len & 0xff);
      len >>= 8;
    }
    result.push(0x80 | lengthBytes.length);
    result.push(...lengthBytes);
  }

  result.push(...Array.from(data));
  return new Uint8Array(result);
}

/**
 * Create DER OID
 */
function createDEROID(oid: string): Uint8Array {
  const parts = oid.split(".").map(Number);
  const bytes: number[] = [];

  bytes.push(40 * parts[0] + parts[1]);

  for (let i = 2; i < parts.length; i++) {
    const component = parts[i];
    if (component < 128) {
      bytes.push(component);
    } else {
      const componentBytes: number[] = [];
      let val = component;
      while (val > 0) {
        componentBytes.unshift(val & 0x7f);
        val >>= 7;
      }
      for (let j = 0; j < componentBytes.length - 1; j++) {
        bytes.push(componentBytes[j] | 0x80);
      }
      bytes.push(componentBytes[componentBytes.length - 1]);
    }
  }

  const result: number[] = [0x06]; // OID tag
  result.push(bytes.length);
  result.push(...bytes);

  return new Uint8Array(result);
}

/**
 * Create context-specific tag [0]
 */
function createContextTag(tagNumber: number, data: Uint8Array, constructed: boolean = true): Uint8Array {
  const tag = constructed ? 0xa0 : 0x80 | tagNumber;
  const result: number[] = [tag];

  if (data.byteLength < 128) {
    result.push(data.byteLength);
  } else {
    const lengthBytes: number[] = [];
    let len = data.byteLength;
    while (len > 0) {
      lengthBytes.unshift(len & 0xff);
      len >>= 8;
    }
    result.push(0x80 | lengthBytes.length);
    result.push(...lengthBytes);
  }

  result.push(...Array.from(data));
  return new Uint8Array(result);
}

/**
 * Create simple PKCS#7 detached signature with X.509 certificate
 */
function createPKCS7WithCertificate(
  signatureBase64: string,
  certificateBase64: string | null
): Uint8Array {
  try {
    // Decode the signature
    const sigBytes = Uint8Array.from(atob(signatureBase64), c => c.charCodeAt(0));
    
    // If certificate is provided, decode it
    let certificateBytes: Uint8Array | null = null;
    if (certificateBase64) {
      certificateBytes = Uint8Array.from(atob(certificateBase64), c => c.charCodeAt(0));
    }

    // OID for id-signedData (1.2.840.113549.1.7.2)
    const signedDataOID = createDEROID("1.2.840.113549.1.7.2");

    // OID for sha256WithRSAEncryption (1.2.840.113549.1.1.11)
    const signAlgoOID = createDEROID("1.2.840.113549.1.1.11");

    // Wrap signature in OCTET STRING
    const signatureOctetString = createDEROctetString(sigBytes);

    // Create SignerInfo structure
    // SignerInfo ::= SEQUENCE {
    //   version Version,
    //   sid SignerIdentifier,
    //   digestAlgorithm DigestAlgorithmIdentifier,
    //   signatureAlgorithm SignatureAlgorithmIdentifier,
    //   signature OCTET STRING
    // }

    const version = new Uint8Array([0x02, 0x01, 0x01]); // INTEGER 1
    
    // Simple IssuerAndSerialNumber
    const issuerName = new Uint8Array([0x30, 0x00]); // Empty SEQUENCE for issuer
    const serialNumber = new Uint8Array([0x02, 0x01, 0x00]); // INTEGER 0
    const sid = createDERSequence([issuerName, serialNumber]);
    
    // digestAlgorithm: sha256 (2.16.840.1.101.3.4.2.1)
    const digestAlgoOID = createDEROID("2.16.840.1.101.3.4.2.1");
    const digestAlgoParams = new Uint8Array([0x05, 0x00]); // NULL
    const digestAlgo = createDERSequence([digestAlgoOID, digestAlgoParams]);
    
    // signatureAlgorithm
    const signAlgoParams = new Uint8Array([0x05, 0x00]); // NULL
    const signAlgo = createDERSequence([signAlgoOID, signAlgoParams]);

    const signerInfo = createDERSequence([
      version,
      sid,
      digestAlgo,
      signAlgo,
      signatureOctetString
    ]);

    // Create SignedData structure
    // Add certificate if available
    let certificates: Uint8Array | null = null;
    if (certificateBytes) {
      // Wrap certificate in implicit [0] tag
      certificates = createContextTag(0, certificateBytes);
    }

    // ContentInfo for data (1.2.840.113549.1.7.1)
    const dataOID = createDEROID("1.2.840.113549.1.7.1");
    const contentInfo = createDERSequence([dataOID]);

    // DigestAlgorithms
    const digestAlgorithms = createDERSequence([digestAlgo]);

    // Certificates (optional, context tag [0])
    let certField: Uint8Array = new Uint8Array();
    if (certificates) {
      certField = certificates;
    }

    // SignerInfos
    const signerInfos = createDERSequence([signerInfo]);

    // Version
    const versionField = new Uint8Array([0x02, 0x01, 0x01]); // INTEGER 1

    // Assemble SignedData
    let signedDataElements: Uint8Array[] = [
      versionField,
      digestAlgorithms,
      contentInfo,
    ];

    if (certField.byteLength > 0) {
      signedDataElements.push(certField);
    }

    signedDataElements.push(signerInfos);

    const signedData = createDERSequence(signedDataElements);

    // Wrap in ContentInfo
    // contentType: id-signedData
    const finalContentInfo = createDERSequence([
      signedDataOID,
      createContextTag(0, signedData)
    ]);

    return finalContentInfo;
  } catch (error) {
    console.error("Error creating PKCS#7 structure:", error);
    throw error;
  }
}

/**
 * Add digital signature to PDF
 */
async function addSignatureToPDF(
  pdfBytes: Uint8Array,
  signatureBase64: string,
  certificateBase64: string | null
): Promise<Uint8Array> {
  console.log("📝 Adding signature to PDF...");
  console.log("Signature size:", signatureBase64.length);
  console.log("Certificate exists:", !!certificateBase64);

  try {
    // Try loading the PDF; if it fails, attempt simple repair/normalization
    let pdfDoc: any = null;
    try {
      pdfDoc = await PDFDocument.load(pdfBytes);
    } catch (loadErr) {
      console.warn("Initial PDF load failed, attempting repair:", loadErr?.message || loadErr);
      // Try simple repairs: append EOF or startxref if missing
      try {
        const text = Array.from(pdfBytes).map((b) => String.fromCharCode(b)).join("");
        if (!text.includes('%PDF')) {
          throw new Error('Not a PDF (missing %PDF header)');
        }

        let repaired = text;
        const hasEOF = repaired.includes('%%EOF');
        const hasStartXref = repaired.includes('startxref');

        if (!hasEOF) {
          repaired = repaired + '\n%%EOF';
          console.warn('Appended %%EOF to PDF and retrying load');
        }

        if (!hasStartXref) {
          repaired = repaired + '\nstartxref\n0\n%%EOF';
          console.warn('Appended startxref/0 to PDF and retrying load');
        }

        const repairedBytes = Uint8Array.from(atob(btoa(repaired)), c => c.charCodeAt(0));
        pdfDoc = await PDFDocument.load(repairedBytes);
      } catch (repairErr) {
        console.error('PDF repair attempts failed:', repairErr);
        throw repairErr;
      }
    }

    // Normalize PDF by saving without object streams then reloading to ensure
    // conventional xref table which helps embedding signatures in some PDFs.
    try {
      const normalized = await pdfDoc.save({ useObjectStreams: false });
      pdfDoc = await PDFDocument.load(normalized);
      console.log('PDF normalized successfully');
    } catch (normErr) {
      console.warn('PDF normalization failed, continuing with loaded doc:', normErr);
    }
    const pages = pdfDoc.getPages();

    if (pages.length === 0) {
      throw new Error("PDF has no pages");
    }

    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Create PKCS#7 signature with certificate
    const pkcs7Signature = createPKCS7WithCertificate(signatureBase64, certificateBase64);

    // Add signature annotation to the first page
    // Create signature reference dictionary
    const signatureDictionary = pdfDoc.context.obj({
      Type: "Sig",
      Filter: "Adobe.PPKLite",
      SubFilter: "adbe.pkcs7.detached",
      Name: "Digital Signature",
      Reason: "Document Verification",
      M: `D:${new Date().toISOString().replace(/[-T:Z]/g, "")}`,
      Contents: PDFHexString.of(
        Array.from(pkcs7Signature)
          .map(b => b.toString(16).padStart(2, "0"))
          .join("")
      ),
      ByteRange: [0, 1000, 1000, 1000], // Placeholder
    });

    // Add annotation to page
    const annotation = pdfDoc.context.obj({
      Type: "Annot",
      Subtype: "Sig",
      Rect: [50, height - 100, 200, height - 50],
      P: firstPage.ref,
      V: signatureDictionary,
    });

    const annotations = firstPage.node.Annots();
    if (!annotations) {
      firstPage.node.set(PDFName.of("Annots"), pdfDoc.context.obj([annotation]));
    } else {
      annotations.push(annotation);
    }

    // Save the signed PDF
    const signedPdfBytes = await pdfDoc.save();
    console.log("✅ Signature added to PDF");

    return signedPdfBytes;
  } catch (error) {
    console.error("❌ Error adding signature to PDF:", error);
    throw error;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request
    const contentType = req.headers.get("content-type");
    
    if (!contentType?.includes("application/json")) {
      return new Response(
        JSON.stringify({ error: "Content-Type must be application/json" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { pdfBase64, signatureBase64, certificateBase64, documentId } = await req.json();

    console.log("=== EMBED PDF SIGNATURE ===");
    console.log("Document ID:", documentId);
    console.log("Signature size:", signatureBase64?.length || 0);
    console.log("Certificate exists:", !!certificateBase64);

    if (!pdfBase64 || !signatureBase64) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: pdfBase64, signatureBase64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Decode PDF
    const pdfBytes = Uint8Array.from(atob(pdfBase64), c => c.charCodeAt(0));
    
    // Add signature to PDF
    const signedPdfBytes = await addSignatureToPDF(
      pdfBytes,
      signatureBase64,
      certificateBase64 || null
    );

    // Convert to base64 for response
    const signedPdfBase64 = btoa(String.fromCharCode(...signedPdfBytes));

    console.log("✅ PDF with embedded signature prepared");

    return new Response(
      JSON.stringify({
        success: true,
        pdfBase64: signedPdfBase64,
        size: signedPdfBytes.length,
        message: "PDF signature embedded successfully"
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("❌ Error in embed-pdf-signature:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return new Response(
      JSON.stringify({
        error: errorMessage,
        code: "SIGNATURE_EMBED_ERROR"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
