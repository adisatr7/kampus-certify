#!/usr/bin/env npx tsx

/**
 * Test RSA signing and verification workflow
 * Creates a test certificate with RSA key, signs a test payload, and verifies the signature
 */

import forge from "node-forge";
import * as crypto from "crypto";

async function testRSASigningFlow() {
  console.log("🧪 Testing RSA Signing and Verification Workflow\n");

  // Step 1: Generate RSA keypair
  console.log("1️⃣  Generating RSA 2048-bit keypair...");
  const keypair = forge.pki.rsa.generateKeyPair(2048);
  console.log("✅ Keypair generated\n");

  // Step 2: Create X.509 certificate signed by itself (self-signed)
  console.log("2️⃣  Creating self-signed X.509 certificate...");
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 1);
  
  const attrs = [
    { name: "commonName", value: "Test User" },
    { name: "countryName", value: "ID" },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.setExtensions([]);
  
  cert.sign(keypair.privateKey, forge.md.sha256.create());
  
  const certPem = forge.pki.certificateToPem(cert);
  const privateKeyPem = forge.pki.privateKeyToPem(keypair.privateKey);
  
  console.log("✅ Certificate created");
  console.log(`   Subject CN: Test User`);
  console.log(`   Issuer CN: Test User`);
  console.log(`   Valid from: ${cert.validity.notBefore.toISOString()}`);
  console.log(`   Valid to: ${cert.validity.notAfter.toISOString()}\n`);

  // Step 3: Create test payload and hash it
  console.log("3️⃣  Creating test payload...");
  const testPayload = JSON.stringify({
    title: "Test Document",
    content: "Test Content",
    user_id: "test-user-id",
    created_at: "2025-01-04T12:00:00Z",
  });

  // Hash payload like verify-document does
  const encoder = new TextEncoder();
  const payloadHashBinary = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(testPayload)
  );
  const payloadHash = Array.from(new Uint8Array(payloadHashBinary))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  console.log(`✅ Payload hash computed: ${payloadHash.substring(0, 16)}...\n`);

  // Step 4: Sign the payload hash using RSA
  console.log("4️⃣  Signing payload hash with RSA...");
  const md = forge.md.sha256.create();
  md.update(payloadHash);
  const signatureBytes = keypair.privateKey.sign(md);
  const signatureBase64 = btoa(signatureBytes);

  console.log("✅ Signature created");
  console.log(`   Signature (base64): ${signatureBase64.substring(0, 50)}...\n`);

  // Step 5: Verify the signature using the certificate
  console.log("5️⃣  Verifying signature with certificate...");
  const parsedCert = forge.pki.certificateFromPem(certPem);
  const publicKey = parsedCert.publicKey;

  const md2 = forge.md.sha256.create();
  md2.update(payloadHash);
  
  // Decode signature back to binary string
  const signatureBinary = atob(signatureBase64);
  const isValid = publicKey.verify(
    md2.digest().bytes(),
    signatureBinary
  );

  if (isValid) {
    console.log("✅ SIGNATURE VERIFIED SUCCESSFULLY!\n");
  } else {
    console.log("❌ SIGNATURE VERIFICATION FAILED!\n");
    process.exit(1);
  }

  // Step 6: Test with wrong payload (should fail)
  console.log("6️⃣  Testing verification with modified payload (should fail)...");
  const md3 = forge.md.sha256.create();
  md3.update(payloadHash + "modified");
  const isValidWrong = publicKey.verify(
    md3.digest().bytes(),
    signatureBinary
  );

  if (!isValidWrong) {
    console.log("✅ Correctly rejected modified payload\n");
  } else {
    console.log("❌ FAILED: Accepted modified payload!\n");
    process.exit(1);
  }

  console.log("✅ All tests passed! RSA signing/verification workflow is working correctly.");
  console.log("\nKey observations:");
  console.log(
    "  • Signature is created by signing the SHA-256 hash of the payload"
  );
  console.log("  • Verification uses the certificate's public key");
  console.log("  • Both signing and verification use SHA-256 digest");
  console.log(
    "  • Modified payloads correctly fail verification\n"
  );
}

testRSASigningFlow().catch((err) => {
  console.error("❌ Test failed:", err);
  process.exit(1);
});
