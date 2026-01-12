-- Ensure predikat column exists in ijazah table
-- This is a safety migration to ensure the column exists

DO $$ 
BEGIN
    -- Check if column exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'ijazah' 
        AND column_name = 'predikat'
    ) THEN
        ALTER TABLE public.ijazah ADD COLUMN predikat text;
    END IF;
END $$;

-- Refresh schema cache by doing a dummy operation
COMMENT ON COLUMN public.ijazah.predikat IS 'Predikat kelulusan mahasiswa';
