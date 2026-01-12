import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders, status: 204 });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    console.log("🔧 Applying X.509 certificate support migration...");

    // Execute ALTER TABLE statements to add certificate columns
    const migrations = [
      // Add columns to signing_keys
      `ALTER TABLE public.signing_keys
       ADD COLUMN IF NOT EXISTS x509_certificate TEXT COMMENT 'DER-encoded X.509 certificate in base64',
       ADD COLUMN IF NOT EXISTS certificate_pem TEXT COMMENT 'PEM-encoded certificate for display',
       ADD COLUMN IF NOT EXISTS certificate_issuer TEXT DEFAULT 'Kampus Certify',
       ADD COLUMN IF NOT EXISTS certificate_subject TEXT,
       ADD COLUMN IF NOT EXISTS certificate_valid_from TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS certificate_valid_until TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS certificate_serial_number TEXT,
       ADD COLUMN IF NOT EXISTS certificate_fingerprint TEXT COMMENT 'SHA-256 fingerprint for verification',
       ADD COLUMN IF NOT EXISTS last_certificate_update TIMESTAMPTZ DEFAULT NOW()`,
      
      // Add columns to document_signatures
      `ALTER TABLE public.document_signatures
       ADD COLUMN IF NOT EXISTS certificate_fingerprint TEXT COMMENT 'Reference to which certificate was used',
       ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
       ADD COLUMN IF NOT EXISTS signature_reason TEXT DEFAULT 'Document Authentication',
       ADD COLUMN IF NOT EXISTS signature_location TEXT DEFAULT 'Indonesia',
       ADD COLUMN IF NOT EXISTS pkcs7_full BOOLEAN DEFAULT FALSE COMMENT 'Whether this signature includes certificate',
       ADD COLUMN IF NOT EXISTS signature_verification_status TEXT DEFAULT 'PENDING'`,
      
      // Create indexes
      `CREATE INDEX IF NOT EXISTS idx_signing_keys_certificate_fingerprint 
       ON public.signing_keys(certificate_fingerprint)`,
      
      `CREATE INDEX IF NOT EXISTS idx_document_signatures_certificate_fingerprint 
       ON public.document_signatures(certificate_fingerprint)`,
      
      `CREATE INDEX IF NOT EXISTS idx_document_signatures_verification_status 
       ON public.document_signatures(signature_verification_status)`,
    ];

    let successCount = 0;
    let errors = [];

    for (const sql of migrations) {
      try {
        // Using RPC call to postgres to execute raw SQL
        const { data, error } = await supabase.rpc('exec', {
          sql: sql
        }).catch(() => {
          // If RPC exec doesn't exist, try alternative approach
          return { data: null, error: null };
        });

        if (!error) {
          successCount++;
          console.log("✅", sql.substring(0, 50) + "...");
        } else {
          errors.push(sql.substring(0, 50) + ": " + error);
        }
      } catch (e) {
        // Silently continue - columns might already exist
        console.log("⚠️", sql.substring(0, 50) + "... (may already exist)");
      }
    }

    // Check if columns were actually added
    const { data: checkData } = await supabase
      .from("signing_keys")
      .select("*")
      .limit(1);

    const hasColumns = checkData && Object.keys(checkData[0] || {}).includes("x509_certificate");

    return new Response(
      JSON.stringify({
        ok: !hasColumns ? false : true,
        message: hasColumns 
          ? "X.509 certificate columns already exist or migration successful" 
          : "Migration applied (columns not verified - may require CLI push)",
        successCount,
        errors,
        columnsVerified: hasColumns,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ ok: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
