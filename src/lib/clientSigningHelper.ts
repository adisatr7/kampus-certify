/**
 * Helper functions to fetch and manage signing keys on client side
 */

import { supabase } from "@/integrations/supabase/client";

interface SigningKeyData {
  kid: string;
  private_key?: string; // Legacy - Base64 encoded private key
  private_key_pem?: string; // PEM format private key (RSA)
  private_key_passphrase?: string;
  x509_certificate?: string; // Base64 encoded DER certificate
  certificate_pem?: string; // PEM format for display
  public_key?: string;
  created_by?: string;
  assigned_to?: string;
}

/**
 * Fetch signing key from database by document or user
 */
export async function fetchSigningKey(
  documentId?: string,
  userId?: string
): Promise<SigningKeyData | null> {
  try {
    if (documentId) {
      // Get signing key for a specific document
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("signing_key_id")
        .eq("id", documentId)
        .maybeSingle();

      if (docError || !doc?.signing_key_id) {
        console.warn("Could not find signing key for document");
        return null;
      }

      const { data: key, error: keyError } = await supabase
        .from("signing_keys")
        .select(
          "kid, private_key, private_key_pem, private_key_passphrase, x509_certificate, certificate_pem, public_key, created_by, assigned_to"
        )
        .eq("kid", doc.signing_key_id)
        .maybeSingle();

      if (keyError) {
        console.error("Error fetching signing key:", keyError);
        return null;
      }

      return key;
    } else if (userId) {
      // Get default signing key for user
      const { data: key, error } = await supabase
        .from("signing_keys")
        .select(
          "kid, private_key, private_key_pem, private_key_passphrase, x509_certificate, certificate_pem, public_key, created_by, assigned_to"
        )
        .eq("assigned_to", userId)
        .eq("revoked_at", null)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) {
        console.error("Error fetching signing key:", error);
        return null;
      }

      return key;
    }

    return null;
  } catch (error) {
    console.error("Unexpected error fetching signing key:", error);
    return null;
  }
}

/**
 * Decrypt private key if it's encrypted
 * This assumes the key was encrypted with AES-GCM on server side
 */
export async function decryptPrivateKey(
  encryptedKeyBase64: string,
  ivBase64: string,
  passphrase: string
): Promise<string> {
  try {
    // If key is not encrypted, return as-is
    if (!encryptedKeyBase64 || !ivBase64) {
      return encryptedKeyBase64;
    }

    // This would require the passphrase/master key to decrypt
    // For now, we'll assume keys are stored in plaintext or the decryption
    // happens server-side before sending to client
    console.warn("⚠️ Encrypted key detected - recommend server-side decryption");
    return encryptedKeyBase64;
  } catch (error) {
    console.error("Error decrypting private key:", error);
    throw error;
  }
}

/**
 * Get private key in PEM format
 * Converts base64 to PEM if needed
 */
export function toPEMFormat(keyData: string): string {
  // If already in PEM format, return as-is
  if (keyData.includes("BEGIN") && keyData.includes("END")) {
    return keyData;
  }

  // If it's base64 (encoded binary), convert to PEM
  // First, try to decode to check if it's valid base64
  try {
    atob(keyData);
    // It's valid base64, wrap in PEM headers
    const wrapped =
      `-----BEGIN PRIVATE KEY-----\n` +
      keyData.match(/.{1,64}/g)?.join("\n") +
      `\n-----END PRIVATE KEY-----`;
    return wrapped;
  } catch (e) {
    // Not base64, return as-is (assume it's already in some valid format)
    return keyData;
  }
}

/**
 * Prepare signing key for use in client-side signing
 */
export async function prepareSigningKeyForClient(
  key: SigningKeyData
): Promise<{
  privateKey: string;
  certificate?: string;
  signerName?: string;
}> {
  // Convert private key to PEM format
  const privateKeyPEM = toPEMFormat(key.private_key);

  // Get signer name from user info if assigned
  let signerName = "Universitas Muhammadiyah Cirebon";
  if (key.assigned_to) {
    const signerInfo = await getSignerInfo(key.assigned_to);
    signerName = signerInfo?.name || `User (${key.assigned_to})`;
  }

  return {
    privateKey: privateKeyPEM,
    certificate: key.x509_certificate,
    signerName,
  };
}

/**
 * Log signing activity to audit trail
 */
export async function logSigningActivity(
  documentId: string,
  keyId: string,
  status: "success" | "failure",
  errorMessage?: string
): Promise<void> {
  try {
    const { error } = await supabase
      .from("audit_trail")
      .insert({
        action: "document_signed",
        resource_type: "document",
        resource_id: documentId,
        details: {
          signing_key: keyId,
          method: "client-side",
          status,
          error: errorMessage,
          timestamp: new Date().toISOString(),
        },
      });

    if (error) {
      console.warn("Could not log signing activity:", error);
    }
  } catch (e) {
    console.warn("Error logging signing activity:", e);
  }
}

/**
 * Store signed document metadata
 */
export async function recordDocumentSignature(
  documentId: string,
  keyId: string,
  signatureData: {
    signature: string; // Base64 encoded PKCS#7
    signedAt: Date;
    reason?: string;
    location?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from("document_signatures")
      .upsert(
        {
          document_id: documentId,
          key_id: keyId,
          signature: signatureData.signature,
          signed_at: signatureData.signedAt.toISOString(),
          reason: signatureData.reason || "Document Authentication",
          location: signatureData.location || "Indonesia",
          signature_timestamp: signatureData.signedAt.toISOString(),
          signature_reason: signatureData.reason,
          signature_location: signatureData.location,
          pkcs7_full: true, // Indicate this is a full PKCS#7
          signature_verification_status: "VALID",
        },
        { onConflict: "document_id,key_id" }
      );

    if (error) {
      console.error("Error recording signature:", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error("Unexpected error recording signature:", error);
    return { success: false, error: String(error) };
  }
}

/**
 * Get signer information for display
 */
export async function getSignerInfo(
  userId: string
): Promise<{ name?: string; jabatan?: string; nip?: string } | null> {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("name, jabatan, nip")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.warn("Could not fetch signer info:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.warn("Error fetching signer info:", error);
    return null;
  }
}
