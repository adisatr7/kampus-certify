-- Add new columns to ijazah table for verification display
ALTER TABLE public.ijazah 
ADD COLUMN IF NOT EXISTS program_studi TEXT,
ADD COLUMN IF NOT EXISTS angkatan TEXT,
ADD COLUMN IF NOT EXISTS predikat TEXT,
ADD COLUMN IF NOT EXISTS tanggal_lulus DATE;

-- Add comments for documentation
COMMENT ON COLUMN public.ijazah.program_studi IS 'Program studi mahasiswa';
COMMENT ON COLUMN public.ijazah.angkatan IS 'Angkatan/periode belajar mahasiswa';
COMMENT ON COLUMN public.ijazah.predikat IS 'Predikat kelulusan (Cum Laude, Sangat Memuaskan, dll)';
COMMENT ON COLUMN public.ijazah.tanggal_lulus IS 'Tanggal lulus mahasiswa';
