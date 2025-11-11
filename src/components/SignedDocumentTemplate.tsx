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
        const verificationUrl = `${window.location.origin}${import.meta.env.BASE_URL}verify?id=${document.serial ?? document.id}`;
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
      <div
        aria-hidden
        className="h-[720px] print:h-[720px]"
      />

      <article
        data-signed-footer-area
        className="flex flex-col flex-1 px-10 pb-8 print:relative print:px-0 print:pb-0 print:py-0"
      >
        <section>
          <div className="grid grid-cols-[1fr_240px] print:grid-cols-[1fr_224px] gap-4 sm:gap-6 items-start h-full">
            {/* Spacer */}
            <div />

            {/* QR Code Container */}
            <div
              className="justify-self-end self-end w-[240px] print:w-[224px] text-center flex flex-col items-center min-h-[260px] print:min-h-[240px]"
              style={{ breakInside: "avoid" }} // prevent print engines from overlapping/splitting
            >
              {/* QR Code Date */}
              <div className="mb-2 w-full">
                <p className="text-sm text-black mb-1">Cirebon, {signedDate}</p>
                <p className="text-sm text-black leading-tight">
                  Ketua Program Studi Informatika
                  <br />
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>

              {/* QR Code */}
              <div className="my-2 p-1 border-2 border-black print:my-0 print:p-0">
                {qrCodeDataUrl ? (
                  <img
                    src={qrCodeDataUrl}
                    alt="QR Code untuk verifikasi dokumen"
                    className="block w-24 h-24 print:w-24 print:h-24 object-contain"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center bg-white">
                    <QrCode className="w-20 h-20 text-black" />
                  </div>
                )}
              </div>

              {/* Option A: Show recipient name */}
              {/* Recipient Name */}
              {/* {document.recipient_name && (
                <p className="text-sm text-black inline-block font-extrabold underline">
                  {document.recipient_name}
                </p>
              )} */}

              {/* Recipient Student Number */}
              {/* {document.recipient_student_number && (
                <p className="text-sm text-black inline-block pb-1">
                  NIK. {document.recipient_student_number}
                </p>
              )} */}

              {/* Option B: Show assigner name */}
              {/* Assigner Name */}
              {document.user?.name && (
                <p className="text-sm text-black inline-block font-extrabold underline">
                  {document.user?.name}
                </p>
              )}

              {/* Assigner NIDN */}
              {document.user?.nidn && (
                <p className="text-sm text-black inline-block pb-1">NIK. {document.user?.nidn}</p>
              )}
            </div>
          </div>
        </section>

        {/* Print Date */}
        <section className="mb-4">
          <p className="text-sm text-black">ID Dokumen: {document.serial}</p>
        </section>

        {/* Footer Disclaimer Box */}
        <footer className="border-2 sm:border-3 border-black px-3 pt-3 pb-7 relative">
          <p className="text-black text-center text-sm">
            Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat digital yang
            diterbitkan oleh CA UMC.
            <br />
            Keaslian dokumen ini dapat diverifikasi melalui pemindaian QR Code atau portal
            verifikasi di:
            <br />
            https://ca.umc/verify
          </p>
        </footer>
      </article>
    </main>
  );
}
