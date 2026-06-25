# AGENTS.md - Portal Web MBDB Smansaagung

## 1. Konteks Proyek
Aplikasi ini adalah sistem manajemen internal dan portal publik untuk **MBDB Smansaagung** (Unit Marching Band dan Drumband SMA Negeri 1 Kayuagung). Aplikasi ini memfasilitasi pendaftaran anggota baru secara mandiri serta manajemen inventaris alat musik menggunakan sistem pemindaian (scanning) QR Code untuk melacak logistik alat saat sesi latihan maupun event/lomba.

## 2. Tech Stack & Lingkungan Lingkungan (Deployment Target)
- **Backend:** Go (Golang) - Menggunakan arsitektur RESTful API (bersih tanpa rendering HTML dari backend).
- **Frontend:** Next.js (React) - Responsif dan diutamakan untuk tampilan mobile (Mobile-First) karena operasional scanning dilakukan di lapangan menggunakan smartphone.
- **Database:** Relasional (diperkirakan PostgreSQL atau MySQL).
- **Penyimpanan File:** Penyimpanan lokal (Local Storage) di dalam disk VPS pada direktori tertentu (misal: `./uploads/photos/`).
- **Infrastruktur VPS:** Aplikasi akan dideploy pada VPS mandiri dengan domain kustom menggunakan Nginx/Caddy sebagai Reverse Proxy, serta pembatasan CORS yang ketat antara domain frontend dan backend.

## 3. Manajemen Hak Akses (Role-Based Access Control - RBAC)
1. **Guest / Publik (Tanpa Login):** Hanya dapat mengakses halaman pendaftaran anggota baru.
2. **Official / Tim Loading (Memerlukan Login):** Dapat mengelola inventaris alat, melakukan scan QR Code, dan mengelola sesi latihan/event.
3. **Admin (Memerlukan Login):** Memiliki semua akses Official, ditambah kemampuan membuat akun untuk Official/Tim Loading, mengubah status pendaftaran anggota baru, dan mengeksport data ke CSV.

## 4. Spesifikasi Fitur & Logika Bisnis

### A. Fitur Pendaftaran Anggota Baru (Akses Publik)
- **Aksesibilitas:** Dapat diakses langsung oleh calon anggota tanpa perlu login.
- **Parameter Input Form:**
  - Nama Lengkap (String)
  - Kelas (String)
  - Pas Foto (File Upload: Validasi format PNG/JPG/JPEG, ukuran maksimal 2MB).
  - Pilihan Alat 1 (Dropdown jenis alat, prioritas utama).
  - Pilihan Alat 2 (Dropdown jenis alat, prioritas kedua).
  - Pilihan Alat 3 (Dropdown jenis alat, prioritas ketiga).
- **Logika Backend & Penyimpanan:**
  - File foto disimpan di direktori lokal VPS. Database hanya menyimpan *file path* atau URL statisnya.
  - Setiap pendaftar baru otomatis mendapatkan status awal `Pending`.
- **Panel Admin untuk Pendaftaran:**
  - Admin dapat melihat daftar seluruh pendaftar beserta detail dan pas fotonya.
  - Admin dapat mengubah status pendaftar menjadi `Diterima` atau `Ditolak`.
  - Admin dapat mengunduh seluruh data pendaftar dalam format dokumen `.csv`.

### B. Fitur Inventarisasi Alat Musik (Akses Terproteksi)
Fitur ini hanya muncul dan dapat digunakan setelah pengguna (Admin atau Official) berhasil login.

1. **Mode Registrasi Alat Baru:**
   - **Input:** Jenis Alat, Kondisi Alat (`Bagus`, `Butuh Perbaikan`, `Rusak Total`), Nama Pengguna Terakhir (Opsional/String).
   - **Output Sistem:** Backend/Frontend akan menghasilkan (generate) sebuah **QR Code** unik yang merepresentasikan ID alat tersebut. QR Code ini dapat diunduh dan dicetak untuk ditempel pada fisik alat musik.

2. **Manajemen Sesi Latihan / Event (Mode Loading):**
   - **Inisiasi Sesi:** User (Admin/Official) memasukkan perintah atau menekan tombol **"Start Practice Session/Event"** untuk memulai pencatatan logistik lapangan.
   - **Proses Check-Out (Alat Keluar / Loading Berangkat):**
     - Setiap kali alat dimasukkan ke truk atau dibawa keluar gudang, QR Code pada alat dipindai (scan) menggunakan kamera smartphone melalui sistem web.
     - Sistem mencatat alat tersebut sebagai "Keluar" dalam sesi aktif.
   - **Proses Check-In (Alat Masuk / Loading Kembali):**
     - Ketika latihan/event selesai dan alat dikembalikan ke gudang, QR Code dipindai kembali.
     - Sistem mencatat alat tersebut sebagai "Kembali".
   - **Parameter yang Disimpan & Ditampilkan pada Sesi:**
     - Nama/Jenis Sesi (Latihan/Nama Lomba).
     - Daftar Nama Alat yang terlibat.
     - Jumlah Total Alat yang dibawa keluar.
     - Jumlah Alat yang sudah dikembalikan.
     - Indikator/Daftar Alat yang belum kembali (jika ada selisih).
   - **Audit Trail (Log Transparansi):**
     - Setiap aktivitas pemindaian (baik saat keluar maupun masuk) harus merekam data: `Timestamp` (waktu presisi) dan `Nama User/Akun Official` yang melakukan scanning tersebut. Riwayat ini harus ditampilkan pada detail sesi untuk menghindari perselisihan internal.

## 5. Panduan Teknis untuk AI Client

### Struktur Database (Referensi Entitas)
- **Users:** ID, Username, Password (Hashed), Role (`Admin`, `Official`).
- **Applicants:** ID, Nama, Kelas, FotoPath, Pilihan1, Pilihan2, Pilihan3, Status (`Pending`, `Accepted`, `Rejected`), CreatedAt.
- **Instruments:** ID (UUID/ShortID untuk QR), JenisAlat, Kondisi, NamaPenggunaTerakhir, CreatedAt.
- **Sessions:** ID, NamaSesi, IsActive (Boolean), StartAt, EndAt.
- **SessionLogs:** ID, SessionID, InstrumentID, Status (`Keluar`, `Masuk`), ScannedBy (UserID), Timestamp.

### Batasan Keamanan & Performa
- **Validasi File:** Implementasikan middleware di Go untuk memeriksa *magic bytes* file upload, memastikan file yang diunggah benar-benar gambar, bukan skrip berbahaya.
- **Static Static Route:** Pastikan backend Go mengonfigurasi routing statis (secure static file serving) agar frontend Next.js dapat menampilkan pas foto pendaftar dengan aman.
- **QR Code Scanner:** Gunakan pustaka scanner berbasis client-side di Next.js (seperti `html5-qrcode` atau sejenisnya) yang ringan dan dapat mendeteksi kamera belakang smartphone secara otomatis.
- **Autentikasi:** Amankan seluruh API endpoint inventarisasi menggunakan JWT atau sistem session token yang divalidasi oleh backend Go.