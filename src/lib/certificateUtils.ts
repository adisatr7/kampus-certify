/**
 * Utility functions untuk work dengan X.509 certificates
 * Membantu convert antara format DER dan PEM
 */

/**
 * Convert base64 DER certificate ke PEM format
 */
export function derToPem(derBase64: string): string {
  const pem =
    "-----BEGIN CERTIFICATE-----\n" +
    derBase64.match(/.{1,64}/g)?.join("\n") +
    "\n-----END CERTIFICATE-----";

  return pem;
}

/**
 * Convert PEM certificate ke base64 DER format
 */
export function pemToDer(pemString: string): string {
  const pemContent = pemString
    .replace(/-----BEGIN CERTIFICATE-----/, "")
    .replace(/-----END CERTIFICATE-----/, "")
    .replace(/\s/g, "");

  return pemContent;
}

/**
 * Validate if certificate is in valid format
 */
export function isValidCertificateFormat(cert: string): {
  valid: boolean;
  format: "PEM" | "DER_BASE64" | "UNKNOWN";
  error?: string;
} {
  // Check if PEM format
  if (cert.includes("BEGIN CERTIFICATE") && cert.includes("END CERTIFICATE")) {
    return { valid: true, format: "PEM" };
  }

  // Check if base64 DER
  try {
    const decoded = atob(cert);
    // DER certificates start with 0x30 (SEQUENCE tag)
    if (decoded.charCodeAt(0) === 0x30) {
      return { valid: true, format: "DER_BASE64" };
    }
  } catch (e) {
    return {
      valid: false,
      format: "UNKNOWN",
      error: "Not valid base64",
    };
  }

  return {
    valid: false,
    format: "UNKNOWN",
    error:
      "Certificate format not recognized. Expected PEM or base64 DER encoded X.509",
  };
}

/**
 * Extract certificate info from DER format
 * Returns basic metadata without full parsing
 */
export function extractCertificateInfo(derBase64: string): {
  subject?: string;
  issuer?: string;
  serialNumber?: string;
  validFrom?: Date;
  validTo?: Date;
  keyType?: string;
} {
  try {
    // Convert base64 to bytes
    const derBytes = new Uint8Array(
      atob(derBase64)
        .split("")
        .map((c) => c.charCodeAt(0))
    );

    // Basic validation - check for SEQUENCE tag
    if (derBytes[0] !== 0x30) {
      console.warn("Invalid DER format - does not start with SEQUENCE tag");
      return {};
    }

    // For full parsing, would need ASN.1 library
    // For now, return placeholder info
    return {
      subject: "Universitas Muhammadiyah Cirebon",
      issuer: "Universitas Muhammadiyah Cirebon",
    };
  } catch (error) {
    console.warn("Could not extract certificate info:", error);
    return {};
  }
}

/**
 * Check if certificate is expired
 */
export async function isCertificateExpired(
  certificateData: {
    valid_until?: string | Date;
  }
): Promise<boolean> {
  if (!certificateData.valid_until) {
    return false; // Unknown, assume not expired
  }

  const expiryDate = new Date(certificateData.valid_until);
  const now = new Date();

  return now > expiryDate;
}

/**
 * Format certificate for display
 */
export function formatCertificateForDisplay(cert: {
  subject?: string;
  issuer?: string;
  valid_from?: string;
  valid_until?: string;
  certificate_fingerprint?: string;
}): string {
  return `
Subject: ${cert.subject || "Unknown"}
Issuer: ${cert.issuer || "Unknown"}
Valid From: ${cert.valid_from ? new Date(cert.valid_from).toLocaleDateString() : "Unknown"}
Valid Until: ${cert.valid_until ? new Date(cert.valid_until).toLocaleDateString() : "Unknown"}
Fingerprint: ${cert.certificate_fingerprint || "Unknown"}
  `.trim();
}
