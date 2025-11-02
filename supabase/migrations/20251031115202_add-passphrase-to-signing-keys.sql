-- ===============================================================
-- 🔐 Signing Keys Ownership, Revocation & Encrypted Private Key
-- ===============================================================

-- ===============================================================
-- ✅ Summary:
--  • signing_keys.created_by → admin who issued the key
--  • signing_keys.assigned_to → dosen who owns/uses the key
--  • enc_private_key / enc_private_key_iv → AES-GCM ciphertext+IV
--  • passphrase_hash → user-entered secret (bcrypt) checked on sign
--  • revoked_at / deleted_at / expires_at → key lifecycle
--  • revoke trigger → marks related documents as revoked
-- ===============================================================

-- 0) Remove legacy "single active" machinery
DROP TRIGGER IF EXISTS trg_signing_keys_single_active ON public.signing_keys;
DROP TRIGGER IF EXISTS trg_revoke_documents_on_key_deactivation ON public.signing_keys;
DROP INDEX  IF EXISTS ux_signing_keys_one_active;

-- 1) Extend signing_keys for admin/dosen ownership, passphrase, and soft-deletion
ALTER TABLE public.signing_keys
  ADD COLUMN IF NOT EXISTS created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_to UUID NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS passphrase_hash TEXT NULL,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL,

  -- 🔑 Encrypted private key at rest (AES-GCM)
  ADD COLUMN IF NOT EXISTS enc_private_key    TEXT NULL,  -- base64(ciphertext)
  ADD COLUMN IF NOT EXISTS enc_private_key_iv TEXT NULL,  -- base64(12-byte IV)
  ADD COLUMN IF NOT EXISTS enc_algo           TEXT NULL DEFAULT 'AES-GCM';

-- Pairing constraint: both enc_* present together (or both NULL)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'signing_keys_enc_private_pair_chk'
  ) THEN
    ALTER TABLE public.signing_keys
      ADD CONSTRAINT signing_keys_enc_private_pair_chk
      CHECK (
        (enc_private_key IS NULL AND enc_private_key_iv IS NULL)
        OR
        (enc_private_key IS NOT NULL AND enc_private_key_iv IS NOT NULL)
      );
  END IF;
END $$;

-- Helpful indexes for lookups
CREATE INDEX IF NOT EXISTS idx_signing_keys_assigned_to ON public.signing_keys (assigned_to);
CREATE INDEX IF NOT EXISTS idx_signing_keys_created_by ON public.signing_keys (created_by);
CREATE INDEX IF NOT EXISTS idx_signing_keys_revoked_at ON public.signing_keys (revoked_at);
CREATE INDEX IF NOT EXISTS idx_signing_keys_expires_at ON public.signing_keys (expires_at);
CREATE INDEX IF NOT EXISTS idx_signing_keys_created_at ON public.signing_keys (created_at);


-- Public key can be unique (optional but nice)
CREATE UNIQUE INDEX IF NOT EXISTS ux_signing_keys_x_unique
  ON public.signing_keys (x) WHERE x IS NOT NULL;

-- 1b) after backfilling created_by / assigned_to / passphrase_hash, you may enforce:
-- ALTER TABLE public.signing_keys ALTER COLUMN assigned_to SET NOT NULL;
-- ALTER TABLE public.signing_keys ALTER COLUMN passphrase_hash SET NOT NULL;
-- (keep created_by nullable for audit flexibility)

-- 2) Documents now reference signing_keys (not legacy certificates)
ALTER TABLE public.documents
  DROP CONSTRAINT IF EXISTS documents_certificate_id_fkey,
  DROP COLUMN IF EXISTS certificate_id,
  DROP COLUMN IF EXISTS qr_code_url CASCADE,
  ADD COLUMN IF NOT EXISTS signing_key_id TEXT NULL REFERENCES public.signing_keys (kid);

CREATE INDEX IF NOT EXISTS idx_documents_signing_key_id ON public.documents (signing_key_id);

-- 3) Revocation cascade: when a key’s revoked_at changes (NULL → value),
--    mark all documents signed with that key as revoked.
CREATE OR REPLACE FUNCTION public.revoke_docs_when_key_revoked_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    UPDATE public.documents doc
    SET status = 'revoked'
    WHERE doc.signing_key_id = NEW.kid
      OR EXISTS (
        SELECT 1 FROM public.document_signatures ds
        WHERE ds.document_id = doc.id AND ds.key_id = NEW.kid
      );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_docs_when_key_revoked_at ON public.signing_keys;

CREATE TRIGGER trg_revoke_docs_when_key_revoked_at
AFTER UPDATE OF revoked_at
ON public.signing_keys
FOR EACH ROW
EXECUTE FUNCTION public.revoke_docs_when_key_revoked_at();
