-- Add debug functions to help troubleshoot RLS issues

-- Function to check if user can access a specific document
CREATE OR REPLACE FUNCTION public.can_access_document(doc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_access boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = doc_id
    AND (
      d.user_id = auth.uid() OR
      d.metadata->>'signer1_id' = auth.uid()::text OR
      d.metadata->>'signer2_id' = auth.uid()::text OR
      d.metadata->>'rektor_id' = auth.uid()::text OR
      d.metadata->>'created_by_id' = auth.uid()::text OR
      public.is_admin(auth.uid())
    )
  ) INTO has_access;
  
  RETURN has_access;
END;
$$;

-- Function to get document access info for debugging
CREATE OR REPLACE FUNCTION public.get_document_access_info(doc_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  doc_record record;
BEGIN
  SELECT 
    d.id,
    d.user_id,
    d.metadata,
    auth.uid() as current_user_id,
    public.is_admin(auth.uid()) as is_admin,
    (d.user_id = auth.uid()) as is_owner,
    (d.metadata->>'signer1_id' = auth.uid()::text) as is_signer1,
    (d.metadata->>'signer2_id' = auth.uid()::text) as is_signer2,
    (d.metadata->>'rektor_id' = auth.uid()::text) as is_rektor,
    (d.metadata->>'created_by_id' = auth.uid()::text) as is_creator
  INTO doc_record
  FROM public.documents d
  WHERE d.id = doc_id;
  
  result := to_jsonb(doc_record);
  
  RETURN result;
END;
$$;
