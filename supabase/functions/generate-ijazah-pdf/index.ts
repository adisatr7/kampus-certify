import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface IjazahData {
  nim: string;
  nomorIjazah: string;
  namaMahasiswa: string;
  programStudi: string;
  fakultas: string;
  gelar: string;
  tanggalTerbit: string;
  dekanName?: string;
  dekanNip?: string;
  dekanJabatan?: string;
  rektorName?: string;
  rektorNip?: string;
  rektorJabatan?: string;
  nomorSeri?: string;
  id?: string;
}

async function generateIjazahHTML(ijazahData: IjazahData, templateData?: any, documentMetadata?: any): Promise<string> {
  // Parse gelar
  const parseGelar = (gelarInput: string) => {
    const match = gelarInput.match(/^(.+?)\s*\(([^)]+)\)$/);
    if (match) {
      return { full: match[1].trim(), abbr: match[2].trim() };
    }
    return { full: gelarInput, abbr: gelarInput };
  };

  const { full: gelarFull, abbr: gelarAbbr } = parseGelar(ijazahData.gelar);

  // Format tanggal
  const formattedDate = new Date(ijazahData.tanggalTerbit).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Generate QR code images using external service for reliability
  let dekanQrCodeHtml = "";
  let rektorQrCodeHtml = "";
  
  try {
    // Use verification URL as QR content
    const baseUrl = Deno.env.get("WEBSITE_DOMAIN");
    const verificationUrl = `${baseUrl}/verify?id=${ijazahData.nomorSeri || ijazahData.id}`;
    
    // Use QR Server API for reliable QR code generation
    const qrSize = 70;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=`;
    
    dekanQrCodeHtml = `<img src="${qrApiUrl}${encodeURIComponent(verificationUrl)}" alt="QR Code Dekan" width="${qrSize}" height="${qrSize}" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />`;
    rektorQrCodeHtml = `<img src="${qrApiUrl}${encodeURIComponent(verificationUrl)}" alt="QR Code Rektor" width="${qrSize}" height="${qrSize}" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />`;
    
    console.log("✅ QR codes generated using external service");
    console.log("🔗 Verification URL:", verificationUrl);
    console.log("🖼️ Dekan QR HTML:", dekanQrCodeHtml.substring(0, 100) + "...");
    console.log("🖼️ Rektor QR HTML:", rektorQrCodeHtml.substring(0, 100) + "...");
  } catch (error) {
    console.error("Error generating QR codes:", error);
    dekanQrCodeHtml = `<div style="width: 70px; height: 70px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR Code</div>`;
    rektorQrCodeHtml = `<div style="width: 70px; height: 70px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR Code</div>`;
  }

  console.log("QR Code Dekan: ", dekanQrCodeHtml);
  console.log("QR COde Rektor: ", rektorQrCodeHtml);
  // If custom template exists, use it from database
  if (templateData && templateData.html_content) {
    console.log("✅ Using custom template from database:", templateData.name);

    let customHtml = templateData.html_content;

    // Replace placeholders with actual data (case-insensitive)
    const replacements: Record<string, string> = {
      "{{NIM}}": ijazahData.nim || "",
      "{{nim}}": ijazahData.nim || "",
      "{{NOMOR_IJAZAH}}": ijazahData.nomorIjazah || "",
      "{{nomor_ijazah}}": ijazahData.nomorIjazah || "",
      "{{NAMA_MAHASISWA}}": ijazahData.namaMahasiswa || "",
      "{{nama_mahasiswa}}": ijazahData.namaMahasiswa || "",
      "{{PROGRAM_STUDI}}": ijazahData.programStudi || "",
      "{{program_studi}}": ijazahData.programStudi || "",
      "{{FAKULTAS}}": ijazahData.fakultas || "",
      "{{fakultas}}": ijazahData.fakultas || "",
      "{{GELAR_LENGKAP}}": gelarFull,
      "{{gelar_lengkap}}": gelarFull,
      "{{GELAR_SINGKATAN}}": gelarAbbr,
      "{{gelar_singkatan}}": gelarAbbr,
      "{{TANGGAL_TERBIT}}": formattedDate,
      "{{tanggal_terbit}}": formattedDate,
      "{{DEKAN_NAMA}}": ijazahData.dekanName || "",
      "{{dekan_nama}}": ijazahData.dekanName || "",
      "{{DEKAN_NIP}}": ijazahData.dekanNip || "",
      "{{dekan_nip}}": ijazahData.dekanNip || "",
      "{{DEKAN_JABATAN}}": ijazahData.dekanJabatan || "Dekan",
      "{{dekan_jabatan}}": ijazahData.dekanJabatan || "Dekan",
      "{{REKTOR_NAMA}}": ijazahData.rektorName || "",
      "{{rektor_nama}}": ijazahData.rektorName || "",
      "{{REKTOR_NIP}}": ijazahData.rektorNip || "",
      "{{rektor_nip}}": ijazahData.rektorNip || "",
      "{{REKTOR_JABATAN}}": ijazahData.rektorJabatan || "Rektor",
      "{{rektor_jabatan}}": ijazahData.rektorJabatan || "Rektor",
      "{{DEKAN_QR_CODE}}": dekanQrCodeHtml,
      "{{dekan_qr_code}}": dekanQrCodeHtml,
      "{{REKTOR_QR_CODE}}": rektorQrCodeHtml,
      "{{rektor_qr_code}}": rektorQrCodeHtml,
    };

    // Replace all placeholders
    console.log("🔄 Starting placeholder replacement...");
    console.log("📋 Total placeholders to replace:", Object.keys(replacements).length);
    
    Object.entries(replacements).forEach(([placeholder, value]) => {
      const beforeCount = (customHtml.match(new RegExp(placeholder, "g")) || []).length;
      customHtml = customHtml.replace(new RegExp(placeholder, "g"), value);
      const afterCount = (customHtml.match(new RegExp(placeholder, "g")) || []).length;
      
      if (beforeCount > 0) {
        console.log(`✅ Replaced ${beforeCount} instances of ${placeholder}`);
        if (placeholder.includes("QR_CODE")) {
          console.log(`🖼️ QR replacement value: ${value.substring(0, 50)}...`);
        }
      }
    });
    
    // Check if any QR placeholders remain
    const remainingQrPlaceholders = customHtml.match(/\{\{.*QR_CODE.*\}\}/g);
    if (remainingQrPlaceholders) {
      console.warn("⚠️ Remaining QR placeholders:", remainingQrPlaceholders);
    } else {
      console.log("✅ All QR placeholders replaced successfully");
    }

    // Add custom CSS from database if available
    if (templateData.css_content) {
      console.log("✅ Applying custom CSS from database template");
      console.log("📏 CSS content size:", templateData.css_content.length, "bytes");
      
      // Inject CSS into <head> tag
      const hasHeadTag = customHtml.includes("</head>");
      if (hasHeadTag) {
        // Insert before </head> to ensure it's in the head
        customHtml = customHtml.replace(
          "</head>",
          `<style type="text/css">${templateData.css_content}</style>\n</head>`
        );
        console.log("✅ CSS injected into <head> tag");
      } else {
        console.warn("⚠️ No </head> tag found in template HTML");
        // Try to find <body> and inject before it
        if (customHtml.includes("<body")) {
          customHtml = customHtml.replace(
            "<body",
            `<style type="text/css">${templateData.css_content}</style>\n<body`
          );
          console.log("✅ CSS injected before <body> tag");
        } else {
          console.warn("⚠️ Could not find proper injection point for CSS");
        }
      }
    }

    console.log("HTML Is: ", customHtml);
    console.log("✅ Custom template from database processed successfully");
    return customHtml;
  }

  // Fallback - no template found
  console.log("⚠️ No template data provided, using built-in fallback");
  console.log("🔧 Using fallback template with direct QR code injection");
  
  return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ijazah ${ijazahData.namaMahasiswa}</title>
    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes:wght@400&display=swap" rel="stylesheet">
    <style type="text/css">
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        @page {
            size: A4 portrait;
            margin: 0;
        }

        body {
            font-family: 'Times New Roman', Times, serif;
            width: 794px;
            height: 1123px;
            margin: 0;
            padding: 0;
            background-color: white;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .ijazah-container {
            position: relative;
            width: 794px;
            height: 1123px;
            background: linear-gradient(135deg, #d2b48c 0%, #8b4513 100%);
            background-attachment: fixed;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .inner-white-paper {
            position: absolute;
            top: 48px;
            left: 48px;
            right: 48px;
            bottom: 48px;
            background-color: white;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }

        .golden-border {
            position: absolute;
            top: 16px;
            left: 16px;
            right: 16px;
            bottom: 16px;
            border: 3px solid #f59e0b;
        }

        .content {
            position: relative;
            height: 100%;
            display: flex;
            flex-direction: column;
            padding: 32px;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-top: 50px;
            margin-bottom: 24px;
            padding: 0 32px;
        }

        .nim, .nomor-ijazah {
            color: #374151;
            font-weight: 600;
            font-size: 14px;
        }

        .logo-container {
            display: flex;
            justify-content: center;
            margin-bottom: 16px;
        }

        .logo-circle {
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background-color: #dc2626;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }

        .logo-text {
            color: white;
            font-size: 24px;
            font-weight: bold;
        }

        .university-header {
            text-align: center;
            margin-bottom: 24px;
        }

        .ministry {
            color: #6b7280;
            font-size: 12px;
            font-weight: 500;
            letter-spacing: 0.05em;
            margin-bottom: 4px;
        }

        .university-name {
            color: #1f2937;
            font-size: 18px;
            font-weight: bold;
            letter-spacing: 0.025em;
        }

        .divider {
            width: 75%;
            height: 2px;
            background-color: #f59e0b;
            margin: 8px auto 0;
        }

        .main-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            justify-content: center;
            text-align: center;
            padding: 0 32px;
        }

        .statement {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .student-name {
            font-family: 'Great Vibes', 'Brush Script MT', cursive;
            font-size: 60px;
            font-weight: 400;
            line-height: 1.2;
            color: #1f2937;
            margin-bottom: 24px;
        }

        .program-info {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .program-detail {
            color: #374151;
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .degree-statement {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 24px;
        }

        .degree-name {
            font-family: 'Great Vibes', 'Brush Script MT', cursive;
            font-size: 48px;
            font-weight: 400;
            color: #1f2937;
            margin-bottom: 24px;
        }

        .degree-abbr {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .rights-statement {
            color: #6b7280;
            font-size: 14px;
            margin-bottom: 8px;
        }

        .date-statement {
            color: #6b7280;
            font-size: 14px;
        }

        .signatures {
            margin-top: auto;
        }

        .signature-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            position: relative;
        }

        .signature-left, .signature-right {
            display: flex;
            flex-direction: column;
            align-items: center;
            width: 33.333%;
        }

        .signature-title {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 4px;
        }

        .signature-institution {
            font-size: 10px;
            color: #6b7280;
            margin-bottom: 8px;
        }

        .qr-code {
            width: 70px;
            height: 70px;
            background-color: white;
            border: 1px solid #d1d5db;
            margin-bottom: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #6b7280;
        }

        .signature-name {
            font-size: 10px;
            font-weight: bold;
            color: #1f2937;
            text-align: center;
        }

        .signature-nip {
            font-size: 10px;
            color: #6b7280;
            text-align: center;
        }

        .seal {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            bottom: 0;
            width: 96px;
            height: 96px;
            border-radius: 50%;
            background: linear-gradient(135deg, #fbbf24, #f59e0b);
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            border: 4px solid #f59e0b;
        }

        .seal-text {
            color: white;
            font-size: 12px;
            font-weight: bold;
        }

        .qr-code-placeholder {
            width: 70px;
            height: 70px;
            background-color: white;
            border: 1px solid #d1d5db;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            color: #6b7280;
        }

        .qr-code-placeholder img {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div class="ijazah-container">
        <div class="inner-white-paper">
            <div class="golden-border">
                <div class="content">
                    <div class="header">
                        <div class="nim">NIM.${ijazahData.nim}</div>
                        <div class="nomor-ijazah">No: ${ijazahData.nomorIjazah}</div>
                    </div>

                    <div class="logo-container">
                        <div class="logo-circle">
                            <div class="logo-text">UMC</div>
                        </div>
                    </div>

                    <div class="university-header">
                        <div class="ministry">KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN</div>
                        <div class="university-name">UNIVERSITAS MUHAMMADIYAH CIREBON</div>
                        <div class="divider"></div>
                    </div>

                    <div class="main-content">
                        <div class="statement">Dengan ini kami menyatakan bahwa</div>
                        <div class="student-name">${ijazahData.namaMahasiswa}</div>
                        <div class="program-info">telah berhasil menyelesaikan Program Pendidikan Sarjana</div>
                        <div class="program-detail">Program Studi ${ijazahData.programStudi} pada ${ijazahData.fakultas}</div>
                        <div class="degree-statement">Oleh karena itu, kepada yang bersangkutan diberikan ijazah dan sebutan</div>
                        <div class="degree-name">${gelarFull}</div>
                        <div class="degree-abbr">dengan singkatan ${gelarAbbr}</div>
                        <div class="rights-statement">Beserta segala hak dan wewenang yang melekat pada gelar tersebut</div>
                        <div class="date-statement">Diterbitkan di Cirebon pada tanggal ${formattedDate}</div>
                    </div>

                    <div class="signatures">
                        <div class="signature-row">
                            <div class="signature-left">
                                <div class="signature-title">${ijazahData.dekanJabatan || 'Dekan'}</div>
                                <div class="signature-institution">${ijazahData.fakultas || 'Universitas Muhammadiyah Cirebon'}</div>
                                <div class="qr-code" style="margin-bottom: 8px; background: white; padding: 4px; border: 1px solid #d1d5db;">
                                    ${dekanQrCodeHtml}
                                </div>
                                <div class="signature-name">${ijazahData.dekanName || 'NAMA LENGKAP + GELAR'}</div>
                                <div class="signature-nip">NIP. ${ijazahData.dekanNip || ''}</div>
                            </div>

                            <div class="seal">
                                <div class="seal-text">SEAL</div>
                            </div>

                            <div class="signature-right">
                                <div class="signature-title">${ijazahData.rektorJabatan || 'Rektor'}</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code" style="margin-bottom: 8px; background: white; padding: 4px; border: 1px solid #d1d5db;">
                                    ${rektorQrCodeHtml}
                                </div>
                                <div class="signature-name">${ijazahData.rektorName || 'NAMA LENGKAP + GELAR'}</div>
                                <div class="signature-nip">NIP. ${ijazahData.rektorNip || ''}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

</body>
</html>`;
}

async function generateHTMLResponse(htmlContent: string): Promise<string> {
  console.log("🎯 Preparing HTML for browser rendering...");
  console.log("📄 HTML content size:", htmlContent.length, "bytes");
  console.log("HTML Content: ", htmlContent);
  
  // Return HTML as-is for browser to render and convert to PDF
  // Browser will handle print-to-PDF with proper styling
  return htmlContent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { documentId } = await req.json();

    if (!documentId) {
      return new Response(
        JSON.stringify({ error: "Document ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("=== GENERATING IJAZAH PDF WITH PUPPETEER ===");
    console.log("Document ID:", documentId);

    // Fetch document data
    const { data: document, error: docError } = await supabase
      .from("documents")
      .select("*")
      .eq("id", documentId)
      .single();

    if (docError || !document) {
      throw new Error("Document not found");
    }

    // Fetch ijazah data by document_id
    console.log("🔍 Fetching ijazah data for document:", documentId);
    const { data: ijazah, error: ijazahError } = await supabase
      .from("ijazah")
      .select("*")
      .eq("document_id", documentId)
      .single();

    if (ijazahError) {
      console.error("❌ Ijazah fetch error:", ijazahError);
      console.error("Error code:", ijazahError.code);
      console.error("Error message:", ijazahError.message);
      throw new Error(`Ijazah data not found: ${ijazahError.message}`);
    }

    if (!ijazah) {
      throw new Error("Ijazah record is empty");
    }

    console.log("✅ Ijazah data found:", {
      id: ijazah.id,
      nama_mahasiswa: ijazah.nama_mahasiswa,
      nim: ijazah.nim,
    });

    // Fetch template data from database
    let templateData = null;
    if (ijazah.template_id) {
      console.log("🎯 Fetching template from database:", ijazah.template_id);
      const { data: template, error: templateError } = await supabase
        .from("document_templates")
        .select("id, name, html_content, css_content, is_active")
        .eq("id", ijazah.template_id)
        .eq("is_active", true)
        .single();

      if (templateError) {
        console.error("❌ Template fetch error:", templateError);
        console.warn("⚠️ Falling back to default template");
      } else if (template) {
        templateData = template;
        console.log("✅ Template fetched from database:", template.name);
        console.log("📋 Template has HTML:", !!template.html_content);
        console.log("🎨 Template has CSS:", !!template.css_content);
      }
    } else {
      console.warn("⚠️ No template_id in ijazah record, will use default template");
    }
    
    // If no template found, try to get default template
    if (!templateData) {
      console.log("🔍 Fetching default template...");
      const { data: defaultTemplate, error: defaultError } = await supabase
        .from("document_templates")
        .select("id, name, html_content, css_content, is_active")
        .eq("type", "ijazah")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      
      if (!defaultError && defaultTemplate) {
        templateData = defaultTemplate;
        console.log("✅ Using default template from database:", defaultTemplate.name);
      } else {
        console.warn("⚠️ No default template found in database");
      }
    }

    // Fetch dekan and rektor data including jabatan
    const dekanId = ijazah.dekan_id;
    const { data: dekanData } = await supabase
      .from("users")
      .select("name, nip, jabatan")
      .eq("id", dekanId)
      .maybeSingle();

    const rektorId = ijazah.rektor_id;
    const { data: rektorData } = await supabase
      .from("users")
      .select("name, nip, jabatan")
      .eq("id", rektorId)
      .maybeSingle();

    // Prepare ijazah data
    const ijazahData: IjazahData = {
      nim: ijazah.nim,
      nomorIjazah: ijazah.nomor_seri || document.serial || document.id,
      namaMahasiswa: ijazah.nama_mahasiswa,
      programStudi: ijazah.program_studi || "Teknik Informatika",
      fakultas: ijazah.nama_fakultas || "Fakultas Teknik",
      gelar: ijazah.gelar,
      tanggalTerbit: ijazah.tanggal_terbit,
      dekanName: dekanData?.name,
      dekanNip: dekanData?.nip,
      dekanJabatan: dekanData?.jabatan,
      rektorName: rektorData?.name,
      rektorNip: rektorData?.nip,
      rektorJabatan: rektorData?.jabatan,
      nomorSeri: ijazah.nomor_seri,
      id: ijazah.id
    };

    console.log("Ijazah data prepared:", {
      nim: ijazahData.nim,
      nama: ijazahData.namaMahasiswa,
      template: templateData ? templateData.name : "FALLBACK (no template found)",
    });

    // Generate HTML content using template from database
    console.log("🔄 Generating HTML from template...");
    if (templateData) {
      console.log("✅ Using template:", templateData.name);
      console.log("📋 Template HTML size:", templateData.html_content?.length || 0, "bytes");
      console.log("🎨 Template CSS size:", templateData.css_content?.length || 0, "bytes");
    } else {
      console.warn("⚠️ No template available, using built-in fallback");
    }
    const htmlContent = await generateIjazahHTML(ijazahData, templateData, document.metadata);
    
    // Debug: log HTML size
    console.log("📄 Generated HTML size:", htmlContent.length, "bytes");
    console.log("📄 HTML contains styling:", htmlContent.includes("linear-gradient"));

    // Return HTML for browser to render and print to PDF
    console.log("📤 Returning HTML response for browser rendering...");
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  } catch (error) {
    console.error("❌ Error generating PDF:", error);
    console.error("Error type:", error instanceof Error ? error.constructor.name : typeof error);
    console.error("Error message:", error instanceof Error ? error.message : String(error));
    if (error instanceof Error) {
      console.error("Error stack:", error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
