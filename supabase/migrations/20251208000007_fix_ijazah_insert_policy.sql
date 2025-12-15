-- Fix RLS policy for ijazah to allow dosen, dekan, and rektor to insert
-- Also add fallback check to users table

DROP POLICY IF EXISTS "Admins and authorized users can insert ijazah" ON public.ijazah;

CREATE POLICY "Admins and authorized users can insert ijazah"
  ON public.ijazah
  FOR INSERT
  WITH CHECK (
    -- Check via user_roles table
    public.is_admin(auth.uid()) OR 
    public.has_role(auth.uid(), 'rektor') OR
    public.has_role(auth.uid(), 'dekan') OR
    public.has_role(auth.uid(), 'dosen') OR
    -- Fallback: Check via users table
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'rektor', 'dekan', 'dosen')
    )
  );
