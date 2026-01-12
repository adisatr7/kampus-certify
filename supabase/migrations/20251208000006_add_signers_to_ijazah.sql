-- Add dekan_id and rektor_id columns to ijazah table to store signers

ALTER TABLE public.ijazah
ADD COLUMN IF NOT EXISTS dekan_id uuid REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS rektor_id uuid REFERENCES public.users(id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_ijazah_dekan_id ON public.ijazah(dekan_id);
CREATE INDEX IF NOT EXISTS idx_ijazah_rektor_id ON public.ijazah(rektor_id);

-- Backfill dekan_id from documents.user_id (creator is dekan)
UPDATE public.ijazah i
SET dekan_id = d.user_id
FROM public.documents d
WHERE i.document_id = d.id
  AND i.dekan_id IS NULL;

-- Backfill rektor_id from documents.metadata->>'rektor_id'
-- Only update if the rektor_id exists in users table
UPDATE public.ijazah i
SET rektor_id = (d.metadata->>'rektor_id')::uuid
FROM public.documents d
WHERE i.document_id = d.id
  AND i.rektor_id IS NULL
  AND d.metadata->>'rektor_id' IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = (d.metadata->>'rektor_id')::uuid
  );
