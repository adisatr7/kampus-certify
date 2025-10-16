BEGIN;

ALTER TABLE IF EXISTS public.users
DROP COLUMN IF EXISTS google_id;

-- Drop dependent view before removing columns that the view references
-- (Views depending on these columns cause 'dependent objects' errors)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'certificate_verification') THEN
    DROP VIEW public.certificate_verification;
  END IF;
END;
$$;

ALTER TABLE public.certificates
  DROP COLUMN IF EXISTS public_key,
  DROP COLUMN IF EXISTS certificate_code;

ALTER TABLE public.documents
  DROP COLUMN IF EXISTS signed,
  DROP COLUMN IF EXISTS signed_at,
  DROP COLUMN IF EXISTS signed_document_url;

ALTER TABLE public.audit_trail
  DROP COLUMN IF EXISTS timestamp;

-- Recreate a lean verification view that no longer references `public_key`.
-- We recreate it here after dropping the column to preserve verification API.
CREATE OR REPLACE VIEW public.certificate_verification AS
SELECT
  id,
  serial_number,
  status,
  issued_at,
  expires_at
FROM public.certificates
WHERE status IN ('active', 'revoked');

GRANT SELECT ON public.certificate_verification TO anon, authenticated;

COMMIT;