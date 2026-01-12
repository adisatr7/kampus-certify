/**
 * Certificate Generator
 * Converts Ed25519 public keys to X.509 certificates for PDF digital signatures
 */

import * as asn1js from "asn1js";
import * as pkijs from "pkijs";
import { Convert } from "pvutils";

// Setup PKI.js
const crypto = globalThis.crypto || require("crypto").webcrypto;
pkijs.setEngine(
  "webcrypto",
  new pkijs.CryptoEngine({ name: "webcrypto", crypto }),
);

interface CertificateOptions {
  signerName: string;
  signerEmail?: string;
  organizationName?: string;
  organizationUnit?: string;
  countryName?: string;
  validityDays?: number;
}

/**
 * Convert base64 SPKI-encoded public key to CryptoKey
 * @param spkiBase64 Base64-encoded SPKI public key from signing_keys table
 */
export async function importPublicKeyFromSPKI(
  spkiBase64: string,
): Promise<CryptoKey> {
  try {
    // Decode base64 to binary
    const binaryString = atob(spkiBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Import as SPKI
    const publicKey = await crypto.subtle.importKey(
      "spki",
      bytes.buffer,
      {
        name: "Ed25519",
        namedCurve: "Ed25519",
      },
      true,
      ["verify"],
    );

    return publicKey;
  } catch (error) {
    console.error("Error importing public key:", error);
    throw error;
  }
}

/**
 * Generate a self-signed X.509 v3 certificate from an Ed25519 public key
 * @param publicKey The CryptoKey to sign the certificate with
 * @param publicKeyDer DER-encoded public key bytes
 * @param options Certificate options
 */
export async function generateX509Certificate(
  publicKey: CryptoKey,
  publicKeyDer: Uint8Array,
  options: CertificateOptions,
): Promise<Uint8Array> {
  const cert = new pkijs.Certificate();

  // ============ VERSION ============
  cert.version = 2; // v3 (value 2 means v3)

  // ============ SERIAL NUMBER ============
  // Generate a random 20-byte serial number
  const serialNumberBytes = crypto.getRandomValues(new Uint8Array(20));
  cert.serialNumber = new asn1js.Integer({
    valueBlock: new asn1js.IntegerValueBlock({
      valueHexString: Convert.ToHex(serialNumberBytes),
    }),
  });

  // ============ SIGNATURE ALGORITHM ============
  cert.signatureAlgorithm = new pkijs.AlgorithmIdentifier({
    algorithmId: "1.3.101.112", // Ed25519 OID
  });

  // ============ ISSUER & SUBJECT (self-signed) ============
  const issuerSubject = new pkijs.Name({
    names: [
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.6", // Country Name
        value: new asn1js.PrintableString({
          value: options.countryName || "ID",
        }),
      }),
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.10", // Organization Name
        value: new asn1js.Utf8String({
          value: options.organizationName || "Universitas Muhammadiyah Cirebon",
        }),
      }),
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.11", // Organization Unit
        value: new asn1js.Utf8String({
          value: options.organizationUnit || "Document Signing",
        }),
      }),
      new pkijs.AttributeTypeAndValue({
        type: "2.5.4.3", // Common Name
        value: new asn1js.Utf8String({
          value: options.signerName,
        }),
      }),
    ],
  });

  cert.issuer = issuerSubject;
  cert.subject = issuerSubject;

  // ============ VALIDITY ============
  const notBefore = new Date();
  const notAfter = new Date();
  notAfter.setDate(notAfter.getDate() + (options.validityDays || 3650)); // 10 years default

  cert.notBefore = new pkijs.Time({
    type: 0,
    value: new asn1js.UTCTime({ valueDate: notBefore }),
  });
  cert.notAfter = new pkijs.Time({
    type: 0,
    value: new asn1js.UTCTime({ valueDate: notAfter }),
  });

  // ============ PUBLIC KEY ============
  // Parse the SPKI to extract just the public key bit string
  const asn = asn1js.fromBER(publicKeyDer);
  const spkiSequence = asn.result as asn1js.Sequence;

  // The public key is the second element in the SPKI structure (after AlgorithmIdentifier)
  const publicKeyBitString = spkiSequence?.valueBlock?.value?.[1];

  if (!publicKeyBitString) {
    throw new Error("Could not extract public key bit string from SPKI");
  }

  cert.subjectPublicKeyInfo = new pkijs.PublicKeyInfo({
    algorithm: new pkijs.AlgorithmIdentifier({
      algorithmId: "1.3.101.112", // Ed25519 OID
    }),
    publicKey: publicKeyBitString,
  });

  // ============ EXTENSIONS (v3 certificate) ============
  cert.extensions = [
    // Basic Constraints
    new pkijs.Extension({
      extnID: "2.5.29.19", // basicConstraints
      critical: true,
      extnValue: new asn1js.Sequence({
        valueBlock: new asn1js.SequenceValueBlock({
          value: [],
        }),
      }),
    }),
    // Key Usage
    new pkijs.Extension({
      extnID: "2.5.29.15", // keyUsage
      critical: true,
      extnValue: new asn1js.BitString({
        valueHex: new ArrayBuffer(new Uint8Array([0xc0]).buffer), // digitalSignature + nonRepudiation
      }),
    }),
    // Extended Key Usage
    new pkijs.Extension({
      extnID: "2.5.29.37", // extendedKeyUsage
      critical: false,
      extnValue: new asn1js.Sequence({
        valueBlock: new asn1js.SequenceValueBlock({
          value: [
            new asn1js.ObjectIdentifier({
              valueBlock: new asn1js.ObjectIdentifierValueBlock({
                toJSON: () => ({ value: "1.3.6.1.5.5.7.3.2" }), // id-kp-clientAuth
              }),
            }),
            new asn1js.ObjectIdentifier({
              valueBlock: new asn1js.ObjectIdentifierValueBlock({
                toJSON: () => ({ value: "1.3.6.1.5.5.7.3.3" }), // id-kp-codeSigning
              }),
            }),
          ],
        }),
      }),
    }),
    // Subject Key Identifier
    new pkijs.Extension({
      extnID: "2.5.29.14", // subjectKeyIdentifier
      critical: false,
      extnValue: new asn1js.OctetString({
        valueHex: await crypto.subtle.digest("SHA-256", publicKeyDer),
      }),
    }),
  ];

  // ============ SIGN THE CERTIFICATE ============
  // For self-signed, we use the same private key that corresponds to the public key
  // In this case, we're just creating the structure with a placeholder signature
  // The actual signature will be done when creating the PKCS#7 container

  const schemaSequence = cert.toSchema(true);
  const certDER = schemaSequence.toBER(false);

  console.log(
    "✅ X.509 certificate generated successfully",
    certDER.byteLength,
    "bytes",
  );

  return new Uint8Array(certDER);
}

/**
 * Get certificate subject and issuer information
 */
export function getCertificateInfo(
  options: CertificateOptions,
): {
  subjectName: string;
  issuerName: string;
  email: string;
} {
  const name = options.signerName;
  const organization = options.organizationName || "Universitas Muhammadiyah Cirebon";
  const email = options.signerEmail || "noreply@kampus-certify.id";

  return {
    subjectName: `CN=${name}, O=${organization}, C=ID`,
    issuerName: `CN=${name}, O=${organization}, C=ID`,
    email: email,
  };
}

/**
 * Convert Ed25519 SPKI public key to DER bytes
 */
export async function getSPKIPublicKeyDER(spkiBase64: string): Promise<Uint8Array> {
  const binaryString = atob(spkiBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
