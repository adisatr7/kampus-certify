-- Fix search_path untuk functions yang baru dibuat
CREATE OR REPLACE FUNCTION generate_ijazah_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_year text;
  last_number int;
  new_number text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  SELECT COALESCE(
    MAX(
      CAST(
        SUBSTRING(nomor_seri FROM 'IZH-(\d+)-UMC-' || current_year) 
        AS INTEGER
      )
    ), 0
  ) INTO last_number
  FROM public.ijazah
  WHERE nomor_seri LIKE 'IZH-%UMC-' || current_year;
  
  new_number := LPAD((last_number + 1)::text, 4, '0');
  
  RETURN 'IZH-' || new_number || '-UMC-' || current_year;
END;
$$;

CREATE OR REPLACE FUNCTION set_ijazah_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nomor_seri IS NULL OR NEW.nomor_seri = '' THEN
    NEW.nomor_seri := generate_ijazah_serial();
  END IF;
  RETURN NEW;
END;
$$;

-- Enable RLS untuk document_signatures
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;

-- Policy untuk document_signatures: users can view signatures on their documents
CREATE POLICY "Users can view signatures on their documents"
ON public.document_signatures
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.documents
    WHERE documents.id = document_signatures.document_id
    AND documents.user_id = auth.uid()
  )
);

-- Policy: Admins can view all signatures
CREATE POLICY "Admins can view all signatures"
ON public.document_signatures
FOR SELECT
USING (is_admin(auth.uid()));

-- Policy: System can insert signatures (melalui edge functions)
CREATE POLICY "System can insert signatures"
ON public.document_signatures
FOR INSERT
WITH CHECK (true);