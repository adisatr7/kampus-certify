import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, pbkdf2Hash, verifyPBKDF2 } from "../_shared/index.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { kid, oldPassphrase, newPassphrase, changedBy } = await req.json();

    if (!kid || !oldPassphrase || !newPassphrase) {
      return new Response(JSON.stringify({ success: false, error: "Data tidak lengkap" }), {
        status: 400,
        headers,
      });
    }

    if (oldPassphrase === newPassphrase) {
      return new Response(
        JSON.stringify({ success: false, error: "Passphrase baru harus berbeda dari yang lama" }),
        { status: 400, headers },
      );
    }

    // Fetch key row (service role)
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select("kid, passphrase_hash, revoked_at, deleted_at")
      .eq("kid", kid)
      .single();

    if (keyErr || !keyRow) {
      return new Response(
        JSON.stringify({ success: false, error: "Signing key tidak ditemukan" }),
        {
          status: 404,
          headers,
        },
      );
    }

    if (keyRow.revoked_at || keyRow.deleted_at) {
      return new Response(
        JSON.stringify({ success: false, error: "Signing key sudah dicabut atau dihapus" }),
        { status: 400, headers },
      );
    }

    // Verify old passphrase
    const ok = await verifyPBKDF2(oldPassphrase, keyRow.passphrase_hash);
    if (!ok) {
      return new Response(JSON.stringify({ success: false, error: "Passphrase lama salah" }), {
        status: 403,
        headers,
      });
    }

    // Hash new passphrase
    const newHash = await pbkdf2Hash(newPassphrase);

    const { error: updateErr } = await supabase
      .from("signing_keys")
      .update({ passphrase_hash: newHash })
      .eq("kid", kid);

    if (updateErr) {
      return new Response(
        JSON.stringify({ success: false, error: String(updateErr.message || updateErr) }),
        { status: 500, headers },
      );
    }

    return new Response(
      JSON.stringify({ success: true, error: null, data: { kid, changedBy: changedBy || null } }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("change-passphrase error:", err);
    return new Response(JSON.stringify({ success: false, error: String(err?.message ?? err) }), {
      status: 500,
      headers,
    });
  }
});
