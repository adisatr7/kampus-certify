import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const body = await req.json();
    const documentId = body?.documentId;
    const url = new URL(req.url);
    const docIdFromUrl = url.searchParams.get("id");
    const finalDocId = documentId || docIdFromUrl;

    if (!finalDocId) {
      return new Response(
        JSON.stringify({ valid: false, signed: false, error: "Document ID not provided" }),
        { status: 400, headers }
      );
    }

    console.log("✅ Checking document signature for:", finalDocId);

    // First try as UUID, if that fails try as serial/code
    let signatures = null;
    let error = null;
    
    // Try as UUID first
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(finalDocId)) {
      const result = await supabase
        .from("document_signatures")
        .select("id, signature, signed_at, signer_user_id, key_id")
        .eq("document_id", finalDocId)
        .limit(1);
      signatures = result.data;
      error = result.error;
    } else {
      // Try as serial/code
      const docResult = await supabase
        .from("documents")
        .select("id")
        .eq("serial", finalDocId)
        .limit(1)
        .maybeSingle();
      
      if (docResult.data?.id) {
        const sigResult = await supabase
          .from("document_signatures")
          .select("id, signature, signed_at, signer_user_id, key_id")
          .eq("document_id", docResult.data.id)
          .limit(1);
        signatures = sigResult.data;
        error = sigResult.error;
      } else if (docResult.error) {
        error = docResult.error;
      }
    }

    if (error) {
      console.error("❌ Database error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Database error: " + (error?.message || String(error)),
          valid: false, 
          signed: false,
          details: error
        }),
        { status: 500, headers }
      );
    }

    const isSigned = signatures && signatures.length > 0;
    
    if (isSigned) {
      const sig = signatures[0];
      return new Response(
        JSON.stringify({
          valid: true,
          signed: true,
          signedAt: sig.signed_at,
          signedBy: sig.signer_user_id,
          keyId: sig.key_id,
          message: "Dokumen telah ditandatangani"
        }),
        { status: 200, headers }
      );
    } else {
      return new Response(
        JSON.stringify({
          valid: false,
          signed: false,
          message: "Dokumen belum ditandatangani"
        }),
        { status: 200, headers }
      );
    }

  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ 
        error: err instanceof Error ? err.message : String(err),
        valid: false,
        signed: false
      }),
      { status: 500, headers }
    );
  }
});
