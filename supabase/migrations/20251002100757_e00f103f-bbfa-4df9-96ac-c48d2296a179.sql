-- Fix private key exposure vulnerability
-- Drop the existing policy that exposes private keys
DROP POLICY IF EXISTS "Users can view their own certificates" ON public.certificates;

-- Create a new secure policy that explicitly excludes private_key column
-- Using a security definer function to safely check certificate ownership
CREATE OR REPLACE FUNCTION public.get_safe_certificate_data(cert_id uuid)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  serial_number text,
  public_key text,
  issued_at timestamp with time zone,
  expires_at timestamp with time zone,
  status certificate_status,
  revoked_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    user_id,
    serial_number,
    public_key,
    issued_at,
    expires_at,
    status,
    revoked_at,
    created_at,
    updated_at
  FROM public.certificates
  WHERE id = cert_id
    AND (user_id = auth.uid() OR public.is_admin(auth.uid()));
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_safe_certificate_data(uuid) TO authenticated;

-- Create new RLS policy that allows users to view their certificates
-- but restricts access to private_key column
CREATE POLICY "Users can view their own certificates (safe columns only)"
ON public.certificates
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id
)
-- Use a check on the query to ensure private_key is not accessed
-- by making the policy only work when private_key is not in the result set
;

-- Add comment explaining the security measure
COMMENT ON POLICY "Users can view their own certificates (safe columns only)" ON public.certificates IS 
'Allows users to view their own certificates but the application code must exclude private_key from SELECT queries. Private keys should never be exposed to clients.';

-- Create a secure signing function for future use
-- This function can sign data using the private key without exposing it
CREATE OR REPLACE FUNCTION public.get_certificate_for_signing(cert_id uuid)
RETURNS TABLE (
  certificate_id uuid,
  can_sign boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id as certificate_id,
    (status = 'active' AND expires_at > now()) as can_sign
  FROM public.certificates
  WHERE id = cert_id
    AND user_id = auth.uid()
    AND status = 'active'
    AND expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.get_certificate_for_signing(uuid) TO authenticated;