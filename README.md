# 6XG — Benteng Bara

Game strategi solo di [6xg.online](https://6xg.online). Kelola kayu, batu, emas, dan daging; bangun desa, latih pasukan, dan rebut tiga kamp musuh.

Sumber daya dan panel pengelolaan menyatu dengan peta. Seret peta dengan mouse atau sentuhan, gulir/cubit untuk zoom, atau klik peta kecil untuk berpindah. Tombol ⌂ dan Home mengembalikan kamera ke desa. P menjeda permainan.

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
| `tests/` | Pengujian ekonomi, kampanye, latar belakang, kamera, dan compiler dunia |

Pemandangan statis disimpan pada canvas terpisah, sehingga hutan dan bentang alam tidak digambar ulang dari awal di setiap frame. Data dunia dibuat terlebih dahulu oleh Python. Tidak ada library, gambar, atau layanan eksternal yang wajib diunduh saat bermain.

## Menjalankan lokal

Gunakan Python 3.10+ dan Node.js 20+ untuk pengembangan dan pengujian. Tidak ada paket tambahan yang perlu diinstal.

```sh
python tools/build_world.py
python tools/serve.py
```

Buka `http://127.0.0.1:8769/`. Setelah mengubah posisi atau seed di `data/world.json`, jalankan kembali compiler Python dan muat ulang halaman.

```sh
python tools/build_world.py --check
python -m unittest discover -s tests -p test_world.py
node tests/engine.cjs
node tests/background.cjs
node tests/map.cjs
```

## Publikasi

GitHub Pages menyajikan HTML, CSS, JavaScript, dan data dunia yang sudah dibuat. Sertakan folder `assets/`, `index.html`, dan `CNAME` dalam publikasi; domain tetap `6xg.online`.

Python digunakan untuk persiapan dunia, validasi, dan server pengembangan. Python tidak berjalan sebagai server produksi di GitHub Pages. Fitur akun, multiplayer, atau penyimpanan lintas perangkat membutuhkan backend serta hosting tersendiri. Sumber: [dokumentasi GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages).
