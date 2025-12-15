import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentTemplate } from "@/types";

interface SertifikatRendererProps {
  // Data sertifikat
  nomorSertifikat: string;
  namaPeserta: string;
  namaAcara: string;
  tanggalAcara: string;
  jenisSertifikat?: string;
  penyelenggara?: string;

  // Penandatangan 1 (wajib)
  penandatanganName?: string;
  penandatanganNip?: string;
  penandatanganJabatan?: string;

  // Penandatangan 2 (opsional)
  penandatangan2Name?: string;
  penandatangan2Nip?: string;
  penandatangan2Jabatan?: string;

  // Signing status - untuk kontrol QR code
  signer1Signed?: boolean;
  signer2Signed?: boolean;

  // Template
  templateId?: string | null;

  // QR codes
  qrCodeUrl?: string;

  // Render modes
  renderMode?: "preview" | "pdf-preview" | "pdf-generation";
}

export default function SertifikatRenderer({
  nomorSertifikat,
  namaPeserta,
  namaAcara,
  tanggalAcara,
  jenisSertifikat = "pelatihan",
  penyelenggara = "Universitas Muhammadiyah Cirebon",
  penandatanganName,
  penandatanganNip,
  penandatanganJabatan,
  penandatangan2Name,
  penandatangan2Nip,
  penandatangan2Jabatan,
  signer1Signed = false,
  signer2Signed = false,
  templateId,
  qrCodeUrl,
  renderMode = "preview",
}: SertifikatRendererProps) {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch template if templateId is provided
  useEffect(() => {
    const fetchTemplate = async () => {
      if (!templateId) {
        setTemplate(null);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("document_templates")
          .select("*")
          .eq("id", templateId)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("Error fetching template:", error);
          setTemplate(null);
          return;
        }

        if (data) {
          setTemplate(data as DocumentTemplate);
        } else {
          setTemplate(null);
        }
      } catch (error) {
        console.error("Error fetching template:", error);
        setTemplate(null);
      } finally {
        setLoading(false);
      }
    };

    fetchTemplate();
  }, [templateId]);

  // Format tanggal
  const formatTanggal = (tanggal: string) => {
    if (!tanggal) return "";
    return new Date(tanggal).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Render custom template with data
  const renderCustomTemplate = () => {
    if (!template) return null;

    let html = template.html_content;

    // Replace placeholders
    const replacements: Record<string, string> = {
      "{{nomor_sertifikat}}": nomorSertifikat || "",
      "{{nama_peserta}}": namaPeserta || "",
      "{{nama_acara}}": namaAcara || "",
      "{{tanggal_acara}}": formatTanggal(tanggalAcara),
      "{{jenis_sertifikat}}": jenisSertifikat || "",
      "{{penyelenggara}}": penyelenggara || "",
      // Penandatangan 1
      "{{penandatangan_name}}": penandatanganName || "",
      "{{penandatangan_nip}}": penandatanganNip || "",
      "{{penandatangan_jabatan}}": penandatanganJabatan || "",
      "{{signer1_name}}": penandatanganName || "",
      "{{signer1_nip}}": penandatanganNip || "",
      "{{signer1_jabatan}}": penandatanganJabatan || "",
      // Penandatangan 2
      "{{penandatangan2_name}}": penandatangan2Name || "",
      "{{penandatangan2_nip}}": penandatangan2Nip || "",
      "{{penandatangan2_jabatan}}": penandatangan2Jabatan || "",
      "{{signer2_name}}": penandatangan2Name || "",
      "{{signer2_nip}}": penandatangan2Nip || "",
      "{{signer2_jabatan}}": penandatangan2Jabatan || "",
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      html = html.replace(new RegExp(placeholder, "g"), value);
    });

    // PENTING: Hapus blok signer2 SEBELUM mengganti QR code
    // karena template menggunakan {{qr_code}} yang sama untuk kedua signer
    if (!penandatangan2Name) {
      // Pattern untuk mencocokkan blok signer dengan struktur:
      // <div class="signer">
      //   <div class="qr-container">...</div>
      //   <p class="signer-name">...</p>
      //   <p class="signer-role">...</p>
      //   <p class="signer-institution">...</p>
      // </div>
      const signerBlockRegex =
        /<div\s+class="signer"[^>]*>[\s\S]*?<p\s+class="signer-institution"[^>]*>[^<]*<\/p>\s*<\/div>/gi;
      const signerBlocks = html.match(signerBlockRegex);

      if (signerBlocks && signerBlocks.length > 1) {
        // Hapus blok signer kedua (yang berisi signer2)
        html = html.replace(signerBlocks[1], "");
      }

      // Juga coba pattern alternatif untuk class signer2
      html = html.replace(
        /<div[^>]*class="[^"]*signer2[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        ""
      );
    }

    // Handle QR codes based on signing status
    const qrUrl =
      qrCodeUrl || `${window.location.origin}/verify/${nomorSertifikat}`;
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(
      qrUrl
    )}`;

    // For preview mode, don't show any QR codes
    if (renderMode === "preview") {
      // Remove all QR code containers
      html = html.replace(
        /<div[^>]*class="[^"]*qr-container[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        ""
      );
      html = html.replace(
        /<div[^>]*class="[^"]*qr-box[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
        ""
      );
      // Also remove img tags with qr_code placeholder
      html = html.replace(/{{qr_code}}/g, "");
      html = html.replace(/{{qr_code_1}}/g, "");
      html = html.replace(/{{qr_code_2}}/g, "");
    } else {
      // For PDF generation, show QR codes based on signing status
      // Sekarang hanya ada 1 {{qr_code}} jika tidak ada signer2
      if (signer1Signed) {
        // Replace first occurrence for signer1
        html = html.replace(/{{qr_code}}/, qrImageUrl);
        html = html.replace(/{{qr_code_1}}/g, qrImageUrl);

        // If there's signer2 and they signed, replace second occurrence
        if (penandatangan2Name && signer2Signed) {
          html = html.replace(/{{qr_code}}/g, qrImageUrl);
        } else {
          // Remove remaining qr_code placeholders (for unsigned signer2)
          html = html.replace(/{{qr_code}}/g, "");
        }
      } else {
        // Signer1 not signed - remove all QR codes
        html = html.replace(/{{qr_code}}/g, "");
        html = html.replace(/{{qr_code_1}}/g, "");
      }

      // Handle signer2 specific placeholder
      if (penandatangan2Name && signer2Signed) {
        html = html.replace(/{{qr_code_2}}/g, qrImageUrl);
      } else {
        html = html.replace(/{{qr_code_2}}/g, "");
      }
    }

    // Remove duplicate footer/verification sections if they exist
    // This handles templates that have both signature section and verification footer
    // Remove footer element that contains verification text
    html = html.replace(
      /<footer[^>]*>[\s\S]*?(?:diverifikasi|verifikasi|ca\.umc)[\s\S]*?<\/footer>/gi,
      ""
    );
    // Remove section containing "ID Dokumen" text (verification footer)
    html = html.replace(
      /<section[^>]*>[\s\S]*?ID Dokumen[\s\S]*?<\/section>/gi,
      ""
    );

    // Create isolated container
    const isolatedHtml = `
      <div class="sertifikat-custom-template">
        ${
          template.css_content
            ? `<style scoped>${template.css_content}</style>`
            : ""
        }
        ${html}
      </div>
    `;

    return (
      <div
        dangerouslySetInnerHTML={{ __html: isolatedHtml }}
        style={{
          width: "100%",
          height: "100%",
          isolation: "isolate",
          contain: "layout style",
        }}
      />
    );
  };

  // Default template (fallback)
  const renderDefaultTemplate = () => {
    const verificationUrl =
      qrCodeUrl || `${window.location.origin}/verify/${nomorSertifikat}`;

    return (
      <div
        className="relative w-full bg-white"
        style={{
          aspectRatio: "1.414",
          backgroundImage: "url('/certificate-background.webp')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Content Container */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            top: "60px",
            left: "60px",
            right: "60px",
            bottom: "60px",
            padding: "40px 60px",
          }}
        >
          {/* Header */}
          <div className="text-center mb-5">
            <h1
              className="text-4xl font-bold mb-2"
              style={{
                color: "#B8860B",
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "0.35em",
              }}
            >
              SERTIFIKAT
            </h1>
            <p
              className="text-base mb-3"
              style={{
                color: "#9CA3AF",
                fontFamily: "'Playfair Display', serif",
                letterSpacing: "0.35em",
                fontWeight: 500,
              }}
            >
              PENGHARGAAN
            </p>
            <p
              className="text-xs"
              style={{
                color: "#B8860B",
                fontFamily: "'Times New Roman', serif",
              }}
            >
              No. {nomorSertifikat}
            </p>
          </div>

          {/* Body */}
          <div
            className="text-center flex-1 flex flex-col"
            style={{ maxWidth: "600px" }}
          >
            <p
              className="text-sm mb-1"
              style={{
                color: "#4B5563",
                fontFamily: "'Times New Roman', serif",
              }}
            >
              Dengan rasa hormat dan bangga, kami
            </p>
            <p
              className="text-sm mb-5"
              style={{
                color: "#4B5563",
                fontFamily: "'Times New Roman', serif",
              }}
            >
              menganugerahkan penghargaan ini kepada
            </p>
            <h2
              className="text-5xl mb-5"
              style={{
                color: "#B8860B",
                fontFamily: "'Great Vibes', cursive",
                fontWeight: 400,
              }}
            >
              {namaPeserta}
            </h2>
            <p
              className="text-sm leading-relaxed"
              style={{
                color: "#4B5563",
                fontFamily: "'Times New Roman', serif",
                lineHeight: "1.8",
                maxWidth: "580px",
                margin: "0 auto",
              }}
            >
              Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya
              dalam kegiatan Sosial dan Budaya yang diselenggarakan oleh
              Universitas Muhammadiyah Cirebon dengan tema{" "}
              <strong>{namaAcara}</strong> pada tanggal{" "}
              <strong>{formatTanggal(tanggalAcara)}</strong> di Cirebon. Semoga
              ilmu yang didapat membawa keberkahan dan menjadi amal jariyah.
            </p>
          </div>

          {/* Footer - Signature(s) */}
          <div
            className="w-full flex mt-auto"
            style={{
              justifyContent: penandatangan2Name ? "space-between" : "flex-end",
            }}
          >
            {/* Penandatangan 1 - tampil di kiri jika ada signer2, di kanan jika hanya 1 */}
            <div className="text-center">
              {/* QR code untuk signer1:
                  - Jika hanya 1 penandatangan: tampilkan QR jika signer1Signed
                  - Jika 2 penandatangan: tampilkan QR jika signer1Signed (di kiri)
              */}
              {renderMode !== "preview" && signer1Signed && (
                <div className="flex justify-center mb-2">
                  <div className="border-2 border-gray-800 p-1 bg-white">
                    <QRCodeSVG value={verificationUrl} size={70} level="H" />
                  </div>
                </div>
              )}
              <p
                className="text-sm font-bold underline"
                style={{
                  color: "#000000",
                  fontFamily: "'Times New Roman', serif",
                }}
              >
                {penandatanganName || "Nama Penandatangan"}
              </p>
              <p
                className="text-xs"
                style={{
                  color: "#6B7280",
                  fontFamily: "'Times New Roman', serif",
                }}
              >
                {penandatanganJabatan || "Penandatangan"}
              </p>
              <p
                className="text-xs"
                style={{
                  color: "#B8860B",
                  fontFamily: "'Times New Roman', serif",
                }}
              >
                Universitas Muhammadiyah Cirebon
              </p>
            </div>

            {/* Penandatangan 2 - hanya tampil jika ada nama penandatangan 2 */}
            {penandatangan2Name && (
              <div className="text-center">
                {/* QR code untuk signer2: tampilkan hanya jika signer2Signed */}
                {renderMode !== "preview" && signer2Signed && (
                  <div className="flex justify-center mb-2">
                    <div className="border-2 border-gray-800 p-1 bg-white">
                      <QRCodeSVG value={verificationUrl} size={70} level="H" />
                    </div>
                  </div>
                )}
                <p
                  className="text-sm font-bold underline"
                  style={{
                    color: "#000000",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  {penandatangan2Name}
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "#6B7280",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  {penandatangan2Jabatan || "Penandatangan"}
                </p>
                <p
                  className="text-xs"
                  style={{
                    color: "#B8860B",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  Universitas Muhammadiyah Cirebon
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Memuat template...</p>
      </div>
    );
  }

  // If template exists, render custom template
  if (template) {
    return renderCustomTemplate();
  }

  // Otherwise, render default template
  return renderDefaultTemplate();
}
