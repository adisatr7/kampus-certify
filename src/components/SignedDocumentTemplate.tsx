import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

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
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  
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

  // Generate QR Code for verification
  useEffect(() => {
    const generateQRCode = async () => {
      try {
        const verificationUrl = `${window.location.origin}/verification-portal?documentId=${document.id}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 80,
          margin: 1,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    if (document.id) {
      generateQRCode();
    }
  }, [document.id]);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none">
      {/* Garuda Logo - Indonesian Government Style */}
      <div className="text-center mb-6">
        <div className="w-20 h-20 mx-auto mb-4 bg-yellow-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">UMC</span>
        </div>
        <h1 className="text-lg font-bold text-gray-900 mb-1">UNIVERSITAS MUHAMMADIYAH CIREBON</h1>
        <h2 className="text-base font-semibold text-gray-800 uppercase">{document.title}</h2>
      </div>

      {/* Original Document Content */}
      <div className="mb-12">
        {document.content ? (
          <div className="text-gray-800 leading-relaxed text-sm whitespace-pre-wrap">
            {document.content}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-500 font-medium">Konten Dokumen: {document.title}</p>
            <p className="text-sm text-gray-400 mt-2">Konten dokumen belum tersedia</p>
          </div>
        )}
      </div>

      {/* Electronic Signature Section - Only shown for signed documents */}
      {document.signed_at && (
        <>
          {/* Issue Date */}
          <div className="text-left mb-6">
            <p className="text-sm text-gray-700">
              Diterbitkan di Cirebon, tanggal: {signedDate}
            </p>
          </div>

          {/* Authority and QR Code Section */}
          <div className="flex justify-end mb-6">
            <div className="text-center">
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-800">
                  {document.users?.role === 'rektor' ? 'Rektor' : 
                   document.users?.role === 'dekan' ? 'Dekan' :
                   document.users?.role === 'dosen' ? 'Dosen' : 'Pejabat Berwenang'}
                </p>
                <p className="text-sm font-medium text-gray-800">
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center mb-3">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code untuk verifikasi dokumen"
                    className="w-16 h-16 border border-gray-300"
                  />
                ) : (
                  <div className="w-16 h-16 border-2 border-gray-800 flex items-center justify-center bg-white">
                    <QrCode className="w-12 h-12 text-gray-800" />
                  </div>
                )}
              </div>
              
              <p className="text-xs text-gray-800 font-medium mb-2">
                Ditandatangani secara elektronik
              </p>
              
              {document.users?.name && (
                <p className="text-sm text-gray-800 font-medium border-b border-gray-800 pb-1">
                  {document.users.name}
                </p>
              )}
            </div>
          </div>

          {/* Print Date */}
          <div className="text-left mb-6">
            <p className="text-sm text-gray-700">
              Dicetak tanggal: {currentDate}
            </p>
          </div>

          {/* Footer Disclaimer Box */}
          <div className="border-2 border-gray-800 p-4 relative">
            <div className="space-y-2 text-xs text-gray-800 pr-20">
              <div className="flex">
                <span className="mr-2 font-bold">1.</span>
                <span>
                  Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.
                </span>
              </div>
              <div className="flex">
                <span className="mr-2 font-bold">2.</span>
                <span>
                  Pelaku Usaha dengan dokumen tersebut di atas dapat melaksanakan kegiatan berusaha sebagaimana terlampir dengan tetap memperhatikan ketentuan peraturan perundang-undangan.
                </span>
              </div>
              <div className="flex">
                <span className="mr-2 font-bold">3.</span>
                <span>
                  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh CA UMC.
                </span>
              </div>
              <div className="flex">
                <span className="mr-2 font-bold">4.</span>
                <span>
                  Data lengkap Pelaksana Berusaha dapat diperoleh melalui sistem CA UMC menggunakan hak akses.
                </span>
              </div>
            </div>

            {/* Electronic Certificate Logo */}
            <div className="absolute bottom-4 right-4">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">BSrE</span>
                </div>
                <div className="text-xs text-gray-700">
                  <div className="font-bold">Balai Sertifikasi</div>
                  <div className="font-bold">Elektronik</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}