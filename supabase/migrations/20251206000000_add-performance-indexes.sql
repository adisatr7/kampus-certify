-- Add index for repair script query
-- This index helps efficiently find documents that are signed but missing file_url
CREATE INDEX IF NOT EXISTS idx_documents_status_file_url 
ON public.documents(status, file_url) 
WHERE status = 'signed' AND file_url IS NULL;

-- Add index for document lookup by serial
-- This index improves performance for verification lookups
CREATE INDEX IF NOT EXISTS idx_documents_serial 
ON public.documents(serial) 
WHERE serial IS NOT NULL;
