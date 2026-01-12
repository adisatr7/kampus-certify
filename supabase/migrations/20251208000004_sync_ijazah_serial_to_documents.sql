-- Sync nomor_seri from ijazah table to serial column in documents table

-- Function to sync serial number from ijazah to documents
CREATE OR REPLACE FUNCTION sync_ijazah_serial_to_documents()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the documents table with the nomor_seri from ijazah
  UPDATE public.documents
  SET serial = NEW.nomor_seri
  WHERE id = NEW.document_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger to sync serial on insert
DROP TRIGGER IF EXISTS trigger_sync_ijazah_serial ON public.ijazah;
CREATE TRIGGER trigger_sync_ijazah_serial
  AFTER INSERT ON public.ijazah
  FOR EACH ROW
  EXECUTE FUNCTION sync_ijazah_serial_to_documents();

-- Create trigger to sync serial on update
DROP TRIGGER IF EXISTS trigger_sync_ijazah_serial_update ON public.ijazah;
CREATE TRIGGER trigger_sync_ijazah_serial_update
  AFTER UPDATE OF nomor_seri ON public.ijazah
  FOR EACH ROW
  WHEN (OLD.nomor_seri IS DISTINCT FROM NEW.nomor_seri)
  EXECUTE FUNCTION sync_ijazah_serial_to_documents();

-- Backfill existing ijazah serial numbers to documents
UPDATE public.documents d
SET serial = i.nomor_seri
FROM public.ijazah i
WHERE d.id = i.document_id
  AND i.nomor_seri IS NOT NULL
  AND i.nomor_seri != ''
  AND (d.serial IS NULL OR d.serial = '');
