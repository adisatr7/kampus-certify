import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { base64Decode, base64Encode, corsHeaders } from "../_shared/index.ts";

/**
 * Validate passphrase rules:
 * - must be a string
 * - must begin with "CA"
 * - must be at least 8 characters total (so "CA" + 6 more characters minimum)
 * - must include at least one symbol (non-alphanumeric)
 *
 * @param passphrase The passphrase to validate
 */
function validatePassphrase(passphrase: unknown): { valid: boolean; error: string | null } {
  if (!passphrase || typeof passphrase !== "string") {
    return { valid: false, error: "Passphrase wajib diisi" };
  }
  if (!passphrase.startsWith("CA")) {
    return { valid: false, error: "Passphrase harus diawali dengan 'CA'" };
  }
  if (passphrase.length < 8) {
    return { valid: false, error: "Passphrase minimal 8 karakter termasuk 'CA'" };
  }
  if (!/[^A-Za-z0-9]/.test(passphrase)) {
    return { valid: false, error: "Passphrase harus mengandung setidaknya satu simbol" };
  }
  return { valid: true, error: null };
}

/**
 * Hash passphrase using PBKDF2 (Edge-safe, no Worker dependency)
 */
async function pbkdf2Hash(pass: string, iterations = 100_000) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );

  const hashBytes = new Uint8Array(derivedBits);
  // Store as: pbkdf2:<iterations>:<salt_b64>:<hash_b64>
  return `pbkdf2:${iterations}:${base64Encode(salt)}:${base64Encode(hashBytes)}`;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("content-type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { createdBy, assignedTo, expiresAt, passphrase } = await req.json();

    // Validate inputs
    if (!createdBy || !assignedTo || !expiresAt || !passphrase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Data tidak lengkap",
          data: null,
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    // Validate passphrase
    const passValidation = validatePassphrase(passphrase);
    if (!passValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: passValidation.error,
          data: null,
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    // Validate expirity date
    if (expiresAt) {
      const expirityDate = new Date(expiresAt);

      if (isNaN(expirityDate.getTime())) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Tanggal kadaluarsa tidak valid",
            data: null,
          }),
          {
            status: 400,
            headers,
          },
        );
      }
    }

    // Ensure target user exists
    {
      const { data: userRow, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", assignedTo)
        .single();
      if (error || !userRow) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "User tidak ditemukan",
            data: null,
          }),
          {
            status: 404,
            headers,
          },
        );
      }
    }

    // Ensure master key exists
    const MASTER_KEY_B64 = Deno.env.get("MASTER_KEY_B64")!;
    if (!MASTER_KEY_B64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Master Key tidak tersimpan di sistem. Harap hubungi admin atau teknisi",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    // Import master key for AES-GCM (32 bytes)
    const masterKeyBytes = base64Decode(MASTER_KEY_B64);
    if (masterKeyBytes.byteLength !== 32) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Master Key yang tersimpan di sistem tidak valid. Harap hubungi admin atau teknisi",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }
    const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);

    // Generate Ed25519 keypair
    const { publicKey, privateKey } = await crypto.subtle.generateKey(
      { name: "Ed25519" } as EcKeyGenParams,
      true,
      ["sign", "verify"],
    );

    // Export keys
    const spki = new Uint8Array(await crypto.subtle.exportKey("spki", publicKey));
    const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", privateKey));

    // Encrypt private key with AES-GCM
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, pkcs8),
    );

    const passphrase_hash = await pbkdf2Hash(passphrase);

    // Generate kid (date + short random suffix)
    const datePart = new Date().toISOString().slice(0, 10);
    const suffix = crypto.randomUUID().slice(0, 8);
    const kid = `v1-${datePart}-${suffix}`;

    // Insert row
    const { error: insertErr } = await supabase.from("signing_keys").insert({
      kid,
      kty: "OKP",
      crv: "Ed25519",
      created_by: createdBy,
      assigned_to: assignedTo,
      x: base64Encode(spki), // Public key (SPKI DER → b64)
      enc_private_key: base64Encode(ciphertext), // AES-GCM ciphertext (b64)
      enc_private_key_iv: base64Encode(iv), // IV (b64)
      enc_algo: "AES-GCM",
      passphrase_hash,
      expires_at: new Date(expiresAt).toISOString(),
      revoked_at: null,
      deleted_at: null,
    });

    if (insertErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: String(insertErr.message || insertErr),
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        error: null,
        data: {
          kid,
          expiresAt,
        },
      }),
      {
        status: 200,
        headers,
      },
    );
  } catch (err) {
    console.error("create-certificate error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message ?? err), data: null }),
      { status: 500, headers },
    );
  }
});
