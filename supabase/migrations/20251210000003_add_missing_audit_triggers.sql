-- Add audit trail triggers for missing operations

-- Function to create audit entry for document operations
CREATE OR REPLACE FUNCTION audit_document_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  action_type text;
  description_text text;
  user_id_val uuid;
BEGIN
  -- Determine action type and user
  IF TG_OP = 'INSERT' THEN
    action_type := CASE 
      WHEN NEW.document_type = 'ijazah' THEN 'CREATE_IJAZAH'
      WHEN NEW.document_type = 'sertifikat' THEN 'CREATE_SERTIFIKAT'
      ELSE 'CREATE_DOCUMENT'
    END;
    description_text := 'Membuat dokumen: ' || NEW.title;
    user_id_val := COALESCE((NEW.metadata->>'created_by_id')::uuid, NEW.user_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- Only log status changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'signed' THEN
        action_type := CASE 
          WHEN NEW.document_type = 'ijazah' THEN 'SIGN_IJAZAH'
          WHEN NEW.document_type = 'sertifikat' THEN 'SIGN_SERTIFIKAT'
          ELSE 'SIGN_DOCUMENT'
        END;
        description_text := 'Menandatangani dokumen: ' || NEW.title;
        user_id_val := NEW.user_id;
      ELSIF NEW.status = 'revoked' THEN
        action_type := 'REVOKE_DOCUMENT';
        description_text := 'Mencabut dokumen: ' || NEW.title;
        user_id_val := NEW.user_id;
      ELSE
        RETURN NEW; -- Don't log other status changes
      END IF;
    ELSE
      RETURN NEW; -- No status change, don't log
    END IF;
  ELSE
    RETURN NEW; -- DELETE operations not logged for now
  END IF;

  -- Insert audit entry
  BEGIN
    INSERT INTO public.audit_trail (user_id, action, description, created_at)
    VALUES (user_id_val, action_type, description_text, NOW());
  EXCEPTION WHEN OTHERS THEN
    -- Log error but don't fail the main operation
    RAISE WARNING 'Failed to create audit entry: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create audit triggers for documents table
DROP TRIGGER IF EXISTS trigger_audit_document_operations ON public.documents;
CREATE TRIGGER trigger_audit_document_operations
  AFTER INSERT OR UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION audit_document_operations();

-- Function to create audit entry for verification operations
CREATE OR REPLACE FUNCTION audit_verification_operations()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log successful verifications (when document is found)
  IF TG_OP = 'INSERT' AND NEW.action = 'VERIFY_DOCUMENT' THEN
    -- This is already handled by the application, so we don't need to duplicate
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Add indexes for better audit trail performance
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_id ON public.audit_trail(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_trail_action ON public.audit_trail(action);
CREATE INDEX IF NOT EXISTS idx_audit_trail_created_at ON public.audit_trail(created_at DESC);