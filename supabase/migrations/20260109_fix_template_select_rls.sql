-- Fix: Allow everyone to view active templates (they're public)
-- This fixes the issue where preview couldn't load selected templates

-- Drop restrictive SELECT policy
DROP POLICY IF EXISTS "Admins can view all templates" ON public.document_templates;

-- Create new permissive SELECT policy - everyone can view active templates
CREATE POLICY "Everyone can view active templates"
  ON public.document_templates
  FOR SELECT
  USING (is_active = true);

-- Keep admin-only policies for write operations
-- (INSERT, UPDATE, DELETE policies remain unchanged)
