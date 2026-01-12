import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { DocumentTemplate } from "@/types";
import "@/styles/ijazah-print-normalization.css";

interface IjazahRendererProps {
  // Data ijazah
  nim: string;
  nomorIjazah: string;
  namaMahasiswa: string;
  programStudi?: string;
  fakultas: string;
  gelar: string;
  tanggalTerbit: string;

  // Penandatangan
  dekanName?: string;
  dekanNip?: string;
  dekanJabatan?: string;
  rektorName?: string;
  rektorNip?: string;
  rektorJabatan?: string;

  // Template
  templateId?: string | null;

  // QR codes
  qrCodeUrl?: string;
  dekanQrCode?: string;
  rektorQrCode?: string;

  // Signing status - to control QR code visibility
  dekanSigned?: boolean;
  rektorSigned?: boolean;

  // Render modes for different use cases
  renderMode?: "preview" | "pdf-preview" | "pdf-generation";

  // PDF preview options
  showPageBoundaries?: boolean;
  showPrintMargins?: boolean;
}

export default function IjazahRenderer({
  nim,
  nomorIjazah,
  namaMahasiswa,
  programStudi = "Teknik Informatika",
  fakultas,
  gelar,
  tanggalTerbit,
  dekanName,
  dekanNip,
  dekanJabatan,
  rektorName,
  rektorNip,
  rektorJabatan,
  templateId,
  qrCodeUrl,
  dekanQrCode,
  rektorQrCode,
  dekanSigned = false, // Default to not signed
  rektorSigned = false, // Default to not signed
  renderMode = "preview",
  showPageBoundaries = false,
  showPrintMargins = false,
}: IjazahRendererProps) {
  const [template, setTemplate] = useState<DocumentTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate CSS classes based on render mode
  const getContainerClasses = () => {
    const baseClasses = ["ijazah-print-normalized"];

    switch (renderMode) {
      case "pdf-preview":
        baseClasses.push("ijazah-pdf-preview");
        if (showPageBoundaries) {
          baseClasses.push("ijazah-page-boundaries");
        }
        if (showPrintMargins) {
          baseClasses.push("ijazah-print-margins");
        }
        break;
      case "pdf-generation":
        baseClasses.push("ijazah-pdf-mode", "ijazah-optimized");
        break;
      case "preview":
      default:
        // No additional classes for normal preview
        break;
    }

    return baseClasses.join(" ");
  };

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

  // Parse gelar
  const parseGelar = (gelarInput: string) => {
    const match = gelarInput.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      return { full: match[1].trim(), abbr: match[2].trim() };
    }
    return { full: gelarInput, abbr: gelarInput };
  };

  const { full: gelarFull, abbr: gelarAbbr } = parseGelar(gelar || "");

  // Render custom template with data
  const renderCustomTemplate = () => {
    if (!template) return null;

    let html = template.html_content;

    // Replace placeholders
    const replacements: Record<string, string> = {
      "{{NIM}}": nim || "",
      "{{NOMOR_IJAZAH}}": nomorIjazah || "",
      "{{NAMA_MAHASISWA}}": namaMahasiswa || "",
      "{{PROGRAM_STUDI}}": programStudi || "Teknik Informatika",
      "{{FAKULTAS}}": fakultas || "Fakultas Teknik",
      "{{GELAR_LENGKAP}}": gelarFull,
      "{{GELAR_SINGKATAN}}": gelarAbbr,
      "{{TANGGAL_TERBIT}}": tanggalTerbit
        ? new Date(tanggalTerbit).toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "",
      "{{DEKAN_NAMA}}": dekanName || "",
      "{{DEKAN_NIP}}": dekanNip || "",
      "{{REKTOR_NAMA}}": rektorName || "",
      "{{REKTOR_NIP}}": rektorNip || "",
    };

    Object.entries(replacements).forEach(([placeholder, value]) => {
      html = html.replace(new RegExp(placeholder, "g"), value);
    });

    // Replace QR code placeholders with actual QR codes
    const qrUrl =
      qrCodeUrl || `${window.location.origin}/verify/${nomorIjazah}`;
    html = html.replace(
      /<div class="qr-placeholder">.*?<\/div>/g,
      `<img src="https://api.qrserver.com/v1/create-qr-code/?size=60x60&data=${encodeURIComponent(
        qrUrl
      )}" alt="QR Code" style="width: 60px; height: 60px;" crossorigin="anonymous" />`
    );

    // Create isolated container with CSS reset to prevent conflicts
    const isolatedHtml = `
      <div class="ijazah-custom-template ${getContainerClasses()}">
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
        className={getContainerClasses()}
        style={{
          width: "100%",
          height: "100%",
          isolation: "isolate",
          contain: "layout style",
        }}
      />
    );
  };

  // Default template
  const renderDefaultTemplate = () => {
    const verificationUrl =
      qrCodeUrl || `${window.location.origin}/verify/${nomorIjazah}`;

    return (
      <div
        className={`${getContainerClasses()} ijazah-background relative`}
        style={{
          backgroundImage: "url('/ijazah-background.webp')",
        }}
      >
        <div className="relative h-full flex flex-col ijazah-padding-standard">
          {/* Header - NIM and Nomor Ijazah - POSISI DIPERBAIKI */}
          <div
            className="flex justify-between items-start ijazah-mb-15mm ijazah-mt-20mm"
            style={{ paddingLeft: "20px", paddingRight: "20px" }}
          >
            <div className="ijazah-text-small ijazah-text-secondary font-semibold">
              NIM.{nim}
            </div>
            <div className="ijazah-text-small ijazah-text-secondary font-semibold">
              No: {nomorIjazah}
            </div>
          </div>

          {/* Logo */}
          <div className="ijazah-flex-center ijazah-logo-container">
            <div className="ijazah-mm-25 rounded-full bg-red-600 ijazah-flex-center shadow-lg">
              <img
                src="/logo-umc.png"
                alt="Logo UMC"
                className="ijazah-mm-20 object-contain"
                crossOrigin="anonymous"
                onError={(e) => {
                  const target = e.currentTarget;
                  if (!target.src.includes("/logo-umc.svg")) {
                    target.src = "/logo-umc.svg";
                  } else {
                    target.style.display = "none";
                  }
                }}
              />
            </div>
          </div>

          {/* University Name */}
          <div className="ijazah-text-center ijazah-mb-15mm">
            <div className="ijazah-text-small ijazah-text-secondary font-medium tracking-wider mb-1">
              KEMENTRIAN PENDIDIKAN DAN KEBUDAYAAN
            </div>
            <div className="ijazah-text-large ijazah-text-primary font-bold tracking-wide">
              UNIVERSITAS MUHAMMADIYAH CIREBON
            </div>
            <div
              className="w-3/4 mx-auto h-[2px] ijazah-accent mt-2"
              style={{ backgroundColor: "var(--ijazah-accent-color)" }}
            ></div>
          </div>

          {/* Main Content */}
          <div
            className="flex-1 flex flex-col justify-center ijazah-text-center"
            style={{ paddingLeft: "2rem", paddingRight: "2rem" }}
          >
            <div className="ijazah-text-small ijazah-text-secondary ijazah-mb-15mm">
              Dengan ini kami menyatakan bahwa
            </div>

            {/* Nama Mahasiswa - Script Font */}
            <div className="ijazah-text-name ijazah-text-primary ijazah-mb-15mm">
              {namaMahasiswa}
            </div>

            <div className="ijazah-text-small ijazah-text-secondary mb-2">
              telah berhasil menyelesaikan Program Pendidikan Sarjana
            </div>
            <div className="ijazah-text-base ijazah-text-primary font-semibold mb-2">
              Program Studi {programStudi} pada {fakultas}
            </div>
            <div className="ijazah-text-small ijazah-text-secondary ijazah-mb-15mm">
              Oleh karena itu, kepada yang bersangkutan diberikan ijazah dan
              sebutan
            </div>

            {/* Gelar - Script Font (Full name only) */}
            <div className="ijazah-text-title ijazah-text-primary ijazah-mb-15mm">
              {gelarFull}
            </div>

            <div className="ijazah-text-small ijazah-text-secondary mb-2">
              dengan singkatan {gelarAbbr}
            </div>
            <div className="ijazah-text-small ijazah-text-secondary">
              Beserta segala hak dan wewenang yang melekat pada gelar tersebut
            </div>
            <div className="ijazah-text-small ijazah-text-secondary">
              Diterbitkan di Cirebon pada tanggal{" "}
              {new Date(tanggalTerbit).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          </div>

          {/* Footer - Signatures */}
          <div className="mt-auto ijazah-signature-area">
            <div className="flex justify-between items-end ijazah-relative">
              {/* Dekan - Left */}
              <div className="flex flex-col items-center w-1/3">
                <div className="ijazah-text-small ijazah-text-secondary mb-1">
                  {dekanJabatan || `Dekan`}
                </div>
                <div className="ijazah-text-small ijazah-text-secondary mb-2">
                  {fakultas || "Universitas Muhammadiyah Cirebon"}
                </div>
                {/* Only show QR code if dekan has signed */}
                {dekanSigned && (
                  <div className="mb-2 bg-white p-1 border border-gray-300">
                    <QRCodeSVG
                      value={dekanQrCode || verificationUrl}
                      size={70}
                      level="H"
                      className="ijazah-qr-code"
                    />
                  </div>
                )}
                {!dekanSigned && <div className="mb-2 h-[74px]"></div>}
                {dekanName ? (
                  <>
                    <div className="ijazah-text-small font-bold ijazah-text-primary ijazah-text-center">
                      {dekanName}
                    </div>
                    <div className="ijazah-text-small ijazah-text-secondary ijazah-text-center">
                      NIP. {dekanNip}
                    </div>
                  </>
                ) : (
                  <div className="h-8"></div>
                )}
              </div>

              {/* Seal - Center */}
              <div className="ijazah-absolute left-1/2 -translate-x-1/2 bottom-0">
                <div className="ijazah-mm-25 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 ijazah-flex-center shadow-lg border-4 border-amber-500">
                  <svg
                    className="ijazah-mm-15 text-white"
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
                <div className="ijazah-text-small ijazah-text-secondary mb-1">
                  {rektorJabatan || "Rektor"}
                </div>
                <div className="ijazah-text-small ijazah-text-secondary mb-2">
                  Universitas Muhammadiyah Cirebon
                </div>
                {/* Only show QR code if rektor has signed */}
                {rektorSigned && (
                  <div className="mb-2 bg-white p-1 border border-gray-300">
                    <QRCodeSVG
                      value={rektorQrCode || verificationUrl}
                      size={70}
                      level="H"
                      className="ijazah-qr-code"
                    />
                  </div>
                )}
                {!rektorSigned && <div className="mb-2 h-[74px]"></div>}
                {rektorName ? (
                  <>
                    <div className="ijazah-text-small font-bold ijazah-text-primary ijazah-text-center">
                      {rektorName}
                    </div>
                    <div className="ijazah-text-small ijazah-text-secondary ijazah-text-center">
                      NIP. {rektorNip}
                    </div>
                  </>
                ) : (
                  <div className="h-8"></div>
                )}
              </div>
            </div>
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
