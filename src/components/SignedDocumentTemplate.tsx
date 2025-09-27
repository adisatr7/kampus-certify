import { QrCode } from "lucide-react";

interface SignedDocumentTemplateProps {
  document: {
    id: string;
    title: string;
    signed_at: string | null;
    content?: string | null;
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

  // Generate verification URL for QR code
  const verificationUrl = `${window.location.origin}/verify?id=${document.id}`;

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none">
      {/* Header - University Logo Area */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className="w-16 h-16 mx-auto bg-yellow-500 rounded-full flex items-center justify-center mb-4">
            <span className="text-white font-bold text-xs">UMC</span>
          </div>
          <h1 className="text-lg font-bold text-gray-900 mb-2">UNIVERSITAS MUHAMMADIYAH CIREBON</h1>
          <h2 className="text-base font-semibold text-gray-800 mb-1">{document.title.toUpperCase()}</h2>
        </div>
      </div>

      {/* Document Content Area */}
      <div className="mb-8">
        {document.content ? (
          <div className="text-gray-800 leading-relaxed text-sm">
            <div className="whitespace-pre-wrap">
              {document.content}
            </div>
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 font-medium">Konten Dokumen: {document.title}</p>
            <p className="text-sm text-gray-400 mt-2">Konten dokumen belum tersedia</p>
          </div>
        )}
      </div>

      {/* Date issued */}
      <div className="text-left mb-8">
        <p className="text-sm text-gray-700">
          Diterbitkan di Jakarta, tanggal: {signedDate}
        </p>
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
            <div className="w-20 h-20 border-2 border-gray-800 flex items-center justify-center bg-white">
              <QrCode className="w-16 h-16 text-gray-800" />
            </div>
          </div>
          
          <p className="text-sm text-gray-800 font-medium">
            Ditandatangani secara elektronik
          </p>
          
          {document.users?.name && (
            <p className="text-sm text-gray-800 font-medium mt-2 border-b border-gray-800 pb-1">
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
              Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.
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
              Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh CA UMC.
            </span>
          </div>
          <div className="flex flex-start">
            <span className="mr-2">4.</span>
            <span>
              Data lengkap dokumen dapat diperoleh melalui sistem CA UMC menggunakan hak akses.
            </span>
          </div>
        </div>

        {/* CA UMC Logo */}
        <div className="absolute bottom-4 right-4">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">UMC</span>
            </div>
            <div className="text-xs text-gray-700">
              <div className="font-bold">Certificate Authority</div>
              <div className="font-bold">UMC</div>
            </div>
          </div>
        </div>
      </div>

      {/* Document ID for verification */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          ID Dokumen: {document.id}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Verifikasi: {verificationUrl}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          Scan QR Code di atas untuk verifikasi otomatis
        </p>
      </div>
    </div>
  );
}