import { Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { UserDocument } from "../types";
import SignedDocumentTemplate from "./SignedDocumentTemplate";

interface SignedDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument;
  // document: {
  //   id: string;
  //   title: string;
  //   signed_at: string | null;
  //   qr_code_url?: string | null;
  //   content?: string | null;
  //   signed_document_url?: string | null;
  //   users?: {
  //     name: string;
  //     role: string;
  //   };
  // };
}
// TODO: redesign viewer to match new template design

export default function SignedDocumentViewer({
  isOpen,
  onClose,
  document,
}: SignedDocumentViewerProps) {
  const handlePrint = () => {
    if (document.signed_document_url) {
      // Open PDF in new window for printing
      window.open(document.signed_document_url, "_blank");
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    if (document.signed_document_url) {
      // Download the actual signed PDF file
      const link = window.document.createElement("a");
      link.href = document.signed_document_url;
      link.download = `${document.title}-signed.pdf`;
      link.target = "_blank";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    } else {
      // Fallback to HTML print
      const printWindow = window.open("", "_blank");
      if (!printWindow) return;

      const templateHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${document.title}</title>
            <meta charset="utf-8">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 0; 
                padding: 20px; 
                background: white;
              }
              .container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 40px;
              }
              @media print {
                body { margin: 0; padding: 0; }
                .container { padding: 20px; }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${document.title}</h1>
              <p>${document.content || "Konten tidak tersedia"}</p>
            </div>
          </body>
        </html>
      `;

      printWindow.document.write(templateHtml);
      printWindow.document.close();

      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Dokumen Ditandatangani: {document.title}</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handlePrint} className="print:hidden">
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload} className="print:hidden">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4">
          {document.signed_document_url ? (
            <div className="w-full h-[70vh] border rounded-lg overflow-hidden">
              <iframe
                src={document.signed_document_url}
                className="w-full h-full"
                title="Signed Document PDF"
              />
            </div>
          ) : (
            <SignedDocumentTemplate
              document={document}
              qrCodeUrl={document.qr_code_url || undefined}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
