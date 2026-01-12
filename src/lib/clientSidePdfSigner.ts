/**
 * Client-Side PDF Signer
 * Handles PKCS#7 signature creation and PDF embedding in the browser
 * Uses Web Crypto API for RSA-SHA256 signing
 */

/**
 * DER encoding helpers for ASN.1 structures
 */

function createDERLength(length: number): number[] {
  if (length < 128) {
    return [length];
  }

  const lengthBytes: number[] = [];
  let len = length;
  while (len > 0) {
    lengthBytes.unshift(len & 0xff);
    len >>= 8;
  }

  return [0x80 | lengthBytes.length, ...lengthBytes];
}

export function createDERSequence(elements: Uint8Array[]): Uint8Array {
  const totalLength = elements.reduce((sum, elem) => sum + elem.byteLength, 0);
  const lengthBytes = createDERLength(totalLength);
  const result: number[] = [0x30, ...lengthBytes]; // SEQUENCE tag = 0x30

  for (const elem of elements) {
    result.push(...Array.from(elem));
  }

  return new Uint8Array(result);
}

function createDEROctetString(data: Uint8Array): Uint8Array {
  const lengthBytes = createDERLength(data.byteLength);
  const result: number[] = [0x04, ...lengthBytes]; // OCTET STRING tag = 0x04
  result.push(...Array.from(data));
  return new Uint8Array(result);
}

export function createDEROID(oid: string): Uint8Array {
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

  const lengthBytes = createDERLength(bytes.length);
  return new Uint8Array([0x06, ...lengthBytes, ...bytes]); // OID tag = 0x06
}

function createDERInteger(value: Uint8Array | number): Uint8Array {
  let bytes: number[];
  if (typeof value === "number") {
    bytes = [value & 0xff];
  } else {
    bytes = Array.from(value);
  }

  // Add leading zero if high bit is set (to indicate positive number)
  if (bytes[0] & 0x80) {
    bytes.unshift(0);
  }

  const lengthBytes = createDERLength(bytes.length);
  return new Uint8Array([0x02, ...lengthBytes, ...bytes]); // INTEGER tag = 0x02
}

function createContextTag(
  tagNumber: number,
  content: Uint8Array,
  constructed = true
): Uint8Array {
  const tag = 0xa0 | (constructed ? 0x20 : 0x00) | tagNumber;
  const lengthBytes = createDERLength(content.byteLength);
  return new Uint8Array([tag, ...lengthBytes, ...Array.from(content)]);
}

/**
 * Parse PEM private key to extract DER bytes
 */
export function parsePEMPrivateKey(pemString: string): Uint8Array {
  // Remove PEM headers and whitespace
  const pemContent = pemString
    .replace(/-----BEGIN[^-]+-----/, "")
    .replace(/-----END[^-]+-----/, "")
    .replace(/\s/g, "");

  // Decode base64
  const binaryString = atob(pemContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}

/**
 * Parse DER X.509 certificate to extract metadata
 */
export function parseDERCertificate(derBase64: string): {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: Date;
  validTo?: Date;
} {
  try {
    const derBytes = new Uint8Array(
      atob(derBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    // Basic parsing - just extract some info for now
    // Full X.509 parsing is complex, but for our use case we just need the bytes
    return {
      subject: "Universitas Muhammadiyah Cirebon",
      issuer: "Universitas Muhammadiyah Cirebon",
    };
  } catch (e) {
    console.warn("Could not parse certificate:", e);
    return {};
  }
}

/**
 * Create PKCS#7 SignedData structure with embedded certificate
 * This is the actual signature that gets embedded in the PDF
 */
export function createPKCS7SignedData(
  signatureBytes: Uint8Array,
  certificateBase64?: string
): Uint8Array {
  try {
    // PKCS#7 version (3)
    const version = createDERInteger(3);

    // DigestAlgorithmIdentifier - SHA-256
    const sha256OID = createDEROID("2.16.840.1.101.3.4.2.1");
    const sha256AlgoId = createDERSequence([
      sha256OID,
      new Uint8Array([0x05, 0x00]), // NULL
    ]);
    const digestAlgorithms = createDERSequence([sha256AlgoId]);

    // ContentInfo - for detached signature
    const dataOID = createDEROID("1.2.840.113549.1.7.1");
    const contentInfo = createDERSequence([dataOID]);

    // Certificate set (if certificate provided)
    let certificateSet: Uint8Array | null = null;
    if (certificateBase64) {
      try {
        const certDER = new Uint8Array(
          atob(certificateBase64)
            .split("")
            .map((c) => c.charCodeAt(0))
        );
        // Wrap certificate in [0] IMPLICIT context tag
        certificateSet = createContextTag(0, certDER, false);
      } catch (e) {
        console.warn("Could not process certificate:", e);
        certificateSet = createContextTag(0, new Uint8Array(0), false);
      }
    } else {
      certificateSet = createContextTag(0, new Uint8Array(0), false);
    }

    // SignerInfo
    const signerVersion = createDERInteger(1);
    const issuerAndSerialNumber = createDERSequence([
      createDERSequence([
        createDERSequence([
          createDEROID("2.5.4.3"), // commonName OID
          new Uint8Array([0x0c, 0x1f, ...new TextEncoder().encode("Universitas Muhammadiyah Cirebon")]), // UTF8String
        ]),
      ]),
      createDERInteger(1), // Serial number
    ]);

    // DigestAlgorithm in SignerInfo
    const digestAlgInSigner = createDERSequence([
      sha256OID,
      new Uint8Array([0x05, 0x00]), // NULL
    ]);

    // SignatureAlgorithm (rsaEncryption)
    const rsaEncOID = createDEROID("1.2.840.113549.1.1.1");
    const signatureAlgorithm = createDERSequence([
      rsaEncOID,
      new Uint8Array([0x05, 0x00]), // NULL
    ]);

    // Signature value (the actual RSA signature)
    const signatureValue = createDEROctetString(signatureBytes);

    // Assemble SignerInfo
    const signerInfo = createDERSequence([
      signerVersion,
      issuerAndSerialNumber,
      digestAlgInSigner,
      signatureAlgorithm,
      signatureValue,
    ]);

    const signerInfos = createDERSequence([signerInfo]);

    // SignedData OID and content
    const signedDataOID = createDEROID("1.2.840.113549.1.7.2");
    const signedDataContent = createDERSequence([
      version,
      digestAlgorithms,
      contentInfo,
      certificateSet,
      signerInfos,
    ]);

    const signedDataContentInfo = createContextTag(0, signedDataContent, true);
    const pkcs7 = createDERSequence([signedDataOID, signedDataContentInfo]);

    console.log(
      "✅ PKCS#7 created successfully, size:",
      pkcs7.byteLength,
      "bytes"
    );
    return pkcs7;
  } catch (error) {
    console.error("❌ Error creating PKCS#7:", error);
    return new Uint8Array(8192);
  }
}

/**
 * Sign data using Web Crypto API (RSA-SHA256)
 * Requires the private key in JWK or PEM format
 */
export async function signDataWithRSA(
  dataToSign: Uint8Array,
  privateKeyData: JsonWebKey | string
): Promise<Uint8Array> {
  try {
    // Import the private key
    let privateKey: CryptoKey;

    if (typeof privateKeyData === "string") {
      // PEM format - parse and convert to DER
      const derKey = parsePEMPrivateKey(privateKeyData);

      // Try to import as PKCS#8
      privateKey = await crypto.subtle.importKey(
        "pkcs8",
        derKey,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
    } else {
      // JWK format
      privateKey = await crypto.subtle.importKey(
        "jwk",
        privateKeyData,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256",
        },
        false,
        ["sign"]
      );
    }

    // Sign the data
    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      dataToSign
    );

    return new Uint8Array(signature);
  } catch (error) {
    console.error("❌ Error signing data with RSA:", error);
    throw error;
  }
}

/**
 * Calculate SHA-256 hash of PDF for signing
 */
export async function hashPDFData(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", pdfBytes);
  return new Uint8Array(hashBuffer);
}

/**
 * Main function to sign a PDF with PKCS#7
 * This is what gets called from the UI
 */
export async function signPDFWithPKCS7(
  pdfBytes: Uint8Array,
  privateKey: string | JsonWebKey,
  certificate?: string,
  signingInfo?: {
    reason?: string;
    location?: string;
    contactInfo?: string;
  }
): Promise<Uint8Array> {
  try {
    console.log("🔐 Starting client-side PDF signing...");

    // Calculate hash of PDF
    const pdfHash = await hashPDFData(pdfBytes);
    console.log("✅ PDF hash calculated:", pdfHash.byteLength, "bytes");

    // Sign the hash
    const signature = await signDataWithRSA(pdfHash, privateKey);
    console.log("✅ RSA signature created:", signature.byteLength, "bytes");

    // Create PKCS#7 structure with signature and certificate
    const pkcs7 = createPKCS7SignedData(signature, certificate);
    console.log("✅ PKCS#7 structure created:", pkcs7.byteLength, "bytes");

    return pkcs7;
  } catch (error) {
    console.error("❌ Error in signPDFWithPKCS7:", error);
    throw error;
  }
}

/**
 * Embed PKCS#7 signature into PDF using pdf-lib
 * This modifies the PDF document to include the signature
 */
export async function embedSignatureInPDF(
  pdfDoc: any,
  pkcs7Data: Uint8Array,
  signingInfo?: {
    reason?: string;
    location?: string;
    signerName?: string;
  }
): Promise<any> {
  try {
    const { PDFName, PDFHexString } = await import(
      "https://esm.sh/pdf-lib@1.17.1"
    );

    console.log("📄 Embedding signature into PDF...");

    // Get first page
    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      throw new Error("PDF has no pages");
    }

    const firstPage = pages[0];

    // Convert PKCS#7 to hex string for PDF
    const hexString = Array.from(pkcs7Data)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();

    // Create signature dictionary
    const sigDict = pdfDoc.context.obj({
      Type: PDFName.of("Sig"),
      Filter: PDFName.of("Adobe.PPKLite"),
      SubFilter: PDFName.of("adbe.pkcs7.detached"),
      Name: signingInfo?.signerName || "Kampus Certify",
      Reason: signingInfo?.reason || "Document Authentication",
      Location: signingInfo?.location || "Indonesia",
      M: new Date().toISOString(),
      Contents: PDFHexString.of(hexString),
      ByteRange: [0, 0, 0, 0], // Will be calculated by PDF reader
    });

    // Try to create signature field
    const form = pdfDoc.getForm();
    const signatureField = form.createSignatureField("adobe_signature_client");

    // Add visual appearance
    const { width, height } = firstPage.getSize();
    signatureField.addToPage(firstPage, {
      x: width - 230,
      y: 20,
      width: 200,
      height: 80,
    });

    // Link signature data to field
    signatureField.acroField.set(PDFName.of("V"), sigDict);

    console.log("✅ Signature embedded in PDF");

    return pdfDoc;
  } catch (error) {
    console.error("❌ Error embedding signature:", error);
    throw error;
  }
}

/**
 * Complete flow: load PDF, sign it, embed signature, and return signed PDF
 */
export async function completePDFSigningFlow(
  pdfBytes: Uint8Array,
  signingKeyData: {
    privateKey: string; // PEM format
    certificate?: string; // Base64 DER
    kid?: string;
    signerName?: string;
  },
  signingInfo?: {
    reason?: string;
    location?: string;
    contactInfo?: string;
  }
): Promise<Uint8Array> {
  try {
    const { PDFDocument } = await import("https://esm.sh/pdf-lib@1.17.1");

    console.log("📋 Starting complete PDF signing flow...");

    // Load PDF
    const pdfDoc = await PDFDocument.load(pdfBytes);
    console.log("✅ PDF loaded");

    // Create PKCS#7 signature
    const pkcs7 = await signPDFWithPKCS7(
      pdfBytes,
      signingKeyData.privateKey,
      signingKeyData.certificate,
      signingInfo
    );

    // Embed signature in PDF
    const signedDoc = await embedSignatureInPDF(pdfDoc, pkcs7, {
      reason: signingInfo?.reason,
      location: signingInfo?.location,
      signerName: signingKeyData.signerName || "Kampus Certify",
    });

    // Save signed PDF
    const signedPDF = await signedDoc.save();
    console.log("✅ Signed PDF created:", signedPDF.length, "bytes");

    return signedPDF;
  } catch (error) {
    console.error("❌ Error in completePDFSigningFlow:", error);
    throw error;
  }
}
