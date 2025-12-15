export interface Sertifikat {
  id: string;
  document_id: string;
  nama_peserta: string;
  nim?: string | null;
  nama_acara: string;
  jenis_sertifikat?: string | null;
  penyelenggara?: string | null;
  tanggal_acara: string;
  nomor_sertifikat: string;
  penandatangan?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}
