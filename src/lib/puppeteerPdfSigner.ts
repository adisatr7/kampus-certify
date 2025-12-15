import { SupabaseClient } from "@supabase/supabase-js";
import { generateIjazahPDF } from "./puppeteerPdfGenerator";
import { UserDocument } from "@/types";
import { supabase } from "@/integrations/supabase/client";

/**
 * Alternative PDF generator using Puppeteer instead of html2canvas
 * This provides more accurate HTML-to-PDF conversion
 */
export async function generateSignedPDFWithPuppeteer(
  doc: UserDocument,
  options?: { accessToken?: string }
): Promise<Blob> {
  console.log("Starting Puppeteer PDF generation for document:", doc.id);

  // Generate QR code content
  const baseUrl = import.meta.env.BASE_URL || "/";
  const qrContent = `${window.location.origin}${baseUrl}verify?id=${doc.serial ?? doc.id}`;

  // Check document type
  const isIjazahDoc = doc.title?.toLowerCase().includes("ijazah");
  const isSertifikatDoc = doc.title?.toLowerCase().includes("sertifikat");

  if (isIjazahDoc) {
    console.log("Processing ijazah document with Puppeteer");
    
    // Fetch ijazah data
    const { data: ijazah, error: ijazahError } = await supabase
      .from("ijazah")
      .select("*")
      .eq("document_id", doc.id)
      .maybeSingle();
    
    if (ijazahError) {
      console.error("Error fetching ijazah data:", ijazahError);
      throw new Error(`Failed to fetch ijazah data: ${ijazahError.message}`);
    }
    
    if (!ijazah) {
      console.error("No ijazah data found for document:", doc.id);
      throw new Error(`No ijazah data found for document ${doc.id}`);
    }
    
    // Fetch dekan and rektor data
    const metadata = doc.metadata || {};
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
    const ijazahData = {
      nim: ijazah.nim,
      nomorIjazah: ijazah.nomor_seri || doc.serial || doc.id,
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
    
    // Generate PDF with Puppeteer
    const pdfBytes = await generateIjazahPDF(ijazahData, qrContent);
    return new Blob([pdfBytes], { type: "application/pdf" });
    
  } else if (isSertifikatDoc) {
    throw new Error("Sertifikat PDF generation with Puppeteer not implemented yet");
  } else {
    throw new Error("Unknown document type for Puppeteer PDF generation");
  }
}