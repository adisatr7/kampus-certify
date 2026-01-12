import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import forge from "https://esm.sh/node-forge@1.3.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Missing documentId" }),
        { status: 400, headers }
      );
    }

    console.log("🔍 Verifying document:", documentId);

    // Fetch document by serial or ID
    let document = null;
    const { data: bySerial } = await supabase
      .from("documents")
      .select("*")
      .eq("serial", documentId)
      .maybeSingle();

    if (bySerial) {
      document = bySerial;
    } else {
      const { data: byId } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      document = byId;
    }

    if (!document) {
      return new Response(
        JSON.stringify({ valid: false, error: "Document not found" }),
        { status: 404, headers }
      );
    }

    console.log("✅ Document found:", document.title);

    // Fetch signature
    const { data: sig, error: sigErr } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("document_id", document.id)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sigErr || !sig) {
      return new Response(
        JSON.stringify({ valid: false, error: "Document not signed" }),
        { status: 404, headers }
      );
    }

    console.log("✅ Signature found");

    // Verify payload hash
    const payload = JSON.stringify({
      title: document.title,
      content: document.content,
      user_id: document.user_id,
      created_at: document.created_at,
    });

    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(payload));
    const recomputedHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (recomputedHash !== sig.payload_hash) {
      console.log("❌ Payload hash mismatch");
      return new Response(
        JSON.stringify({ valid: false, reason: "PAYLOAD_HASH_MISMATCH" }),
        { status: 200, headers }
      );
    }

    console.log("✅ Payload hash verified");

    // Fetch signing key
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select("certificate_pem")
      .eq("kid", sig.key_id)
      .single();

    if (keyErr || !keyRow?.certificate_pem) {
      console.log("❌ Signing key not found");
      return new Response(
        JSON.stringify({ valid: false, error: "Signing key not found" }),
        { status: 404, headers }
      );
    }

    console.log("✅ Signing key found");

    // Parse certificate
    let cert;
    try {
      cert = forge.pki.certificateFromPem(keyRow.certificate_pem);
    } catch (e) {
      console.error("❌ Certificate parse error:", e);
      return new Response(
        JSON.stringify({ valid: false, error: "Invalid certificate" }),
        { status: 200, headers }
      );
    }

    console.log("✅ Certificate parsed");

    // Check expiry
    const now = new Date();
    if (now > cert.validity.notAfter) {
      return new Response(
        JSON.stringify({ valid: false, reason: "CERT_EXPIRED" }),
        { status: 200, headers }
      );
    }

    console.log("✅ Certificate valid");

    // Export public key to SPKI and verify with Web Crypto
    const publicKeyPem = forge.pki.publicKeyToPem(cert.publicKey);
    const spkiMatch = publicKeyPem.match(/-----BEGIN PUBLIC KEY-----\n?([\s\S]+?)\n?-----END PUBLIC KEY-----/);
    
    if (!spkiMatch) {
      throw new Error("Invalid SPKI format");
    }

    const spkiDer = Uint8Array.from(atob(spkiMatch[1]), c => c.charCodeAt(0));

    // Import public key
    const publicKey = await crypto.subtle.importKey(
      "spki",
      spkiDer,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      true,
      ["verify"]
    );

    console.log("✅ Public key imported");

    // Verify signature
    // IMPORTANT: sig.signature is base64-encoded, sig.payload_hash is hex string
    const signatureBytes = Uint8Array.from(atob(sig.signature), c => c.charCodeAt(0));
    
    // Decode hex string to bytes
    const hashBytes = new Uint8Array(
      sig.payload_hash.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16))
    );

    console.log("✅ Signature bytes:", signatureBytes.length, "bytes");
    console.log("✅ Hash bytes:", hashBytes.length, "bytes");

    const isValid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      signatureBytes,
      hashBytes
    );

    console.log("✅ Signature verified:", isValid);

    return new Response(
      JSON.stringify({
        valid: isValid,
        keyId: sig.key_id,
        signedAt: sig.signed_at,
        reason: isValid ? "OK" : "SIGNATURE_INVALID",
      }),
      { status: 200, headers }
    );

  } catch (err) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers }
    );
  }
});
