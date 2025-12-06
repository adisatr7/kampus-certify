import { X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { SertifikatTemplate } from "./SertifikatTemplate";

interface SertifikatPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nama_peserta: string;
    nama_acara: string;
    tanggal_acara: string;
    nomor_sertifikat: string;
    jenis_sertifikat: string;
    penyelenggara: string;
  };
  templateId?: string;
  signer1Name?: string;
  signer1Jabatan?: string;
  signer2Name?: string;
  signer2Jabatan?: string;
}

export default function SertifikatPreview({
  isOpen,
  onClose,
  formData,
  templateId,
  signer1Name,
  signer1Jabatan,
  signer2Name,
  signer2Jabatan,
}: SertifikatPreviewProps) {
  // Create mock sertifikat object for preview
  const mockSertifikat = {
    id: "preview",
    document_id: "preview",
    nama_peserta: formData.nama_peserta,
    nama_acara: formData.nama_acara,
    tanggal_acara: formData.tanggal_acara,
    nomor_sertifikat: formData.nomor_sertifikat,
    penandatangan: signer1Name || "",
    template_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Preview Sertifikat</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="mt-4 print:mt-0">
          <div className="bg-gray-100 p-4 rounded-lg print:bg-white print:p-0">
            <SertifikatTemplate
              sertifikat={mockSertifikat}
              templateId={templateId}
              showQR={false}
              penandatangan1={
                signer1Name
                  ? { name: signer1Name, jabatan: signer1Jabatan }
                  : undefined
              }
              penandatangan2={
                signer2Name
                  ? { name: signer2Name, jabatan: signer2Jabatan }
                  : undefined
              }
            />
          </div>

          <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800/30 print:hidden">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Catatan:</strong> Ini adalah preview sertifikat. QR code
              akan ditambahkan setelah sertifikat ditandatangani.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
