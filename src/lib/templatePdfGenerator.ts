import { supabase } from "@/integrations/supabase/client";
import { UserDocument } from "@/types";

/**
 * Generate PDF using template_id from ijazah
 * Edge function returns HTML which browser renders and converts to PDF
 */
export async function generateTemplateBasedPDF(doc: UserDocument): Promise<Blob> {
  console.log("🎯 Generating PDF with template-based approach for document:", doc.id);

  try {
    // Call the edge function with documentId
    // The edge function will return HTML with template applied
    const { data, error } = await supabase.functions.invoke("generate-ijazah-pdf", {
      body: { documentId: doc.id },
    });

    if (error) {
      console.error("❌ Edge function error:", error);
      throw new Error(error.message || "Failed to generate PDF with template");
    }

    // Handle response - edge function returns HTML
    if (typeof data === 'string') {
      console.log("✅ HTML received from edge function, size:", data.length, "bytes");
      return new Blob([data], { type: 'text/html' });
    }

    if (data instanceof ArrayBuffer) {
      console.log("✅ Received as ArrayBuffer, converting to string");
      const text = new TextDecoder().decode(data);
      return new Blob([text], { type: 'text/html' });
    }

    if (ArrayBuffer.isView(data)) {
      console.log("✅ Received as ArrayBufferView, converting to string");
      const text = new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
      return new Blob([text], { type: 'text/html' });
    }

    throw new Error("Unexpected response format from edge function");

  } catch (error) {
    console.error("❌ Error generating template-based PDF:", error);
    throw error;
  }
}

/**
 * Generate PDF using default template
 */
export async function generateDefaultTemplatePDF(doc: UserDocument): Promise<Blob> {
  console.log("📄 Generating PDF with default template for document:", doc.id);

  try {
    const { data, error } = await supabase.functions.invoke("generate-pdf-puppeteer-real", {
      body: { documentId: doc.id },
    });

    if (error) {
      console.error("❌ Edge function error:", error);
      throw new Error(error.message || "Failed to generate PDF");
    }

    // Handle response - edge function returns PDF bytes
    if (data instanceof ArrayBuffer) {
      console.log("✅ PDF received as ArrayBuffer, size:", data.byteLength, "bytes");
      return new Blob([data], { type: 'application/pdf' });
    }

    if (ArrayBuffer.isView(data)) {
      console.log("✅ PDF received as ArrayBufferView, size:", data.byteLength, "bytes");
      const uint8 = new Uint8Array(data.buffer as ArrayBuffer, data.byteOffset, data.byteLength);
      return new Blob([uint8], { type: 'application/pdf' });
    }

    if (typeof data === 'string') {
      console.warn("⚠️ Received string response, treating as HTML");
      return new Blob([data], { type: 'text/html' });
    }

    throw new Error("Unexpected response format from edge function");

  } catch (error) {
    console.error("❌ Error generating default template PDF:", error);
    throw error;
  }
}

/**
 * Display PDF in new window for printing/saving
 */
export async function displayTemplatePDF(doc: UserDocument): Promise<void> {
  try {
    console.log("🚀 Starting template-based PDF generation and display...");
    const blob = await generateTemplateBasedPDF(doc);
    
    if (blob.type === 'text/html') {
      console.log("📄 Received HTML, opening in new window for printing...");
      const htmlText = await blob.text();
      const newWindow = window.open('', '_blank');
      
      if (newWindow) {
        newWindow.document.write(htmlText);
        newWindow.document.close();
        
        // Auto-trigger print dialog after fonts and styles load
        setTimeout(() => {
          console.log("🖨️ Triggering print dialog...");
          newWindow.print();
        }, 2500);
      } else {
        throw new Error("Failed to open new window. Please allow popups for this site.");
      }
    } else {
      throw new Error("Unexpected response type: " + blob.type);
    }
  } catch (error) {
    console.error("❌ Error displaying template PDF:", error);
    throw error;
  }
}

/**
 * Get template info for a document
 */
export async function getDocumentTemplate(documentId: string) {
  try {
    const { data: ijazah, error: ijazahError } = await supabase
      .from("ijazah")
      .select("template_id")
      .eq("document_id", documentId)
      .single();

    if (ijazahError || !ijazah?.template_id) {
      return null;
    }

    const { data: template, error: templateError } = await supabase
      .from("document_templates")
      .select("*")
      .eq("id", ijazah.template_id)
      .eq("is_active", true)
      .single();

    if (templateError || !template) {
      return null;
    }

    return template;
  } catch (error) {
    console.error("Error fetching document template:", error);
    return null;
  }
}
