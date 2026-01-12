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

  // Generate QR Code for verification
  useEffect(() => {
    // If an external qrCodeUrl is provided (from viewer), prefer it. Otherwise generate one.
    if (qrCodeUrl) {
      setQrCodeDataUrl(qrCodeUrl);
      return;
    }

    const generateQRCode = async () => {
      try {
        const verificationUrl = `${window.location.origin}${
          import.meta.env.BASE_URL
        }verify?id=${document.serial ?? document.id}`;
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

  return (
    <main
      className="max-w-4xl shadow-none print:w-[794px] print:h-[1123px] mx-0 my-0 relative pb-0 m-0 p-0 flex flex-col"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* Spacer to force content to bottom */}
      <div aria-hidden className="h-[720px] print:h-[720px]" />

      <article
        data-signed-footer-area
        className="flex flex-col flex-1 px-10 pb-8 print:relative print:px-0 print:pb-0 print:py-0"
      >
        <section>
          <div className="grid grid-cols-[1fr_240px] print:grid-cols-[1fr_224px] gap-4 sm:gap-6 items-center h-full">
            {/* Spacer */}
            <div />

            {/* QR Code + Signer Info Container */}
            <div
              className="justify-self-end self-center w-[240px] print:w-[224px] text-center flex flex-col items-center"
              style={{ breakInside: "avoid" }} // prevent print engines from overlapping/splitting
            >
              {/* Header Info */}
              <div className="mb-3 w-full flex flex-col items-center text-center">
                <p className="text-xs text-black mb-1">Cirebon, {signedDate}</p>
                {document.user?.jabatan && (
                  <p className="text-xs text-black leading-tight">
                    {document.user.jabatan}
                  </p>
                )}
                <p className="text-xs text-black leading-tight">
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>

              {/* QR Code Box */}
              <div className="my-3 p-4 border-2 border-black bg-white inline-block">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code untuk verifikasi dokumen"
                    className="block w-24 h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center bg-white">
                    <span className="text-xs text-black font-semibold text-center">
                      QR-CODE
                    </span>
                  </div>
                )}
              </div>

              {/* Assigner Name */}
              {document.user?.name && (
                <p className="text-sm text-black font-bold underline mt-3">
                  {document.user?.name.toUpperCase()}
                </p>
              )}

              {/* Assigner NIP */}
              {document.user?.nip && (
                <p className="text-xs text-black mt-1">
                  NIP. {document.user?.nip}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ID Dokumen Section */}
        <section className="mb-4 mt-4">
          <p className="text-sm text-black mb-2">
            <span className="font-semibold">ID Dokumen:</span>{" "}
            {document.serial || document.id}
          </p>
        </section>

        {/* Footer Disclaimer Box */}
        <footer className="border-2 border-black px-4 py-3 bg-white">
          <p className="text-black text-xs leading-relaxed text-center">
            Dokumen ini telah ditandatangani secara elektronik menggunakan
            sertifikat digital yang diterbitkan oleh CA UMC. Keaslian dokumen
            ini dapat diverifikasi melalui pemindaian QR Code atau portal
            verifikasi di:
            <br />
            <span className="font-semibold">https://ca.umc/verifikasi</span>
          </p>
        </footer>
      </article>
    </main>
  );
}
