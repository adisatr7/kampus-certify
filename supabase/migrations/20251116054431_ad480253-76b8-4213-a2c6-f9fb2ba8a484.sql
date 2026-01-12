-- Create document_type enum
CREATE TYPE document_type AS ENUM ('ijazah', 'sertifikat', 'other');

-- Add document_type to documents table
ALTER TABLE public.documents
ADD COLUMN document_type document_type DEFAULT 'other',
ADD COLUMN metadata jsonb DEFAULT '{}'::jsonb;

-- Create document_templates table
CREATE TABLE public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type document_type NOT NULL,
  html_content text NOT NULL,
  css_content text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true
);

-- Create ijazah table
CREATE TABLE public.ijazah (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  nama_mahasiswa text NOT NULL,
  nim text NOT NULL,
  program_studi text NOT NULL,
  gelar text NOT NULL,
  tanggal_kelulusan date NOT NULL,
  predikat text,
  nomor_seri text NOT NULL,
  tanggal_terbit date NOT NULL,
  template_id uuid REFERENCES public.document_templates(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create sertifikat table
CREATE TABLE public.sertifikat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  nama_peserta text NOT NULL,
  nama_acara text NOT NULL,
  tanggal_acara date NOT NULL,
  nomor_sertifikat text NOT NULL,
  penandatangan text,
  template_id uuid REFERENCES public.document_templates(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ijazah ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sertifikat ENABLE ROW LEVEL SECURITY;

-- RLS Policies for document_templates
CREATE POLICY "Anyone can view active templates"
  ON public.document_templates
  FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage templates"
  ON public.document_templates
  FOR ALL
  USING (public.is_admin(auth.uid()));

-- RLS Policies for ijazah
CREATE POLICY "Admins can view all ijazah"
  ON public.ijazah
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins and Rektor can insert ijazah"
  ON public.ijazah
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'rektor')
  );

CREATE POLICY "Admins can update ijazah"
  ON public.ijazah
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete ijazah"
  ON public.ijazah
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- RLS Policies for sertifikat
CREATE POLICY "Admins can view all sertifikat"
  ON public.sertifikat
  FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Authorized users can insert sertifikat"
  ON public.sertifikat
  FOR INSERT
  WITH CHECK (
    public.is_admin(auth.uid()) OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('rektor', 'dosen', 'dekan'))
  );

CREATE POLICY "Admins can update sertifikat"
  ON public.sertifikat
  FOR UPDATE
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete sertifikat"
  ON public.sertifikat
  FOR DELETE
  USING (public.is_admin(auth.uid()));

-- Create triggers for updated_at
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ijazah_updated_at
  BEFORE UPDATE ON public.ijazah
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_sertifikat_updated_at
  BEFORE UPDATE ON public.sertifikat
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_documents_document_type ON public.documents(document_type);
CREATE INDEX idx_ijazah_document_id ON public.ijazah(document_id);
CREATE INDEX idx_ijazah_nim ON public.ijazah(nim);
CREATE INDEX idx_sertifikat_document_id ON public.sertifikat(document_id);
CREATE INDEX idx_sertifikat_nomor ON public.sertifikat(nomor_sertifikat);
CREATE INDEX idx_templates_type ON public.document_templates(type);

-- Insert default templates (only if admin user exists)
DO $$
DECLARE
  admin_id uuid;
BEGIN
  SELECT id INTO admin_id FROM public.users WHERE role = 'admin' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    INSERT INTO public.document_templates (name, type, html_content, css_content, created_by, is_active)
    VALUES 
      (
        'Template Ijazah Default',
        'ijazah',
        '<div class="ijazah-container">
          <h1>IJAZAH</h1>
          <p>Diberikan kepada:</p>
          <h2>{{nama_mahasiswa}}</h2>
          <p>NIM: {{nim}}</p>
          <p>Program Studi: {{program_studi}}</p>
          <p>Gelar: {{gelar}}</p>
          <p>Lulus pada: {{tanggal_kelulusan}}</p>
          <p>Predikat: {{predikat}}</p>
          <p>Nomor Seri: {{nomor_seri}}</p>
          <p>Tanggal Terbit: {{tanggal_terbit}}</p>
        </div>',
        '.ijazah-container { text-align: center; padding: 2rem; font-family: "Times New Roman", serif; }',
        admin_id,
        true
      ),
      (
        'Template Sertifikat Default',
        'sertifikat',
        '<div class="sertifikat-container" style="max-width: 800px; margin: 40px auto; padding: 40px; font-family: ''Times New Roman'', serif; text-align: center; border: 3px solid #B8860B;">
          <h1 style="color: #B8860B; font-size: 48px; letter-spacing: 0.2em;">SERTIFIKAT</h1>
          <p style="color: #999; font-size: 14px;">PENGHARGAAN</p>
          <p style="color: #B8860B; margin: 20px 0;">No. {{nomor_sertifikat}}</p>
          
          <p style="margin: 30px 0; font-size: 14px;">Dengan rasa hormat dan bangga, kami menganugerahkan penghargaan ini kepada</p>
          
          <h2 style="color: #B8860B; font-size: 36px; margin: 30px 0; font-style: italic;">{{nama_peserta}}</h2>
          
          <p style="font-size: 13px; line-height: 1.8; margin: 30px 0;">
            Sebagai bentuk apresiasi atas partisipasi aktif dan kontribusinya dalam kegiatan yang diselenggarakan dengan tema <strong>{{nama_acara}}</strong> pada tanggal <strong>{{tanggal_acara}}</strong>. Semoga ilmu yang didapat membawa keberkahan.
          </p>
          
          <div style="margin-top: 60px; padding-top: 40px; border-top: 1px solid #ccc; display: flex; justify-content: flex-end; gap: 80px;">
            <div class="signer" style="text-align: center; min-width: 150px;">
              <div style="display: flex; justify-content: center; margin-bottom: 10px;">
                <div style="border: 2px solid #333; padding: 4px; background: white;">
                  <img src="{{qr_code}}" alt="QR Code" style="width: 70px; height: 70px; display: block;" />
                </div>
              </div>
              <p style="font-size: 14px; font-weight: bold; text-decoration: underline; margin: 5px 0;">{{signer1_name}}</p>
              <p style="font-size: 12px; color: #666; margin: 2px 0;">{{signer1_jabatan}}</p>
              <p style="font-size: 11px; color: #666; margin: 2px 0;">{{signer1_nip}}</p>
            </div>
          </div>
        </div>',
        '',
        admin_id,
        true
      );
  END IF;
END $$;