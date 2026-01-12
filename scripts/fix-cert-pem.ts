import { createClient } from "@supabase/supabase-js";
import forge from "node-forge";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function base64Decode(b64: string): Promise<Uint8Array> {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function fixCertificate() {
  console.log("🔄 Fixing certificate PEM with CA UMC...\n");

  try {
    // Get CA
    const { data: ca } = await supabase
      .from("ca_certificates")
      .select("certificate_pem, enc_private_key, enc_private_key_iv")
      .eq("name", "CA UMC")
      .single();

    if (!ca) {
      console.error("CA not found");
      return;
    }

    // Decrypt CA private key
    const MASTER_KEY_B64 = process.env.MASTER_KEY_B64;
    const masterKeyBytes = await base64Decode(MASTER_KEY_B64);
    const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
      "decrypt",
    ]);

    const encData = await base64Decode(ca.enc_private_key);
    const iv = await base64Decode(ca.enc_private_key_iv);
    const decBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, masterKey, encData);
    const caPrivKeyPem = new TextDecoder().decode(decBuf);

    const pki = forge.pki;
    const caCert = pki.certificateFromPem(ca.certificate_pem);
    const caPrivKey = pki.privateKeyFromPem(caPrivKeyPem);

    // Get the certificate to fix
    const { data: cert } = await supabase
      .from("signing_keys")
      .select("kid, enc_private_key, enc_private_key_iv, certificate_subject, expires_at, created_at")
      .eq("kid", "v1-2026-01-04-ba21f944")
      .single();

    if (!cert) {
      console.log("Certificate not found");
      return;
    }

    console.log(`Fixing certificate: ${cert.kid}`);

    // Decrypt user private key
    const encUserKey = await base64Decode(cert.enc_private_key);
    const userIv = await base64Decode(cert.enc_private_key_iv);
    const userKeyBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv: userIv }, masterKey, encUserKey);
    const userKeyPem = new TextDecoder().decode(userKeyBuf);
    const userKey = pki.privateKeyFromPem(userKeyPem);

    console.log("✅ Keys decrypted");

    // Create new certificate with CA issuer
    const newCert = pki.createCertificate();
    newCert.publicKey = pki.rsa.setPublicKey(userKey.n, userKey.e);
    newCert.serialNumber = "01" + Math.floor(Math.random() * 1e16).toString(16);
    newCert.validity.notBefore = new Date(cert.created_at);
    newCert.validity.notAfter = new Date(cert.expires_at);

    // Parse subject from text
    const attrs: any[] = [];
    const subjectPairs = cert.certificate_subject.split(", ");
    for (const pair of subjectPairs) {
      const [k, v] = pair.split("=");
      if (k === "CN") {
        attrs.push({ name: "commonName", value: v });
      } else if (k === "C") {
        attrs.push({ name: "countryName", value: v });
      } else if (k === "ST") {
        attrs.push({ name: "stateOrProvinceName", value: v });
      } else if (k === "L") {
        attrs.push({ name: "localityName", value: v });
      } else if (k === "O") {
        attrs.push({ name: "organizationName", value: v });
      } else if (k === "OU") {
        attrs.push({ shortName: "OU", value: v });
      } else if (k === "E") {
        attrs.push({ name: "emailAddress", value: v });
      }
    }

    newCert.setSubject(attrs);
    newCert.setIssuer(caCert.subject.attributes);
    newCert.sign(caPrivKey, forge.md.sha256.create());

    const newPem = pki.certificateToPem(newCert);
    const newIssuer = newCert.issuer.attributes
      .map((a: any) => `${a.shortName || a.name}=${a.value}`)
      .join(", ");

    console.log("✅ Certificate regenerated with CA issuer");
    console.log(`   Issuer CN: ${newCert.issuer.getField("CN")?.value}`);

    // Update database
    const { error } = await supabase
      .from("signing_keys")
      .update({ certificate_pem: newPem, certificate_issuer: newIssuer })
      .eq("kid", cert.kid);

    if (error) {
      console.error("❌ Database update failed:", error.message);
    } else {
      console.log("✅ Certificate updated in database!");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

fixCertificate();
