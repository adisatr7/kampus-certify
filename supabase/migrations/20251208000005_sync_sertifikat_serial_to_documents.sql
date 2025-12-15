-- Sync nomor_sertifikat from sertifikat table to serial column in documents table

-- Function to sync serial number from sertifikat to documents
CREATE OR REPLACE FUNCTION sync_sertifikat_serial_to_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the documents table with the nomor_sertifikat from sertifikat
  UPDATE public.documents
  SET serial = NEW.nomor_sertifikat
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync serial on insert
DROP TRIGGER IF EXISTS trigger_sync_sertifikat_serial ON public.sertifikat;
CREATE TRIGGER trigger_sync_sertifikat_serial
  AFTER INSERT ON public.sertifikat
  FOR EACH ROW
  EXECUTE FUNCTION sync_sertifikat_serial_to_documents();

-- Create trigger to sync serial on update
DROP TRIGGER IF EXISTS trigger_sync_sertifikat_serial_update ON public.sertifikat;
CREATE TRIGGER trigger_sync_sertifikat_serial_update
  AFTER UPDATE OF nomor_sertifikat ON public.sertifikat
  FOR EACH ROW
  WHEN (OLD.nomor_sertifikat IS DISTINCT FROM NEW.nomor_sertifikat)
  EXECUTE FUNCTION sync_sertifikat_serial_to_documents();

-- Backfill existing sertifikat serial numbers to documents
UPDATE public.documents d
SET serial = s.nomor_sertifikat
FROM public.sertifikat s
WHERE d.id = s.document_id
  AND s.nomor_sertifikat IS NOT NULL
  AND s.nomor_sertifikat != ''
  AND (d.serial IS NULL OR d.serial = '');
