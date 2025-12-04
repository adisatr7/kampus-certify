import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, authorization",
  "Access-Control-Max-Age": "86400",
};

interface CreateUserRequest {
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
    const body: CreateUserRequest = await req.json();

    // Validate input
    if (!body.email || !body.name || !body.role) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: email, name, role",
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

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("email", body.email)
      .maybeSingle();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: "User dengan email ini sudah terdaftar" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create user in users table
    const { data: newUser, error: userError } = await supabaseAdmin
      .from("users")
      .insert({
        email: body.email,
        name: body.name,
        role: body.role,
        nip: body.nip || null,
        jabatan: body.jabatan || null,
      })
      .select()
      .single();

    if (userError) {
      console.error("Error creating user:", userError);
      return new Response(
        JSON.stringify({ error: `Gagal membuat pengguna: ${userError.message}` }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Create user role entry
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: newUser.id,
        role: body.role,
      });

    if (roleError) {
      console.error("Error creating user role:", roleError);
      // Delete user if role creation fails
      await supabaseAdmin.from("users").delete().eq("id", newUser.id);

      return new Response(
        JSON.stringify({
          error: `Gagal membuat role pengguna: ${roleError.message}`,
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
        user: newUser,
        message: "Pengguna berhasil dibuat",
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
