import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateSignedPDF, uploadPDF } from "../_shared/pdfGenerator.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface RepairRequest {
  adminUserId: string;
  dryRun?: boolean;
  documentIds?: string[];
}

interface RepairResponse {
  totalDocuments: number;
  repaired: number;
  failed: number;
  errors: Array<{
    documentId: string;
    error: string;
  }>;
}

interface RepairError {
  documentId: string;
  error: string;
}

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000,
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`Attempt ${attempt + 1} failed:`, lastError.message);
      
      if (attempt < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error("All retry attempts failed");
}

/**
 * Repair a single document by regenerating its PDF
 */
async function repairDocument(documentId: string, dryRun: boolean): Promise<void> {
  console.log(`Processing document: ${documentId}`);
  
  // Fetch document
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .single();
  
  if (docError || !document) {
    throw new Error(`Failed to fetch document: ${docError?.message || "Not found"}`);
  }
  
  // Verify document is signed and has no file_url
  if (document.status !== "signed") {
    throw new Error(`Document status is '${document.status}', expected 'signed'`);
  }
  
  if (document.file_url) {
    throw new Error("Document already has file_url");
  }
  
  // Fetch signatures
  const { data: signatures, error: sigError } = await supabase
    .from("document_signatures")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: true });
  
  if (sigError) {
    throw new Error(`Failed to fetch signatures: ${sigError.message}`);
  }
  
  if (!signatures || signatures.length === 0) {
    throw new Error("No signatures found for document");
  }
  
  if (dryRun) {
    console.log(`[DRY RUN] Would repair document ${documentId}`);
    return;
  }
  
  // Generate PDF
  console.log("Generating PDF...");
  const pdfBytes = await generateSignedPDF(document, signatures, supabase);
  console.log("PDF generated successfully, size:", pdfBytes.length, "bytes");
  
  // Upload PDF with retry logic
  console.log("Uploading PDF to storage...");
  const fileUrl = await retryWithBackoff(
    () => uploadPDF(pdfBytes, document.user_id, documentId, supabase),
    3,
    1000
  );
  console.log("PDF uploaded successfully:", fileUrl);
  
  // Update document with file_url with retry logic
  console.log("Updating document with file_url...");
  await retryWithBackoff(async () => {
    const { error: updateError } = await supabase
      .from("documents")
      .update({ file_url: fileUrl })
      .eq("id", documentId);
    
    if (updateError) {
      throw new Error(`Failed to update file_url: ${updateError.message}`);
    }
  }, 3, 1000);
  
  console.log("Document repaired successfully");
}

/**
 * Process documents in batches
 */
async function processBatch(
  documentIds: string[],
  dryRun: boolean,
): Promise<{ repaired: number; failed: number; errors: RepairError[] }> {
  let repaired = 0;
  let failed = 0;
  const errors: RepairError[] = [];
  
  for (const documentId of documentIds) {
    try {
      await repairDocument(documentId, dryRun);
      repaired++;
    } catch (error) {
      failed++;
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Failed to repair document ${documentId}:`, errorMessage);
      errors.push({
        documentId,
        error: errorMessage,
      });
    }
  }
  
  return { repaired, failed, errors };
}

Deno.serve(async (req) => {
  const headers: Headers = new Headers(corsHeaders);
  headers.set("Content-Type", "application/json");

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  try {
    const { adminUserId, dryRun = false, documentIds } = await req.json() as RepairRequest;

    if (!adminUserId) {
      return new Response(
        JSON.stringify({ error: "adminUserId is required" }),
        { status: 400, headers }
      );
    }

    // Verify user is admin
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", adminUserId)
      .single();

    if (userError || !userData) {
      return new Response(
        JSON.stringify({ error: "User not found" }),
        { status: 404, headers }
      );
    }

    if (userData.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "Only admins can run repair script" }),
        { status: 403, headers }
      );
    }

    console.log("Starting repair script...");
    console.log("Dry run:", dryRun);
    console.log("Specific document IDs:", documentIds);

    // Find documents that need repair
    let query = supabase
      .from("documents")
      .select("id")
      .eq("status", "signed")
      .is("file_url", null)
      .order("created_at", { ascending: true });

    // If specific document IDs provided, filter to those
    if (documentIds && documentIds.length > 0) {
      query = query.in("id", documentIds);
    } else {
      // Limit to 100 documents per run if no specific IDs provided
      query = query.limit(100);
    }

    const { data: documentsToRepair, error: queryError } = await query;

    if (queryError) {
      throw new Error(`Failed to query documents: ${queryError.message}`);
    }

    if (!documentsToRepair || documentsToRepair.length === 0) {
      console.log("No documents found that need repair");
      return new Response(
        JSON.stringify({
          totalDocuments: 0,
          repaired: 0,
          failed: 0,
          errors: [],
        } as RepairResponse),
        { status: 200, headers }
      );
    }

    console.log(`Found ${documentsToRepair.length} documents to repair`);

    // Process documents in batches of 10
    const batchSize = 10;
    let totalRepaired = 0;
    let totalFailed = 0;
    const allErrors: RepairError[] = [];

    for (let i = 0; i < documentsToRepair.length; i += batchSize) {
      const batch = documentsToRepair.slice(i, i + batchSize);
      const batchIds = batch.map(doc => doc.id);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(documentsToRepair.length / batchSize)}`);
      
      const result = await processBatch(batchIds, dryRun);
      
      totalRepaired += result.repaired;
      totalFailed += result.failed;
      allErrors.push(...result.errors);
      
      // Small delay between batches to avoid overload
      if (i + batchSize < documentsToRepair.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    const response: RepairResponse = {
      totalDocuments: documentsToRepair.length,
      repaired: totalRepaired,
      failed: totalFailed,
      errors: allErrors,
    };

    console.log("Repair script completed");
    console.log("Summary:", response);

    return new Response(
      JSON.stringify(response),
      { status: 200, headers }
    );
  } catch (err) {
    console.error("repair-signed-documents error:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      { status: 500, headers }
    );
  }
});
