import { QRCodeSVG } from "qrcode.react";

interface IjazahTemplateProps {
  nim: string;
  nomorIjazah: string;
  logoUrl: string;
  namaMahasiswa: string;
  programStudi: string;
  fakultas: string;
  gelar: string;
  tanggalTerbit: string;
  dekanName?: string;
  dekanNip?: string;
  dekanQrCode?: string;
  rektorName?: string;
  rektorNip?: string;
  rektorQrCode?: string;
  dekanSigned?: boolean;
  rektorSigned?: boolean;
}

export default function IjazahTemplate({
  nim,
  nomorIjazah,
  logoUrl,
  namaMahasiswa,
  programStudi,
  fakultas,
  gelar,
  tanggalTerbit,
  dekanName,
  dekanNip,
  dekanQrCode,
  rektorName,
  rektorNip,
  rektorQrCode,
  dekanSigned = false,
  rektorSigned = false,
}: IjazahTemplateProps) {
  const verificationUrl = `${window.location.origin}/verify/${nomorIjazah}`;

  // Use placeholder QR if not provided (for preview)
  const dekanQr = dekanQrCode || `DEKAN-${nim}`;
  const rektorQr = rektorQrCode || `REKTOR-${nim}`;

  // Parse gelar to separate full name and abbreviation
  // Input: "Sarjana Teknik (S.T)" -> Output: { full: "Sarjana Teknik", abbr: "S.T" }
  const parseGelar = (gelarInput: string) => {
    const match = gelarInput.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      return {
        full: match[1].trim(),
        abbr: match[2].trim(),
      };
    }
    // If no parentheses, use the whole string as both
    return {
      full: gelarInput,
      abbr: gelarInput,
    };
  };

  const { full: gelarFull, abbr: gelarAbbr } = parseGelar(gelar);

  return (
    <div
      className="relative w-[794px] h-[1123px] mx-auto"
      style={{
        backgroundImage: "url('/ijazah-background.webp')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      {/* Inner white paper */}
      <div className="absolute inset-12 bg-white shadow-2xl">
        {/* Golden border - matching template */}
        <div className="absolute inset-4 border-[3px] border-amber-500">
          {/* Content */}
          <div className="relative h-full flex flex-col p-8">
            {/* Header - NIM and Nomor Ijazah - Positioned safely inside white area */}
            <div className="flex justify-between items-start mb-6 mt-8 px-4">
              <div className="text-gray-700 font-semibold text-sm">
                NIM.{nim}
              </div>
              <div className="text-gray-700 font-semibold text-sm">
                No: {nomorIjazah}
              </div>
            </div>

            {/* Logo */}
            <div className="flex justify-center mb-4">
              <div className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg">
                <img
                  src="/logo-umc.png"
                  alt="Logo"
                  className="w-20 h-20 object-contain"
                  crossOrigin="anonymous"
                  onError={(e) => {
                    // Fallback to local logo if external URL fails (CORS)
                    const target = e.currentTarget;
                    if (!target.src.includes("/logo-umc.svg")) {
                      console.warn(
                        "Logo failed to load, using fallback:",
                        logoUrl
                      );
                      target.src = "/logo-umc.svg";
                    } else {
                      target.style.display = "none";
                    }
                  }}
                />
              </div>
            </div>

            {/* University Name */}
            <div className="text-center mb-6">
              <div className="text-gray-600 text-xs font-medium tracking-wider mb-1">
                KEMENTRIAN PENDIDIKAN DAN KEBUDAYAAN
              </div>
              <div className="text-gray-800 text-lg font-bold tracking-wide">
                UNIVERSITAS MUHAMMADIYAH CIREBON
              </div>
              <div className="w-3/4 mx-auto h-[2px] bg-amber-500 mt-2"></div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col justify-center text-center px-8">
              <div className="text-gray-600 text-sm mb-6">
                Dengan ini kami menyatakan bahwa
              </div>

              {/* Nama Mahasiswa - Script Font */}
              <div
                className="text-5xl mb-6 text-gray-800"
                style={{
                  fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
                  fontWeight: 400,
                  lineHeight: 1.2,
                }}
              >
                {namaMahasiswa}
              </div>

              <div className="text-gray-600 text-sm mb-2">
                telah berhasil menyelesaikan Program Pendidikan Sarjana
              </div>
              <div className="text-gray-700 text-base font-semibold mb-2">
                Program Studi {programStudi} pada {fakultas}
              </div>
              <div className="text-gray-600 text-sm mb-6">
                Oleh karena itu, kepada yang bersangkutan diberikan ijazah dan
                sebutan
              </div>

              {/* Gelar - Script Font (Full name only) */}
              <div
                className="text-4xl mb-6 text-gray-800"
                style={{
                  fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
                  fontWeight: 400,
                }}
              >
                {gelarFull}
              </div>

              <div className="text-gray-600 text-sm mb-2">
                dengan singkatan {gelarAbbr}
              </div>
              <div className="text-gray-600 text-sm">
                Beserta segala hak dan wewenang yang melekat pada gelar tersebut
              </div>
              <div className="text-gray-600 text-sm">
                Diterbitkan di Cirebon pada tanggal{" "}
                {new Date(tanggalTerbit).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </div>
            </div>

            {/* Footer - Signatures */}
            <div className="mt-auto">
              <div className="flex justify-between items-end relative">
                {/* Dekan - Left */}
                <div className="flex flex-col items-center w-1/3">
                  <div className="text-[10px] text-gray-600 mb-1">
                    Dekan {fakultas}
                  </div>
                  <div className="text-[10px] text-gray-600 mb-2">
                    Universitas Muhammadiyah Cirebon
                  </div>
                  {dekanSigned ? (
                    <div className="mb-2 bg-white p-1 border border-gray-300">
                      <QRCodeSVG
                        value={dekanQr}
                        size={70}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  ) : (
                    <div className="mb-2 h-[74px]"></div>
                  )}
                  <div className="text-[10px] font-bold text-gray-800 text-center">
                    {dekanName || "NAMA LENGKAP + GELAR"}
                  </div>
                  <div className="text-[10px] text-gray-600 text-center">
                    NIP. {dekanNip || ""}
                  </div>
                </div>

                {/* Seal - Center */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg border-4 border-amber-500">
                    <svg
                      className="w-16 h-16 text-white"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-4.41 0-8-3.59-8-8V8.5l8-4.5 8 4.5V12c0 4.41-3.59 8-8 8z" />
                      <path d="M12 6L6 9v6c0 3.31 2.24 6.41 5 7.17 2.76-.76 5-3.86 5-7.17V9l-6-3zm0 12c-2.76 0-5-2.24-5-5v-3.5l5-2.5 5 2.5V13c0 2.76-2.24 5-5 5z" />
                    </svg>
                  </div>
                </div>

                {/* Rektor - Right */}
                <div className="flex flex-col items-center w-1/3">
                  {rektorSigned ? (
                    <div className="mb-2 bg-white p-1 border border-gray-300">
                      <QRCodeSVG
                        value={rektorQr}
                        size={70}
                        level="H"
                        includeMargin={false}
                      />
                    </div>
                  ) : (
                    <div className="mb-2 h-[74px]"></div>
                  )}ze={70}
                      level="H"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-[10px] font-bold text-gray-800 text-center">
                    {rektorName || "NAMA LENGKAP + GELAR"}
                  </div>
                  <div className="text-[10px] text-gray-600 text-center">
                    NIP. {rektorNip || ""}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
