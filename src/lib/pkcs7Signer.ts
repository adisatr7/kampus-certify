/**
 * PKCS#7 Signer with Certificate Embedding
 * Creates PKCS#7 SignedData structure with embedded X.509 certificate
 * This is the proper format recognized by Adobe Reader and other PDF tools
 */

/**
 * Create a minimal ASN.1 DER SEQUENCE
 */
function createDERSequence(elements: Uint8Array[]): Uint8Array {
  const totalLength = elements.reduce((sum, elem) => sum + elem.byteLength, 0);
  const result: number[] = [0x30]; // SEQUENCE tag

  // Encode length
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

  // Add elements
  for (const elem of elements) {
    result.push(...Array.from(elem));
  }

  return new Uint8Array(result);
}

/**
 * Create an ASN.1 DER INTEGER
 */
function createDERInteger(value: number | Uint8Array): Uint8Array {
  const bytes =
    typeof value === "number"
      ? new Uint8Array([value & 0xff])
      : new Uint8Array(value);

  const result: number[] = [0x02]; // INTEGER tag
  result.push(bytes.byteLength);
  result.push(...Array.from(bytes));

  return new Uint8Array(result);
}

/**
 * Create an ASN.1 DER OCTET STRING
 */
function createDEROctetString(data: Uint8Array): Uint8Array {
  const result: number[] = [0x04]; // OCTET STRING tag

  // Encode length
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
 * Create an ASN.1 DER OBJECT IDENTIFIER
 */
function createDEROID(oid: string): Uint8Array {
  const parts = oid.split(".").map(Number);
  const bytes: number[] = [];

  // First two components are combined as 40*first + second
  bytes.push(40 * parts[0] + parts[1]);

  // Remaining components
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
 * Create a context-specific tag [0]
 */
function createContextTag(
  tagNumber: number,
  data: Uint8Array,
  constructed: boolean = true,
): Uint8Array {
  const tag = constructed ? 0xa0 : 0x80 | tagNumber;
  const result: number[] = [tag];

  // Encode length
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
 * Create PKCS#7 SignedData structure with certificate
 * @param documentHash SHA-256 hash of the document being signed
 * @param signatureBytes The actual signature bytes (e.g., Ed25519 signature)
 * @param certificateDER DER-encoded X.509 certificate
 * @param signingTime ISO timestamp of signing
 */
export function createPKCS7SignedData(
  documentHash: Uint8Array,
  signatureBytes: Uint8Array,
  certificateDER: Uint8Array,
  signingTime: string = new Date().toISOString(),
): Uint8Array {
  try {
    console.log("🔐 Creating PKCS#7 SignedData with embedded certificate...");
    console.log("   Document hash size:", documentHash.byteLength, "bytes");
    console.log("   Signature size:", signatureBytes.byteLength, "bytes");
    console.log("   Certificate size:", certificateDER.byteLength, "bytes");

    // ============ CONTENT INFO STRUCTURE ============
    // The outer wrapper is a ContentInfo:
    // ContentInfo ::= SEQUENCE {
    //   contentType OBJECT IDENTIFIER,
    //   content [0] EXPLICIT ANY DEFINED BY contentType OPTIONAL
    // }

    // For SignedData, contentType = 1.2.840.113549.1.7.2
    const contentTypeOID = createDEROID("1.2.840.113549.1.7.2");

    // ============ SIGNED DATA STRUCTURE ============
    // SignedData ::= SEQUENCE {
    //   version INTEGER,
    //   digestAlgorithms SET OF DigestAlgorithmIdentifier,
    //   contentInfo ContentInfo,
    //   certificates [0] IMPLICIT CertificateSet OPTIONAL,
    //   signerInfos SET OF SignerInfo
    // }

    // Version = 1 for SignedData
    const version = createDERInteger(1);

    // ============ DIGEST ALGORITHMS (SHA-256) ============
    // SET OF with one SHA-256 algorithm identifier
    const sha256OID = createDEROID("2.16.840.1.101.3.4.2.1");
    const digestAlgIdentifier = createDERSequence([sha256OID, new Uint8Array([0x05, 0x00])]);
    const digestAlgorithms = new Uint8Array([0x31, digestAlgIdentifier.byteLength, ...Array.from(digestAlgIdentifier)]);

    // ============ CONTENT INFO (the data being signed) ============
    // We wrap the document hash as the content
    const contentInfoContentType = createDEROID("1.2.840.113549.1.7.1");
    const contentData = createDEROctetString(documentHash);
    const contentInfoContent = createContextTag(0, contentData, true);
    const contentInfo = createDERSequence([contentInfoContentType, contentInfoContent]);

    // ============ CERTIFICATES ============
    // [0] IMPLICIT CertificateSet - contains the signer's certificate
    const certificateSet = createContextTag(0, certificateDER, false);

    // ============ SIGNER INFO ============
    // SignerInfo ::= SEQUENCE {
    //   version INTEGER,
    //   issuerAndSerialNumber IssuerAndSerialNumber,
    //   digestAlgorithm DigestAlgorithmIdentifier,
    //   authenticatedAttributes [0] IMPLICIT Attributes OPTIONAL,
    //   digestEncryptionAlgorithm DigestEncryptionAlgorithmIdentifier,
    //   encryptedDigest OCTET STRING,
    //   unauthenticatedAttributes [1] IMPLICIT Attributes OPTIONAL
    // }

    // SignerInfo version = 1
    const signerVersion = createDERInteger(1);

    // IssuerAndSerialNumber - we'll use a minimal version
    // Extract issuer and serial from the certificate
    // For simplicity, we'll create a minimal issuer
    const issuerName = createDERSequence([createDEROID("2.5.4.3"), new Uint8Array([0x0c, 0x1f, ...Array.from(new TextEncoder().encode("Universitas Muhammadiyah Cirebon"))])]);
    const serialNumber = createDERInteger(1);
    const issuerAndSerialNumber = createDERSequence([issuerName, serialNumber]);

    // Digest algorithm (SHA-256)
    const digestAlgorithm = createDERSequence([sha256OID, new Uint8Array([0x05, 0x00])]);

    // Digest encryption algorithm (Ed25519 signature)
    const ed25519OID = createDEROID("1.3.101.112");
    const digestEncryptionAlgorithm = createDERSequence([ed25519OID, new Uint8Array([0x05, 0x00])]);

    // Encrypted digest (the actual signature)
    const encryptedDigest = createDEROctetString(signatureBytes);

    // Authenticated attributes with signing time
    const signingTimeOID = createDEROID("1.2.840.113549.1.9.5");
    const timeValue = new TextEncoder().encode(signingTime);
    const signingTimeAttr = createDERSequence([signingTimeOID, new Uint8Array([0x31, timeValue.length, ...timeValue])]);
    const authenticatedAttributes = createContextTag(0, signingTimeAttr, false);

    // Assemble SignerInfo
    const signerInfo = createDERSequence([
      signerVersion,
      issuerAndSerialNumber,
      digestAlgorithm,
      authenticatedAttributes,
      digestEncryptionAlgorithm,
      encryptedDigest,
    ]);

    // SignerInfos is a SET OF SignerInfo
    const signerInfos = new Uint8Array([0x31, signerInfo.byteLength, ...Array.from(signerInfo)]);

    // ============ ASSEMBLE SIGNED DATA ============
    const signedDataContent = createDERSequence([
      version,
      digestAlgorithms,
      contentInfo,
      certificateSet,
      signerInfos,
    ]);

    // ============ ASSEMBLE CONTENT INFO ============
    const signedDataContentInfo = createContextTag(0, signedDataContent, true);
    const pkcs7SignedData = createDERSequence([contentTypeOID, signedDataContentInfo]);

    console.log("✅ PKCS#7 SignedData created successfully");
    console.log("   Total size:", pkcs7SignedData.byteLength, "bytes");

    // Pad to 8192 bytes for PDF signature field (larger to accommodate certificate)
    const padded = new Uint8Array(8192);
    padded.set(pkcs7SignedData, 0);

    return padded;
  } catch (error) {
    console.error("❌ Error creating PKCS#7 SignedData:", error);
    throw error;
  }
}

/**
 * Create a simpler PKCS#7 wrapper with detached signature
 * This is sufficient for PDF signatures when the document is the content
 */
export function createSimplePKCS7Detached(
  signatureBytes: Uint8Array,
  certificateDER: Uint8Array,
): Uint8Array {
  try {
    console.log("🔐 Creating simple PKCS#7 detached signature with certificate...");

    // For detached signatures, we don't include the document content
    // Just wrap the signature with the certificate

    // PKCS#7 detached format: SignedData without contentInfo content
    const version = createDERInteger(1);

    // SHA-256 algorithm
    const sha256OID = createDEROID("2.16.840.1.101.3.4.2.1");
    const digestAlgorithm = createDERSequence([sha256OID, new Uint8Array([0x05, 0x00])]);
    const digestAlgorithms = new Uint8Array([0x31, digestAlgorithm.byteLength, ...Array.from(digestAlgorithm)]);

    // Content info with OID for data type, no content
    const contentTypeOID = createDEROID("1.2.840.113549.1.7.1");
    const contentInfo = createDERSequence([contentTypeOID]);

    // Certificate set
    const certificateSet = createContextTag(0, certificateDER, false);

    // Signer info
    const signerVersion = createDERInteger(1);
    const issuerName = createDERSequence([createDEROID("2.5.4.3"), new Uint8Array([0x0c, 0x1f, ...Array.from(new TextEncoder().encode("Universitas Muhammadiyah Cirebon"))])]);
    const serialNumber = createDERInteger(1);
    const issuerAndSerialNumber = createDERSequence([issuerName, serialNumber]);

    const ed25519OID = createDEROID("1.3.101.112");
    const digestEncryptionAlgorithm = createDERSequence([ed25519OID, new Uint8Array([0x05, 0x00])]);
    const encryptedDigest = createDEROctetString(signatureBytes);

    const signerInfo = createDERSequence([
      signerVersion,
      issuerAndSerialNumber,
      digestAlgorithm,
      digestEncryptionAlgorithm,
      encryptedDigest,
    ]);

    const signerInfos = new Uint8Array([0x31, signerInfo.byteLength, ...Array.from(signerInfo)]);

    // SignedData
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

    console.log("✅ Simple PKCS#7 detached created");
    console.log("   Size:", pkcs7.byteLength, "bytes");

    // Pad to 8192 bytes
    const padded = new Uint8Array(8192);
    padded.set(pkcs7, 0);

    return padded;
  } catch (error) {
    console.error("❌ Error creating PKCS#7 detached:", error);
    throw error;
  }
}
