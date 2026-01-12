import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { launch } from "https://deno.land/x/puppeteer@16.2.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { htmlContent, documentId, userId } = await req.json();

    if (!htmlContent || !documentId || !userId) {
      return new Response(
        JSON.stringify({ 
          error: "Missing required fields: htmlContent, documentId, userId" 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("=== CONVERTING HTML TO PDF ===");
    console.log("Document ID:", documentId);
    console.log("User ID:", userId);
    console.log("HTML content size:", htmlContent.length, "bytes");

    // Launch Puppeteer dengan retry mechanism
    console.log("🚀 Launching Puppeteer...");
    let browser;
    let launchError = null;
    
    try {
      browser = await launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--single-process", // Use single process for edge functions
        ],
      });
    } catch (err) {
      launchError = err;
      console.error("❌ Failed to launch Puppeteer:", err);
      
      // Provide helpful error message
      if (launchError instanceof Error) {
        if (launchError.message.includes("Failed to fetch")) {
          throw new Error(
            "Puppeteer binary not available in edge function environment. " +
            "Consider using HTML rendering service instead (e.g., headless browser API)"
          );
        }
      }
      throw launchError;
    }

    if (!browser) {
      throw new Error("Failed to initialize Puppeteer browser");
    }

    console.log("✅ Puppeteer launched successfully");

    try {
      const page = await browser.newPage();
      
      // Set content and wait for load
      console.log("📄 Setting HTML content...");
      await page.setContent(htmlContent, { waitUntil: "networkidle2" });

      // Generate PDF
      console.log("🖨️ Generating PDF...");
      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        },
      });

      console.log("✅ PDF generated, size:", pdfBuffer.length, "bytes");

      // Close browser
      await page.close();
      await browser.close();
      console.log("🔒 Browser closed");

      // Upload PDF to Supabase storage
      console.log("📤 Uploading PDF to storage...");
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const timestamp = Date.now();
      const fileName = `${documentId}-signed-${timestamp}.pdf`;
      const filePath = `${userId}/${fileName}`;

      console.log("📁 Upload path:", filePath);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("signed-documents")
        .upload(filePath, pdfBuffer, {
          contentType: "application/pdf",
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw new Error(`Failed to upload PDF: ${uploadError.message}`);
      }

      console.log("✅ PDF uploaded successfully:", uploadData);

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from("signed-documents")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData?.publicUrl;
      console.log("🔗 Public URL:", publicUrl);

      // Update document with file_url
      console.log("🔄 Updating document.file_url...");
      const { error: updateError } = await supabase
        .from("documents")
        .update({ 
          file_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq("id", documentId);

      if (updateError) {
        console.error("❌ Failed to update document.file_url:", updateError);
        throw new Error(`Failed to update file_url: ${updateError.message}`);
      }

      console.log("✅ Document.file_url updated successfully");

      return new Response(
        JSON.stringify({
          ok: true,
          fileUrl: publicUrl,
          size: pdfBuffer.length,
          message: "PDF generated and uploaded successfully"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (browserError) {
      console.error("❌ Browser error:", browserError);
      await browser.close();
      throw browserError;
    }
  } catch (error) {
    console.error("❌ Error in convert-html-to-pdf:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ 
        error: errorMessage,
        details: "Failed to convert HTML to PDF"
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
