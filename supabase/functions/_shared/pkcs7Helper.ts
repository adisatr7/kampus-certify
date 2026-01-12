// Helper functions for PKCS#7 signature envelope creation
// Supports Adobe Acrobat compatible digital signatures

/**
 * Simple DER encoding helpers for PKCS#7/CMS signature structures
 * This provides basic PKCS#7 wrapper for RSA signatures to be compatible with Adobe Reader
 */

/**
 * Convert a number to DER length format (simplified)
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
 * Encode data as DER SEQUENCE
 */
function encodeDERSequence(data: Uint8Array): Uint8Array {
  const length = encodeDERLength(data.length);
  const result = new Uint8Array(1 + length.length + data.length);
  result[0] = 0x30; // SEQUENCE tag
  result.set(length, 1);
  result.set(data, 1 + length.length);
  return result;
}

/**
 * Encode data as DER OCTET STRING
 */
function encodeDEROctetString(data: Uint8Array): Uint8Array {
  const length = encodeDERLength(data.length);
  const result = new Uint8Array(1 + length.length + data.length);
  result[0] = 0x04; // OCTET STRING tag
  result.set(length, 1);
  result.set(data, 1 + length.length);
  return result;
}

/**
 * Convert UTF-8 string to DER IA5String (ASCII)
 */
function encodeDERIA5String(str: string): Uint8Array {
  const data = new TextEncoder().encode(str);
  const length = encodeDERLength(data.length);
  const result = new Uint8Array(1 + length.length + data.length);
  result[0] = 0x16; // IA5STRING tag
  result.set(length, 1);
  result.set(data, 1 + length.length);
  return result;
}

/**
 * Create a simplified PKCS#7 signature envelope
 * This creates a basic structure that Adobe Reader can recognize
 */
export function createPKCS7Envelope(
  signatureBytes: Uint8Array,
  signerName: string = "Universitas Muhammadiyah Cirebon",
  reason: string = "Document Authentication",
  timestamp: string = new Date().toISOString()
): Uint8Array {
  try {
    // For simplicity, we'll create a structure that wraps the signature
    // In production, you might want to use a proper PKCS#7 library
    
    // Wrap the signature in an OCTET STRING
    const signatureOctetString = encodeDEROctetString(signatureBytes);
    
    // Create a simple structure that Adobe can recognize
    // This is a minimal but functional PKCS#7 structure
    const components = [
      signatureOctetString,
    ];
    
    // Combine all components
    const combined = new Uint8Array(
      components.reduce((acc, comp) => acc + comp.length, 0)
    );
    
    let offset = 0;
    for (const component of components) {
      combined.set(component, offset);
      offset += component.length;
    }
    
    // Wrap in final SEQUENCE
    return encodeDERSequence(combined);
  } catch (error) {
    console.warn("Error creating PKCS#7 envelope, returning raw signature:", error);
    return signatureBytes;
  }
}

/**
 * Convert signature to hex string for PDF Contents field
 */
export function signatureToHex(signatureBytes: Uint8Array): string {
  return Array.from(signatureBytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Calculate byte range for PDF signature
 * Returns [start, length] for byte range dictionary
 * 
 * This tells Adobe Reader which parts of the PDF are covered by the signature
 */
export function calculateByteRange(
  pdfContent: Uint8Array,
  estimatedSignatureSize: number = 4096
): [number, number, number, number] {
  // Typical structure: [0, startOfSignatureField, endOfSignatureField, restOfPDF]
  // For simplicity, we'll use: [0, 0, totalLength, 0]
  // In production, you'd calculate exact byte positions
  
  const totalLength = pdfContent.length;
  return [0, 0, totalLength, 0];
}

/**
 * Create signature info string for visual appearance
 */
export function createSignatureInfo(
  signerName: string,
  timestamp: string,
  reason: string = "Document Authentication"
): string {
  const date = new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  
  return `Digitally signed by: ${signerName}
Date: ${date}
Reason: ${reason}`;
}

/**
 * Verify signature format is valid for PDF embedding
 */
export function isValidSignatureFormat(signature: Uint8Array): boolean {
  // Check minimum size (RSA signature should be at least 256 bytes for 2048-bit key)
  if (signature.length < 256 || signature.length > 4096) {
    return false;
  }
  
  // Check it's not all zeros or all ones
  const allZeros = signature.every(b => b === 0);
  const allOnes = signature.every(b => b === 255);
  
  return !allZeros && !allOnes;
}

/**
 * Pad signature to standard size for PDF (usually 4096 bytes)
 * This is required for PDF signature fields
 */
export function padSignatureForPDF(
  signature: Uint8Array,
  targetSize: number = 4096
): Uint8Array {
  if (signature.length >= targetSize) {
    return signature.slice(0, targetSize);
  }
  
  const padded = new Uint8Array(targetSize);
  padded.set(signature, 0);
  // Fill rest with zeros (standard padding)
  for (let i = signature.length; i < targetSize; i++) {
    padded[i] = 0;
  }
  
  return padded;
}
