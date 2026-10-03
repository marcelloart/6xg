Produksi v1.6 memakai snapshot kebun versi 7: antrean, olahan, misi harian dan pencapaian berada di JSON akun yang sama. Aksi `production`, `collect`, `goods`, `daily`, dan `achievement` memakai validasi argumen, waktu server, revisi atomik dan tanda terima `farm_actions`. Tidak ada tabel baru. Hadiah, bahan dan olahan tidak bisa diunggah dari klien.

# Progres online — Cloudflare Workers + D1

## Ladang Bara

Game kebun memakai **GET /api/farm-save** dan **POST /api/farm-action**. Snapshot versi 6 mencatat inventori, layout, profil, XP, tutorial, dan pesanan. Server memverifikasi token Privy ES256, mengambil identitas dari token, membaca kondisi D1, memvalidasi perintah, lalu menghitung saldo dan waktu dengan aturan shared engine. PUT /api/farm-save ditolak; klien tidak dapat memasok saldo atau waktu panen.

Migrasi **0003_farm_actions.sql** menambah ID tindakan terakhir dan tabel tanda terima. Satu batch D1 mengubah farm serta mencatat tanda terima secara atomik. Revisi mencegah perangkat lama menimpa farm, dan ID tindakan yang sama dapat dicoba lagi tanpa hadiah/biaya ganda. Tanda terima berumur tujuh hari dibersihkan; tindakan lama tetap memiliki revisi yang sudah kedaluwarsa.

GET akun baru mengembalikan 0 koin, 0 bahan, dan 6 bibit wortel tanpa membuat baris. Tindakan pertama menyimpan farm satu kali. Farm lama versi 4/5 dimigrasikan di server sambil mempertahankan inventori, tenggat tanaman, layout, profil, dan akses untuk tanaman/bangunan yang telah dimiliki. Tabel kampanye RTS tidak diubah.

Health mencantumkan **farmSaveVersion: 6**. Timer mengikuti tenggat server dan tanaman tidak berhenti tumbuh ketika tab ditutup. Semua pembelian, penanaman, panen, penjualan, pembangunan, perpindahan, profil, dan hadiah pesanan diperiksa server. Cache browser hanya salinan; koneksi diperlukan untuk transaksi.

Konfigurasi Workers Builds tetap dipakai. Deploy menjalankan seluruh migrasi D1 sebelum Worker diterbitkan. Uji lokal memakai akun ES256 terisolasi, termasuk service binding dari game ke Worker, dan tidak mengubah akun pemain produksi. Alur akun Privy nyata lintas perangkat masih perlu diverifikasi oleh pemilik akun.

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


Versi 6 meneruskan layout dan profil versi 5 serta menambah progres permainan. Validator dibagikan dengan browser, tetapi hanya server yang boleh menetapkan hasil transaksi. Kredensial dan progres kampanye lama tetap dipertahankan.

### Livestock and social views (save v8)

New exact commands: `animal {slot,kind}`, `feed {id}`, `animal-collect {id}`, `animal-sell {product,qty}`, `sharing {enabled}`, `friend {code}`, `unfriend {code}`. Codes are generated by the server, never accepted in sharing arguments. Every write targets the verified account only.

Authenticated GET `/api/farm-friends` returns bookmarked farms with available/unavailable state. GET `/api/farm-visit?code=XXXXXXXXXXXXXXXX` returns a strict visual projection only when owner sharing is enabled. A disabled or unknown code returns the same 404. POST/PUT visits are rejected. Existing Pages cookie proxy forwards only allowlisted paths and the code parameter, verifies JWT through the service binding and never forwards the owner identity to a write command.

The existing D1 JSON snapshot stores these small bounded fields; no new table or migration is required. Capability lookup uses a parameterized JSON expression over farm_saves. A JSON expression index can be added when the account directory grows; the current small game directory does not require a new deployment migration. Public views contain no coins, photo, inventory, orders, mission rewards or owner authentication identifier. Friend metadata is not copied to the owner's canonical save.
