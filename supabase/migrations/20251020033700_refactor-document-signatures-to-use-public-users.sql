BEGIN;

ALTER TABLE IF EXISTS public.document_signatures
  DROP CONSTRAINT IF EXISTS document_signatures_signer_user_id_fkey;

ALTER TABLE IF EXISTS public.document_signatures
  ADD CONSTRAINT document_signatures_signer_user_id_fkey
  FOREIGN KEY (signer_user_id) REFERENCES public.users (id);

COMMIT;
