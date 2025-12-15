-- Fix ijazah workflow to support dekan assignment from form selection

-- Update workflow assignment function to handle dekan_id in metadata
CREATE OR REPLACE FUNCTION fix_ijazah_dekan_assignments()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For ijazah documents in dekan_pending stage, assign to dekan_id from metadata if available
  UPDATE public.documents d
  SET user_id = (d.metadata->>'dekan_id')::uuid
  WHERE d.document_type = 'ijazah'
    AND d.metadata->>'workflow_stage' = 'dekan_pending'
    AND d.metadata->>'dekan_id' IS NOT NULL
    AND d.user_id != (d.metadata->>'dekan_id')::uuid;

  RAISE NOTICE 'Ijazah dekan assignments fixed based on metadata dekan_id';
END;
$$;

-- Run the fix function
SELECT fix_ijazah_dekan_assignments();

-- Update the workflow assignment trigger to handle dekan_id
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
      IF NEW.metadata->>'workflow_stage' = 'dekan_pending' AND NEW.metadata->>'dekan_id' IS NOT NULL THEN
        NEW.user_id := (NEW.metadata->>'dekan_id')::uuid;
      ELSIF NEW.metadata->>'workflow_stage' = 'rektor_pending' AND NEW.metadata->>'rektor_id' IS NOT NULL THEN
        NEW.user_id := (NEW.metadata->>'rektor_id')::uuid;
      END IF;
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Also check on INSERT for proper initial assignment
CREATE OR REPLACE FUNCTION trigger_fix_document_initial_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- For sertifikat workflow - assign to signer1 initially
  IF NEW.document_type = 'sertifikat' THEN
    IF NEW.metadata->>'workflow_stage' = 'pending_signer1' AND NEW.metadata->>'signer1_id' IS NOT NULL THEN
      NEW.user_id := (NEW.metadata->>'signer1_id')::uuid;
    END IF;
  END IF;
  
  -- For ijazah workflow - assign to dekan initially
  IF NEW.document_type = 'ijazah' THEN
    IF NEW.metadata->>'workflow_stage' = 'dekan_pending' AND NEW.metadata->>'dekan_id' IS NOT NULL THEN
      NEW.user_id := (NEW.metadata->>'dekan_id')::uuid;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for initial assignment on INSERT
DROP TRIGGER IF EXISTS trigger_initial_assignment ON public.documents;
CREATE TRIGGER trigger_initial_assignment
  BEFORE INSERT ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION trigger_fix_document_initial_assignment();