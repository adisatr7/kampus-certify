import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { UserDocument } from "@/types";
import IjazahDocumentTemplate from "./IjazahDocumentTemplate";

interface IjazahPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  formData: {
    nama_mahasiswa: string;
    nim: string;
    nama_fakultas: string;
    gelar: string;
    tanggal_terbit: string;
  };
  dekanName?: string;
  dekanNip?: string;
}

export default function IjazahPreview({
  isOpen,
  onClose,
  formData,
  dekanName,
  dekanNip,
}: IjazahPreviewProps) {
  // Create a mock document for preview
  const mockDocument: UserDocument = {
    id: "preview-id",
    title: `Ijazah - ${formData.nama_mahasiswa}`,
    content: "",
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: "preview-user",
    recipient_name: formData.nama_mahasiswa,
    recipient_student_number: formData.nim,
    serial: "IZH-XXXX-UMC-2025",
    user: {
      id: "preview-user",
      name: dekanName || "Nama Dekan",
      email: "dekan@example.com",
      role: "dekan",
      nip: dekanNip || "1234567890",
      jabatan: "Dekan Fakultas",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={onClose}
    >
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preview Ijazah</DialogTitle>
        </DialogHeader>
        <div className="bg-white">
          <IjazahDocumentTemplate
            document={mockDocument}
            ijazahData={{
              nama_mahasiswa: formData.nama_mahasiswa,
              nim: formData.nim,
              gelar: formData.gelar,
              nama_fakultas: formData.nama_fakultas,
              tanggal_terbit: formData.tanggal_terbit,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
