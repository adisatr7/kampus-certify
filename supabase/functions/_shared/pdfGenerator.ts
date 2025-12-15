import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, rgb, StandardFonts } from "https://esm.sh/pdf-lib@1.17.1";
import QRCode from "https://esm.sh/qrcode@1.5.3";

/**
 * Document type from database
 */
interface Document {
  id: string;
  serial?: string | null;
  user_id: string;
  title: string;
  content?: string | null;
  status: string;
  document_type?: 'ijazah' | 'sertifikat' | 'other' | null;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, any> | null;
  recipient_name?: string | null;
  recipient_student_number?: string | null;
}

/**
 * Ijazah data from database
 */
interface Ijazah {
  id: string;
  document_id: string;
  nama_mahasiswa: string;
  nim: string;
  gelar: string;
  nomor_seri: string;
  tanggal_terbit: string;
  nama_fakultas: string;
  logo_url?: string | null;
  template_id?: string | null;
}

/**
 * Sertifikat data from database
 */
interface Sertifikat {
  id: string;
  document_id: string;
  nama_peserta: string;
  nama_acara: string;
  tanggal_acara: string;
  nomor_sertifikat: string;
  penandatangan?: string | null;
  template_id?: string | null;
}

/**
 * Document signature from database
 */
interface DocumentSignature {
  id: string;
  document_id: string;
  key_id: string;
  payload_hash: string;
  signature: string;
  signer_user_id: string;
  signer_role?: string | null;
  created_at: string;
}

/**
 * User data from database
 */
interface User {
  id: string;
  name: string;
  nip?: string | null;
  jabatan?: string | null;
  role?: string | null;
}

/**
 * Generate QR code as PNG data URL
 */
async function generateQRCode(content: string): Promise<string> {
  try {
    const qrDataUrl = await QRCode.toDataURL(content, {
      width: 200,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });
    return qrDataUrl;
  } catch (error) {
    console.error("Error generating QR code:", error);
    throw new Error(`Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Format date to Indonesian locale
 */
function formatDateIndonesian(dateString: string): string {
  const date = new Date(dateString);
  const months = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];
  
  const day = date.getDate();
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day} ${month} ${year}`;
}

/**
 * Generate signed PDF for Ijazah documents
 * Matches IjazahTemplate.tsx layout
 */
async function generateIjazahSignedPDF(
  document: Document,
  ijazahData: Ijazah,
  signatures: DocumentSignature[],
  users: Map<string, User>,
  verificationUrl: string,
  qrCodeDataUrl: string,
): Promise<Uint8Array> {
  console.log("=== GENERATING IJAZAH PDF WITH FIXED POSITIONING ===");
  console.log("Document ID:", document.id);
  console.log("NIM:", ijazahData.nim);
  console.log("Nomor Seri:", ijazahData.nomor_seri);
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();
  
  console.log("PDF dimensions:", width, "x", height);
  
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  
  const margin = 50;
  const innerMargin = 70;
  
  // Draw golden border (matching template)
  page.drawRectangle({
    x: innerMargin - 10,
    y: innerMargin - 10,
    width: width - 2 * (innerMargin - 10),
    height: height - 2 * (innerMargin - 10),
    borderColor: rgb(0.72, 0.53, 0.04), // Golden color
    borderWidth: 3,
  });
  
  // Header - NIM and Nomor Ijazah (positioned inside the golden border)
  let yPos = height - innerMargin - 50; // Move down by 50 points to be well inside border
  console.log(`DEBUG: Positioning NIM and Nomor at yPos: ${yPos}, border top: ${height - (innerMargin - 10)}`);
  
  page.drawText(`NIM.${ijazahData.nim}`, {
    x: innerMargin + 20, // More padding from border
    y: yPos,
    size: 12, // Slightly larger for visibility
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2), // Darker color
  });
  
  page.drawText(`No: ${ijazahData.nomor_seri}`, {
    x: width - innerMargin - 150,
    y: yPos,
    size: 12, // Slightly larger for visibility
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2), // Darker color
  });
  
  yPos -= 40;
  
  // University header
  page.drawText("KEMENTRIAN PENDIDIKAN DAN KEBUDAYAAN", {
    x: width / 2 - 140,
    y: yPos,
    size: 9,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 20;
  page.drawText("UNIVERSITAS MUHAMMADIYAH CIREBON", {
    x: width / 2 - 130,
    y: yPos,
    size: 14,
    font: fontBold,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  // Golden line
  yPos -= 10;
  page.drawLine({
    start: { x: width / 2 - 150, y: yPos },
    end: { x: width / 2 + 150, y: yPos },
    thickness: 2,
    color: rgb(0.72, 0.53, 0.04),
  });
  
  yPos -= 50;
  
  // Main content
  page.drawText("Dengan ini kami menyatakan bahwa", {
    x: width / 2 - 100,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 40;
  
  // Student name (larger, italic)
  page.drawText(ijazahData.nama_mahasiswa, {
    x: width / 2 - (ijazahData.nama_mahasiswa.length * 6),
    y: yPos,
    size: 24,
    font: fontItalic,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 40;
  
  page.drawText("telah berhasil menyelesaikan Program Pendidikan Sarjana", {
    x: width / 2 - 160,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 20;
  
  // Parse gelar
  const gelarMatch = ijazahData.gelar.match(/^(.+?)\s*\(([^)]+)\)$/);
  const gelarFull = gelarMatch ? gelarMatch[1].trim() : ijazahData.gelar;
  const gelarAbbr = gelarMatch ? gelarMatch[2].trim() : ijazahData.gelar;
  
  page.drawText(`Program Studi Informatika pada ${ijazahData.nama_fakultas}`, {
    x: width / 2 - 150,
    y: yPos,
    size: 11,
    font: fontBold,
    color: rgb(0.3, 0.3, 0.3),
  });
  
  yPos -= 30;
  
  page.drawText("Oleh karena itu, kepada yang bersangkutan diberikan ijazah dan sebutan", {
    x: width / 2 - 200,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 40;
  
  // Gelar (larger, italic)
  page.drawText(gelarFull, {
    x: width / 2 - (gelarFull.length * 5),
    y: yPos,
    size: 20,
    font: fontItalic,
    color: rgb(0.2, 0.2, 0.2),
  });
  
  yPos -= 30;
  
  page.drawText(`dengan singkatan ${gelarAbbr}`, {
    x: width / 2 - 80,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 20;
  
  page.drawText("Beserta segala hak dan wewenang yang melekat pada gelar tersebut", {
    x: width / 2 - 180,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  yPos -= 20;
  
  const tanggalTerbit = formatDateIndonesian(ijazahData.tanggal_terbit);
  page.drawText(`Diterbitkan di Cirebon pada tanggal ${tanggalTerbit}`, {
    x: width / 2 - 150,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.4, 0.4, 0.4),
  });
  
  // Footer - Signatures
  const footerY = innerMargin + 80;
  
  // Find Dekan and Rektor signatures
  const dekanSig = signatures.find(s => s.signer_role?.toLowerCase().includes('dekan'));
  const rektorSig = signatures.find(s => s.signer_role?.toLowerCase().includes('rektor'));
  
  const dekanUser = dekanSig ? users.get(dekanSig.signer_user_id) : null;
  const rektorUser = rektorSig ? users.get(rektorSig.signer_user_id) : null;
  
  // Dekan signature (left)
  if (dekanUser) {
    page.drawText(`Dekan ${ijazahData.nama_fakultas}`, {
      x: innerMargin + 40,
      y: footerY + 60,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    page.drawText("Universitas Muhammadiyah Cirebon", {
      x: innerMargin + 20,
      y: footerY + 50,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // QR Code for Dekan
    try {
      const dekanQrDataUrl = await generateQRCode(`${verificationUrl}&signer=dekan`);
      const qrBase64 = dekanQrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      
      page.drawImage(qrImage, {
        x: innerMargin + 40,
        y: footerY - 10,
        width: 60,
        height: 60,
      });
    } catch (error) {
      console.error("Error embedding Dekan QR code:", error);
    }
    
    page.drawText(dekanUser.name, {
      x: innerMargin + 30,
      y: footerY - 80,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    if (dekanUser.nip) {
      page.drawText(`NIP. ${dekanUser.nip}`, {
        x: innerMargin + 30,
        y: footerY - 92,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }
  
  // Rektor signature (right)
  if (rektorUser) {
    page.drawText("Rektor", {
      x: width - innerMargin - 80,
      y: footerY + 60,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    page.drawText("Universitas Muhammadiyah Cirebon", {
      x: width - innerMargin - 120,
      y: footerY + 50,
      size: 8,
      font: font,
      color: rgb(0.4, 0.4, 0.4),
    });
    
    // QR Code for Rektor
    try {
      const rektorQrDataUrl = await generateQRCode(`${verificationUrl}&signer=rektor`);
      const qrBase64 = rektorQrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      
      page.drawImage(qrImage, {
        x: width - innerMargin - 90,
        y: footerY - 10,
        width: 60,
        height: 60,
      });
    } catch (error) {
      console.error("Error embedding Rektor QR code:", error);
    }
    
    page.drawText(rektorUser.name, {
      x: width - innerMargin - 100,
      y: footerY - 80,
      size: 8,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    if (rektorUser.nip) {
      page.drawText(`NIP. ${rektorUser.nip}`, {
        x: width - innerMargin - 100,
        y: footerY - 92,
        size: 8,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }
  
  return await pdfDoc.save();
}

/**
 * Generate signed PDF for Sertifikat documents
 * Matches SertifikatTemplate.tsx layout
 */
async function generateSertifikatSignedPDF(
  document: Document,
  sertifikatData: Sertifikat,
  signatures: DocumentSignature[],
  users: Map<string, User>,
  verificationUrl: string,
  qrCodeDataUrl: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  
  const margin = 50;
  
  // Draw golden borders (matching template)
  page.drawRectangle({
    x: margin - 10,
    y: margin - 10,
    width: width - 2 * (margin - 10),
    height: height - 2 * (margin - 10),
    borderColor: rgb(0.72, 0.53, 0.04), // Golden color
    borderWidth: 4,
  });
  
  page.drawRectangle({
    x: margin + 10,
    y: margin + 10,
    width: width - 2 * (margin + 10),
    height: height - 2 * (margin + 10),
    borderColor: rgb(0.72, 0.53, 0.04),
    borderWidth: 1,
  });
  
  // Header
  let yPos = height - margin - 60;
  
  page.drawText("SERTIFIKAT", {
    x: width / 2 - 80,
    y: yPos,
    size: 36,
    font: fontBold,
    color: rgb(0.72, 0.53, 0.04),
  });
  
  yPos -= 30;
  
  page.drawText("PENGHARGAAN", {
    x: width / 2 - 70,
    y: yPos,
    size: 16,
    font: fontBold,
    color: rgb(0.42, 0.45, 0.5),
  });
  
  yPos -= 25;
  
  page.drawText(`No. ${sertifikatData.nomor_sertifikat}`, {
    x: width / 2 - 60,
    y: yPos,
    size: 10,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 50;
  
  // Body
  page.drawText("Dengan rasa hormat dan bangga, kami", {
    x: width / 2 - 110,
    y: yPos,
    size: 12,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 20;
  
  page.drawText("menganugerahkan penghargaan ini kepada", {
    x: width / 2 - 130,
    y: yPos,
    size: 12,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 50;
  
  // Participant name (large, italic)
  page.drawText(sertifikatData.nama_peserta, {
    x: width / 2 - (sertifikatData.nama_peserta.length * 6),
    y: yPos,
    size: 28,
    font: fontItalic,
    color: rgb(0.72, 0.53, 0.04),
  });
  
  yPos -= 60;
  
  // Description
  const tanggalAcara = formatDateIndonesian(sertifikatData.tanggal_acara);
  const description = `Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya dalam kegiatan`;
  const description2 = `Sosial dan Budaya yang diselenggarakan oleh Universitas Muhammadiyah Cirebon`;
  const description3 = `dengan tema ${sertifikatData.nama_acara} pada tanggal ${tanggalAcara}`;
  const description4 = `di Cirebon. Semoga ilmu yang didapat membawa keberkahan dan menjadi amal jariyah.`;
  
  page.drawText(description, {
    x: width / 2 - 220,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 18;
  
  page.drawText(description2, {
    x: width / 2 - 230,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 18;
  
  page.drawText(description3, {
    x: width / 2 - 180,
    y: yPos,
    size: 11,
    font: fontBold,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  yPos -= 18;
  
  page.drawText(description4, {
    x: width / 2 - 220,
    y: yPos,
    size: 11,
    font: font,
    color: rgb(0.29, 0.33, 0.39),
  });
  
  // Footer - Signatures
  const footerY = margin + 100;
  
  // Get first two signers
  const signer1 = signatures[0] ? users.get(signatures[0].signer_user_id) : null;
  const signer2 = signatures[1] ? users.get(signatures[1].signer_user_id) : null;
  
  // Signer 1 (left)
  if (signer1) {
    // QR Code
    try {
      const signer1QrDataUrl = await generateQRCode(`${verificationUrl}&signer=1`);
      const qrBase64 = signer1QrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      
      page.drawImage(qrImage, {
        x: margin + 80,
        y: footerY + 40,
        width: 60,
        height: 60,
      });
    } catch (error) {
      console.error("Error embedding Signer 1 QR code:", error);
    }
    
    page.drawText("Nama Lengkap + Gelar", {
      x: margin + 70,
      y: footerY + 30,
      size: 9,
      font: font,
      color: rgb(0.29, 0.33, 0.39),
    });
    
    page.drawText("NIP", {
      x: margin + 100,
      y: footerY + 20,
      size: 9,
      font: font,
      color: rgb(0.29, 0.33, 0.39),
    });
    
    page.drawText(signer1.name, {
      x: margin + 80,
      y: footerY + 5,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Penandatangan 1", {
      x: margin + 70,
      y: footerY - 10,
      size: 9,
      font: fontItalic,
      color: rgb(0.29, 0.33, 0.39),
    });
  }
  
  // Signer 2 (right)
  if (signer2) {
    // QR Code
    try {
      const signer2QrDataUrl = await generateQRCode(`${verificationUrl}&signer=2`);
      const qrBase64 = signer2QrDataUrl.split(',')[1];
      const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
      const qrImage = await pdfDoc.embedPng(qrBytes);
      
      page.drawImage(qrImage, {
        x: width - margin - 140,
        y: footerY + 40,
        width: 60,
        height: 60,
      });
    } catch (error) {
      console.error("Error embedding Signer 2 QR code:", error);
    }
    
    page.drawText("Nama Lengkap + Gelar", {
      x: width - margin - 150,
      y: footerY + 30,
      size: 9,
      font: font,
      color: rgb(0.29, 0.33, 0.39),
    });
    
    page.drawText("NIP", {
      x: width - margin - 120,
      y: footerY + 20,
      size: 9,
      font: font,
      color: rgb(0.29, 0.33, 0.39),
    });
    
    page.drawText(signer2.name, {
      x: width - margin - 140,
      y: footerY + 5,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
    
    page.drawText("Penandatangan 2", {
      x: width - margin - 150,
      y: footerY - 10,
      size: 9,
      font: fontItalic,
      color: rgb(0.29, 0.33, 0.39),
    });
  }
  
  return await pdfDoc.save();
}

/**
 * Generate signed PDF for generic documents
 */
async function generateGenericSignedPDF(
  document: Document,
  _signatures: DocumentSignature[],
  user: User | null,
  _verificationUrl: string,
  qrCodeDataUrl: string,
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4 size in points
  const { width, height } = page.getSize();
  
  const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const fontSize = 12;
  const margin = 50;
  
  // Title
  page.drawText(document.title, {
    x: margin,
    y: height - margin,
    size: 16,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  
  // Content
  if (document.content) {
    const contentLines = document.content.split('\n');
    let yPosition = height - margin - 40;
    
    for (const line of contentLines) {
      if (yPosition < margin + 200) break; // Leave space for footer
      
      page.drawText(line, {
        x: margin,
        y: yPosition,
        size: fontSize,
        font: font,
        color: rgb(0, 0, 0),
      });
      
      yPosition -= fontSize + 4;
    }
  }
  
  // Footer section with QR code and signature
  const footerY = 200;
  
  // Date and position
  const signedDate = formatDateIndonesian(document.updated_at);
  const jabatan = user?.jabatan || "Ketua Program Studi Informatika";
  
  page.drawText(`Cirebon, ${signedDate}`, {
    x: width - margin - 200,
    y: footerY + 80,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText(jabatan, {
    x: width - margin - 200,
    y: footerY + 65,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  page.drawText("Universitas Muhammadiyah Cirebon", {
    x: width - margin - 200,
    y: footerY + 50,
    size: 10,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Embed QR code
  try {
    const qrBase64 = qrCodeDataUrl.split(',')[1];
    const qrBytes = Uint8Array.from(atob(qrBase64), c => c.charCodeAt(0));
    const qrImage = await pdfDoc.embedPng(qrBytes);
    
    const qrSize = 80;
    page.drawImage(qrImage, {
      x: width - margin - 200 + 60,
      y: footerY - 20,
      width: qrSize,
      height: qrSize,
    });
  } catch (error) {
    console.error("Error embedding QR code:", error);
  }
  
  // Signer name and NIP
  if (user?.name) {
    page.drawText(user.name, {
      x: width - margin - 200 + 40,
      y: footerY - 110,
      size: 10,
      font: fontBold,
      color: rgb(0, 0, 0),
    });
  }
  
  if (user?.nip) {
    page.drawText(`NIP. ${user.nip}`, {
      x: width - margin - 200 + 40,
      y: footerY - 125,
      size: 10,
      font: font,
      color: rgb(0, 0, 0),
    });
  }
  
  // Document ID
  page.drawText(`ID Dokumen: ${document.serial || document.id}`, {
    x: margin,
    y: footerY - 140,
    size: 9,
    font: font,
    color: rgb(0, 0, 0),
  });
  
  // Footer disclaimer box
  const boxY = 40;
  const boxHeight = 60;
  const boxWidth = width - 2 * margin;
  
  // Draw box border
  page.drawRectangle({
    x: margin,
    y: boxY,
    width: boxWidth,
    height: boxHeight,
    borderColor: rgb(0, 0, 0),
    borderWidth: 2,
  });
  
  // Disclaimer text
  const disclaimerLines = [
    "Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat digital yang diterbitkan oleh CA UMC.",
    "Keaslian dokumen ini dapat diverifikasi melalui pemindaian QR Code atau portal verifikasi di:",
    "https://ca.umc/verify"
  ];
  
  let disclaimerY = boxY + boxHeight - 15;
  for (const line of disclaimerLines) {
    page.drawText(line, {
      x: margin + 10,
      y: disclaimerY,
      size: 8,
      font: font,
      color: rgb(0, 0, 0),
    });
    disclaimerY -= 12;
  }
  
  return await pdfDoc.save();
}

/**
 * Generate signed PDF from document data
 * This function determines the document type and generates the appropriate PDF
 */
export async function generateSignedPDF(
  document: Document,
  signatures: DocumentSignature[],
  supabaseClient: SupabaseClient,
): Promise<Uint8Array> {
  try {
    console.log("Generating signed PDF for document:", document.id);
    console.log("Document type:", document.document_type);
    
    // Generate verification URL and QR code
    const baseUrl = Deno.env.get("PUBLIC_SITE_URL") || "https://ca.umc";
    const verificationUrl = `${baseUrl}/verify?id=${document.serial || document.id}`;
    const qrCodeDataUrl = await generateQRCode(verificationUrl);
    
    // Fetch all signer user data
    const signerUserIds = signatures
      .map(s => s.signer_user_id)
      .filter((id): id is string => id !== null);
    
    const { data: usersData, error: usersError } = await supabaseClient
      .from("users")
      .select("id, name, nip, jabatan, role")
      .in("id", signerUserIds);
    
    if (usersError) {
      console.warn("Error fetching users data:", usersError);
    }
    
    // Create a map of user_id -> user for easy lookup
    const usersMap = new Map<string, User>();
    if (usersData) {
      for (const user of usersData) {
        usersMap.set(user.id, user);
      }
    }
    
    // Also fetch document owner
    const { data: ownerData, error: ownerError } = await supabaseClient
      .from("users")
      .select("id, name, nip, jabatan, role")
      .eq("id", document.user_id)
      .maybeSingle();
    
    if (ownerError) {
      console.warn("Error fetching owner data:", ownerError);
    }
    
    if (ownerData) {
      usersMap.set(ownerData.id, ownerData);
    }
    
    // Use document_type field to determine which template to use
    if (document.document_type === 'ijazah') {
      console.log("Generating Ijazah PDF using IjazahTemplate");
      
      // Fetch Ijazah data
      const { data: ijazahData, error: ijazahError } = await supabaseClient
        .from("ijazah")
        .select("*")
        .eq("document_id", document.id)
        .maybeSingle();
      
      if (ijazahError || !ijazahData) {
        console.error("Error fetching Ijazah data:", ijazahError);
        throw new Error("Ijazah data not found for document");
      }
      
      return await generateIjazahSignedPDF(
        document,
        ijazahData,
        signatures,
        usersMap,
        verificationUrl,
        qrCodeDataUrl
      );
    } else if (document.document_type === 'sertifikat') {
      console.log("Generating Sertifikat PDF using SertifikatTemplate");
      
      // Fetch Sertifikat data
      const { data: sertifikatData, error: sertifikatError } = await supabaseClient
        .from("sertifikat")
        .select("*")
        .eq("document_id", document.id)
        .maybeSingle();
      
      if (sertifikatError || !sertifikatData) {
        console.error("Error fetching Sertifikat data:", sertifikatError);
        throw new Error("Sertifikat data not found for document");
      }
      
      return await generateSertifikatSignedPDF(
        document,
        sertifikatData,
        signatures,
        usersMap,
        verificationUrl,
        qrCodeDataUrl
      );
    } else {
      console.log("Generating generic signed PDF using SignedDocumentTemplate");
      return await generateGenericSignedPDF(
        document,
        signatures,
        ownerData,
        verificationUrl,
        qrCodeDataUrl
      );
    }
  } catch (error) {
    console.error("Error generating signed PDF:", error);
    throw new Error(
      `Failed to generate signed PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Upload PDF to storage bucket
 * Returns the public URL of the uploaded PDF
 */
export async function uploadPDF(
  pdfBytes: Uint8Array,
  userId: string,
  documentId: string,
  supabaseClient: SupabaseClient,
): Promise<string> {
  try {
    console.log("Uploading PDF to storage");
    console.log("User ID:", userId);
    console.log("Document ID:", documentId);
    console.log("PDF size:", pdfBytes.length, "bytes");
    
    // Generate file path: signed-documents/{user_id}/{document_id}-signed-{timestamp}.pdf
    const timestamp = Date.now();
    const fileName = `${documentId}-signed-${timestamp}.pdf`;
    const filePath = `${userId}/${fileName}`;
    
    console.log("Upload path:", filePath);
    
    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from("signed-documents")
      .upload(filePath, pdfBytes, {
        contentType: "application/pdf",
        cacheControl: "3600",
        upsert: false,
      });
    
    if (uploadError) {
      console.error("Upload error:", uploadError);
      throw new Error(`Failed to upload PDF: ${uploadError.message}`);
    }
    
    console.log("Upload successful:", uploadData);
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from("signed-documents")
      .getPublicUrl(filePath);
    
    console.log("Public URL:", publicUrl);
    
    return publicUrl;
  } catch (error) {
    console.error("Error uploading PDF:", error);
    throw new Error(
      `Failed to upload PDF: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}
