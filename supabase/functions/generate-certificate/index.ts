import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, expiryDays = 365 } = await req.json();

    if (!userId) {
      throw new Error('User ID is required');
    }

    console.log(`Generating certificate for user: ${userId}`);

    // Generate unique RSA-2048 key pair
    const keyPair = await crypto.subtle.generateKey(
      {
        name: "RSA-PSS",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true,
      ["sign", "verify"]
    );

    // Export keys
    const publicKeyBuffer = await crypto.subtle.exportKey("spki", keyPair.publicKey);
    const privateKeyBuffer = await crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // Convert to PEM format
    const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(publicKeyBuffer))).match(/.{1,64}/g)?.join('\n')}\n-----END PUBLIC KEY-----`;
    const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...new Uint8Array(privateKeyBuffer))).match(/.{1,64}/g)?.join('\n')}\n-----END PRIVATE KEY-----`;

    // Encrypt private key with AES-256-GCM
    const encryptionKey = await crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const encryptedPrivateKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      encryptionKey,
      encoder.encode(privateKeyPEM)
    );

    // Export encryption key for storage (in production, use a key management service)
    const rawEncryptionKey = await crypto.subtle.exportKey("raw", encryptionKey);
    const encryptionKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(rawEncryptionKey)));
    const ivBase64 = btoa(String.fromCharCode(...iv));
    const encryptedPrivateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(encryptedPrivateKey)));

    // Store encrypted private key with IV and encryption key
    const encryptedData = JSON.stringify({
      key: encryptionKeyBase64,
      iv: ivBase64,
      data: encryptedPrivateKeyBase64
    });

    // Generate unique serial number
    const serialNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
    
    // Generate unique certificate code (6-digit)
    const certificateCode = Math.random().toString().slice(2, 8);

    const issuedAt = new Date();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Insert certificate
    const { data: certificate, error: certError } = await supabaseClient
      .from('certificates')
      .insert({
        user_id: userId,
        serial_number: serialNumber,
        public_key: publicKeyPEM,
        private_key: encryptedData,
        certificate_code: certificateCode,
        issued_at: issuedAt.toISOString(),
        expires_at: expiresAt.toISOString(),
        status: 'active'
      })
      .select()
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      throw certError;
    }

    // Create audit entry
    await supabaseClient
      .from('audit_trail')
      .insert({
        user_id: userId,
        action: 'certificate_generated',
        description: `Certificate ${serialNumber} generated with unique RSA-2048 key pair (private key encrypted with AES-256-GCM)`
      });

    console.log(`Certificate generated successfully: ${serialNumber}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        certificate,
        message: 'Certificate generated with unique RSA key pair and encrypted private key'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-certificate function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});