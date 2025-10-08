-- Add NIDN column to users table
ALTER TABLE public.users ADD COLUMN nidn text;

COMMENT ON COLUMN public.users.nidn IS 'Nomor Induk Dosen Nasional';

-- Add certificate_code column to certificates table for authentication
ALTER TABLE public.certificates ADD COLUMN certificate_code text;

COMMENT ON COLUMN public.certificates.certificate_code IS 'Kode rahasia untuk autentikasi sertifikat saat menandatangani dokumen';