#!/usr/bin/env npx tsx

/**
 * Test complete signing and verification workflow
 */

import { createClient } from "@supabase/supabase-js";
import forge from "node-forge";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

function base64Decode(b64: string): Uint8Array {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decryptAESGCM(
  encryptedBase64: string,
  ivBase64: string,
  masterKeyBase64: string
): Promise<string> {
  const encryptedBytes = base64Decode(encryptedBase64);
  const ivBytes = base64Decode(ivBase64);
  const masterKeyBytes = base64Decode(masterKeyBase64);

  const masterKey = await crypto.subtle.importKey(
    "raw",
    masterKeyBytes,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    masterKey,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBytes);
}

async function testSigningWorkflow() {
  console.log("🧪 Testing Complete Signing and Verification Workflow\n");

  const masterKeyBase64 = process.env.MASTER_KEY_B64;
  if (!masterKeyBase64) {
    console.error("❌ MASTER_KEY_B64 not set");
    process.exit(1);
  }

  // Step 1: Get certificate
  console.log("1️⃣  Fetching certificate...");
  const { data: signingKey, error: keyError } = await supabase
    .from("signing_keys")
    .select("kid, certificate_pem, enc_private_key, enc_private_key_iv")
    .eq("kid", "v1-2026-01-04-ba21f944")
    .single();

  if (keyError || !signingKey) {
    console.error("❌ Certificate not found");
    process.exit(1);
  }

  console.log(`✅ Certificate found: ${signingKey.kid}\n`);

  // Step 2: Create test document
  console.log("2️⃣  Creating test document...");
  const testDoc = {
    title: "Test Verification Document " + Date.now(),
    content: "This is a test document for RSA signature verification",
    user_id: "test-user",
    created_at: new Date().toISOString(),
  };

  const payload = JSON.stringify({
    title: testDoc.title,
    content: testDoc.content,
    user_id: testDoc.user_id,
    created_at: testDoc.created_at,
  });

  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(payload));
  const payloadHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log(`✅ Document hash: ${payloadHash.substring(0, 16)}...\n`);

  // Step 3: Create RSA signature (simulating sign-document function)
  console.log("3️⃣  Creating RSA signature...");
  let signature: string;
  try {
    const privateKeyPem = await decryptAESGCM(
      signingKey.enc_private_key,
      signingKey.enc_private_key_iv,
      masterKeyBase64
    );

    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(payloadHash);

    const signatureBytes = privateKey.sign(md);
    signature = btoa(signatureBytes);

    console.log(`✅ Signature created`);
    console.log(`   Length: ${signature.length} chars`);
    console.log(`   Bytes: ${(signature.length * 3 / 4).toFixed(0)}`);
    console.log(`   First 50 chars: ${signature.substring(0, 50)}...\n`);
  } catch (err) {
    console.error("❌ Signature creation failed:", err);
    process.exit(1);
  }

  // Step 4: Verify signature (simulating verify-document function)
  console.log("4️⃣  Verifying signature...");
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    const publicKey = cert.publicKey;

    const md = forge.md.sha256.create();
    md.update(payloadHash);

    const signatureBinary = atob(signature);
    const isValid = publicKey.verify(md.digest().bytes(), signatureBinary);

    if (isValid) {
      console.log("✅ SIGNATURE VERIFIED SUCCESSFULLY!\n");
    } else {
      console.log("❌ SIGNATURE VERIFICATION FAILED!\n");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Verification failed:", err);
    process.exit(1);
  }

  // Step 5: Test with modified payload (should fail)
  console.log("5️⃣  Testing with modified payload...");
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    const publicKey = cert.publicKey;

    const md = forge.md.sha256.create();
    md.update(payloadHash + "modified");

    const signatureBinary = atob(signature);
    const isValid = publicKey.verify(md.digest().bytes(), signatureBinary);

    if (!isValid) {
      console.log("✅ Correctly rejected modified payload\n");
    } else {
      console.log("❌ FAILED: Accepted modified payload!\n");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Test failed:", err);
    process.exit(1);
  }

  console.log("✅ All tests passed!");
  console.log("\n📊 Summary:");
  console.log(`  • Certificate: ${signingKey.kid}`);
  console.log(`  • Payload hash: ${payloadHash.substring(0, 16)}...`);
  console.log(`  • Signature size: ${(signature.length * 3 / 4).toFixed(0)} bytes (RSA-2048)`);
  console.log(`  • RSA verification: PASSED ✓`);
  console.log(`  • Modified payload rejection: PASSED ✓`);
}

testSigningWorkflow().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
