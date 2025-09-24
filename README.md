# CA UMC - Certificate Authority Universitas Muhammadiyah Cirebon

Sistem Certificate Authority (CA) internal kampus untuk penerbitan sertifikat digital, tanda tangan elektronik, manajemen dokumen, audit trail, dan portal verifikasi publik.

## 🏛️ Tentang Sistem

**CA UMC** adalah sistem Certificate Authority berbasis web yang dirancang khusus untuk Universitas Muhammadiyah Cirebon. Sistem ini memungkinkan penerbitan dan pengelolaan sertifikat digital untuk dokumen resmi kampus dengan standar keamanan tinggi.

### Fitur Utama

- ✅ **Autentikasi Google SSO** - Login menggunakan akun Google dengan whitelist
- ✅ **Manajemen Sertifikat Digital** - Penerbitan, pencabutan, dan pemantauan sertifikat
- ✅ **Tanda Tangan Digital (PAdES)** - Dokumen PDF dengan tanda tangan yang valid di Adobe Reader
- ✅ **Portal Verifikasi Publik** - Verifikasi keaslian dokumen tanpa perlu login
- ✅ **QR Code Generator** - Setiap dokumen dilengkapi QR code untuk verifikasi
- ✅ **Multi-Role Management** - Admin, Dosen, Rektor, Dekan dengan hak akses berbeda
- ✅ **Audit Trail** - Pencatatan seluruh aktivitas sistem
- ✅ **Certificate Revocation List (CRL)** - Pengelolaan sertifikat yang dicabut
- ✅ **Modern UI/UX** - Desain responsif dengan palet warna UMC

## 🎨 Desain & Branding

### Palet Warna UMC
- **Maroon (#800000)** - Warna utama/primary
- **Abu-abu (#808080)** - Background sidebar
- **Hitam (#000000)** - Teks utama
- **Putih (#FFFFFF)** - Background konten

### Konsep Desain
- **Modern Minimalis** dengan clean layout
- **Glassmorphism Effect** pada card dan modal
- **Responsive Design** untuk desktop dan mobile
- **Sidebar Navigation** dengan icon dan label

## 👥 Role & Hak Akses

### 🔧 **Admin**
- Penerbitan sertifikat untuk semua pengguna
- Manajemen dokumen: CRUD untuk semua pengguna
- Pencabutan (revoke) sertifikat
- Manajemen pengguna sistem
- Audit trail lengkap
- Verifikasi dokumen

### 👨‍🏫 **Dosen / Rektor / Dekan**
- Manajemen dokumen pribadi
- Tanda tangan dokumen dengan sertifikat sendiri
- Verifikasi dokumen
- Melihat sertifikat pribadi

### 🌐 **Publik (Tanpa Login)**
- Portal verifikasi dokumen
- Scan QR code dari dokumen
- Download dokumen yang terverifikasi

## 🛠️ Teknologi

### Frontend
- **React 18** dengan TypeScript
- **Vite** untuk build tool
- **Tailwind CSS** untuk styling
- **Shadcn/ui** untuk component library
- **Lucide React** untuk icons
- **React Router** untuk routing

### Backend & Database
- **Supabase** (PostgreSQL)
- **Supabase Auth** untuk autentikasi
- **Supabase Storage** untuk file storage
- **Edge Functions** untuk digital signature

### Keamanan & Sertifikat
- **Digital Signature (PAdES)** - PDF Advanced Electronic Signatures
- **RSA-2048** encryption untuk sertifikat
- **QR Code** dengan unique ID untuk verifikasi
- **Certificate Revocation List (CRL)**

## 🗄️ Struktur Database

### Tabel `users`
```sql
id (uuid, PK)
email (text, unique)
name (text)
role (enum: admin, dosen, rektor, dekan)
google_id (text)
certificate_id (uuid)
created_at (timestamp)
updated_at (timestamp)
```

### Tabel `certificates`
```sql
id (uuid, PK)
user_id (uuid, FK → users.id)
serial_number (text, unique)
public_key (text)
private_key (text, encrypted)
issued_at (timestamp)
expires_at (timestamp)
status (enum: active, expired, revoked)
revoked_at (timestamp, nullable)
algorithm (text, default 'RSA-2048')
```

### Tabel `documents`
```sql
id (uuid, PK)
user_id (uuid, FK → users.id)
title (text)
file_url (text, Supabase Storage)
signed (boolean, default false)
signed_at (timestamp)
qr_code_url (text)
status (enum: pending, signed, revoked)
certificate_id (uuid, FK → certificates.id)
document_hash (text)
signature_data (jsonb)
```

### Tabel `audit_trail`
```sql
id (uuid, PK)
user_id (uuid, FK → users.id)
action (text)
timestamp (timestamp)
description (text)
ip_address (inet)
user_agent (text)
```

## 🚀 Cara Menjalankan Aplikasi

### Prasyarat
- **Node.js** versi 18 atau lebih baru
- **npm** atau **yarn**
- Akun **Supabase** (untuk backend)
- Akun **Google Cloud Console** (untuk OAuth)

### Langkah 1: Clone Repository
```bash
git clone <repository-url>
cd ca-umc-system
```

### Langkah 2: Install Dependencies
```bash
npm install
# atau
yarn install
```

### Langkah 3: Setup Supabase

1. **Buat Project Baru di Supabase**
   - Kunjungi [supabase.com](https://supabase.com)
   - Buat project baru dengan nama "CA-UMC"

2. **Setup Database**
   ```sql
   -- Jalankan script SQL berikut di Supabase SQL Editor:
   
   -- Enable UUID extension
   CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
   
   -- Create enum types
   CREATE TYPE user_role AS ENUM ('admin', 'dosen', 'rektor', 'dekan');
   CREATE TYPE cert_status AS ENUM ('active', 'expired', 'revoked');
   CREATE TYPE doc_status AS ENUM ('pending', 'signed', 'revoked');
   
   -- Create users table
   CREATE TABLE users (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     email TEXT UNIQUE NOT NULL,
     name TEXT NOT NULL,
     role user_role NOT NULL DEFAULT 'dosen',
     google_id TEXT UNIQUE,
     certificate_id UUID,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Create certificates table
   CREATE TABLE certificates (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     serial_number TEXT UNIQUE NOT NULL,
     public_key TEXT NOT NULL,
     private_key TEXT NOT NULL, -- akan dienkripsi di aplikasi
     issued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
     status cert_status DEFAULT 'active',
     revoked_at TIMESTAMP WITH TIME ZONE,
     algorithm TEXT DEFAULT 'RSA-2048'
   );
   
   -- Create documents table
   CREATE TABLE documents (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id) ON DELETE CASCADE,
     title TEXT NOT NULL,
     file_url TEXT,
     signed BOOLEAN DEFAULT FALSE,
     signed_at TIMESTAMP WITH TIME ZONE,
     qr_code_url TEXT,
     status doc_status DEFAULT 'pending',
     certificate_id UUID REFERENCES certificates(id),
     document_hash TEXT,
     signature_data JSONB,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );
   
   -- Create audit_trail table
   CREATE TABLE audit_trail (
     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
     user_id UUID REFERENCES users(id),
     action TEXT NOT NULL,
     timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
     description TEXT,
     ip_address INET,
     user_agent TEXT
   );
   
   -- Create indexes
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_certificates_user_id ON certificates(user_id);
   CREATE INDEX idx_documents_user_id ON documents(user_id);
   CREATE INDEX idx_audit_trail_user_id ON audit_trail(user_id);
   CREATE INDEX idx_audit_trail_timestamp ON audit_trail(timestamp);
   ```

3. **Setup Storage Bucket**
   ```sql
   -- Buat storage bucket untuk dokumen
   INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', true);
   INSERT INTO storage.buckets (id, name, public) VALUES ('qr-codes', 'qr-codes', true);
   
   -- Policy untuk akses file
   CREATE POLICY "Public read access" ON storage.objects FOR SELECT USING (bucket_id = 'documents');
   CREATE POLICY "Authenticated upload access" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');
   ```

### Langkah 4: Setup Google OAuth

1. **Google Cloud Console**
   - Buka [Google Cloud Console](https://console.cloud.google.com/)
   - Buat project baru atau pilih yang sudah ada
   - Aktifkan Google+ API dan People API

2. **Credentials OAuth 2.0**
   - Buat OAuth 2.0 Client ID
   - Authorized JavaScript origins: `http://localhost:5173`, `https://yourdomain.com`
   - Authorized redirect URIs: `http://localhost:5173/auth/callback`

### Langkah 5: Konfigurasi Supabase di Lovable

1. **Aktivasi Integrasi Supabase**
   - Klik tombol **Supabase** hijau di pojok kanan atas Lovable
   - Masukkan Supabase URL dan ANON KEY
   - Masukkan Google OAuth Client ID

2. **Setup Environment Variables**
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_GOOGLE_CLIENT_ID=your_google_client_id
   ```

### Langkah 6: Jalankan Aplikasi

```bash
# Development mode
npm run dev

# Build untuk production
npm run build

# Preview production build
npm run preview
```

### Langkah 7: Setup Data Initial

1. **Tambahkan Admin User**
   ```sql
   INSERT INTO users (email, name, role) 
   VALUES ('admin@umc.ac.id', 'Administrator UMC', 'admin');
   ```

2. **Tambahkan Sample Users**
   ```sql
   INSERT INTO users (email, name, role) VALUES 
   ('rektor@umc.ac.id', 'Prof. Dr. Ahmad Zain, M.Pd.', 'rektor'),
   ('dekan.teknik@umc.ac.id', 'Dr. Siti Fatimah, S.T., M.T.', 'dekan'),
   ('dosen1@umc.ac.id', 'Ahmad Hidayat, S.Kom., M.T.', 'dosen');
   ```

## 📱 Penggunaan Aplikasi

### Untuk Admin
1. Login dengan akun Google yang terdaftar
2. Dashboard menampilkan statistik sistem
3. Kelola sertifikat: terbitkan, lihat, cabut
4. Kelola dokumen semua pengguna
5. Monitor audit trail

### Untuk Dosen/Rektor/Dekan
1. Login dengan akun Google
2. Upload dokumen pribadi
3. Tanda tangani dokumen dengan sertifikat
4. Verifikasi dokumen
5. Download dokumen yang sudah ditandatangani

### Untuk Publik
1. Akses `/verify` tanpa login
2. Masukkan ID dokumen atau scan QR code
3. Lihat status verifikasi (VALID/INVALID/REVOKED)
4. Download dokumen jika valid

## 🔐 Keamanan

### Digital Signature
- Menggunakan standar **PAdES** (PDF Advanced Electronic Signatures)
- Algoritma **RSA-2048** untuk enkripsi
- Private key disimpan terenkripsi di database
- Validasi signature di Adobe Reader

### Autentikasi
- **Google OAuth 2.0** dengan whitelist email
- Session management dengan Supabase Auth
- Role-based access control (RBAC)

### Audit Trail
- Semua aktivitas tercatat dengan timestamp
- IP address dan User Agent tracking
- Log untuk sertifikat, dokumen, dan verifikasi

## 🚧 Roadmap Development

### Phase 1 (Current)
- ✅ UI/UX Design System
- ✅ Authentication flow
- ✅ Basic dashboard
- ✅ Public verification portal

### Phase 2 (Next)
- 🔄 Supabase integration
- 🔄 Certificate management
- 🔄 Document upload & signing
- 🔄 QR code generation

### Phase 3 (Future)
- ⏳ Digital signature (PAdES)
- ⏳ Mobile app
- ⏳ Bulk operations
- ⏳ Advanced reporting

## 🤝 Kontribusi

Untuk berkontribusi pada project ini:

1. Fork repository
2. Buat branch feature (`git checkout -b feature/nama-fitur`)
3. Commit perubahan (`git commit -m 'Tambah fitur baru'`)
4. Push ke branch (`git push origin feature/nama-fitur`)
5. Buat Pull Request

## 📞 Kontak & Support

- **Email**: admin@umc.ac.id
- **Website**: https://umc.ac.id
- **GitHub**: [Repository CA UMC]

---

**© 2025 Universitas Muhammadiyah Cirebon - Certificate Authority**

*Sistem ini dikembangkan untuk mendukung transformasi digital kampus dengan standar keamanan tinggi dan user experience yang modern.*