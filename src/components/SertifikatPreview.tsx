import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import SertifikatRenderer from "./SertifikatRenderer";

interface SertifikatPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nama_peserta: string;
    nama_acara: string;
    tanggal_acara: string;
    nomor_sertifikat?: string;
    jenis_sertifikat: string;
    penyelenggara: string;
    template_id?: string;
  };
  signer1Name?: string;
  signer1Jabatan?: string;
  signer1Nip?: string;
  signer2Name?: string;
  signer2Jabatan?: string;
  signer2Nip?: string;
}

// Generate preview nomor sertifikat: XXXX/CERT/UMC/YYYY
const generatePreviewNomor = () => {
  const year = new Date().getFullYear();
  return `XXXX/CERT/UMC/${year}`;
};

export default function SertifikatPreview({
  isOpen,
  onClose,
  formData,
  signer1Name,
  signer1Jabatan,
  signer1Nip,
  signer2Name,
  signer2Jabatan,
  signer2Nip,
}: SertifikatPreviewProps) {
  const nomorSertifikat = formData.nomor_sertifikat || generatePreviewNomor();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Sertifikat</DialogTitle>
        </DialogHeader>
        <div className="bg-gray-100 p-4">
          <div className="transform scale-75 origin-top">
            <SertifikatRenderer
              nomorSertifikat={nomorSertifikat}
              namaPeserta={formData.nama_peserta}
              namaAcara={formData.nama_acara}
              tanggalAcara={formData.tanggal_acara}
              jenisSertifikat={formData.jenis_sertifikat}
              penyelenggara={formData.penyelenggara}
              penandatanganName={signer1Name}
              penandatanganNip={signer1Nip}
              penandatanganJabatan={signer1Jabatan}
              penandatangan2Name={signer2Name}
              penandatangan2Nip={signer2Nip}
              penandatangan2Jabatan={signer2Jabatan}
              templateId={formData.template_id}
              renderMode="preview"
            />
          </div>
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              Catatan: QR code akan ditambahkan setelah sertifikat
              ditandatangani
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
