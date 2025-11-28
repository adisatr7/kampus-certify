-- Update ijazah RLS policy to allow dekan and use user_roles table
DROP POLICY IF EXISTS "Admins and Rektor can insert ijazah" ON public.ijazah;

CREATE POLICY "Admins, Rektor, and Dekan can insert ijazah"
ON public.ijazah
FOR INSERT
TO authenticated
WITH CHECK (
  is_admin(auth.uid()) 
  OR has_role(auth.uid(), 'rektor'::user_role)
  OR has_role(auth.uid(), 'dekan'::user_role)
);