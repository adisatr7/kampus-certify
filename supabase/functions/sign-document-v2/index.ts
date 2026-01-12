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

function base64Decode(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

function base64Encode(bytes: Uint8Array): string {
  let result = '';
  for (let i = 0; i < bytes.length; i += 65536) {
    result += String.fromCharCode.apply(null, Array.from(bytes.slice(i, i + 65536)));
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

    console.log("📝 Signing document:", documentId);

    // Fetch document
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

    console.log("✅ Document found:", document.title);

    // Create payload hash - store the digest bytes for signing
    const payload = JSON.stringify({
      title: document.title,
      content: document.content,
      user_id: document.user_id,
      created_at: document.created_at,
    });

    const enc = new TextEncoder();
    const digestBuffer = await crypto.subtle.digest("SHA-256", enc.encode(payload));
    const digestBytes = new Uint8Array(digestBuffer);
    
    // Store hash as hex for DB record
    const hashToSign = Array.from(digestBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("📝 Payload hash:", hashToSign);

    // Get signing key
    const { data: signingKey, error: keyError } = await supabase
      .from("signing_keys")
      .select("kid, certificate_pem, enc_private_key, enc_private_key_iv")
      .eq("assigned_to", signerUserId)
      .is("revoked_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyError || !signingKey) {
      return new Response(
        JSON.stringify({ error: "No signing key found" }),
        { status: 404, headers }
      );
    }

    console.log("✅ Signing key found:", signingKey.kid);

    // Decrypt private key
    const masterKeyBase64 = Deno.env.get("MASTER_KEY_B64");
    if (!masterKeyBase64) {
      throw new Error("MASTER_KEY_B64 not set");
    }

    const privateKeyPem = await decryptAESGCM(
      signingKey.enc_private_key,
      signingKey.enc_private_key_iv,
      masterKeyBase64
    );

    console.log("✅ Private key decrypted");

    // Parse and convert private key using ASN.1 DER directly
    let pkcs8Bytes: Uint8Array;
    try {
      const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
      const asn1 = forge.pki.privateKeyToAsn1(privateKey);
      const der = forge.asn1.toDer(asn1).bytes();
      pkcs8Bytes = Uint8Array.from(der, (c: string) => c.charCodeAt(0));
      console.log("✅ Private key converted to DER bytes");
      console.log(`   DER length: ${pkcs8Bytes.length} bytes`);
    } catch (parseErr) {
      console.error("❌ Failed to parse/convert key:", parseErr);
      throw new Error(`Invalid private key format: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`);
    }

    // Import key into Web Crypto
    let cryptoKey;
    try {
      cryptoKey = await crypto.subtle.importKey(
        "pkcs8",
        pkcs8Bytes,
        {
          name: "RSASSA-PKCS1-v1_5",
          hash: "SHA-256"
        },
        false,
        ["sign"]
      );
      console.log("✅ Key imported to Web Crypto");
    } catch (importErr) {
      console.error("❌ Failed to import key:", importErr);
      throw new Error(`Key import failed: ${importErr instanceof Error ? importErr.message : String(importErr)}`);
    }

    // Sign the digest bytes directly
    let signatureBuffer;
    try {
      signatureBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        digestBytes
      );
      console.log("✅ Signature created");
    } catch (signErr) {
      console.error("❌ Signing failed:", signErr);
      throw new Error(`Signature creation failed: ${signErr instanceof Error ? signErr.message : String(signErr)}`);
    }

    // Encode signature to base64 safely
    const signatureBytes = new Uint8Array(signatureBuffer);
    const signature = base64Encode(signatureBytes);
    
    console.log(`✅ Signature encoded: ${signatureBytes.length} bytes → ${signature.length} chars base64`);

    // Store signature - UPDATE if exists (created by create-signature-record), INSERT if not
    const { error: sigError } = await supabase
      .from("document_signatures")
      .upsert({
        document_id: document.id,
        key_id: signingKey.kid,
        payload_hash: hashToSign,
        signature: signature,
        signer_user_id: signerUserId,
        signed_at: new Date().toISOString()
      }, {
        onConflict: "document_id"
      });

    if (sigError) {
      console.error("❌ Database upsert failed:", sigError);
      throw sigError;
    }

    console.log("✅ Signature stored in database");

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
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers }
    );
  }
});
