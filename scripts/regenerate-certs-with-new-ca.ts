import { createClient } from "@supabase/supabase-js";
import forge from "node-forge";
import * as dotenv from "dotenv";

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function base64Encode(bytes: Uint8Array): Promise<string> {
  return Buffer.from(bytes).toString("base64");
}

async function base64Decode(b64: string): Promise<Uint8Array> {
  return new Uint8Array(Buffer.from(b64, "base64"));
}

async function regenerateCertsWithNewCA() {
  console.log("🔄 Regenerating all certificates with new CA...\n");

  try {
    // Get CA
    const { data: ca } = await supabase
      .from("ca_certificates")
      .select("id, certificate_pem, enc_private_key, enc_private_key_iv")
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

    const encryptedData = await base64Decode(ca.enc_private_key);
    const iv = await base64Decode(ca.enc_private_key_iv);

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      masterKey,
      encryptedData
    );

    const caPrivateKeyPem = new TextDecoder().decode(decryptedBuffer);
    console.log("✅ CA private key decrypted");

    // Parse CA
    const pki = forge.pki;
    const caCert = pki.certificateFromPem(ca.certificate_pem);
    const caPrivateKey = pki.privateKeyFromPem(caPrivateKeyPem);

    // Get all user certificates to regenerate
    const { data: userCerts } = await supabase
      .from("signing_keys")
      .select("kid, enc_private_key, enc_private_key_iv, certificate_subject, expires_at, created_at")
      .is("deleted_at", null)
      .ilike("certificate_issuer", "%UMC Root CA%");

    console.log(`Found ${userCerts?.length || 0} certificates with old issuer\n`);

    if (!userCerts || userCerts.length === 0) {
      console.log("No certificates to regenerate");
      return;
    }

    // Regenerate each certificate
    for (const cert of userCerts) {
      console.log(`Regenerating: ${cert.kid}`);

      // Decrypt private key
      let userPrivateKeyPem = "";
      if (cert.enc_private_key && cert.enc_private_key_iv) {
        try {
          const encData = await base64Decode(cert.enc_private_key);
          const certIv = await base64Decode(cert.enc_private_key_iv);
          const decBuffer = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: certIv },
            masterKey,
            encData
          );
          userPrivateKeyPem = new TextDecoder().decode(decBuffer);
        } catch (e) {
          console.log("  ⚠️  Failed to decrypt private key:", (e as Error).message);
          continue;
        }
      }

      if (!userPrivateKeyPem) {
        console.log("  ⚠️  No private key found, skipping");
        continue;
      }

      // Parse user private key
      let userPrivateKey: any;
      try {
        userPrivateKey = pki.privateKeyFromPem(userPrivateKeyPem);
      } catch (e) {
        console.log("  ⚠️  Failed to parse private key");
        continue;
      }

      // Create new cert signed by new CA
      const newCert = pki.createCertificate();
      newCert.publicKey = pki.rsa.setPublicKey(userPrivateKey.n, userPrivateKey.e);
      newCert.serialNumber = "01" + Math.floor(Math.random() * 1e16).toString(16);

      newCert.validity.notBefore = new Date(cert.created_at);
      newCert.validity.notAfter = new Date(cert.expires_at);

      // Parse subject from text
      const subjectAttrs: any[] = [];
      const subjectPairs = cert.certificate_subject.split(", ");
      for (const pair of subjectPairs) {
        const [key, value] = pair.split("=");
        if (key === "CN") {
          subjectAttrs.push({ name: "commonName", value });
        } else if (key === "C") {
          subjectAttrs.push({ name: "countryName", value });
        } else if (key === "ST") {
          subjectAttrs.push({ name: "stateOrProvinceName", value });
        } else if (key === "L") {
          subjectAttrs.push({ name: "localityName", value });
        } else if (key === "O") {
          subjectAttrs.push({ name: "organizationName", value });
        } else if (key === "OU") {
          subjectAttrs.push({ shortName: "OU", value });
        } else if (key === "E") {
          subjectAttrs.push({ name: "emailAddress", value });
        }
      }

      newCert.setSubject(subjectAttrs);
      newCert.setIssuer(caCert.subject.attributes);

      // Sign with CA
      newCert.sign(caPrivateKey, forge.md.sha256.create());

      const newCertPem = pki.certificateToPem(newCert);
      const newIssuer = newCert.issuer.attributes
        .map((attr: any) => `${attr.shortName || attr.name}=${attr.value}`)
        .join(", ");

      // Update in database
      const { error } = await supabase
        .from("signing_keys")
        .update({
          certificate_pem: newCertPem,
          certificate_issuer: newIssuer,
          ca_id: ca.id,
        })
        .eq("kid", cert.kid);

      if (error) {
        console.log(`  ❌ Update failed: ${error.message}`);
      } else {
        console.log(`  ✅ Certificate updated`);
      }
    }

    console.log("\n✅ Regeneration complete!");
  } catch (err) {
    console.error("Error:", err);
  }
}

regenerateCertsWithNewCA();
