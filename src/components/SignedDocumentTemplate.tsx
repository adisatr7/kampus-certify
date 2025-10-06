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
    <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none">
      {/* Header - Indonesian Official Document Style */}
      <div className="text-center mb-8 pb-6 px-8 pt-8 border-b-4 border-gray-900">
        <h1 className="text-lg font-bold text-gray-900 mb-3 uppercase tracking-wide">
          UNIVERSITAS MUHAMMADIYAH CIREBON
        </h1>
        <h2 className="text-base font-bold text-gray-900 uppercase mb-2 tracking-wider">
          {document.title}
        </h2>
        {document.id && (
          <p className="text-xs text-gray-700 mt-3 font-mono tracking-widest">
            NOMOR: {document.id.substring(0, 14).toUpperCase()}
          </p>
        )}
      </div>

      {/* Document Content */}
      <div className="px-10 py-8 min-h-[400px]">
        {documentContent ? (
          <div className="text-gray-900 leading-loose text-sm whitespace-pre-wrap text-justify indent-8">
            {documentContent}
          </div>
        ) : (
          <div className="text-center py-16 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 text-base font-semibold">Konten Dokumen: {document.title}</p>
            <p className="text-sm text-gray-500 mt-3">Konten dokumen belum tersedia</p>
          </div>
        )}
      </div>

      {/* Electronic Signature Section */}
      {document.signed_at && (
        <div className="px-10 pb-8">
          {/* Issue Date */}
          <div className="mb-12">
            <p className="text-sm text-gray-900 font-medium">
              Diterbitkan di Cirebon, {signedDate}
            </p>
          </div>

          {/* Authority and QR Code Section */}
          <div className="flex justify-end mb-12">
            <div className="text-center w-56">
              {/* Authority Title */}
              <div className="mb-4 space-y-1">
                <p className="text-sm font-bold text-gray-900 uppercase">
                  {document.users?.role === 'rektor' ? 'Rektor' : 
                   document.users?.role === 'dekan' ? 'Dekan' :
                   document.users?.role === 'dosen' ? 'Dosen' : 'Pejabat Berwenang'}
                </p>
                <p className="text-xs font-semibold text-gray-900">
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>
              
              {/* QR Code */}
              <div className="flex justify-center my-5 p-2 bg-gray-50 rounded-lg border-2 border-gray-900">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="QR Code untuk verifikasi dokumen"
                    className="w-32 h-32"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center bg-white">
                    <QrCode className="w-28 h-28 text-gray-900" />
                  </div>
                )}
              </div>
              
              {/* Electronic Signature Label */}
              <div className="mb-3 py-2 bg-gray-900 text-white rounded">
                <p className="text-xs font-bold uppercase tracking-wide">
                  Ditandatangani Secara Elektronik
                </p>
              </div>
              
              {/* Signer Name */}
              {document.users?.name && (
                <p className="text-sm text-gray-900 font-bold border-b-2 border-gray-900 pb-1 inline-block">
                  {document.users.name}
                </p>
              )}
            </div>
          </div>

          {/* Print Date */}
          <div className="mb-6">
            <p className="text-xs text-gray-600 italic">
              Dicetak pada tanggal: {currentDate}
            </p>
          </div>

          {/* Footer Disclaimer Box */}
          <div className="border-3 border-gray-900 p-5 relative bg-gray-50">
            <div className="space-y-2 text-[10px] text-gray-900 pr-32 leading-relaxed">
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">1.</span>
                <p className="text-justify">
                  Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">2.</span>
                <p className="text-justify">
                  Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana mestinya.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">3.</span>
                <p className="text-justify">
                  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh BSrE-BSSN.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">4.</span>
                <p className="text-justify">
                  Data lengkap dapat diperoleh melalui sistem CA UMC menggunakan hak akses.
                </p>
              </div>
            </div>

            {/* Electronic Certificate Logo - BSrE */}
            <div className="absolute bottom-5 right-5 bg-white p-3 rounded-lg border-2 border-blue-600 shadow-md">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 bg-blue-600 rounded flex items-center justify-center shadow-lg">
                  <span className="text-white text-xs font-bold">BSrE</span>
                </div>
                <div className="text-[10px] text-gray-900 leading-tight font-semibold">
                  <div>Balai Sertifikasi</div>
                  <div>Elektronik</div>
                  <div className="text-[8px] text-gray-600">BSSN</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}