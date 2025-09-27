import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Printer } from "lucide-react";
import SignedDocumentTemplate from "./SignedDocumentTemplate";

interface SignedDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: {
    id: string;
    title: string;
    signed_at: string | null;
    qr_code_url?: string | null;
    content?: string | null;
    users?: {
      name: string;
      role: string;
    };
  };
}

export default function SignedDocumentViewer({ isOpen, onClose, document }: SignedDocumentViewerProps) {
  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // Create a new window with the document template
    const printWindow = window.open('', '_blank');
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
            .header { text-align: left; margin-bottom: 40px; }
            .content-area { 
              min-height: 400px; 
              margin-bottom: 40px; 
              border: 2px dashed #ccc; 
              border-radius: 8px; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              flex-direction: column;
              color: #666;
            }
            .signature-block { 
              display: flex; 
              justify-content: flex-end; 
              margin-bottom: 40px; 
            }
            .signature-content { 
              text-align: center; 
              max-width: 250px; 
            }
            .qr-code { 
              width: 80px; 
              height: 80px; 
              border: 2px solid #666; 
              margin: 16px auto; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              background: #f5f5f5;
            }
            .print-date { text-align: left; margin-bottom: 40px; }
            .footer-info { 
              border: 2px solid #333; 
              padding: 20px; 
              position: relative; 
              font-size: 14px;
            }
            .footer-item { 
              display: flex; 
              margin-bottom: 8px; 
            }
            .footer-item span:first-child { 
              margin-right: 8px; 
              flex-shrink: 0; 
            }
            .bsre-logo { 
              position: absolute; 
              bottom: 20px; 
              right: 20px; 
              display: flex; 
              align-items: center; 
              gap: 8px;
            }
            .bsre-circle { 
              width: 48px; 
              height: 48px; 
              background: #2563eb; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              color: white; 
              font-weight: bold; 
              font-size: 12px;
            }
            .bsre-text { 
              font-size: 12px; 
              font-weight: bold; 
              color: #374151;
            }
            .document-id { 
              margin-top: 20px; 
              text-align: center; 
              font-size: 12px; 
              color: #666;
            }
            .underline { 
              border-bottom: 1px solid #666; 
              padding-bottom: 4px; 
            }
            @media print {
              body { margin: 0; padding: 0; }
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <p>Diterbitkan di Jakarta, tanggal: ${document.signed_at 
                ? new Date(document.signed_at).toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })
                : new Date().toLocaleDateString('id-ID', {
                    day: 'numeric', month: 'long', year: 'numeric'
                  })
              }</p>
            </div>
            
            <div class="content-area">
              ${document.content ? `
                <h2 style="font-size: 20px; font-weight: bold; text-align: center; margin-bottom: 24px;">${document.title}</h2>
                <div style="white-space: pre-wrap; color: #374151; line-height: 1.6;">${document.content}</div>
              ` : `
                <p style="margin: 0; font-weight: 500;">Konten Dokumen: ${document.title}</p>
                <p style="margin: 8px 0 0 0; font-size: 14px;">Konten dokumen belum tersedia</p>
              `}
            </div>
            
            <div class="signature-block">
              <div class="signature-content">
                <div style="margin-bottom: 16px;">
                  <p style="margin: 0; font-weight: 500;">${
                    document.users?.role === 'rektor' ? 'Rektor' : 
                    document.users?.role === 'dekan' ? 'Dekan' :
                    document.users?.role === 'dosen' ? 'Dosen' : 'Pejabat'
                  }</p>
                  <p style="margin: 0; font-weight: 500;">Universitas Muhammadiyah Cirebon</p>
                </div>
                
                <div class="qr-code">QR</div>
                
                <p style="margin: 16px 0 8px 0; font-weight: 500;">Ditandatangani secara elektronik</p>
                
                ${document.users?.name ? `<p style="margin: 8px 0 0 0; font-weight: 500;" class="underline">${document.users.name}</p>` : ''}
              </div>
            </div>
            
            <div class="print-date">
              <p>Dicetak tanggal: ${new Date().toLocaleDateString('id-ID', {
                day: 'numeric', month: 'long', year: 'numeric'
              })}</p>
            </div>
            
            <div class="footer-info">
              <div class="footer-item">
                <span>1.</span>
                <span>Dokumen ini diterbitkan sistem OSS berdasarkan data dari Pelaku Usaha, tersimpan dalam sistem OSS, yang menjadi tanggung jawab Pelaku Usaha.</span>
              </div>
              <div class="footer-item">
                <span>2.</span>
                <span>Dalam hal terjadi kekeliruan isi dokumen ini akan dilakukan perbaikan sebagaimana mestinya.</span>
              </div>
              <div class="footer-item">
                <span>3.</span>
                <span>Dokumen ini telah ditandatangani secara elektronik menggunakan sertifikat elektronik yang diterbitkan oleh BSrE-BSSN.</span>
              </div>
              <div class="footer-item">
                <span>4.</span>
                <span>Data lengkap Perizinan Berusaha dapat diperoleh melalui sistem OSS menggunakan hak akses.</span>
              </div>
              
              <div class="bsre-logo">
                <div class="bsre-circle">BSrE</div>
                <div class="bsre-text">
                  <div>Balai Sertifikasi</div>
                  <div>Elektronik</div>
                </div>
              </div>
            </div>
            
            <div class="document-id">
              <p>ID Dokumen: ${document.id}</p>
              ${document.qr_code_url ? `<p>Verifikasi: ${document.qr_code_url}</p>` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(templateHtml);
    printWindow.document.close();
    
    // Trigger download
    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>Dokumen Ditandatangani: {document.title}</DialogTitle>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handlePrint}
                className="print:hidden"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownload}
                className="print:hidden"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="mt-4">
          <SignedDocumentTemplate 
            document={document} 
            qrCodeUrl={document.qr_code_url || undefined}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}