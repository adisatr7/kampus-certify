#!/usr/bin/env npx tsx

/**
 * Test end-to-end RSA signing and verification with database
 * This simulates the full workflow:
 * 1. Get a test certificate from the database
 * 2. Sign a test document
 * 3. Verify the signature
 */

import { createClient } from "@supabase/supabase-js";
import forge from "node-forge";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

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

function base64Decode(b64: string): Uint8Array {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(data: Uint8Array | string): string {
  if (typeof data === "string") {
    return btoa(data);
  }
  return btoa(String.fromCharCode(...data));
}

async function testRSASigningWithDatabase() {
  console.log("🧪 Testing End-to-End RSA Signing and Verification\n");

  // Get master key
  const masterKeyBase64 = process.env.MASTER_KEY_B64;
  if (!masterKeyBase64) {
    console.error("❌ MASTER_KEY_B64 environment variable not set");
    process.exit(1);
  }

  // Step 1: Get a test certificate from database
  console.log("1️⃣  Fetching test certificate from database...");
  const { data: signingKey, error: keyError } = await supabase
    .from("signing_keys")
    .select("kid, certificate_pem, enc_private_key, enc_private_key_iv")
    .is("revoked_at", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (keyError || !signingKey) {
    console.error("❌ No signing key found in database");
    console.error("   Error:", keyError?.message);
    console.log(
      "\n   Please create a certificate first using: npx tsx scripts/setup-ca.ts"
    );
    process.exit(1);
  }

  console.log(`✅ Certificate found: ${signingKey.kid}`);
  console.log(
    `   Certificate CN: ${signingKey.certificate_pem
      .split("\n")
      .find((l) => l.includes("Subject:"))}`
  );

  // Step 2: Decrypt and parse the private key
  console.log("\n2️⃣  Decrypting private key...");
  let privateKeyPem: string;
  try {
    privateKeyPem = await decryptAESGCM(
      signingKey.enc_private_key,
      signingKey.enc_private_key_iv,
      masterKeyBase64
    );
    console.log("✅ Private key decrypted");
  } catch (err) {
    console.error("❌ Failed to decrypt private key:", err);
    process.exit(1);
  }

  // Step 3: Create test document and compute hash
  console.log("\n3️⃣  Creating test document...");
  const testDocument = {
    id: "test-doc-" + Date.now(),
    title: "Test Document for RSA Signing",
    content: "This is a test document for verifying RSA signing",
    user_id: "test-user-id",
    created_at: new Date().toISOString(),
  };

  const payload = JSON.stringify({
    title: testDocument.title,
    content: testDocument.content,
    user_id: testDocument.user_id,
    created_at: testDocument.created_at,
  });

  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(payload)
  );
  const payloadHash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log(`✅ Document hash: ${payloadHash.substring(0, 16)}...`);

  // Step 4: Sign using RSA
  console.log("\n4️⃣  Signing document with RSA...");
  let signature: string;
  try {
    const privateKey = forge.pki.privateKeyFromPem(privateKeyPem);
    const md = forge.md.sha256.create();
    md.update(payloadHash);
    const signatureBytes = privateKey.sign(md);
    signature = base64Encode(signatureBytes);
    console.log(`✅ Signature created (${signature.length} chars)`);
  } catch (err) {
    console.error("❌ Failed to sign document:", err);
    process.exit(1);
  }

  // Step 5: Verify using the same logic as verify-document function
  console.log("\n5️⃣  Verifying signature with certificate...");
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    const publicKey = cert.publicKey;

    const md = forge.md.sha256.create();
    md.update(payloadHash);

    const signatureBinary = atob(signature);
    const isValid = publicKey.verify(md.digest().bytes(), signatureBinary);

    if (isValid) {
      console.log("✅ SIGNATURE VERIFIED SUCCESSFULLY!");
    } else {
      console.log("❌ SIGNATURE VERIFICATION FAILED!");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Verification error:", err);
    process.exit(1);
  }

  // Step 6: Test with modified payload (should fail)
  console.log("\n6️⃣  Testing with modified payload (should fail)...");
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    const publicKey = cert.publicKey;

    const md = forge.md.sha256.create();
    md.update(payloadHash + "modified");

    const signatureBinary = atob(signature);
    const isValidWrong = publicKey.verify(
      md.digest().bytes(),
      signatureBinary
    );

    if (!isValidWrong) {
      console.log("✅ Correctly rejected modified payload");
    } else {
      console.log("❌ FAILED: Accepted modified payload!");
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Test error:", err);
    process.exit(1);
  }

  // Step 7: Verify certificate chain and dates
  console.log("\n7️⃣  Checking certificate validity...");
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    const now = new Date();
    const notBefore = cert.validity.notBefore;
    const notAfter = cert.validity.notAfter;

    const certSubject = cert.subject.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(", ");
    const certIssuer = cert.issuer.attributes
      .map((attr: any) => `${attr.shortName}=${attr.value}`)
      .join(", ");

    console.log(`✅ Certificate details:`);
    console.log(`   Subject: ${certSubject}`);
    console.log(`   Issuer: ${certIssuer}`);
    console.log(`   Valid from: ${notBefore.toISOString()}`);
    console.log(`   Valid to: ${notAfter.toISOString()}`);

    if (now < notBefore) {
      console.log("⚠️  Certificate not yet valid!");
      process.exit(1);
    }

    if (now > notAfter) {
      console.log("⚠️  Certificate has expired!");
      process.exit(1);
    }

    console.log("✅ Certificate is currently valid");
  } catch (err) {
    console.error("❌ Certificate check error:", err);
    process.exit(1);
  }

  console.log("\n✅ All end-to-end tests passed!");
  console.log("\n📊 Summary:");
  console.log(`  • Certificate: ${signingKey.kid}`);
  console.log(`  • Document hash: ${payloadHash.substring(0, 16)}...`);
  console.log(`  • Signature: ${signature.substring(0, 50)}...`);
  console.log(`  • Verification: PASSED ✓`);
  console.log(`  • Modified payload rejection: PASSED ✓`);
  console.log(`  • Certificate validity: PASSED ✓`);
}

testRSASigningWithDatabase().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
