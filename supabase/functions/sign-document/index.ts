import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSignedPDF, uploadPDF } from "../_shared/pdfGenerator.ts";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64 utilities
function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s);
}

// PBKDF2 verify function
async function verifyPBKDF2(pass: string, stored: string): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = base64Decode(parts[2]);
  const expectedHash = base64Decode(parts[3]);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    expectedHash.byteLength * 8,
  );
  const derivedBytes = new Uint8Array(derived);
  if (derivedBytes.length !== expectedHash.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i] ^ expectedHash[i];
  }
  return diff === 0;
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// Helper for base64 → string
function base64ToStr(bytes: Uint8Array) {
  return String.fromCharCode(...bytes);
}

// Retry helper with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("All retry attempts failed");
}

// Generate and upload PDF with retry logic
async function generateAndUploadPDF(
  documentId: string,
  userId: string,
): Promise<{ fileUrl: string; pdfGenerated: boolean }> {
  try {
    console.log("Starting PDF generation for document:", documentId);
    
    // Fetch document with all necessary data
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();
    
    if (docError || !document) {
      throw new Error(`Failed to fetch document: ${docError?.message || "Not found"}`);
    }
    
    // Fetch all signatures for this document
    const { data: signatures, error: sigError } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("document_id", documentId)
      .order("created_at", { ascending: true });
    
    if (sigError) {
      throw new Error(`Failed to fetch signatures: ${sigError.message}`);
    }
    
    // Generate PDF
    console.log("Generating PDF...");
    const pdfBytes = await generateSignedPDF(document, signatures || [], supabase);
    console.log("PDF generated successfully, size:", pdfBytes.length, "bytes");
    
    // Upload PDF with retry logic
    console.log("Uploading PDF to storage...");
    const fileUrl = await retryWithBackoff(
      () => uploadPDF(pdfBytes, userId, documentId, supabase),
      3,
      1000
    );
    console.log("PDF uploaded successfully:", fileUrl);
    
    // Update document with file_url with retry logic
    console.log("Updating document with file_url...");
    await retryWithBackoff(async () => {
      const { error: updateError } = await supabase
        .from("documents")
        .update({ file_url: fileUrl })
        .eq("id", documentId);
      
      if (updateError) {
        throw new Error(`Failed to update file_url: ${updateError.message}`);
      }
    }, 3, 1000);
    
    console.log("Document updated successfully with file_url");
    
    return { fileUrl, pdfGenerated: true };
  } catch (error) {
    console.error("Error in generateAndUploadPDF:", error);
    // Don't throw - we want signing to succeed even if PDF generation fails
    return { fileUrl: "", pdfGenerated: false };
  }
}

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { documentId, signerUserId, passphrase } = await req.json();

    if (!documentId || !signerUserId || !passphrase) {
      return new Response(JSON.stringify({ error: "Isi formulir tidak lengkap" }), {
        status: 400,
        headers,
      });
    }

    // Fetch document with metadata for workflow
    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("id, title, content, user_id, created_at, metadata")
      .eq("id", documentId)
      .single();

    if (docErr || !doc) {
      return new Response(JSON.stringify({ error: "Dokumen tidak ditemukan" }), {
        status: 404,
        headers,
      });
    }

    // Fetch signer’s latest usable key
    const { data: keyRow, error: keyErr } = await supabase
      .from("signing_keys")
      .select(
        "kid, assigned_to, passphrase_hash, x, enc_private_key, enc_private_key_iv, enc_algo, revoked_at, deleted_at, expires_at",
      )
      .eq("assigned_to", signerUserId)
      .is("revoked_at", null)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (keyErr || !keyRow) {
      return new Response(
        JSON.stringify({ error: "Sertifikat tidak ditemukan atau sudah dicabut" }),
        { status: 404, headers },
      );
    }

    // Check expiry
    if (keyRow.expires_at && new Date(keyRow.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Sertifikat sudah kadaluarsa" }), {
        status: 400,
        headers,
      });
    }

    // Verify passphrase
    const passOK = await verifyPBKDF2(passphrase, keyRow.passphrase_hash);
    if (!passOK) {
      return new Response(JSON.stringify({ error: "Passphrase salah" }), {
        status: 403,
        headers,
      });
    }

    // Import master key and decrypt private key
    const MASTER_KEY_B64 = Deno.env.get("MASTER_KEY_B64");
    if (!MASTER_KEY_B64) {
      return new Response(JSON.stringify({ error: "Master key tidak tersimpan di sistem" }), {
        status: 500,
        headers,
      });
    }
    const masterKeyBytes = base64Decode(MASTER_KEY_B64);
    const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
      "decrypt",
    ]);

    const iv = base64Decode(keyRow.enc_private_key_iv);
    const ciphertext = base64Decode(keyRow.enc_private_key);
    const decryptedPkcs8 = new Uint8Array(
      await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, ciphertext),
    );

    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      decryptedPkcs8.buffer,
      { name: "Ed25519" },
      false,
      ["sign"],
    );

    // Canonical payload MUST MATCH verify endpoint (title, content, user_id, created_at)
    const payload = JSON.stringify({
      title: doc.title,
      content: doc.content,
      user_id: doc.user_id,
      created_at: doc.created_at, // use DB timestamp to avoid drift
    });

    const payloadBytes = new TextEncoder().encode(payload);
    const digestBuffer = await crypto.subtle.digest("SHA-256", payloadBytes);
    const hash = Array.from(new Uint8Array(digestBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Sign the hash
    const dataToSign = new TextEncoder().encode(hash);
    const sigBuffer = await crypto.subtle.sign("Ed25519", cryptoKey, dataToSign);
    const signature = btoa(base64ToStr(new Uint8Array(sigBuffer)));

    // Fetch user role for workflow tracking
    const { data: userData } = await supabase
      .from("users")
      .select("role")
      .eq("id", signerUserId)
      .single();

    // Store signature in database with signer role
    const { error: insertError } = await supabase.from("document_signatures").insert({
      document_id: documentId,
      key_id: keyRow.kid,
      payload_hash: hash,
      signature,
      signer_user_id: signerUserId,
      signer_role: userData?.role || null,
    });
    if (insertError) {
      throw insertError;
    }

    // Check if this is part of a multi-stage workflow
    const metadata = doc.metadata as any;
    const workflowStage = metadata?.workflow_stage;
    const rektorId = metadata?.rektor_id;
    const signer1Id = metadata?.signer1_id;
    const signer2Id = metadata?.signer2_id;

    let shouldGeneratePDF = false;
    let fileUrl = "";
    let pdfGenerated = false;

    // Determine if this is a multi-stage workflow and handle transitions
    let isMultiStage = false;
    let isFinalStage = false;

    // Ijazah workflow: dekan_pending → dekan → rektor
    if (workflowStage === "dekan_pending" || workflowStage === "dekan") {
      isMultiStage = true;
      if (rektorId) {
        // Dekan signed, transition to rektor
        const { error: workflowError } = await supabase
          .from("documents")
          .update({
            status: "pending",
            user_id: rektorId,
            signing_key_id: keyRow.kid,
            metadata: {
              ...metadata,
              workflow_stage: "rektor",
              dekan_signed_at: new Date().toISOString(),
            },
          })
          .eq("id", documentId);

        if (workflowError) {
          console.error("Workflow transition error (dekan → rektor):", workflowError);
        }
        
        isFinalStage = false;
        console.log("Ijazah workflow: Dekan signed, transitioning to Rektor");
      } else {
        // No rektor specified, this is final
        isFinalStage = true;
        console.log("Ijazah workflow: No rektor specified, treating as final stage");
      }
    } 
    // Ijazah workflow: rektor stage (final)
    else if (workflowStage === "rektor") {
      isMultiStage = true;
      isFinalStage = true;
      console.log("Ijazah workflow: Rektor signed (final stage)");
    }
    // Sertifikat workflow: pending_signer1 → pending_signer2 (if exists)
    else if (workflowStage === "pending_signer1") {
      isMultiStage = true;
      if (signer2Id) {
        // Signer1 signed, transition to signer2
        const { error: workflowError } = await supabase
          .from("documents")
          .update({
            status: "pending",
            user_id: signer2Id,
            signing_key_id: keyRow.kid,
            metadata: {
              ...metadata,
              workflow_stage: "pending_signer2",
              signer1_signed_at: new Date().toISOString(),
            },
          })
          .eq("id", documentId);

        if (workflowError) {
          console.error("Workflow transition error (signer1 → signer2):", workflowError);
        }
        
        isFinalStage = false;
        console.log("Sertifikat workflow: Signer1 signed, transitioning to Signer2");
      } else {
        // No signer2, this is final
        isFinalStage = true;
        console.log("Sertifikat workflow: No signer2, treating as final stage");
      }
    }
    // Sertifikat workflow: pending_signer2 (final)
    else if (workflowStage === "pending_signer2") {
      isMultiStage = true;
      isFinalStage = true;
      console.log("Sertifikat workflow: Signer2 signed (final stage)");
    }
    // No workflow stage or unknown stage - treat as single-stage document
    else {
      isMultiStage = false;
      isFinalStage = true;
      console.log("Single-stage document or unknown workflow stage");
    }

    // Update document status based on whether this is the final stage
    if (isFinalStage) {
      const { error: updateError } = await supabase
        .from("documents")
        .update({ status: "signed", signing_key_id: keyRow.kid })
        .eq("id", documentId);
      if (updateError) {
        throw updateError;
      }
      
      // Generate PDF only at final stage
      shouldGeneratePDF = true;
      console.log("Final signature - will generate PDF");
    } else {
      // Not final stage, don't generate PDF yet
      shouldGeneratePDF = false;
      console.log("Multi-stage workflow: waiting for next signer, PDF generation deferred");
    }

    // Generate and upload PDF if this is the final signature
    if (shouldGeneratePDF) {
      try {
        const pdfResult = await generateAndUploadPDF(documentId, doc.user_id);
        fileUrl = pdfResult.fileUrl;
        pdfGenerated = pdfResult.pdfGenerated;
        
        if (!pdfGenerated) {
          console.warn("PDF generation failed, but signing completed successfully");
        }
      } catch (error) {
        // Log error but don't fail the signing process
        console.error("PDF generation error (non-fatal):", error);
        pdfGenerated = false;
      }
    }

    return new Response(
      JSON.stringify({ 
        ok: true, 
        keyId: keyRow.kid, 
        hash, 
        signature,
        fileUrl: fileUrl || undefined,
        pdfGenerated,
      }), 
      {
        status: 200,
        headers,
      }
    );
  } catch (err) {
    console.error("sign-document error:", err);
    return new Response(JSON.stringify({ error: String(err?.message ?? err) }), {
      status: 500,
      headers,
    });
  }
});
