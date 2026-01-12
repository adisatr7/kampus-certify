-- Fix audit_trail SELECT policy to allow all authenticated users to view all audit entries
-- This allows admins and other users to see complete audit trail

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can view their own audit trail" ON public.audit_trail;
DROP POLICY IF EXISTS "Admins can view all audit trails" ON public.audit_trail;

-- Create new policy that allows any authenticated user to view all audit trails
CREATE POLICY "Authenticated users can view all audit trails" ON public.audit_trail
    FOR SELECT
    TO authenticated
    USING (true);

-- Keep the insert policy as is - authenticated users can insert
-- If you need to restrict INSERT further, add that separately
