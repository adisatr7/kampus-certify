import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.get('origin')}`);
  
  try {
    // Handle preflight requests
    if (req.method === "OPTIONS") {
      console.log("Handling OPTIONS preflight request");
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // Only allow POST requests for actual signing
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const { documentId, signerUserId, passphrase } = await req.json();

    if (!documentId || !signerUserId || !passphrase) {
      return new Response(JSON.stringify({ error: "Isi formulir tidak lengkap" }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Simple response for testing
    return new Response(
      JSON.stringify({ 
        ok: true, 
        message: "CORS test successful - minimal sign-document",
        documentId,
        signerUserId,
        timestamp: new Date().toISOString()
      }), 
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {
    console.error("sign-document-minimal error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});