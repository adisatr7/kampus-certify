import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { base64Decode, corsHeaders } from "../_shared/index.ts";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { documentId } = await req.json();

    // Fetch document
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    // Handle missing document error
    if (error || !doc) {
      return new Response(JSON.stringify({ error: "Dokumen tidak ditemukan" }), {
        status: 404,
        headers,
      });
    }

    // Create payload hash
    const payload = JSON.stringify({
      title: doc.title,
      content: doc.content,
      user_id: doc.user_id,
      created_at: doc.created_at,
    });

    // Use Web Crypto to compute SHA-256 and convert to hex string
    const encoder = new TextEncoder();
    const payloadBytes = encoder.encode(payload);
    const digestBuffer = await crypto.subtle.digest("SHA-256", payloadBytes);
    const hash = Array.from(new Uint8Array(digestBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign the hash using Ed25519 private key from env vars
    const privateKeyB64 = Deno.env.get("SIGNING_PRIVATE_KEY_PKCS8_B64")!;
    const keyId = Deno.env.get("SIGNING_KEY_ID")!;

    const privateKeyBuffer = base64Decode(privateKeyB64);
    // crypto.subtle.importKey expects an ArrayBuffer / ArrayBufferView with
    // a concrete ArrayBuffer; create a slice to ensure compatibility across
    // runtimes and to satisfy typed signatures.
    // Copy into a fresh Uint8Array so we have a concrete ArrayBuffer (not
    // a SharedArrayBuffer view) — this avoids typing/runtime mismatches.
    const keyCopy = new Uint8Array(privateKeyBuffer);
    const keyArrayBuffer = keyCopy.buffer;

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      keyArrayBuffer,
      { name: "Ed25519" },
      false,
      ["sign"],
    );

    // Sign the hash
    const dataToSign = new TextEncoder().encode(hash);
    const sigBuffer = await crypto.subtle.sign("Ed25519", cryptoKey, dataToSign);
    const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuffer)));

    // Store signature in database
    const { error: insertError } = await supabase.from("document_signatures").insert({
      document_id: documentId,
      key_id: keyId,
      payload_hash: hash,
      signature,
    });
    if (insertError) {
      throw insertError;
    }

    // Update document status
    const { error: updateError } = await supabase
      .from("documents")
      .update({ status: "signed" })
      .eq("id", documentId);
    if (updateError) {
      throw updateError;
    }

    headers.set("Content-Type", "application/json");

    return new Response(JSON.stringify({ ok: true, keyId, hash, signature }), {
      headers,
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: unknown) {
    console.error("Sign function error:", err);
    headers.set("Content-Type", "application/json");
    let errorMessage: string;
    if (err instanceof Error) {
      errorMessage = err.message;
    } else {
      errorMessage = String(err);
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers,
    });
  }
});
