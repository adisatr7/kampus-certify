import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/index.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("content-type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { kid } = await req.json();

    if (!kid || typeof kid !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Missing or invalid 'kid'", data: null }),
        { status: 400, headers },
      );
    }

    const payload: Record<string, unknown> = { revoked_at: new Date().toISOString() };

    const { data, error } = await supabase
      .from("signing_keys")
      .update(payload)
      .eq("kid", kid)
      .select();

    if (error) {
      console.error("revoke-signing-key error:", error);
      return new Response(
        JSON.stringify({ success: false, error: String(error.message || error), data: null }),
        { status: 500, headers },
      );
    }

    if (!data || (Array.isArray(data) && data.length === 0)) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "No row updated. Either the key does not exist, or a trigger/constraint prevented the update.",
          data: null,
        }),
        { status: 404, headers },
      );
    }

    return new Response(JSON.stringify({ success: true, error: null, data: data[0] ?? data }), {
      status: 200,
      headers,
    });
  } catch (err) {
    console.error("revoke-signing-key exception:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message ?? err), data: null }),
      { status: 500, headers },
    );
  }
});
