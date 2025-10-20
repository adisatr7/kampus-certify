import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { UserDocument } from "../types";

interface SignedDocumentTemplateProps {
  document: UserDocument;
  qrCodeUrl?: string;
}

export default function SignedDocumentTemplate({
  document,
  qrCodeUrl,
}: SignedDocumentTemplateProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [documentContent, setDocumentContent] = useState<string>("");

  const currentDate = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const signedDate = document.updated_at
    ? new Date(document.updated_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : currentDate;

  const documentSignature = (document.document_signatures ?? []).sort(
    (a, b) => (Date.parse(b.signed_at ?? "") || 0) - (Date.parse(a.signed_at ?? "") || 0),
  )[0];

  // Generate QR Code for verification
  useEffect(() => {
    // If an external qrCodeUrl is provided (from viewer), prefer it. Otherwise generate one.
    if (qrCodeUrl) {
      setQrCodeDataUrl(qrCodeUrl);
      return;
    }

    const generateQRCode = async () => {
      try {
        const verificationUrl = `${window.location.origin}${import.meta.env.BASE_URL}/verify?id=${document.id}`;
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: 200,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        });
        setQrCodeDataUrl(qrDataUrl);
      } catch (error) {
        console.error("Error generating QR code:", error);
      }
    };

    if (document.id) {
      generateQRCode();
    }
  }, [document.id, qrCodeUrl]);

  // Set document content - use original content from database
  useEffect(() => {
    if (document.content && document.content.trim()) {
      // Use the original content directly from database
      setDocumentContent(document.content.trim());
    } else {
      // No content available, use fallback
      setDocumentContent(`${document.title}

Konten dokumen tidak tersedia dalam sistem.

Dokumen ini telah ditandatangani secara elektronik oleh ${documentSignature.signer?.name || document.user?.name || "Pejabat Berwenang"} dari Universitas Muhammadiyah Cirebon.`);
    }
  }, [document.content, document.title, documentSignature.signer?.name || document.user?.name]);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:w-[794px] print:h-[1123px] print:mx-0 print:my-0 print:relative print:bg-white print:pb-0 print:m-0 print:p-0">
      {/* Header - Indonesian Official Document Style */}
      <div className="text-center mb-4 sm:mb-8 pb-4 sm:pb-6 px-4 sm:px-8 pt-4 sm:pt-8 border-b-2 sm:border-b-4 border-gray-900 print:px-0 print:pt-0 print:pb-0 print:mb-0">
        <h1 className="text-sm sm:text-lg font-bold text-gray-900 mb-2 sm:mb-3 uppercase tracking-wide">
          UNIVERSITAS MUHAMMADIYAH CIREBON
        </h1>
        <h2 className="text-xs sm:text-base font-bold text-gray-900 uppercase mb-1 sm:mb-2 tracking-wider">
          {document.title}
        </h2>
        {document.id && (
          <p className="text-[10px] sm:text-xs text-gray-700 mt-2 sm:mt-3 font-mono tracking-widest">
            NOMOR: {document.id.substring(0, 14).toUpperCase()}
          </p>
        )}
      </div>

      {/* Document Content */}
      <div className="px-4 sm:px-8 py-4 sm:py-6 min-h-[300px] sm:min-h-[380px] print:pb-0 print:px-0 print:py-0 print:p-0">
        {documentContent ? (
          <div className="text-gray-900 leading-relaxed sm:leading-loose text-xs sm:text-sm whitespace-pre-wrap text-justify indent-4 sm:indent-8">
            {documentContent}
          </div>
        ) : (
          <div className="text-center py-8 sm:py-16 border-2 border-dashed border-gray-300 rounded-lg">
            <p className="text-gray-600 text-sm sm:text-base font-semibold px-4">
              Konten Dokumen: {document.title}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-2 sm:mt-3">
              Konten dokumen belum tersedia
            </p>
          </div>
        )}
      </div>

      {/* Electronic Signature Section */}
      {document.updated_at && (
        <div className="px-4 sm:px-10 pb-4 sm:pb-8 print:relative print:px-0 print:pb-0 print:py-0">
          {/* Issue Date */}
          <div className="mb-6 sm:mb-12">
            <p className="text-xs sm:text-sm text-gray-900 font-medium">
              Diterbitkan di Cirebon, {signedDate}
            </p>
          </div>

          {/* Authority and QR Code Section */}
          <div className="mb-8 sm:mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_240px] print:grid-cols-[1fr_224px] gap-4 sm:gap-6 items-start">
              <div />
              <div
                className="justify-self-end w-[240px] print:w-[224px] text-center flex flex-col items-center min-h-[260px] print:min-h-[240px]"
                style={{ breakInside: "avoid" }} // prevent print engines from overlapping/splitting
              >
                {/* Authority Title */}
                <div className="mb-2 w-full">
                  <p className="text-xs sm:text-sm font-bold text-gray-900 uppercase">
                    {documentSignature.signer?.role === "rektor" || document.user?.role === "rektor"
                      ? "Rektor"
                      : documentSignature.signer?.role === "dekan" ||
                          document.user?.role === "dekan"
                        ? "Dekan"
                        : documentSignature.signer?.role === "dosen" ||
                            document.user?.role === "dosen"
                          ? "Dosen"
                          : "Pejabat Berwenang"}
                  </p>
                  <p className="text-[10px] sm:text-xs font-semibold text-gray-900 leading-tight">
                    Universitas Muhammadiyah Cirebon
                  </p>
                </div>

                {/* QR Code */}
                <div className="my-3 p-2 bg-gray-50 rounded-lg border-2 border-gray-900 print:my-0 print:p-0">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="QR Code untuk verifikasi dokumen"
                      className="block w-28 h-28 sm:w-32 sm:h-32 print:w-28 print:h-28 object-contain"
                    />
                  ) : (
                    <div className="w-28 h-28 sm:w-32 sm:h-32 flex items-center justify-center bg-white">
                      <QrCode className="w-24 h-24 sm:w-28 sm:h-28 text-gray-900" />
                    </div>
                  )}
                </div>

                {/* Electronic Signature Label - use subtle bordered style instead of dark box */}
                <div className="mb-2 py-1 text-gray-900 rounded w-full print:py-0 print:p-0">
                  <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-center">
                    Ditandatangani Secara Elektronik
                  </p>
                </div>

                {/* Signer Name */}
                {(documentSignature.signer?.name || document.user?.name) && (
                  <p className="text-xs sm:text-sm text-gray-900 font-bold border-b-2 border-gray-900 pb-1 inline-block">
                    {documentSignature.signer?.name || document.user?.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Print Date */}
          <div className="mb-4 sm:mb-6 print:mb-0">
            <p className="text-[10px] sm:text-xs text-gray-600 italic">
              Dicetak pada tanggal: {currentDate}
            </p>
          </div>

          {/* Footer Disclaimer Box */}
          <div className="border-2 sm:border-3 border-gray-900 p-3 sm:p-5 relative bg-gray-50 print:mt-0 print:mx-0 print:min-h-[140px] print:px-0 print:p-0">
            <div className="space-y-2 text-[9px] sm:text-[10px] text-gray-900 pr-0 sm:pr-32 leading-relaxed">
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">1.</span>
                <p className="text-justify">
                  Dokumen ini diterbitkan sistem CA UMC berdasarkan data dari pengguna, tersimpan
                  dalam sistem CA UMC, yang menjadi tanggung jawab pengguna.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">2.</span>
                <p className="text-justify">
                  Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana
                  mestinya.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="font-bold flex-shrink-0">3.</span>
                <p className="text-justify">
                  Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat
                  elektronik yang diterbitkan oleh BSrE-BSSN.
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
            <div className="mt-3 sm:mt-0 sm:ml-auto sm:mr-0 bg-white p-2 sm:p-3 rounded-lg border-2 border-blue-600 shadow-md w-fit mx-auto sm:mx-0 print:p-0">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 sm:w-14 sm:h-14 bg-blue-600 rounded flex items-center justify-center shadow-lg">
                  <span className="text-white text-[10px] sm:text-xs font-bold">BSrE</span>
                </div>
                <div className="text-[9px] sm:text-[10px] text-gray-900 leading-tight font-semibold">
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
