import { generateKeyPairSync } from "crypto";

function chunk(str: string, size = 64) {
  const re = new RegExp(`.{1,${size}}`, "g");
  return (str.match(re) || []).join("\n");
}

function box(title: string, body: string, hint?: string) {
  const lines = body.split("\n");
  const width = Math.max(...lines.map((l) => l.length), title.length + 2);
  const hr = "+" + "-".repeat(width + 2) + "+";
  const paddedTitle = `| ${title.padEnd(width)} |`;
  const boxed = [hr, paddedTitle, hr];
  for (const line of lines) {
    boxed.push(`| ${line.padEnd(width)} |`);
  }
  boxed.push(hr);
  console.log(boxed.join("\n"));
  if (hint) {
    console.log(hint + "\n");
  }
}

// Generate key pair
const { publicKey, privateKey } = generateKeyPairSync("ed25519");

// Export as binary (DER)
const publicDer = publicKey.export({ format: "der", type: "spki" });
const privateDer = privateKey.export({ format: "der", type: "pkcs8" });

// Convert to base64
const publicB64 = publicDer.toString("base64");
const privateB64 = privateDer.toString("base64");

// Human-readable version tag (e.g. v1-2025-10-17)
const kid = "v1-" + new Date().toISOString().slice(0, 10);

const sqlInsert = `INSERT INTO public.signing_keys (kid, kty, crv, x, active)
VALUES ('${kid}', 'OKP', 'Ed25519', '${publicB64}', TRUE);`;

// -----------------------------------------------------------------------------------

console.log("Generating Ed25519 key pair...\n");

box(
  "SIGNING_PRIVATE_KEY_PKCS8_B64",
  chunk(privateB64, 64),
  "🚫 DO NOT store private key in your database!\n" +
    "   In Supabase Dashboard → Functions → Environment Variables:\n" +
    "   Name: SIGNING_PRIVATE_KEY_PKCS8_B64\n" +
    "   Paste the entire block above as the value.",
);

box("SIGNING_KEY_ID", kid, "🔐 Also add this to your environment variables as SIGNING_KEY_ID");

box(
  "PUBLIC_KEY_DER_B64",
  chunk(publicB64, 64),
  "🌐 Do not save this to your environment variables!\n" +
    "   Instead, save this public key in your database using the SQL statement below:\n\n" +
    `${sqlInsert}\n`,
);

console.log("✨ Ed25519 key pair generated successfully! ✨\n");
