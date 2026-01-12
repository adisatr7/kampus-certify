-- Simple fix: Allow admins to update documents based on users.role column

-- Drop the old policy that might be blocking
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;

-- Create a simple policy that checks users.role directly
CREATE POLICY "Admins can manage all documents" ON public.documents
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);

-- Drop the old SELECT policy
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;

-- Create simple SELECT policy for admins
CREATE POLICY "Admins can view all documents" ON public.documents
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE users.id = auth.uid() 
    AND users.role = 'admin'
  )
);
