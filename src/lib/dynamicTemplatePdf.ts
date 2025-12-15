import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";

/**
 * Generate PDF using dynamic template from database with Puppeteer
 * This uses the template selected when creating the ijazah
 */
export async function generateDynamicTemplatePDF(doc: UserDocument): Promise<Blob> {
  console.log("🎯 Generating PDF with dynamic template for document:", doc.id);

  try {
    // Call the dynamic template edge function
    const { data, error } = await supabase.functions.invoke("generate-pdf-puppeteer-real", {
      body: { documentId: doc.id },
    });

    if (error) {
      console.error("❌ Edge function error:", error);
      throw new Error(error.message || "Failed to generate PDF with dynamic template");
    }

    // The edge function returns HTML content for now (in production it would return PDF bytes)
    if (typeof data === 'string') {
      // Return HTML as blob that can be opened in new window
      return new Blob([data], { type: 'text/html' });
    }

    // If it's binary data (actual PDF), return as PDF blob
    if (data instanceof ArrayBuffer || data instanceof Uint8Array) {
      return new Blob([data], { type: 'application/pdf' });
    }

    throw new Error("Unexpected response format from dynamic template edge function");

  } catch (error) {
    console.error("❌ Error calling dynamic template edge function:", error);
    throw error;
  }
}

/**
 * Generate and display dynamic template PDF
 */
export async function displayDynamicTemplatePDF(doc: UserDocument): Promise<void> {
  try {
    console.log("🚀 Starting dynamic template PDF generation...");
    const blob = await generateDynamicTemplatePDF(doc);
    
    // Check if it's HTML or PDF
    if (blob.type === 'text/html') {
      // Open HTML in new window for printing/saving as PDF
      const htmlText = await blob.text();
      const newWindow = window.open('', '_blank');
      
      if (newWindow) {
        newWindow.document.write(htmlText);
        newWindow.document.close();
        
        // Auto-trigger print dialog after fonts load
        setTimeout(() => {
          newWindow.print();
        }, 2000); // Longer delay to ensure fonts and template are loaded
      } else {
        throw new Error("Failed to open new window. Please allow popups for this site.");
      }
    } else if (blob.type === 'application/pdf') {
      // If it's actual PDF, download it
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${doc.title}_dynamic_template.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("❌ Error displaying dynamic template PDF:", error);
    throw error;
  }
}

/**
 * Check if document has custom template
 */
export async function hasCustomTemplate(doc: UserDocument): Promise<boolean> {
  try {
    // Check if document is ijazah
    const isIjazahDoc = doc.title?.toLowerCase().includes("ijazah");
    if (!isIjazahDoc) return false;

    // Fetch ijazah data to check template_id
    const { data: ijazah, error } = await supabase
      .from("ijazah")
      .select("template_id")
      .eq("document_id", doc.id)
      .single();

    if (error || !ijazah) return false;

    return !!ijazah.template_id;
  } catch (error) {
    console.error("Error checking custom template:", error);
    return false;
  }
}