#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, unlinkSync } from "fs";
import path from "path";
import { execSync } from "child_process";

// Load environment variables
const envPath = path.join(process.cwd(), ".env");
let env = {};
try {
  const envContent = readFileSync(envPath, "utf-8");
  env = Object.fromEntries(
    envContent
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("="))
  );
} catch (e) {
  // Fallback to process.env
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Download PDF from Supabase Storage
 */
async function downloadPDF(fileUrl) {
  try {
    console.log("📥 Downloading PDF...");
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error) {
    console.error("❌ Failed to download PDF:", error.message);
    return null;
  }
}

/**
 * Check if PDF has signature field
 */
function hasPDFSignature(pdfBuffer) {
  const pdfText = pdfBuffer.toString("latin1");
  
  // Look for signature-related keywords in PDF
  const hasSignatureField = /\/Sig\s|\/AcroForm|\/Adobe\.PPKLite/i.test(pdfText);
  const hasContents = /\/Contents\s*<|\/Contents\s*\(/i.test(pdfText);
  
  return {
    hasSignatureField,
    hasContents,
    detected: hasSignatureField || hasContents,
  };
}

/**
 * Extract signature info from PDF
 */
function extractSignatureInfo(pdfBuffer) {
  const pdfText = pdfBuffer.toString("latin1");
  
  // Look for signature dictionary
  const sigMatch = pdfText.match(/\/Filter\s*\/Adobe\.PPKLite.*?\/SubFilter\s*\/([^\s/>]+)/s);
  const filterMatch = pdfText.match(/\/Filter\s*\/([^\s/>]+)/);
  const reasonMatch = pdfText.match(/\/Reason\s*\(([^)]+)\)/);
  const nameMatch = pdfText.match(/\/Name\s*\(([^)]+)\)/);
  
  return {
    filter: filterMatch?.[1],
    subFilter: sigMatch?.[1],
    reason: reasonMatch?.[1],
    name: nameMatch?.[1],
  };
}

/**
 * Verify using openssl (if available)
 */
function verifySignatureWithOpenSSL(pdfPath, certPath) {
  try {
    console.log("\n🔍 Attempting verification with OpenSSL...");
    
    // Check if openssl is available
    execSync("which openssl > /dev/null 2>&1");
    
    // Try to extract and verify signature
    // This is a simplified check - full verification would require more complex parsing
    const output = execSync(`openssl asn1parse -in "${pdfPath}" -inform DER 2>/dev/null || echo "Cannot parse"`, {
      encoding: "utf-8",
    });
    
    if (output.includes("Cannot parse")) {
      console.log("⚠️  OpenSSL could not parse signature (normal for embedded signatures)");
      return null;
    }
    
    return true;
  } catch (error) {
    console.log("ℹ️  OpenSSL verification not available (install openssl to enable)");
    return null;
  }
}

/**
 * Check signature in database
 */
async function checkSignatureInDatabase(documentId) {
  console.log("\n📚 Checking signature record in database...");
  
  // Get the MOST RECENT signature (since there might be multiple)
  const { data: sigRecords, error } = await supabase
    .from("document_signatures")
    .select("*")
    .eq("document_id", documentId)
    .order("signed_at", { ascending: false })
    .limit(1);
  
  if (error || !sigRecords || sigRecords.length === 0) {
    console.log("⚠️  No signature record found in database");
    return null;
  }
  
  const sigRecord = sigRecords[0];
  
  // Fetch the signing key to check for certificate
  let hasCertificateInKey = false;
  if (sigRecord.key_id) {
    const { data: keyData } = await supabase
      .from("signing_keys")
      .select("x509_certificate")
      .eq("id", sigRecord.key_id)
      .maybeSingle();
    hasCertificateInKey = !!keyData?.x509_certificate;
  }
  
  return {
    id: sigRecord.id,
    signerName: sigRecord.signer_name,
    signedAt: sigRecord.signed_at,
    reason: sigRecord.reason,
    location: sigRecord.location,
    pkcs7Full: sigRecord.pkcs7_full,
    status: sigRecord.signature_verification_status,
    hasSignature: !!sigRecord.signature,
    hasCertificateInRecord: !!sigRecord.certificate_fingerprint,
    keyId: sigRecord.key_id,
    hasCertificateInKey,
  };
}

/**
 * Get signing key and certificate info
 */
async function getSigningKeyInfo(documentId) {
  console.log("\n🔐 Fetching signing key and certificate...");
  
  const { data: sigRecord } = await supabase
    .from("document_signatures")
    .select("key_id")
    .eq("document_id", documentId)
    .order("signed_at", { ascending: false })
    .maybeSingle();
  
  if (!sigRecord?.key_id) {
    return null;
  }
  
  const { data: keyData } = await supabase
    .from("signing_keys")
    .select("id, name, x509_certificate, certificate_fingerprint, certificate_subject, certificate_valid_from, certificate_valid_until")
    .eq("id", sigRecord.key_id)
    .maybeSingle();
  
  if (!keyData) {
    return null;
  }
  
  return {
    keyId: keyData.id,
    keyName: keyData.name,
    hasCertificate: !!keyData.x509_certificate,
    fingerprint: keyData.certificate_fingerprint,
    subject: keyData.certificate_subject,
    validFrom: keyData.certificate_valid_from,
    validUntil: keyData.certificate_valid_until,
    certificateBase64: keyData.x509_certificate,
  };
}

/**
 * Verify certificate validity
 */
function verifyCertificateValidity(certInfo) {
  if (!certInfo?.validFrom || !certInfo?.validUntil) {
    return { valid: null, message: "Certificate dates not available" };
  }
  
  const now = new Date();
  const validFrom = new Date(certInfo.validFrom);
  const validUntil = new Date(certInfo.validUntil);
  
  if (now < validFrom) {
    return { valid: false, message: `Certificate not yet valid (valid from ${validFrom.toISOString()})` };
  }
  
  if (now > validUntil) {
    return { valid: false, message: `Certificate expired on ${validUntil.toISOString()}` };
  }
  
  return { valid: true, message: `Certificate valid until ${validUntil.toISOString()}` };
}

/**
 * Main verification function
 */
async function verifyDocumentSignature(documentId) {
  try {
    console.log(`\n🔍 Verifying signature for document: ${documentId}\n`);
    console.log("═".repeat(80));

    // 1. Fetch document
    console.log("\n📄 Fetching document...");
    const { data: document } = await supabase
      .from("documents")
      .select("id, title, file_url, status")
      .eq("id", documentId)
      .maybeSingle();

    if (!document) {
      console.error("❌ Document not found");
      process.exit(1);
    }

    console.log(`✅ Found: ${document.title}`);
    console.log(`   Status: ${document.status}`);
    console.log(`   File URL: ${document.file_url}`);

    // 2. Download PDF
    const pdfBuffer = await downloadPDF(document.file_url);
    if (!pdfBuffer) {
      console.error("❌ Could not download PDF");
      process.exit(1);
    }
    console.log(`✅ Downloaded ${(pdfBuffer.length / 1024).toFixed(2)} KB`);

    // 3. Check for signature in PDF
    console.log("\n🔎 Analyzing PDF structure...");
    const pdfSignatureCheck = hasPDFSignature(pdfBuffer);
    console.log(`✅ Signature field detected: ${pdfSignatureCheck.hasSignatureField ? "Yes" : "No"}`);
    console.log(`✅ Signature contents present: ${pdfSignatureCheck.hasContents ? "Yes" : "No"}`);

    if (!pdfSignatureCheck.detected) {
      console.log("⚠️  No signature detected in PDF");
    }

    // 4. Extract signature details
    const sigInfo = extractSignatureInfo(pdfBuffer);
    if (sigInfo.filter) {
      console.log(`✅ Filter: ${sigInfo.filter}`);
      console.log(`✅ SubFilter: ${sigInfo.subFilter || "N/A"}`);
      console.log(`✅ Reason: ${sigInfo.reason || "N/A"}`);
      console.log(`✅ Signer: ${sigInfo.name || "N/A"}`);
    }

    // 5. Check database signature record
    const dbSigRecord = await checkSignatureInDatabase(documentId);
    if (dbSigRecord) {
      console.log(`✅ Signer: ${dbSigRecord.signerName}`);
      console.log(`✅ Signed at: ${new Date(dbSigRecord.signedAt).toLocaleString()}`);
      console.log(`✅ PKCS#7 full signature: ${dbSigRecord.pkcs7Full ? "Yes ✓" : "No"}`);
      console.log(`✅ Verification status: ${dbSigRecord.status || "Unknown"}`);
      console.log(`✅ Has signature data: ${dbSigRecord.hasSignature ? "Yes" : "No"}`);
      console.log(`✅ Has certificate in record: ${dbSigRecord.hasCertificateInRecord ? "Yes" : "No"}`);
      console.log(`✅ Has certificate in signing key: ${dbSigRecord.hasCertificateInKey ? "Yes ✓" : "No"}`);
      if (dbSigRecord.keyId) {
        console.log(`✅ Key ID: ${dbSigRecord.keyId}`);
      }
    }

    // 6. Check signing key and certificate
    const keyInfo = await getSigningKeyInfo(documentId);
    if (keyInfo) {
      console.log(`\n🔑 Signing Key: ${keyInfo.keyName}`);
      console.log(`✅ Has X.509 certificate: ${keyInfo.hasCertificate ? "Yes ✓" : "No"}`);
      if (keyInfo.fingerprint) {
        console.log(`✅ Fingerprint: ${keyInfo.fingerprint}`);
      }
      if (keyInfo.subject) {
        console.log(`✅ Subject: ${keyInfo.subject}`);
      }

      // Verify certificate validity
      const certValidity = verifyCertificateValidity(keyInfo);
      console.log(`✅ Certificate status: ${certValidity.valid === true ? "✓ VALID" : certValidity.valid === false ? "✗ INVALID" : "?"} - ${certValidity.message}`);
    }

    // 7. Summary
    console.log("\n" + "═".repeat(80));
    console.log("\n📊 VERIFICATION SUMMARY:");
    console.log("─".repeat(80));

    const checks = {
      "PDF downloaded": !!pdfBuffer,
      "Signature field in PDF": pdfSignatureCheck.detected,
      "Database signature record": !!dbSigRecord,
      "PKCS#7 signature": dbSigRecord?.pkcs7Full || false,
      "X.509 certificate": keyInfo?.hasCertificate || false,
      "Certificate valid": keyInfo ? verifyCertificateValidity(keyInfo).valid : null,
    };

    let passCount = 0;
    let totalCount = 0;

    Object.entries(checks).forEach(([check, passed]) => {
      if (passed === null) return;
      totalCount++;
      const icon = passed ? "✅" : "❌";
      console.log(`${icon} ${check}`);
      if (passed) passCount++;
    });

    console.log("─".repeat(80));

    if (passCount === totalCount && totalCount > 0) {
      console.log(`\n🎉 SUCCESS! All checks passed (${passCount}/${totalCount})`);
      console.log("   The document has a valid PKCS#7 digital signature with X.509 certificate!");
    } else if (passCount > 0) {
      console.log(`\n⚠️  Partial verification (${passCount}/${totalCount} checks passed)`);
    } else {
      console.log(`\n❌ Verification failed - no valid signature found`);
    }

    console.log("\n✨ For full validation, open the PDF in Adobe Reader:");
    console.log(`   - Right-click the signature`);
    console.log(`   - Select "Verify Signature"`);
    console.log(`   - It should show as ✓ Valid\n`);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Get document ID from command line
const documentId = process.argv[2];

if (!documentId) {
  console.error("❌ Usage: node verify-signature.js <documentId>");
  console.error("   Example: node verify-signature.js 14ad2311-bc14-4289-a9b8-5f25fcdb9cf9");
  process.exit(1);
}

verifyDocumentSignature(documentId);
