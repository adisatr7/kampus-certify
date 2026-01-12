-- Fix audit_trail INSERT policy to allow authenticated users to insert
-- Drop existing insert policy
DROP POLICY IF EXISTS "System can insert audit trails" ON public.audit_trail;

-- Create new policy that allows any authenticated user to insert audit entries
CREATE POLICY "Authenticated users can insert audit trails" ON public.audit_trail
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- Also allow the RPC function to work properly by ensuring SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.create_audit_entry(
    p_user_id UUID,
    p_action TEXT,
    p_description TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.audit_trail (user_id, action, description)
    VALUES (p_user_id, p_action, p_description);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_audit_entry(UUID, TEXT, TEXT) TO authenticated;
