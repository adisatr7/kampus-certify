import { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
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

  // Load file-based template as fallback
  const loadFileTemplate = async () => {
    try {
      const response = await fetch("/templates/sertifikat-template.html");
      if (response.ok) {
        const html = await response.text();
        return {
          id: "file-based",
          name: "File Template",
          type: "sertifikat",
          html_content: html,
          css_content: null,
          created_by: "",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_active: true,
        } as any;
      }
    } catch (err) {
      console.error("Error loading file template:", err);
    }
    return null;
  };

  // Fetch template if templateId is provided, fallback to file template
  useEffect(() => {
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        // If no templateId, use file template
        if (!templateId) {
          console.log("📝 No templateId provided, loading file template...");
          const fileTemplate = await loadFileTemplate();
          setTemplate(fileTemplate);
          setLoading(false);
          return;
        }

        console.log("🔍 Fetching template from DB with ID:", templateId);

        // Try to fetch from database
        const { data, error } = await supabase
          .from("document_templates")
          .select("*")
          .eq("id", templateId)
          .eq("is_active", true)
          .maybeSingle();

        if (error) {
          console.error("❌ Error fetching template from DB:", error);
          const fileTemplate = await loadFileTemplate();
          setTemplate(fileTemplate);
          return;
        }

        if (data) {
          console.log("✅ Template loaded successfully:", data.name);
          setTemplate(data as DocumentTemplate);
        } else {
          console.warn(
            "⚠️ Template not found in DB (ID:",
            templateId,
            "), using file fallback"
          );
          const fileTemplate = await loadFileTemplate();
          setTemplate(fileTemplate);
        }
      } catch (error) {
        console.error("Error in template fetch:", error);
        const fileTemplate = await loadFileTemplate();
        setTemplate(fileTemplate);
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

  // Helper: Generate QR code as data URL using canvas
  const generateQRDataUrl = async (text: string): Promise<string> => {
    try {
      // Use QRCodeCanvas ref to render into a temporary canvas
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context");

      // Create a temporary container for QRCodeCanvas
      const tempDiv = document.createElement("div");
      tempDiv.style.position = "fixed";
      tempDiv.style.left = "-9999px";
      tempDiv.style.top = "0";
      document.body.appendChild(tempDiv);

      // Create a temporary QR code canvas
      const tempCanvas = document.createElement("canvas");
      tempDiv.appendChild(tempCanvas);

      // Use QRCode library directly (same as QRCodeCanvas uses internally)
      const QRCode = (window as any).QRCode;
      if (QRCode && QRCode.toCanvas) {
        await QRCode.toCanvas(tempCanvas, text, {
          width: 200,
          margin: 2,
          color: { dark: "#000", light: "#fff" },
        });
        const dataUrl = tempCanvas.toDataURL("image/png");
        tempDiv.remove();
        return dataUrl;
      } else {
        // Fallback: use external QR service as last resort
        console.warn(
          "QRCode library not available, falling back to external service"
        );
        const dataUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
          text
        )}`;
        tempDiv.remove();
        return dataUrl;
      }
    } catch (err) {
      console.error("Error generating QR code:", err);
      // Fallback to external service
      return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
        text
      )}`;
    }
  };

  // Render custom template with data
  const renderCustomTemplate = () => {
    if (!template) return null;

    let html = template.html_content;
    const isPreview = renderMode === "preview";

    console.log("=== TEMPLATE LOADED DEBUG ===");
    console.log("Template ID:", template.id);
    console.log("Template name:", template.name);
    console.log("HTML length:", html.length);
    console.log("First 500 chars:", html.substring(0, 500));
    console.log("Contains {{qr_code_1}}:", html.includes("{{qr_code_1}}"));
    console.log(
      'Contains <div class="signer">:',
      html.includes('<div class="signer">')
    );
    console.log("=== END TEMPLATE DEBUG ===");

    // Replace placeholders teks dasar
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
      "{{universitas_1}}": penandatanganName
        ? "Universitas Muhammadiyah Cirebon"
        : "",
      "{{universitas_2}}": penandatangan2Name
        ? "Universitas Muhammadiyah Cirebon"
        : "",
    };

    // PENTING: Handle signer blocks SEBELUM mengganti placeholder teks
    // Ini memastikan kita bisa mendeteksi blok signer2 berdasarkan placeholder
    if (!penandatangan2Name) {
      // Hanya 1 penandatangan - hapus blok signer2 yang mengandung {{signer2_name}}
      console.log("=== REMOVING SIGNER2 BLOCK ===");
      console.log("penandatangan2Name:", penandatangan2Name);

      // Strategy: Match all div.signer blocks and only remove the ones with signer2 placeholders
      const signerBlockMatches =
        html.match(/<div\s+class="signer"[^>]*>[\s\S]*?<\/div>/gi) || [];

      console.log(`Found ${signerBlockMatches.length} signer blocks total`);

      let removedCount = 0;
      signerBlockMatches.forEach((block, index) => {
        console.log(`\n--- Block ${index + 1} ---`);
        console.log(
          "Contains signer2_name:",
          block.includes("{{signer2_name}}")
        );
        console.log(
          "Contains signer1_name:",
          block.includes("{{signer1_name}}")
        );

        // Check if this block contains signer2 references
        const hasSigner2 =
          block.includes("{{signer2_name}}") ||
          block.includes("{{signer2_jabatan}}") ||
          block.includes("{{signer2_nip}}");

        if (hasSigner2) {
          console.log(`✓ Removing signer2 block ${index + 1}`);
          html = html.replace(block, "");
          removedCount++;
        }
      });

      console.log(`Total removed: ${removedCount} blocks`);
      console.log("=== END SIGNER2 REMOVAL ===\n");
    } else {
      // Ada 2 penandatangan - tambahkan class two-signers ke footer
      console.log("Two signers detected, adding two-signers class");
      html = html.replace(
        /<div\s+class="footer"([^>]*)>/gi,
        '<div class="footer two-signers"$1>'
      );
    }

    // Sekarang ganti placeholder dengan nilai
    Object.entries(replacements).forEach(([placeholder, value]) => {
      html = html.replace(new RegExp(placeholder, "g"), value);
    });

    // Khusus mode preview: hilangkan elemen yang berisi placeholder QR
    // supaya tampilan tidak menampilkan icon gambar rusak / kotak kosong
    if (isPreview) {
      // Hapus blok qr-container jika ada
      html = html.replace(/<div\s+class="qr-container"[\s\S]*?<\/div>/gi, "");

      // Untuk jaga-jaga, hapus juga <img> yang masih memakai {{qr_code...}}
      html = html.replace(/<img[^>]*\{\{qr_code[^>]*>/gi, "");
    }

    // Untuk preview, kita biarkan layout template apa adanya.
    // QR code, footer verifikasi, dan CSS override hanya diperlukan
    // untuk mode selain preview (misalnya saat generate PDF).
    let footerOverrideCSS = "";

    if (!isPreview) {
      // Handle QR codes - Generate as data URL (embedded in HTML)
      const qrUrl =
        qrCodeUrl || `${window.location.origin}/verify/${nomorSertifikat}`;

      console.log("=== QR CODE GENERATION DEBUG ===");
      console.log("qrCodeUrl prop:", qrCodeUrl);
      console.log("nomorSertifikat:", nomorSertifikat);
      console.log("Final qrUrl:", qrUrl);

      // Use external QR image URL (disederhanakan, cukup 1 URL untuk semua QR)
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(
        qrUrl
      )}`;

      console.log("Generated qrImageUrl:", qrImageUrl);
      console.log("=== END QR CODE DEBUG ===");

      const anySignerSigned = signer1Signed || signer2Signed;

      // Replace QR placeholders dengan mempertimbangkan status tanda tangan
      console.log(
        "Before QR replacement - html.includes qr_code_1:",
        html.includes("{{qr_code_1}}")
      );

      // Placeholder generik {{qr_code}}: hanya tampil jika minimal ada satu tanda tangan
      html = html.replace(/{{qr_code}}/g, anySignerSigned ? qrImageUrl : "");

      // Placeholder QR signer 1
      html = html.replace(/{{qr_code_1}}/g, signer1Signed ? qrImageUrl : "");

      // Placeholder QR signer 2
      if (penandatangan2Name) {
        console.log(
          "Replacing signer2 QR code with signing status consideration..."
        );
        html = html.replace(/{{qr_code_2}}/g, signer2Signed ? qrImageUrl : "");
      } else {
        console.log("No signer2, removing qr_code_2 placeholder");
        html = html.replace(/{{qr_code_2}}/g, "");
      }

      // Jika template tidak punya placeholder QR sama sekali, inject QR
      // hanya untuk signer yang sudah menandatangani.
      if (!html.includes("api.qrserver.com") && !html.includes("{{qr_code}}")) {
        const qrHtml = `<div style="display: flex; justify-content: center; margin-bottom: 10px;"><div style="border: 2px solid #333; padding: 4px; background: white;"><img src="${qrImageUrl}" alt="QR Code" style="width: 70px; height: 70px; display: block;" /></div></div>`;

        let signerIndex = 0;
        html = html.replace(/<div\s+class="signer"[^>]*>/g, (match) => {
          signerIndex += 1;
          const shouldShowQr =
            (signerIndex === 1 && signer1Signed) ||
            (signerIndex === 2 && signer2Signed);
          return shouldShowQr ? match + qrHtml : match;
        });
      }

      // Remove duplicate footer/verification sections if they exist
      // Ini hanya untuk output final, bukan preview
      html = html.replace(
        /<footer[^>]*>[\s\S]*?(?:diverifikasi|verifikasi|ca\.umc)[\s\S]*?<\/footer>/gi,
        ""
      );
      html = html.replace(
        /<section[^>]*>[\s\S]*?ID Dokumen[\s\S]*?<\/section>/gi,
        ""
      );

      // CSS override untuk posisi penandatangan
      footerOverrideCSS = `
        .footer {
          justify-content: ${
            penandatangan2Name ? "space-between" : "flex-end"
          } !important;
          display: flex !important;
          flex-direction: row !important;
          flex-wrap: nowrap !important;
          align-items: flex-start !important;
          width: 100% !important;
          gap: 20px !important;
        }
        .footer > .signer,
        .footer > div {
          flex: 0 0 auto !important;
          text-align: center !important;
          display: flex !important;
          flex-direction: column !important;
          align-items: center !important;
        }
        .signer {
          text-align: center !important;
        }
        .signer-name, .signer-role, .signer-nip, .signer-institution {
          display: block !important;
          width: 100% !important;
        }
        ${
          !penandatangan2Name
            ? `
          /* Sembunyikan blok signer kedua jika tidak ada penandatangan 2 */
          .footer .signer:nth-child(2),
          .footer > div:nth-child(2),
          .footer .signer:last-child:not(:first-child),
          .footer > div:last-child:not(:first-child) {
            display: none !important;
          }
        `
            : ""
        }
      `;
    }

    // Create isolated container
    const isolatedHtml = `
      <div class="sertifikat-custom-template">
        ${
          template.css_content
            ? `<style scoped>${template.css_content}</style>`
            : ""
        }
        ${footerOverrideCSS ? `<style>${footerOverrideCSS}</style>` : ""}
        ${html}
      </div>
    `;

    console.log("Rendered custom template HTML:", isolatedHtml);

    return (
      <div
        dangerouslySetInnerHTML={{ __html: isolatedHtml }}
        style={{
          width: "1024px",
          aspectRatio: "1.414",
          isolation: "isolate",
          contain: "layout style",
          margin: "0 auto",
          backgroundColor: "#fff",
        }}
      />
    );
  };

  // Default template (fallback)
  const renderDefaultTemplate = () => {
    const verificationUrl =
      qrCodeUrl || `${window.location.origin}/verify/${nomorSertifikat}`;

    // Debug: log signing status
    console.log(
      "renderDefaultTemplate - signer1Signed:",
      signer1Signed,
      "signer2Signed:",
      signer2Signed,
      "penandatangan2Name:",
      penandatangan2Name,
      "renderMode:",
      renderMode
    );

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
            {/* Penandatangan 1 - tampil di kiri atau kanan (sesuai jumlah signer) */}
            <div className="text-center">
              {/* QR code untuk signer1 (qr_code_1):
                  - Tampilkan HANYA jika signer1Signed
                  - Tampilkan placeholder di preview mode
              */}
              {signer1Signed && (
                <div className="flex justify-center mb-2">
                  <div
                    className="border-2 border-gray-800 p-1 bg-white"
                    style={{ display: "inline-block" }}
                  >
                    <QRCodeCanvas
                      value={verificationUrl}
                      size={70}
                      level="H"
                      includeMargin={true}
                    />
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
              {penandatanganNip && (
                <p
                  className="text-xs"
                  style={{
                    color: "#000000",
                    fontFamily: "'Times New Roman', serif",
                  }}
                >
                  NIK. {penandatanganNip}
                </p>
              )}
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
                {/* QR code untuk signer2 (qr_code_2):
                    - Tampilkan HANYA jika signer2Signed
                    - Tampilkan placeholder di preview mode
                */}
                {signer2Signed && (
                  <div className="flex justify-center mb-2">
                    <div
                      className="border-2 border-gray-800 p-1 bg-white"
                      style={{ display: "inline-block" }}
                    >
                      <QRCodeCanvas
                        value={verificationUrl}
                        size={70}
                        level="H"
                        includeMargin={true}
                      />
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
                {penandatangan2Nip && (
                  <p
                    className="text-xs"
                    style={{
                      color: "#000000",
                      fontFamily: "'Times New Roman', serif",
                    }}
                  >
                    NIK. {penandatangan2Nip}
                  </p>
                )}
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

  // Debug: log template status
  console.log(
    "SertifikatRenderer - templateId:",
    templateId,
    "template:",
    template ? "loaded" : "null",
    "penandatangan2Name:",
    penandatangan2Name,
    "renderMode:",
    renderMode
  );

  // Gunakan custom template jika ada, jika tidak gunakan default
  if (template) {
    return renderCustomTemplate();
  }
  return renderDefaultTemplate();
}
