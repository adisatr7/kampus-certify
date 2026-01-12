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

    // Fetch the user's existing signing key (created via create-certificate)
    console.log("🔑 Fetching user's signing key from database...");
    
    // Check if signer is an admin
    const { data: signerUser, error: signerErr } = await supabase
      .from("users")
      .select("role")
      .eq("id", signerUserId)
      .maybeSingle();

    const isAdmin = !signerErr && signerUser?.role === "admin";
    console.log("🔑 Signer role check: isAdmin =", isAdmin);

    // Admin can use any key, non-admin only their own
    let keyQuery = supabase
      .from("signing_keys")
      .select("*")
      .is("revoked_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    // If not admin, restrict to user's own keys
    if (!isAdmin) {
      keyQuery = keyQuery.eq("assigned_to", signerUserId);
    } else {
      // For admin, get the key for the document owner
      keyQuery = keyQuery.eq("assigned_to", document.user_id);
    }
    
    const { data: existingKey, error: keyError } = await keyQuery.maybeSingle();

    if (keyError || !existingKey) {
      console.error("❌ No signing key found:", keyError);
      const errorMsg = isAdmin 
        ? "No signing key found for document owner. Please create a certificate for the document owner first."
        : "No signing key found for user. Please create a certificate first via the Certificate Management page.";
      
      return new Response(
        JSON.stringify({ 
          error: errorMsg,
          details: keyError?.message 
        }), 
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const newKeyId = existingKey.kid;
    console.log("✅ Using existing signing key:", newKeyId);

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

    // NOTE: Signature will be created by sign-document-v2 when user actually signs the document
    // Do NOT create a placeholder signature here as it will be random and invalid!
    
    // Insert empty signature record - will be filled in by sign-document-v2
    const { error: sigError } = await supabase
      .from("document_signatures")
      .insert({
        document_id: documentId,
        key_id: newKeyId,
        payload_hash: payloadHash,
        signature: "", // Empty signature - will be updated by sign-document-v2
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

    console.log("✅ Signature record created (placeholder - will be filled by sign-document-v2)");

    // Create audit entry for signing
    try {
      await supabase.rpc("create_audit_entry", {
        p_user_id: signerUserId,
        p_action: "SIGN_DOCUMENT",
        p_description: `Memulai proses penandatanganan dokumen "${document.title}" dengan key ${newKeyId}`
      });
      console.log("✅ Audit entry created");
    } catch (auditErr) {
      console.warn("⚠️ Failed to create audit entry:", auditErr);
    }

    return new Response(
      JSON.stringify({ 
        ok: true,
        message: "Signature record created (ready for signing via sign-document-v2)",
        keyId: newKeyId,
        payloadHash: payloadHash.substring(0, 20) + "...",
        documentId: documentId
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
