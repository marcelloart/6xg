# 6XG — Benteng Bara

Game strategi solo di [6xg.online](https://6xg.online). Kelola kayu, batu, emas, dan daging; bangun desa, latih pasukan, dan rebut tiga kamp musuh.

Sumber daya dan panel pengelolaan menyatu dengan peta. Seret peta dengan mouse atau sentuhan, gulir/cubit untuk zoom, atau klik peta kecil untuk berpindah. Tombol ⌂ dan Home mengembalikan kamera ke desa. P menjeda permainan.

Resource berada dalam bilah ringkas, dan panel perintah dibuka hanya saat dipilih. Header menyediakan **Daftar / Masuk** melalui SDK resmi Privy. Akun baru dapat membawa desa tamu atau membuat desa baru; slot tamu dan slot akun terpisah.

**Status online saat ini:** login Privy tersedia, tetapi sinkronisasi lintas perangkat belum diaktifkan karena backend belum memiliki hosting. UI menampilkan status ini secara jelas. Pilihan Cloudflare Workers + D1 untuk paket gratis beserta tombol deploy tersedia di [cloudflare/README.md](cloudflare/README.md). Backend Python beserta validasi token, penyimpanan SQLite, kontrol revisi, Dockerfile, dan pengujian tersedia di [server/README.md](server/README.md). Game saat ini merupakan kampanye solo, bukan multiplayer.

Produksi, pembangunan, pelatihan, ekspedisi, dan serangan tetap maju selama halaman terbuka di belakang. Waktu yang terlewat saat tab ditangguhkan dihitung ketika browser kembali menjalankannya. Jeda manual menghentikan seluruh simulasi. Progres disimpan di browser dengan format versi 2 yang kompatibel dengan versi sebelumnya.

## Struktur

| Bagian | Fungsi |
| --- | --- |
| `index.html` | Struktur layar dan kontrol yang dapat diakses |
| `assets/css/game.css` | Tampilan game dan ukuran layar HP/desktop |
| `assets/js/engine.js` | Ekonomi, pasukan, pertempuran, penyimpanan, dan jam simulasi |
| `assets/js/camera.js` | Kamera, batas peta, drag, dan pinch zoom |
| `assets/js/game.js` | Antarmuka, canvas, peta kecil, dan penggambaran dunia |
| `data/world.json` | Ukuran dunia, posisi sumber daya, kamp, dan seed |
| `tools/build_world.py` | Membuat serta memvalidasi data peta dengan Python |
| `assets/js/world-data.js` | Data peta hasil Python yang dipakai game |
| `tools/serve.py` | Server Python untuk pengembangan lokal |
| `src/privy.jsx` | Komponen akun React dan integrasi SDK resmi Privy |
| `assets/js/online-config.js` | App ID publik dan alamat backend |
| `assets/js/cloud-client.js` | Sinkronisasi, antrean simpan, dan penanganan konflik perangkat |
| `assets/auth/` | SDK akun yang telah dibundel; dimuat saat membuka akun |
| `server/` | API Python untuk progres lintas perangkat setelah dipasang ke hosting |
| `cloudflare/` | API alternatif untuk Workers + D1, dengan migrasi dan pengujian runtime |
| `tests/` | Pengujian ekonomi, kampanye, latar belakang, kamera, dan compiler dunia |

Pemandangan statis disimpan pada canvas terpisah, sehingga hutan dan bentang alam tidak digambar ulang dari awal di setiap frame. Data dunia dibuat terlebih dahulu oleh Python. Kampanye tamu dapat dijalankan tanpa layanan eksternal. Login akun memakai Privy.

## Menjalankan lokal

Gunakan Python 3.10+ dan Node.js 20+ untuk pengembangan. Asset akun yang sudah dibundel disertakan agar preview statis bisa langsung berjalan.

```sh
python tools/build_world.py
python tools/serve.py
```

Buka `http://127.0.0.1:8769/`. Setelah mengubah posisi atau seed di `data/world.json`, jalankan kembali compiler Python dan muat ulang halaman.

```sh
python tools/build_world.py --check
python -m unittest discover -s tests -p test_world.py
npm test
```

Setelah mengubah komponen akun:

```sh
npm ci
npm run build:auth
python tools/build_world.py
```

Di Privy Dashboard, aktifkan metode login yang diinginkan dan izinkan domain `https://6xg.online`. Untuk pengujian lokal, tambahkan origin localhost sesuai port yang digunakan. App ID bersifat publik. Jangan meletakkan App Secret, private key, atau database pemain dalam asset web.

## Publikasi

GitHub Pages menyajikan HTML, CSS, JavaScript, dan data dunia yang sudah dibuat. Sertakan folder `assets/`, `index.html`, dan `CNAME` dalam publikasi; domain tetap `6xg.online`.

Python digunakan untuk persiapan dunia, validasi, dan server pengembangan. API penyimpanan Python memerlukan hosting tersendiri; GitHub Pages tidak menjalankannya. Publikasikan seluruh `assets/`, termasuk bundle akun, bersama `index.html` dan `CNAME`. Sumber: [dokumentasi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
