#!/usr/bin/env npx tsx

/**
 * Check certificate PEM format in database
 */

import { createClient } from "@supabase/supabase-js";
import forge from "node-forge";

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY!
);

async function checkCertificate() {
  console.log("🔍 Checking certificate format in database...\n");

  const { data: signingKey, error } = await supabase
    .from("signing_keys")
    .select("kid, certificate_pem, certificate_subject, certificate_issuer")
    .eq("kid", "v1-2026-01-04-ba21f944")
    .single();

  if (error || !signingKey) {
    console.error("❌ Error fetching certificate:", error?.message);
    process.exit(1);
  }

  console.log("✅ Certificate found\n");
  console.log("Kid:", signingKey.kid);
  console.log("Subject:", signingKey.certificate_subject);
  console.log("Issuer:", signingKey.certificate_issuer);
  console.log("\n📄 Certificate PEM:");
  console.log("---");
  console.log(signingKey.certificate_pem);
  console.log("---");

  // Check PEM format
  console.log("\n🔎 Format validation:");
  if (!signingKey.certificate_pem) {
    console.error("❌ Certificate PEM is empty!");
    process.exit(1);
  }

  if (!signingKey.certificate_pem.includes("-----BEGIN CERTIFICATE-----")) {
    console.error("❌ Missing BEGIN CERTIFICATE marker");
    process.exit(1);
  }

  if (!signingKey.certificate_pem.includes("-----END CERTIFICATE-----")) {
    console.error("❌ Missing END CERTIFICATE marker");
    process.exit(1);
  }

  console.log("✅ PEM format looks correct");
  console.log(`   Length: ${signingKey.certificate_pem.length} chars`);
  console.log(`   Lines: ${signingKey.certificate_pem.split("\n").length}`);

  // Try to parse with node-forge
  try {
    const cert = forge.pki.certificateFromPem(signingKey.certificate_pem);
    console.log("\n✅ node-forge can parse this certificate!");
    console.log(`   Subject CN: ${cert.subject.attributes.find((a: any) => a.name === "commonName")?.value}`);
    console.log(`   Issuer CN: ${cert.issuer.attributes.find((a: any) => a.name === "commonName")?.value}`);
  } catch (e) {
    console.error("\n❌ node-forge cannot parse this certificate:");
    console.error(e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
}

checkCertificate().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});
