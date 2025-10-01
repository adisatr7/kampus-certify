-- Create storage bucket for signed documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'signed-documents',
  'signed-documents',
  true,
  10485760,
  ARRAY['application/pdf', 'image/png', 'image/jpeg']
);

-- RLS Policy: Anyone can view signed documents (for public verification)
CREATE POLICY "Public can view signed documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'signed-documents');

-- RLS Policy: Authenticated users can upload their own signed documents
CREATE POLICY "Users can upload their own signed documents"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'signed-documents' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can update their own signed documents
CREATE POLICY "Users can update their own signed documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'signed-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS Policy: Users can delete their own signed documents
CREATE POLICY "Users can delete their own signed documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'signed-documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Add signed_document_url column to documents table if not exists
ALTER TABLE documents ADD COLUMN IF NOT EXISTS signed_document_url text;