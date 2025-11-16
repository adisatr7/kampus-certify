export interface Ijazah {
  id: string;
  document_id: string;
  nama_mahasiswa: string;
  nim: string;
  program_studi: string;
  gelar: string;
  tanggal_kelulusan: string;
  predikat?: string | null;
  nomor_seri: string;
  tanggal_terbit: string;
  template_id?: string | null;
  created_at: string;
  updated_at: string;
}
