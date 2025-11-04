import { base64Decode } from "./base64.ts";

/**
 * Verify a PBKDF2 stored hash in the format:
 *   pbkdf2:<iterations>:<salt_b64>:<hash_b64>
 */
export async function verifyPBKDF2(pass: string, stored: string): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;

  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;

  const salt = base64Decode(parts[2]);
  const expectedHash = base64Decode(parts[3]);

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    expectedHash.byteLength * 8,
  );

  const derivedBytes = new Uint8Array(derived);

  if (derivedBytes.length !== expectedHash.byteLength) return false;

  // constant-time comparison
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i] ^ expectedHash[i];
  }
  return diff === 0;
}
