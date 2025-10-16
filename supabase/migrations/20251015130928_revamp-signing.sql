-- =========================================================
-- 0) USERS ↔ CERTIFICATES RELATION: ONE-TO-MANY
--    A USER CAN HAVE MANY CERTIFICATES; CERT BELONGS TO ONE USER.
--    REMOVE THE BACK-REF FROM users.
-- =========================================================
ALTER TABLE public.users
  DROP COLUMN IF EXISTS certificate_id;

-- =========================================================
-- 1) CERTIFICATES: LIFECYCLE & PAYLOAD (NO PRIVATE KEYS HERE)
--    If you already have these columns, IF NOT EXISTS will keep it idempotent.
-- =========================================================
ALTER TABLE public.certificates
  DROP COLUMN IF EXISTS private_key,
  ADD COLUMN IF NOT EXISTS payload JSONB,
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejected_by UUID,
  ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS revoked_by UUID,
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

-- FK TO YOUR USERS TABLE (adjust to auth.users if that's where your users live)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_approved_by_fkey'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_approved_by_fkey
      FOREIGN KEY (approved_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_rejected_by_fkey'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_rejected_by_fkey
      FOREIGN KEY (rejected_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'certificates_revoked_by_fkey'
  ) THEN
    ALTER TABLE public.certificates
      ADD CONSTRAINT certificates_revoked_by_fkey
      FOREIGN KEY (revoked_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- LIFECYCLE SANITY CHECKS
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS certificates_expires_after_issue;

ALTER TABLE public.certificates
  ADD CONSTRAINT certificates_expires_after_issue
  CHECK (expires_at > COALESCE(issued_at, created_at));

-- HANDY INDEXES
CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates (status);
CREATE INDEX IF NOT EXISTS idx_certificates_approved_by ON public.certificates (approved_by);
CREATE INDEX IF NOT EXISTS idx_certificates_revoked_by ON public.certificates (revoked_by);

-- =========================================================
-- 2) DEVICE AUTHORIZATION
--    EACH DEVICE HAS ITS OWN LOCAL PRIVATE KEY.
--    WE STORE ONLY THE PUBLIC KEY (JWK) + CHALLENGE NONCES.
-- =========================================================

-- a) REGISTERED DEVICES
CREATE TABLE IF NOT EXISTS public.user_devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  public_key_jwk JSONB NOT NULL,    -- STORE ONLY PUBLIC KEY MATERIAL (Ed25519/RSA JWK)
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.user_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_devices_self_all ON public.user_devices;
CREATE POLICY user_devices_self_all
  ON public.user_devices
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON public.user_devices (user_id);
CREATE INDEX IF NOT EXISTS idx_user_devices_revoked ON public.user_devices (revoked);

-- b) ONE-TIME NONCES (YOUR ORIGINAL DRAFT, KEPT AND POLISHED)
CREATE TABLE IF NOT EXISTS public.device_nonces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES public.user_devices(id) ON DELETE CASCADE,
  nonce TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.device_nonces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user can access own nonces" ON public.device_nonces;
CREATE POLICY "user can access own nonces"
  ON public.device_nonces
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_device_nonces_user ON public.device_nonces (user_id);
CREATE INDEX IF NOT EXISTS idx_device_nonces_device ON public.device_nonces (device_id);
CREATE INDEX IF NOT EXISTS idx_device_nonces_expires_at ON public.device_nonces (expires_at);
CREATE INDEX IF NOT EXISTS idx_device_nonces_unused ON public.device_nonces (used) WHERE used = FALSE;

-- =========================================================
-- 3) SERVER SIGNING: PUBLIC KEYS REGISTRY + SIGNATURE SNAPSHOT
--    SERVER PRIVATE KEY LIVES IN FUNCTION SECRETS.
--    PUBLIC KEYS LIVE HERE (ROTATION-FRIENDLY).
-- =========================================================

-- a) PUBLIC KEYS (JWKS-LIKE)
CREATE TABLE IF NOT EXISTS public.signing_keys (
  kid TEXT PRIMARY KEY,          -- e.g. 'v1-2025-10-15'
  kty TEXT NOT NULL,             -- 'OKP' (Ed25519) OR 'RSA'
  crv TEXT,                      -- 'Ed25519' IF OKP
  x   TEXT,                      -- base64url public key (Ed25519)
  n   TEXT,                      -- RSA modulus (if RSA)
  e   TEXT,                      -- RSA exponent (if RSA)
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.signing_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS signing_keys_read ON public.signing_keys;
CREATE POLICY signing_keys_read
  ON public.signing_keys
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS signing_keys_block_writes ON public.signing_keys;
CREATE POLICY signing_keys_block_writes
  ON public.signing_keys
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

-- b) SIGNATURES OVER CERTIFICATE PAYLOADS (ONE OR MANY OVER TIME)
CREATE TABLE IF NOT EXISTS public.certificate_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  key_id TEXT NOT NULL REFERENCES public.signing_keys(kid),
  payload_hash TEXT NOT NULL,       -- SHA-256 (hex or base64url) of canonical payload
  signature TEXT NOT NULL,          -- base64/base64url signature
  signed_at TIMESTAMPTZ DEFAULT NOW(),
  signer_user_id UUID NULL REFERENCES auth.users(id)
);

ALTER TABLE public.certificate_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certsigs_read ON public.certificate_signatures;
CREATE POLICY certsigs_read
  ON public.certificate_signatures
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS certsigs_block_client_writes ON public.certificate_signatures;
CREATE POLICY certsigs_block_client_writes
  ON public.certificate_signatures
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);

CREATE INDEX IF NOT EXISTS idx_cert_sigs_cert ON public.certificate_signatures (certificate_id);
CREATE INDEX IF NOT EXISTS idx_cert_sigs_key ON public.certificate_signatures (key_id);

-- =========================================================
-- 4) CERTIFICATES RLS: CLIENTS READ-ONLY; WRITES VIA EDGE FUNCTIONS
-- =========================================================
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS certs_read ON public.certificates;
CREATE POLICY certs_read
  ON public.certificates
  FOR SELECT
  TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS certs_block_client_writes ON public.certificates;
CREATE POLICY certs_block_client_writes
  ON public.certificates
  FOR ALL
  TO authenticated
  USING (FALSE)
  WITH CHECK (FALSE);
