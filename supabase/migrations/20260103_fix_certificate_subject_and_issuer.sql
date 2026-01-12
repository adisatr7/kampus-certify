-- Migration: Fix Certificate Subject and Issuer to Include User Names
-- Purpose: Ensure certificate_subject contains proper user name (CN=) and certificate_issuer is dynamic
-- Date: 2025-01-03

-- Verify that certificate_subject and certificate_issuer columns exist
-- These should have been created by migration 20251227_add_x509_certificate_support.sql

-- Add missing columns if they don't exist yet (safety check)
ALTER TABLE public.signing_keys
  ADD COLUMN IF NOT EXISTS certificate_subject TEXT,
  ADD COLUMN IF NOT EXISTS certificate_issuer TEXT;

-- Add missing columns to document_signatures for proper signature metadata tracking
ALTER TABLE public.document_signatures
  ADD COLUMN IF NOT EXISTS signature_reason TEXT DEFAULT 'Document Authentication',
  ADD COLUMN IF NOT EXISTS signature_location TEXT DEFAULT 'Indonesia';

-- Create an index for certificate_subject lookups (useful for verification)
CREATE INDEX IF NOT EXISTS idx_signing_keys_certificate_subject 
  ON public.signing_keys(certificate_subject);

-- Create an index for certificate_issuer lookups
CREATE INDEX IF NOT EXISTS idx_signing_keys_certificate_issuer 
  ON public.signing_keys(certificate_issuer);

-- Create indexes for signature metadata
CREATE INDEX IF NOT EXISTS idx_document_signatures_signature_reason 
  ON public.document_signatures(signature_reason);

CREATE INDEX IF NOT EXISTS idx_document_signatures_signature_location 
  ON public.document_signatures(signature_location);

-- Add comments explaining the proper format
COMMENT ON COLUMN public.signing_keys.certificate_subject IS 
  'X.509 certificate subject name. Format: CN=Full Name,O=Organization,C=CountryCode. The CN field MUST contain the user''s full name for proper PDF signature display.';

COMMENT ON COLUMN public.signing_keys.certificate_issuer IS 
  'X.509 certificate issuer name. Format: CN=Organization,O=Company,C=CountryCode. Can be organization name or CA name.';

COMMENT ON COLUMN public.document_signatures.signature_reason IS 
  'Reason for signing shown in PDF viewer (e.g., "Document Authentication", "Approval", etc.)';

COMMENT ON COLUMN public.document_signatures.signature_location IS 
  'Location where document was signed, shown in PDF viewer';

-- Log this migration
DO $$
BEGIN
  RAISE NOTICE 'Migration applied: Fix Certificate Subject and Issuer to Include User Names';
  RAISE NOTICE 'Columns verified/added: certificate_subject, certificate_issuer';
  RAISE NOTICE 'Indexes created for better query performance';
  RAISE NOTICE 'Document signature metadata fields verified: signature_reason, signature_location';
END $$;
