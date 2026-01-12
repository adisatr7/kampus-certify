import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const signpdf = require('node-signpdf');
const { plainAddPlaceholder, SignPdf } = signpdf;
const signer = new SignPdf();
import forge from "node-forge";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument } from "pdf-lib";

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

function createP12FromPem(privateKeyPem, certPem, caCertPem = null) {
  const pki = forge.pki;
  try {
    console.log('🔧 Creating PKCS#12 from PEM...');
    console.log('   Private Key starts with:', privateKeyPem.substring(0, 50));
    console.log('   Certificate starts with:', certPem.substring(0, 50));
    if (caCertPem) {
      console.log('   CA Certificate provided for chain');
    }
    
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
    
    // Build certificate chain: [user cert, CA cert]
    // This helps PDF readers validate the signature properly
    const certChain = [cert];
    if (caCertPem) {
      try {
        const caCert = pki.certificateFromPem(caCertPem);
        certChain.push(caCert);
        console.log('✅ CA certificate added to chain');
        console.log('   CA Subject:', caCert.subject.getField('CN')?.value);
      } catch (caErr) {
        console.warn('⚠️  Failed to parse CA certificate, continuing without it:', caErr?.message);
      }
    }
    
    const newPkcs12Asn1 = forge.pkcs12.toPkcs12Asn1(privateKey, certChain, "");
    const der = forge.asn1.toDer(newPkcs12Asn1).getBytes();
    const p12Buffer = Buffer.from(der, "binary");
    console.log('✅ PKCS#12 created successfully with', certChain.length, 'certificate(s), size:', p12Buffer.length, 'bytes');
    return p12Buffer;
  } catch (err) {
    console.error('❌ Error creating PKCS#12 from PEM:', err?.message || err);
    if (err.stack) console.error('Stack:', err.stack);
    throw new Error(`Failed to create PKCS#12: ${err?.message || String(err)}`);
  }
}

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfBase64, userId, userName, documentId, qrContent, signingPosition, kid, passphrase } = req.body;
    if (!pdfBase64) return res.status(400).json({ error: "Missing pdfBase64 in body" });
    if (!passphrase) return res.status(400).json({ error: "Missing passphrase in body" });

    let pdfBuffer = Buffer.from(pdfBase64, "base64");
    
    // Initialize signerDisplayName - prefer userName from frontend (logged-in user)
    let signerDisplayName = userName || 'Unknown Signer';
    
    console.log('=== Starting PDF signing process (Vercel) ===');
    console.log('  userId:', userId);
    console.log('  userName (from frontend):', userName);
    console.log('  kid (selected certificate):', kid);
    console.log('  signerDisplayName (will use for placeholder):', signerDisplayName);

    // Basic validation: ensure buffer looks like a PDF
    try {
      const header = pdfBuffer.slice(0, 6).toString('utf8');
      if (!header.includes('%PDF')) {
        console.error('Vercel sign: uploaded content is not a PDF (header):', header);
        return res.status(400).json({ error: 'Uploaded content is not a valid PDF (missing %PDF header)'});
      }
    } catch (hErr) {
      console.error('Vercel sign: failed to validate PDF header:', hErr?.message || hErr);
      return res.status(400).json({ error: 'Invalid PDF data' });
    }

    // Check for essential PDF trailer markers (startxref and %%EOF)
    const startxrefIdx = pdfBuffer.lastIndexOf(Buffer.from('startxref'));
    const eofIdx = pdfBuffer.lastIndexOf(Buffer.from('%%EOF'));
    if (startxrefIdx === -1 || eofIdx === -1) {
      console.error('Vercel sign: PDF missing startxref or %%EOF', { startxrefIdx, eofIdx, size: pdfBuffer.length });
      return res.status(400).json({ error: 'Invalid PDF: missing startxref or %%EOF (file may be truncated or corrupted)' });
    }

    // Normalize PDF
    try {
      const normalizedDoc = await PDFDocument.load(pdfBuffer);
      const normalizedBytes = await normalizedDoc.save();
      pdfBuffer = Buffer.from(normalizedBytes);
      console.log('Vercel sign: normalized PDF (pdf-lib save) to ensure xref table presence');
    } catch (normErr) {
      console.warn('Vercel sign: PDF normalization via pdf-lib failed, will attempt to sign original buffer:', normErr?.message || normErr);
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
      console.error('Vercel sign: plainAddPlaceholder initial attempt failed:', phErr?.message || phErr);
      
      // Try to normalize and retry once more using pdf-lib (if possible)
      try {
        const normalizedDoc = await PDFDocument.load(pdfBuffer);
        const normalizedBytes = await normalizedDoc.save({ useObjectStreams: false });
        const normalizedBuffer = Buffer.from(normalizedBytes);
        console.log('Vercel sign: retry normalization succeeded, attempting placeholder on normalized PDF');
        try {
          pdfWithPlaceholder = plainAddPlaceholder({ 
            pdfBuffer: normalizedBuffer, 
            reason: 'Document Authentication',
            name: signerDisplayName,
            location: 'Universitas Muhammadiyah Cirebon',
            contactInfo: 'Cirebon, Indonesia',
            signatureLength: 8192 
          });
          pdfBuffer = normalizedBuffer;
        } catch (secondErr) {
          console.error('Vercel sign: plainAddPlaceholder failed on normalized PDF:', secondErr?.message || secondErr);
          return res.status(400).json({ error: `Failed to prepare PDF placeholder after normalization: ${secondErr?.message || String(secondErr)}` });
        }
      } catch (normErr) {
        console.error('Vercel sign: retry normalization failed:', normErr?.message || normErr);
        return res.status(400).json({ error: `Failed to prepare PDF placeholder: ${phErr?.message || String(phErr)} (normalization also failed)` });
      }
    }

    // Prefer a per-user assigned signing key from Supabase when available
    let keyIdUsed = null;
    let keyPrivatePem = process.env.SIGNING_KEY_PEM;
    let keyCertPem = process.env.SIGNING_CERT_PEM;
    let caCertPem = null; // CA certificate for chain validation
    let certSubject = null;
    let certIssuer = null;
    
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && userId) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        
        // Check if signer is an admin
        const { data: signerUser, error: signerErr } = await sb
          .from('users')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        
        const isAdmin = !signerErr && signerUser?.role === 'admin';
        console.log('  Signer role check: isAdmin =', isAdmin);
        
        // If kid (certificate ID) is provided, fetch that specific certificate
        // Otherwise, fetch the latest one assigned to this user
        let query = sb
          .from('signing_keys')
          .select('kid, private_key_pem, certificate_pem, certificate_subject, certificate_issuer, assigned_to, enc_private_key, enc_private_key_iv, enc_algo, passphrase_hash')
          .is('revoked_at', null);
        
        // If admin, allow any key; if user, only allow their own keys
        if (!isAdmin) {
          query = query.eq('assigned_to', userId);
        }
        
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

        // CRITICAL: If no signing key found, reject the signing attempt
        if (!keyRow || keyErr) {
          console.error('❌ No signing key found for user:', userId);
          console.error('   isAdmin:', isAdmin);
          console.error('   kid:', kid);
          console.error('   Query error:', keyErr?.message);
          
          if (!isAdmin) {
            // Non-admin user: they MUST have a signing key
            return res.status(403).json({ 
              error: "Anda tidak memiliki sertifikat digital aktif. Silakan buat sertifikat digital terlebih dahulu sebelum menandatangani dokumen." 
            });
          } else {
            // Admin: specified kid not found
            return res.status(404).json({ 
              error: "Sertifikat dengan ID tersebut tidak ditemukan atau tidak aktif." 
            });
          }
        }

        if (!keyErr && keyRow) {
          // For non-admin users: Verify the key belongs to the signer
          if (!isAdmin && keyRow.assigned_to !== userId) {
            console.error('❌ Signing key does not belong to this user:', {
              kid,
              keyAssignedTo: keyRow.assigned_to,
              userId
            });
            return res.status(403).json({ error: "Sertifikat ini bukan milik Anda. Akses ditolak." });
          }

          // Verify passphrase before proceeding - REQUIRED (for all users, including admins)
          if (keyRow.passphrase_hash) {
            console.log('🔐 Verifying passphrase for key:', keyRow.kid);
            try {
              const passphraseValid = await verifyPBKDF2(passphrase, keyRow.passphrase_hash);
              if (!passphraseValid) {
                console.error('❌ Passphrase verification failed for key:', keyRow.kid);
                return res.status(403).json({ error: "Passphrase salah. Tanda tangan gagal." });
              }
              console.log('✅ Passphrase verified successfully for key:', keyRow.kid);
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
            console.log('   Encrypted private key present:', !!keyRow.enc_private_key);
            console.log('   IV present:', !!keyRow.enc_private_key_iv);
            try {
              const MASTER_KEY_B64 = process.env.MASTER_KEY_B64;
              if (!MASTER_KEY_B64) {
                console.error('❌ MASTER_KEY_B64 not found in environment - cannot decrypt private key');
                console.error('   Set MASTER_KEY_B64 in Vercel environment variables!');
                throw new Error('Master key not configured');
              }
              
              console.log('   MASTER_KEY_B64 length:', MASTER_KEY_B64.length);
              console.log('   MASTER_KEY_B64 starts with:', MASTER_KEY_B64.substring(0, 20) + '...');

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
              console.error('   Error type:', decryptErr?.constructor?.name);
              console.error('   Full error:', decryptErr);
              console.error('   ⚠️  CRITICAL: Private key decryption failed!');
              console.error('   Check: MASTER_KEY_B64 environment variable in Vercel');
              console.error('   The MASTER_KEY_B64 in Vercel MUST match the one used to encrypt the key');
              // Try plaintext fallback
              if (keyRow.private_key_pem) {
                console.log('⚠️  Using plaintext private key as fallback');
                keyPrivatePem = keyRow.private_key_pem;
              } else {
                console.error('   No plaintext fallback available!');
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
          
          // Fetch CA certificate for certificate chain
          // This helps PDF readers validate the signature as "Unknown" or better
          if (keyRow.ca_id) {
            console.log('🔍 Fetching CA certificate for chain (ca_id:', keyRow.ca_id, ')');
            try {
              const { data: caRow, error: caError } = await sb
                .from('ca_certificates')
                .select('certificate_pem')
                .eq('id', keyRow.ca_id)
                .is('revoked_at', null)
                .maybeSingle();
              
              if (!caError && caRow?.certificate_pem) {
                caCertPem = caRow.certificate_pem;
                console.log('✅ CA certificate fetched for chain');
              } else {
                console.warn('⚠️  Could not fetch CA certificate:', caError?.message || 'not found');
              }
            } catch (caFetchErr) {
              console.warn('⚠️  Error fetching CA certificate:', caFetchErr?.message || caFetchErr);
            }
          } else {
            console.log('ℹ️  No ca_id found, signing without CA chain');
          }
          
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
      console.warn('Vercel sign: failed to fetch per-user signing key, falling back to server key:', fetchKeyErr?.message || fetchKeyErr);
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
      p12Buffer = createP12FromPem(keyPrivatePem, keyCertPem, caCertPem);
    } catch (p12Err) {
      console.error('❌ Failed to create PKCS#12 from certificate and key:', p12Err?.message || p12Err);
      console.error('   Private Key length:', keyPrivatePem?.length);
      console.error('   Certificate length:', keyCertPem?.length);
      console.error('   CA Certificate available:', !!caCertPem);
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
    // This matches signing-server behavior for consistency
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
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
            console.warn('Vercel sign: upload to storage failed:', uploadErr.message || uploadErr);
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
              console.warn('Vercel sign: failed to insert document_signatures record:', sigErr?.message || sigErr);
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
              console.warn('Vercel sign: failed to update documents.file_url/metadata:', docErr?.message || docErr);
            }

            // Create audit entry
            try {
              const desc = `API signed PDF for document ${documentId} by ${userId || 'server'}`;
              await sb.rpc('create_audit_entry', { p_user_id: userId || null, p_action: 'SIGN_DOCUMENT_API', p_description: desc });
            } catch (auditErr) {
              console.warn('Vercel sign: failed to create audit entry after upload:', auditErr?.message || auditErr);
            }
          }
        } catch (uErr) {
          console.warn('Vercel sign: storage upload exception:', uErr?.message || uErr);
        }
      }
    } catch (e) {
      console.warn('Vercel sign: supabase post-sign steps failed:', e?.message || e);
    }

    return res.status(200).json({ 
      signedPdfBase64: signedPdf.toString("base64") 
    });

  } catch (err) {
    console.error('❌ Vercel sign handler error:', err?.message || err);
    if (err.stack) console.error('Stack:', err.stack);
    
    // If available, attempt to write audit failure
    try {
      const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await sb.rpc("create_audit_entry", {
          p_user_id: req.body?.userId || null,
          p_action: "SIGN_DOCUMENT_API_FAILURE",
          p_description: `Signing API error: ${err?.message || String(err)}`,
        });
      }
    } catch (auditErr) {
      console.warn("Vercel sign: failed to write failure audit entry:", auditErr?.message || auditErr);
    }
    
    return res.status(500).json({ 
      error: err?.message || String(err) 
    });
  }
}
