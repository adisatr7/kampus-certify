import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/node-forge@1.3.11"
import forge from "npm:node-forge@1.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function base64Decode(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function base64Encode(data: Uint8Array): string {
  let result = "";
  for (let i = 0; i < data.length; i += 65536) {
    result += String.fromCharCode.apply(null, Array.from(data.slice(i, i + 65536)));
  }
  return btoa(result);
}

async function decryptAESGCM(encryptedBase64: string, ivBase64: string, masterKeyBase64: string): Promise<string> {
  const encryptedBytes = base64Decode(encryptedBase64);
  const ivBytes = base64Decode(ivBase64);
  const masterKeyBytes = base64Decode(masterKeyBase64);
  
  const masterKey = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );
  
  const decryptedBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    masterKey,
    encryptedBytes
  );
  
  return new TextDecoder().decode(decryptedBytes);
}

// PBKDF2 passphrase verification
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

Deno.serve(async (req) => {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { documentId, signerUserId, passphrase, kid } = await req.json();

    if (!documentId || !signerUserId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId or signerUserId" }),
        { status: 400, headers }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("📝 Signing document:", documentId, "by", signerUserId);

    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("id,title,content,user_id,created_at")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      return new Response(
        JSON.stringify({ error: "Document not found" }),
        { status: 404, headers }
      );
    }

    const payload = JSON.stringify({
      title: document.title,
      content: document.content,
      user_id: document.user_id,
      created_at: document.created_at,
    });

    const enc = new TextEncoder();
    const digestBuffer = await crypto.subtle.digest("SHA-256", enc.encode(payload));
    const digestBytes = new Uint8Array(digestBuffer);
    
    const hashToSign = Array.from(digestBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Check if signer is an admin
    const { data: signerUser, error: signerErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", signerUserId)
      .maybeSingle();

    const isAdmin = !signerErr && signerUser?.role === "admin";
    console.log("🔑 Signer role check: isAdmin =", isAdmin);

    // Build signing key query
    let keyQuery = supabase
      .from("signing_keys")
      .select("kid, certificate_pem, enc_private_key, enc_private_key_iv, assigned_to, passphrase_hash")
      .is("revoked_at", null)
      .is("deleted_at", null);

    // If kid is provided, use that specific certificate
    // Admin can use any certificate via kid, non-admin must own the certificate
    if (kid) {
      keyQuery = keyQuery.eq("kid", kid);
      console.log("🔑 Using selected certificate (kid):", kid);
    } else {
      // No kid provided: use latest certificate assigned to signerUserId
      keyQuery = keyQuery
        .eq("assigned_to", signerUserId)
        .order("created_at", { ascending: false })
        .limit(1);
      console.log("🔑 No kid provided, using latest certificate for user:", signerUserId);
    }

    const { data: signingKey, error: keyError } = await keyQuery.maybeSingle();

    if (keyError || !signingKey) {
      console.error("❌ No signing key found:", keyError?.message);
      return new Response(
        JSON.stringify({ error: "No signing key found for the specified criteria" }),
        { status: 404, headers }
      );
    }

    // Security check: Non-admin users can only use their own certificates
    if (!isAdmin && signingKey.assigned_to !== signerUserId) {
      console.error("❌ Non-admin user attempted to use another user's certificate");
      return new Response(
        JSON.stringify({ error: "Anda tidak memiliki izin untuk menggunakan sertifikat ini" }),
        { status: 403, headers }
      );
    }

    console.log("✅ Using certificate:", signingKey.kid, "assigned to:", signingKey.assigned_to);

    // Validate passphrase if provided
    if (passphrase && signingKey.passphrase_hash) {
      console.log("🔐 Validating passphrase...");
      const isValidPassphrase = await verifyPBKDF2(passphrase, signingKey.passphrase_hash);
      
      if (!isValidPassphrase) {
        console.error("❌ Invalid passphrase");
        return new Response(
          JSON.stringify({ error: "Passphrase salah. Silakan coba lagi." }),
          { status: 401, headers }
        );
      }
      console.log("✅ Passphrase valid");
    } else if (!passphrase && signingKey.passphrase_hash) {
      console.error("❌ Passphrase required but not provided");
      return new Response(
        JSON.stringify({ error: "Passphrase diperlukan untuk menggunakan sertifikat ini." }),
        { status: 401, headers }
      );
    }

    const masterKeyBase64 = Deno.env.get("MASTER_KEY_B64");
    if (!masterKeyBase64) {
      throw new Error("MASTER_KEY_B64 not set");
    }

    const privateKeyPem = await decryptAESGCM(
      signingKey.enc_private_key,
      signingKey.enc_private_key_iv,
      masterKeyBase64
    );

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(payload);
    const signatureBytes = privateKey.sign(md);
    
    const signature = base64Encode(new Uint8Array(signatureBytes.split("").map((c: string) => c.charCodeAt(0))));

    const { error: sigError } = await supabase
      .from("document_signatures")
      .insert({
        document_id: document.id,
        key_id: signingKey.kid,
        payload_hash: hashToSign,
        signature: signature,
        signer_user_id: signerUserId,
        signed_at: new Date().toISOString()
      });

    if (sigError) {
      throw sigError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        documentId: document.id,
        keyId: signingKey.kid,
        signedAt: new Date().toISOString(),
      }),
      { status: 200, headers }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers }
    );
  }
});
