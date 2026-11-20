import React from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {Video} from '../../src/Video';
import {BEAT_SCHEMA, type BeatKind} from '../../src/schema/beats';
import type {Data} from '../../src/types';
import {Timeline, fmt, type Selection, type Word} from './timeline';

const FPS = 30;

interface EpisodeManifest {
  id: string;
  code: string;
  title: string;
  totalSeconds: number;
  sceneCount: number;
  data: {scenes: string; words: string; vo: string; images: string};
}

interface Loaded {
  episode: EpisodeManifest;
  data: Data;
  words: Word[];
}

export const App: React.FC = () => {
  const [episodes, setEpisodes] = React.useState<EpisodeManifest[]>([]);
  const [loaded, setLoaded] = React.useState<Loaded | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [frame, setFrame] = React.useState(0);
  const [selection, setSelection] = React.useState<Selection>(null);
  const [loopScene, setLoopScene] = React.useState(false);
  const [px, setPx] = React.useState(5);
  const playerRef = React.useRef<PlayerRef>(null);

  const loadEpisode = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/episode/${id}/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as Loaded;
      setLoaded(body);
      setSelection(null);
      setFrame(0);
    } catch (e) {
      setError(`Gagal memuat episode ${id}: ${String(e)}`);
    }
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/episodes');
        const list = (await res.json()) as EpisodeManifest[];
        setEpisodes(list);
        if (list.length) await loadEpisode(list[0].id);
      } catch (e) {
        setError(`Gagal memuat daftar episode: ${String(e)}`);
      }
    })();
  }, [loadEpisode]);

  const data = loaded?.data ?? null;
  const currentTime = frame / FPS;
  const selectedScene = selection?.type === 'scene' ? selection.scene : selection?.type === 'beat' ? selection.scene : null;

  // Loop scene terpilih
  React.useEffect(() => {
    if (!loopScene || !selectedScene) return;
    if (currentTime >= selectedScene.end - 0.04 && currentTime > selectedScene.start) {
      playerRef.current?.seekTo(Math.round(selectedScene.start * FPS));
    }
  }, [loopScene, selectedScene, currentTime]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLSelectElement)) {
        e.preventDefault();
        playerRef.current?.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const seek = React.useCallback((sec: number) => {
    playerRef.current?.seekTo(Math.max(0, Math.round(sec * FPS)));
  }, []);

  const inputProps = React.useMemo(() => {
    if (!loaded) return null;
    const voFile = loaded.episode.data.vo.split('/').pop() || 'vo.mp3';
    return {data: loaded.data, voFile};
  }, [loaded]);

  const beatCount = data ? data.scenes.reduce((a, s) => a + s.beats.length, 0) : 0;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Editor Timeline Sirah</div>
        <label>
          Episode{' '}
          <select
            value={loaded?.episode.id || ''}
            onChange={(e) => loadEpisode(e.target.value)}
            disabled={!episodes.length}
          >
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.code} — {ep.title}
              </option>
            ))}
          </select>
        </label>
        {data && (
          <div className="stats">
            {data.scenes.length} scene · {beatCount} elemen · {loaded!.words.length} kata · {fmt(data.total)}
          </div>
        )}
        <div className="spacer" />
        <div className="timecode">
          {fmt(currentTime)} <span className="dim">/ {data ? fmt(data.total) : '–'}</span>
        </div>
        <label className="chk">
          <input type="checkbox" checked={loopScene} onChange={(e) => setLoopScene(e.target.checked)} disabled={!selectedScene} /> Loop scene
        </label>
        <label>
          Zoom{' '}
          <input type="range" min={2} max={24} step={1} value={px} onChange={(e) => setPx(Number(e.target.value))} />
        </label>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="main">
        <div className="preview">
          {loaded && inputProps ? (
            <Player
              component={Video}
              inputProps={inputProps}
              durationInFrames={Math.ceil(loaded.data.total * FPS)}
              fps={FPS}
              compositionWidth={1920}
              compositionHeight={1080}
              controls
              clickToPlay
              acknowledgeRemotionLicense
              style={{width: '100%'}}
              refCallback={(ref) => {
                playerRef.current = ref;
                const r = ref as unknown as {__editorWired?: boolean} | null;
                if (r && !r.__editorWired) {
                  r.__editorWired = true;
                  ref!.addEventListener('timeupdate', (e) => setFrame(e.detail.frame));
                  ref!.addEventListener('seeked', (e) => setFrame(e.detail.frame));
                }
              }}
            />
          ) : (
            <div className="loading">Memuat episode…</div>
          )}
          <div className="hint">Spasi = putar/jeda · Klik scene, elemen, atau kata di timeline untuk melompat ke waktunya.</div>
        </div>
        <aside className="panel">
          <h2>Info pilihan</h2>
          {!selection && <p className="dim">Belum ada yang dipilih. Klik scene atau elemen di timeline.</p>}
          {selection?.type === 'scene' && (
            <dl>
              <dt>Scene</dt>
              <dd>
                {selection.scene.n}. {selection.scene.title}
              </dd>
              <dt>Waktu</dt>
              <dd>
                {fmt(selection.scene.start)} – {fmt(selection.scene.end)} ({(selection.scene.end - selection.scene.start).toFixed(1)} dtk)
              </dd>
              <dt>Gambar / latar</dt>
              <dd>{selection.scene.img || selection.scene.bg || '–'}</dd>
              <dt>Transisi</dt>
              <dd>{selection.scene.trans}</dd>
              <dt>Jumlah elemen</dt>
              <dd>{selection.scene.beats.length}</dd>
              <dt>Narasi</dt>
              <dd className="vo">{selection.scene.vo}</dd>
            </dl>
          )}
          {selection?.type === 'beat' && (
            <dl>
              <dt>Elemen</dt>
              <dd>
                {selection.beat.id} · {BEAT_SCHEMA[selection.beat.k as BeatKind]?.label || selection.beat.k}
              </dd>
              <dt>Scene</dt>
              <dd>
                {selection.scene.n}. {selection.scene.title}
              </dd>
              {selection.beat.text && (
                <>
                  <dt>Teks</dt>
                  <dd>{selection.beat.text}</dd>
                </>
              )}
              <dt>Waktu</dt>
              <dd>{fmt(selection.beat.t)}</dd>
              <dt>Posisi</dt>
              <dd>
                x {selection.beat.x ?? '–'}% · y {selection.beat.y ?? '–'}%
              </dd>
              <dt>Ukuran / slot</dt>
              <dd>
                {selection.beat.size ?? '–'} / {selection.beat.slot || '–'}
              </dd>
            </dl>
          )}
          <p className="dim tahap">Tahap 1: timeline baca-saja. Menggeser & mengubah elemen datang di Tahap 2.</p>
        </aside>
      </div>

      {loaded && data && (
        <Timeline
          data={data}
          words={loaded.words}
          voUrl={`/${loaded.episode.data.vo.split('/').pop()}`}
          px={px}
          currentTime={currentTime}
          selection={selection}
          onSeek={seek}
          onSelect={setSelection}
        />
      )}
    </div>
  );
};
