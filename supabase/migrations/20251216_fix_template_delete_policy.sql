-- Fix template delete policy to allow admin, rektor, and dekan to delete templates
-- This migration ensures the delete policy works correctly

-- Drop existing delete policy
DROP POLICY IF EXISTS "Admins can delete templates" ON public.document_templates;

-- Create new delete policy with multiple checks
CREATE POLICY "Authorized users can delete templates"
  ON public.document_templates
  FOR DELETE
  USING (
    -- Check via is_admin function
    public.is_admin(auth.uid()) OR
    -- Fallback: Check if user is admin in users table
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    ) OR
    -- Also allow rektor and dekan to delete templates
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('rektor', 'dekan')
    ) OR
    -- Check via user_roles table
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    )
  );

-- Also ensure the select, insert, update policies are correct
DROP POLICY IF EXISTS "Admins can view all templates" ON public.document_templates;
DROP POLICY IF EXISTS "Admins can insert templates" ON public.document_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON public.document_templates;

-- Allow all authenticated users to view active templates (for selection in forms)
CREATE POLICY "Authenticated users can view active templates"
  ON public.document_templates
  FOR SELECT
  USING (
    is_active = true OR
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    )
  );

-- Only admin, rektor, dekan can insert templates
CREATE POLICY "Authorized users can insert templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    )
  );

-- Only admin, rektor, dekan can update templates
CREATE POLICY "Authorized users can update templates"
  ON public.document_templates
  FOR UPDATE
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    ) OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin', 'rektor', 'dekan')
    )
  );
