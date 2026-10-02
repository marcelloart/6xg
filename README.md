# 6XG — Benteng Bara

Game strategi waktu nyata di [6xg.online](https://6xg.online), dengan identitas dan pemandangan sendiri. Pemain mengendalikan unit secara langsung, mengumpulkan kayu, batu, emas, dan daging, menentukan lokasi bangunan, serta merebut tiga kamp musuh melalui pertempuran di peta.

**Login diperlukan sebelum bermain.** Layar awal menampilkan **Masuk / Daftar**, melalui SDK resmi Privy. Kampanye baru dimulai dengan **semua resource 0**, delapan pekerja yang siap diperintah, empat prajurit, dan satu balai desa. Resource baru masuk ke gudang setelah pekerja mengantar hasil pengumpulan. Tidak ada produksi otomatis dari pekerja yang menganggur.

Peta 3.200 × 2.200 memenuhi area browser. Resource dan kontrol mengambang di atas dunia; panel dibuka sesuai kebutuhan. Bangunan meliputi balai desa, rumah, barak, lapangan panah, kandang kuda, menara, kastel, tembok, gudang, dan ladang. Pekerja berjalan ke lokasi untuk membangun atau memperbaiki, sementara bangunan militer melatih pasukan dan memiliki titik kumpul. Unit memiliki posisi, HP, jangkauan serangan, dan perintah sendiri. Jalur menghindari sungai serta bangunan.

Ini merupakan **kampanye solo dengan akun dan penyimpanan online**, belum pertandingan multiplayer/PvP. Frontend di GitHub Pages terhubung ke Cloudflare Workers + D1. Penyimpanan memakai token Privy yang diverifikasi dan revisi atomik untuk mencegah perangkat lama menimpa progres baru. Pengujian runtime menggunakan token ES256 uji dan database terisolasi; simpan/muat lintas perangkat dengan akun Privy nyata belum diuji.

## Kontrol

| Tindakan | Desktop | HP / tombol |
| --- | --- | --- |
| Pilih unit | Klik; Shift menambah pilihan; seret kotak; klik ganda memilih jenis yang sama | Ketuk unit, atau tombol semua pekerja/pasukan |
| Bergerak / mengumpulkan / menyerang | Pilih unit lalu klik kanan tujuan, resource, atau musuh | Pilih unit, tekan **Perintah**, ketuk target |
| Membangun | Pilih pekerja, buka **Bangun**, pilih **Tempatkan**, klik tanah kosong | Alur yang sama dengan ketukan |
| Titik kumpul | Pilih bangunan, klik kanan tujuan | Pilih bangunan, **Perintah**, ketuk tujuan |
| Geser peta | Mode **Geser**, klik tengah, Space + seret, atau seret kanan | Mode **Geser** atau seret dengan sentuhan |
| Zoom | Roda mouse, tombol +/− | Cubit atau tombol +/− |
| Kamera desa | Home atau ⌂ | ⌂ |

S menghentikan unit; H menjaga posisi; A memberi perintah menyerang sambil berjalan; V memilih pekerja; B membuka pembangunan; M mengaktifkan Perintah; P menjeda. Ctrl + 1–5 menyimpan kelompok dan 1–5 memilihnya. Klik resource pada HUD untuk mengarahkan pekerja terpilih, atau pekerja idle bila tidak ada yang dipilih. Peta kecil dapat diklik untuk berpindah.

Selama halaman terbuka, perintah, pengumpulan, pembangunan, pelatihan, dan pertempuran tetap maju ketika tab berada di belakang. Jika browser menangguhkan tab, waktu dihitung saat halaman kembali dijalankan. Jeda manual menghentikan simulasi. Server menyimpan snapshot dan tidak menjalankan dunia saat halaman ditutup.

## Akun dan progres lama

Snapshot **versi 3** menyimpan posisi unit, perintah aktif, barang bawaan, bangunan, antrean, resource, dan keadaan kamp. Slot lokal dipisahkan per DID Privy; pengunjung anonim tidak dapat memasuki kampanye. Logout mengunci kembali layar permainan.

Progres versi 2 tetap dapat dimuat setelah login dan disalin ke slot `:before-rts` sebelum migrasi. Resource, jumlah pekerja, pasukan di desa/ekspedisi, pelatihan berbayar, hasil penaklukan, dan kondisi kampanye dipertahankan. Unlock barak lama menjadi bangunan militer yang sesuai; biaya upgrade yang belum selesai dikembalikan. Sistem produksi lama diganti dengan pekerja yang dikendalikan langsung. Akun baru dapat memilih **Mulai kerajaan baru** (resource 0) atau secara eksplisit mengimpor progres lama dari perangkat. Kampanye lama tidak direset menjadi 0 secara otomatis.

## Struktur

| Bagian | Fungsi |
| --- | --- |
| `index.html` | Layar pembuka, HUD, panel, dan kontrol yang dapat diakses |
| `assets/css/` | Tampilan fullscreen, akun, dan kontrol RTS responsif |
| `assets/js/rts-engine.js` | Simulasi RTS dan validator snapshot yang dipakai browser serta Cloudflare |
| `assets/js/rts-game.js` | Pilihan unit, perintah, antarmuka, renderer, dan penyimpanan akun |
| `assets/js/rts-scenery.js` | Pemandangan vektor asli pada canvas |
| `assets/js/rts-navigation.js` | Grid daratan/sungai yang dihasilkan Python |
| `assets/js/session-gate.js` | Penguncian permainan sampai identitas dan progres akun tersedia |
| `assets/js/camera.js` | Kamera, batas peta, drag, dan pinch zoom |
| `assets/js/engine.js` | Jam simulasi bersama dan pembacaan format kampanye lama |
| `data/world.json`, `assets/js/world-data.js` | Data dunia yang dibuat Python |
| `tools/build_world.py`, `tools/build_rts_nav.py` | Compiler pemandangan, navigasi, dan versi asset |
| `tools/serve.py` | Preview lokal |
| `src/privy.jsx`, `assets/auth/` | Sumber komponen dan bundle SDK resmi Privy |
| `assets/js/online-config.js`, `cloud-client.js` | Konfigurasi publik, antrean simpan, dan konflik antarperangkat |
| `cloudflare/` | API Workers + D1 yang digunakan produksi |
| `server/` | Alternatif API Python + SQLite untuk hosting container |
| `tests/` | Kontrol RTS, ekonomi, migrasi, latar belakang, kamera, autentikasi, dan server |

`game.js` dan pengujian kampanye lama dipertahankan untuk kompatibilitas, tetapi tidak dimuat oleh layar permainan baru. Pemandangan statis di-cache pada canvas terpisah agar tidak dibuat ulang setiap frame. Tidak menggunakan asset Age of Empires.

## Pengembangan

Gunakan Python 3.10+ dan Node.js 20+. Bundle akun disertakan untuk preview statis.

```sh
python tools/build_rts_nav.py
python tools/build_world.py
python tools/serve.py
```

Buka `http://127.0.0.1:8769/`. Login lokal memerlukan origin tersebut diizinkan dalam pengaturan aplikasi Privy.

```sh
npm test
python -m unittest discover -s tests -p 'test*.py'
cd cloudflare
npm ci
npm test
```

Pengujian server Python membutuhkan `server/requirements.txt`. Setelah mengubah komponen akun, jalankan `npm ci`, `npm run build:auth`, lalu `python tools/build_world.py`. Setelah mengubah simulasi RTS, perbarui juga backend Cloudflare karena validator dibagikan dari file yang sama.

## Deployment

GitHub Pages menyajikan `index.html`, seluruh `assets/`, serta `CNAME` untuk `6xg.online`. Login Privy menggunakan App ID publik `cmuqjbgfe02a60cjlya6r4t0m`; metode login dan origin diatur di Privy Dashboard. Jangan meletakkan App Secret, private key, atau database pemain dalam asset web.

Backend produksi dan deployment otomatis dijelaskan di [cloudflare/README.md](cloudflare/README.md). Alternatif Python dijelaskan di [server/README.md](server/README.md). GitHub Pages tidak menjalankan server Python.
