// Alat render E01 — cek gambar, pasang dependensi, lalu render.
// Pakai: node scripts/menu.mjs            (menu interaktif)
//        node scripts/menu.mjs cek        (60 detik pertama, 540p)
//        node scripts/menu.mjs penuh      (1080p)    | 4k (3840x2160)
//        node scripts/menu.mjs rentang 30 90   (detik 30–90, 1080p)
//        node scripts/menu.mjs editor          (editor timeline di localhost:5173)
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline/promises';
import {spawnSync} from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const FPS = 30;
const q = (s) => `"${s}"`;
const run = (cmd) => spawnSync(cmd, {stdio: 'inherit', shell: true, cwd: root}).status === 0;
const die = (m) => { console.error('\n✗ ' + m + '\n'); process.exit(1); };

// 1. Node
const major = Number(process.versions.node.split('.')[0]);
const minor = Number(process.versions.node.split('.')[1]);
if (major < 20 || (major === 20 && minor < 11)) die(`Node.js ${process.versions.node} terlalu lama. Pasang versi 20.11 ke atas (disarankan LTS) dari https://nodejs.org`);

// 2. Dependensi
if (!fs.existsSync(path.join(root, 'node_modules', 'remotion'))) {
  console.log('→ Memasang dependensi (sekali saja, butuh internet)...');
  if (!run('npm install')) die('npm install gagal.');
}

// 3. Gambar: salin dari folder "gambar" (semua file campur dalam satu folder)
const salin = (dir, re, dest) => {
  if (!fs.existsSync(dir)) return 0;
  fs.mkdirSync(dest, {recursive: true});
  let n = 0;
  for (const f of fs.readdirSync(dir)) {
    if (!re.test(f)) continue;
    fs.copyFileSync(path.join(dir, f), path.join(dest, f.toLowerCase()));
    n++;
  }
  return n;
};
const gambar = path.join(root, 'gambar');
const a = salin(gambar, /^\d{2}\.(png|jpe?g|webp)$/i, path.join(root, 'public/scenes'));
const b = salin(gambar, /^t\d\.(png|jpe?g|webp)$/i, path.join(root, 'public/textures'));
if (a + b) console.log(`→ Gambar disalin dari folder "gambar": ${a} scene, ${b} tekstur`);

// 4. Validasi kelengkapan gambar
const data = JSON.parse(fs.readFileSync(path.join(root, 'src/data/scenes.json'), 'utf8'));
const needImg = [...new Set(data.scenes.map((s) => s.img).filter(Boolean))].sort();
const needTex = [...new Set(data.scenes.map((s) => s.bg).filter(Boolean))].sort();
const have = (dir) => new Set(fs.existsSync(dir) ? fs.readdirSync(dir).map((f) => path.basename(f, path.extname(f)).toLowerCase()) : []);
const hi = have(path.join(root, 'public/scenes')), ht = have(path.join(root, 'public/textures'));
const miss = [...needImg.filter((x) => !hi.has(x)).map((x) => x + '.png'), ...needTex.filter((x) => !ht.has(x)).map((x) => x + '.png')];
if (miss.length) die(`Gambar belum lengkap. Taruh file ini di folder "gambar" (di samping package.json):\n  ${miss.join(', ')}`);
if (!run('node scripts/scan-assets.mjs')) die('Gagal memindai aset.');

// 5. Render
const TOTAL = Math.round(data.total * FPS) + 0; // jumlah frame sesuai composition
const extra = process.env.REMOTION_EXTRA || '';
const render = (nama, {scale = 1, crf = 22, from = 0, to = null} = {}) => {
  fs.mkdirSync(path.join(root, 'hasil'), {recursive: true});
  const out = path.join(root, 'hasil', nama);
  const frames = to === null && from === 0 ? '' : `--frames=${from}-${to}`;
  const cmd = `npx remotion render src/index.ts E01 ${q(out)} --codec=h264 --crf=${crf} --scale=${scale} ${frames} ${extra}`;
  console.log(`\n→ Merender ${nama} ... (jangan tutup jendela ini)\n`);
  const t0 = Date.now();
  if (!run(cmd)) die('Render gagal. Salin pesan error di atas dan kirim ke Claude.');
  console.log(`\n✓ Selesai dalam ${((Date.now() - t0) / 60000).toFixed(1)} menit\n  ${out}\n`);
};
const sec = (s) => Math.max(0, Math.round(Number(s) * FPS));

const jalankan = (mode, x, y) => {
  if (mode === 'editor') {
    console.log('\n→ Menjalankan editor timeline di http://localhost:5173 (Ctrl+C untuk berhenti)\n');
    if (!run('npm run editor')) die('Editor gagal dijalankan.');
    return;
  }
  if (mode === 'cek') return render('E01_cek_540p.mp4', {scale: 0.5, crf: 28, from: 0, to: 60 * FPS - 1});
  if (mode === 'penuh') return render('E01_1080p.mp4');
  if (mode === '4k') return render('E01_4K.mp4', {scale: 2});
  if (mode === 'rentang') {
    const f = sec(x), t = Math.min(TOTAL - 1, sec(y) - 1);
    if (!(t > f)) die('Rentang detik tidak valid.');
    return render(`E01_${x}-${y}s_1080p.mp4`, {from: f, to: t});
  }
  die('Mode tidak dikenal: ' + mode);
};

const [, , mode, x, y] = process.argv;
if (mode) jalankan(mode, x, y);
else {
  console.log(`\nE01 — Negeri yang Tak Pernah Dijajah   (${(data.total / 60).toFixed(1)} menit, ${os.cpus().length} core CPU)\n`);
  console.log('  1) Cek cepat   — 60 detik pertama, 540p');
  console.log('  2) Video penuh — 1080p');
  console.log('  3) Video penuh — 4K (3840×2160, jauh lebih lama)');
  console.log('  4) Potongan tertentu — pilih detik awal & akhir, 1080p');
  console.log('  5) Editor timeline — buka editor di browser (localhost:5173)\n');
  const rl = readline.createInterface({input: process.stdin, output: process.stdout});
  const pil = (await rl.question('Pilih 1-5: ')).trim();
  if (pil === '5') jalankan('editor');
  else if (pil === '1') jalankan('cek');
  else if (pil === '2') jalankan('penuh');
  else if (pil === '3') jalankan('4k');
  else if (pil === '4') {
    const aw = await rl.question('Detik awal: '), ak = await rl.question('Detik akhir: ');
    jalankan('rentang', aw, ak);
  } else die('Pilihan tidak valid.');
  rl.close();
}
