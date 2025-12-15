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

interface IjazahSignPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument;
}

export default function IjazahSignPreview({
  isOpen,
  onClose,
  document,
}: IjazahSignPreviewProps) {
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [loading, setLoading] = useState(false);
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

  // Determine document type
  const isIjazah = document.title?.toLowerCase().includes("ijazah");
  const isSertifikat = document.title?.toLowerCase().includes("sertifikat");

  useEffect(() => {
    const fetchDocumentData = async () => {
      if (!document.id) return;

      setLoading(true);
      setIjazahData(null);
      setSertifikatData(null);

      if (isIjazah) {
        // Fetch ijazah data
        const { data: ijazahData, error } = await supabase
          .from("ijazah")
          .select("*")
          .eq("document_id", document.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching ijazah data:", error);
          setLoading(false);
          return;
        }

        if (ijazahData) {
          setIjazahData(ijazahData as Ijazah);

          // Get dekan_id and rektor_id from ijazah table first, fallback to metadata
          const metadata = (document.metadata as any) || {};
          const ijazah = ijazahData as any;
          const dekanId = ijazah.dekan_id || metadata.dekan_id;
          const rektorId = ijazah.rektor_id || metadata.rektor_id;

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
        }
      } else if (isSertifikat) {
        // Fetch sertifikat data
        const { data: sertData, error } = await supabase
          .from("sertifikat")
          .select("*")
          .eq("document_id", document.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching sertifikat data:", error);
          setLoading(false);
          return;
        }

        if (sertData) {
          setSertifikatData(sertData as Sertifikat);

          // Fetch signer info
          const metadata = (document.metadata as any) || {};
          const signerId = sertData.penandatangan || metadata.signer1_id;
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
          } else {
            setSigner2Info({});
          }
        }
      }

      setLoading(false);
    };

    if (isOpen) {
      fetchDocumentData();
    }
  }, [isOpen, document.id, document.metadata, isIjazah, isSertifikat]);

  const getDialogTitle = () => {
    if (isIjazah) return `Preview Ijazah - ${document.title}`;
    if (isSertifikat) return `Preview Sertifikat - ${document.title}`;
    return `Preview - ${document.title}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4">
          <div className="transform scale-75 origin-top">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Memuat data...</p>
              </div>
            ) : isIjazah && ijazahData ? (
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
            ) : isSertifikat && sertifikatData ? (
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
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">
                  {isIjazah
                    ? "Data ijazah tidak ditemukan"
                    : isSertifikat
                    ? "Data sertifikat tidak ditemukan"
                    : "Tipe dokumen tidak dikenali"}
                </p>
              </div>
            )}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              {isIjazah
                ? "Preview ijazah sebelum ditandatangani"
                : isSertifikat
                ? "Preview sertifikat sebelum ditandatangani"
                : "Preview dokumen"}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
