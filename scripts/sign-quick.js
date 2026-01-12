#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import path from "path";

// Load environment variables from .env
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
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const supabaseAdmin = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

async function signDocument(documentId, signerUserIdArg = null, passphrase = "test-pass") {
  try {
    console.log(`\n🔐 Signing document: ${documentId}`);

    // Fetch the document
    console.log("📄 Fetching document...");
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .maybeSingle();

    if (docError || !document) {
      console.error("❌ Document not found");
      process.exit(1);
    }

    console.log("✅ Document found:", {
      id: document.id,
      title: document.title,
      status: document.status,
    });

    // Get or use provided signer user ID
    let signerUserId = signerUserIdArg;

    if (!signerUserId) {
      console.log("🔑 Getting system user for signing...");
      
      // Try to get current user
      const { data: userData } = await supabase.auth.getUser();
      
      if (userData?.user) {
        signerUserId = userData.user.id;
        console.log("✅ Using current user:", signerUserId);
      } else if (supabaseAdmin) {
        // Get first user from auth
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        if (users?.users?.length > 0) {
          signerUserId = users.users[0].id;
          console.log("✅ Using first available user:", signerUserId);
        }
      } else {
        console.error("❌ No signer user ID provided and could not retrieve one");
        process.exit(1);
      }
    }

    console.log(`\n📝 Signer User ID: ${signerUserId}`);
    console.log(`🔒 Passphrase: ${passphrase}`);

    // Call the sign-document edge function
    console.log("\n🚀 Invoking sign-document function...");
    const { data: signResult, error: signError } = await supabase.functions.invoke("sign-document", {
      body: {
        documentId: documentId,
        signerUserId: signerUserId,
        passphrase: passphrase,
      },
    });

    if (signError) {
      console.error("❌ Signing function error:", signError);
      process.exit(1);
    }

    console.log("✅ Signing completed");

    if (signResult?.fileUrl) {
      console.log(`\n📥 Signed PDF ready:`);
      console.log(`   ${signResult.fileUrl}`);
    }

    if (signResult?.message) {
      console.log(`\n💬 ${signResult.message}`);
    }

    console.log("\n✨ Done!\n");
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

// Get document ID from command line argument
const documentId = process.argv[2];
const signerUserId = process.argv[3];
const passphrase = process.argv[4] || "test-pass";

if (!documentId) {
  console.error("❌ Usage: node sign-quick.js <documentId> [signerUserId] [passphrase]");
  console.error("   Example: node sign-quick.js 14ad2311-bc14-4289-a9b8-5f25fcdb9cf9");
  console.error("   Example: node sign-quick.js 14ad2311-bc14-4289-a9b8-5f25fcdb9cf9 550e8400-e29b-41d4-a716-446655440000");
  process.exit(1);
}

signDocument(documentId, signerUserId, passphrase);
