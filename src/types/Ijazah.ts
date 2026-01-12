export interface Ijazah {
  id: string;
  document_id: string;
  nama_mahasiswa: string;
  nim: string;
  gelar: string;
  jenjang: string;
  nomor_seri: string;
  tanggal_terbit: string;
  tanggal_lulus?: string | null;
  nama_fakultas: string;
  program_studi?: string | null;
  angkatan?: string | null;
  predikat?: string | null;
  logo_url?: string | null;
  signing_key_id?: string | null;
  is_validated: boolean;
  validation_url?: string | null;
  template_id?: string | null;
  dekan_id?: string | null;
  rektor_id?: string | null;
  created_at: string;
  updated_at: string;
}
