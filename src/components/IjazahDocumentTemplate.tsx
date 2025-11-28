import { QrCode } from "lucide-react";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import { UserDocument } from "@/types";

interface IjazahDocumentTemplateProps {
  document: UserDocument;
  qrCodeUrl?: string;
  ijazahData?: {
    nama_mahasiswa: string;
    nim: string;
    gelar: string;
    nama_fakultas: string;
    tanggal_terbit: string;
    logo_url?: string;
  };
}

export default function IjazahDocumentTemplate({
  document,
  qrCodeUrl,
  ijazahData,
}: IjazahDocumentTemplateProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");

  useEffect(() => {
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
  }, [document.id, document.serial, qrCodeUrl]);

  const signedDate = document.updated_at
    ? new Date(document.updated_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : new Date().toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  return (
    <main
      className="max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:w-[794px] print:h-[1123px] p-12 print:p-12"
      style={{ fontFamily: '"Times New Roman", Times, serif' }}
    >
      {/* Header */}
      <header className="text-center mb-8 border-b-4 border-black pb-6">
        <div className="flex items-center justify-center gap-6 mb-4">
          {ijazahData?.logo_url && (
            <img
              src={ijazahData.logo_url}
              alt="Logo Universitas"
              className="h-20 w-20 object-contain"
            />
          )}
          <div>
            <h1 className="text-2xl font-bold text-black uppercase tracking-wide">
              Universitas Muhammadiyah Cirebon
            </h1>
            <p className="text-lg text-black">Jl. Tuparev No. 70 Cirebon 45153</p>
          </div>
        </div>
      </header>

      {/* Title */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-black uppercase tracking-widest mb-2">IJAZAH</h2>
        <p className="text-lg text-black">Nomor: {document.serial || "IZH-XXXX-UMC-2025"}</p>
      </div>

      {/* Content */}
      <article className="mb-8 space-y-4 text-black leading-relaxed">
        <p className="text-base text-justify">
          Rektor Universitas Muhammadiyah Cirebon dengan ini menyatakan bahwa:
        </p>

        <div className="bg-gray-50 p-6 rounded-lg border-2 border-black my-6">
          <table className="w-full text-base">
            <tbody>
              <tr>
                <td className="py-2 pr-4 font-semibold w-1/3">Nama</td>
                <td className="py-2">: {ijazahData?.nama_mahasiswa || document.recipient_name}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold">NIM</td>
                <td className="py-2">: {ijazahData?.nim || document.recipient_student_number}</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-semibold">Fakultas</td>
                <td className="py-2">: {ijazahData?.nama_fakultas || "Fakultas Teknik"}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-base text-justify">
          Telah menyelesaikan program pendidikan Sarjana (S1) dan berhak menyandang gelar:
        </p>

        <div className="text-center my-6">
          <p className="text-2xl font-bold text-black uppercase tracking-wider">
            {ijazahData?.gelar || "Sarjana Komputer (S.Kom)"}
          </p>
        </div>

        <p className="text-base text-justify">
          Diberikan di Cirebon pada tanggal{" "}
          {ijazahData?.tanggal_terbit
            ? new Date(ijazahData.tanggal_terbit).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : signedDate}
        </p>
      </article>

      {/* Signature Section */}
      <section className="mt-12">
        <div className="grid grid-cols-2 gap-8">
          {/* Left signature - Dekan */}
          <div className="text-center">
            <p className="text-sm text-black mb-1">Mengetahui,</p>
            <p className="text-sm text-black font-semibold">
              Dekan {ijazahData?.nama_fakultas || "Fakultas Teknik"}
            </p>
            <p className="text-sm text-black font-semibold mb-20">
              Universitas Muhammadiyah Cirebon
            </p>
            <div className="border-t-2 border-black pt-1 inline-block min-w-[200px]">
              <p className="text-sm text-black font-bold">{document.user?.name || "Nama Dekan"}</p>
              <p className="text-xs text-black">NIP. {document.user?.nip || "1234567890"}</p>
            </div>
          </div>

          {/* Right signature - Rektor with QR */}
          <div className="text-center">
            <p className="text-sm text-black mb-1">Cirebon, {signedDate}</p>
            <p className="text-sm text-black font-semibold">Rektor</p>
            <p className="text-sm text-black font-semibold mb-20">
              Universitas Muhammadiyah Cirebon
            </p>

            <div className="border-t-2 border-black pt-1 inline-block min-w-[200px]">
              <p className="text-sm text-black font-bold">Prof. Dr. H. Muhammad Hidayat, M.T.</p>
              <p className="text-xs text-black">NIP. 9876543210</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-12 pt-6 border-t-2 border-black">
        <div className="bg-gray-100 border-2 border-black p-4">
          <p className="text-xs text-black text-center leading-relaxed">
            Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat digital yang
            diterbitkan oleh CA UMC. Keaslian dokumen ini dapat diverifikasi melalui pemindaian QR
            Code atau portal verifikasi di:{" "}
            <span className="font-semibold">https://ca.umc/verify</span>
          </p>
        </div>
      </footer>
    </main>
  );
}
