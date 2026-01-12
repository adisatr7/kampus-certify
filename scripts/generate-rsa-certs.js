#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error(
    "❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env"
  );
  process.exit(1);
}

const supabase = createClient(url, key);

async function generateCertificatesForRSA() {
  console.log("\n🔐 RSA Certificate Generator\n");

  // Fetch all RSA keys without certificates
  const { data: rsaKeys, error: queryError } = await supabase
    .from("signing_keys")
    .select("kid, kty, crv, assigned_to, x509_certificate")
    .in("kty", ["RSA"])
    .is("x509_certificate", null);

  if (queryError) {
    console.error("❌ Error fetching keys:", queryError);
    process.exit(1);
  }

  if (!rsaKeys || rsaKeys.length === 0) {
    console.log("✅ No RSA keys without certificates found!\n");
    process.exit(0);
  }

  console.log(`📋 Found ${rsaKeys.length} RSA keys without certificates:\n`);
  rsaKeys.forEach((k, i) => {
    console.log(`   [${i}] ${k.kid} (${k.kty}/${k.crv})`);
  });
  console.log();

  let successCount = 0;
  let failureCount = 0;

  // For each RSA key, generate certificate
  for (const signingKey of rsaKeys) {
    console.log(`\n🔄 Generating certificate for: ${signingKey.kid}`);

    try {
      // Fetch user name if assigned_to is present
      let signerName = `Signer ${signingKey.kid}`;
      
      if (signingKey.assigned_to) {
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("name")
          .eq("id", signingKey.assigned_to)
          .maybeSingle();
        
        if (!userError && userData?.name) {
          signerName = userData.name;
          console.log(`   👤 Signer: ${signerName}`);
        }
      }

      const { data: certResult, error: certError } =
        await supabase.functions.invoke("generate-certificates", {
          body: {
            signingKeyId: signingKey.kid,
            signerName: signerName,
            organizationName: "Universitas Muhammadiyah Cirebon",
          },
        });

      if (certError) {
        console.log(`   ❌ Edge function error: ${certError.message}`);
        failureCount++;
        continue;
      }

      if (certResult?.ok) {
        console.log(`   ✅ Certificate generated successfully!`);
        console.log(`      Fingerprint: ${certResult.certificateFingerprint}`);
        console.log(
          `      Valid Until: ${certResult.validUntil.split("T")[0]}`
        );
        successCount++;
      } else {
        console.log(`   ❌ Generation failed: ${certResult?.message}`);
        failureCount++;
      }
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
      failureCount++;
    }

    // Small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`📊 SUMMARY:`);
  console.log(
    `   ✅ Successfully generated: ${successCount}/${rsaKeys.length}`
  );
  console.log(`   ❌ Failed: ${failureCount}/${rsaKeys.length}`);
  console.log(`${"=".repeat(50)}\n`);

  if (failureCount === 0) {
    console.log("🎉 All RSA certificates generated successfully!\n");
    process.exit(0);
  } else {
    process.exit(failureCount > 0 ? 1 : 0);
  }
}

generateCertificatesForRSA().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
