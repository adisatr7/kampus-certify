-- Fix RLS policy for document_templates to allow admin insert

-- Drop existing policy
DROP POLICY IF EXISTS "Admins can manage templates" ON public.document_templates;

-- Create separate policies for better control
CREATE POLICY "Admins can view all templates"
  ON public.document_templates
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can insert templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can update templates"
  ON public.document_templates
  FOR UPDATE
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete templates"
  ON public.document_templates
  FOR DELETE
  USING (public.is_admin(auth.uid()));
