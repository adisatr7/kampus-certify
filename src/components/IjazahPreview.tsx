import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import IjazahRenderer from "./IjazahRenderer";

interface IjazahPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nama_mahasiswa: string;
    nim: string;
    nama_fakultas: string;
    gelar: string;
    jenjang: string;
    tanggal_terbit: string;
    logo_url?: string;
    template_id?: string;
  };
  dekanName?: string;
  dekanNip?: string;
  dekanJabatan?: string;
  rektorName?: string;
  rektorNip?: string;
  rektorJabatan?: string;
}

export default function IjazahPreview({
  isOpen,
  onClose,
  formData,
  dekanName,
  dekanNip,
  dekanJabatan,
  rektorName,
  rektorNip,
  rektorJabatan,
}: IjazahPreviewProps) {
  // Generate nomor ijazah untuk preview
  const nomorIjazah = `IZH/0001/XI/${new Date().getFullYear()}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Ijazah</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4">
          <div className="transform scale-75 origin-top">
            <IjazahRenderer
              nim={formData.nim}
              nomorIjazah={nomorIjazah}
              namaMahasiswa={formData.nama_mahasiswa}
              programStudi="Teknik Informatika"
              fakultas={formData.nama_fakultas}
              gelar={formData.gelar}
              tanggalTerbit={formData.tanggal_terbit}
              dekanName={dekanName}
              dekanNip={dekanNip}
              dekanJabatan={dekanJabatan}
              rektorName={rektorName}
              rektorNip={rektorNip}
              rektorJabatan={rektorJabatan}
              templateId={formData.template_id}
              renderMode="preview"
            />
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              Catatan: QR code akan ditambahkan setelah ijazah ditandatangani
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
