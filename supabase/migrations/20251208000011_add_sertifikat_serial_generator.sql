-- Function to generate nomor sertifikat otomatis
CREATE OR REPLACE FUNCTION generate_sertifikat_serial()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_number integer;
  year_part text;
  serial_number text;
BEGIN
  -- Get current year
  year_part := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Get next sequence number for this year
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(nomor_sertifikat FROM '^([0-9]+)') AS integer
    )
  ), 0) + 1
  INTO next_number
  FROM public.sertifikat
  WHERE nomor_sertifikat LIKE '%/' || year_part;
  
  -- Format: 0001/CERT/UMC/2025
  serial_number := LPAD(next_number::text, 4, '0') || '/CERT/UMC/' || year_part;
  
  RETURN serial_number;
END;
$$;

-- Trigger function to set nomor_sertifikat automatically
CREATE OR REPLACE FUNCTION set_sertifikat_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.nomor_sertifikat IS NULL OR NEW.nomor_sertifikat = '' THEN
    NEW.nomor_sertifikat := generate_sertifikat_serial();
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_set_sertifikat_serial ON public.sertifikat;
CREATE TRIGGER trigger_set_sertifikat_serial
  BEFORE INSERT ON public.sertifikat
  FOR EACH ROW
  EXECUTE FUNCTION set_sertifikat_serial();
