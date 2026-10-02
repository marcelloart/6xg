# Penyimpanan progres akun

Backend Python ini menyimpan kampanye solo per akun Privy. Setiap permintaan memverifikasi tanda tangan ES256, issuer, App ID, masa berlaku, session ID, dan DID pengguna. Pemain tidak dapat memilih ID akun lain dalam permintaan. Token tidak disimpan di database atau ditulis ke log.

Backend Python ini siap dijalankan, tetapi **belum dipasang ke hosting**. Frontend produksi saat ini memakai alternatif Cloudflare Workers + D1 untuk progres online. Backend ini menyediakan kontrak API yang sama untuk sinkronisasi kampanye solo; tidak menyediakan PvP atau dunia multiplayer bersama.

Untuk memulai dengan paket gratis tanpa menyewa container dan disk, gunakan alternatif [Cloudflare Workers + D1](../cloudflare/README.md). Kedua server menyediakan API yang sama; pilih satu untuk alamat `apiBase` frontend.

## Mengaktifkan

1. Gunakan hosting yang dapat menjalankan container Python dan memiliki disk persisten. Pasang HTTPS untuk alamat API, misalnya `https://api.6xg.online`. Domain contoh tersebut harus dibuat terlebih dahulu; belum ada konfigurasi DNS otomatis.
2. Dari pengaturan aplikasi di Privy Dashboard, salin **public verification key** untuk memverifikasi access token. Server ini tidak membutuhkan App Secret dan tidak melakukan transaksi wallet.
3. Isi pengaturan server berdasarkan `.env.example`: App ID, public verification key, origin `https://6xg.online`, dan lokasi SQLite pada disk persisten di luar direktori website.
4. Jalankan container menggunakan `server/Dockerfile` dengan build context root repository. Sambungkan volume ke `/data`; folder tersebut harus dapat ditulis oleh UID 10001. Gunakan backup disk/database dari penyedia hosting.
5. Periksa `/health`: `authConfigured` harus bernilai `true`. Kemudian uji login sungguhan dan penyimpanan akun sebelum membuka fitur untuk semua pemain.
6. Isi `apiBase` di `assets/js/online-config.js` dengan alamat HTTPS API. Jalankan compiler dunia untuk memperbarui versi asset, lalu publikasikan file yang berubah.

Contoh build dan run untuk pengembang:

```sh
docker build -f server/Dockerfile -t benteng-bara-api .
docker run --env-file server/.env -p 8770:8770 -v bara-data:/data benteng-bara-api
```

`.env` tidak boleh dimasukkan ke repository. GitHub Pages tetap menyajikan layar game; server API disajikan oleh hosting backend.

## Penyimpanan dan perangkat bersamaan

`GET /api/save` mengambil progres akun yang ditentukan token. `PUT /api/save` menyimpan snapshot versi 3 dengan nomor revisi yang diharapkan: posisi unit, perintah, barang bawaan, bangunan/kastel, antrean, dan resource divalidasi. Versi 2 tetap diterima untuk migrasi progres lama. Jika perangkat lain sudah memperbarui progres, server mengembalikan 409 dan frontend menghentikan upload otomatis sampai pemain memuat progres online terbaru. Tidak ada penimpaan otomatis dari perangkat lama.

Permainan membutuhkan login sebelum kampanye dapat dimulai. Slot lokal terpisah per akun. Akun pertama kali dapat memilih mengimpor progres lama perangkat atau memulai kerajaan baru dengan semua resource 0. Progres versi 2 dicadangkan sebelum migrasi RTS. Jika server putus, snapshot terbaru tetap tersimpan lokal. Pengguna dapat mencoba sinkronisasi kembali dari layar Akun.

Simulasi tetap berjalan di browser. Penutupan halaman menghentikan simulasi; server menyimpan snapshot dan tidak menghitung produksi saat halaman ditutup. Data kampanye solo dilaporkan oleh client dan bukan dasar untuk leaderboard, transaksi, atau PvP yang harus dikendalikan server.

## Uji lokal

```sh
python -m pip install -r server/requirements.txt
python -m unittest discover -s tests -p 'test_*.py'
```

Pengujian memakai kunci ES256 yang dibuat sementara dan database terisolasi. Tidak ada mode bypass autentikasi pada server produksi.

Referensi: [Privy access tokens](https://docs.privy.io/authentication/user-authentication/access-tokens), [Privy token security](https://docs.privy.io/authentication/user-authentication/tokens).
