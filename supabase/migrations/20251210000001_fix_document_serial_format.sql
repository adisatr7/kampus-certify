-- Fix document serial number format
-- Ijazah: 0000/IZH/UMC/2025
-- Sertifikat: 0000/CERT/UMC/2025

-- Function to generate random 4-digit number
CREATE OR REPLACE FUNCTION generate_random_4digit()
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN LPAD((RANDOM() * 9999)::int::text, 4, '0');
END;
$$;

-- Function to generate ijazah serial number
CREATE OR REPLACE FUNCTION generate_ijazah_serial()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  random_digits text;
  current_year text;
  serial_number text;
BEGIN
  random_digits := generate_random_4digit();
  current_year := EXTRACT(YEAR FROM NOW())::text;
  serial_number := random_digits || '/IZH/UMC/' || current_year;
  
  -- Ensure uniqueness by checking if it already exists
  WHILE EXISTS (SELECT 1 FROM public.ijazah WHERE nomor_seri = serial_number) LOOP
    random_digits := generate_random_4digit();
    serial_number := random_digits || '/IZH/UMC/' || current_year;
  END LOOP;
  
  RETURN serial_number;
END;
$$;

-- Function to generate sertifikat serial number
CREATE OR REPLACE FUNCTION generate_sertifikat_serial()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  random_digits text;
  current_year text;
  serial_number text;
BEGIN
  random_digits := generate_random_4digit();
  current_year := EXTRACT(YEAR FROM NOW())::text;
  serial_number := random_digits || '/CERT/UMC/' || current_year;
  
  -- Ensure uniqueness by checking if it already exists
  WHILE EXISTS (SELECT 1 FROM public.sertifikat WHERE nomor_sertifikat = serial_number) LOOP
    random_digits := generate_random_4digit();
    serial_number := random_digits || '/CERT/UMC/' || current_year;
  END LOOP;
  
  RETURN serial_number;
END;
$$;

-- Update trigger function for ijazah to auto-generate serial
CREATE OR REPLACE FUNCTION auto_generate_ijazah_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if nomor_seri is empty or null
  IF NEW.nomor_seri IS NULL OR NEW.nomor_seri = '' THEN
    NEW.nomor_seri := generate_ijazah_serial();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Update trigger function for sertifikat to auto-generate serial
CREATE OR REPLACE FUNCTION auto_generate_sertifikat_serial()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only generate if nomor_sertifikat is empty or null
  IF NEW.nomor_sertifikat IS NULL OR NEW.nomor_sertifikat = '' THEN
    NEW.nomor_sertifikat := generate_sertifikat_serial();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create triggers for auto-generation
DROP TRIGGER IF EXISTS trigger_auto_generate_ijazah_serial ON public.ijazah;
CREATE TRIGGER trigger_auto_generate_ijazah_serial
  BEFORE INSERT ON public.ijazah
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_ijazah_serial();

DROP TRIGGER IF EXISTS trigger_auto_generate_sertifikat_serial ON public.sertifikat;
CREATE TRIGGER trigger_auto_generate_sertifikat_serial
  BEFORE INSERT ON public.sertifikat
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_sertifikat_serial();

-- Update existing records with proper format (only if they don't have proper format)
UPDATE public.ijazah 
SET nomor_seri = generate_ijazah_serial()
WHERE nomor_seri IS NULL 
   OR nomor_seri = '' 
   OR nomor_seri NOT LIKE '%/IZH/UMC/%';

UPDATE public.sertifikat 
SET nomor_sertifikat = generate_sertifikat_serial()
WHERE nomor_sertifikat IS NULL 
   OR nomor_sertifikat = '' 
   OR nomor_sertifikat NOT LIKE '%/CERT/UMC/%';