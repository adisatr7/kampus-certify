// Simple test function to check CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
};

Deno.serve(async (req: Request) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.get('origin')}`);
  
  try {
    // Handle preflight
    if (req.method === "OPTIONS") {
      console.log("Handling OPTIONS preflight request");
      return new Response(null, { 
        status: 204, 
        headers: corsHeaders 
      });
    }

    // Handle POST - temporary workaround for sign-document
    if (req.method === "POST") {
      console.log("Handling POST request - temporary sign-document workaround");
      
      try {
        const body = await req.json();
        console.log("Received signing request:", body);
        
        // Return success response to bypass CORS issue temporarily
        return new Response(
          JSON.stringify({ 
            ok: true,
            message: "CORS workaround - signing temporarily bypassed",
            timestamp: new Date().toISOString(),
            keyId: "temp-key-id",
            hash: "temp-hash",
            signature: "temp-signature",
            pdfGenerated: false
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
        console.error("Error processing POST request:", error);
        return new Response(
          JSON.stringify({ error: "Failed to process request" }), 
          {
            status: 400,
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }
    }

    // Handle GET for simple testing
    if (req.method === "GET") {
      console.log("Handling GET request");
      return new Response(
        JSON.stringify({ message: "GET test successful", timestamp: new Date().toISOString() }), 
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      }
    });
  } catch (error) {
    console.error("Error in test-cors function:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      }
    });
  }
});