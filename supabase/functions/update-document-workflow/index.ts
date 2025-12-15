import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId, fileUrl, newUserId, metadata } = await req.json();

    if (!documentId || !metadata) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: documentId, metadata" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Updating document:", documentId);
    console.log("New workflow_stage:", metadata.workflow_stage);
    if (newUserId) {
      console.log("New user_id:", newUserId);
    }

    const updateData: any = {
      metadata: metadata,
    };

    if (fileUrl) {
      updateData.file_url = fileUrl;
    }

    if (newUserId) {
      updateData.user_id = newUserId;
    }

    const { error: updateError } = await supabase
      .from("documents")
      .update(updateData)
      .eq("id", documentId);

    if (updateError) {
      console.error("Update error:", updateError);
      throw updateError;
    }

    console.log("✅ Document updated successfully");

    return new Response(
      JSON.stringify({ ok: true, message: "Document updated successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
