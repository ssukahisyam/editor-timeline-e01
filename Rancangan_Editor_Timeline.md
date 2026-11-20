# Rancangan Editor Timeline E01

Nov 20, 2026 · @Can You Indonesian?

## Tujuan dan batasan

Editor lokal di browser untuk mengatur timing, teks, dan posisi overlay E01 sambil melihat hasilnya, tanpa menyunting kode. Sekarang setiap perubahan berarti mengubah `build_scenes.py`, membuat ulang data, lalu merender.

Yang harus bisa (MVP):

- Memutar video lengkap dengan VO dan menggeser playhead
- Melihat 44 scene dan 191 elemen (teks, stempel, tanda, panah) di satu timeline
- Menggeser waktu elemen dan batas scene, dengan tempel otomatis ke awal kata
- Mengubah teks, ukuran, warna, dan posisi elemen, termasuk drag langsung di preview
- Menyimpan ke `scenes.json` dengan undo dan redo
- Merender dari editor: cek cepat, potongan, atau penuh

Sengaja tidak:

- Bukan editor video umum: tanpa impor klip, audio lain, atau efek bebas
- Tidak membuat gambar; gambar tetap dari Anda
- Tidak online: berjalan di komputer Anda dengan Node dan Chrome yang sama seperti alat render

## Alur kerja

1. Klik dua kali `RENDER.bat` dan pilih "Editor" (atau jalankan `npm run editor`). Browser terbuka di `localhost:5173`.
2. Tekan spasi untuk memutar. Klik sebuah scene di timeline untuk melompat ke sana; tombol loop memutarnya berulang.
3. Klik sebuah elemen, di timeline atau di preview. Geser di timeline untuk mengubah waktunya, geser di preview untuk mengubah posisinya, ubah teks dan ukuran di panel kanan.
4. Perubahan langsung terlihat di preview dan tersimpan otomatis. Ctrl+Z membatalkan.
5. Klik "Render": cek 60 detik, scene terpilih, atau video penuh. Hasil masuk ke folder `hasil`.

## Tata letak GUI

Satu layar dengan empat area: aset, preview, properti, dan timeline di bawahnya.

&#91;embedded content: tata letak editor · 4 area + timeline 5 lajur\]

Memilih elemen di salah satu area menandainya di semua area. Panel aset di kiri baru hadir di versi 2; timeline punya lima lajur: penggaris, waveform VO, kata, scene, dan elemen yang dikelompokkan per slot.

## Model data

`scenes.json` menjadi satu-satunya sumber kebenaran, dan `build_scenes.py` dipensiunkan setelah editor jadi. Bentuk datanya sudah ada; yang ditambah hanya `id` tetap per elemen agar seleksi dan undo stabil.

Satu scene memuat: `img` atau `bg` (gambar atau tekstur), `start`, `title`, `vo` (kutipan narasi), `cam` (kamera awal dan akhir), `trans` (transisi masuk), dan daftar `beats` (elemen). Aturannya:

- Akhir scene = awal scene berikutnya, jadi menggeser satu batas menggeser tetangganya.
- Waktu dalam detik; frame = detik × 30. Posisi dalam persen frame.
- Elemen dengan `slot` yang sama saling menggantikan. Timeline menampilkan satu lane per slot, sehingga "apa yang terlihat pada detik X" bisa dibaca langsung.

Elemen punya `k` (jenis), `t` (waktu), dan field sesuai jenisnya. Satu file skema memuat daftar field ini; panel properti dibuat otomatis darinya dan `Scene.tsx` memakai skema yang sama, jadi keduanya tidak bisa berbeda.

| Jenis | Jumlah kini | Field khusus |
| --- | --- | --- |
| strip | 104 | text, x, y, rot, size, slot |
| ransom | 21 | text, x, y, rot, size, slot |
| stamp | 15 | text, x, y, rot, size, color, slot |
| label | 12 | text, x, y, rot, size, anchored |
| x | 8 | x, y, size, anchored |
| arrow | 8 | x, y, x2, y2, bend, color, dur, anchored |
| tag | 7 | text, x, y, rot, size, color |
| ripple | 5 | x, y, size, color, anchored |
| pin | 4 | text, x, y, anchored |
| circle | 2 | x, y, w, h, anchored |
| splat | 1 | x, y, size, color |
| run7 | 1 | x1, y1, x2, y2, t2 |
| embers | 1 | dur |
| type | 1 | text, x, y, size |
| crack | 1 | x, y |

## Pratinjau dan sinkron waktu

Preview memakai komponen `Video` yang sama dengan render, lewat `@remotion/player`, jadi kamera, gerak stop-motion, dan transisi robek identik dengan hasil akhir. `@remotion/player` sudah ikut terpasang bersama Remotion 4.0.545; tinggal dicatat di `package.json`.

- **Data lewat props.** `Video` kini membaca `scenes.json` langsung; ia diubah menerima `scenes` sebagai props. Editor mengirim state terbaru, sehingga perubahan tampak seketika tanpa memuat ulang.
- **Satu sumber waktu.** Playhead mengikuti VO yang diputar Player. Waveform dihitung di browser dari `vo.mp3` (Web Audio), tanpa ffmpeg.
- **Tempel ke kata.** Track kata menampilkan 741 kata dari `words.json`. Elemen yang digeser menempel ke awal kata dikurangi 0,06 s, aturan yang dipakai sekarang; tahan Alt untuk bebas. Klik sebuah kata untuk melompat ke waktunya.
- **Mode preview.** Penuh, Ringan (tanpa grain, debu, dan vignette), dan resolusi 50% untuk komputer yang berat.

Yang bisa beda dari render: filter distorsi SVG pada stempel dan grain lebih berat di browser. Karena itu ada tombol "Render 5 detik" yang memberi hasil pasti di sekitar playhead.

## Fitur per tahap

MVP cukup untuk menggantikan seluruh pekerjaan di `build_scenes.py` yang sekarang dilakukan lewat kode: mengatur ulang waktu, teks, dan posisi. Menambah elemen dan scene baru menyusul di versi 2.

| Tahap | Fitur |
| --- | --- |
| MVP | Preview dengan VO; timeline (waveform, kata, scene, lane elemen); pilih, geser waktu, dan potong batas scene; panel properti; drag posisi di preview; simpan otomatis; undo dan redo; panel render |
| Versi 2 | Tambah, hapus, duplikat elemen dari palet 15 jenis; ganti gambar scene dari panel aset (36 gambar, bisa unggah baru); edit kamera dengan menggeser kotak bingkai di atas gambar; pilih transisi; pisah, gabung, dan tambah scene; pilih ganda dan geser dengan tombol panah |
| Nanti | Ganti VO dan impor transkrip baru; elemen terikat kata yang ikut bergeser saat transkrip berubah; antrean render 4K; preset gaya (warna, font); penanda di timeline |

## Arsitektur teknis

Editor adalah aplikasi web lokal yang memakai komponen render yang sama dengan video, sehingga preview tidak bisa menyimpang dari hasil akhir.

&#91;embedded content: arsitektur editor · 3 lapis\]

- **Browser:** Vite, React 18, TypeScript, dan `@remotion/player` 4.0.545 (versi yang sama dengan render). Timeline digambar sendiri dengan DOM dan canvas, tanpa pustaka editor video.
- **Server:** satu skrip Node (plugin Vite) dengan endpoint kecil: baca dan simpan `scenes.json`, cadangan, daftar dan unggah gambar, serta menjalankan render dengan progres lewat SSE.
- **Berkas baru:** `editor/` (aplikasi), `server/editor-server.mjs`, `src/schema/beats.ts` (skema bersama). Menu `RENDER.bat` mendapat pilihan "Editor".
- **Hanya dibaca:** `vo.mp3` untuk waveform dan `words.json` untuk track kata.

## Risiko dan keputusan terbuka

| Risiko | Penanganan |
| --- | --- |
| Preview patah-patah karena filter SVG dan grain berat di browser | Mode Ringan dan resolusi 50%; tombol "Render 5 detik" untuk hasil pasti |
| Form properti dan `Scene.tsx` saling berbeda seiring waktu | Satu file skema jenis elemen dipakai keduanya |
| Salah simpan menimpa pekerjaan | Cadangan otomatis 20 versi terakhir `scenes.json` sebelum setiap simpan, plus undo |
| Layar kecil membuat 4 area terasa sempit | Panel bisa dilipat; timeline bisa diperbesar penuh |
| Remotion Studio sebenarnya sudah punya timeline | Tidak dipakai: ia hanya menampilkan sequence, tidak bisa mengedit elemen per kata dan posisi |

Keputusan yang perlu jawaban Anda (default saya di depan):

1. Berjalan lokal di komputer Anda, bukan online. Render butuh Chrome dan komputer Anda sendiri.
2. Elemen disimpan sebagai waktu saja, bukan terikat kata. Lebih sederhana; terikat kata masuk daftar "Nanti".
3. Mulai dari MVP dulu, lalu versi 2 setelah Anda mencobanya.
4. Antarmuka berbahasa Indonesia.

## Rencana bangun bertahap

Setiap tahap berakhir dengan sesuatu yang bisa Anda coba, dan saya berhenti di situ sebelum lanjut. Tahap 0 sampai 3 adalah MVP; perkiraan kasar saya dua sampai tiga sesi kerja sepanjang sesi ini.

| Tahap | Isi | Yang bisa dicoba | Ukuran |
| --- | --- | --- | --- |
| 0 Persiapan | `Video` menerima `scenes` lewat props; skema jenis elemen bersama; `id` per elemen; `@remotion/player` dicatat di `package.json` | Render biasa menghasilkan video yang sama persis | Kecil |
| 1 Kerangka | Server lokal dan halaman editor; Player dengan VO; timeline baca-saja (waveform, kata, scene, lane) | Putar video di browser, klik scene dan elemen | Sedang |
| 2 Mengedit | Geser elemen dan batas scene; panel properti dari skema; drag posisi di preview; simpan otomatis, cadangan, undo | Geser satu teks, tutup, buka lagi: perubahan tetap | Besar |
| 3 Render | Panel render (cek, scene terpilih, 5 detik, penuh) dengan progres, memakai `scripts/menu.mjs` | Render 5 detik dari editor sama dengan preview | Kecil |
| 4 Versi 2 | Fitur versi 2 dari tabel di atas, satu per satu | Per fitur | Besar |

---

## Addendum — Keputusan 20 Nov 2026: Umum Multi-Episode

Keputusan Richard (20 Nov 2026): editor ini **tidak khusus E01**. Mesin render dan editor dipakai bersama oleh semua episode seri; yang berganti per episode hanya datanya.

Konsekuensi untuk Tahap 0:

- Struktur folder per episode: `episodes/e01/`, `episodes/e02/`, dst. Tiap episode membawa `scenes.json`, `words.json`, `vo.mp3`, dan folder gambarnya sendiri, mengikuti skema yang sama persis dengan E01.
- Editor memiliki **pemilih episode**; id Composition dan nama file hasil render menjadi parameter dari episode yang dipilih, bukan lagi tulisan mati `"E01"`.
- E01 menjadi episode pertama yang terdaftar (manifes: `episodes/e01/episode.json`). Pada commit awal, kode render E01 yang sudah bekerja dipertahankan apa adanya di akar repo; pengangkatan `src/` menjadi mesin bersama dan pemuatan data per episode dikerjakan sebagai bagian Tahap 0, dengan syarat render E01 menghasilkan video yang sama persis sebelum dan sesudah refactor.
- Nama repo: Richard memutuskan 20 Nov 2026 nama repo tetap `editor-timeline-e01` (nama tidak diubah; isinya tetap berlaku umum multi-episode).
