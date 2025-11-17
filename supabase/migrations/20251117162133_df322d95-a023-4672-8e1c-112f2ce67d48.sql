-- Drop columns yang tidak dipakai dari tabel ijazah
ALTER TABLE public.ijazah 
  DROP COLUMN IF EXISTS predikat,
  DROP COLUMN IF EXISTS program_studi,
  DROP COLUMN IF EXISTS tanggal_kelulusan;

-- Tambah kolom baru untuk ijazah sesuai template
ALTER TABLE public.ijazah
  ADD COLUMN IF NOT EXISTS nama_fakultas text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS signing_key_id text,
  ADD COLUMN IF NOT EXISTS is_validated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_url text;

-- Ganti tabel nidn menjadi tabel nip
ALTER TABLE public.users
  RENAME COLUMN nidn TO nip;

-- Function untuk generate nomor seri ijazah otomatis
CREATE OR REPLACE FUNCTION generate_ijazah_serial()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  current_year text;
  last_number int;
  new_number text;
BEGIN
  current_year := EXTRACT(YEAR FROM CURRENT_DATE)::text;
  
  -- Get last number for current year
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
  
  -- Increment and format
  new_number := LPAD((last_number + 1)::text, 4, '0');
  
  RETURN 'IZH-' || new_number || '-UMC-' || current_year;
END;
$$;

-- Trigger untuk auto-generate nomor_seri saat insert
CREATE OR REPLACE FUNCTION set_ijazah_serial()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.nomor_seri IS NULL OR NEW.nomor_seri = '' THEN
    NEW.nomor_seri := generate_ijazah_serial();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_set_ijazah_serial ON public.ijazah;
CREATE TRIGGER trigger_set_ijazah_serial
  BEFORE INSERT ON public.ijazah
  FOR EACH ROW
  EXECUTE FUNCTION set_ijazah_serial();

-- Update document_signatures untuk tracking role signer
ALTER TABLE public.document_signatures
  ADD COLUMN IF NOT EXISTS signer_role text;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_ijazah_nomor_seri ON public.ijazah(nomor_seri);
CREATE INDEX IF NOT EXISTS idx_document_signatures_signer_role ON public.document_signatures(signer_role);

-- Comment untuk dokumentasi
COMMENT ON COLUMN public.ijazah.nomor_seri IS 'Format: IZH-0001-UMC-2025 (auto-generated)';
COMMENT ON COLUMN public.document_signatures.signer_role IS 'Role of signer: dekan or rektor';