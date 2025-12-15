import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import { Ijazah } from "@/types/Ijazah";
import IjazahRenderer from "./IjazahRenderer";

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
  const [dekanInfo, setDekanInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );
  const [rektorInfo, setRektorInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );

  useEffect(() => {
    const fetchIjazahDataAndSigners = async () => {
      if (!document.id) return;

      // Fetch ijazah data
      const { data: ijazahData, error } = await supabase
        .from("ijazah")
        .select("*")
        .eq("document_id", document.id)
        .single();

      if (error) {
        console.error("Error fetching ijazah data:", error);
        return;
      }

      setIjazahData(ijazahData as Ijazah);

      // Get dekan_id and rektor_id from ijazah table first, fallback to metadata
      const metadata = document.metadata || {};
      const dekanId = ijazahData.dekan_id || metadata.dekan_id;
      const rektorId = ijazahData.rektor_id || metadata.rektor_id;

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
    };

    if (isOpen) {
      fetchIjazahDataAndSigners();
    }
  }, [isOpen, document.id, document.metadata]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Ijazah - {document.title}</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4">
          <div className="transform scale-75 origin-top">
            {ijazahData ? (
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
            ) : (
              <div className="p-8 text-center">
                <p className="text-muted-foreground">Memuat data ijazah...</p>
              </div>
            )}
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>Preview ijazah yang telah ditandatangani</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
