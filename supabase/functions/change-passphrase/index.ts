import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64 utilities
function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s);
}

// PBKDF2 utilities
async function verifyPBKDF2(pass: string, stored: string): Promise<boolean> {
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
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i] ^ expectedHash[i];
  }
  return diff === 0;
}

async function pbkdf2Hash(pass: string, iterations = 100_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
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
    256,
  );
  const hashBytes = new Uint8Array(derived);
  return `pbkdf2:${iterations}:${base64Encode(salt)}:${base64Encode(hashBytes)}`;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { kid, oldPassphrase, newPassphrase, changedBy } = await req.json();

    if (!kid || !oldPassphrase || !newPassphrase) {
      return new Response(JSON.stringify({ success: false, error: "Data tidak lengkap" }), {
        status: 400,
        headers,
      });
    }

    if (oldPassphrase === newPassphrase) {
      return new Response(
        JSON.stringify({ success: false, error: "Passphrase baru harus berbeda dari yang lama" }),
        { status: 400, headers },
      );
    }

    // Fetch key row (service role)
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select("kid, passphrase_hash, revoked_at, deleted_at")
      .eq("kid", kid)
      .single();

    if (keyErr || !keyRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Signing key tidak ditemukan" }),
        {
          status: 404,
          headers,
        },
      );
    }

    if (keyRow.revoked_at || keyRow.deleted_at) {
      return new Response(
        JSON.stringify({ success: false, error: "Signing key sudah dicabut atau dihapus" }),
        { status: 400, headers },
      );
    }

    // Verify old passphrase
    const ok = await verifyPBKDF2(oldPassphrase, keyRow.passphrase_hash);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "Passphrase lama salah" }), {
        status: 403,
        headers,
      });
    }

    // Hash new passphrase
    const newHash = await pbkdf2Hash(newPassphrase);

    const { error: updateErr } = await supabase
      .from("signing_keys")
      .update({ passphrase_hash: newHash })
      .eq("kid", kid);

    if (updateErr) {
      return new Response(
        JSON.stringify({ success: false, error: String(updateErr.message || updateErr) }),
        { status: 500, headers },
      );
    }

    return new Response(
      JSON.stringify({ success: true, error: null, data: { kid, changedBy: changedBy || null } }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("change-passphrase error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err?.message ?? err) }), {
      status: 500,
      headers,
    });
  }
});
