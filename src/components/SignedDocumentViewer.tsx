import { Download, Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { UserDocument, Sertifikat, Ijazah } from "../types";
import { supabase } from "@/integrations/supabase/client";
import SignedDocumentTemplate from "./SignedDocumentTemplate";
import SertifikatRenderer from "./SertifikatRenderer";
import IjazahRenderer from "./IjazahRenderer";
import { createAuditEntry } from "@/lib/audit";
import { useAuth } from "@/lib/auth";

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
  const { userProfile } = useAuth();
  const [sertifikatData, setSertifikatData] = useState<Sertifikat | null>(null);
  const [ijazahData, setIjazahData] = useState<Ijazah | null>(null);
  const [userData, setUserData] = useState<{
    name: string;
    jabatan?: string;
  } | null>(null);
  const [dekanInfo, setDekanInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );
  const [rektorInfo, setRektorInfo] = useState<{ name?: string; nip?: string }>(
    {}
  );
  const [loading, setLoading] = useState(false);
  const [viewAuditLogged, setViewAuditLogged] = useState(false);

  // Fetch sertifikat/ijazah data and user data if document is a sertifikat or ijazah
  useEffect(() => {
    const fetchData = async () => {
      const isSertifikat = document.title?.toLowerCase().includes("sertifikat");
      const isIjazah = document.title?.toLowerCase().includes("ijazah");

      if (!document || (!isSertifikat && !isIjazah)) {
        return;
      }

      setLoading(true);
      try {
        if (isSertifikat) {
          // Fetch sertifikat data
          const { data: sertifikat } = await supabase
            .from("sertifikat")
            .select("*")
            .eq("document_id", document.id)
            .maybeSingle();

          if (sertifikat) {
            setSertifikatData(sertifikat as Sertifikat);
          }
        } else if (isIjazah) {
          // Fetch ijazah data
          const { data: ijazah } = await supabase
            .from("ijazah")
            .select("*")
            .eq("document_id", document.id)
            .maybeSingle();

          if (ijazah) {
            setIjazahData(ijazah as Ijazah);
          }
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

        // Fetch signer info for ijazah
        if (isIjazah && ijazahData) {
          const metadata = document.metadata || {};
          const dekanId = ijazahData.dekan_id || metadata.dekan_id;
          const rektorId = ijazahData.rektor_id || metadata.rektor_id;

          // Fetch dekan info
          if (dekanId) {
            const { data: dekanData } = await supabase
              .from("users")
              .select("name, nip")
              .eq("id", dekanId)
              .maybeSingle();

            if (dekanData) {
              setDekanInfo({ name: dekanData.name, nip: dekanData.nip });
            }
          }

          // Fetch rektor info
          if (rektorId) {
            const { data: rektorData } = await supabase
              .from("users")
              .select("name, nip")
              .eq("id", rektorId)
              .maybeSingle();

            if (rektorData) {
              setRektorInfo({ name: rektorData.name, nip: rektorData.nip });
            }
          }
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
  const isIjazah = document.title?.toLowerCase().includes("ijazah");

  // Log view audit when dialog opens
  useEffect(() => {
    if (isOpen && userProfile?.id && !viewAuditLogged) {
      createAuditEntry(
        userProfile.id,
        "VIEW_DOCUMENT",
        `Melihat dokumen "${document.title}" (ID: ${document.id})`
      );
      setViewAuditLogged(true);
    }
    if (!isOpen) {
      setViewAuditLogged(false);
    }
  }, [isOpen, userProfile?.id, document.id, document.title, viewAuditLogged]);

  const handlePrint = async () => {
    // Audit log for print
    if (userProfile?.id) {
      await createAuditEntry(
        userProfile.id,
        "PRINT_DOCUMENT",
        `Mencetak dokumen "${document.title}" (ID: ${document.id})`
      );
    }

    if (document.file_url) {
      // Open PDF in new window for printing
      window.open(document.file_url, "_blank");
    } else {
      window.print();
    }
  };

  const handleDownload = async () => {
    // Audit log for download
    if (userProfile?.id) {
      await createAuditEntry(
        userProfile.id,
        "DOWNLOAD_DOCUMENT",
        `Mengunduh dokumen "${document.title}" (ID: ${document.id})`
      );
    }

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
                  <SertifikatRenderer
                    nomorSertifikat={sertifikatData.nomor_sertifikat}
                    namaPeserta={sertifikatData.nama_peserta}
                    namaAcara={sertifikatData.nama_acara}
                    tanggalAcara={sertifikatData.tanggal_acara}
                    penandatanganName={userData?.name}
                    penandatanganJabatan={userData?.jabatan}
                    templateId={sertifikatData.template_id}
                    qrCodeUrl={`${window.location.origin}/verify?id=${
                      document.serial ?? document.id
                    }`}
                    renderMode="preview"
                  />
                </div>
              ) : isIjazah && ijazahData ? (
                <div className="bg-gray-100 p-4 rounded-lg print:bg-white print:p-0">
                  <IjazahRenderer
                    nim={ijazahData.nim}
                    nomorIjazah={document.serial || ijazahData.nomor_seri}
                    namaMahasiswa={ijazahData.nama_mahasiswa}
                    programStudi="Teknik Informatika"
                    fakultas={ijazahData.nama_fakultas}
                    gelar={ijazahData.gelar}
                    tanggalTerbit={ijazahData.tanggal_terbit}
                    dekanName={dekanInfo.name}
                    dekanNip={dekanInfo.nip}
                    rektorName={rektorInfo.name}
                    rektorNip={rektorInfo.nip}
                    templateId={ijazahData.template_id}
                    qrCodeUrl={`${window.location.origin}/verify/${
                      document.serial || ijazahData.nomor_seri
                    }`}
                    dekanQrCode={(document.metadata as any)?.dekan_qr_code}
                    rektorQrCode={(document.metadata as any)?.rektor_qr_code}
                    renderMode="preview"
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
