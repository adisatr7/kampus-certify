-- Add jenjang column to ijazah table

ALTER TABLE public.ijazah
ADD COLUMN IF NOT EXISTS jenjang text;

-- Set default value for existing records
UPDATE public.ijazah
SET jenjang = 'S1'
WHERE jenjang IS NULL;
