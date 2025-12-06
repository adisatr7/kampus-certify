# Diagram Alur Pembuatan Ijazah

## Visual Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         ALUR PEMBUATAN IJAZAH                           │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 1: DEKAN MEMBUAT IJAZAH                                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Halaman: /create-ijazah                                               │
│  Role: Dekan                                                           │
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  FORM INPUT DATA MANUAL                 │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  • Nama Mahasiswa                       │                          │
│  │  • NIM                                  │                          │
│  │  • Nama Fakultas                        │                          │
│  │  • Gelar                                │                          │
│  │  • Tanggal Terbit                       │                          │
│  │  • Rektor Penandatangan (dropdown)      │                          │
│  │  • Logo URL (optional)                  │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│              [Tombol Preview]                                          │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PREVIEW IJAZAH                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────────────────────────────────────────────────┐        │
│  │                    PREVIEW MODAL                          │        │
│  │  ┌─────────────────────────────────────────────────────┐  │        │
│  │  │  ╔════════════════════════════════════════════════╗  │  │        │
│  │  │  ║           IJAZAH PREVIEW                       ║  │  │        │
│  │  │  ║                                                ║  │  │        │
│  │  │  ║  Nama: [Nama Mahasiswa]                       ║  │  │        │
│  │  │  ║  NIM: [NIM]                                   ║  │  │        │
│  │  │  ║  Fakultas: [Nama Fakultas]                    ║  │  │        │
│  │  │  ║  Gelar: [Gelar]                               ║  │  │        │
│  │  │  ║                                                ║  │  │        │
│  │  │  ║  [Dekan]              [Rektor]                ║  │  │        │
│  │  │  ║  (QR akan muncul)     (QR akan muncul)        ║  │  │        │
│  │  │  ╚════════════════════════════════════════════════╝  │  │        │
│  │  └─────────────────────────────────────────────────────┘  │        │
│  │                                                            │        │
│  │  Catatan: QR code akan ditambahkan setelah ditandatangani │        │
│  │                                                            │        │
│  │  [Close]                                                   │        │
│  └───────────────────────────────────────────────────────────┘        │
│                      ↓                                                  │
│          [Kembali ke Form atau Buat Ijazah]                           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 3: BUAT IJAZAH                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  [Tombol: Buat Ijazah]                                                │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  DATABASE: documents table              │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  user_id: dekan_id                      │                          │
│  │  status: "pending"                      │                          │
│  │  document_type: "ijazah"                │                          │
│  │  metadata: {                            │                          │
│  │    workflow_stage: "dekan_pending"      │                          │
│  │    rektor_id: [selected_rektor_id]      │                          │
│  │  }                                      │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  DATABASE: ijazah table                 │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  document_id: [document.id]             │                          │
│  │  nama_mahasiswa: [input]                │                          │
│  │  nim: [input]                           │                          │
│  │  gelar: [input]                         │                          │
│  │  nama_fakultas: [input]                 │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  Redirect ke: /document-signing/{document.id}                         │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 4: DEKAN MENANDATANGANI IJAZAH                                   │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Halaman: /document-signing/{document.id}                             │
│  Role: Dekan                                                           │
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  RINGKASAN DOKUMEN                      │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  Jenis: Ijazah                          │                          │
│  │  Nama: [Nama Mahasiswa]                 │                          │
│  │  NIM: [NIM]                             │                          │
│  │  Fakultas: [Nama Fakultas]              │                          │
│  │  Status: pending                        │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  INPUT QR CODE                          │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  [Input field untuk QR code]            │                          │
│  │  "Masukkan kode QR atau scan..."        │                          │
│  │                                         │                          │
│  │  Catatan: QR code ini akan ditampilkan  │                          │
│  │  pada nama Anda di dokumen              │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  [Tombol: Tanda Tangani Dokumen]                                      │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  BACKEND PROCESS                        │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  1. Update dokumen dekan:               │                          │
│  │     status: "signed" ✅                 │                          │
│  │     workflow_stage: "completed"         │                          │
│  │     dekan_qr_code: [input_value]        │                          │
│  │                                         │                          │
│  │  2. Buat dokumen baru untuk rektor:     │                          │
│  │     user_id: rektor_id                  │                          │
│  │     status: "pending"                   │                          │
│  │     workflow_stage: "rektor_pending"    │                          │
│  │                                         │                          │
│  │  3. Copy ijazah data ke dokumen rektor  │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  Toast: "Ijazah berhasil ditandatangani dan dikirim ke Rektor"       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 5: STATUS DOKUMEN DEKAN BERUBAH MENJADI "SIGNED"                 │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  TABEL DOKUMEN DEKAN                    │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  Ijazah - [Nama]  │  Signed ✅  │ [QR]  │                          │
│  └─────────────────────────────────────────┘                          │
│                                                                         │
│  • Status: "signed" ✅                                                 │
│  • QR code muncul pada nama Dekan                                     │
│  • Dokumen visible di dashboard Dekan                                 │
│  • Workflow stage: "completed" untuk Dekan                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 6: DOKUMEN OTOMATIS TERKIRIM KE REKTOR                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  TABEL DOKUMEN REKTOR                   │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  Ijazah - [Nama]  │  Pending  │ [Ttd]   │                          │
│  └─────────────────────────────────────────┘                          │
│                                                                         │
│  • Dokumen baru dibuat otomatis                                       │
│  • user_id: rektor_id                                                 │
│  • Status: "pending"                                                  │
│  • Workflow stage: "rektor_pending"                                   │
│  • Metadata berisi info tanda tangan dekan                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 7: REKTOR TTD DAN ISI QR CODE                                    │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  Halaman: /document-signing/{rektor_document.id}                      │
│  Role: Rektor                                                          │
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  RINGKASAN DOKUMEN                      │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  Jenis: Ijazah                          │                          │
│  │  Nama: [Nama Mahasiswa]                 │                          │
│  │  NIM: [NIM]                             │                          │
│  │  Status: pending                        │                          │
│  │  Dekan: Sudah tanda tangan ✅           │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  INPUT QR CODE PADA KOTAK REKTOR        │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  [Input field untuk QR code]            │                          │
│  │  "Masukkan kode QR atau scan..."        │                          │
│  │                                         │                          │
│  │  Catatan: QR code ini akan ditampilkan  │                          │
│  │  pada kotak Rektor di dokumen           │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  [Tombol: Tanda Tangani Dokumen]                                      │
│                      ↓                                                  │
│  ┌─────────────────────────────────────────┐                          │
│  │  BACKEND PROCESS                        │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  1. Update dokumen rektor:              │                          │
│  │     status: "signed" ✅                 │                          │
│  │     workflow_stage: "completed"         │                          │
│  │     rektor_qr_code: [input_value]       │                          │
│  │                                         │                          │
│  │  2. Update dokumen dekan:               │                          │
│  │     metadata.rektor_signed: true        │                          │
│  │     metadata.rektor_qr_code: [value]    │                          │
│  └─────────────────────────────────────────┘                          │
│                      ↓                                                  │
│  Toast: "Ijazah berhasil ditandatangani. Dokumen selesai."           │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 8: SETELAH REKTOR TTD, STATUS BERUBAH MENJADI "SIGNED"           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────────────────────────────┐                          │
│  │  TABEL DOKUMEN REKTOR                   │                          │
│  ├─────────────────────────────────────────┤                          │
│  │  Ijazah - [Nama]  │  Signed ✅  │ [QR]  │                          │
│  └─────────────────────────────────────────┘                          │
│                                                                         │
│  • Status: "signed" ✅                                                 │
│  • QR code muncul pada kotak Rektor                                   │
│  • Dokumen visible di dashboard Rektor                                │
│  • Workflow stage: "completed"                                        │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────────────────┐
│ STEP 9: IJAZAH SELESAI - MASUK KE TABEL DEKAN DAN REKTOR              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  DASHBOARD DEKAN (/user/documents)                       │         │
│  ├──────────────────────────────────────────────────────────┤         │
│  │  ┌────────────────────────────────────────────────────┐  │         │
│  │  │  Ijazah - [Nama]  │  Signed ✅  │  [Download PDF]  │  │         │
│  │  └────────────────────────────────────────────────────┘  │         │
│  │                                                           │         │
│  │  • Status: "signed" ✅                                    │         │
│  │  • QR Code Dekan: ✅                                      │         │
│  │  • QR Code Rektor: ✅ (dari metadata)                     │         │
│  │  • Workflow: completed                                    │         │
│  └──────────────────────────────────────────────────────────┘         │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────┐         │
│  │  DASHBOARD REKTOR (/user/documents)                      │         │
│  ├──────────────────────────────────────────────────────────┤         │
│  │  ┌────────────────────────────────────────────────────┐  │         │
│  │  │  Ijazah - [Nama]  │  Signed ✅  │  [Download PDF]  │  │         │
│  │  └────────────────────────────────────────────────────┘  │         │
│  │                                                           │         │
│  │  • Status: "signed" ✅                                    │         │
│  │  • QR Code Dekan: ✅ (dari metadata)                      │         │
│  │  • QR Code Rektor: ✅                                     │         │
│  │  • Workflow: completed                                    │         │
│  └──────────────────────────────────────────────────────────┘         │
│                                                                         │
│  ✅ IJAZAH SELESAI                                                     │
│  ✅ Kedua pihak memiliki dokumen dengan status "signed"                │
│  ✅ QR code tersimpan untuk kedua penandatangan                        │
│  ✅ Dokumen dapat di-download sebagai PDF                              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

## Summary Flow

```
Dekan Input Data → Preview → Buat Ijazah → Dekan TTD + QR Code
                                              ↓
                                    Status Dekan: "signed" ✅
                                              ↓
                                    Otomatis kirim ke Rektor
                                              ↓
                                    Rektor TTD + QR Code
                                              ↓
                                    Status Rektor: "signed" ✅
                                              ↓
                        Dokumen masuk ke tabel Dekan & Rektor
                                    dengan status "signed" ✅
```

## Key Points

1. ✅ **Dekan membuat ijazah** - Input data manual pada form
2. ✅ **Preview sebelum dibuat** - Dapat dilihat terlebih dahulu
3. ✅ **Dekan menandatangani** - QR code muncul pada nama dekan
4. ✅ **Status berubah signed** - Di tabel dokumen dekan
5. ✅ **Otomatis terkirim** - Ke rektor yang dipilih
6. ✅ **Rektor ttd dan isi QR** - Pada kotak rektor
7. ✅ **Status berubah signed** - Setelah rektor ttd
8. ✅ **Dokumen masuk ke tabel** - Dekan dan rektor dengan status signed
