import { QrCode } from "lucide-react";

interface SignedDocumentTemplateProps {
  document: {
    id: string;
    title: string;
    signed_at: string | null;
    users?: {
      name: string;
      role: string;
    };
  };
  qrCodeUrl?: string;
}

export default function SignedDocumentTemplate({ document, qrCodeUrl }: SignedDocumentTemplateProps) {
  const currentDate = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const signedDate = document.signed_at 
    ? new Date(document.signed_at).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : currentDate;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none">
      {/* Header */}
      <div className="text-left mb-8">
        <p className="text-sm text-gray-700">
          Diterbitkan di Jakarta, tanggal: {signedDate}
        </p>
      </div>

      {/* Document Content Area */}
      <div className="min-h-[400px] mb-8">
        {/* This area would contain the actual document content */}
        <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-500">Konten Dokumen: {document.title}</p>
          <p className="text-sm text-gray-400 mt-2">Area ini akan berisi konten dokumen asli</p>
        </div>
      </div>

      {/* Signature Block */}
      <div className="flex justify-end mb-8">
        <div className="text-center max-w-sm">
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-800 leading-relaxed">
              {document.users?.role === 'rektor' ? 'Rektor' : 
               document.users?.role === 'dekan' ? 'Dekan' :
               document.users?.role === 'dosen' ? 'Dosen' : 'Pejabat'}
            </p>
            <p className="text-sm font-medium text-gray-800">
              Universitas Muhammadiyah Cirebon
            </p>
          </div>
          
          {/* QR Code */}
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 border-2 border-gray-400 flex items-center justify-center bg-gray-50">
              <QrCode className="w-16 h-16 text-gray-600" />
            </div>
          </div>
          
          <p className="text-sm text-gray-700 font-medium">
            Ditandatangani secara elektronik
          </p>
          
          {document.users?.name && (
            <p className="text-sm text-gray-800 font-medium mt-2 border-b border-gray-400 pb-1">
              {document.users.name}
            </p>
          )}
        </div>
      </div>

      {/* Print Date */}
      <div className="text-left mb-8">
        <p className="text-sm text-gray-700">
          Dicetak tanggal: {currentDate}
        </p>
      </div>

      {/* Document Information Footer */}
      <div className="border border-gray-800 p-4 relative">
        <div className="space-y-2 text-sm text-gray-800">
          <div className="flex flex-start">
            <span className="mr-2">1.</span>
            <span>
              Dokumen ini diterbitkan sistem OSS berdasarkan data dari Pelaku Usaha, tersimpan dalam sistem OSS, yang menjadi tanggung jawab Pelaku Usaha.
            </span>
          </div>
          <div className="flex flex-start">
            <span className="mr-2">2.</span>
            <span>
              Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana mestinya.
            </span>
          </div>
          <div className="flex flex-start">
            <span className="mr-2">3.</span>
            <span>
              Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh BSrE-BSSN.
            </span>
          </div>
          <div className="flex flex-start">
            <span className="mr-2">4.</span>
            <span>
              Data lengkap Perizinan Berusaha dapat diperoleh melalui sistem OSS menggunakan hak akses.
            </span>
          </div>
        </div>

        {/* BSrE Logo */}
        <div className="absolute bottom-4 right-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">BSrE</span>
            </div>
            <div className="text-xs text-gray-700">
              <div className="font-bold">Balai Sertifikasi</div>
              <div className="font-bold">Elektronik</div>
            </div>
          </div>
        </div>
      </div>

      {/* Document ID for verification */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          ID Dokumen: {document.id}
        </p>
        {qrCodeUrl && (
          <p className="text-xs text-gray-500 mt-1">
            Verifikasi: {qrCodeUrl}
          </p>
        )}
      </div>
    </div>
  );
}