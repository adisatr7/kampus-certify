import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// Base64 utility functions
function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Edge function that creates a REAL cryptographic signature record
Deno.serve(async (req: Request) => {
  console.log(`${req.method} ${req.url}`);
  
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { 
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { documentId, signerUserId, passphrase } = await req.json();

    if (!documentId || !signerUserId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentId, signerUserId" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    console.log("🔐 Creating signature record for document:", documentId);

    // Fetch document data
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      console.error("Document fetch error:", docError);
      return new Response(
        JSON.stringify({ error: "Document not found" }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete any existing signature for this document (to allow re-signing)
    const { error: deleteError } = await supabase
      .from("document_signatures")
      .delete()
      .eq("document_id", documentId);

    if (deleteError) {
      console.log("⚠️ Could not delete existing signatures:", deleteError.message);
    } else {
      console.log("🗑️ Cleared existing signatures for document");
    }

    // Generate a fresh Ed25519 key pair for this signature
    console.log("🔑 Generating fresh Ed25519 key pair...");
    
    const keyPair = await crypto.subtle.generateKey(
      { name: "Ed25519" },
      true,
      ["sign", "verify"]
    );

    // Export public key in SPKI format
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = base64Encode(new Uint8Array(publicKeyBuffer));

    // Export private key in PKCS8 format  
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);
    const privateKeyBytes = new Uint8Array(privateKeyBuffer);

    // Generate unique key ID
    const dateStr = new Date().toISOString().split('T')[0];
    const randomPart = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const newKeyId = `v1-${dateStr}-${randomPart}`;

    // Store private key with simple base64 encoding (for demo purposes)
    // In production, use proper AES-GCM encryption with the passphrase
    const encryptedPrivateKey = base64Encode(privateKeyBytes);
    const iv = base64Encode(crypto.getRandomValues(new Uint8Array(12)));

    // Calculate expiry date (1 year from now)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Insert new signing key
    const { error: insertKeyError } = await supabase
      .from("signing_keys")
      .insert({
        kid: newKeyId,
        kty: "OKP",
        crv: "Ed25519",
        x: publicKeyBase64,
        enc_private_key: encryptedPrivateKey,
        enc_private_key_iv: iv,
        enc_algo: "SIMPLE-B64",
        active: true,
        assigned_to: signerUserId,
        created_by: signerUserId,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (insertKeyError) {
      console.error("Failed to create signing key:", insertKeyError);
      return new Response(
        JSON.stringify({ error: "Failed to create signing key", details: insertKeyError.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Created new signing key:", newKeyId);

    // Create document payload for hashing (MUST match verify-document format)
    const payload = JSON.stringify({
      title: document.title,
      content: document.content,
      user_id: document.user_id,
      created_at: document.created_at,
    });

    // Create SHA-256 hash
    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(payload));
    const payloadHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    console.log("📝 Payload hash:", payloadHash.substring(0, 20) + "...");

    // Create REAL Ed25519 signature using the freshly generated private key
    const signatureBuffer = await crypto.subtle.sign(
      "Ed25519",
      keyPair.privateKey,
      enc.encode(payloadHash)
    );
    
    const signature = base64Encode(new Uint8Array(signatureBuffer));
    console.log("✅ Created Ed25519 signature, length:", signature.length);

    // Verify the signature immediately to ensure it's valid
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      keyPair.publicKey,
      signatureBuffer,
      enc.encode(payloadHash)
    );
    
    if (!isValid) {
      console.error("❌ Signature verification failed immediately after creation");
      return new Response(
        JSON.stringify({ error: "Signature verification failed" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    console.log("✅ Signature verified successfully");

    // Insert signature record
    const { error: sigError } = await supabase
      .from("document_signatures")
      .insert({
        document_id: documentId,
        key_id: newKeyId,
        payload_hash: payloadHash,
        signature: signature,
        signer_user_id: signerUserId,
        signed_at: new Date().toISOString()
      });

    if (sigError) {
      console.error("❌ Failed to insert signature record:", sigError);
      return new Response(
        JSON.stringify({ error: "Failed to create signature record", details: sigError.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Signature record created successfully");

    // Create audit entry for signing
    try {
      await supabase.rpc("create_audit_entry", {
        p_user_id: signerUserId,
        p_action: "SIGN_DOCUMENT",
        p_description: `Menandatangani dokumen "${document.title}" dengan key ${newKeyId}`
      });
      console.log("✅ Audit entry created");
    } catch (auditErr) {
      console.warn("⚠️ Failed to create audit entry:", auditErr);
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: "Signature record created successfully with real Ed25519 signature",
        keyId: newKeyId,
        payloadHash: payloadHash.substring(0, 20) + "...",
        signatureVerified: true
      }), 
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in create-signature-record function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
