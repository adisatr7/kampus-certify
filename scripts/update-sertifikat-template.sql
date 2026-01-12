-- Update existing sertifikat template dengan struktur yang benar
UPDATE public.document_templates
SET html_content = '<div class="sertifikat-container" style="max-width: 800px; margin: 40px auto; padding: 40px; font-family: ''Times New Roman'', serif; text-align: center; border: 3px solid #B8860B;">
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
    css_content = '',
    updated_at = NOW()
WHERE type = 'sertifikat' AND name LIKE '%Template Sertifikat%';
