#!/usr/bin/env npx tsx

/**
 * Create a test document dan test sign+verify workflow
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function createTestDocumentAndSign() {
  console.log("📄 Creating test document for signing...\n");

  // Create test document
  const docData = {
    user_id: "d743107a-8cf5-4b24-bef3-c2bfe90e2d98", // test user
    title: "Test Document for RSA Verification - " + Date.now(),
    content: "This document is being tested for RSA signature verification",
    status: "pending",
    document_type: "other",
    recipient_name: "Test User",
    recipient_student_number: "",
  };

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert(docData)
    .select()
    .single();

  if (docErr || !doc) {
    console.error("❌ Failed to create document:", docErr?.message);
    process.exit(1);
  }

  console.log("✅ Document created");
  console.log(`   ID: ${doc.id}`);
  console.log(`   Title: ${doc.title}\n`);

  // Now call sign-document function
  console.log("🔐 Calling sign-document function...");
  const { data: signResult, error: signError } = await supabase.functions.invoke(
    "sign-document",
    {
      body: {
        documentId: doc.id,
        signerUserId: "d743107a-8cf5-4b24-bef3-c2bfe90e2d98",
        passphrase: "test-passphrase", // default test passphrase
        kid: "v1-2026-01-04-ba21f944",
      },
    }
  );

  if (signError) {
    console.error("❌ Sign-document error:", signError);
    try {
      const errorText = await signError.context?.text?.();
      console.error("Error details:", errorText);
    } catch (e) {
      // ignore
    }
    process.exit(1);
  }

  console.log("✅ Document signed");
  console.log(JSON.stringify(signResult, null, 2));

  // Now verify the signature
  console.log("\n✅ Verifying signature...");
  const { data: verifyResult, error: verifyError } = await supabase.functions.invoke(
    "verify-document",
    {
      body: {
        documentId: doc.id,
      },
    }
  );

  if (verifyError) {
    console.error("❌ Verify-document error:", verifyError);
  } else {
    console.log(JSON.stringify(verifyResult, null, 2));
    
    if (verifyResult.valid) {
      console.log("\n✅ SIGNATURE VERIFIED SUCCESSFULLY!");
    } else {
      console.log("\n❌ Signature verification failed");
      console.log("Reason:", verifyResult.reason);
      if (verifyResult.details) {
        console.log("Details:", verifyResult.details);
      }
    }
  }
}

createTestDocumentAndSign().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
