-- Allow public access to view documents for verification purposes
CREATE POLICY "Anyone can view documents for verification"
ON public.documents
FOR SELECT
TO public
USING (true);