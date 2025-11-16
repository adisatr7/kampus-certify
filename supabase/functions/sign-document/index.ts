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

// PBKDF2 verify function
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

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Helper for base64 → string
function base64ToStr(bytes: Uint8Array) {
  return String.fromCharCode(...bytes);
}

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { documentId, signerUserId, passphrase } = await req.json();

    if (!documentId || !signerUserId || !passphrase) {
      return new Response(JSON.stringify({ error: "Isi formulir tidak lengkap" }), {
        status: 400,
        headers,
      });
    }

    // Fetch document
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, title, content, user_id, created_at")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Dokumen tidak ditemukan" }), {
        status: 404,
        headers,
      });
    }

    // Fetch signer’s latest usable key
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select(
        "kid, assigned_to, passphrase_hash, x, enc_private_key, enc_private_key_iv, enc_algo, revoked_at, deleted_at, expires_at",
      )
      .eq("assigned_to", signerUserId)
      .is("revoked_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyErr || !keyRow) {
      return new Response(
        JSON.stringify({ error: "Sertifikat tidak ditemukan atau sudah dicabut" }),
        { status: 404, headers },
      );
    }

    // Check expiry
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Sertifikat sudah kadaluarsa" }), {
        status: 400,
        headers,
      });
    }

    // Verify passphrase
    const passOK = await verifyPBKDF2(passphrase, keyRow.passphrase_hash);
    if (!passOK) {
      return new Response(JSON.stringify({ error: "Passphrase salah" }), {
        status: 403,
        headers,
      });
    }

    // Import master key and decrypt private key
    const MASTER_KEY_B64 = Deno.env.get("MASTER_KEY_B64");
    if (!MASTER_KEY_B64) {
      return new Response(JSON.stringify({ error: "Master key tidak tersimpan di sistem" }), {
        status: 500,
        headers,
      });
    }
    const masterKeyBytes = base64Decode(MASTER_KEY_B64);
    const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
      "decrypt",
    ]);

    const iv = base64Decode(keyRow.enc_private_key_iv);
    const ciphertext = base64Decode(keyRow.enc_private_key);
    const decryptedPkcs8 = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, ciphertext),
    );

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      decryptedPkcs8.buffer,
      { name: "Ed25519" },
      false,
      ["sign"],
    );

    // Canonical payload MUST MATCH verify endpoint (title, content, user_id, created_at)
    const payload = JSON.stringify({
      title: doc.title,
      content: doc.content,
      user_id: doc.user_id,
      created_at: doc.created_at, // use DB timestamp to avoid drift
    });

    const payloadBytes = new TextEncoder().encode(payload);
    const digestBuffer = await crypto.subtle.digest("SHA-256", payloadBytes);
    const hash = Array.from(new Uint8Array(digestBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign the hash
    const dataToSign = new TextEncoder().encode(hash);
    const sigBuffer = await crypto.subtle.sign("Ed25519", cryptoKey, dataToSign);
    const signature = btoa(base64ToStr(new Uint8Array(sigBuffer)));

    // Store signature in database
    const { error: insertError } = await supabase.from("document_signatures").insert({
      document_id: documentId,
      key_id: keyRow.kid,
      payload_hash: hash,
      signature,
      signer_user_id: signerUserId,
    });
    if (insertError) {
      throw insertError;
    }

    // Update document status + link the key used
    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "signed", signing_key_id: keyRow.kid })
      .eq("id", documentId);
    if (updateError) {
      throw updateError;
    }

    return new Response(JSON.stringify({ ok: true, keyId: keyRow.kid, hash, signature }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("sign-document error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers,
    });
  }
});
