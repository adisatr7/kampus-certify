import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";

/**
 * Generate PDF using Puppeteer via edge function
 * This provides better HTML-to-PDF conversion than html2canvas
 */
export async function generatePuppeteerPDF(doc: UserDocument): Promise<Blob> {
  console.log("Generating PDF with Puppeteer edge function for document:", doc.id);

  try {
    // Call the edge function
    const { data, error } = await supabase.functions.invoke("generate-pdf-puppeteer", {
      body: { documentId: doc.id },
    });

    if (error) {
      console.error("Edge function error:", error);
      throw new Error(error.message || "Failed to generate PDF");
    }

    // The edge function returns HTML content for now
    // In production, this would return PDF bytes
    if (typeof data === 'string') {
      // Return HTML as blob that can be opened in new window
      return new Blob([data], { type: 'text/html' });
    }

    throw new Error("Unexpected response format from edge function");

  } catch (error) {
    console.error("Error calling Puppeteer edge function:", error);
    throw error;
  }
}

/**
 * Generate and download PDF using Puppeteer
 */
export async function downloadPuppeteerPDF(doc: UserDocument): Promise<void> {
  try {
    const htmlBlob = await generatePuppeteerPDF(doc);
    
    // Open HTML in new window for printing/saving as PDF
    const htmlText = await htmlBlob.text();
    const newWindow = window.open('', '_blank');
    
    if (newWindow) {
      newWindow.document.write(htmlText);
      newWindow.document.close();
      
      // Auto-trigger print dialog after fonts load
      setTimeout(() => {
        newWindow.print();
      }, 2000); // Longer delay to ensure fonts are loaded
    } else {
      throw new Error("Failed to open new window. Please allow popups for this site.");
    }
  } catch (error) {
    console.error("Error downloading Puppeteer PDF:", error);
    throw error;
  }
}