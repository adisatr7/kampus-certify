import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const signpdf = require('node-signpdf');
const { plainAddPlaceholder } = signpdf;
import { PDFDocument } from 'pdf-lib';

async function run() {
  const payloadPath = '/tmp/sign_payload.json';
  if (!fs.existsSync(payloadPath)) {
    console.error('Payload not found at', payloadPath);
    process.exit(2);
  }
  const raw = fs.readFileSync(payloadPath, 'utf8');
  let body;
  try {
    body = JSON.parse(raw);
  } catch (e) {
    console.error('Failed to parse JSON payload:', e.message);
    process.exit(2);
  }
  const pdfBase64 = body.pdfBase64;
  const buf = Buffer.from(pdfBase64, 'base64');
  console.log('PDF length bytes:', buf.length);
  // show header
  console.log('Header sample:', buf.slice(0, 64).toString('utf8').replace(/\n/g,'\\n'));
  const idx = buf.lastIndexOf(Buffer.from('startxref'));
  console.log('lastIndexOf startxref:', idx);
  if (idx !== -1) {
    const sample = buf.slice(idx, idx + 200).toString('utf8');
    console.log('startxref area:', sample.replace(/\n/g,'\\n'));
  }
  try {
    // try pdf-lib normalization first
    try {
      const pdfDoc = await PDFDocument.load(buf);
      const normalized = await pdfDoc.save();
      console.log('pdf-lib normalization produced bytes:', normalized.length);
    } catch (ne) {
      console.warn('pdf-lib normalization failed:', ne.message);
    }

    const out = plainAddPlaceholder({ pdfBuffer: buf, reason: 'test', signatureLength: 8192 });
    console.log('plainAddPlaceholder succeeded, length', out.length);
  } catch (err) {
    console.error('plainAddPlaceholder error:', err && err.stack ? err.stack : String(err));
    process.exit(1);
  }
}

run();
