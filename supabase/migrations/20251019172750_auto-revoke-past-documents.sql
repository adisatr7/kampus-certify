-- Extend trigger to revoke all signed documents when a key is deactivated
CREATE OR REPLACE FUNCTION public.revoke_documents_on_key_deactivation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when a key transitions from active → inactive
  IF OLD.active IS TRUE AND NEW.active IS FALSE THEN
    UPDATE public.documents
    SET status = 'revoked'
    WHERE status = 'signed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revoke_documents_on_key_deactivation ON public.signing_keys;

CREATE TRIGGER trg_revoke_documents_on_key_deactivation
AFTER UPDATE OF active
ON public.signing_keys
FOR EACH ROW
EXECUTE FUNCTION public.revoke_documents_on_key_deactivation();
