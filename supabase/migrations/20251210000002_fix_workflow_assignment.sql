-- Fix workflow assignment issues
-- Ensure documents are properly assigned to the right users based on workflow stage

-- Function to reassign documents based on workflow stage
CREATE OR REPLACE FUNCTION fix_document_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For sertifikat documents in pending_signer1 stage, assign to signer1
  UPDATE public.documents d
  SET user_id = (d.metadata->>'signer1_id')::uuid
  WHERE d.document_type = 'sertifikat'
    AND d.metadata->>'workflow_stage' = 'pending_signer1'
    AND d.metadata->>'signer1_id' IS NOT NULL
    AND d.user_id != (d.metadata->>'signer1_id')::uuid;

  -- For sertifikat documents in pending_signer2 stage, assign to signer2
  UPDATE public.documents d
  SET user_id = (d.metadata->>'signer2_id')::uuid
  WHERE d.document_type = 'sertifikat'
    AND d.metadata->>'workflow_stage' = 'pending_signer2'
    AND d.metadata->>'signer2_id' IS NOT NULL
    AND d.user_id != (d.metadata->>'signer2_id')::uuid;

  -- For ijazah documents in rektor_pending stage, assign to rektor
  UPDATE public.documents d
  SET user_id = (d.metadata->>'rektor_id')::uuid
  WHERE d.document_type = 'ijazah'
    AND d.metadata->>'workflow_stage' = 'rektor_pending'
    AND d.metadata->>'rektor_id' IS NOT NULL
    AND d.user_id != (d.metadata->>'rektor_id')::uuid;

  RAISE NOTICE 'Document assignments fixed based on workflow stages';
END;
$$;

-- Run the fix function
SELECT fix_document_assignments();

-- Create trigger to ensure proper assignment on workflow stage changes
CREATE OR REPLACE FUNCTION trigger_fix_document_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if workflow_stage changed
  IF OLD.metadata->>'workflow_stage' IS DISTINCT FROM NEW.metadata->>'workflow_stage' THEN
    
    -- For sertifikat workflow
    IF NEW.document_type = 'sertifikat' THEN
      IF NEW.metadata->>'workflow_stage' = 'pending_signer1' AND NEW.metadata->>'signer1_id' IS NOT NULL THEN
        NEW.user_id := (NEW.metadata->>'signer1_id')::uuid;
      ELSIF NEW.metadata->>'workflow_stage' = 'pending_signer2' AND NEW.metadata->>'signer2_id' IS NOT NULL THEN
        NEW.user_id := (NEW.metadata->>'signer2_id')::uuid;
      END IF;
    END IF;
    
    -- For ijazah workflow
    IF NEW.document_type = 'ijazah' THEN
      IF NEW.metadata->>'workflow_stage' = 'rektor_pending' AND NEW.metadata->>'rektor_id' IS NOT NULL THEN
        NEW.user_id := (NEW.metadata->>'rektor_id')::uuid;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for workflow assignment
DROP TRIGGER IF EXISTS trigger_workflow_assignment ON public.documents;
CREATE TRIGGER trigger_workflow_assignment
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fix_document_assignment();