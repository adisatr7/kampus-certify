import { IDetectedBarcode, Scanner } from "@yudiel/react-qr-scanner";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/useToast";

export default function QrScanner() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleBack = () => {
    navigate(-1);
  };

  const handleScan = (detectedBarcodes: IDetectedBarcode[]) => {
    console.log("Isi QR code:", detectedBarcodes);
    const decodedText = detectedBarcodes[0]?.rawValue;

    if (!decodedText || typeof decodedText !== "string" || decodedText.length === 0) {
      toast({
        title: "QR code tidak valid.",
        description: "QR code tidak dapat dibaca atau tidak berisi data yang valid.",
        variant: "destructive",
      });
      return;
    }

    // Allow localhost if it contains /verify?id=, otherwise reject in production
    if (decodedText.startsWith("http://localhost")) {
      try {
        const url = new URL(decodedText);
        if (url.pathname !== "/verify" || !url.searchParams.has("id")) {
          toast({
            title: "QR code ini mengarah ke localhost.",
            description: "Harap hubungi admin untuk memperbaiki dokumen ini.",
            variant: "destructive",
          });
          return;
        }
      } catch {
        toast({
          title: "QR code tidak valid.",
          description: "URL tidak dapat diproses.",
          variant: "destructive",
        });
        return;
      }
    }

    if (!decodedText.startsWith(`${window.location.origin}${import.meta.env.BASE_URL}`)) {
      toast({
        title: "QR code ini mengarah ke website lain.",
        description: "Harap pastikan QR code yang di-scan sudah benar.",
        variant: "destructive",
      });
      return;
    }

    try {
      const url = new URL(decodedText);
      const documentId = url.searchParams.get("id");

      if (documentId) {
        navigate(`/verify?id=${documentId}`);
      } else {
        toast({
          title: "QR code tidak valid.",
          description: "ID dokumen tidak ditemukan pada QR code ini.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error parsing QR code URL:", error);
      toast({
        title: "Terjadi kesalahan saat memproses QR code.",
        description: "Harap hubungi admin dan sertakan QR code ini.",
        variant: "destructive",
      });
    }
  };

  return (
    <main className="w-screen h-screen">
      {/* Top Header */}
      <header className="bg-primary top-0 left-0 right-0 h-12 flex items-center justify-center p-2 z-10">
        <button
          className="p-2 absolute left-2"
          onClick={handleBack}
          aria-label="Kembali"
        >
          <ChevronLeft />
        </button>
        <h1>QR Scanner</h1>
      </header>

      {/* Camera */}
      <section className="w-full h-[calc(100vh-3rem)] flex flex-col items-center justify-center">
        <Scanner
          allowMultiple={false}
          onScan={handleScan}
          onError={(error) =>
            toast({
              title: "Terjadi kesalahan saat memindai QR code.",
              description: String(error),
              variant: "destructive",
            })
          }
        />
      </section>
    </main>
  );
}
