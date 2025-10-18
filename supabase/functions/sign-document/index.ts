// deno-lint-ignore-file no-explicit-any

import { decode as base64Decode } from "https://deno.land/std@0.224.0/encoding/base64.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SERVICE_ROLE_KEY")!);

Deno.serve(async (req) => {
  try {
    const { documentId } = await req.json();

    // Fetch document
    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    if (error || !doc) {
      return new Response(JSON.stringify({ error: "Document not found" }), {
        status: 404,
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
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      privateKeyBuffer,
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
      signed_at: new Date().toISOString(),
    });
    if (insertError) {
      throw insertError;
    }

    return new Response(JSON.stringify({ ok: true, keyId, hash, signature }), {
      headers: { "Content-Type": "application/json" },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error("Sign function error:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
