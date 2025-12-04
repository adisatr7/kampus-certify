import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, authorization",
  "Access-Control-Max-Age": "86400",
};

interface UpdateUserRequest {
  id: string;
  email: string;
  name: string;
  role: "admin" | "dosen" | "dekan" | "rektor";
  nip?: string | null;
  jabatan?: string | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
    );

    // Parse request body
    const body: UpdateUserRequest = await req.json();

    // Validate input
    if (!body.id || !body.email || !body.name || !body.role) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: id, email, name, role",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update user in users table
    const { data: updatedUser, error: userError } = await supabaseAdmin
      .from("users")
      .update({
        email: body.email,
        name: body.name,
        role: body.role,
        nip: body.nip || null,
        jabatan: body.jabatan || null,
      })
      .eq("id", body.id)
      .select()
      .single();

    if (userError) {
      console.error("Error updating user:", userError);
      return new Response(
        JSON.stringify({ error: `Gagal memperbarui pengguna: ${userError.message}` }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update user role if role changed
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .update({ role: body.role })
      .eq("user_id", body.id);

    if (roleError) {
      console.error("Error updating user role:", roleError);
      return new Response(
        JSON.stringify({
          error: `Gagal memperbarui role pengguna: ${roleError.message}`,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: updatedUser,
        message: "Pengguna berhasil diperbarui",
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
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
