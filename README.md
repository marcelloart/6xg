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

## Produksi, misi dan pencapaian (v1.6)

Menu **Olah** menyediakan dapur kebun (level 2, pembangunan 120 detik, 14 kayu + 8 batu + 2 daging), rumah jus (level 7, 150 detik, 22 kayu + 12 batu + 3 daging), dan rumah pai (level 8, 180 detik, 26 kayu + 16 batu + 4 daging). Semua dapat ditempatkan dan dipindahkan lewat pratinjau peta yang sama.

| Resep | Level | Bahan | Durasi | Hasil | Harga jual | XP saat diambil |
| --- | --- | --- | --- | --- | --- | --- |
| Sup wortel | 2 | 3 wortel | 10 menit | 1 | 16 | 4 |
| Selai stroberi | 4 | 3 stroberi | 30 menit | 1 | 60 | 9 |
| Jus jeruk | 7 | 3 jeruk | 45 menit | 1 | 175 | 15 |
| Pai apel | 8 | 3 apel | 60 menit | 1 | 225 | 20 |

Setiap bangunan memiliki tiga antrean bergiliran. Bahan dibayar saat masuk antrean. Deadline memakai waktu server sehingga berjalan saat tab ditutup; hasil tidak kedaluwarsa. Klik Ambil setelah selesai, lalu jual di Toko → Olahan. Panen dan olahan berbagi kapasitas tas; jika penuh, hasil tetap di antrean. Pemindahan bangunan tidak mengubah identitas atau waktu produksi.

Menu **Tujuan** juga berisi tiga misi harian: tanam 3 bibit (2 bibit wortel + 8 XP), panen 9 hasil (3 bibit + 12 XP), kirim 1 pesanan (2 bibit + 10 XP). Misi berganti tepat pukul 00.00 WIB. Progres dihitung dari aksi server hari itu; hadiah yang belum diambil tidak dibawa ke hari berikutnya.

Lima pencapaian permanen menghitung panen, koin penjualan, bangunan selesai, produksi, dan klaim harian. Hadiah hanya sekali per akun. Panen 30 hasil lalu klaim Panen Bertumbuh untuk membuka pot bunga gratis; dekorasi tersebut tidak memberi XP pembangunan. Akun lama mempertahankan saldo, tanaman, tata letak, foto dan XP, tanpa tambahan modal otomatis.

## Tutorial, level dan pesanan

Menu **Tujuan** menyatukan panduan interaktif empat langkah (tanam → panen → jual → lumbung), progres level, daftar yang terbuka, dan tiga pesanan pelanggan. Panduan boleh disembunyikan lalu dilanjutkan; progresnya berada di akun server.

Level 1–9 membutuhkan XP kumulatif **0, 30, 80, 150, 260, 420, 650, 950, 1400**. Wortel sampai alpukat terbuka berurutan pada level tersebut. Panen memberi 2 XP per hasil, memulai pembangunan 10 XP, dan pesanan 8 + 4 × level pesanan. Lumbung tersedia di level 1, rumah di 2, sumur dan dekorasi bangku kebun di 3, gudang di 4. Bangku memerlukan 4 kayu + 2 batu dan 30 detik pembangunan.

Pesanan mengambil hasil dari tas dan membayar nilai jual panen + 25% (dibulatkan ke atas), beserta XP. Kebutuhan pesanan tetap sampai selesai, kemudian slot tersebut mendapat pesanan baru yang sesuai level. Satu pesanan tidak dapat diklaim dua kali.

## Transaksi server

Snapshot kebun versi 7 mencatat XP, tutorial, dan pesanan. Server membaca saldo yang tersimpan, memvalidasi aksi dari akun bertanda tangan Privy, memakai waktu server, lalu menyimpan hasil dan tanda terima secara atomik dalam D1. Klien hanya mengirim maksud tindakan ke **POST /api/farm-action**, dengan ID transaksi, revisi, jenis aksi, dan argumen yang dibatasi. Klien tidak boleh mengunggah saldo, hasil panen, hadiah, XP atau waktu panen melalui PUT /api/farm-save. GET /api/farm-save mengembalikan snapshot resmi dan waktu server.

Transaksi dengan ID sama dapat dicoba lagi ketika respons hilang tanpa biaya atau hadiah ganda. Konflik revisi memuat kondisi server terkini. Saat koneksi putus, tindakan belum dikonfirmasi tidak mengubah saldo; bermain membutuhkan koneksi untuk transaksi. Cache perangkat bukan sumber saldo. Waktu tumbuh tetap berjalan meskipun game ditutup. Kebun versi 4/5 dimigrasikan sambil mempertahankan saldo, tanaman, lokasi, profil, dan akses pada tanaman/bangunan yang sudah dimiliki. Endpoint /api/save untuk kampanye RTS lama tetap terpisah.

Migrasi **0003_farm_actions.sql** harus diterapkan sebelum Worker versi ini diluncurkan; skrip deploy menjalankan migrasi D1 dahulu. Jangan mengganti data pemain dengan fixture pengujian.

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

Landing GitHub Pages menggunakan SDK resmi Privy; game Cloudflare Pages memakai sesi cookie dan backend Workers + D1. `GET /api/farm-save` memuat progres; `POST /api/farm-action` menerima perintah yang diperiksa server. ID akun berasal dari token ES256 terverifikasi. Revisi atomik mencegah perangkat lama menimpa progres. CORS dibatasi ke origin landing dan game. Snapshot versi 7 menambahkan produksi, misi harian dan pencapaian; versi 4/5/6 yang sudah tersimpan dimigrasikan tanpa mengulang bibit gratis. Profil memiliki nama pekebun, nama kebun, dan empat avatar; nama dibatasi 24 karakter dan ditampilkan sebagai teks. Statistik mencatat panen/penjualan sejak pembaruan ini. Snapshot memiliki validator yang dibagikan antara browser dan Cloudflare; body dibatasi 48 KiB.

Data kebun menggunakan tabel `farm_saves` dan slot lokal `6xg-farm:<DID>`. Progres Benteng Bara tetap di tabel `saves` dan slot `6xg-account:<DID>`; tidak direset atau diimpor menjadi kebun. Sumber serta pengujian game perang dipertahankan untuk kompatibilitas, tetapi tidak dimuat oleh halaman utama.

Perubahan dikonfirmasi server sebelum saldo berubah. Cache perangkat menyimpan salinan hasil server dan tidak dapat mengunggah saldo. Kegagalan koneksi menyimpan ID tindakan untuk percobaan ulang yang tidak menggandakan biaya atau hadiah. Konflik memuat progres server terkini.

Ini adalah **game kebun solo dengan akun**, belum dunia multiplayer bersama. Ekonomi, hadiah, dan waktu panen dihitung server, sementara browser menggambar dunia dan menghitung tampilan hitung mundur. Login/simpan dengan token ES256 uji diverifikasi pada database terisolasi; alur login dan simpan lintas perangkat dengan akun Privy nyata masih memerlukan pengujian pemilik akun.

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

Profil → Pilih foto dari perangkat menerima JPG/PNG/WebP hingga 10 MB. Foto dipotong di tengah menjadi JPEG persegi 192 × 192, tanpa metadata foto asli, dengan payload maksimal 16 KiB. Hanya thumbnail disimpan bersama progres akun; file asli tidak dikirim. Simpan profil menerapkan perubahan. Hapus foto atau pilih avatar untuk kembali ke ikon. Worker menerima thumbnail melalui perintah profil yang dibatasi. Backend Python dipertahankan untuk kontrak lama; versi transaksi kebun ini memakai Worker.

Klik singkat memilih/menanam/memanen. Tahan diam 1,5 detik untuk mengangkat; indikator menunjukkan maksud memindahkan. Bergerak sebelum ambang waktu tetap menggeser peta. Lepaskan objek di hijau untuk menempatkan; merah mempertahankan pratinjau. Esc/Batal mengembalikan objek.


Aset realistis dan catatan resolusi: [ASSET_CREDITS.md](ASSET_CREDITS.md). Aset CC0 diproses menjadi tiga tingkat kualitas; model buah, pohon, batu dan peti terpasang secara lokal, dengan HDRI untuk pencahayaan dan pantulan air. Petak yang belum dibuka tidak lagi memblokir pemindahan; posisi petak baru disesuaikan saat dibuka agar tidak bertabrakan.

Kamera awal menghadap utara pada sudut elevasi 30° seperti game kebun mobile, sehingga dinding depan rumah, lumbung, dan tinggi tanaman terlihat lebih jelas; tombol kembali ke kebun memulihkan sudut ini. Jalan berupa satu permukaan melengkung yang tersambung, berada di luar seluruh area penempatan kebun. Sungai memiliki dasar berbatu dari Rock064, pembiasan air dengan IOR 1,333, pantulan HDRI, riak mengalir, warna kedalaman, dan buih tipis di tepian.

## Landing page dan aplikasi game

Cloudflare Pages `6xg-game` memakai Service binding `CLOUD_SAVE` ke Worker `6xg-cloud-save` pada lingkungan Production. Atur melalui Settings → Bindings → Add → Service binding, lalu deploy ulang. Sambungan internal ini meneruskan pemeriksaan token Privy pada backend yang sama; pemanggilan server ke URL `workers.dev` secara langsung tidak dipakai pada deployment produksi.

`site/index.html` adalah landing page untuk `6xg.online`: detail permainan, tanaman, panduan, FAQ, dan akun Privy. `play/index.html` adalah aplikasi game khusus `app.6xg.online`, dengan peta memenuhi viewport dan HUD mengambang. `npm run build:game` menghasilkan `app-static/` untuk Cloudflare Pages: HTML, aset publik, dan `_worker.js` untuk sesi akun dan proxy progres. `_routes.json` membatasi pemanggilan fungsi pada `/api/*`; aset game tetap disajikan langsung. Tidak ada database lokal, App Secret, atau private key dalam hasil build. Pengaturan Pages: branch `main`, perintah `npm run build:game`, output `app-static`, root repository.

Sesi Privy tetap berada pada origin utama. Tombol Mainkan terlebih dahulu mengirim token akses melalui header HTTPS ke `app.6xg.online/api/game-session`. Server memverifikasi identitas melalui backend Privy/D1 yang sudah ada, lalu membuat cookie host-only `__Host-6xg-game` dengan Secure, HttpOnly, SameSite=Strict, dan masa hidup maksimal satu jam. Landing mengonfirmasi cookie tersebut sebelum berpindah halaman. Game memulihkan identitas dari server dan mengakses progres melalui `/api/farm-save`; JavaScript game tidak menerima atau menyimpan token. Pemulihan ini tidak menggunakan iframe, URL token, atau penyalinan penyimpanan Privy. Sesi kedaluwarsa diarahkan kembali ke landing untuk pembaruan otomatis selama akun Privy masih terhubung. Logout membersihkan cookie game dan sesi Privy pusat. Endpoint penghubung sesi hanya membaca progres; konflik revisi cloud tetap menghentikan penimpaan progres. Landing page tidak membuat atau mengubah kebun.

API menerima tepat `https://6xg.online` dan `https://app.6xg.online`. Pengujian `npm run test:session` mencakup penghubungan sesi, konfirmasi cookie, isolasi identitas, pembatalan sesi, fetch browser, dan namespace progres. `cloudflare/test/game-session.mjs` memakai JWT bertanda tangan dan D1 terisolasi untuk menguji cookie, penolakan token palsu/kedaluwarsa, pembatasan origin, logout, dan pemulihan progres. Domain `app.6xg.online` terhubung melalui Custom domains di Cloudflare Pages dan CNAME `app` → `6xg-game.pages.dev` pada penyedia DNS. Domain utama tetap berada pada GitHub Pages dengan landing page sebagai beranda. `playUrl` mengarah ke `https://app.6xg.online/`; origin sesi tetap `https://6xg.online`. Halaman `/play/` tetap tersedia sebagai rute kompatibilitas untuk pemain yang memakai tautan lama.

Cuplikan pada landing page berasal dari render game sebenarnya dengan kebun contoh lokal. Foto produk berasal dari aset yang diunggah pemilik game.

## Ternak dan kebun teman (1.7)

- Menu **Ternak**: kandang ayam level 3 (4 ayam/kandang) dan kandang sapi level 5 (2 sapi/kandang). Ayam 65 koin, sapi 200 koin; pembelian memerlukan kandang selesai.
- Ayam: 1 jagung → 3 telur, 30 menit, +4 XP saat diambil. Sapi: 2 wortel +2 jagung → 3 susu, 2 jam, +8 XP saat diambil. Telur 7 koin/unit, susu 14 koin/unit. Hasil ternak memakai tas bersama panen dan olahan.
- Pakan dibayar sekali per siklus. Saat siap, hasil menunggu sampai diambil; tidak menumpuk tanpa pakan baru. Penempatan kandang memakai pratinjau yang sama, dan memindahkan kandang menjaga identitas serta deadline ternak.
- Menu **Teman**: sharing dimulai nonaktif. Pemilik mengaktifkan kode acak 16 karakter, menyalin tautan kunjungan, dan dapat menutupnya. Maksimal 30 bookmark teman disimpan per akun. Tidak ada pesan, pengiriman undangan, atau perubahan kebun orang lain.
- Kunjungan memakai proyeksi tampilan terpisah (nama, avatar emoji, level, petak, bangunan, ternak). Foto profil, saldo, inventori, log, pesanan dan progres misi tidak dibagikan. Semua API kunjungan membutuhkan akun terverifikasi. Ini kunjungan snapshot, bukan multiplayer waktu nyata; kembali ke Kebunku mengembalikan kamera dan kebun sendiri.
- Snapshot v8 menerima v4–v7 tanpa mereset kebun atau mengulang bibit awal. State `livestock` dan `social` diinisialisasi kosong/private. Semua transaksi tetap CAS dan memakai receipt idempotensi; waktu ternak berasal dari server.
- Verifikasi: `npm test`, `npm run test:session`, `npm --prefix cloudflare test`, `npm run build:3d`, `npm run build:game`.
