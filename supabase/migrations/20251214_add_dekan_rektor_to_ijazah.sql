-- Add dekan_id and rektor_id columns to ijazah table
ALTER TABLE public.ijazah
ADD COLUMN IF NOT EXISTS dekan_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS rektor_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_ijazah_dekan_id ON public.ijazah(dekan_id);
CREATE INDEX IF NOT EXISTS idx_ijazah_rektor_id ON public.ijazah(rektor_id);
