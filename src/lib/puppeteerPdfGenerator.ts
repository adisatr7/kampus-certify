import puppeteer from 'puppeteer';
import { SupabaseClient } from "@supabase/supabase-js";
import QRCode from 'qrcode';

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

export async function generateIjazahPDF(
  ijazahData: IjazahData,
  qrCodeUrl: string
): Promise<Uint8Array> {
  console.log("Starting Puppeteer PDF generation...");
  
  const browser = await puppeteer.launch({
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

  try {
    const page = await browser.newPage();
    
    // Set viewport to A4 size
    await page.setViewport({
      width: 794,  // A4 width in pixels at 96 DPI
      height: 1123, // A4 height in pixels at 96 DPI
      deviceScaleFactor: 2 // Higher resolution for better quality
    });

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

    // Create HTML content
    const htmlContent = `
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
            background-image: url('data:image/svg+xml;base64,${await getBackgroundImageBase64()}');
            background-size: cover;
            background-position: center;
            background-repeat: no-repeat;
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
            margin-top: 40px;
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

        .logo {
            width: 80px;
            height: 80px;
            object-fit: contain;
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
            margin-bottom: 8px;
            background-color: white;
            padding: 4px;
            border: 1px solid #d1d5db;
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

        .seal-icon {
            width: 64px;
            height: 64px;
            fill: white;
        }
    </style>
</head>
<body>
    <div class="ijazah-container">
        <div class="inner-white-paper">
            <div class="golden-border">
                <div class="content">
                    <!-- Header -->
                    <div class="header">
                        <div class="nim">NIM.${ijazahData.nim}</div>
                        <div class="nomor-ijazah">No: ${ijazahData.nomorIjazah}</div>
                    </div>

                    <!-- Logo -->
                    <div class="logo-container">
                        <div class="logo-circle">
                            <img src="data:image/svg+xml;base64,${await getLogoBase64()}" alt="Logo UMC" class="logo">
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
                                <div class="qr-code">
                                    <img src="${await generateQRCodeDataURL(qrCodeUrl)}" width="70" height="70" alt="QR Code Dekan">
                                </div>
                                <div class="signature-name">${ijazahData.dekanName || 'NAMA LENGKAP + GELAR'}</div>
                                <div class="signature-nip">NIP. ${ijazahData.dekanNip || ''}</div>
                            </div>

                            <!-- Seal - Center -->
                            <div class="seal">
                                <svg class="seal-icon" viewBox="0 0 24 24">
                                    <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5zm0 18c-4.41 0-8-3.59-8-8V8.5l8-4.5 8 4.5V12c0 4.41-3.59 8-8 8z" />
                                    <path d="M12 6L6 9v6c0 3.31 2.24 6.41 5 7.17 2.76-.76 5-3.86 5-7.17V9l-6-3zm0 12c-2.76 0-5-2.24-5-5v-3.5l5-2.5 5 2.5V13c0 2.76-2.24 5-5 5z" />
                                </svg>
                            </div>

                            <!-- Rektor - Right -->
                            <div class="signature-right">
                                <div class="signature-title">Rektor</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code">
                                    <img src="${await generateQRCodeDataURL(qrCodeUrl)}" width="70" height="70" alt="QR Code Rektor">
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

    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      preferCSSPageSize: true,
    });

    console.log("PDF generated successfully with Puppeteer");
    return new Uint8Array(pdfBuffer);

  } finally {
    await browser.close();
  }
}

// Helper functions
async function getBackgroundImageBase64(): Promise<string> {
  // Return a simple brown gradient as base64 SVG for background
  const svg = `<svg width="794" height="1123" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="50%" r="70%">
        <stop offset="0%" style="stop-color:#d2b48c;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#8b4513;stop-opacity:1" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
  </svg>`;
  return Buffer.from(svg).toString('base64');
}

async function getLogoBase64(): Promise<string> {
  // Simple UMC logo as SVG
  const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
    <circle cx="40" cy="40" r="35" fill="#dc2626"/>
    <text x="40" y="45" text-anchor="middle" fill="white" font-family="Arial" font-size="12" font-weight="bold">UMC</text>
  </svg>`;
  return Buffer.from(svg).toString('base64');
}

async function generateQRCodeDataURL(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: 70,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
  } catch (error) {
    console.error("Error generating QR code:", error);
    // Fallback to simple placeholder
    const svg = `<svg width="70" height="70" xmlns="http://www.w3.org/2000/svg">
      <rect width="70" height="70" fill="white" stroke="#000" stroke-width="1"/>
      <rect x="5" y="5" width="60" height="60" fill="none" stroke="#000" stroke-width="1"/>
      <text x="35" y="40" text-anchor="middle" fill="#000" font-family="Arial" font-size="8">QR</text>
    </svg>`;
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  }
}