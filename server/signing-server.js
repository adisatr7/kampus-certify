import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { createRequire } from 'module';

// Load environment variables from .env file
dotenv.config({ path: '.env' });

const require = createRequire(import.meta.url);
const signpdf = require('node-signpdf');
const { plainAddPlaceholder, SignPdf } = signpdf;
const signer = new SignPdf();
import forge from "node-forge";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";
import QRCodeLib from "qrcode";

// PBKDF2 utilities for passphrase verification
function base64Decode(b64) {
  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function verifyPBKDF2(pass, stored) {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split(":");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations <= 0) return false;
  const salt = base64Decode(parts[2]);
  const expectedHash = base64Decode(parts[3]);
  const enc = new TextEncoder();
  const crypto = await import('crypto');
  const { subtle } = crypto.webcrypto;
  
  const keyMaterial = await subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    expectedHash.byteLength * 8,
  );
  const derivedBytes = new Uint8Array(derived);
  if (derivedBytes.length !== expectedHash.byteLength) return false;
  let diff = 0;
  for (let i = 0; i < derivedBytes.length; i++) {
    diff |= derivedBytes[i] ^ expectedHash[i];
  }
  return diff === 0;
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

function createP12FromPem(privateKeyPem, certPem) {
  const pki = forge.pki;
  try {
    console.log('🔧 Creating PKCS#12 from PEM...');
    console.log('   Private Key starts with:', privateKeyPem.substring(0, 50));
    console.log('   Certificate starts with:', certPem.substring(0, 50));
    
    const privateKey = pki.privateKeyFromPem(privateKeyPem);
    console.log('✅ Private key parsed');
    
    const cert = pki.certificateFromPem(certPem);
    console.log('✅ Certificate parsed');
    
    // Log certificate details for debugging
    console.log('   Certificate Subject CN:', cert.subject.getField('CN')?.value);
    console.log('   Certificate Issuer CN:', cert.issuer.getField('CN')?.value);
    console.log('   Private key type:', privateKey.type);
    
    // Validate that the certificate's public key matches the private key
    // by extracting and comparing the public key from the certificate
    const certPublicKeyPem = pki.publicKeyToPem(cert.publicKey);
    const privateKeyPublicPem = pki.publicKeyToPem(pki.rsa.setPublicKey(privateKey.n, privateKey.e));
    
    if (certPublicKeyPem !== privateKeyPublicPem) {
      console.warn('⚠️  Certificate public key does not match private key public key, attempting to continue');
    } else {
      console.log('✅ Public key validation passed');
    }
    
    const newPkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, [cert], "");
    const der = forge.asn1.toDer(newPkcs12Asn1).getBytes();
    const p12Buffer = Buffer.from(der, "binary");
    console.log('✅ PKCS#12 created successfully, size:', p12Buffer.length, 'bytes');
    return p12Buffer;
  } catch (err) {
    console.error('❌ Error creating PKCS#12 from PEM:', err?.message || err);
    if (err.stack) console.error('Stack:', err.stack);
    throw new Error(`Failed to create PKCS#12: ${err?.message || String(err)}`);
  }
}

let devKeyPem = null;
let devCertPem = null;
try {
  const base = path.resolve(process.cwd(), "signing-keys-temp");
  devKeyPem = fs.readFileSync(path.join(base, "signing-key.pem"), "utf8");
  devCertPem = fs.readFileSync(path.join(base, "signing-cert.pem"), "utf8");
  console.log("Loaded dev signing keys from signing-keys-temp/");
} catch (err) {
  console.warn("Dev signing keys not found in signing-keys-temp; start server with real keys via env or secrets.", err.message);
}

app.post("/sign", async (req, res) => {
  try {
    const { pdfBase64, userId, userName, documentId, qrContent, signingPosition, kid, passphrase } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: "Missing pdfBase64 in body" });
    if (!passphrase) return res.status(400).json({ error: "Missing passphrase in body" });

    let pdfBuffer = Buffer.from(pdfBase64, "base64");
    
    // Initialize signerDisplayName - prefer userName from frontend (logged-in user)
    let signerDisplayName = userName || 'Unknown Signer';
    
    console.log('=== Starting PDF signing process ===');
    console.log('  userId:', userId);
    console.log('  userName (from frontend):', userName);
    console.log('  kid (selected certificate):', kid);
    console.log('  signerDisplayName (will use for placeholder):', signerDisplayName);

    // Basic validation: ensure buffer looks like a PDF
    try {
      const header = pdfBuffer.slice(0, 6).toString('utf8');
      if (!header.includes('%PDF')) {
        console.error('Signing server: uploaded content is not a PDF (header):', header);
        return res.status(400).json({ error: 'Uploaded content is not a valid PDF (missing %PDF header)'});
      }
    } catch (hErr) {
      console.error('Signing server: failed to validate PDF header:', hErr?.message || hErr);
      return res.status(400).json({ error: 'Invalid PDF data' });
    }

    // Check for essential PDF trailer markers (startxref and %%EOF)
    const startxrefIdx = pdfBuffer.lastIndexOf(Buffer.from('startxref'));
    const eofIdx = pdfBuffer.lastIndexOf(Buffer.from('%%EOF'));
    if (startxrefIdx === -1 || eofIdx === -1) {
      console.error('Signing server: PDF missing startxref or %%EOF', { startxrefIdx, eofIdx, size: pdfBuffer.length });
      return res.status(400).json({ error: 'Invalid PDF: missing startxref or %%EOF (file may be truncated or corrupted)' });
    }

    // NOTE: QR code is now handled in frontend during PDF generation
    // Frontend injects QR at the appropriate location (dekan/rektor/signer1/signer2)
    // based on placeholder replacement (DEKAN_QR_CODE, REKTOR_QR_CODE, qr_code_1, qr_code_2)
    // Signing server only adds digital signature, not QR codes

    // If QR embedding was not done (or even if it was), try to normalize the PDF
    // to a conventional xref table using pdf-lib — this helps when PDFs use xref streams
    // which some signing helpers expect.
    try {
      const normalizedDoc = await PDFDocument.load(pdfBuffer);
      const normalizedBytes = await normalizedDoc.save();
      pdfBuffer = Buffer.from(normalizedBytes);
      console.log('Signing server: normalized PDF (pdf-lib save) to ensure xref table presence');
    } catch (normErr) {
      console.warn('Signing server: PDF normalization via pdf-lib failed, will attempt to sign original buffer:', normErr?.message || normErr);
    }

    // Add placeholder for signature (with retry/normalization fallback)
    let pdfWithPlaceholder;
    try {
      pdfWithPlaceholder = plainAddPlaceholder({ 
        pdfBuffer, 
        reason: "Document Authentication", 
        name: signerDisplayName,
        location: "Universitas Muhammadiyah Cirebon",
        contactInfo: "Cirebon, Indonesia",
        signatureLength: 8192 
      });
    } catch (phErr) {
      console.error('Signing server: plainAddPlaceholder initial attempt failed:', phErr?.message || phErr);
      // capture trailer area for debugging
      try {
        const tailSample = pdfBuffer.slice(Math.max(0, pdfBuffer.length - 2048)).toString('utf8', 0, 2048).replace(/\s+/g, ' ');
        console.error('Signing server: PDF tail sample (last 2KB):', tailSample);
      } catch (tErr) {
        console.error('Signing server: failed to read PDF tail sample:', tErr?.message || tErr);
      }

      // Try to normalize and retry once more using pdf-lib (if possible)
      try {
        const normalizedDoc = await PDFDocument.load(pdfBuffer);
        const normalizedBytes = await normalizedDoc.save({ useObjectStreams: false });
        const normalizedBuffer = Buffer.from(normalizedBytes);
        console.log('Signing server: retry normalization succeeded, attempting placeholder on normalized PDF');
        try {
          pdfWithPlaceholder = plainAddPlaceholder({ 
            pdfBuffer: normalizedBuffer, 
            reason: 'Document Authentication',
            name: signerDisplayName,
            location: 'Universitas Muhammadiyah Cirebon',
            contactInfo: 'Cirebon, Indonesia',
            signatureLength: 8192 
          });
          // if success, swap buffer for downstream signing
          pdfBuffer = normalizedBuffer;
        } catch (secondErr) {
          console.error('Signing server: plainAddPlaceholder failed on normalized PDF:', secondErr?.message || secondErr);
          return res.status(400).json({ error: `Failed to prepare PDF placeholder after normalization: ${secondErr?.message || String(secondErr)}` });
        }
      } catch (normErr) {
        console.error('Signing server: retry normalization failed:', normErr?.message || normErr);
        return res.status(400).json({ error: `Failed to prepare PDF placeholder: ${phErr?.message || String(phErr)} (normalization also failed)` });
      }
    }

    // Prefer a per-user assigned signing key from Supabase when available
    let keyIdUsed = null;
    let keyPrivatePem = devKeyPem;
    let keyCertPem = devCertPem;
    let certSubject = null;
    let certIssuer = null;
    
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      console.log("SUPABASE_URL:", SUPABASE_URL);
      console.log("SUPABASE_SERVICE_ROLE_KEY:", SUPABASE_SERVICE_ROLE_KEY);

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && userId) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // If kid (certificate ID) is provided, fetch that specific certificate
        // Otherwise, fetch the latest one assigned to this user
        let query = sb
          .from('signing_keys')
          .select('kid, private_key_pem, certificate_pem, certificate_subject, certificate_issuer, assigned_to, enc_private_key, enc_private_key_iv, enc_algo, passphrase_hash')
          .eq('assigned_to', userId)
          .is('revoked_at', null);
        
        if (kid) {
          // User selected a specific certificate
          query = query.eq('kid', kid);
          console.log('  Using selected certificate (kid):', kid);
        } else {
          // No kid provided, use latest
          query = query.order('created_at', { ascending: false });
          console.log('  No certificate ID provided, using latest certificate');
        }
        
        const { data: keyRow, error: keyErr } = await query.maybeSingle();

        if (!keyErr && keyRow) {
          // Verify the key belongs to the signer
          if (keyRow.assigned_to !== userId) {
            console.error('❌ Signing key does not belong to this user:', {
              kid,
              keyAssignedTo: keyRow.assigned_to,
              userId
            });
            return res.status(403).json({ error: "Sertifikat ini bukan milik Anda. Akses ditolak." });
          }

          // Verify passphrase before proceeding - REQUIRED
          if (keyRow.passphrase_hash) {
            console.log('🔐 Verifying passphrase...');
            try {
              const passphraseValid = await verifyPBKDF2(passphrase, keyRow.passphrase_hash);
              if (!passphraseValid) {
                console.error('❌ Passphrase verification failed for user:', userId);
                return res.status(403).json({ error: "Passphrase salah. Tanda tangan gagal." });
              }
              console.log('✅ Passphrase verified successfully');
            } catch (passErr) {
              console.error('❌ Error verifying passphrase:', passErr?.message || passErr);
              return res.status(500).json({ error: "Gagal memverifikasi passphrase" });
            }
          } else {
            // No passphrase hash found - REJECT signing
            console.error('❌ No passphrase hash found for signing key. User must set passphrase first.');
            return res.status(403).json({ 
              error: "Sertifikat belum diatur dengan passphrase. Silakan hubungi administrator untuk mengatur passphrase terlebih dahulu." 
            });
          }
          keyIdUsed = keyRow.kid || null;
          certSubject = keyRow.certificate_subject || null;
          certIssuer = keyRow.certificate_issuer || null;
          
          console.log('🔑 Signing key found in database:');
          console.log('   Kid:', keyIdUsed);
          console.log('   Certificate Subject:', certSubject);
          console.log('   Certificate Issuer:', certIssuer);
          console.log('   Has private_key_pem:', !!keyRow.private_key_pem);
          console.log('   Has certificate_pem:', !!keyRow.certificate_pem);
          console.log('   Has enc_private_key:', !!keyRow.enc_private_key);
          
          // Helper to ensure we have PEM formatted private key and cert
          function toPemPrivate(k) {
            if (!k) return null;
            if (k.includes('BEGIN')) return k;
            // assume base64 DER or PKCS#8 base64 - wrap
            const body = k.match(/.{1,64}/g)?.join('\n') || k;
            return `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----`;
          }
          function toPemCert(c) {
            if (!c) return null;
            if (c.includes('BEGIN')) return c;
            const body = c.match(/.{1,64}/g)?.join('\n') || c;
            return `-----BEGIN CERTIFICATE-----\n${body}\n-----END CERTIFICATE-----`;
          }

          // Check if private key is encrypted
          if (keyRow.enc_private_key && keyRow.enc_private_key_iv) {
            console.log('🔓 Decrypting private key...');
            try {
              const MASTER_KEY_B64 = process.env.MASTER_KEY_B64;
              if (!MASTER_KEY_B64) {
                console.error('❌ MASTER_KEY_B64 not found in environment - cannot decrypt private key');
                throw new Error('Master key not configured');
              }

              // Import master key for decryption
              const masterKeyBytes = Buffer.from(MASTER_KEY_B64, 'base64');
              const crypto = await import('crypto');
              const { subtle } = crypto.webcrypto;
              
              const masterKey = await subtle.importKey(
                'raw',
                masterKeyBytes,
                'AES-GCM',
                false,
                ['decrypt']
              );

              // Decrypt the private key
              const encryptedData = Buffer.from(keyRow.enc_private_key, 'base64');
              const iv = Buffer.from(keyRow.enc_private_key_iv, 'base64');
              
              const decryptedBuffer = await subtle.decrypt(
                { name: 'AES-GCM', iv },
                masterKey,
                encryptedData
              );
              
              const decryptedPrivateKey = Buffer.from(decryptedBuffer).toString('utf8');
              
              // Validate the decrypted key is valid PEM format
              if (!decryptedPrivateKey.includes('BEGIN') || !decryptedPrivateKey.includes('END')) {
                throw new Error('Decrypted private key is not valid PEM format');
              }
              
              keyPrivatePem = decryptedPrivateKey;
              console.log('✅ Private key decrypted successfully');
            } catch (decryptErr) {
              console.error('❌ Failed to decrypt private key:', decryptErr?.message || decryptErr);
              // Try plaintext fallback
              if (keyRow.private_key_pem) {
                console.log('⚠️  Using plaintext private key as fallback');
                keyPrivatePem = keyRow.private_key_pem;
              } else {
                throw new Error(`Encrypted private key found but decryption failed and no plaintext fallback available: ${decryptErr?.message}`);
              }
            }
          } else if (keyRow.private_key_pem) {
            // Private key is not encrypted, use plaintext
            console.log('📝 Using plaintext private key');
            keyPrivatePem = keyRow.private_key_pem;
          } else if (keyRow.private_key) {
            // Alternative field name
            console.log('📝 Using plaintext private key (alternate field)');
            keyPrivatePem = keyRow.private_key;
          } else {
            throw new Error('No private key found - neither encrypted nor plaintext field available');
          }

          keyCertPem = keyRow.certificate_pem || keyRow.x509_certificate || keyCertPem;

          // Ensure PEM format
          if (keyPrivatePem && !keyPrivatePem.includes('BEGIN')) {
            keyPrivatePem = toPemPrivate(keyPrivatePem);
          }
          if (keyCertPem && !keyCertPem.includes('BEGIN')) {
            keyCertPem = toPemCert(keyCertPem);
          }
          
          // Debug: log first/last 50 chars of key/cert
          console.log('🔧 Private Key PEM start:', keyPrivatePem?.substring(0, 50));
          console.log('🔧 Private Key PEM end:', keyPrivatePem?.substring(Math.max(0, keyPrivatePem.length - 50)));
          console.log('🔧 Certificate PEM start:', keyCertPem?.substring(0, 50));
          console.log('🔧 Certificate PEM end:', keyCertPem?.substring(Math.max(0, keyCertPem.length - 50)));
          
          // Validation: warn if certificate subject doesn't contain user name
          if (certSubject && userName && !certSubject.toLowerCase().includes(userName.toLowerCase())) {
            console.warn('⚠️  WARNING: Certificate subject does not contain signer name');
            console.warn('   Certificate Subject:', certSubject);
            console.warn('   Expected user name:', userName);
          }
          
          console.log('✅ Successfully loaded signing key and certificate');
        } else {
          console.log('ℹ️  No per-user signing key found, using server default keys', keyErr);
        }
      }
    } catch (fetchKeyErr) {
      console.warn('Signing server: failed to fetch per-user signing key, falling back to server key:', fetchKeyErr?.message || fetchKeyErr);
    }

    if (!keyPrivatePem || !keyCertPem) {
      console.error('❌ Missing signing keys:');
      console.error('   keyPrivatePem available:', !!keyPrivatePem);
      console.error('   keyCertPem available:', !!keyCertPem);
      if (keyPrivatePem) console.error('   keyPrivatePem length:', keyPrivatePem.length);
      if (keyCertPem) console.error('   keyCertPem length:', keyCertPem.length);
      return res.status(500).json({ error: "Signing keys not available on server" });
    }
    
    // Validate PEM format before creating P12
    if (!keyPrivatePem.includes('BEGIN') || !keyPrivatePem.includes('END')) {
      console.error('❌ Invalid private key PEM format');
      console.error('   First 100 chars:', keyPrivatePem.substring(0, 100));
      return res.status(500).json({ error: "Invalid private key format - not valid PEM" });
    }
    
    if (!keyCertPem.includes('BEGIN') || !keyCertPem.includes('END')) {
      console.error('❌ Invalid certificate PEM format');
      console.error('   First 100 chars:', keyCertPem.substring(0, 100));
      return res.status(500).json({ error: "Invalid certificate format - not valid PEM" });
    }
    
    let p12Buffer;
    try {
      p12Buffer = createP12FromPem(keyPrivatePem, keyCertPem);
    } catch (p12Err) {
      console.error('❌ Failed to create PKCS#12 from certificate and key:', p12Err?.message || p12Err);
      console.error('   Private Key length:', keyPrivatePem?.length);
      console.error('   Certificate length:', keyCertPem?.length);
      return res.status(500).json({ error: `Failed to create PKCS#12: ${p12Err?.message || String(p12Err)}` });
    }

    // perform signing using SignPdf class
    console.log('🖋️  Signing PDF with certificate...');
    console.log('   Certificate Subject:', certSubject || 'Using fallback certificate');
    let signedPdf;
    try {
      signedPdf = signer.sign(pdfWithPlaceholder, p12Buffer);
    } catch (signErr) {
      console.error('❌ Failed to sign PDF:', signErr?.message || signErr);
      return res.status(500).json({ error: `Failed to sign PDF: ${signErr?.message || String(signErr)}` });
    }
    console.log('✅ PDF signed successfully');

    // If Supabase environment present, try to upload signed PDF and create signature record
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

        // Upload signed PDF to 'signed-documents' bucket
        try {
          const signedFileName = `${userId || 'anon'}/${documentId || 'doc'}-signed-${Date.now()}.pdf`;
          const { data: uploadData, error: uploadErr } = await sb.storage
            .from('signed-documents')
            .upload(signedFileName, signedPdf, { contentType: 'application/pdf', upsert: false });

          if (uploadErr) {
            console.warn('Signing server: upload to storage failed:', uploadErr.message || uploadErr);
          } else {
            // Make public URL
            const { data: { publicUrl } } = sb.storage.from('signed-documents').getPublicUrl(signedFileName);

            // Insert signature record into document_signatures (store PKCS#7 blob as base64)
            const pkcs7B64 = signedPdf.toString('base64');
            try {
              console.log('📝 Creating document signature record...');
              console.log('   Signer Name:', signerDisplayName);
              console.log('   Certificate Subject:', certSubject);
              
              await sb.from('document_signatures').insert({
                document_id: documentId || null,
                key_id: keyIdUsed || 'server-default',
                payload_hash: null,
                signature: pkcs7B64,
                signer_user_id: userId || null,
                signer_name: signerDisplayName,
                signature_reason: 'Document Authentication',
                signature_location: 'Universitas Muhammadiyah Cirebon, Indonesia',
                signed_at: new Date().toISOString()
              });
              console.log('✅ Signature record created successfully');
            } catch (sigErr) {
              console.warn('Signing server: failed to insert document_signatures record:', sigErr?.message || sigErr);
            }

            // Update documents.file_url to point to the signed PDF and add a small server-signed metadata flag (best-effort)
            try {
              // Fetch current metadata
              const { data: docRow } = await sb.from('documents').select('metadata').eq('id', documentId).maybeSingle();
              let newMetadata = {};
              if (docRow && docRow.metadata) {
                newMetadata = docRow.metadata;
              }
              newMetadata.server_signed_at = new Date().toISOString();
              newMetadata.server_signed_by = userId || null;

              await sb.from('documents').update({ file_url: publicUrl, metadata: newMetadata }).eq('id', documentId);
            } catch (docErr) {
              console.warn('Signing server: failed to update documents.file_url/metadata:', docErr?.message || docErr);
            }

            // Create audit entry
            try {
              const desc = `Server-side signed PDF uploaded for document ${documentId} by ${userId || 'server'}`;
              await sb.rpc('create_audit_entry', { p_user_id: userId || null, p_action: 'SIGN_DOCUMENT_SERVER', p_description: desc });
            } catch (auditErr) {
              console.warn('Signing server: failed to create audit entry after upload:', auditErr?.message || auditErr);
            }
          }
        } catch (uErr) {
          console.warn('Signing server: storage upload exception:', uErr?.message || uErr);
        }
      }
    } catch (e) {
      console.warn('Signing server: supabase post-sign steps failed:', e?.message || e);
    }

    res.json({ signedPdfBase64: signedPdf.toString("base64") });
  } catch (err) {
    console.error("/sign error:", err);
    // If available, attempt to write audit failure
    try {
      const SUPABASE_URL = process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb.rpc("create_audit_entry", {
          p_user_id: req.body?.userId || null,
          p_action: "SIGN_DOCUMENT_SERVER_FAILURE",
          p_description: `Signing server error: ${err?.message || String(err)}`,
        });
      }
    } catch (auditErr) {
      console.warn("Signing server: failed to write failure audit entry:", auditErr?.message || auditErr);
    }
    res.status(500).json({ error: err?.message || String(err) });
  }
});

const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`Signing server running on http://localhost:${port}`));

export default app;
