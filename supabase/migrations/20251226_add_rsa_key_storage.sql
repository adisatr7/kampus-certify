-- Add RSA key storage columns to signing_keys table
-- This allows storing plain RSA keys and their certificates for PDF signing

-- Add columns to signing_keys table
ALTER TABLE public.signing_keys
ADD COLUMN IF NOT EXISTS private_key_pem TEXT,
ADD COLUMN IF NOT EXISTS certificate_pem_text TEXT,
ADD COLUMN IF NOT EXISTS key_type TEXT DEFAULT 'RSA-2048',
ADD COLUMN IF NOT EXISTS hash_algorithm TEXT DEFAULT 'SHA-256',
ADD COLUMN IF NOT EXISTS certificate_format TEXT DEFAULT 'X.509 v3',
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create index for active keys lookup
CREATE INDEX IF NOT EXISTS idx_signing_keys_is_active ON public.signing_keys(is_active);

-- Create index for key_type lookup
CREATE INDEX IF NOT EXISTS idx_signing_keys_key_type ON public.signing_keys(key_type);
