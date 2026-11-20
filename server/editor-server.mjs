// Server editor — plugin Vite dengan endpoint kecil (Tahap 1).
//
// Endpoint:
//   GET  /api/episodes            -> daftar episode dari episodes/*/episode.json
//   GET  /api/episode/:id/data    -> {episode, data (scenes), words (ternormalisasi)}
//   POST /api/episode/:id/save    -> simpan scenes.json (Tahap 2); sebelum menulis,
//                                    salinan lama masuk backups/<id>/ (20 versi terakhir)
//   POST /api/render              -> mulai render (Tahap 3) lewat scripts/menu.mjs
//   GET  /api/render/status       -> status + ekor log render
//   GET  /api/render/events       -> SSE: aliran log render
//
// Normalisasi kata: file transkrip per kata punya DUA format di proyek ini —
// format editor (list datar {w, s, e}) dan format hasil Groq/Whisper mentah
// (dict {words: [{word, start, end}]}). Keduanya diterima dan selalu
// dikembalikan sebagai list datar {w, s, e} terurut waktu.
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

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

const MAX_BACKUPS = 20;

export function saveEpisodeData(root, id, data) {
  const manifest = listEpisodes(root).find((e) => e.id === id);
  if (!manifest) return null;
  if (!data || !Array.isArray(data.scenes) || typeof data.total !== 'number') {
    throw new Error('data tidak sah: harus ada scenes[] dan total');
  }
  const target = path.join(root, manifest.data.scenes);
  let backup = null;
  if (fs.existsSync(target)) {
    const dir = path.join(root, 'backups', id);
    fs.mkdirSync(dir, {recursive: true});
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backup = path.join(dir, `scenes-${stamp}.json`);
    fs.copyFileSync(target, backup);
    const olds = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('scenes-') && f.endsWith('.json'))
      .sort();
    while (olds.length > MAX_BACKUPS) fs.unlinkSync(path.join(dir, olds.shift()));
  }
  const tmp = `${target}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 1) + '\n', 'utf8');
  fs.renameSync(tmp, target);
  return {savedAt: new Date().toISOString(), backup};
}

// ---------- render (Tahap 3) ----------
const renderJob = {
  running: false,
  mode: null,
  label: '',
  startedAt: null,
  exitCode: null,
  log: [],
};

function pushLog(line) {
  renderJob.log.push(line);
  if (renderJob.log.length > 300) renderJob.log.splice(0, renderJob.log.length - 300);
}

export function startRender(root, manifest, opts) {
  if (renderJob.running) throw new Error('render lain sedang berjalan');
  const data = JSON.parse(fs.readFileSync(path.join(root, manifest.data.scenes), 'utf8'));
  let args;
  let label;
  if (opts.mode === 'cek') {
    args = ['cek'];
    label = 'Cek 60 detik (540p)';
  } else if (opts.mode === 'penuh') {
    args = ['penuh'];
    label = 'Film penuh';
  } else if (opts.mode === 'scene') {
    const s = data.scenes.find((x) => x.n === opts.sceneN);
    if (!s) throw new Error(`scene ${opts.sceneN} tidak ditemukan`);
    args = ['rentang', String(s.start), String(s.end)];
    label = `Scene ${s.n}: ${s.title}`;
  } else if (opts.mode === 'sekitar') {
    const at = Number(opts.at) || 0;
    const a = Math.max(0, at - 2.5);
    const b = Math.min(data.total, at + 2.5);
    args = ['rentang', String(a), String(b)];
    label = `Sekitar playhead ${a.toFixed(1)}–${b.toFixed(1)} dtk`;
  } else {
    throw new Error(`mode render tidak dikenal: ${opts.mode}`);
  }
  renderJob.running = true;
  renderJob.mode = opts.mode;
  renderJob.label = label;
  renderJob.startedAt = new Date().toISOString();
  renderJob.exitCode = null;
  renderJob.log = [];
  pushLog(`> node scripts/menu.mjs ${args.join(' ')}  (${label})`);
  const child = spawn(process.execPath, [path.join(root, 'scripts', 'menu.mjs'), ...args], {
    cwd: root,
    env: process.env,
  });
  const onData = (buf) => {
    for (const line of String(buf).split(/\r?\n/)) if (line.trim()) pushLog(line);
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('error', (err) => {
    pushLog(`gagal menjalankan render: ${err.message}`);
    renderJob.running = false;
    renderJob.exitCode = -1;
  });
  child.on('close', (code) => {
    renderJob.running = false;
    renderJob.exitCode = code;
    pushLog(code === 0 ? '> render selesai — hasil di folder hasil/' : `> render berhenti dengan kode ${code}`);
  });
  return {label};
}

const readBody = (req) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const json = (res, status, body) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
};

export function editorServerPlugin(root) {
  return {
    name: 'editor-server',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
          const s = req.url.match(/^\/api\/episode\/([\w-]+)\/save$/);
          if (req.method === 'POST' && s) {
            const body = await readBody(req);
            const result = saveEpisodeData(root, s[1], body.data);
            if (!result) return json(res, 404, {error: `episode ${s[1]} tidak ditemukan`});
            return json(res, 200, result);
          }
          if (req.method === 'POST' && req.url === '/api/render') {
            const body = await readBody(req);
            const manifest = listEpisodes(root).find((e) => e.id === body.episodeId);
            if (!manifest) return json(res, 404, {error: `episode ${body.episodeId} tidak ditemukan`});
            if (renderJob.running) return json(res, 409, {error: 'render lain sedang berjalan'});
            const started = startRender(root, manifest, body);
            return json(res, 200, {ok: true, ...started});
          }
          if (req.method === 'GET' && req.url === '/api/render/status') {
            return json(res, 200, {
              running: renderJob.running,
              mode: renderJob.mode,
              label: renderJob.label,
              startedAt: renderJob.startedAt,
              exitCode: renderJob.exitCode,
              log: renderJob.log.slice(-80),
            });
          }
          if (req.method === 'GET' && req.url === '/api/render/events') {
            res.writeHead(200, {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            });
            let sent = 0;
            const tick = () => {
              while (sent < renderJob.log.length) {
                res.write(`data: ${JSON.stringify({line: renderJob.log[sent]})}\n\n`);
                sent++;
              }
              res.write(`data: ${JSON.stringify({state: {running: renderJob.running, exitCode: renderJob.exitCode, label: renderJob.label}})}\n\n`);
            };
            tick();
            const iv = setInterval(tick, 600);
            req.on('close', () => clearInterval(iv));
            return;
          }
          return json(res, 404, {error: 'endpoint tidak dikenal'});
        } catch (err) {
          return json(res, 500, {error: String(err && err.message ? err.message : err)});
        }
      });
    },
  };
}
