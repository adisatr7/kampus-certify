-- Ultra-simple RLS policy: Only check users.role column directly, no functions

-- Drop ALL existing policies on documents table
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;
DROP POLICY IF EXISTS "Users can insert their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;
DROP POLICY IF EXISTS "Admins can update document status" ON public.documents;

-- Create VERY SIMPLE policies
-- Policy 1: Users can view their own documents
CREATE POLICY "Users can view own documents" ON public.documents
FOR SELECT
USING (auth.uid() = user_id);

-- Policy 2: Admins can view ALL documents - check users table directly
CREATE POLICY "Admins can view all documents" ON public.documents
FOR SELECT
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Policy 3: Users can insert their own documents
CREATE POLICY "Users can insert own documents" ON public.documents
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can update their own documents
CREATE POLICY "Users can update own documents" ON public.documents
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy 5: Admins can UPDATE all documents - check users table directly
CREATE POLICY "Admins can update all documents" ON public.documents
FOR UPDATE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);

-- Policy 6: Admins can DELETE all documents
CREATE POLICY "Admins can delete all documents" ON public.documents
FOR DELETE
USING (
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'admin'
);
