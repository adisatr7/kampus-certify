-- Allow public access to view certificates for verification purposes
CREATE POLICY "Anyone can view certificates for verification"
ON public.certificates
FOR SELECT
TO public
USING (true);