-- Migration: Add X.509 Certificate Storage for Digital Signatures
-- Purpose: Store X.509 certificates with Ed25519 keys for proper PKCS#7 PDF signatures
-- Date: 2025-12-25

-- Add certificate columns to signing_keys table
ALTER TABLE public.signing_keys
ADD COLUMN IF NOT EXISTS x509_certificate TEXT, -- DER-encoded X.509 certificate in base64
ADD COLUMN IF NOT EXISTS certificate_pem TEXT, -- PEM-encoded certificate for display
ADD COLUMN IF NOT EXISTS certificate_issuer TEXT DEFAULT 'Kampus Certify',
ADD COLUMN IF NOT EXISTS certificate_subject TEXT,
ADD COLUMN IF NOT EXISTS certificate_valid_from TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS certificate_valid_until TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS certificate_serial_number TEXT,
ADD COLUMN IF NOT EXISTS certificate_fingerprint TEXT, -- SHA-256 fingerprint for verification
ADD COLUMN IF NOT EXISTS last_certificate_update TIMESTAMPTZ DEFAULT NOW();

-- Add certificate-related columns to document_signatures table
ALTER TABLE public.document_signatures
ADD COLUMN IF NOT EXISTS certificate_fingerprint TEXT, -- Reference to which certificate was used
ADD COLUMN IF NOT EXISTS signature_timestamp TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS signature_reason TEXT DEFAULT 'Document Authentication',
ADD COLUMN IF NOT EXISTS signature_location TEXT DEFAULT 'Indonesia',
ADD COLUMN IF NOT EXISTS pkcs7_full BOOLEAN DEFAULT FALSE, -- Whether this signature includes certificate
ADD COLUMN IF NOT EXISTS signature_verification_status TEXT DEFAULT 'PENDING'; -- PENDING, VALID, INVALID, EXPIRED

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_signing_keys_certificate_fingerprint 
  ON public.signing_keys(certificate_fingerprint);

CREATE INDEX IF NOT EXISTS idx_document_signatures_certificate_fingerprint 
  ON public.document_signatures(certificate_fingerprint);

CREATE INDEX IF NOT EXISTS idx_document_signatures_verification_status 
  ON public.document_signatures(signature_verification_status);

-- Add comments to explain columns
COMMENT ON COLUMN public.signing_keys.x509_certificate IS 'DER-encoded X.509 v3 certificate in base64 format';
COMMENT ON COLUMN public.signing_keys.certificate_pem IS 'PEM-encoded certificate for easy viewing';
COMMENT ON COLUMN public.signing_keys.certificate_issuer IS 'Issuer name from X.509 certificate';
COMMENT ON COLUMN public.signing_keys.certificate_subject IS 'Subject name from X.509 certificate';
COMMENT ON COLUMN public.signing_keys.certificate_valid_from IS 'Certificate notBefore timestamp';
COMMENT ON COLUMN public.signing_keys.certificate_valid_until IS 'Certificate notAfter timestamp';
COMMENT ON COLUMN public.signing_keys.certificate_serial_number IS 'X.509 certificate serial number';
COMMENT ON COLUMN public.signing_keys.certificate_fingerprint IS 'SHA-256 fingerprint of certificate for tracking';

COMMENT ON COLUMN public.document_signatures.certificate_fingerprint IS 'Fingerprint of the X.509 certificate used to sign';
COMMENT ON COLUMN public.document_signatures.signature_timestamp IS 'When the signature was created (signing time)';
COMMENT ON COLUMN public.document_signatures.signature_reason IS 'Reason for signing (shown in PDF reader)';
COMMENT ON COLUMN public.document_signatures.signature_location IS 'Location where signed (shown in PDF reader)';
COMMENT ON COLUMN public.document_signatures.pkcs7_full IS 'Whether signature includes full PKCS#7 with certificate';
COMMENT ON COLUMN public.document_signatures.signature_verification_status IS 'Status of signature verification: PENDING, VALID, INVALID, or EXPIRED';
