import fs from "fs/promises";
import path from "path";
import PDFDocumentKit from "pdfkit";

async function run() {
  // Create a minimal PDF using pdfkit for better compatibility
  const doc = new PDFDocumentKit({ size: [595.28, 841.89] });
  doc.fontSize(24).text("Test PDF for signing", 50, 80);
  const chunks = [];
  doc.on("data", (c) => chunks.push(c));
  const ended = new Promise((resolve) => doc.on("end", resolve));
  doc.end();
  await ended;
  const pdfBuffer = Buffer.concat(chunks);
  const b64 = pdfBuffer.toString("base64");

  const signingServer = process.env.SIGNING_SERVER_URL || process.env.VITE_SIGNING_SERVER_URL || "http://localhost:3001";
  console.log("Using signing server:", signingServer);

  const resp = await fetch(`${signingServer.replace(/\/$/, "")}/sign`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pdfBase64: b64, userId: "test-user", documentId: "test-doc" }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Signing server returned error:", resp.status, txt);
    process.exit(2);
  }

  const json = await resp.json();
  const signedB64 = json.signedPdfBase64;
  if (!signedB64) {
    console.error("No signedPdfBase64 in response");
    process.exit(2);
  }

  const outDir = path.resolve("scripts/output");
  await fs.mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, "signed.pdf");
  const buf = Buffer.from(signedB64, "base64");
  await fs.writeFile(outPath, buf);
  console.log("Signed PDF saved to", outPath);

  const containsByteRange = buf.includes(Buffer.from("/ByteRange"));
  const containsContents = buf.includes(Buffer.from("/Contents"));
  console.log("Contains /ByteRange:", containsByteRange, "Contains /Contents:", containsContents);
  if (!containsByteRange && !containsContents) {
    console.error("Signed PDF appears not to contain signature structures.");
    process.exit(3);
  }

  console.log("Test signing completed successfully.");
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
