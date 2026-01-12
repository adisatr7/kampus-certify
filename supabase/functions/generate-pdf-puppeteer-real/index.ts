import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import puppeteer from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

// CORS headers
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
  rektorName?: string;
  rektorNip?: string;
}

async function generateIjazahHTML(ijazahData: IjazahData, qrCodeUrl: string, templateData?: any): Promise<string> {
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

  // If custom template exists, use it
  if (templateData && templateData.html_content) {
    console.log("✅ Using custom template:", templateData.name);
    
    let customHtml = templateData.html_content;
    
    // Replace placeholders with actual data (case-insensitive)
    const replacements: Record<string, string> = {
      "{{NIM}}": ijazahData.nim || "",
      "{{nim}}": ijazahData.nim || "",
      "{{NOMOR_IJAZAH}}": ijazahData.nomorIjazah || "",
      "{{nomor_ijazah}}": ijazahData.nomorIjazah || "",
      "{{NAMA_MAHASISWA}}": ijazahData.namaMahasiswa || "",
      "{{nama_mahasiswa}}": ijazahData.namaMahasiswa || "",
      "{{PROGRAM_STUDI}}": ijazahData.programStudi || "Teknik Informatika",
      "{{program_studi}}": ijazahData.programStudi || "Teknik Informatika",
      "{{FAKULTAS}}": ijazahData.fakultas || "Fakultas Teknik",
      "{{fakultas}}": ijazahData.fakultas || "Fakultas Teknik",
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
      "{{REKTOR_NAMA}}": ijazahData.rektorName || "",
      "{{rektor_nama}}": ijazahData.rektorName || "",
      "{{REKTOR_NIP}}": ijazahData.rektorNip || "",
      "{{rektor_nip}}": ijazahData.rektorNip || "",
    };

    // Replace all placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      customHtml = customHtml.replace(new RegExp(placeholder, "g"), value);
    });

    // Add custom CSS if available
    if (templateData.css_content) {
      console.log("✅ Applying custom CSS from template");
      const hasHeadTag = customHtml.includes("</head>");
      if (hasHeadTag) {
        customHtml = customHtml.replace(
          "</head>",
          `<style>${templateData.css_content}</style></head>`
        );
      } else {
        console.warn("⚠️ No </head> tag found, appending CSS to body");
        customHtml = customHtml.replace(
          "</body>",
          `<style>${templateData.css_content}</style></body>`
        );
      }
    } else {
      console.warn("⚠️ No CSS content in template");
    }

    // Replace QR code placeholders with actual QR codes
    customHtml = customHtml.replace(
      /<div class="qr-placeholder">.*?<\/div>/g,
      `<div style="width: 70px; height: 70px; background: white; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; font-size: 8px;">QR Code</div>`
    );

    console.log("✅ Custom template processed successfully");
    return customHtml;
  }

  console.log("Using default template");

  // Default template with improved positioning
  return `
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ijazah ${ijazahData.namaMahasiswa}</title>
    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes:wght@400&display=swap" rel="stylesheet">
    <style>
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
    </style>
</head>
<body>
    <div class="ijazah-container">
        <div class="inner-white-paper">
            <div class="golden-border">
                <div class="content">
                    <!-- Header - POSISI SUDAH DIPERBAIKI -->
                    <div class="header">
                        <div class="nim">NIM.${ijazahData.nim}</div>
                        <div class="nomor-ijazah">No: ${ijazahData.nomorIjazah}</div>
                    </div>

                    <!-- Logo -->
                    <div class="logo-container">
                        <div class="logo-circle">
                            <div class="logo-text">UMC</div>
                        </div>
                    </div>

                    <!-- University Header -->
                    <div class="university-header">
                        <div class="ministry">KEMENTERIAN PENDIDIKAN DAN KEBUDAYAAN</div>
                        <div class="university-name">UNIVERSITAS MUHAMMADIYAH CIREBON</div>
                        <div class="divider"></div>
                    </div>

                    <!-- Main Content -->
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

                    <!-- Signatures -->
                    <div class="signatures">
                        <div class="signature-row">
                            <!-- Dekan - Left -->
                            <div class="signature-left">
                                <div class="signature-title">Dekan ${ijazahData.fakultas}</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code">QR Dekan</div>
                                <div class="signature-name">${ijazahData.dekanName || 'NAMA LENGKAP + GELAR'}</div>
                                <div class="signature-nip">NIP. ${ijazahData.dekanNip || ''}</div>
                            </div>

                            <!-- Seal - Center -->
                            <div class="seal">
                                <div class="seal-text">SEAL</div>
                            </div>

                            <!-- Rektor - Right -->
                            <div class="signature-right">
                                <div class="signature-title">Rektor</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code">QR Rektor</div>
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

async function generatePDFWithPuppeteer(htmlContent: string): Promise<Uint8Array> {
  // Use Puppeteer to generate PDF from HTML with proper styling
  console.log("🎯 Starting Puppeteer PDF generation...");
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu'
      ]
    });
    
    console.log("✅ Browser launched");
    
    const page = await browser.newPage();
    
    // Set viewport to A4 size
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2
    });
    
    console.log("✅ Page created with A4 viewport");
    
    // Set content with HTML
    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log("✅ HTML content set");
    
    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });
    
    console.log("✅ PDF generated successfully, size:", pdfBuffer.length, "bytes");
    
    await page.close();
    return new Uint8Array(pdfBuffer);
    
  } catch (error) {
    console.error("❌ Puppeteer PDF generation failed:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("✅ Browser closed");
    }
  }
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

    console.log("=== GENERATING DYNAMIC TEMPLATE IJAZAH PDF WITH PUPPETEER ===");
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

    // Check if it's an ijazah document
    const isIjazahDoc = document.title?.toLowerCase().includes("ijazah");
    if (!isIjazahDoc) {
      throw new Error("Only ijazah documents are supported");
    }

    // Fetch ijazah data
    const { data: ijazah, error: ijazahError } = await supabase
      .from("ijazah")
      .select("*")
      .eq("document_id", documentId)
      .single();

    if (ijazahError || !ijazah) {
      throw new Error("Ijazah data not found");
    }

    // Fetch template data if template_id exists
    let templateData = null;
    if (ijazah.template_id) {
      console.log("🎯 Fetching custom template:", ijazah.template_id);
      const { data: template, error: templateError } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", ijazah.template_id)
        .eq("is_active", true)
        .single();

      if (templateError) {
        console.warn("⚠️ Template not found, using default:", templateError);
      } else {
        templateData = template;
        console.log("✅ Using custom template:", template.name);
        console.log("📋 Template has HTML:", !!template.html_content);
        console.log("🎨 Template has CSS:", !!template.css_content);
      }
    } else {
      console.log("⚠️ No template_id specified, using default template");
    }

    // Fetch dekan and rektor data
    const metadata = document.metadata || {};
    const dekanId = ijazah.dekan_id || metadata.dekan_id;
    const { data: dekanData } = await supabase
      .from("users")
      .select("name, nip")
      .eq("id", dekanId)
      .maybeSingle();
    
    const rektorId = ijazah.rektor_id || metadata.rektor_id;
    const { data: rektorData } = await supabase
      .from("users")
      .select("name, nip")
      .eq("id", rektorId)
      .maybeSingle();

    // Prepare ijazah data
    const ijazahData: IjazahData = {
      nim: ijazah.nim,
      nomorIjazah: ijazah.nomor_seri || document.serial || document.id,
      namaMahasiswa: ijazah.nama_mahasiswa,
      programStudi: "Teknik Informatika",
      fakultas: ijazah.nama_fakultas,
      gelar: ijazah.gelar,
      tanggalTerbit: ijazah.tanggal_terbit,
      dekanName: dekanData?.name,
      dekanNip: dekanData?.nip,
      rektorName: rektorData?.name,
      rektorNip: rektorData?.nip,
    };

    console.log("Ijazah data prepared:", {
      nim: ijazahData.nim,
      nama: ijazahData.namaMahasiswa,
      template: templateData ? templateData.name : "Default Template"
    });

    // Generate verification URL
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://ca.umc";
    const qrContent = `${baseUrl}/verify?id=${document.serial || document.id}`;

    // Generate HTML content with dynamic template
    const htmlContent = await generateIjazahHTML(ijazahData, qrContent, templateData);

    // Generate PDF (in production, this would use actual Puppeteer)
    const pdfBytes = await generatePDFWithPuppeteer(htmlContent);

    console.log("✅ Dynamic template PDF generated successfully");

    // Return PDF bytes
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${ijazahData.namaMahasiswa}_ijazah.pdf"`,
      },
    });

  } catch (error) {
    console.error("❌ Error generating dynamic template PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});