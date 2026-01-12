#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";

// Load environment
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
  // Fallback
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function generateCertificatesForMissingKeys() {
  try {
    console.log("\n🔐 Checking for signing keys without certificates...\n");

    // Fetch all keys without certificates
    const { data: keysWithoutCerts, error } = await supabase
      .from("signing_keys")
      .select("kid, x509_certificate")
      .is("x509_certificate", null);

    if (error) {
      console.error("❌ Error fetching keys:", error);
      process.exit(1);
    }

    if (!keysWithoutCerts || keysWithoutCerts.length === 0) {
      console.log("✅ All keys already have certificates!");
      process.exit(0);
    }

    console.log(`📋 Found ${keysWithoutCerts.length} keys without certificates\n`);

    // Generate certificates for each key
    let successCount = 0;
    for (const key of keysWithoutCerts) {
      try {
        console.log(`📝 Generating certificate for: ${key.kid}...`);

        const { data, error: invokeError } = await supabase.functions.invoke("generate-certificates", {
          body: {
            kid: key.kid,
          },
        });

        if (invokeError) {
          console.error(`   ❌ Error: ${invokeError.message}`);
        } else if (data?.success) {
          console.log(`   ✅ Certificate generated and stored`);
          successCount++;
        } else {
          console.error(`   ❌ Failed: ${data?.message || "Unknown error"}`);
        }
      } catch (err) {
        console.error(`   ❌ Exception: ${err.message}`);
      }
    }

    console.log(`\n📊 Result: ${successCount}/${keysWithoutCerts.length} certificates generated`);
    if (successCount === keysWithoutCerts.length) {
      console.log("✅ All certificates generated successfully!\n");
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

generateCertificatesForMissingKeys();
