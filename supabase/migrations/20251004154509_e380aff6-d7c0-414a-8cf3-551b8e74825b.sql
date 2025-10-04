-- Fix Critical Security Issues: Remove public access to sensitive data

-- 1. Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Anyone can view certificates for verification" ON public.certificates;
DROP POLICY IF EXISTS "Anyone can view documents for verification" ON public.documents;
DROP POLICY IF EXISTS "Admins can view all certificate data" ON public.certificates;
DROP POLICY IF EXISTS "Users can view their own certificate (safe fields only)" ON public.certificates;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Users can view own documents" ON public.documents;

-- 2. Create safe verification view for certificates (only public info)
CREATE OR REPLACE VIEW public.certificate_verification AS
SELECT 
  id,
  serial_number,
  status,
  issued_at,
  expires_at,
  public_key
FROM public.certificates
WHERE status IN ('active', 'revoked');

-- Grant read access to the view
GRANT SELECT ON public.certificate_verification TO anon, authenticated;

-- 3. Create safe verification function for documents
CREATE OR REPLACE FUNCTION public.verify_document(doc_id uuid)
RETURNS TABLE(
  id uuid,
  title text,
  status document_status,
  signed_at timestamp with time zone,
  qr_code_url text,
  signed_document_url text,
  certificate_serial text
) 
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    d.id,
    d.title,
    d.status,
    d.signed_at,
    d.qr_code_url,
    d.signed_document_url,
    c.serial_number as certificate_serial
  FROM public.documents d
  LEFT JOIN public.certificates c ON d.certificate_id = c.id
  WHERE d.id = doc_id 
    AND d.status = 'signed';
$$;

-- Grant execute permission to everyone for verification
GRANT EXECUTE ON FUNCTION public.verify_document(uuid) TO anon, authenticated;

-- 4. Recreate SAFE policies for certificates
CREATE POLICY "Admins can view all certificate data"
  ON public.certificates
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users view own certificate safe fields"
  ON public.certificates
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep existing policies for certificate management
-- (INSERT, UPDATE policies remain unchanged)

-- 5. Recreate SAFE policies for documents  
CREATE POLICY "Admins view all documents"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Users view own documents only"
  ON public.documents
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Keep existing policies for document management
-- (INSERT, UPDATE policies remain unchanged)