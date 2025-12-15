import IjazahRenderer from "./IjazahRenderer";

interface UniversalIjazahTemplateProps {
  // Data ijazah
  nim: string;
  nomorIjazah: string;
  namaMahasiswa: string;
  programStudi?: string;
  fakultas: string;
  gelar: string;
  tanggalTerbit: string;
  logoUrl?: string;

  // Penandatangan
  dekanName?: string;
  dekanNip?: string;
  rektorName?: string;
  rektorNip?: string;

  // Template
  templateId?: string | null;

  // QR codes
  qrCodeUrl?: string;
  dekanQrCode?: string;
  rektorQrCode?: string;
}

export default function UniversalIjazahTemplate({
  nim,
  nomorIjazah,
  namaMahasiswa,
  programStudi = "Teknik Informatika",
  fakultas,
  gelar,
  tanggalTerbit,
  dekanName,
  dekanNip,
  rektorName,
  rektorNip,
  templateId,
  qrCodeUrl,
  dekanQrCode,
  rektorQrCode,
}: UniversalIjazahTemplateProps) {
  // Use the primary QR code URL or fallback to dekan/rektor QR codes
  const primaryQrCode = qrCodeUrl || dekanQrCode || rektorQrCode;

  return (
    <IjazahRenderer
      nim={nim}
      nomorIjazah={nomorIjazah}
      namaMahasiswa={namaMahasiswa}
      programStudi={programStudi}
      fakultas={fakultas}
      gelar={gelar}
      tanggalTerbit={tanggalTerbit}
      dekanName={dekanName}
      dekanNip={dekanNip}
      rektorName={rektorName}
      rektorNip={rektorNip}
      templateId={templateId}
      qrCodeUrl={primaryQrCode}
    />
  );
}
