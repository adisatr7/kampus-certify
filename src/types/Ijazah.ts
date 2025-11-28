export interface Ijazah {
  id: string;
  document_id: string;
  nama_mahasiswa: string;
  nim: string;
  gelar: string;
  nomor_seri: string;
  tanggal_terbit: string;
  nama_fakultas: string;
  logo_url?: string | null;
  signing_key_id?: string | null;
  is_validated: boolean;
  validation_url?: string | null;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}
