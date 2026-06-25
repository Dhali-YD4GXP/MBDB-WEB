# Panduan Deployment VPS (MBDB Smansaagung)

Dokumen ini berisi panduan untuk melakukan deployment aplikasi **Portal Web MBDB Smansaagung** pada Virtual Private Server (VPS) Anda sendiri dengan Nginx sebagai reverse proxy.

---

## 1. Persiapan Server VPS
Pastikan VPS Anda telah terinstall:
- **Git**
- **Go** (Golang v1.22 atau versi di atasnya)
- **Node.js & npm** (Node v18 atau di atasnya)
- **Database** (PostgreSQL / MySQL)
- **Nginx**

---

## 2. Alur Pengambilan Kode & Build

### Langkah 1: Clone Repositori di VPS
```bash
git clone <URL_REPOSIORI_GITHUB> /var/www/mbdb-web
cd /var/www/mbdb-web
```

### Langkah 2: Build & Jalankan Backend (Go)
1. Masuk ke direktori backend:
   ```bash
   cd backend
   ```
2. Buat file `.env` (salin dari `.env.example`) dan isi kredensial database VPS Anda:
   ```bash
   cp .env.example .env
   nano .env
   ```
   *Penting:* Atur `ALLOWED_ORIGIN` ke domain frontend Anda (misal: `https://mbdb.smansaagung.sch.id` atau domain Anda).
3. Lakukan kompilasi program Go:
   ```bash
   go build -o server main.go
   ```

### Langkah 3: Build & Jalankan Frontend (Next.js)
1. Masuk ke direktori frontend:
   ```bash
   cd ../frontend
   ```
2. Buat file `.env.production` (atau letakkan variabel langsung di environment shell):
   ```bash
   echo "NEXT_PUBLIC_API_URL=https://api.mbdb-domain-anda.com" > .env.local
   ```
   *Catatan:* Ganti URL dengan subdomain API backend Anda.
3. Install dependensi dan build proyek Next.js:
   ```bash
   npm install
   npm run build
   ```
4. Jalankan Next.js dalam mode production menggunakan PM2 (rekomendasi) atau runner background:
   ```bash
   npm install -g pm2
   pm2 start npm --name "mbdb-frontend" -- start
   ```

---

## 3. Konfigurasi Daemon Systemd untuk Backend Go
Gunakan daemon systemd agar backend Go tetap berjalan secara otomatis di latar belakang dan melakukan restart otomatis jika terjadi crash.

1. Buat berkas service:
   ```bash
   sudo nano /etc/systemd/system/mbdb-backend.service
   ```
2. Masukkan konfigurasi berikut (sesuaikan path-nya):
   ```ini
   [Unit]
   Description=MBDB Smansaagung Backend API Server
   After=network.target

   [Service]
   Type=simple
   User=root
   WorkingDirectory=/var/www/mbdb-web/backend
   ExecStart=/var/www/mbdb-web/backend/server
   Restart=on-failure
   RestartSec=5s
   Environment=PORT=8080

   [Install]
   WantedBy=multi-user.target
   ```
3. Aktifkan dan jalankan service:
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mbdb-backend
   sudo systemctl start mbdb-backend
   ```
4. Cek status backend:
   ```bash
   sudo systemctl status mbdb-backend
   ```

---

## 4. Konfigurasi Reverse Proxy Nginx & SSL
Untuk mengarahkan domain Anda ke port aplikasi internal (Next.js di port `3000` dan Go di port `8080`), gunakan konfigurasi Nginx berikut.

### Skenario 1 Domain Tunggal (Direkomendasikan)
Gunakan domain yang sama (misal `mbdb.smansaagung.com`) untuk frontend, dan arahkan `/api` dan `/uploads` ke backend Go.

1. Buka berkas konfigurasi situs baru di Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/mbdb-web
   ```
2. Isi dengan konfigurasi berikut:
   ```nginx
   server {
       listen 80;
       server_name mbdb.smansaagung.com; # Ganti dengan domain Anda

       # Frontend Next.js
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }

       # Backend Go REST API
       location /api/ {
           proxy_pass http://localhost:8080;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }

       # Serving Foto Pendaftar secara statis langsung lewat Nginx (Lebih Cepat)
       location /uploads/ {
           alias /var/www/mbdb-web/backend/uploads/;
           expires 7d;
           add_header Cache-Control "public, no-transform";
       }
   }
   ```
3. Buat symbolic link ke folder enabled dan restart Nginx:
   ```bash
   sudo ln -s /etc/nginx/sites-available/mbdb-web /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```
4. Konfigurasikan SSL menggunakan Certbot Let's Encrypt:
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d mbdb.smansaagung.com
   ```
