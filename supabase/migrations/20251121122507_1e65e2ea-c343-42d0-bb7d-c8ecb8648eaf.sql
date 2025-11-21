-- Fix 1: Enable RLS on document_signatures table and update policies
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view signatures on their documents" ON public.document_signatures;
DROP POLICY IF EXISTS "Admins can view all signatures" ON public.document_signatures;
DROP POLICY IF EXISTS "System can insert signatures" ON public.document_signatures;

-- Create new comprehensive policies
CREATE POLICY "Users can view signatures on their documents"
ON public.document_signatures
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_signatures.document_id
    AND documents.user_id = auth.uid()
  )
);

CREATE POLICY "Admins can view all document signatures"
ON public.document_signatures
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Block all client-side writes (signatures created via edge functions only)
CREATE POLICY "Only service role can insert signatures"
ON public.document_signatures
FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "No updates to signatures"
ON public.document_signatures
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "No deletion of signatures"
ON public.document_signatures
FOR DELETE
TO authenticated
USING (false);

-- Fix 2: Create separate user_roles table to prevent privilege escalation
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role user_role NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy: Admins can view all roles
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Policy: Block all client-side writes to user_roles
CREATE POLICY "No client-side role modifications"
ON public.user_roles
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- Create new security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  );
$$;

-- Migrate existing role data from users table to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.users
ON CONFLICT (user_id, role) DO NOTHING;

-- Update is_admin function to use new user_roles table
CREATE OR REPLACE FUNCTION public.is_admin(user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(user_uuid, 'admin');
$$;

-- Update get_user_role function to use new user_roles table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid)
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = user_uuid LIMIT 1;
$$;