import { randomBytes } from "crypto";

function chunk(str: string, size: number = 64) {
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

// ------------------------------------------------------
// Generate 256-bit (32-byte) AES-GCM master key
// ------------------------------------------------------
console.log("Generating 256-bit AES-GCM master key...\n");

const keyBytes = randomBytes(32);
const keyB64 = keyBytes.toString("base64");

box(
  "MASTER_KEY_B64",
  chunk(keyB64, 64),
  "🟢 Save this value in your Supabase Sidebar → Edge Functions → Secrets\n" +
    "   Name: MASTER_KEY_B64\n\n" +
    "⚠️  WARNING: Rotating or changing this master key will permanently lock all existing signing keys.\n" +
    "   - All certificates signing keys encrypted with the old key will become unreadable.\n" +
    "   - You will need to recreate every certificate manually if this key is lost or replaced.\n" +
    "   - Generate this only ONCE per environment and back it up securely!\n\n" +
    "🚫 Do NOT commit this key to Git or store it in the database.",
);

console.log("✨ AES-GCM master key generated successfully! ✨\n");
