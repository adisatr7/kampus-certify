import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || "";
const SUPABASE_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function signDocument(documentId: string, signerName: string = "Test Signer") {
  try {
    console.log(`\n🔐 Signing document: ${documentId}`);
    console.log(`📝 Signer: ${signerName}\n`);

    // 1. Fetch the document to verify it exists
    console.log("📄 Fetching document...");
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      console.error("❌ Document not found:", docError?.message || "Unknown error");
      return;
    }

    console.log("✅ Document found:", {
      id: document.id,
      title: document.title,
      status: document.status,
      type: document.document_type,
    });

    // 2. Check if document is ijazah or sertifikat
    const isIjazah = document.document_type === "ijazah" || document.title?.toLowerCase().includes("ijazah");
    console.log(`📋 Document type: ${isIjazah ? "Ijazah" : "Sertifikat"}`);

    // 3. Fetch the signing key to get key_id
    console.log("\n🔑 Fetching signing key...");
    const { data: signingKey, error: keyError } = await supabase
      .from("signing_keys")
      .select("id, key_id, x509_certificate")
      .maybeSingle();

    if (keyError || !signingKey) {
      console.error("❌ Signing key not found:", keyError?.message || "Unknown error");
      return;
    }

    console.log("✅ Signing key found:", {
      id: signingKey.id,
      key_id: signingKey.key_id,
      hasCertificate: !!signingKey.x509_certificate,
    });

    // 4. Create a signature record first
    console.log("\n📝 Creating signature record...");
    const signatureData = {
      document_id: documentId,
      key_id: signingKey.id,
      signature: Buffer.from(`test-sig-${Date.now()}`).toString("base64"), // Placeholder
      signer_name: signerName,
      signed_at: new Date().toISOString(),
      reason: "Document Authentication via Script",
      location: "Indonesia",
    };

    const { data: docSig, error: sigError } = await supabase
      .from("document_signatures")
      .insert([signatureData])
      .select()
      .single();

    if (sigError) {
      console.error("❌ Failed to create signature:", sigError.message);
      return;
    }

    console.log("✅ Signature record created:", docSig.id);

    // 5. Update document status
    console.log("\n📊 Updating document status...");
    let newStatus = isIjazah ? "signed_dekan" : "signed";
    let newWorkflowStage = isIjazah ? "dekan_signing" : "completed";

    const { error: updateError } = await supabase
      .from("documents")
      .update({
        status: newStatus,
        workflow_stage: newWorkflowStage,
      })
      .eq("id", documentId);

    if (updateError) {
      console.error("❌ Failed to update document:", updateError.message);
      return;
    }

    console.log("✅ Document status updated:", { status: newStatus, workflow_stage: newWorkflowStage });

    // 6. Call the sign-document edge function
    console.log("\n🚀 Invoking sign-document function...");
    const { data: signResult, error: signError } = await supabase.functions.invoke("sign-document", {
      body: {
        documentId: documentId,
        signerName: signerName,
      },
    });

    if (signError) {
      console.error("❌ Signing function error:", signError);
      return;
    }

    console.log("✅ Signing completed:", signResult);

    if (signResult?.fileUrl) {
      console.log(`\n📥 Signed PDF ready:`);
      console.log(`   ${signResult.fileUrl}`);
    }

    console.log("\n✨ Document signed successfully!\n");
  } catch (error) {
    console.error("❌ Error:", error);
  }
}

// Get document ID from command line argument
const documentId = process.argv[2];
const signerName = process.argv[3] || "System Signer";

if (!documentId) {
  console.error("❌ Usage: deno run --allow-env --allow-net sign-document-quick.ts <documentId> [signerName]");
  console.error("   Example: deno run --allow-env --allow-net sign-document-quick.ts 550e8400-e29b-41d4-a716-446655440000");
  process.exit(1);
}

signDocument(documentId, signerName);
