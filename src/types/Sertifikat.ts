export interface Sertifikat {
  id: string;
  document_id: string;
  nama_peserta: string;
  nama_acara: string;
  tanggal_acara: string;
  nomor_sertifikat: string;
  penandatangan?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}
