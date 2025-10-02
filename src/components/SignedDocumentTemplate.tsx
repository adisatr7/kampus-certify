import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SignedDocumentTemplateProps {
  document: {
    id: string;
    title: string;
    signed_at: string | null;
    content?: string | null;
    file_url?: string | null;
    users?: {
      name: string;
      role: string;
    };
  };
  qrCodeUrl?: string;
}

export default function SignedDocumentTemplate({ document, qrCodeUrl }: SignedDocumentTemplateProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [documentContent, setDocumentContent] = useState<string>("");
  
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
          width: 200,
          margin: 2,
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

  // Set document content - use original content from database
  useEffect(() => {
    if (document.content && document.content.trim()) {
      // Use the original content directly from database
      setDocumentContent(document.content.trim());
    } else {
      // No content available, use fallback
      setDocumentContent(`${document.title}

Konten dokumen tidak tersedia dalam sistem.

Dokumen ini telah ditandatangani secara elektronik oleh ${document.users?.name || 'Pejabat Berwenang'} dari Universitas Muhammadiyah Cirebon.`);
    }
  }, [document.content, document.title, document.users?.name]);

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 shadow-lg print:shadow-none">
      {/* Header - Indonesian Official Document Style */}
      <div className="text-center mb-6 pb-4">
        <h1 className="text-base font-bold text-gray-900 mb-2 uppercase">UNIVERSITAS MUHAMMADIYAH CIREBON</h1>
        <h2 className="text-sm font-bold text-gray-900 uppercase mb-1">{document.title}</h2>
        {document.id && (
          <p className="text-xs text-gray-700 mt-1">
            NOMOR DOKUMEN: {document.id.substring(0, 14).toUpperCase()}
          </p>
        )}
        <div className="border-t-2 border-gray-900 mt-4"></div>
      </div>

      {/* Original Document Content */}
      <div className="mb-8 min-h-[300px]">
        {documentContent ? (
          <div className="text-gray-900 leading-relaxed text-xs whitespace-pre-wrap text-justify">
            {documentContent}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 text-sm font-medium">Konten Dokumen: {document.title}</p>
            <p className="text-xs text-gray-500 mt-2">Konten dokumen belum tersedia</p>
          </div>
        )}
      </div>

      {/* Electronic Signature Section - Only shown for signed documents */}
      {document.signed_at && (
        <>
          {/* Issue Date */}
          <div className="text-left mb-8">
            <p className="text-xs text-gray-900">
              Diterbitkan di Cirebon, tanggal: {signedDate}
            </p>
          </div>

          {/* Authority and QR Code Section - Right aligned */}
          <div className="flex justify-end mb-8">
            <div className="text-center max-w-[200px]">
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-900">
                  {document.users?.role === 'rektor' ? 'Rektor' : 
                   document.users?.role === 'dekan' ? 'Dekan' :
                   document.users?.role === 'dosen' ? 'Dosen' : 'Pejabat Berwenang'}
                </p>
                <p className="text-xs font-semibold text-gray-900">
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>
              
              {/* QR Code - Prominent size for easy scanning */}
              <div className="flex justify-center my-3">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code untuk verifikasi dokumen"
                    className="w-28 h-28 bg-white p-1"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center bg-white">
                    <QrCode className="w-24 h-24 text-gray-900" />
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-gray-900 font-bold mb-2">
                Ditandatangani secara elektronik
              </p>
              
              {document.users?.name && (
                <p className="text-xs text-gray-900 font-medium">
                  {document.users.name}
                </p>
              )}
            </div>
          </div>

          {/* Print Date */}
          <div className="text-left mb-6">
            <p className="text-xs text-gray-900">
              Dicetak tanggal: {currentDate}
            </p>
          </div>

          {/* Footer Disclaimer Box */}
          <div className="border-2 border-gray-900 p-3 relative min-h-[100px]">
            <div className="space-y-1.5 text-[9px] text-gray-900 pr-24 leading-relaxed">
              <div className="flex">
                <span className="mr-1.5 font-semibold flex-shrink-0">1.</span>
                <span className="text-justify">
                  Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.
                </span>
              </div>
              <div className="flex">
                <span className="mr-1.5 font-semibold flex-shrink-0">2.</span>
                <span className="text-justify">
                  Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana mestinya.
                </span>
              </div>
              <div className="flex">
                <span className="mr-1.5 font-semibold flex-shrink-0">3.</span>
                <span className="text-justify">
                  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh BSrE-BSSN.
                </span>
              </div>
              <div className="flex">
                <span className="mr-1.5 font-semibold flex-shrink-0">4.</span>
                <span className="text-justify">
                  Data lengkap dapat diperoleh melalui sistem CA UMC menggunakan hak akses.
                </span>
              </div>
            </div>

            {/* Electronic Certificate Logo - BSrE */}
            <div className="absolute bottom-3 right-3">
              <div className="flex items-center gap-1.5">
                <div className="w-12 h-12 bg-blue-600 rounded-md flex items-center justify-center">
                  <span className="text-white text-[10px] font-bold">BSrE</span>
                </div>
                <div className="text-[9px] text-gray-900 leading-tight">
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