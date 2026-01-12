-- Fix admin document update policy to work with users.role column

-- Drop the existing "Admins can manage all documents" policy
DROP POLICY IF EXISTS "Admins can manage all documents" ON public.documents;

-- Create new policy that checks both is_admin() function AND users.role directly
CREATE POLICY "Admins can manage all documents" ON public.documents
FOR ALL USING (
  public.is_admin(auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Also fix the SELECT policy for consistency
DROP POLICY IF EXISTS "Admins can view all documents" ON public.documents;

CREATE POLICY "Admins can view all documents" ON public.documents
FOR SELECT USING (
  public.is_admin(auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);

-- Ensure admins can update the status field specifically
CREATE POLICY "Admins can update document status" ON public.documents
FOR UPDATE USING (
  public.is_admin(auth.uid()) 
  OR 
  EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  )
);
