// Simplified sign-document function for testing
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

    // Simple response for now
    return new Response(
      JSON.stringify({ 
        message: "Sign document function is working",
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

  } catch (error) {
    console.error("Error in sign-document-simple:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      }
    });
  }
});