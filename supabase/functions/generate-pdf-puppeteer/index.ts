import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
    console.log("Using custom template:", templateData.name);
    
    let customHtml = templateData.html_content;
    
    // Generate QR code HTML for custom templates
    const qrSize = 70;
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=`;
    const dekanQrCodeHtml = `<img src="${qrApiUrl}${encodeURIComponent(qrContent)}" alt="QR Code Dekan" width="${qrSize}" height="${qrSize}" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />`;
    const rektorQrCodeHtml = `<img src="${qrApiUrl}${encodeURIComponent(qrContent)}" alt="QR Code Rektor" width="${qrSize}" height="${qrSize}" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />`;

    // Replace placeholders with actual data
    const replacements: Record<string, string> = {
      "{{NIM}}": ijazahData.nim || "",
      "{{NOMOR_IJAZAH}}": ijazahData.nomorIjazah || "",
      "{{NAMA_MAHASISWA}}": ijazahData.namaMahasiswa || "",
      "{{PROGRAM_STUDI}}": ijazahData.programStudi || "Teknik Informatika",
      "{{FAKULTAS}}": ijazahData.fakultas || "Fakultas Teknik",
      "{{GELAR_LENGKAP}}": gelarFull,
      "{{GELAR_SINGKATAN}}": gelarAbbr,
      "{{TANGGAL_TERBIT}}": formattedDate,
      "{{DEKAN_NAMA}}": ijazahData.dekanName || "",
      "{{DEKAN_NIP}}": ijazahData.dekanNip || "",
      "{{REKTOR_NAMA}}": ijazahData.rektorName || "",
      "{{REKTOR_NIP}}": ijazahData.rektorNip || "",
      "{{DEKAN_QR_CODE}}": dekanQrCodeHtml,
      "{{dekan_qr_code}}": dekanQrCodeHtml,
      "{{REKTOR_QR_CODE}}": rektorQrCodeHtml,
      "{{rektor_qr_code}}": rektorQrCodeHtml,
    };

    // Replace all placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      customHtml = customHtml.replace(new RegExp(placeholder, "g"), value);
    });

    // Add custom CSS if available
    if (templateData.css_content) {
      customHtml = customHtml.replace(
        "</head>",
        `<style>${templateData.css_content}</style></head>`
      );
    }

    // Replace QR code placeholders with actual QR images
    customHtml = customHtml.replace(
      /<div class="qr-placeholder">.*?<\/div>/g,
      dekanQrCodeHtml
    );

    return customHtml;
  }

  console.log("Using default template");

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
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrContent)}" alt="QR Code Dekan" width="70" height="70" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />
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
                                <img src="https://api.qrserver.com/v1/create-qr-code/?size=70x70&data=${encodeURIComponent(qrContent)}" alt="QR Code Rektor" width="70" height="70" style="border: 1px solid #ccc; background: white;" crossorigin="anonymous" />
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

Deno.serve(async (req) => {
  // Handle CORS preflight requests
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("Generating Puppeteer PDF for document:", documentId);

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
      console.log("Fetching template:", ijazah.template_id);
      const { data: template, error: templateError } = await supabase
        .from("document_templates")
        .select("*")
        .eq("id", ijazah.template_id)
        .eq("is_active", true)
        .single();

      if (templateError) {
        console.warn("Template not found, using default:", templateError);
      } else {
        templateData = template;
        console.log("Using custom template:", template.name);
      }
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

    // Generate verification URL
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://ca.umc";
    const qrContent = `${baseUrl}/verify?id=${document.serial || document.id}`;

    // Generate HTML content
    const htmlContent = await generateIjazahHTML(ijazahData, qrContent, templateData);

    // For now, return HTML content (in production, you'd use Puppeteer here)
    // Note: Puppeteer requires additional setup in Deno Deploy environment
    return new Response(htmlContent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html",
        "Content-Disposition": `inline; filename="${ijazahData.namaMahasiswa}_ijazah.html"`,
      },
    });

  } catch (error) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});