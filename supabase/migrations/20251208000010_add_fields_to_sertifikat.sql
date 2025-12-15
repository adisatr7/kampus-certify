-- Add missing fields to sertifikat table

ALTER TABLE public.sertifikat
ADD COLUMN IF NOT EXISTS nim text,
ADD COLUMN IF NOT EXISTS jenis_sertifikat text,
ADD COLUMN IF NOT EXISTS penyelenggara text;

-- Set default values for existing records
UPDATE public.sertifikat
SET jenis_sertifikat = 'Sertifikat Pelatihan'
WHERE jenis_sertifikat IS NULL;
