# Visual assets — 6XG Harvest

## Animated human residents

The gardener, construction worker, and neighbor are adapted from [Microsoft Rocketbox](https://github.com/microsoft/Microsoft-Rocketbox): Gardener_Male_01, Construction_Male_01, and Female_Adult_03. Their walk, breathing idle, crouching care, and working clips come from the same library. Copyright (c) 2020 Microsoft; [MIT license](assets/people/LICENSE-Microsoft.md), included with the shipped models. These human assets use MIT, separately from the CC0 environment below.

The original FBX meshes are converted to indexed glTF with independent 81-bone rigs, shared photographic clothing/face textures, in-place locomotion, and 30 Hz animation clips. Textures are capped at 1024 px for browser memory. Residents are visual characters: they do not spend coins, harvest crops, or write account saves. There are seven residents on desktop and three in the light/mobile view. Source file hashes and processed asset hashes are recorded in `assets/people/sources.json`.

Aset pemindaian 3D, tekstur PBR, atlas tanaman, dan pencahayaan HDRI berasal dari ambientCG dan Poly Haven. Semua sumber berikut berlisensi CC0-1.0. Berkas dikirim dari domain game; browser pemain tidak perlu mengakses situs penyedia.

| Sumber | Jenis | Lisensi |
| --- | --- | --- |
| [Grass005](https://ambientcg.com/a/Grass005) · ambientCG | material | CC0-1.0 |
| [Ground112](https://ambientcg.com/a/Ground112) · ambientCG | material | CC0-1.0 |
| [Wood096](https://ambientcg.com/a/Wood096) · ambientCG | material | CC0-1.0 |
| [Bark012](https://ambientcg.com/a/Bark012) · ambientCG | material | CC0-1.0 |
| [Plaster001](https://ambientcg.com/a/Plaster001) · ambientCG | material | CC0-1.0 |
| [RoofingTiles013A](https://ambientcg.com/a/RoofingTiles013A) · ambientCG | material | CC0-1.0 |
| [Rock064](https://ambientcg.com/a/Rock064) · ambientCG | material | CC0-1.0 |
| [Metal055A](https://ambientcg.com/a/Metal055A) · ambientCG | material | CC0-1.0 |
| [ThatchedRoof001A](https://ambientcg.com/a/ThatchedRoof001A) · ambientCG | material | CC0-1.0 |
| [LeafSet004](https://ambientcg.com/a/LeafSet004) · ambientCG | atlas | CC0-1.0 |
| [Foliage008](https://ambientcg.com/a/Foliage008) · ambientCG | atlas | CC0-1.0 |
| [ColdCutsSet002](https://ambientcg.com/a/ColdCutsSet002) · ambientCG | atlas | CC0-1.0 |
| [FoodCrossSectionSet001](https://ambientcg.com/a/FoodCrossSectionSet001) · ambientCG | atlas | CC0-1.0 |
| [3DApple002](https://ambientcg.com/a/3DApple002) · ambientCG | 3d-model | CC0-1.0 |
| [3DAvocado001](https://ambientcg.com/a/3DAvocado001) · ambientCG | 3d-model | CC0-1.0 |
| [3DTreeStump001](https://ambientcg.com/a/3DTreeStump001) · ambientCG | 3d-model | CC0-1.0 |
| [island_tree_02](https://polyhaven.com/a/island_tree_02) · Poly Haven | 3d-model | CC0-1.0 |
| [boulder_01](https://polyhaven.com/a/boulder_01) · Poly Haven | 3d-model | CC0-1.0 |
| [wooden_crate_02](https://polyhaven.com/a/wooden_crate_02) · Poly Haven | 3d-model | CC0-1.0 |
| [DaySkyHDRI069A](https://ambientcg.com/a/DaySkyHDRI069A) · ambientCG | hdri | CC0-1.0 |

Lisensi: [ambientCG](https://docs.ambientcg.com/license/) dan [Poly Haven](https://polyhaven.com/license).

Apel dan alpukat menggunakan model hasil pemindaian asli ambientCG. Pohon memakai geometri batang/cabang Island Tree 02 dari Poly Haven dan kartu daun foto LeafSet004 pada distribusi kanopi model sumber; batu dan peti menggunakan model Poly Haven.

Rumah, lumbung, gudang, sumur, jembatan, air bergerak, dan bentuk tujuh tanaman lainnya masih merupakan geometri yang dibuat untuk game. Material bangunan, tanah, kulit batang, daun, dan detail permukaannya memakai sumber CC0 yang tercatat. Bentuk itu bukan model fotogrametri yang diunduh. Foto pribadi pemain, logo/UI, dan renderer kompatibilitas 2D tidak berasal dari pustaka 3D ini.

Ultra mempertahankan warna material/produk terpilih hingga 4096 px dari sumber asli. Peta normal dan data menggunakan resolusi lebih kecil untuk membatasi memori GPU; atlas daun menggunakan ukuran hasil crop aslinya dan langit EXR menggunakan 2K. Mode high/low memiliki tekstur dan geometri yang lebih ringan.

## Foto katalog unggahan pemilik

Sembilan gambar JPEG asli di `assets/produce/` diberikan oleh pemilik proyek pada 3 Oktober 2026: wortel, tomat, jagung, stroberi, kentang, cabai, jeruk, apel, dan alpukat. Gambar tersebut digunakan untuk katalog bibit, jual panen, dan pemilihan bibit; foto tetap diprioritaskan saat thumbnail renderer 3D selesai dimuat. Aset unggahan ini terpisah dari daftar CC0 di atas dan tidak mengubah model tanaman pada peta.

Rincian berkas, hash SHA-256, sumber, dan pemrosesan: `assets/cc0/sources.json`. Impor ulang: unduh arsip yang tercatat ke cache lokal, lalu jalankan `python tools/import-cc0-textures.py <cache>` dan `node tools/import-cc0-models.mjs <cache>`. Model glTF Poly Haven beserta dependensinya dan alpha daun disimpan di subfolder cache sesuai ID. Jalankan `npm run build:3d` dan `python tools/build_farm.py` setelah impor.
