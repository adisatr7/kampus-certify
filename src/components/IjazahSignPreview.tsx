import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";
import { Ijazah } from "@/types/Ijazah";
import IjazahDocumentTemplate from "./IjazahDocumentTemplate";

interface IjazahSignPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument;
}

export default function IjazahSignPreview({ isOpen, onClose, document }: IjazahSignPreviewProps) {
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);

  useEffect(() => {
    const fetchIjazahData = async () => {
      if (!document.id) return;

      const { data, error } = await supabase
        .from("ijazah")
        .select("*")
        .eq("document_id", document.id)
        .single();

      if (error) {
        console.error("Error fetching ijazah data:", error);
        return;
      }

      setIjazahData(data as Ijazah);
    };

    if (isOpen) {
      fetchIjazahData();
    }
  }, [isOpen, document.id]);

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Ijazah - {document.title}</DialogTitle>
        </DialogHeader>
        <div className="bg-white">
          {ijazahData ? (
            <IjazahDocumentTemplate
              document={document}
              ijazahData={{
                nama_mahasiswa: ijazahData.nama_mahasiswa,
                nim: ijazahData.nim,
                gelar: ijazahData.gelar,
                nama_fakultas: ijazahData.nama_fakultas,
                tanggal_terbit: ijazahData.tanggal_terbit,
              }}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-muted-foreground">Memuat data ijazah...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
