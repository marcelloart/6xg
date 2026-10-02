# 6XG — Ladang Bara

Game kebun di [6xg.online](https://6xg.online): beli bibit, tanam, tunggu matang, panen, jual hasil di toko, beli bahan, lalu bangun rumah dan lumbung. Identitas dan pemandangan vektor dibuat untuk 6XG sendiri.

Login Privy diperlukan sebelum bermain. Akun kebun baru mulai dengan **0 koin, 0 kayu, 0 batu, 0 daging, dan 6 bibit wortel gratis**. Ada 9 petak tanam awal dan 20 ruang penyimpanan hasil. Bibit gratis diberikan sekali pada pembuatan kebun, bukan setiap login.

| Bibit | Tumbuh | Harga bibit | Hasil panen | Harga jual per hasil |
| --- | --- | --- | --- | --- |
| Wortel | 5 menit | 5 | 3 | 3 |
| Tomat | 15 menit | 12 | 4 | 5 |
| Jagung | 30 menit | 24 | 5 | 8 |
| Stroberi | 1 jam | 45 | 6 | 12 |
| Kentang | 2 jam | 75 | 7 | 18 |
| Cabai | 5 jam | 120 | 8 | 25 |
| Jeruk | 10 jam | 200 | 9 | 36 |
| Apel | 12 jam | 280 | 10 | 46 |
| Alpukat | 1 hari | 420 | 12 | 60 |

Semua harga menggunakan koin permainan. Tanaman menggunakan `plantedAt` dan `readyAt` absolut, sehingga tetap matang saat tab berada di belakang atau ditutup. Tidak ada percepatan waktu pada website produksi. Tanaman matang tidak layu, hasil tidak dijual otomatis, dan panen yang melampaui kapasitas tetap berada di petak sampai ruang tersedia. Setiap panen mengosongkan petak untuk bibit berikutnya.

Toko memiliki bagian **Bibit**, **Jual panen**, dan **Bahan**. Kayu berharga 3 koin, batu 4, daging 5. Jika pemain sudah tidak punya bibit, tanaman, atau hasil panen, pembelian bahan menyisakan minimal 5 koin untuk bibit wortel agar permainan dapat diteruskan.

| Bangunan | Kayu / batu / daging | Waktu | Manfaat setelah selesai |
| --- | --- | --- | --- |
| Lumbung | 6 / 3 / 1 | 90 detik | +80 ruang panen |
| Rumah | 10 / 5 / 2 | 60 detik | +6 petak |
| Gudang | 8 / 4 / 1 | 60 detik | +40 ruang panen |
| Sumur | 5 / 6 / 1 | 45 detik | +3 petak |

Peta 3.200 × 2.200 memenuhi layar browser dan dapat digeser, diperbesar, serta dinavigasi melalui peta kecil. Ada 8 tapak bangunan dan maksimal 45 petak. Pilih bangunan lalu klik tapak di peta atau tombol nomor tapak. Biaya dibayar hanya saat penempatan sah. Pondok kebun awal adalah bagian pemandangan dan tidak menambah kapasitas.

## Kontrol

Pilih bibit di **Kebun**, lalu klik petak kosong. Wortel dipilih secara awal. Klik tanaman matang untuk memanen. Tombol petak dalam panel Kebun menyediakan alternatif keyboard: pilih petak kemudian tekan **Tanam**. Seret peta, gunakan panah saat canvas fokus, gulir/cubit untuk zoom, Home untuk kembali, dan Escape untuk menutup panel atau membatalkan penempatan.

## Progres online

Frontend GitHub Pages menggunakan SDK resmi Privy dan backend Cloudflare Workers + D1. Endpoint kebun `GET/PUT /api/farm-save` memverifikasi token ES256 dan mengambil ID akun dari token. Revisi atomik menolak penyimpanan dari perangkat lama. CORS dibatasi ke origin game. Snapshot versi 4 memiliki validator yang dibagikan antara browser dan Cloudflare; body dibatasi 48 KiB.

Data kebun menggunakan tabel `farm_saves` dan slot lokal `6xg-farm:<DID>`. Progres Benteng Bara tetap di tabel `saves` dan slot `6xg-account:<DID>`; tidak direset atau diimpor menjadi kebun. Sumber serta pengujian game perang dipertahankan untuk kompatibilitas, tetapi tidak dimuat oleh halaman utama.

Perubahan disimpan lokal terlebih dahulu lalu dikirim online. Baseline revisi memungkinkan perubahan lokal yang belum terunggah dipulihkan jika revisi cloud belum berubah. Jika perangkat lain sudah memiliki revisi lebih baru, progres online diutamakan; konflik upload meminta pemuatan ulang. Perhatikan status **TERSIMPAN ONLINE** sebelum berpindah perangkat.

Ini adalah **game kebun solo dengan akun**, belum dunia multiplayer bersama. Ekonomi dan waktu berasal dari browser; database menyimpan snapshot, bukan transaksi ekonomi server yang otoritatif. Jangan gunakan saldo ini untuk uang nyata, hadiah, atau leaderboard kompetitif. Login/simpan dengan token ES256 uji diverifikasi pada database terisolasi; alur login dan simpan lintas perangkat dengan akun Privy nyata masih memerlukan pengujian pemilik akun.

## Sumber dan pengembangan

- `assets/css/farm.css`: tampilan fullscreen dan panel responsif.
- `assets/js/farm-engine.js`: harga, timer, inventori, pembangunan, dan validator.
- `assets/js/farm-scenery.js`: pemandangan vector/canvas asli, dengan cache latar statis.
- `assets/js/farm-game.js`: kontrol peta, antarmuka, dan penguncian akun.
- `tools/build_farm.py`: generator dunia menggunakan Python dan fingerprint asset.
- `src/privy.jsx`, `assets/auth/`: SDK Privy dan sumber antarmuka akun.
- `cloudflare/`: API produksi dan migrasi D1, termasuk `0002_farm_saves.sql`.
- `server/app.py`: alternatif API Python + SQLite dengan namespace kebun yang sama.

```sh
npm ci
npm run build:auth
python tools/build_farm.py
python tools/serve.py
```

Preview ada di `http://127.0.0.1:8769/`. Origin preview harus diizinkan di aplikasi Privy untuk login nyata. Tidak ada akun simulasi atau tombol percepatan waktu dalam asset produksi.

```sh
npm test
python -m unittest discover -s tests -p 'test*.py'
cd cloudflare
npm ci
npm test
```

Tes Python membutuhkan `server/requirements.txt`. Sesudah mengubah komponen akun, bangun ulang bundle dan fingerprint asset. Sesudah mengubah validator kebun, terbitkan backend juga. Cloudflare watch path saat ini `cloudflare/**`: perubahan aturan di luar folder ini harus disertai perubahan backend agar deployment terpicu.

Deployment berjalan pada repository `marcelloart/6xg`, branch `main`. App ID Privy `cmuqjbgfe02a60cjlya6r4t0m` bersifat publik; jangan menyimpan App Secret, private key, token Cloudflare, atau database dalam repository. GitHub Pages tidak menjalankan Python; Python di sini membuat data dunia, sedangkan Workers menjalankan API produksi. Lihat [cloudflare/README.md](cloudflare/README.md) dan [server/README.md](server/README.md).
