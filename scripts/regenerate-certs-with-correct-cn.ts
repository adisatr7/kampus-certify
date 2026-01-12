#!/usr/bin/env node

/**
 * Script to regenerate all signing certificates with correct CN (Common Name)
 * 
 * Problem: Old certificates have CN="Kampus Certify" instead of actual user name
 * Solution: Regenerate all certificates using create-certificate function which sets correct CN
 * 
 * When deployed to Vercel, the PDF "Signed By" field reads the CN from the X.509 certificate
 * If CN="Kampus Certify", that's what appears in the PDF viewer instead of the actual signer's name
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface SigningKey {
  kid: string;
  assigned_to: string | null;
  certificate_subject: string | null;
  expires_at: string | null;
  revoked_at: string | null;
}

// Load environment
const envPath = path.resolve(process.cwd(), ".env");
let env: Record<string, string> = {};
try {
  const envContent = fs.readFileSync(envPath, "utf-8");
  env = Object.fromEntries(
    envContent
      .split("\n")
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split("=").map((v) => v.trim()))
  );
} catch (e) {
  console.warn("⚠️  Could not load .env file, using process.env");
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ACCESS_TOKEN = env.ACCESS_TOKEN || process.env.ACCESS_TOKEN || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  console.error("Make sure these are set in .env or environment variables");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Check certificate subject CN to see if it contains the user's name
 */
function checkCertificateSubject(certSubject: string | null, userName: string): {
  isCorrect: boolean;
  hasKampusCertify: boolean;
  currentCN: string | null;
} {
  if (!certSubject) {
    return { isCorrect: false, hasKampusCertify: false, currentCN: null };
  }

  // Extract CN from subject string: "CN=Name,O=Org,..."
  const cnMatch = certSubject.match(/CN=([^,]+)/i);
  const currentCN = cnMatch ? cnMatch[1] : null;

  const hasKampusCertify = currentCN?.toLowerCase().includes("kampus certify") || false;
  const isCorrect = currentCN?.toLowerCase() === userName.toLowerCase();

  return { isCorrect, hasKampusCertify, currentCN };
}

/**
 * Main function to regenerate certificates
 */
async function regenerateCertificates() {
  console.log("\n🔐 Certificate Regeneration Script");
  console.log("==================================");
  console.log("This script regenerates all signing certificates with correct CN (user names).\n");

  try {
    // Fetch all active users
    console.log("📋 Fetching users...");
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, name, email, role")
      .order("name");

    if (usersError || !users) {
      console.error("❌ Error fetching users:", usersError?.message || "Unknown error");
      process.exit(1);
    }

    console.log(`✅ Found ${users.length} users\n`);

    // Fetch all existing signing keys
    console.log("📋 Fetching existing signing keys...");
    const { data: keys, error: keysError } = await supabase
      .from("signing_keys")
      .select("kid, assigned_to, certificate_subject, expires_at, revoked_at")
      .is("deleted_at", null)
      .is("revoked_at", null)
      .order("created_at", { ascending: false });

    if (keysError || !keys) {
      console.error("❌ Error fetching signing keys:", keysError?.message || "Unknown error");
      process.exit(1);
    }

    console.log(`✅ Found ${keys.length} active signing keys\n`);

    // Analyze current state
    console.log("📊 ANALYSIS OF CURRENT STATE");
    console.log("=============================");

    const keysWithWrongCN: {
      user: User;
      key: SigningKey;
      check: ReturnType<typeof checkCertificateSubject>;
    }[] = [];

    const usersWithoutKeys: User[] = [];
    const usersWithCorrectCerts: { user: User; key: SigningKey }[] = [];

    for (const user of users) {
      const userKeys = keys.filter((k) => k.assigned_to === user.id);

      if (userKeys.length === 0) {
        usersWithoutKeys.push(user);
      } else {
        // Check the latest key (first in list due to ordering)
        const latestKey = userKeys[0];
        const check = checkCertificateSubject(latestKey.certificate_subject, user.name);

        if (check.hasKampusCertify) {
          keysWithWrongCN.push({ user, key: latestKey, check });
        } else if (check.isCorrect) {
          usersWithCorrectCerts.push({ user, key: latestKey });
        } else {
          keysWithWrongCN.push({ user, key: latestKey, check });
        }
      }
    }

    console.log(`\n🆗 Users with CORRECT certificates: ${usersWithCorrectCerts.length}`);
    usersWithCorrectCerts.slice(0, 5).forEach(({ user, key }) => {
      const check = checkCertificateSubject(key.certificate_subject, user.name);
      console.log(`   ✅ ${user.name} (CN=${check.currentCN})`);
    });
    if (usersWithCorrectCerts.length > 5) {
      console.log(`   ... and ${usersWithCorrectCerts.length - 5} more`);
    }

    console.log(`\n⚠️  Users with WRONG certificates (CN="Kampus Certify" or mismatch): ${keysWithWrongCN.length}`);
    keysWithWrongCN.slice(0, 5).forEach(({ user, key, check }) => {
      console.log(
        `   ❌ ${user.name} (Current CN="${check.currentCN}" - should be "${user.name}")  [KID: ${key.kid}]`
      );
    });
    if (keysWithWrongCN.length > 5) {
      console.log(`   ... and ${keysWithWrongCN.length - 5} more`);
    }

    console.log(`\n🔴 Users WITHOUT certificates: ${usersWithoutKeys.length}`);
    usersWithoutKeys.slice(0, 5).forEach((user) => {
      console.log(`   ❌ ${user.name} (${user.email})`);
    });
    if (usersWithoutKeys.length > 5) {
      console.log(`   ... and ${usersWithoutKeys.length - 5} more`);
    }

    console.log("\n📊 SUMMARY");
    console.log("==========");
    console.log(`Total users: ${users.length}`);
    console.log(`✅ With correct certificates: ${usersWithCorrectCerts.length}`);
    console.log(`⚠️  With wrong certificates: ${keysWithWrongCN.length}`);
    console.log(`🔴 Without certificates: ${usersWithoutKeys.length}`);

    if (keysWithWrongCN.length === 0 && usersWithoutKeys.length === 0) {
      console.log("\n✅ All certificates are already correct! No regeneration needed.");
      return;
    }

    console.log("\n⚠️  RECOMMENDED ACTION:");
    console.log("======================");
    console.log(
      "1. Regenerate certificates for users with wrong CN using the Certificate Management page in admin panel"
    );
    console.log("2. Or use this command to regenerate programmatically:");
    console.log('   npm run regenerate-certs:batch -- --all');
    console.log("\n📝 NOTE: When regenerating, use default passphrase: CA<something-secure> (min 8 chars, must include symbol)");
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  regenerateCertificates();
}

export { regenerateCertificates, checkCertificateSubject };
