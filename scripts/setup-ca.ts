import forge from "node-forge";
import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_KEY_B64 = process.env.MASTER_KEY_B64;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!MASTER_KEY_B64) {
  console.error("❌ Missing MASTER_KEY_B64");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function base64Encode(bytes: Uint8Array): Promise<string> {
  return Buffer.from(bytes).toString("base64");
}

async function base64Decode(b64: string): Promise<Uint8Array> {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function setupCA() {
  console.log("🚀 Setting up Root CA for UMC...\n");

  try {
    // Check if CA already exists
    const { data: existingCa } = await supabase
      .from("ca_certificates")
      .select("id")
      .eq("name", "CA UMC")
      .single();

    if (existingCa) {
      console.log("✅ CA already exists: CA UMC");
      return;
    }

    // Generate RSA keypair for CA
    console.log("🔑 Generating CA RSA keypair (2048-bit)...");
    const pki = forge.pki;
    const keypair = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });
    console.log("✅ Keypair generated");

    // Create self-signed CA certificate
    console.log("📜 Creating self-signed CA certificate...");
    const caCert = pki.createCertificate();
    caCert.publicKey = keypair.publicKey;
    caCert.serialNumber = "01" + Math.floor(Math.random() * 1e16).toString(16);

    // Set validity: 10 years
    caCert.validity.notBefore = new Date();
    const notAfter = new Date();
    notAfter.setFullYear(notAfter.getFullYear() + 10);
    caCert.validity.notAfter = notAfter;

    // CA Subject = CA Issuer (self-signed)
    const caAttrs = [
      { name: "commonName", value: "CA UMC" },
      { name: "countryName", value: "ID" },
      { name: "stateOrProvinceName", value: "Jawa Barat" },
      { name: "localityName", value: "Cirebon" },
      { name: "organizationName", value: "Universitas Muhammadiyah Cirebon" },
      { shortName: "OU", value: "Certificate Authority" },
      { name: "emailAddress", value: "ca@umc.ac.id" },
    ];

    caCert.setSubject(caAttrs);
    caCert.setIssuer(caAttrs); // Self-signed

    // Add CA extensions - properly marked as critical where required
    caCert.setExtensions([
      {
        name: "basicConstraints",
        cA: true, // This is a CA certificate
        pathLenConstraint: 0, // Can issue end-entity certs only (no intermediate CAs)
        critical: true, // basicConstraints MUST be critical for CA certs
      },
      {
        name: "keyUsage",
        keyCertSign: true,    // Can sign certificates
        cRLSign: true,        // Can sign CRLs
        digitalSignature: true, // Can create digital signatures
        critical: true,       // keyUsage SHOULD be critical
      },
      {
        name: "subjectKeyIdentifier",
      },
    ]);

    // Self-sign CA certificate
    caCert.sign(keypair.privateKey, forge.md.sha256.create());
    console.log("✅ CA certificate created and self-signed");

    // Convert to PEM
    const caPrivateKeyPem = pki.privateKeyToPem(keypair.privateKey);
    const caCertPem = pki.certificateToPem(caCert);

    // Extract CA subject/issuer
    const caSubject = caCert.subject.attributes
      .map((attr: any) => `${attr.shortName || attr.name}=${attr.value}`)
      .join(", ");

    console.log("\n📋 CA Certificate Details:");
    console.log(`   Subject: ${caSubject}`);
    console.log(`   Issuer: ${caSubject}`);
    console.log(`   Valid Until: ${caCert.validity.notAfter.toISOString()}`);

    // Encrypt CA private key with master key
    console.log("\n🔐 Encrypting CA private key with MASTER_KEY_B64...");
    const masterKeyBytes = await base64Decode(MASTER_KEY_B64);

    if (masterKeyBytes.byteLength !== 32) {
      throw new Error("Master key must be 32 bytes (256 bits)");
    }

    const masterKey = await crypto.subtle.importKey(
      "raw",
      masterKeyBytes,
      "AES-GCM",
      false,
      ["encrypt"]
    );

    const caPrivateKeyBytes = new TextEncoder().encode(caPrivateKeyPem);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encryptedData = new Uint8Array(
      await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        masterKey,
        caPrivateKeyBytes
      )
    );

    const encPrivateKeyB64 = await base64Encode(encryptedData);
    const encIvB64 = await base64Encode(iv);

    console.log("✅ Private key encrypted");

    // Store CA in database
    console.log("\n💾 Storing CA in database...");
    const { error: insertErr } = await supabase.from("ca_certificates").insert({
      name: "CA UMC",
      certificate_pem: caCertPem,
      certificate_subject: caSubject,
      enc_private_key: encPrivateKeyB64,
      enc_private_key_iv: encIvB64,
      enc_algo: "AES-GCM",
      expires_at: notAfter.toISOString(),
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      throw new Error(`Failed to insert CA: ${insertErr.message}`);
    }

    console.log("✅ CA stored in database");

    // Also save locally for reference
    const caDir = path.resolve(process.cwd(), "signing-keys-temp");
    if (!fs.existsSync(caDir)) {
      fs.mkdirSync(caDir, { recursive: true });
    }

    fs.writeFileSync(path.join(caDir, "ca-cert.pem"), caCertPem);
    fs.writeFileSync(path.join(caDir, "ca-key.pem"), caPrivateKeyPem);

    console.log(`\n✅ CA Setup Complete!`);
    console.log(`   CA Certificate saved to: ${path.join(caDir, "ca-cert.pem")}`);
    console.log(`   CA Private Key (reference) saved to: ${path.join(caDir, "ca-key.pem")}`);
    console.log(`   ⚠️  Keep ca-key.pem secure! It's unencrypted for reference only.`);
    console.log(`\n   Production encrypted copy is stored in Supabase database.`);
  } catch (err) {
    console.error("❌ Error setting up CA:", err);
    process.exit(1);
  }
}

setupCA();
