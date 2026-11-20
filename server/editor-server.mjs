// Server editor — plugin Vite dengan endpoint kecil (Tahap 1).
//
// Endpoint Tahap 1 (baca-saja):
//   GET /api/episodes            -> daftar episode dari episodes/*/episode.json
//   GET /api/episode/:id/data    -> {episode, data (scenes), words (ternormalisasi)}
//
// Endpoint simpan (Tahap 2) dan render (Tahap 3) akan ditambahkan di file ini.
//
// Normalisasi kata: file transkrip per kata punya DUA format di proyek ini —
// format editor (list datar {w, s, e}) dan format hasil Groq/Whisper mentah
// (dict {words: [{word, start, end}]}). Keduanya diterima dan selalu
// dikembalikan sebagai list datar {w, s, e} terurut waktu.
import fs from 'node:fs';
import path from 'node:path';

export function normalizeWords(raw) {
  const list = Array.isArray(raw) ? raw : raw && Array.isArray(raw.words) ? raw.words : [];
  return list
    .map((w) => ({
      w: w.w ?? w.word ?? '',
      s: Number(w.s ?? w.start ?? 0),
      e: Number(w.e ?? w.end ?? 0),
    }))
    .sort((a, b) => a.s - b.s);
}

export function listEpisodes(root) {
  const dir = path.join(root, 'episodes');
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const name of fs.readdirSync(dir).sort()) {
    const manifestPath = path.join(dir, name, 'episode.json');
    if (!fs.existsSync(manifestPath)) continue;
    try {
      out.push(JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
    } catch {
      // manifes rusak: lewati, jangan jatuhkan server
    }
  }
  return out;
}

export function loadEpisodeData(root, id) {
  const manifest = listEpisodes(root).find((e) => e.id === id);
  if (!manifest) return null;
  const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const data = readJson(manifest.data.scenes);
  const words = normalizeWords(readJson(manifest.data.words));
  return {episode: manifest, data, words};
}

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export function editorServerPlugin(root) {
  return {
    name: 'editor-server',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url || !req.url.startsWith('/api/')) return next();
        try {
          if (req.method === 'GET' && req.url === '/api/episodes') {
            return json(res, 200, listEpisodes(root));
          }
          const m = req.url.match(/^\/api\/episode\/([\w-]+)\/data$/);
          if (req.method === 'GET' && m) {
            const loaded = loadEpisodeData(root, m[1]);
            if (!loaded) return json(res, 404, {error: `episode ${m[1]} tidak ditemukan`});
            return json(res, 200, loaded);
          }
          return json(res, 404, {error: 'endpoint tidak dikenal'});
        } catch (err) {
          return json(res, 500, {error: String(err && err.message ? err.message : err)});
        }
      });
    },
  };
}
