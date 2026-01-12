-- Create RPC function to update document status (bypasses RLS for admin users)

CREATE OR REPLACE FUNCTION public.update_document_status(
  doc_id uuid,
  new_status public.document_status
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_rows int;
  result json;
BEGIN
  -- Check if user is admin
  IF NOT public.is_admin(auth.uid()) THEN
    -- Also check users.role directly as fallback
    IF NOT EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'admin'
    ) THEN
      RAISE EXCEPTION 'Only admins can update document status';
    END IF;
  END IF;

  -- Update the document
  UPDATE public.documents
  SET status = new_status,
      updated_at = now()
  WHERE id = doc_id;

  -- Get affected rows
  affected_rows := FOUND::int;

  -- Return result
  result := json_build_object(
    'success', affected_rows > 0,
    'rows_affected', affected_rows,
    'message', CASE 
      WHEN affected_rows > 0 THEN 'Document updated successfully'
      ELSE 'No document found with that ID'
    END
  );

  RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.update_document_status(uuid, public.document_status) TO authenticated;
