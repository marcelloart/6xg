# Progres online — Cloudflare Workers + D1

## Ladang Bara

Game kebun memakai endpoint `GET/PUT /api/farm-save`, tabel `farm_saves`, dan snapshot versi 4. Migrasi `0002_farm_saves.sql` menambah tabel tanpa mengubah progres Benteng Bara pada `saves`. Jalankan semua migrasi saat deployment. Validator kebun diimpor dari `../assets/js/farm-engine.js` dan dibagikan dengan browser.

`/health` sekarang juga memeriksa `farmStorage`. Nilai `ok`, `authConfigured`, `storage`, dan `farmStorage` harus `true`. Timer kebun tetap matang saat halaman ditutup karena `readyAt` disimpan; server tidak menjalankan simulasi tick. Ini ekonomi solo dari client, bukan ekonomi server untuk uang nyata atau PvP.

Gunakan `python tools/build_farm.py` untuk versi asset frontend. Data kebun tidak dimigrasikan dari kampanye perang. Konfigurasi Workers Builds yang sudah ada tetap dipakai; deploy command menjalankan semua migrasi D1 sebelum menerbitkan Worker. Simpan/muat dengan akun Privy nyata lintas perangkat masih harus diuji pemilik.

Catatan berikut menjelaskan deployment dan kontrak kampanye perang yang juga dipertahankan.

Server ini cocok untuk menjalankan penyimpanan kampanye solo tanpa menyewa VPS. Website tetap berada di GitHub Pages, dan database pemain berada di akun Cloudflare pemilik game. Build dijalankan dari folder ini dengan checkout repository lengkap: validator RTS diimpor dari `../assets/js/rts-engine.js`. Backend Python di `server/` tetap tersedia untuk hosting container.

**Status:** server sudah diterbitkan melalui Cloudflare Workers Builds. Worker `6xg-cloud-save` menggunakan D1 `6xg-player-saves` dengan tabel `saves`; `database_id` dan `apiBase` frontend sudah diisi. Pemeriksaan produksi berhasil: `/health` mengembalikan `ok`, `authConfigured`, dan `storage` bernilai `true`; akses tanpa login dan token tidak valid ditolak; preflight dari `https://6xg.online` diizinkan dan origin lain ditolak. Login Privy tersedia untuk penyimpanan progres online. Pengujian simpan/muat lintas perangkat menggunakan akun Privy nyata belum dilakukan.

Konfigurasi deployment menggunakan `marcelloart/6xg`, branch `main`, root directory `cloudflare`, build command `npm run build`, dan deploy command `npm run deploy`. Build watch path adalah `cloudflare/**`; preview builds dinonaktifkan. URL Worker: `https://6xg-cloud-save.marcelloartis.workers.dev`. Persetujuan aplikasi Cloudflare Workers and Pages dibatasi ke repository game tersebut. Token build disimpan oleh Cloudflare, bukan di repository.

## Cara termudah

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fmarcelloart%2F6xg%2Ftree%2Fmain%2Fcloudflare)

1. Masuk atau buat akun Cloudflare sendiri. Pilih **Workers Free**. Jangan menaikkan paket menjadi Paid untuk setup ini.
2. Buka tombol di atas. Cloudflare akan menawarkan penyalinan folder server ke repository baru, izin GitHub, nama Worker, dan database D1. Tinjau serta setujui izin akun sendiri.
3. Pertahankan App ID dan public verification key untuk aplikasi Privy `cmuqjbgfe02a60cjlya6r4t0m`. Public key bukan App Secret. Atur origin ke `https://6xg.online`.
4. Build command: `npm run build`. Deploy command: `npm run deploy`. Script deploy menjalankan migrasi tabel melalui binding `DB`, lalu menerbitkan Worker. Database baru dibuat dan ID-nya diisi oleh alur Deploy to Cloudflare.
5. Salin alamat HTTPS Worker yang diberikan Cloudflare. Buka `/health`: `ok`, `authConfigured`, dan `storage` harus bernilai `true`.
6. Di repository game, isi `assets/js/online-config.js` → `apiBase` dengan origin Worker tersebut, tanpa `/api/save`. Jalankan `python tools/build_world.py`, lalu publikasikan perubahan.
7. Masuk ke game melalui Privy. Uji simpan, muat ulang, dan buka akun yang sama di perangkat lain sebelum menyatakan sinkronisasi produksi telah aktif.

Alternatif tanpa izin repository GitHub baru: buat Worker dari bundle hasil build, buat D1 `6xg-player-saves`, jalankan SQL `migrations/0001_saves.sql`, lalu tambahkan binding database bernama `DB` dan tiga environment variables yang tercantum di `wrangler.jsonc` melalui Dashboard. Diperlukan login pemilik akun untuk mengubah pengaturan hosting tersebut.

## Dari komputer pengembang

```sh
cd cloudflare
npm ci
npm test
npx wrangler login
npm run deploy
```

Perintah di atas menggunakan database yang sudah dibuat untuk akun pemilik game. Untuk akun Cloudflare lain, buat D1 sendiri dengan `npx wrangler d1 create 6xg-player-saves --binding DB --update-config --location apac` dan ganti `database_id` sebelum deploy. Login Wrangler meminta akses akun; pemilik harus meninjau persetujuannya. Jangan memasukkan token Cloudflare, `.dev.vars`, App Secret, atau database ke GitHub. URL `workers.dev` dapat digunakan tanpa mengganti DNS domain website.

## Perilaku penyimpanan

- Token Privy ES256 diverifikasi dengan public key, issuer, audience, expiry, session, subject, dan waktu penerbitan. ID pengguna berasal dari token yang terverifikasi.
- `GET /api/save` mengambil desa akun tersebut. `PUT /api/save` menerima `{save, revision}`. Nomor revisi diperiksa dalam satu operasi SQL atomik. Dua perangkat dengan revisi sama tidak dapat keduanya mengganti desa.
- Snapshot versi 3 menyimpan posisi unit, perintah, barang bawaan, HP, progres kastel/bangunan, antrean, dan resource. Validator dibagikan dengan simulasi browser; ID entitas unik, target perintah, batas jumlah unit/bangunan, posisi, dan angka diperiksa. Snapshot versi 2 tetap diterima agar progres lama dapat dimigrasikan setelah login. Body permintaan dibatasi 48 KiB dan field yang tidak digunakan dibuang.
- CORS mengizinkan origin yang dikonfigurasi. Token tidak ditulis ke log atau database. Throttle 120 permintaan/menit per IP dan akun berlaku per instance Worker, bukan pembatas global.
- D1 menyimpan data di luar asset GitHub Pages. Gunakan fitur backup/Time Travel Cloudflare untuk pemulihan. Dua implementasi backend menggunakan kontrak API yang sama; jalankan salah satunya.

Ini adalah sinkronisasi kampanye solo, bukan PvP. Simulasi berjalan di browser selama halaman terbuka, termasuk tab latar belakang. Server menyimpan snapshot; server belum menghitung ekonomi ketika halaman ditutup. Data game dari client tidak boleh dipakai untuk hadiah, transaksi, atau leaderboard kompetitif.

## Kapasitas gratis

Saat panduan ini ditulis, Workers Free menyertakan 100.000 request/hari; D1 Free menyertakan 5 juta baris dibaca/hari, 100.000 baris ditulis/hari, dan 5 GB penyimpanan akun. Batas berlaku untuk seluruh akun. Saat kuota gratis habis, API dapat gagal sementara; salinan lokal tetap disimpan. Periksa kuota aktual di Dashboard sebelum membuka game untuk banyak pemain.

Referensi resmi: [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/), [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/), [Deploy to Cloudflare](https://developers.cloudflare.com/workers/platform/deploy-buttons/), [verifikasi token Privy](https://docs.privy.io/authentication/user-authentication/access-tokens).
