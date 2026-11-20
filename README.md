# Editor Timeline Sirah

Editor timeline lokal (browser) untuk motion graphic seri Sirah Nabawiyah — **berlaku umum untuk semua episode** (keputusan 20 Nov 2026), bukan hanya E01. Mesin render dan editor dipakai bersama; tiap episode hanya membawa datanya sendiri di `episodes/eXX/`.

Episode pertama yang terdaftar: **E01 — Negeri yang Tak Pernah Dijajah** (Remotion 4.0.545, 44 scene, 191 elemen, 381,5 detik @ 30 fps).

Tujuan editor: mengatur timing, teks, dan posisi elemen langsung dari timeline — tanpa mengedit kode. Rancangan lengkap ada di `Rancangan_Editor_Timeline.md`.

## Struktur

- `src/` — komponen render Remotion (`Video.tsx`, `Scene.tsx`, `Text.tsx`, `Marks.tsx`)
- `src/data/scenes.json` — satu-satunya sumber kebenaran data scene & elemen
- `src/data/words.json` — 741 kata VO dengan timestamp (untuk tempel ke awal kata)
- `scripts/menu.mjs` — menu render (cek 60 detik / penuh 1080p / 4K / rentang)
- `RENDER.bat` / `render.sh` — peluncur render di Windows / Mac-Linux

## Berkas media (tidak masuk repo)

File biner tidak disimpan di repo ini: `public/vo.mp3`, gambar `01.png`–`36.png` dan tekstur `t1.png`–`t3.png` (masuk folder `gambar/` secara lokal, lalu tersalin otomatis oleh `scripts/menu.mjs` ke `public/scenes/` dan `public/textures/`).

## Tahapan pembangunan editor

- Tahap 0 — Persiapan (SELESAI 20 Nov 2026): `Video` menerima `scenes` lewat props, skema elemen bersama, `id` tetap per elemen, `@remotion/player`
- Tahap 1 — Kerangka editor + timeline baca-saja (SELESAI 20 Nov 2026)
- Tahap 2 — Mengedit: geser elemen/batas scene, panel properti, drag di preview, autosave + undo/redo
- Tahap 3 — Panel render dari editor
- Tahap 4 — Versi 2
