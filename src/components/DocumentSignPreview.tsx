import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument, Sertifikat } from "@/types";
import { Ijazah } from "@/types/Ijazah";
import IjazahRenderer from "./IjazahRenderer";
import { SertifikatTemplate } from "./SertifikatTemplate";

interface DocumentSignPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument;
}

export default function DocumentSignPreview({
  isOpen,
  onClose,
  document,
}: DocumentSignPreviewProps) {
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dekanInfo, setDekanInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );
  const [rektorInfo, setRektorInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!document.id) return;

      setLoading(true);
      setError(null);
      setIjazahData(null);
      setSertifikatData(null);

      // Determine document type from title
      const docType = document.title?.toLowerCase() || "";

      if (docType.includes("ijazah")) {
        // Fetch ijazah data
        const { data, error: fetchError } = await supabase
          .from("ijazah")
          .select("*")
          .eq("document_id", document.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching ijazah data:", fetchError);
          setError("Gagal memuat data ijazah");
          setLoading(false);
          return;
        }

        if (!data) {
          console.warn("No ijazah data found for document:", document.id);
          setError("Data ijazah tidak ditemukan");
          setLoading(false);
          return;
        }

        setIjazahData(data as any);

        // Fetch signer info for ijazah - prioritize ijazah table data
        const metadata = document.metadata || {};
        const dekanId = data.dekan_id || metadata.dekan_id;
        const rektorId = data.rektor_id || metadata.rektor_id;

        // Fetch dekan info
        if (dekanId) {
          const { data: dekanData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", dekanId)
            .maybeSingle();

          if (dekanData) {
            setDekanInfo({ name: dekanData.name, nip: dekanData.nip });
          }
        }

        // Fetch rektor info
        if (rektorId) {
          const { data: rektorData } = await supabase
            .from("users")
            .select("name, nip")
            .eq("id", rektorId)
            .maybeSingle();

          if (rektorData) {
            setRektorInfo({ name: rektorData.name, nip: rektorData.nip });
          }
        }
      } else if (docType.includes("sertifikat")) {
        // Fetch sertifikat data
        const { data, error: fetchError } = await supabase
          .from("sertifikat")
          .select("*")
          .eq("document_id", document.id)
          .maybeSingle();

        if (fetchError) {
          console.error("Error fetching sertifikat data:", fetchError);
          setError("Gagal memuat data sertifikat");
          setLoading(false);
          return;
        }

        if (!data) {
          console.warn("No sertifikat data found for document:", document.id);
          setError("Data sertifikat tidak ditemukan");
          setLoading(false);
          return;
        }

        setSertifikatData(data as Sertifikat);
      } else {
        setError("Tipe dokumen tidak dikenali");
      }

      setLoading(false);
    };

    if (isOpen) {
      fetchDocumentData();
    } else {
      setIjazahData(null);
      setSertifikatData(null);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, document.id, document.title]);

  const isIjazah = ijazahData !== null;
  const isSertifikat = sertifikatData !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className={`${
          isSertifikat ? "max-w-7xl" : "max-w-5xl"
        } max-h-[90vh] overflow-y-auto`}
      >
        <DialogHeader>
          <DialogTitle>Preview - {document.title}</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4 rounded-lg">
          {loading ? (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Memuat data...</p>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-destructive">{error}</p>
            </div>
          ) : isIjazah && ijazahData ? (
            <div className="transform scale-75 origin-top">
              <IjazahRenderer
                nim={ijazahData.nim}
                nomorIjazah={document.serial || ijazahData.nomor_seri}
                namaMahasiswa={ijazahData.nama_mahasiswa}
                programStudi="Teknik Informatika"
                fakultas={ijazahData.nama_fakultas}
                gelar={ijazahData.gelar}
                tanggalTerbit={ijazahData.tanggal_terbit}
                dekanName={dekanInfo.name}
                dekanNip={dekanInfo.nip}
                rektorName={rektorInfo.name}
                rektorNip={rektorInfo.nip}
                templateId={ijazahData.template_id}
                renderMode="preview"
              />
            </div>
          ) : isSertifikat && sertifikatData ? (
            <SertifikatTemplate sertifikat={sertifikatData} showQR={false} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
