-- Fix RLS policies for ijazah and sertifikat tables
-- Allow users to view ijazah/sertifikat for documents they have access to

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can view all ijazah" ON public.ijazah;
DROP POLICY IF EXISTS "Admins and Rektor can insert ijazah" ON public.ijazah;
DROP POLICY IF EXISTS "Admins can update ijazah" ON public.ijazah;
DROP POLICY IF EXISTS "Admins can delete ijazah" ON public.ijazah;

DROP POLICY IF EXISTS "Admins can view all sertifikat" ON public.sertifikat;
DROP POLICY IF EXISTS "Authorized users can insert sertifikat" ON public.sertifikat;
DROP POLICY IF EXISTS "Admins can update sertifikat" ON public.sertifikat;
DROP POLICY IF EXISTS "Admins can delete sertifikat" ON public.sertifikat;

-- New RLS Policies for ijazah
-- Allow viewing if user is admin, or if they have access to the related document
CREATE POLICY "Users can view ijazah for accessible documents"
  ON public.ijazah
  FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = ijazah.document_id
      AND (
        d.user_id = auth.uid() OR
        d.metadata->>'signer1_id' = auth.uid()::text OR
        d.metadata->>'signer2_id' = auth.uid()::text OR
        d.metadata->>'rektor_id' = auth.uid()::text OR
        d.metadata->>'created_by_id' = auth.uid()::text
      )
    )
  );

CREATE POLICY "Admins and authorized users can insert ijazah"
  ON public.ijazah
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('rektor', 'dekan'))
  );

CREATE POLICY "Admins can update ijazah"
  ON public.ijazah
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete ijazah"
  ON public.ijazah
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- New RLS Policies for sertifikat
-- Allow viewing if user is admin, or if they have access to the related document
CREATE POLICY "Users can view sertifikat for accessible documents"
  ON public.sertifikat
  FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = sertifikat.document_id
      AND (
        d.user_id = auth.uid() OR
        d.metadata->>'signer1_id' = auth.uid()::text OR
        d.metadata->>'signer2_id' = auth.uid()::text OR
        d.metadata->>'created_by_id' = auth.uid()::text
      )
    )
  );

CREATE POLICY "Authorized users can insert sertifikat"
  ON public.sertifikat
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('rektor', 'dosen', 'dekan'))
  );

CREATE POLICY "Admins can update sertifikat"
  ON public.sertifikat
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sertifikat"
  ON public.sertifikat
  FOR DELETE
  USING (public.is_admin(auth.uid()));
