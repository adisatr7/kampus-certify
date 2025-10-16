CREATE TABLE public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL REFERENCES public.signing_keys(kid),
  payload_hash TEXT NOT NULL,        -- SHA-256 of canonical document JSON or file
  signature TEXT NOT NULL,           -- base64url signature of payload_hash
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signer_user_id UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_document_signatures_docid
  ON public.document_signatures (document_id);
