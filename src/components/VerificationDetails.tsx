import { UserDocument, Ijazah, Sertifikat } from "@/types";
import { Card } from "@/components/ui/Card";

interface VerificationDetailsProps {
  document: UserDocument;
  ijazahData?: Ijazah | null;
  sertifikatData?: Sertifikat | null;
  documentType: string;
}

export function VerificationDetails({
  document,
  ijazahData,
  sertifikatData,
  documentType,
}: VerificationDetailsProps) {
  // Render Ijazah Details
  if (documentType === "ijazah" && ijazahData) {
    return (
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-bold text-lg">Detail Ijazah</h3>
        <div className="grid gap-4">
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Nama Lengkap</span>
            <span className="font-medium">{ijazahData.nama_mahasiswa}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">NIM</span>
            <span className="font-medium font-mono">{ijazahData.nim}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Program Studi</span>
            <span className="font-medium">{ijazahData.nama_fakultas}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Jenjang</span>
            <span className="font-medium">{ijazahData.jenjang}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Tanggal Lulus</span>
            <span className="font-medium">
              {new Date(ijazahData.tanggal_terbit).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Tanggal Penerbitan</span>
            <span className="font-medium">
              {new Date(ijazahData.tanggal_terbit).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render Sertifikat Details
  if (documentType === "sertifikat" && sertifikatData) {
    return (
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-bold text-lg">Detail Sertifikat</h3>
        <div className="grid gap-4">
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Nama Lengkap</span>
            <span className="font-medium">{sertifikatData.nama_peserta}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Jenis Sertifikat</span>
            <span className="font-medium">Sertifikat Pelatihan</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Nama Kegiatan</span>
            <span className="font-medium">{sertifikatData.nama_acara}</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Tanggal Pelaksanaan</span>
            <span className="font-medium">
              {new Date(sertifikatData.tanggal_acara).toLocaleDateString(
                "id-ID",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                }
              )}
            </span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Tanggal Penerbitan</span>
            <span className="font-medium">
              {new Date(sertifikatData.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Render Surat Details (generic)
  if (documentType === "surat") {
    return (
      <div className="space-y-4 border-t pt-6">
        <h3 className="font-bold text-lg">Detail Surat</h3>
        <div className="grid gap-4">
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Nama Lengkap</span>
            <span className="font-medium">
              {document.recipient_name || "-"}
            </span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">NIM/NIP/NIK</span>
            <span className="font-medium font-mono">
              {document.recipient_student_number || "-"}
            </span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Jenis Surat</span>
            <span className="font-medium">Surat Keterangan</span>
          </div>
          <div className="flex justify-between border-b pb-3">
            <span className="text-muted-foreground">Tanggal Penerbitan</span>
            <span className="font-medium">
              {new Date(document.created_at).toLocaleDateString("id-ID", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
