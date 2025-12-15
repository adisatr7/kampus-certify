-- Insert default ijazah template with proper styling
INSERT INTO public.document_templates (name, type, html_content, css_content, created_by, is_active)
SELECT 
  'Template Ijazah Default',
  'ijazah'::document_type,
  $html$<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ijazah {{NAMA_MAHASISWA}}</title>
    <link href="https://fonts.googleapis.com/css2?family=Great+Vibes:wght@400&display=swap" rel="stylesheet">
</head>
<body>
    <div class="ijazah-container">
        <div class="inner-white-paper">
            <div class="golden-border">
                <div class="content">
                    <div class="header">
                        <div class="nim">NIM.{{NIM}}</div>
                        <div class="nomor-ijazah">No: {{NOMOR_IJAZAH}}</div>
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
                        <div class="student-name">{{NAMA_MAHASISWA}}</div>
                        <div class="program-info">telah berhasil menyelesaikan Program Pendidikan Sarjana</div>
                        <div class="program-detail">Program Studi {{PROGRAM_STUDI}} pada {{FAKULTAS}}</div>
                        <div class="degree-statement">Oleh karena itu, kepada yang bersangkutan diberikan ijazah dan sebutan</div>
                        <div class="degree-name">{{GELAR_LENGKAP}}</div>
                        <div class="degree-abbr">dengan singkatan {{GELAR_SINGKATAN}}</div>
                        <div class="rights-statement">Beserta segala hak dan wewenang yang melekat pada gelar tersebut</div>
                        <div class="date-statement">Diterbitkan di Cirebon pada tanggal {{TANGGAL_TERBIT}}</div>
                    </div>
                    <div class="signatures">
                        <div class="signature-row">
                            <div class="signature-left">
                                <div class="signature-title">Dekan {{FAKULTAS}}</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code">QR Dekan</div>
                                <div class="signature-name">{{DEKAN_NAMA}}</div>
                                <div class="signature-nip">NIP. {{DEKAN_NIP}}</div>
                            </div>
                            <div class="seal">
                                <div class="seal-text">SEAL</div>
                            </div>
                            <div class="signature-right">
                                <div class="signature-title">Rektor</div>
                                <div class="signature-institution">Universitas Muhammadiyah Cirebon</div>
                                <div class="qr-code">QR Rektor</div>
                                <div class="signature-name">{{REKTOR_NAMA}}</div>
                                <div class="signature-nip">NIP. {{REKTOR_NIP}}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</body>
</html>$html$,
  $css$* {
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
}$css$,
  (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1),
  true
WHERE NOT EXISTS (
  SELECT 1 FROM public.document_templates 
  WHERE name = 'Template Ijazah Default' AND type = 'ijazah'
);
