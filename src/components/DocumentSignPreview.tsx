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
import SertifikatRenderer from "./SertifikatRenderer";

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
  const [signerInfo, setSignerInfo] = useState<{
    name?: string;
    nip?: string;
    jabatan?: string;
  }>({});
  const [signer2Info, setSigner2Info] = useState<{
    name?: string;
    nip?: string;
    jabatan?: string;
  }>({});

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

        // Fetch signer info
        const metadata = (document.metadata as any) || {};
        const signerId = data.penandatangan || metadata.signer1_id;
        const signer2Id = metadata.signer2_id;

        // Fetch signer 1 info
        if (signerId) {
          const { data: signerData } = await supabase
            .from("users")
            .select("name, nip, jabatan")
            .eq("id", signerId)
            .maybeSingle();

          if (signerData) {
            setSignerInfo({
              name: signerData.name,
              nip: signerData.nip,
              jabatan: signerData.jabatan,
            });
          }
        }

        // Fetch signer 2 info (jika ada)
        if (signer2Id) {
          const { data: signer2Data } = await supabase
            .from("users")
            .select("name, nip, jabatan")
            .eq("id", signer2Id)
            .maybeSingle();

          if (signer2Data) {
            setSigner2Info({
              name: signer2Data.name,
              nip: signer2Data.nip,
              jabatan: signer2Data.jabatan,
            });
          }
        }
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
  const meta: any = document.metadata || {};
  const signingStatus = meta.signing_status || null; // e.g., 'pending', 'in_progress', 'error', 'done'
  const signingError = meta.signing_error || null;

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
          {/* Non-invasive signing status banner: controlled by metadata keys to avoid changing flows */}
          {signingStatus ? (
            <div className="mb-4 p-2 rounded text-sm flex items-center justify-between border">
              <div>
                <strong>Status:</strong> {signingStatus}
                {signingError ? (
                  <span className="text-destructive"> — {signingError}</span>
                ) : null}
              </div>
              <div>
                {signingStatus === "in_progress" ? (
                  <div className="animate-spin h-4 w-4 border-2 rounded-full border-current" />
                ) : null}
              </div>
            </div>
          ) : null}
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
                programStudi={ijazahData.program_studi || "Teknik Informatika"}
                fakultas={ijazahData.nama_fakultas}
                gelar={ijazahData.gelar}
                tanggalTerbit={ijazahData.tanggal_terbit}
                dekanName={dekanInfo.name}
                dekanNip={dekanInfo.nip}
                rektorName={rektorInfo.name}
                rektorNip={rektorInfo.nip}
                dekanSigned={!!(document.metadata as any)?.dekan_signed}
                rektorSigned={!!(document.metadata as any)?.rektor_signed}
                templateId={ijazahData.template_id}
                renderMode="preview"
              />
            </div>
          ) : isSertifikat && sertifikatData ? (
            <div className="transform scale-75 origin-top">
              <SertifikatRenderer
                nomorSertifikat={sertifikatData.nomor_sertifikat}
                namaPeserta={sertifikatData.nama_peserta}
                namaAcara={sertifikatData.nama_acara}
                tanggalAcara={sertifikatData.tanggal_acara}
                penandatanganName={signerInfo.name}
                penandatanganNip={signerInfo.nip}
                penandatanganJabatan={signerInfo.jabatan}
                penandatangan2Name={signer2Info.name}
                penandatangan2Nip={signer2Info.nip}
                penandatangan2Jabatan={signer2Info.jabatan}
                signer1Signed={!!(document.metadata as any)?.signer1_signed}
                signer2Signed={!!(document.metadata as any)?.signer2_signed}
                templateId={sertifikatData.template_id}
                renderMode="preview"
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
