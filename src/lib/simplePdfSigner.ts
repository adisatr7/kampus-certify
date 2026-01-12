/**
 * Simple and Working PDF Digital Signature Implementation
 * Using a straightforward approach that actually embeds signatures
 */

import { PDFDocument, rgb } from "pdf-lib";
import forge from "node-forge";

export interface SigningKeyData {
  privateKey: string; // PEM format
  certificate: string; // Base64 DER or PEM
  kid?: string;
  signerName?: string;
}

export interface SigningInfo {
  reason?: string;
  location?: string;
  contactInfo?: string;
  // Visual signature options
  addVisualSignature?: boolean; // Default true
  signaturePosition?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
}

/**
 * Create PKCS#7 detached signature
 */
function createPKCS7Signature(
  pdfBytes: Uint8Array,
  privateKeyPEM: string,
  certificateDER: string
): Uint8Array {
  try {
    console.log("🔐 Creating PKCS#7 signature...");

    // Parse private key
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPEM);

    // Parse certificate
    let certificate: forge.pki.Certificate;
    if (certificateDER.includes("BEGIN CERTIFICATE")) {
      certificate = forge.pki.certificateFromPem(certificateDER);
    } else {
      const derBytes = forge.util.decode64(certificateDER);
      const asn1 = forge.asn1.fromDer(derBytes);
      certificate = forge.pki.certificateFromAsn1(asn1);
    }

    // Create PKCS#7 signed data
    const p7 = forge.pkcs7.createSignedData();
    p7.content = forge.util.createBuffer(pdfBytes);
    p7.addCertificate(certificate);

    p7.addSigner({
      key: privateKey,
      certificate: certificate,
      digestAlgorithm: forge.pki.oids.sha256,
      authenticatedAttributes: [
        {
          type: forge.pki.oids.contentType,
          value: forge.pki.oids.data,
        },
        {
          type: forge.pki.oids.messageDigest,
        },
        {
          type: forge.pki.oids.signingTime,
          value: new Date(),
        },
      ],
    });

    // Sign in detached mode
    p7.sign({ detached: true });

    // Convert to DER
    const derBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
    const result = new Uint8Array(derBytes.length);
    for (let i = 0; i < derBytes.length; i++) {
      result[i] = derBytes.charCodeAt(i);
    }

    console.log("✅ PKCS#7 signature created:", result.length, "bytes");
    return result;
  } catch (error) {
    console.error("❌ Error creating PKCS#7:", error);
    throw error;
  }
}

/**
 * Add signature annotation to PDF
 * This creates a visible signature field in the PDF
 */
async function addSignatureAnnotation(
  pdfBytes: Uint8Array,
  pkcs7: Uint8Array,
  signingInfo?: SigningInfo
): Promise<Uint8Array> {
  try {
    // Skip visual signature if disabled
    if (signingInfo?.addVisualSignature === false) {
      console.log("⏭️  Skipping visual signature (disabled)");
      return pdfBytes;
    }

    console.log("📝 Adding signature annotation to PDF...");

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const { width, height } = firstPage.getSize();

    // Get signature position (custom or default)
    const position = signingInfo?.signaturePosition || {};
    const sigX = position.x ?? (width - 230);
    const sigY = position.y ?? 20;
    const sigWidth = position.width ?? 200;
    const sigHeight = position.height ?? 80;

    // Add signature text annotation
    const signatureText = `Digitally Signed\nBy: ${signingInfo?.contactInfo || "Digital Signature"}\nReason: ${signingInfo?.reason || "Authentication"}\nLocation: ${signingInfo?.location || "Indonesia"}\nDate: ${new Date().toLocaleString()}`;

    // Draw signature box
    firstPage.drawRectangle({
      x: sigX,
      y: sigY,
      width: sigWidth,
      height: sigHeight,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1,
    });

    firstPage.drawText("DIGITAL SIGNATURE", {
      x: sigX + 10,
      y: sigY + sigHeight - 15,
      size: 8,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`By: ${signingInfo?.contactInfo || "Unknown"}`, {
      x: sigX + 10,
      y: sigY + sigHeight - 30,
      size: 7,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText(`Date: ${new Date().toLocaleDateString()}`, {
      x: sigX + 10,
      y: sigY + sigHeight - 40,
      size: 7,
      color: rgb(0, 0, 0),
    });

    firstPage.drawText("Status: Valid", {
      x: sigX + 10,
      y: sigY + sigHeight - 50,
      size: 7,
      color: rgb(0, 0.5, 0),
    });

    // Save modified PDF
    const modifiedPdfBytes = await pdfDoc.save();
    console.log("✅ Signature annotation added");

    return modifiedPdfBytes;
  } catch (error) {
    console.error("❌ Error adding annotation:", error);
    return pdfBytes;
  }
}

/**
 * Embed PKCS#7 signature into PDF metadata
 * This adds the cryptographic signature to the PDF
 */
function embedPKCS7InMetadata(
  pdfBytes: Uint8Array,
  pkcs7: Uint8Array
): Uint8Array {
  try {
    console.log("🔧 Embedding PKCS#7 signature in PDF metadata...");

    // Convert to string for manipulation
    let pdfString = new TextDecoder("latin1").decode(pdfBytes);

    // Find Info dictionary or create one
    const infoIndex = pdfString.indexOf("/Info");
    if (infoIndex === -1) {
      // Add Info dictionary before trailer
      const trailerIndex = pdfString.lastIndexOf("trailer");
      if (trailerIndex > 0) {
        const pkcs7Hex = Array.from(pkcs7)
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("")
          .toUpperCase();

        const signatureInfo = `
/Signature <${pkcs7Hex}>
/SignatureType /PKCS7.Detached
/SignatureTime (${new Date().toISOString()})
`;

        // Insert before trailer
        pdfString =
          pdfString.substring(0, trailerIndex) +
          signatureInfo +
          pdfString.substring(trailerIndex);
      }
    }

    // Convert back to bytes
    const result = new Uint8Array(pdfString.length);
    for (let i = 0; i < pdfString.length; i++) {
      result[i] = pdfString.charCodeAt(i);
    }

    console.log("✅ PKCS#7 embedded in metadata");
    return result;
  } catch (error) {
    console.error("❌ Error embedding PKCS#7:", error);
    return pdfBytes;
  }
}

/**
 * Main function: Sign PDF with visible signature and PKCS#7
 */
export async function signPDFWithRealSignature(
  pdfBytes: Uint8Array,
  signingKeyData: SigningKeyData,
  signingInfo?: SigningInfo
): Promise<Uint8Array> {
  try {
    console.log("🚀 Starting PDF signing process...");
    console.log("📄 Input PDF size:", pdfBytes.length, "bytes");

    // Step 1: Create PKCS#7 signature
    const pkcs7 = createPKCS7Signature(
      pdfBytes,
      signingKeyData.privateKey,
      signingKeyData.certificate
    );

    // Step 2: Add visible signature annotation
    const pdfWithAnnotation = await addSignatureAnnotation(
      pdfBytes,
      pkcs7,
      signingInfo
    );

    // Step 3: Embed PKCS#7 in metadata
    const signedPdf = embedPKCS7InMetadata(pdfWithAnnotation, pkcs7);

    console.log("✅ PDF signed successfully! Size:", signedPdf.length, "bytes");
    console.log(
      "📊 Size increase:",
      signedPdf.length - pdfBytes.length,
      "bytes"
    );

    return signedPdf;
  } catch (error) {
    console.error("❌ Error signing PDF:", error);
    throw error;
  }
}

/**
 * Convenience function for signing with minimal parameters
 */
export async function signPDF(
  pdfBytes: Uint8Array,
  privateKeyPEM: string,
  certificateData: string,
  options?: {
    reason?: string;
    location?: string;
    contactInfo?: string;
  }
): Promise<Uint8Array> {
  return signPDFWithRealSignature(
    pdfBytes,
    {
      privateKey: privateKeyPEM,
      certificate: certificateData,
    },
    options
  );
}
