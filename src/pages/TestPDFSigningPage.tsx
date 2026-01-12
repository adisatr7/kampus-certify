/**
 * Test utility component untuk test signing existing PDF
 * Load PDF dari storage, sign dengan client-side, download
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { signPDFWithPKCS7 } from "@/lib/clientSidePdfSigner";
import {
  fetchSigningKey,
  prepareSigningKeyForClient,
} from "@/lib/clientSigningHelper";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/useToast";

export default function TestPDFSigningPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();

  const [documentId, setDocumentId] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [signingProgress, setSigningProgress] = useState<string>("");
  const [documents, setDocuments] = useState<any[]>([]);

  // Fetch list of documents
  useEffect(() => {
    const fetchDocuments = async () => {
      if (!userProfile) return;

      const { data, error } = await supabase
        .from("documents")
        .select("id, title, file_url, status")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        console.error("Error fetching documents:", error);
        return;
      }

      setDocuments(data || []);
    };

    fetchDocuments();
  }, [userProfile]);

  const logProgress = (message: string) => {
    console.log(message);
    setSigningProgress((prev) => prev + "\n" + message);
  };

  const signExistingPDF = async () => {
    if (!documentId || !userProfile) {
      toast({
        title: "Error",
        description: "Please select a document",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setSigningProgress("");

    try {
      logProgress("🔍 Fetching document...");

      // Get document
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();

      if (docError || !doc) {
        throw new Error("Document not found");
      }

      if (!doc.file_url) {
        throw new Error("Document has no file URL");
      }

      logProgress(`✅ Document found: ${doc.title}`);

      // Download existing PDF
      logProgress("📥 Downloading PDF from storage...");
      const response = await fetch(doc.file_url);

      if (!response.ok) {
        throw new Error(`Failed to download PDF: ${response.status}`);
      }

      const pdfBlob = await response.blob();
      const pdfBytes = new Uint8Array(await pdfBlob.arrayBuffer());

      logProgress(`✅ PDF downloaded: ${pdfBytes.length} bytes`);

      // Fetch signing key
      logProgress("🔑 Fetching signing key...");

      const signingKeyData = await fetchSigningKey(documentId, userProfile.id);

      if (!signingKeyData?.private_key) {
        throw new Error("No signing key found for this document");
      }

      if (!signingKeyData.x509_certificate) {
        throw new Error("No X.509 certificate found for signing key");
      }

      logProgress(`✅ Signing key found: ${signingKeyData.kid}`);

      // Prepare key for signing
      logProgress("🔐 Preparing signing key...");
      const keyForSigning = await prepareSigningKeyForClient(signingKeyData);
      logProgress("✅ Key prepared");

      // Sign PDF
      logProgress("✍️ Signing PDF with client-side PKCS#7...");

      const pkcs7Signature = await signPDFWithPKCS7(
        pdfBytes,
        keyForSigning.privateKey,
        keyForSigning.certificate,
        {
          reason: "Test Signature - Client-Side Signing",
          location: "Indonesia",
          contactInfo: userProfile.name,
        }
      );

      logProgress(
        `✅ PKCS#7 signature created: ${pkcs7Signature.byteLength} bytes`
      );

      // Create signed PDF blob
      // Note: In real implementation, you'd need to embed signature into PDF
      // For now, we'll just save PKCS#7 as separate file for testing
      const signedBlob = new Blob([pkcs7Signature], {
        type: "application/octet-stream",
      });

      // Download PKCS#7 for inspection
      const url = URL.createObjectURL(signedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${doc.title}-pkcs7-signature.bin`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logProgress(`📥 PKCS#7 signature downloaded`);

      // Also save the original PDF for comparison
      const originalUrl = URL.createObjectURL(pdfBlob);
      const b = document.createElement("a");
      b.href = originalUrl;
      b.download = `${doc.title}-original.pdf`;
      document.body.appendChild(b);
      b.click();
      document.body.removeChild(b);
      URL.revokeObjectURL(originalUrl);

      logProgress(`📥 Original PDF downloaded for comparison`);

      logProgress("✨ Signing test completed successfully!");

      toast({
        title: "Success",
        description: "PDF signed successfully. Check console for details.",
      });
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      logProgress(`❌ Error: ${errorMsg}`);
      console.error("Signing error:", error);

      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>🧪 Test PDF Signing (Client-Side)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Document:</label>
              <select
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">-- Choose a document --</option>
                {documents.map((doc) => (
                  <option key={doc.id} value={doc.id}>
                    {doc.title} ({doc.status})
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={signExistingPDF}
              disabled={!documentId || isLoading}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing...
                </>
              ) : (
                "Test Sign PDF"
              )}
            </Button>

            {signingProgress && (
              <div className="bg-gray-900 text-green-400 p-4 rounded-md font-mono text-sm max-h-96 overflow-y-auto">
                <pre>{signingProgress}</pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📋 Instructions</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              1. Select a document from the dropdown (will auto-load from
              database)
            </p>
            <p>2. Click "Test Sign PDF"</p>
            <p>3. The system will:</p>
            <ul className="list-disc list-inside ml-4 space-y-1">
              <li>Fetch the PDF from storage</li>
              <li>Fetch the signing key + certificate from database</li>
              <li>Create PKCS#7 signature client-side</li>
              <li>Download both PKCS#7 and original PDF for testing</li>
            </ul>
            <p>
              4. Check browser console (F12) for detailed signing process logs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>🔍 What Gets Downloaded</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p>
              <strong>original.pdf:</strong> The original PDF from storage
            </p>
            <p>
              <strong>pkcs7-signature.bin:</strong> The PKCS#7 signature bytes
              (for inspection)
            </p>
            <p className="text-gray-600 text-xs mt-4">
              In production, the PKCS#7 would be embedded into the PDF before
              download. This test version shows the raw signature for debugging.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
