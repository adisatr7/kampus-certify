import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { base64Decode, corsHeaders } from "../_shared/index.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const contentType = req.headers.get("content-type") || "";
    const body = contentType.includes("application/json") ? await req.json() : {};

    // Also allow `/verify-document?id=...` for QR links
    const url = new URL(req.url);
    const documentId = body?.documentId ?? url.searchParams.get("id");

    if (!documentId) {
      return new Response(JSON.stringify({ valid: false, error: "Dokumen ID tidak ditemukan" }), {
        status: 400,
        headers,
      });
    }

    // Fetch document
    let doc = null;
    try {
      // Try fetching by ID first
      const { data: byId, error: byIdErr } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();

      if (byId && !byIdErr) {
        doc = byId;
      } else {
        // Fallback: try fetching by serial
        const { data: bySerial, error: bySerialErr } = await supabase
          .from("documents")
          .select("*")
          .eq("serial", documentId)
          .maybeSingle();

        if (bySerial && !bySerialErr) {
          doc = bySerial;
        }
      }
    } catch (e) {
      // ignore and handle below
    }

    if (!doc) {
      return new Response(JSON.stringify({ valid: false, error: "Dokumen tidak ditemukan" }), {
        status: 404,
        headers,
      });
    }

    // Fetch the most recent signature for this document
    const { data: sig, error: sigErr } = await supabase
      .from("document_signatures")
      .select("key_id, payload_hash, signature, signed_at")
      .eq("document_id", documentId)
      .order("signed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sigErr || !sig) {
      return new Response(
        JSON.stringify({ valid: false, error: "Dokumen ini belum ditandatangani" }),
        { status: 404, headers },
      );
    }

    // Rebuild payload and compare hash
    const payload = JSON.stringify({
      title: doc.title,
      content: doc.content,
      user_id: doc.user_id,
      created_at: doc.created_at,
    });

    const enc = new TextEncoder();
    const digest = await crypto.subtle.digest("SHA-256", enc.encode(payload));
    const recomputedHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (recomputedHash !== sig.payload_hash) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "PAYLOAD_HASH_MISMATCH",
          expected: sig.payload_hash,
          got: recomputedHash,
          keyId: sig.key_id,
          signedAt: sig.signed_at,
        }),
        { status: 200, headers },
      );
    }

    // Load signing key details (public key + lifecycle flags)
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select("x, revoked_at, deleted_at, expires_at")
      .eq("kid", sig.key_id)
      .single();

    if (keyErr || !keyRow?.x) {
      return new Response(
        JSON.stringify({
          valid: false,
          error: "Tanda tangan digital tidak valid",
          keyId: sig.key_id,
        }),
        { status: 404, headers },
      );
    }

    // 5) Check lifecycle constraints
    const now = new Date();
    if (keyRow.deleted_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "KEY_DELETED",
          keyId: sig.key_id,
          signedAt: sig.signed_at,
        }),
        { status: 200, headers },
      );
    }
    if (keyRow.revoked_at) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "KEY_REVOKED",
          keyId: sig.key_id,
          signedAt: sig.signed_at,
        }),
        { status: 200, headers },
      );
    }
    if (keyRow.expires_at && new Date(keyRow.expires_at) <= now) {
      return new Response(
        JSON.stringify({
          valid: false,
          reason: "KEY_EXPIRED",
          keyId: sig.key_id,
          signedAt: sig.signed_at,
        }),
        { status: 200, headers },
      );
    }

    // 6) Verify Ed25519(signature, payload_hash) using stored public key (SPKI DER base64)
    const publicKeyBytes = base64Decode(keyRow.x);
    const publicKey = await crypto.subtle.importKey(
      "spki",
      publicKeyBytes.buffer as ArrayBuffer,
      { name: "Ed25519" },
      false,
      ["verify"],
    );

    const signatureBytes = base64Decode(sig.signature);
    const isValid = await crypto.subtle.verify(
      "Ed25519",
      publicKey,
      signatureBytes as BufferSource,
      enc.encode(sig.payload_hash),
    );

    return new Response(
      JSON.stringify({
        valid: Boolean(isValid),
        keyId: sig.key_id,
        signedAt: sig.signed_at,
        reason: isValid ? "OK" : "SIGNATURE_INVALID",
      }),
      { status: 200, headers },
    );
  } catch (err) {
    console.error("Verify function error:", err);
    return new Response(
      JSON.stringify({ valid: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers },
    );
  }
});
