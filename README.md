# 6XG — Ladang Bara

Game kebun di [6xg.online](https://6xg.online): beli bibit, tanam, tunggu matang, panen, jual hasil di toko, beli bahan, lalu bangun rumah dan lumbung. Dunia 3D memakai model kebun asli, tekstur alam, pencahayaan matahari, dan kamera yang dapat diputar.

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

Toko memiliki bagian **Bibit**, **Jual panen**, **Bahan**, dan **Bangunan**. Kayu berharga 3 koin, batu 4, daging 5. Jika pemain sudah tidak punya bibit, tanaman, atau hasil panen, pembelian bahan menyisakan minimal 5 koin untuk bibit wortel agar permainan dapat diteruskan.

| Bangunan | Kayu / batu / daging | Waktu | Manfaat setelah selesai |
| --- | --- | --- | --- |
| Lumbung | 6 / 3 / 1 | 90 detik | +80 ruang panen |
| Rumah | 10 / 5 / 2 | 60 detik | +6 petak |
| Gudang | 8 / 4 / 1 | 60 detik | +40 ruang panen |
| Sumur | 5 / 6 / 1 | 45 detik | +3 petak |

Peta 3.200 × 2.200 memenuhi layar browser dan dapat digeser, diperbesar, serta dinavigasi melalui peta kecil. Bangunan tidak lagi terbatas pada tapak tetap: pilih bangunan dan pratinjau langsung mengikuti kursor, putar dengan R atau tombol arah, lalu klik atau lepaskan di tanah hijau. Tombol **Konfirmasi** tetap tersedia. Pratinjau hijau/merah memeriksa batas tanah, pondok, pohon, bangunan, dan petak lain. Ada maksimal 24 bangunan dan 81 petak. Tahan bangunan atau petak selama **1,5 detik** untuk mengangkatnya. Objek dan tanaman mengikuti kursor dengan preview lokasi hijau/merah; seret lalu lepaskan pada lokasi sah, atau lepas di tempat lalu gerakkan kursor dan klik untuk menempatkan. Lokasi terhalang ditolak, **Batal/Esc** mengembalikan objek. Klik singkat tetap menanam/memanen; dua jari menggeser dan memperbesar peta tanpa membatalkan penempatan. Seret klik kanan atau tombol tengah di komputer, atau arahkan objek ke tepi layar untuk menggulir peta. Melepas gestur navigasi tidak menempatkan objek; klik/tap berikutnya menentukan lokasi. Menu **Atur** juga memindahkan bangunan/petak tanpa biaya; tanaman dan deadline tetap berjalan. Tambahan area 1/3/6 petak berharga 20 koin per petak dan lokasinya dipilih pemain. Petak cadangan yang belum terbuka tidak menghalangi lahan kosong. Saat petak baru terbuka, posisinya disesuaikan tanpa memindahkan tanaman atau bangunan yang sudah ada. Biaya dibayar hanya setelah penempatan sah. Pondok kebun awal adalah bagian pemandangan dan tidak menambah kapasitas.

## Kontrol

Pilih bibit di **Kebun**, lalu klik petak kosong. Wortel dipilih secara awal. Klik tanaman matang untuk memanen. Tombol petak dalam panel Kebun menyediakan alternatif keyboard: pilih petak kemudian tekan **Tanam**. Seret peta, gunakan panah saat canvas fokus, gulir/cubit untuk zoom, Home untuk kembali, dan Escape untuk menutup panel atau membatalkan penempatan.

**Q / E** atau tombol **↶ / ↷** memutar kamera 3D. Koordinat petak dan bangunan tetap sama setelah kamera diputar. Peta kecil menampilkan batas pandangan yang ikut berputar. **Menu → Kualitas tampilan** menyediakan otomatis, detail tinggi, ringan, dan 2D; pengaturan tersimpan per perangkat. WebGL 2 digunakan untuk 3D, dengan tampilan canvas 2D otomatis jika tidak tersedia. Kehilangan konteks grafis menyediakan tombol 2D dan tidak mengubah snapshot kebun.

Tanah, rumah, lumbung, gudang, sumur, dan sembilan jenis tanaman memiliki bentuk 3D. Lanskap memakai daun instanced, relief di luar kebun, sungai beriak, normal map, dan bayangan matahari pada kualitas otomatis desktop/detail tinggi. Pertumbuhan mengubah bentuk tanaman; mode ringan mematikan bayangan. Angin menggerakkan daun, puncak pohon, dan tanaman dengan shader serta bayangan yang selaras. Daun hijau berjatuhan. Bilah rumput pucat dan partikel udara putih dihapus. Sungai memakai geometri berombak, aliran, kilau matahari, dan warna air yang tetap terlihat pada mode ringan. Menu menyediakan sakelar animasi dan mengikuti preferensi pengurangan gerakan perangkat secara awal. Katalog menggunakan gambar 3D asli tanaman/buah, bahan, dan bangunan. Render dibatasi 30–50 fps dan dihentikan saat halaman tersembunyi; timer pertumbuhan tetap berdasarkan waktu nyata.

Tekstur **Grass005**, **Ground112**, dan **Wood096** berasal dari [ambientCG](https://ambientcg.com), berlisensi [CC0 1.0](https://docs.ambientcg.com/license/). Map warna dan normal asli 1K dikompres ke 512px untuk pengiriman browser; sumber tercatat di `assets/textures/sources.json`. Model, tata letak, dan geometri tanaman dibuat untuk game ini. Grafik mengarah ke tampilan alam realistis ringan untuk browser, bukan kualitas fotorealistik AAA.

## Suara permainan

Efek suara orisinal menggunakan Web Audio: menanam, memanen, membeli/menjual, mengangkat, memutar, menempatkan, membangun, selesai membangun, pembatalan, dan lokasi/transaksi yang ditolak. Suasana alam berisi angin, burung, air sungai yang semakin terdengar saat kamera mendekati sungai, dan ketukan alat pada bangunan yang sedang dikerjakan. Efek pendek dibatasi agar klik cepat tidak menumpuk; node audio dilepas setelah selesai.

Suara baru diaktifkan setelah interaksi pemain sesuai aturan autoplay browser. Ikon pengeras suara di header dapat mematikan/mengaktifkan suara. **Menu → Suara kebun** mengatur volume utama, efek permainan, dan suasana alam secara terpisah, dengan tombol contoh. Pilihan tersimpan lokal per perangkat; tidak mengubah progres akun. Saat tab tersembunyi audio berhenti dan sumber lingkungan dilepas, sementara timer tanaman tetap berdasarkan waktu nyata. Suasana kebun berhenti setelah keluar akun. Browser tanpa Web Audio tetap dapat bermain tanpa suara. Tidak ada unduhan audio atau permintaan mikrofon.

Sumber suara: `assets/js/farm-audio.js`. Semua suara disintesis untuk Ladang Bara; tidak menggunakan rekaman pihak ketiga.

## Progres online

Frontend GitHub Pages menggunakan SDK resmi Privy dan backend Cloudflare Workers + D1. Endpoint kebun `GET/PUT /api/farm-save` memverifikasi token ES256 dan mengambil ID akun dari token. Revisi atomik menolak penyimpanan dari perangkat lama. CORS dibatasi ke origin game. Snapshot versi 5 menambahkan posisi petak/bangunan, rotasi, perluasan, profil, dan statistik panen/penjualan. Snapshot versi 4 tetap diterima dan dimigrasikan tanpa mereset inventori atau deadline. Profil memiliki nama pekebun, nama kebun, dan empat avatar; nama dibatasi 24 karakter dan ditampilkan sebagai teks. Statistik mencatat panen/penjualan sejak pembaruan ini. Snapshot memiliki validator yang dibagikan antara browser dan Cloudflare; body dibatasi 48 KiB.

Data kebun menggunakan tabel `farm_saves` dan slot lokal `6xg-farm:<DID>`. Progres Benteng Bara tetap di tabel `saves` dan slot `6xg-account:<DID>`; tidak direset atau diimpor menjadi kebun. Sumber serta pengujian game perang dipertahankan untuk kompatibilitas, tetapi tidak dimuat oleh halaman utama.

Perubahan disimpan lokal terlebih dahulu lalu dikirim online. Baseline revisi memungkinkan perubahan lokal yang belum terunggah dipulihkan jika revisi cloud belum berubah. Jika perangkat lain sudah memiliki revisi lebih baru, progres online diutamakan; konflik upload meminta pemuatan ulang. Perhatikan status **TERSIMPAN ONLINE** sebelum berpindah perangkat.

Ini adalah **game kebun solo dengan akun**, belum dunia multiplayer bersama. Ekonomi dan waktu berasal dari browser; database menyimpan snapshot, bukan transaksi ekonomi server yang otoritatif. Jangan gunakan saldo ini untuk uang nyata, hadiah, atau leaderboard kompetitif. Login/simpan dengan token ES256 uji diverifikasi pada database terisolasi; alur login dan simpan lintas perangkat dengan akun Privy nyata masih memerlukan pengujian pemilik akun.

## Sumber dan pengembangan

- `assets/css/farm.css`, `assets/css/farm-studio.css`: tampilan fullscreen, studio tata letak, toko, dan profil responsif.
- `assets/js/farm-engine.js`: harga, timer, inventori, pembangunan, dan validator.
- `src/farm-3d.js`, `assets/js/farm-3d.js`: sumber dan bundle mesin pemandangan Three.js.
- `assets/js/farm-pickup.js`: tekan 1,5 detik, drag/drop, klik normal, pembatalan, navigasi selama penempatan, dan gulir tepi layar.
- `assets/js/farm-camera.js`: proyeksi tanah, pemilihan petak, dan kamera 3D.
- `assets/textures/`: tekstur CC0 lokal, tanpa ketergantungan CDN saat bermain.
- `assets/js/farm-scenery.js`: pemandangan canvas asli untuk fallback 2D.
- `assets/js/farm-game.js`: kontrol peta, antarmuka, dan penguncian akun.
- `tools/build_farm.py`: generator dunia menggunakan Python dan fingerprint asset.
- `src/privy.jsx`, `assets/auth/`: SDK Privy dan sumber antarmuka akun.
- `cloudflare/`: API produksi dan migrasi D1, termasuk `0002_farm_saves.sql`.
- `server/app.py`: alternatif API Python + SQLite dengan namespace kebun yang sama.

```sh
npm ci
npm run build:3d
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

## Tampilan layar penuh dan foto profil

Dunia 3D memenuhi area browser, dengan kontrol mengambang dan login di tengah layar awal. Komputer memakai preset Ultra pada pilihan Otomatis; perangkat kecil memakai 3D ringan. Menu → Kualitas tampilan menyediakan Ultra 4K, detail tinggi, dan ringan. Ultra mempertahankan tekstur warna terpilih hingga 4096 px dari sumber CC0; peta normal/data dan atlas memakai ukuran lebih kecil untuk menjaga memori grafis. HDRI langit asli memakai 2K. Buffer render hingga 3840 × 2160 mempertahankan bentuk layar dan batas GPU; resolusi aktual ditampilkan di Menu. Resolusi tinggi memperjelas model yang ada, bukan jaminan kualitas fotorealistis.

Profil → Pilih foto dari perangkat menerima JPG/PNG/WebP hingga 10 MB. Foto dipotong di tengah menjadi JPEG persegi 192 × 192, tanpa metadata foto asli, dengan payload maksimal 16 KiB. Hanya thumbnail disimpan bersama progres akun; file asli tidak dikirim. Simpan profil menerapkan perubahan. Hapus foto atau pilih avatar untuk kembali ke ikon. Validator JS dan Python menerima field opsional ini pada save v5, tanpa mengubah ekonomi atau timer.

Klik singkat memilih/menanam/memanen. Tahan diam 1,5 detik untuk mengangkat; indikator menunjukkan maksud memindahkan. Bergerak sebelum ambang waktu tetap menggeser peta. Lepaskan objek di hijau untuk menempatkan; merah mempertahankan pratinjau. Esc/Batal mengembalikan objek.


Aset realistis dan catatan resolusi: [ASSET_CREDITS.md](ASSET_CREDITS.md). Aset CC0 diproses menjadi tiga tingkat kualitas; model buah, pohon, batu dan peti terpasang secara lokal, dengan HDRI untuk pencahayaan dan pantulan air. Petak yang belum dibuka tidak lagi memblokir pemindahan; posisi petak baru disesuaikan saat dibuka agar tidak bertabrakan.

Kamera awal menghadap utara pada sudut elevasi 30° seperti game kebun mobile, sehingga dinding depan rumah, lumbung, dan tinggi tanaman terlihat lebih jelas; tombol kembali ke kebun memulihkan sudut ini. Jalan berupa satu permukaan melengkung yang tersambung, berada di luar seluruh area penempatan kebun. Sungai memiliki dasar berbatu dari Rock064, pembiasan air dengan IOR 1,333, pantulan HDRI, riak mengalir, warna kedalaman, dan buih tipis di tepian.

## Landing page dan aplikasi game

Cloudflare Pages `6xg-game` memakai Service binding `CLOUD_SAVE` ke Worker `6xg-cloud-save` pada lingkungan Production. Atur melalui Settings → Bindings → Add → Service binding, lalu deploy ulang. Sambungan internal ini meneruskan pemeriksaan token Privy pada backend yang sama; pemanggilan server ke URL `workers.dev` secara langsung tidak dipakai pada deployment produksi.

`site/index.html` adalah landing page untuk `6xg.online`: detail permainan, tanaman, panduan, FAQ, dan akun Privy. `play/index.html` adalah aplikasi game khusus `app.6xg.online`, dengan peta memenuhi viewport dan HUD mengambang. `npm run build:game` menghasilkan `app-static/` untuk Cloudflare Pages: HTML, aset publik, dan `_worker.js` untuk sesi akun dan proxy progres. `_routes.json` membatasi pemanggilan fungsi pada `/api/*`; aset game tetap disajikan langsung. Tidak ada database lokal, App Secret, atau private key dalam hasil build. Pengaturan Pages: branch `main`, perintah `npm run build:game`, output `app-static`, root repository.

Sesi Privy tetap berada pada origin utama. Tombol Mainkan terlebih dahulu mengirim token akses melalui header HTTPS ke `app.6xg.online/api/game-session`. Server memverifikasi identitas melalui backend Privy/D1 yang sudah ada, lalu membuat cookie host-only `__Host-6xg-game` dengan Secure, HttpOnly, SameSite=Strict, dan masa hidup maksimal satu jam. Landing mengonfirmasi cookie tersebut sebelum berpindah halaman. Game memulihkan identitas dari server dan mengakses progres melalui `/api/farm-save`; JavaScript game tidak menerima atau menyimpan token. Pemulihan ini tidak menggunakan iframe, URL token, atau penyalinan penyimpanan Privy. Sesi kedaluwarsa diarahkan kembali ke landing untuk pembaruan otomatis selama akun Privy masih terhubung. Logout membersihkan cookie game dan sesi Privy pusat. Endpoint penghubung sesi hanya membaca progres; konflik revisi cloud tetap menghentikan penimpaan progres. Landing page tidak membuat atau mengubah kebun.

API menerima tepat `https://6xg.online` dan `https://app.6xg.online`. Pengujian `npm run test:session` mencakup penghubungan sesi, konfirmasi cookie, isolasi identitas, pembatalan sesi, fetch browser, dan namespace progres. `cloudflare/test/game-session.mjs` memakai JWT bertanda tangan dan D1 terisolasi untuk menguji cookie, penolakan token palsu/kedaluwarsa, pembatasan origin, logout, dan pemulihan progres. Domain `app.6xg.online` terhubung melalui Custom domains di Cloudflare Pages dan CNAME `app` → `6xg-game.pages.dev` pada penyedia DNS. Domain utama tetap berada pada GitHub Pages dengan landing page sebagai beranda. `playUrl` mengarah ke `https://app.6xg.online/`; origin sesi tetap `https://6xg.online`. Halaman `/play/` tetap tersedia sebagai rute kompatibilitas untuk pemain yang memakai tautan lama.

Cuplikan pada landing page berasal dari render game sebenarnya dengan kebun contoh lokal. Foto produk berasal dari aset yang diunggah pemilik game.
