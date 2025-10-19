/**
 * Small local base64 decoder returning a Uint8Array. Avoids compatibility issues
 * with std library exports across Deno versions and the Edge runtime.
 */
export function base64Decode(b64: string): Uint8Array {
  if (typeof atob !== "function") {
    throw new Error("base64 decoding not available");
  }

  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);

  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}
