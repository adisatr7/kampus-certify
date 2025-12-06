import { Download, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { UserDocument, Sertifikat } from "../types";
import { supabase } from "@/integrations/supabase/client";
import SignedDocumentTemplate from "./SignedDocumentTemplate";
import { SertifikatTemplate } from "./SertifikatTemplate";

interface SignedDocumentViewerProps {
  isOpen: boolean;
  onClose: () => void;
  document: UserDocument;
}

export default function SignedDocumentViewer({
  isOpen,
  onClose,
  document,
}: SignedDocumentViewerProps) {
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [userData, setUserData] = useState<{
    name: string;
    jabatan?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch sertifikat data and user data if document is a sertifikat
  useEffect(() => {
    const fetchData = async () => {
      if (!document || !document.title?.toLowerCase().includes("sertifikat")) {
        return;
      }

      setLoading(true);
      try {
        // Fetch sertifikat data
        const { data: sertifikat } = await supabase
          .from("sertifikat")
          .select("*")
          .eq("document_id", document.id)
          .maybeSingle();

        if (sertifikat) {
          setSertifikatData(sertifikat as Sertifikat);
        }

        // Fetch user data if not already available
        if (!document.user && document.user_id) {
          const { data: user } = await supabase
            .from("users")
            .select("name, jabatan")
            .eq("id", document.user_id)
            .maybeSingle();

          if (user) {
            setUserData(user as { name: string; jabatan?: string });
          }
        } else if (document.user) {
          setUserData({
            name: document.user.name,
            jabatan: document.user.jabatan || undefined,
          });
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      fetchData();
    }
  }, [document, isOpen]);

  const isSertifikat = document.title?.toLowerCase().includes("sertifikat");

  const handlePrint = () => {
    if (document.file_url) {
      // Open PDF in new window for printing
      window.open(document.file_url, "_blank");
    } else {
      window.print();
    }
  };

  const handleDownload = () => {
    if (document.file_url) {
      // Download the actual signed PDF file
      const link = window.document.createElement("a");
      link.href = document.file_url;
      link.download = `${document.title}-signed.pdf`;
      link.target = "_blank";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
    }
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
              {document.file_url && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="print:hidden"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Download
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="mt-4 print:mt-0">
          {document.file_url ? (
            <div className="w-full h-[70vh] border rounded-lg overflow-hidden print:border-0 print:h-auto">
              <iframe
                src={document.file_url}
                className="w-full h-full"
                title="Signed Document PDF"
              />
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Memuat dokumen...</p>
            </div>
          ) : (
            <>
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  PDF sedang di-generate atau tidak tersedia
                </p>
              </div>
              {isSertifikat && sertifikatData ? (
                <div className="bg-gray-100 p-4 rounded-lg print:bg-white print:p-0">
                  <SertifikatTemplate
                    sertifikat={sertifikatData}
                    qrValue={`${window.location.origin}/verify?id=${
                      document.serial ?? document.id
                    }`}
                    showQR={true}
                    penandatangan1={
                      userData
                        ? {
                            name: userData.name,
                            jabatan: userData.jabatan,
                          }
                        : undefined
                    }
                  />
                </div>
              ) : (
                <SignedDocumentTemplate
                  document={document}
                  qrCodeUrl={undefined}
                />
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
