-- Debug: Check if user has admin role in user_roles table
-- This migration adds a temporary policy to help debug the issue

-- First, let's check if the user has admin role in users table
-- and sync it to user_roles if needed

-- Add policy that checks users table directly as fallback
DROP POLICY IF EXISTS "Admins can insert templates" ON public.document_templates;

CREATE POLICY "Admins can insert templates"
  ON public.document_templates
  FOR INSERT
  WITH CHECK (
    -- Check if user is admin via user_roles table
    public.is_admin(auth.uid()) OR
    -- Fallback: Check if user is admin in users table
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Also update the view policy
DROP POLICY IF EXISTS "Admins can view all templates" ON public.document_templates;

CREATE POLICY "Admins can view all templates"
  ON public.document_templates
  FOR SELECT
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Update other policies too
DROP POLICY IF EXISTS "Admins can update templates" ON public.document_templates;

CREATE POLICY "Admins can update templates"
  ON public.document_templates
  FOR UPDATE
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  )
  WITH CHECK (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can delete templates" ON public.document_templates;

CREATE POLICY "Admins can delete templates"
  ON public.document_templates
  FOR DELETE
  USING (
    public.is_admin(auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
