-- Allow users to sync their ID based on email during login
-- This is needed when a user is pre-registered with email but logs in for the first time

-- Create a security definer function to sync user ID by email
-- This bypasses RLS and allows the sync to happen
CREATE OR REPLACE FUNCTION public.sync_user_id_by_email(
    p_email TEXT,
    p_new_id UUID
)
RETURNS TABLE(
    id UUID,
    email TEXT,
    name TEXT,
    role public.user_role
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the caller's email matches the email they're trying to update
    IF p_email != (SELECT au.email FROM auth.users au WHERE au.id = auth.uid()) THEN
        RAISE EXCEPTION 'Email mismatch: cannot sync ID for different email';
    END IF;

    -- Update the user ID and return the updated row
    RETURN QUERY
    UPDATE public.users u
    SET id = p_new_id
    WHERE u.email = p_email
    RETURNING u.id, u.email, u.name, u.role;
END;
$$;

-- Also allow users to view their profile by email (not just by ID)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;

CREATE POLICY "Users can view their own profile" ON public.users
    FOR SELECT 
    USING (
        auth.uid() = id OR 
        email = (SELECT au.email FROM auth.users au WHERE au.id = auth.uid())
    );
