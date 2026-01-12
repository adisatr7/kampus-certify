-- Migration: Add signature metadata columns for PDF signature support
-- Purpose: Store additional signature information needed for Adobe Reader compatibility

-- Add new columns to document_signatures table
ALTER TABLE public.document_signatures
ADD COLUMN IF NOT EXISTS signature_format TEXT DEFAULT 'BASE64' CHECK (signature_format IN ('BASE64', 'HEX', 'DER')),
ADD COLUMN IF NOT EXISTS signer_name TEXT,
ADD COLUMN IF NOT EXISTS reason TEXT DEFAULT 'Document Authentication',
ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Indonesia',
ADD COLUMN IF NOT EXISTS contact_info TEXT;

-- Create index for faster signature lookup by document
CREATE INDEX IF NOT EXISTS idx_document_signatures_document_id_signed_at 
ON public.document_signatures(document_id, signed_at DESC);

-- Add comment to explain the columns
COMMENT ON COLUMN public.document_signatures.signature_format IS 'Format of the signature bytes: BASE64 (default), HEX, or DER';
COMMENT ON COLUMN public.document_signatures.signer_name IS 'Name of the signer for PDF signature appearance';
COMMENT ON COLUMN public.document_signatures.reason IS 'Reason for signing (shown in Adobe Reader)';
COMMENT ON COLUMN public.document_signatures.location IS 'Location of signing (shown in Adobe Reader)';
COMMENT ON COLUMN public.document_signatures.contact_info IS 'Contact information of signer';
