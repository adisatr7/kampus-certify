import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Sertifikat } from "@/types";
import {
  CertificateTemplate,
  DEFAULT_CERTIFICATE_TEMPLATES,
} from "@/types/CertificateTemplate";

interface SertifikatTemplateProps {
  sertifikat: Sertifikat;
  qrValue?: string;
  showQR?: boolean;
  penandatangan1?: { name: string; jabatan?: string };
  penandatangan2?: { name: string; jabatan?: string };
  templateId?: string;
}

export function SertifikatTemplate({
  sertifikat,
  qrValue,
  showQR = true,
  penandatangan1,
  penandatangan2,
  templateId,
}: SertifikatTemplateProps) {
  const qrRef1 = useRef<HTMLCanvasElement>(null);
  const qrRef2 = useRef<HTMLCanvasElement>(null);
  const [template, setTemplate] = useState<CertificateTemplate>(
    DEFAULT_CERTIFICATE_TEMPLATES[0]
  );

  // Load template based on templateId
  useEffect(() => {
    // Priority: templateId prop > sertifikat.template_id > default
    const idToUse = templateId || sertifikat.template_id || "default";

    console.log("Template selection:", {
      templateId,
      sertifikatTemplateId: sertifikat.template_id,
      idToUse,
    });

    const foundTemplate = DEFAULT_CERTIFICATE_TEMPLATES.find(
      (t) => t.id === idToUse
    );

    if (foundTemplate) {
      console.log("Template found:", foundTemplate.name);
      setTemplate(foundTemplate);
    } else {
      console.warn(`Template ${idToUse} not found, using default`);
      // Fallback to first template (default) if not found
      setTemplate(DEFAULT_CERTIFICATE_TEMPLATES[0]);
    }
  }, [templateId, sertifikat.template_id]);

  useEffect(() => {
    if (showQR && qrValue) {
      if (qrRef1.current) {
        QRCode.toCanvas(qrRef1.current, qrValue, { width: 80 });
      }
      if (qrRef2.current) {
        QRCode.toCanvas(qrRef2.current, qrValue, { width: 80 });
      }
    }
  }, [showQR, qrValue]);

  // Generate background URL from template
  const backgroundUrl = template.background_url.startsWith("http")
    ? template.background_url
    : `${import.meta.env.BASE_URL || "/"}${template.background_url.replace(
        /^\//,
        ""
      )}`;

  // Debug: log template info
  useEffect(() => {
    console.log("Certificate template:", template.name);
    console.log("Certificate background URL:", backgroundUrl);
    console.log("Template object:", template);
  }, [template, backgroundUrl]);

  return (
    <div
      className="relative w-full bg-white print:bg-white"
      style={{
        aspectRatio: "1.414",
        backgroundColor: "#f5f5f0", // Fallback background color - light cream
      }}
    >
      {/* Decorative Corner - Top Left */}
      <div className="absolute top-0 left-0 w-48 h-48 pointer-events-none z-20">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Multiple golden lines forming corner decoration */}
          <line
            x1="10"
            y1="10"
            x2="150"
            y2="10"
            stroke="#B8860B"
            strokeWidth="3"
          />
          <line
            x1="10"
            y1="10"
            x2="10"
            y2="150"
            stroke="#B8860B"
            strokeWidth="3"
          />
          <line
            x1="10"
            y1="20"
            x2="140"
            y2="20"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="20"
            y1="10"
            x2="20"
            y2="140"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="10"
            y1="30"
            x2="130"
            y2="30"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="30"
            y1="10"
            x2="30"
            y2="130"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="10"
            y1="40"
            x2="120"
            y2="40"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="40"
            y1="10"
            x2="40"
            y2="120"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="10"
            y1="50"
            x2="110"
            y2="50"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="50"
            y1="10"
            x2="50"
            y2="110"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Decorative Corner - Bottom Right */}
      <div className="absolute bottom-0 right-0 w-48 h-48 pointer-events-none z-20">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          {/* Multiple golden lines forming corner decoration */}
          <line
            x1="190"
            y1="190"
            x2="50"
            y2="190"
            stroke="#B8860B"
            strokeWidth="3"
          />
          <line
            x1="190"
            y1="190"
            x2="190"
            y2="50"
            stroke="#B8860B"
            strokeWidth="3"
          />
          <line
            x1="190"
            y1="180"
            x2="60"
            y2="180"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="180"
            y1="190"
            x2="180"
            y2="60"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="190"
            y1="170"
            x2="70"
            y2="170"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="170"
            y1="190"
            x2="170"
            y2="70"
            stroke="#B8860B"
            strokeWidth="2"
          />
          <line
            x1="190"
            y1="160"
            x2="80"
            y2="160"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="160"
            y1="190"
            x2="160"
            y2="80"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="190"
            y1="150"
            x2="90"
            y2="150"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
          <line
            x1="150"
            y1="190"
            x2="150"
            y2="90"
            stroke="#B8860B"
            strokeWidth="1.5"
          />
        </svg>
      </div>

      {/* Golden Border */}
      <div className="absolute inset-4 border-4 border-[#B8860B] pointer-events-none z-10" />
      <div className="absolute inset-6 border border-[#B8860B] pointer-events-none z-10" />

      {/* Content Container */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center px-16 py-12 z-10"
        style={{
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact",
        }}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-6xl font-bold mb-2"
            style={{
              color: "#B8860B",
              fontFamily: "'Playfair Display', serif",
              letterSpacing: "0.3em",
              fontWeight: 700,
            }}
          >
            SERTIFIKAT
          </h1>
          <p
            className="text-2xl mb-4"
            style={{
              color: "#6B7280",
              fontFamily: "'Playfair Display', serif",
              letterSpacing: "0.4em",
              fontWeight: 500,
            }}
          >
            PENGHARGAAN
          </p>
          <p
            className="text-sm"
            style={{
              color: "#4B5563",
              fontFamily: "'Times New Roman', serif",
            }}
          >
            No. {sertifikat.nomor_sertifikat}
          </p>
        </div>

        {/* Body */}
        <div className="text-center max-w-4xl mb-10">
          <p
            className="text-base mb-2"
            style={{
              color: "#4B5563",
              fontFamily: "'Times New Roman', serif",
              lineHeight: "1.6",
            }}
          >
            Dengan rasa hormat dan bangga, kami
          </p>
          <p
            className="text-base mb-8"
            style={{
              color: "#4B5563",
              fontFamily: "'Times New Roman', serif",
              lineHeight: "1.6",
            }}
          >
            menganugerahkan penghargaan ini kepada
          </p>
          <h2
            className="text-6xl font-bold mb-10"
            style={{
              color: "#B8860B",
              fontFamily: "'Great Vibes', 'Brush Script MT', cursive",
              fontWeight: 400,
            }}
          >
            {sertifikat.nama_peserta}
          </h2>
          <p
            className="text-base leading-relaxed max-w-3xl mx-auto"
            style={{
              color: "#4B5563",
              fontFamily: "'Times New Roman', serif",
              lineHeight: "1.8",
            }}
          >
            Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya
            dalam kegiatan Sosial dan Budaya yang diselenggarakan oleh
            Universitas Muhammadiyah Cirebon dengan tema{" "}
            <strong>{sertifikat.nama_acara}</strong> pada tanggal{" "}
            <strong>
              {new Date(sertifikat.tanggal_acara).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </strong>{" "}
            di Cirebon. Semoga ilmu yang didapat membawa keberkahan dan menjadi
            amal jariyah.
          </p>
        </div>

        {/* Footer - Signatures */}
        <div className="w-full max-w-5xl mt-auto">
          <div className="grid grid-cols-2 gap-24 px-8">
            {/* Penandatangan 1 */}
            {penandatangan1 && (
              <div className="text-center">
                {showQR && qrValue && (
                  <div className="flex justify-center mb-3">
                    <div className="border-2 border-gray-800 p-1">
                      <canvas ref={qrRef1} />
                    </div>
                  </div>
                )}
                <p
                  className="text-sm mb-1"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  Nama Lengkap + Gelar
                </p>
                <p
                  className="text-sm mb-1"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  NIP
                </p>
                <p
                  className="text-base font-bold mt-2 underline"
                  style={{
                    color: "#000000",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  {penandatangan1.name}
                </p>
                <p
                  className="text-sm italic"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  Penandatangan 1
                </p>
              </div>
            )}

            {/* Penandatangan 2 */}
            {penandatangan2 && (
              <div className="text-center">
                {showQR && qrValue && (
                  <div className="flex justify-center mb-3">
                    <div className="border-2 border-gray-800 p-1">
                      <canvas ref={qrRef2} />
                    </div>
                  </div>
                )}
                <p
                  className="text-sm mb-1"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  Nama Lengkap + Gelar
                </p>
                <p
                  className="text-sm mb-1"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  NIP
                </p>
                <p
                  className="text-base font-bold mt-2 underline"
                  style={{
                    color: "#000000",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  {penandatangan2.name}
                </p>
                <p
                  className="text-sm italic"
                  style={{
                    color: "#4B5563",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  Penandatangan 2
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
