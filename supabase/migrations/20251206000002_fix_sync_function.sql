-- Drop and recreate the sync function with correct implementation
DROP FUNCTION IF EXISTS public.sync_user_id_by_email(TEXT, UUID);

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
DECLARE
    v_old_id UUID;
    v_user_record RECORD;
    v_temp_email TEXT;
    v_existing_user RECORD;
BEGIN
    -- Verify the caller's email matches the email they're trying to update
    IF p_email != (SELECT au.email FROM auth.users au WHERE au.id = auth.uid()) THEN
        RAISE EXCEPTION 'Email mismatch: cannot sync ID for different email';
    END IF;

    -- Check if user with new ID already exists (idempotency check)
    SELECT * INTO v_existing_user FROM public.users u WHERE u.id = p_new_id;
    IF v_existing_user IS NOT NULL THEN
        -- User with new ID already exists, just return it
        RETURN QUERY SELECT u.id, u.email, u.name, u.role FROM public.users u WHERE u.id = p_new_id;
        RETURN;
    END IF;

    -- Get the old user ID and full record by email
    SELECT * INTO v_user_record FROM public.users u WHERE u.email = p_email;
    
    IF v_user_record IS NULL THEN
        RAISE EXCEPTION 'User not found with email: %', p_email;
    END IF;

    v_old_id := v_user_record.id;

    -- If IDs are the same, no need to update
    IF v_old_id = p_new_id THEN
        RETURN QUERY SELECT u.id, u.email, u.name, u.role FROM public.users u WHERE u.id = v_old_id;
        RETURN;
    END IF;

    -- Strategy: Temporarily change email to avoid unique constraint, create new record, update references, delete old
    
    -- 1. Temporarily change the old user's email to avoid unique constraint
    v_temp_email := p_email || '_temp_' || v_old_id::text;
    UPDATE public.users u SET email = v_temp_email WHERE u.id = v_old_id;
    
    -- 2. Insert new user record with new ID and original email
    INSERT INTO public.users (id, email, name, role, nip, jabatan, created_at, updated_at)
    VALUES (
        p_new_id,
        p_email,  -- Use original email
        v_user_record.name,
        v_user_record.role,
        v_user_record.nip,
        v_user_record.jabatan,
        v_user_record.created_at,
        v_user_record.updated_at
    );

    -- 3. Update all foreign key references to point to new ID
    -- Only update tables that have user_id or similar columns
    UPDATE public.documents d SET user_id = p_new_id WHERE d.user_id = v_old_id;
    UPDATE public.signing_keys sk SET assigned_to = p_new_id WHERE sk.assigned_to = v_old_id;
    UPDATE public.signing_keys sk2 SET created_by = p_new_id WHERE sk2.created_by = v_old_id;
    UPDATE public.audit_trail at SET user_id = p_new_id WHERE at.user_id = v_old_id;

    -- 4. Delete the old user record (with temporary email)
    DELETE FROM public.users u WHERE u.id = v_old_id;

    -- 5. Return the new user record
    RETURN QUERY SELECT u.id, u.email, u.name, u.role FROM public.users u WHERE u.id = p_new_id;
END;
$$;
