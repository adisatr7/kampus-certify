import IjazahRenderer from "./IjazahRenderer";
import { UserDocument } from "@/types";

interface DynamicIjazahTemplateProps {
  document: UserDocument;
  qrCodeUrl?: string;
  ijazahData?: {
    nama_mahasiswa: string;
    nim: string;
    gelar: string;
    jenjang: string;
    nama_fakultas: string;
    tanggal_terbit: string;
    template_id: string;
    dekan?: {
      id: string;
      name: string;
      nip: string;
    };
    rektor?: {
      id: string;
      name: string;
      nip: string;
    };
  };
}

export default function DynamicIjazahTemplate({
  document,
  qrCodeUrl,
  ijazahData,
}: DynamicIjazahTemplateProps) {
  if (!ijazahData) {
    return null;
  }

  return (
    <IjazahRenderer
      nim={ijazahData.nim}
      nomorIjazah={document.serial || document.id}
      namaMahasiswa={ijazahData.nama_mahasiswa}
      programStudi={ijazahData.program_studi || "Teknik Informatika"}
      fakultas={ijazahData.nama_fakultas}
      gelar={ijazahData.gelar}
      tanggalTerbit={ijazahData.tanggal_terbit}
      dekanName={ijazahData.dekan?.name}
      dekanNip={ijazahData.dekan?.nip}
      rektorName={ijazahData.rektor?.name}
      rektorNip={ijazahData.rektor?.nip}
      templateId={ijazahData.template_id}
      qrCodeUrl={qrCodeUrl}
    />
  );
}
