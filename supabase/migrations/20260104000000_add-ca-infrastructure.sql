-- ===============================================================
-- 🏢 CA (Certificate Authority) Infrastructure for UMC
-- ===============================================================
-- This migration creates:
-- 1. ca_certificates table to store CA certificates
-- 2. ca_id column in signing_keys to link user certs to their issuing CA

-- ===============================================================
-- 1) Create CA certificates table
-- ===============================================================
CREATE TABLE IF NOT EXISTS public.ca_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- CA Identity
  name TEXT NOT NULL UNIQUE,  -- e.g., "UMC Root CA"
  certificate_pem TEXT NOT NULL,  -- X.509 certificate in PEM format
  certificate_subject TEXT NOT NULL,  -- Parsed subject DN
  
  -- Encrypted private key (AES-GCM)
  enc_private_key TEXT NOT NULL,  -- base64(ciphertext)
  enc_private_key_iv TEXT NOT NULL,  -- base64(12-byte IV)
  enc_algo TEXT NOT NULL DEFAULT 'AES-GCM',
  
  -- Lifecycle
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ NULL,
  deleted_at TIMESTAMPTZ NULL,
  
  -- Metadata
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  notes TEXT NULL
);

-- Enable RLS if needed
ALTER TABLE public.ca_certificates ENABLE ROW LEVEL SECURITY;

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_ca_certificates_name ON public.ca_certificates (name);
CREATE INDEX IF NOT EXISTS idx_ca_certificates_revoked_at ON public.ca_certificates (revoked_at);
CREATE INDEX IF NOT EXISTS idx_ca_certificates_expires_at ON public.ca_certificates (expires_at);

-- ===============================================================
-- 2) Update signing_keys to link to CA
-- ===============================================================
-- Add ca_id column to signing_keys
ALTER TABLE public.signing_keys
  ADD COLUMN IF NOT EXISTS ca_id UUID NULL REFERENCES public.ca_certificates(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_signing_keys_ca_id ON public.signing_keys (ca_id);

-- ===============================================================
-- 3) Update certificate_issuer to match the CA CN
-- ===============================================================
-- When a signing key is created with a CA, certificate_issuer should be set to CA's CN
-- This is handled in the application logic, not in the database
