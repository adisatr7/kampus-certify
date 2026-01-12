import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// @deno-types="npm:@types/node-forge@1"
import forge from "npm:node-forge@1.3.1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64 utilities
function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i]);
  }
  return btoa(s);
}

// PBKDF2 hash function
async function pbkdf2Hash(pass: string, iterations = 100_000): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(pass),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    keyMaterial,
    256,
  );
  const hashBytes = new Uint8Array(derived);
  return `pbkdf2:${iterations}:${base64Encode(salt)}:${base64Encode(hashBytes)}`;
}

/**
 * Validate passphrase rules:
 * - must be a string
 * - must begin with "CA"
 * - must be at least 8 characters total (so "CA" + 6 more characters minimum)
 * - must include at least one symbol (non-alphanumeric)
 *
 * @param passphrase The passphrase to validate
 */
function validatePassphrase(passphrase: unknown): { valid: boolean; error: string | null } {
  if (!passphrase || typeof passphrase !== "string") {
    return { valid: false, error: "Passphrase wajib diisi" };
  }
  if (passphrase.length < 8) {
    return { valid: false, error: "Passphrase minimal 6 karakter" };
  }
  if (!/[^A-Za-z0-9]/.test(passphrase)) {
    return { valid: false, error: "Passphrase harus mengandung setidaknya satu simbol" };
  }
  return { valid: true, error: null };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("content-type", "application/json");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { createdBy, assignedTo, expiresAt, passphrase } = await req.json();

    // Validate inputs
    if (!createdBy || !assignedTo || !expiresAt || !passphrase) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Data tidak lengkap",
          data: null,
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    // Validate passphrase
    const passValidation = validatePassphrase(passphrase);
    if (!passValidation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: passValidation.error,
          data: null,
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    // Validate expiry date
    const expirityDate = new Date(expiresAt);

    if (isNaN(expirityDate.getTime())) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tanggal kadaluarsa tidak valid",
          data: null,
        }),
        {
          status: 400,
          headers,
        },
      );
    }

    // Ensure target user exists
    {
      const { data: userRow, error } = await supabase
        .from("users")
        .select("id")
        .eq("id", assignedTo)
        .single();
      if (error || !userRow) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "User tidak ditemukan",
            data: null,
          }),
          {
            status: 404,
            headers,
          },
        );
      }
    }

    // Fetch user data to get name for certificate CN
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("name, email")
      .eq("id", assignedTo)
      .single();
    
    if (userError || !userData) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gagal mengambil data user untuk certificate",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    const userName = userData.name || "Unknown User";
    const userEmail = userData.email || "no-email@example.com";

    // Ensure master key exists
    const MASTER_KEY_B64 = Deno.env.get("MASTER_KEY_B64")!;
    if (!MASTER_KEY_B64) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Master Key tidak tersimpan di sistem. Harap hubungi admin atau teknisi",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    // Import master key for AES-GCM (32 bytes)
    const masterKeyBytes = base64Decode(MASTER_KEY_B64);
    if (masterKeyBytes.byteLength !== 32) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            "Master Key yang tersimpan di sistem tidak valid. Harap hubungi admin atau teknisi",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }
    const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
      "encrypt",
      "decrypt",
    ]);

    // Fetch CA certificate from database
    console.log("🔍 Fetching CA certificate...");
    const { data: caRow, error: caError } = await supabase
      .from("ca_certificates")
      .select("id, certificate_pem, certificate_subject, enc_private_key, enc_private_key_iv, enc_algo")
      .eq("name", "CA UMC")
      .is("revoked_at", null)
      .single();

    if (caError || !caRow) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "CA certificate tidak ditemukan. Silakan hubungi administrator untuk setup CA.",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    console.log("✅ CA certificate found");

    // Decrypt CA private key
    let caPrivateKeyPem: string;
    try {
      const masterKeyBytes = base64Decode(MASTER_KEY_B64);
      const masterKey = await crypto.subtle.importKey("raw", masterKeyBytes, "AES-GCM", false, [
        "decrypt",
      ]);

      const encryptedData = base64Decode(caRow.enc_private_key);
      const iv = base64Decode(caRow.enc_private_key_iv);

      const decryptedBuffer = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv },
        masterKey,
        encryptedData
      );

      caPrivateKeyPem = new TextDecoder().decode(decryptedBuffer);
      console.log("✅ CA private key decrypted");
    } catch (decryptErr) {
      console.error("❌ Failed to decrypt CA private key:", decryptErr);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Gagal decrypt CA private key",
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    // Generate RSA keypair for user certificate
    const pki = forge.pki;
    const keypair = pki.rsa.generateKeyPair({ bits: 2048, e: 0x10001 });

    // Parse CA certificate and private key
    const caCert = pki.certificateFromPem(caRow.certificate_pem);
    const caPrivateKey = pki.privateKeyFromPem(caPrivateKeyPem);

    // Create user certificate (to be signed by CA)
    const cert = pki.createCertificate();
    cert.publicKey = keypair.publicKey;
    cert.serialNumber = "01" + Math.floor(Math.random() * 1e16).toString(16);

    // Set validity period
    cert.validity.notBefore = new Date();
    cert.validity.notAfter = new Date(expiresAt);

    // Set subject = User (Issued To)
    const attrs = [
      { name: "commonName", value: userName },
      { name: "countryName", value: "ID" },
      { name: "stateOrProvinceName", value: "Jawa Barat" },
      { name: "localityName", value: "Cirebon" },
      { name: "organizationName", value: "Universitas Muhammadiyah Cirebon" },
      { shortName: "OU", value: "Digital Signature" },
      { name: "emailAddress", value: userEmail },
    ];
    cert.setSubject(attrs);

    // Set issuer = CA (Issued By)
    // Extract CA subject attributes for issuer
    const issuerAttrs = caCert.subject.attributes;
    cert.setIssuer(issuerAttrs);
    
    // Add extensions for PDF digital signatures
    // Adobe Reader expects: digitalSignature + nonRepudiation in keyUsage
    // and emailProtection in extKeyUsage (for document signing)
    cert.setExtensions([
      {
        name: "basicConstraints",
        cA: false, // Not a CA certificate
        critical: true,
      },
      {
        name: "keyUsage",
        digitalSignature: true,  // Required for PDF signatures
        nonRepudiation: true,    // Required for PDF signatures (content commitment)
        keyEncipherment: false,
        dataEncipherment: false,
        critical: true, // Mark as critical
      },
      {
        name: "extKeyUsage",
        serverAuth: false,
        clientAuth: false,
        codeSigning: false,
        emailProtection: true,  // S/MIME and document signing
        timeStamping: false,
        // Note: emailProtection covers document signing use case
      },
      {
        name: "subjectKeyIdentifier",
        // Automatically calculated from public key
      },
      {
        name: "authorityKeyIdentifier",
        // Links to CA certificate's subjectKeyIdentifier
        // This helps PDF readers validate the chain
      },
      {
        name: "subjectAltName",
        altNames: [{
          type: 1, // email
          value: userEmail,
        }],
      },
    ]);
    
    // Sign the certificate with CA private key
    cert.sign(caPrivateKey, forge.md.sha256.create());
    
    // Convert to PEM format
    const privateKeyPem = pki.privateKeyToPem(keypair.privateKey);
    const certificatePem = pki.certificateToPem(cert);
    
    // Extract certificate subject and issuer strings
    const certSubject = cert.subject.attributes
      .map((attr: any) => `${attr.shortName || attr.name}=${attr.value}`)
      .join(", ");
    const certIssuer = cert.issuer.attributes
      .map((attr: any) => `${attr.shortName || attr.name}=${attr.value}`)
      .join(", ");
    
    console.log("📜 Certificate Details:");
    console.log(`   Issued To: ${certSubject}`);
    console.log(`   Issued By: ${certIssuer}`);
    
    // Encrypt private key PEM with AES-GCM
    const privateKeyBytes = new TextEncoder().encode(privateKeyPem);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = new Uint8Array(
      await crypto.subtle.encrypt({ name: "AES-GCM", iv }, masterKey, privateKeyBytes),
    );

    const passphrase_hash = await pbkdf2Hash(passphrase);

    // Generate kid (date + short random suffix)
    const datePart = new Date().toISOString().slice(0, 10);
    const suffix = crypto.randomUUID().slice(0, 8);
    const kid = `v1-${datePart}-${suffix}`;

    // Insert row with X.509 certificate signed by CA
    const { error: insertErr } = await supabase.from("signing_keys").insert({
      kid,
      kty: "RSA",
      crv: null,
      created_by: createdBy,
      assigned_to: assignedTo,
      private_key_pem: null, // We don't store plain private key
      certificate_pem: certificatePem,
      certificate_subject: certSubject,
      certificate_issuer: certIssuer,
      enc_private_key: base64Encode(ciphertext), // Encrypted private key PEM
      enc_private_key_iv: base64Encode(iv), // IV (b64)
      enc_algo: "AES-GCM",
      passphrase_hash,
      ca_id: caRow.id, // Link to the CA that signed this certificate
      expires_at: new Date(expiresAt).toISOString(),
      revoked_at: null,
      deleted_at: null,
    });

    if (insertErr) {
      return new Response(
        JSON.stringify({
          success: false,
          error: String(insertErr.message || insertErr),
          data: null,
        }),
        {
          status: 500,
          headers,
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        error: null,
        data: {
          kid,
          expiresAt,
        },
      }),
      {
        status: 200,
        headers,
      },
    );
  } catch (err) {
    console.error("create-certificate error:", err);
    return new Response(
      JSON.stringify({ success: false, error: String(err?.message ?? err), data: null }),
      { status: 500, headers },
    );
  }
});
