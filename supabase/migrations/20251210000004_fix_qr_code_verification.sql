-- Fix QR code verification URLs and ensure they point to the correct verification portal

-- Function to generate proper verification URL for QR codes
CREATE OR REPLACE FUNCTION generate_verification_url(document_serial text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  -- Return the verification portal URL with the document serial
  RETURN 'https://ca-umc.vercel.app/verify?id=' || document_serial;
END;
$$;

-- Function to update QR code data for existing documents
CREATE OR REPLACE FUNCTION update_qr_codes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_record RECORD;
  ijazah_record RECORD;
  sertifikat_record RECORD;
BEGIN
  -- Update QR codes for ijazah documents
  FOR doc_record IN 
    SELECT d.id, d.serial, i.nomor_seri
    FROM public.documents d
    JOIN public.ijazah i ON d.id = i.document_id
    WHERE d.document_type = 'ijazah'
      AND d.status = 'signed'
      AND (i.nomor_seri IS NOT NULL AND i.nomor_seri != '')
  LOOP
    -- Update the QR code data to point to verification URL
    UPDATE public.documents
    SET metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object('qr_verification_url', generate_verification_url(doc_record.nomor_seri))
    WHERE id = doc_record.id;
  END LOOP;

  -- Update QR codes for sertifikat documents
  FOR doc_record IN 
    SELECT d.id, d.serial, s.nomor_sertifikat
    FROM public.documents d
    JOIN public.sertifikat s ON d.id = s.document_id
    WHERE d.document_type = 'sertifikat'
      AND d.status = 'signed'
      AND (s.nomor_sertifikat IS NOT NULL AND s.nomor_sertifikat != '')
  LOOP
    -- Update the QR code data to point to verification URL
    UPDATE public.documents
    SET metadata = COALESCE(metadata, '{}'::jsonb) || 
        jsonb_build_object('qr_verification_url', generate_verification_url(doc_record.nomor_sertifikat))
    WHERE id = doc_record.id;
  END LOOP;

  RAISE NOTICE 'QR code verification URLs updated for all signed documents';
END;
$$;

-- Run the QR code update
SELECT update_qr_codes();

-- Create trigger to automatically set QR verification URL when document is signed
CREATE OR REPLACE FUNCTION set_qr_verification_url()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_serial text;
BEGIN
  -- Only process when status changes to signed
  IF OLD.status != 'signed' AND NEW.status = 'signed' THEN
    
    -- Get the document serial number
    IF NEW.document_type = 'ijazah' THEN
      SELECT nomor_seri INTO doc_serial
      FROM public.ijazah
      WHERE document_id = NEW.id;
    ELSIF NEW.document_type = 'sertifikat' THEN
      SELECT nomor_sertifikat INTO doc_serial
      FROM public.sertifikat
      WHERE document_id = NEW.id;
    END IF;
    
    -- Update metadata with QR verification URL if we have a serial
    IF doc_serial IS NOT NULL AND doc_serial != '' THEN
      NEW.metadata := COALESCE(NEW.metadata, '{}'::jsonb) || 
                     jsonb_build_object('qr_verification_url', generate_verification_url(doc_serial));
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for QR verification URL
DROP TRIGGER IF EXISTS trigger_set_qr_verification_url ON public.documents;
CREATE TRIGGER trigger_set_qr_verification_url
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION set_qr_verification_url();