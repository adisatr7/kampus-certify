#!/usr/bin/env npx tsx
/**
 * Create a new signing certificate using the supabase function directly
 * This bypasses JWT auth by calling the function from backend
 */

import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env");

// Load environment variables
const envContent = fs.readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
envContent.split("\n").forEach((line) => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) {
    env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;
const MASTER_KEY_B64 = env.MASTER_KEY_B64;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || !MASTER_KEY_B64) {
  console.error("Missing required environment variables");
  process.exit(1);
}

// Generate RSA keypair
const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
  modulusLength: 2048,
  publicKeyEncoding: { type: "spki", format: "pem" },
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
});

console.log("✅ Generated RSA-2048 keypair");

// Extract raw certificate subject
const certSubject =
  "CN=test dekan, C=ID, ST=Jawa Barat, L=Cirebon, O=Universitas Muhammadiyah Cirebon, OU=Testing";

// Function to call create-certificate via HTTP (with service role key)
async function createSigningCertificate() {
  // Expiry date: 1 year from now
  const expiresAt = new Date();
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);

  const payload = {
    createdBy: "d743107a-8cf5-4b24-bef3-c2bfe90e2d98",
    assignedTo: "d743107a-8cf5-4b24-bef3-c2bfe90e2d98",
    expiresAt: expiresAt.toISOString(),
    passphrase: "CAsigntest123!@#",
  };

  console.log("Making request to create-certificate function...");

  return new Promise((resolve, reject) => {
    const functionUrl = new URL(
      `${SUPABASE_URL}/functions/v1/create-certificate`
    );
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
    };

    const req = https.request(functionUrl, options, (res) => {
      let data = "";

      res.on("data", (chunk) => {
        data += chunk;
      });

      res.on("end", () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          try {
            const result = JSON.parse(data);
            console.log("✅ Successfully created signing certificate");
            console.log(`  KID: ${result.kid}`);
            console.log(`  Certificate Subject: ${result.certificate_subject}`);
            resolve(result);
          } catch (e) {
            console.log("✅ Response received (unable to parse):");
            console.log(data);
            resolve({ success: true, data });
          }
        } else {
          console.error(
            `❌ Error ${res.statusCode}:`,
            data.substring(0, 500)
          );
          reject(
            new Error(
              `HTTP ${res.statusCode}: ${data.substring(0, 200)}`
            )
          );
        }
      });
    });

    req.on("error", (error) => {
      console.error("Request error:", error);
      reject(error);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

// Main execution
(async () => {
  try {
    console.log("🔧 Creating new signing certificate...\n");
    const result = await createSigningCertificate();
    console.log("\n✅ Certificate creation completed!");
    console.log(`Result:`, result);

    // Verify it was created
    console.log(
      "\n⏳ Waiting 2 seconds before verification...\n"
    );
    await new Promise((r) => setTimeout(r, 2000));

    // List all active signing keys
    console.log("Active signing keys:");
    const listUrl = new URL(
      `${SUPABASE_URL}/rest/v1/signing_keys?revoked_at=is.null`
    );
    const listOptions = {
      method: "GET",
      headers: {
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
      },
    };

    const listReq = https.request(listUrl, listOptions, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const keys = JSON.parse(data);
          if (Array.isArray(keys)) {
            keys.forEach((k) => {
              console.log(`  - ${k.kid} (created: ${k.created_at})`);
            });
          }
        } catch (e) {
          console.log(data.substring(0, 200));
        }
      });
    });

    listReq.on("error", (e) => console.error("List error:", e));
    listReq.end();
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
})();
