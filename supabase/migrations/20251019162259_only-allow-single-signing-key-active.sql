-- Safety net: at most one active row
CREATE UNIQUE INDEX IF NOT EXISTS ux_signing_keys_one_active
  ON public.signing_keys ((active::int))
  WHERE active = TRUE;

-- Trigger function: auto-deactivate others when a key is set active
CREATE OR REPLACE FUNCTION public.ensure_single_active_signing_key()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only act when the new row is set active
  IF NEW.active IS TRUE THEN
    -- Optional: prevent races across concurrent txns
    PERFORM pg_advisory_xact_lock(hashtext('signing_keys_active_lock'));

    -- Deactivate all other keys
    UPDATE public.signing_keys
    SET active = FALSE
    WHERE active = TRUE
      AND kid <> NEW.kid;
  END IF;

  RETURN NEW;
END;
$$;

-- Fire on INSERT and when 'active' changes
DROP TRIGGER IF EXISTS trg_signing_keys_single_active ON public.signing_keys;

CREATE TRIGGER trg_signing_keys_single_active
BEFORE INSERT OR UPDATE OF active
ON public.signing_keys
FOR EACH ROW
EXECUTE FUNCTION public.ensure_single_active_signing_key();
