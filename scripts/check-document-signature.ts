#!/usr/bin/env npx tsx

/**
 * Check document and signature data
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkDocument() {
  console.log("🔍 Checking document and signature data...\n");

  // Get recent documents
  const { data: docs, error: docErr } = await supabase
    .from("documents")
    .select("id, title, serial, status, user_id, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  if (docErr) {
    console.error("❌ Error fetching documents:", docErr.message);
    process.exit(1);
  }

  console.log("📄 Recent documents:");
  docs?.forEach((doc: any) => {
    console.log(`  ID: ${doc.id}`);
    console.log(`  Serial: ${doc.serial}`);
    console.log(`  Title: ${doc.title}`);
    console.log(`  Status: ${doc.status}`);
    console.log(`  Created: ${doc.created_at}`);
    console.log();
  });

  // Get recent signatures
  const { data: sigs, error: sigErr } = await supabase
    .from("document_signatures")
    .select("id, document_id, key_id, payload_hash, signature, signed_at")
    .order("signed_at", { ascending: false })
    .limit(5);

  if (sigErr) {
    console.error("❌ Error fetching signatures:", sigErr.message);
    process.exit(1);
  }

  console.log("🔐 Recent signatures:");
  sigs?.forEach((sig: any) => {
    console.log(`  Document ID: ${sig.document_id}`);
    console.log(`  Key ID: ${sig.key_id}`);
    console.log(`  Hash: ${sig.payload_hash?.substring(0, 16)}...`);
    console.log(`  Signed: ${sig.signed_at}`);
    console.log();
  });

  // Check specific document if provided
  const docIdArg = process.argv[2];
  if (docIdArg) {
    console.log(`\n🔎 Checking specific document: ${docIdArg}\n`);

    const { data: doc, error: docErr } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docIdArg)
      .single();

    if (docErr) {
      console.error("❌ Document not found:", docErr.message);
      return;
    }

    console.log("📄 Document:");
    console.log(JSON.stringify(doc, null, 2));

    const { data: sig, error: sigErr } = await supabase
      .from("document_signatures")
      .select("*")
      .eq("document_id", docIdArg)
      .order("signed_at", { ascending: false })
      .limit(1)
      .single();

    if (sigErr) {
      console.error("❌ No signature found for this document");
      return;
    }

    console.log("\n🔐 Signature:");
    console.log(JSON.stringify(sig, null, 2));

    // Check certificate
    const { data: cert, error: certErr } = await supabase
      .from("signing_keys")
      .select("kid, certificate_pem, certificate_subject, certificate_issuer")
      .eq("kid", sig.key_id)
      .single();

    if (certErr) {
      console.error("❌ Certificate not found:", certErr.message);
      return;
    }

    console.log("\n✅ Certificate:");
    console.log(`  Kid: ${cert.kid}`);
    console.log(`  Subject: ${cert.certificate_subject}`);
    console.log(`  Issuer: ${cert.certificate_issuer}`);
    console.log(`  PEM length: ${cert.certificate_pem.length} chars`);
  }
}

checkDocument().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
