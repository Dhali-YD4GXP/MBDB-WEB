# Panduan Pengoperasian Presensi & Layanan Anggota - MBDB Smansaagung

Dokumen ini berisi panduan praktis bagi seluruh anggota dan alumni **MBDB Smansaagung** untuk menggunakan portal web dalam melakukan presensi latihan/lomba, mengelola alat musik, dan melaporkan kehilangan alat.

---

## 1. Aktivasi Akun (Untuk Pengguna Pertama Kali)
Sebelum dapat masuk ke Dashboard Anggota, Anda wajib mengaktifkan akun Anda terlebih dahulu.

### Langkah-langkah Aktivasi:
1. Akses halaman website dan klik menu **Aktivasi Akun** pada navigasi atas (atau buka `/aktivasi`).
2. Jika Anda belum mengetahui **Nomor Anggota** atau **Kode Aktivasi** Anda:
   * Klik tombol **Cari Kredensial Anggota Lama / Alumni (Lookup)**.
   * Masukkan **Nama Lengkap**, **Tahun Angkatan**, dan **Alat/Seksi Utama** Anda dengan benar.
   * Jika data cocok dan akun belum aktif, sistem akan menampilkan Nomor Anggota dan Kode Aktivasi Anda.
3. Masukkan **Nomor Anggota** dan **Kode Aktivasi** pada form aktivasi.
4. Buat **Password baru** Anda yang aman, kemudian klik **Aktifkan Akun**.
5. Setelah berhasil, Anda akan langsung diarahkan ke halaman login untuk masuk ke dashboard.

---

## 2. Cara Melakukan Presensi Latihan Rutin
Presensi latihan dilakukan menggunakan pemindaian (scanning) QR Code yang ditampilkan oleh Admin/Staff saat latihan dimulai.

Ada dua metode untuk melakukan presensi:

### Metode A: Lewat Dashboard Anggota (Rekomendasi)
1. **Login** menggunakan Nomor Anggota dan Password Anda.
2. Pada Dashboard Anggota, klik tombol **📷 Pindai QR Code**.
3. Berikan izin akses kamera pada smartphone Anda.
4. Arahkan kamera ke **QR Code Sesi Latihan** yang disediakan oleh staff.
5. Pop-up konfirmasi kehadiran akan muncul:
   * **Jika Anda tepat waktu:** Klik **Ya, Hadir** untuk menyelesaikan presensi.
   * **Jika Anda terlambat (melebihi Jam Mulai latihan):** Sistem akan menampilkan kotak alasan keterlambatan. Anda **wajib** mengetik alasan keterlambatan secara jujur (misal: *ban bocor*, *hujan lebat*), lalu klik **Ya, Hadir**.

### Metode B: Lewat Scan Langsung (Halaman Publik)
1. Scan QR Code sesi latihan menggunakan aplikasi kamera bawaan HP Anda atau Google Lens.
2. Buka tautan URL yang muncul (tautan akan mengarah ke halaman `/presensi?token=...`).
3. Form presensi publik akan terbuka:
   * Masukkan **Nama Lengkap** dan **Alat/Seksi Utama** Anda.
   * **Jika Anda terlambat:** Isi kolom **Alasan Keterlambatan** yang otomatis muncul di bawah input alat.
4. Klik **Kirim Presensi**. Pastikan muncul pesan sukses berwarna hijau.

---

## 3. Cara Melakukan Presensi Keberangkatan Lomba
Untuk event/lomba, presensi didasarkan pada Roster Keberangkatan yang telah di-upload oleh Admin.

1. Scan QR Code sesi lomba yang disediakan staff (baik melalui kamera Dashboard Anggota atau kamera HP langsung).
2. Konfirmasi keberangkatan akan muncul:
   * **Jika lewat Dashboard Anggota:** Sistem akan otomatis mencocokkan nama Anda dengan Roster Lomba, klik **Ya, Berangkat**.
   * **Jika lewat Link Publik:** Pilih nama Anda dari daftar dropdown roster yang tersedia, lalu klik **Kirim Presensi**.
3. Presensi keberangkatan Anda berhasil dicatat.

---

## 4. Manajemen Alat Musik (QR Code Mandiri)
Anggota dapat melakukan peminjaman (klaim) dan pengembalian alat musik secara mandiri dengan memindai QR Code yang tertempel pada fisik alat musik.

### A. Meminjam / Klaim Alat Musik:
1. Masuk ke Dashboard Anggota Anda.
2. Klik tombol **📷 Pindai QR Code**.
3. Arahkan kamera smartphone ke **QR Code pada fisik alat musik** yang ingin Anda pinjam.
4. Sistem akan otomatis mendaftarkan Anda sebagai pemegang terakhir alat tersebut. Alat akan muncul di daftar *"Alat yang Sedang Anda Pegang"* di dasbor Anda.

### B. Mengembalikan Alat Musik ke Gudang:
Untuk memastikan alat benar-benar dikembalikan ke tempatnya, **tidak ada tombol instan untuk mengembalikan alat di dasbor**. Anda harus melakukan pemindaian fisik ulang.
1. Bawa alat musik kembali ke gudang logistik.
2. Buka Dashboard Anggota Anda dan klik **📷 Pindai QR Code**.
3. Pindai ulang **QR Code pada fisik alat musik** tersebut.
4. Sistem akan mendeteksi bahwa Anda sedang memegang alat ini, dan otomatis mengubah statusnya menjadi **Dikembalikan ke Inventaris Gudang** (menghapusnya dari daftar pegangan Anda).

---

## 5. Melaporkan Alat Musik Hilang
Jika terdapat alat musik yang hilang atau tertinggal setelah event/latihan, Anda dapat segera melaporkannya agar dapat dipantau oleh staff dan pengurus.

1. Login ke akun Anda dan pilih menu **Lapor Alat Hilang** pada navigasi atas (atau buka `/lost-reports`).
2. Isi form laporan kehilangan dengan parameter berikut:
   * **Nama / Jenis Alat:** Merk dan tipe alat (misal: *Mellophone Yamaha Silver*).
   * **Lokasi Terakhir Terlihat:** Tempat terakhir alat tersebut diletakkan atau terlihat (misal: *Tribun Stadion*, *Bagasi Truk A*).
   * **Player Terakhir:** Anggota yang terakhir kali memegang/memainkan alat tersebut.
3. Klik **Kirim Laporan**.
4. Laporan Anda akan langsung tampil secara real-time pada tabel **Daftar Alat Hilang** di sebelah kanan halaman agar dapat dipantau bersama.
