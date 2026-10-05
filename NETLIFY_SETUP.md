# Menyiapkan upload Netlify di PortoSite

Backend memakai **Netlify Functions**, jadi pengunjung tidak perlu memasang
XAMPP, menjalankan PHP, atau mengatur server. Setelah pemilik PortoSite
menyelesaikan konfigurasi satu kali di Netlify, pengunjung cukup mengisi
portofolio, memilih **Upload ke Netlify**, lalu masuk ke akun Netlify mereka.

## Struktur kode

- `public/index.html` menjadi composition root untuk markup halaman.
- `public/css/shared/` berisi fondasi dan tema bersama; `public/css/features/`
  memisahkan gaya editor, kustomisasi, dan preview; aturan responsif ada di
  `public/css/responsive.css`.
- `public/js/shared/` menyimpan konfigurasi dan helper antarmuka. Fitur editor,
  preview portofolio, dan publikasi masing-masing ada di `public/js/features/`.
  `public/js/app.js` menjadi entry point untuk memasang event dan menjalankan
  aplikasi.
- Netlify Functions memisahkan routing, sesi/CSRF, respons HTTP, dan deployment
  portofolio di `netlify/functions/`.

Urutan script `defer` di `public/index.html` penting: konfigurasi dan helper
bersama dimuat sebelum fitur, lalu entry point dijalankan terakhir.

## Deploy PortoSite

1. Masukkan folder proyek ini ke repository GitHub, lalu hubungkan repository
   tersebut ke Netlify sebagai situs baru.
2. Netlify akan menggunakan `netlify.toml` di proyek ini. Pastikan build
   menghasilkan situs dari folder root dan fungsi dari `netlify/functions`.
3. Tambahkan variabel lingkungan pada **Site configuration → Environment
   variables** sebelum deploy:

   | Variable | Nilai |
   | --- | --- |
   | `NETLIFY_CLIENT_ID` | Client ID aplikasi OAuth PortoSite |
   | `NETLIFY_CLIENT_SECRET` | Client secret aplikasi OAuth PortoSite |
   | `NETLIFY_REDIRECT_URI` | `https://ALAMAT-PORTOSITE/.netlify/functions/netlify?action=callback` |
   | `PORTOSITE_SESSION_SECRET` | Secret acak minimal 32 karakter |

   Ganti `ALAMAT-PORTOSITE` dengan domain Netlify PortoSite, misalnya
   `portosite.netlify.app`. Buat secret acak dengan:

   ```sh
   node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
   ```

   Simpan nilai tersebut hanya di pengaturan environment Netlify. Jangan
   menaruh client secret atau session secret di file yang diunggah ke situs.
4. Daftarkan aplikasi OAuth di
   [Netlify Applications](https://app.netlify.com/applications). Atur
   **Application URL** ke domain PortoSite dan **Authorization callback URL**
   agar sama persis dengan `NETLIFY_REDIRECT_URI`. Salin client ID dan client
   secret ke variabel environment di atas.
5. Deploy atau trigger ulang deploy setelah semua variabel tersimpan. Buka
   alamat HTTPS PortoSite dan uji tombol **Upload ke Netlify**.

## Catatan keamanan dan penggunaan

- Token Netlify pengunjung disimpan terenkripsi di cookie `HttpOnly` dan
  `Secure`; client secret hanya digunakan di Function.
- Setiap pengunjung mengotorisasi akun Netlify miliknya sendiri. PortoSite
  membuat satu situs Netlify per sesi akun yang terhubung dan memperbaruinya
  saat pengunjung mengunggah perubahan.
- `netlify.php` adalah backend PHP lama dan tidak digunakan oleh Netlify
  Functions.
- Buka `index.html` langsung dengan `file://` atau lewat server lokal tidak
  menjalankan Netlify Functions. Upload langsung berfungsi dari PortoSite yang
  sudah di-deploy ke Netlify.
