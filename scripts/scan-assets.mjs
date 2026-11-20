// Memindai public/scenes dan public/textures, menulis src/data/assets.json
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname, '..');
const exts = ['.png', '.jpg', '.jpeg', '.webp'];
const scan = (dir) => {
  const out = {};
  const abs = path.join(root, 'public', dir);
  if (!fs.existsSync(abs)) return out;
  for (const f of fs.readdirSync(abs)) {
    const ext = path.extname(f).toLowerCase();
    if (!exts.includes(ext)) continue;
    const id = path.basename(f, path.extname(f)).toLowerCase();
    out[id] = `${dir}/${f}`;
  }
  return out;
};
const data = { img: scan('scenes'), tex: scan('textures') };
fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(root, 'src/data/assets.json'), JSON.stringify(data, null, 1));
console.log(`aset: ${Object.keys(data.img).length} gambar scene, ${Object.keys(data.tex).length} tekstur`);
