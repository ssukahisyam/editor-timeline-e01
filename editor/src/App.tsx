import React from 'react';
import {Player, type PlayerRef} from '@remotion/player';
import {Video} from '../../src/Video';
import type {Beat, Data, SceneT} from '../../src/types';
import {Timeline, fmt, type DragPhase, type Selection, type Word} from './timeline';
import {BeatPanel, ScenePanel, type EditPhase} from './panel';

const FPS = 30;

interface EpisodeManifest {
  id: string;
  code: string;
  title: string;
  totalSeconds: number;
  sceneCount: number;
  data: {scenes: string; words: string; vo: string; images: string};
}

const TEXT_KINDS = new Set(['strip', 'ransom', 'stamp', 'type']);

function activeBeats(scene: SceneT, time: number): Beat[] {
  const sorted = [...scene.beats].sort((a, b) => a.t - b.t);
  const out = new Map<string, number>();
  const bySlot: Record<string, Beat[]> = {};
  sorted.forEach((b) => {
    if (TEXT_KINDS.has(b.k)) (bySlot[b.slot || 'main'] ||= []).push(b);
  });
  Object.values(bySlot).forEach((arr) => arr.forEach((b, i) => arr[i + 1] && out.set(b.id, arr[i + 1].t)));
  return sorted.filter((b) => {
    if (time < b.t || time > scene.end) return false;
    const o = out.get(b.id);
    if (o !== undefined && time > o + 0.2) return false;
    return typeof b.x === 'number' && typeof b.y === 'number';
  });
}

const clone = (d: Data): Data => JSON.parse(JSON.stringify(d)) as Data;

export const App: React.FC = () => {
  const [episodes, setEpisodes] = React.useState<EpisodeManifest[]>([]);
  const [episode, setEpisode] = React.useState<EpisodeManifest | null>(null);
  const [words, setWords] = React.useState<Word[]>([]);
  const [data, setData] = React.useState<Data | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saveState, setSaveState] = React.useState<string>('—');
  const [frame, setFrame] = React.useState(0);
  const [selection, setSelection] = React.useState<Selection>(null);
  const [loopScene, setLoopScene] = React.useState(false);
  const [dragMode, setDragMode] = React.useState(false);
  const [px, setPx] = React.useState(5);
  const [, setHistTick] = React.useState(0);

  const [renderLog, setRenderLog] = React.useState<string[]>([]);
  const [renderRunning, setRenderRunning] = React.useState(false);
  const [renderLabel, setRenderLabel] = React.useState('');
  const esRef = React.useRef<EventSource | null>(null);

  const playerRef = React.useRef<PlayerRef>(null);
  const dataRef = React.useRef<Data | null>(null);
  dataRef.current = data;
  const pastRef = React.useRef<Data[]>([]);
  const futureRef = React.useRef<Data[]>([]);
  const snapshotRef = React.useRef<Data | null>(null);
  const skipSaveRef = React.useRef(true);
  const saveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ---------- muat ----------
  const loadEpisode = React.useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/episode/${id}/data`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = (await res.json()) as {episode: EpisodeManifest; data: Data; words: Word[]};
      skipSaveRef.current = true;
      setEpisode(body.episode);
      setWords(body.words);
      setData(body.data);
      pastRef.current = [];
      futureRef.current = [];
      snapshotRef.current = null;
      setHistTick((v) => v + 1);
      setSelection(null);
      setFrame(0);
      setSaveState('—');
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

  // ---------- simpan otomatis ----------
  React.useEffect(() => {
    if (!data || !episode) return;
    if (skipSaveRef.current) {
      skipSaveRef.current = false;
      return;
    }
    setSaveState('Menyimpan…');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/episode/${episode.id}/save`, {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({data}),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const r = (await res.json()) as {savedAt: string};
        setSaveState(`Tersimpan ${new Date(r.savedAt).toLocaleTimeString('id-ID')}`);
      } catch (e) {
        setSaveState(`Gagal menyimpan: ${String(e)}`);
      }
    }, 700);
  }, [data, episode]);

  // ---------- riwayat (undo/redo) ----------
  const beginEdit = React.useCallback(() => {
    if (!snapshotRef.current && dataRef.current) snapshotRef.current = clone(dataRef.current);
  }, []);
  const commitEdit = React.useCallback(() => {
    if (snapshotRef.current && dataRef.current && snapshotRef.current !== dataRef.current) {
      if (JSON.stringify(snapshotRef.current) !== JSON.stringify(dataRef.current)) {
        pastRef.current.push(snapshotRef.current);
        if (pastRef.current.length > 100) pastRef.current.shift();
        futureRef.current = [];
        setHistTick((v) => v + 1);
      }
    }
    snapshotRef.current = null;
  }, []);
  const undo = React.useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev || !dataRef.current) return;
    futureRef.current.push(clone(dataRef.current));
    snapshotRef.current = null;
    setData(prev);
    setHistTick((v) => v + 1);
  }, []);
  const redo = React.useCallback(() => {
    const nxt = futureRef.current.pop();
    if (!nxt || !dataRef.current) return;
    pastRef.current.push(clone(dataRef.current));
    snapshotRef.current = null;
    setData(nxt);
    setHistTick((v) => v + 1);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !inField) {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y' && !inField) {
        e.preventDefault();
        redo();
        return;
      }
      if (e.code === 'Space' && !inField) {
        e.preventDefault();
        playerRef.current?.toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // ---------- perubahan data ----------
  const mutate = React.useCallback((fn: (d: Data) => void) => {
    setData((cur) => {
      if (!cur) return cur;
      const next = clone(cur);
      fn(next);
      return next;
    });
  }, []);

  const findBeat = (d: Data, beatId: string) => {
    for (const s of d.scenes) {
      const b = s.beats.find((x) => x.id === beatId);
      if (b) return {scene: s, beat: b};
    }
    return null;
  };

  const onBeatField = React.useCallback(
    (beatId: string, key: string, value: unknown, phase: EditPhase) => {
      if (phase === 'begin') return beginEdit();
      if (phase === 'commit') return commitEdit();
      mutate((d) => {
        const f = findBeat(d, beatId);
        if (f) (f.beat as unknown as Record<string, unknown>)[key] = value;
      });
    },
    [beginEdit, commitEdit, mutate],
  );

  const onSceneField = React.useCallback(
    (sceneN: number, key: string, value: unknown, phase: EditPhase) => {
      if (phase === 'begin') return beginEdit();
      if (phase === 'commit') return commitEdit();
      mutate((d) => {
        const s = d.scenes.find((x) => x.n === sceneN);
        if (s) (s as unknown as Record<string, unknown>)[key] = value;
      });
    },
    [beginEdit, commitEdit, mutate],
  );

  const onBeatTime = React.useCallback(
    (scene: SceneT, beat: Beat, t: number, phase: DragPhase) => {
      if (phase === 'start') return beginEdit();
      if (phase === 'end') return commitEdit();
      mutate((d) => {
        const f = findBeat(d, beat.id);
        if (f) f.beat.t = t;
      });
    },
    [beginEdit, commitEdit, mutate],
  );

  const onSceneBoundary = React.useCallback(
    (index: number, t: number, phase: DragPhase) => {
      if (phase === 'start') return beginEdit();
      if (phase === 'end') return commitEdit();
      mutate((d) => {
        if (d.scenes[index] && d.scenes[index + 1]) {
          d.scenes[index].end = t;
          d.scenes[index + 1].start = t;
        }
      });
    },
    [beginEdit, commitEdit, mutate],
  );

  // ---------- putar ----------
  const currentTime = frame / FPS;
  const selectedScene: SceneT | null = React.useMemo(() => {
    if (!data || !selection) return null;
    if (selection.type === 'scene') return data.scenes.find((s) => s.n === selection.sceneN) || null;
    for (const s of data.scenes) if (s.beats.some((b) => b.id === selection.beatId)) return s;
    return null;
  }, [data, selection]);
  const selectedBeat: Beat | null = React.useMemo(() => {
    if (!data || selection?.type !== 'beat') return null;
    return findBeat(data, selection.beatId)?.beat || null;
  }, [data, selection]);

  React.useEffect(() => {
    if (!loopScene || !selectedScene) return;
    if (currentTime >= selectedScene.end - 0.04 && currentTime > selectedScene.start) {
      playerRef.current?.seekTo(Math.round(selectedScene.start * FPS));
    }
  }, [loopScene, selectedScene, currentTime]);

  const seek = React.useCallback((sec: number) => {
    playerRef.current?.seekTo(Math.max(0, Math.round(sec * FPS)));
  }, []);

  // ---------- render (Tahap 3) ----------
  const attachRenderStream = React.useCallback(() => {
    if (esRef.current) esRef.current.close();
    const es = new EventSource('/api/render/events');
    esRef.current = es;
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data) as {line?: string; state?: {running: boolean; label: string}};
        if (msg.line) setRenderLog((l) => [...l.slice(-120), msg.line!]);
        if (msg.state) {
          setRenderRunning(msg.state.running);
          setRenderLabel(msg.state.label || '');
          if (!msg.state.running) es.close();
        }
      } catch {
        /* abaikan */
      }
    };
    es.onerror = () => {
      /* status tetap bisa dicek lewat tombol render berikutnya */
    };
  }, []);

  React.useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/render/status');
        const st = (await res.json()) as {running: boolean; label: string; log: string[]};
        setRenderLog(st.log || []);
        setRenderLabel(st.label || '');
        setRenderRunning(st.running);
        if (st.running) attachRenderStream();
      } catch {
        /* server render belum siap */
      }
    })();
  }, [attachRenderStream]);

  const startRender = async (mode: string) => {
    if (!episode) return;
    setRenderLog([]);
    try {
      const res = await fetch('/api/render', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({episodeId: episode.id, mode, sceneN: selectedScene?.n, at: currentTime}),
      });
      const body = (await res.json()) as {error?: string; label?: string};
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      setRenderRunning(true);
      setRenderLabel(body.label || mode);
      attachRenderStream();
    } catch (e) {
      setRenderLog([`Gagal memulai render: ${String(e)}`]);
    }
  };

  const inputProps = React.useMemo(() => {
    if (!episode || !data) return null;
    const voFile = episode.data.vo.split('/').pop() || 'vo.mp3';
    return {data, voFile};
  }, [episode, data]);

  const beatCount = data ? data.scenes.reduce((a, s) => a + s.beats.length, 0) : 0;
  const currentScene = data ? data.scenes.find((s) => currentTime >= s.start && currentTime < s.end) || data.scenes[data.scenes.length - 1] : null;
  const overlayBeats = currentScene && dragMode ? activeBeats(currentScene, currentTime) : [];

  const startPosDrag = (e: React.PointerEvent, beat: Beat) => {
    if (!currentScene) return;
    e.preventDefault();
    e.stopPropagation();
    setSelection({type: 'beat', beatId: beat.id});
    const wrap = (e.currentTarget as HTMLElement).closest('.preview-wrap') as HTMLElement;
    const rect = wrap.getBoundingClientRect();
    const orig = {...beat};
    beginEdit();
    const move = (ev: PointerEvent) => {
      const dx = ((ev.clientX - e.clientX) / rect.width) * 100;
      const dy = ((ev.clientY - e.clientY) / rect.height) * 100;
      const r1 = (v: number) => Math.round(Math.min(100, Math.max(0, v)) * 10) / 10;
      mutate((d) => {
        const f = findBeat(d, beat.id);
        if (!f) return;
        if (typeof orig.x === 'number' && typeof orig.y === 'number') {
          const nx = r1(orig.x + dx);
          const ny = r1(orig.y + dy);
          if (f.beat.k === 'arrow' && typeof orig.x2 === 'number' && typeof orig.y2 === 'number') {
            f.beat.x2 = r1(orig.x2 + dx);
            f.beat.y2 = r1(orig.y2 + dy);
          }
          f.beat.x = nx;
          f.beat.y = ny;
        }
      });
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      commitEdit();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">Editor Timeline Sirah</div>
        <label>
          Episode{' '}
          <select value={episode?.id || ''} onChange={(e) => loadEpisode(e.target.value)} disabled={!episodes.length}>
            {episodes.map((ep) => (
              <option key={ep.id} value={ep.id}>
                {ep.code} — {ep.title}
              </option>
            ))}
          </select>
        </label>
        {data && (
          <div className="stats">
            {data.scenes.length} scene · {beatCount} elemen · {words.length} kata · {fmt(data.total)}
          </div>
        )}
        <div className="spacer" />
        <div className="savestate">{saveState}</div>
        <button onClick={undo} disabled={!pastRef.current.length} title="Ctrl+Z">
          ↩ Undo
        </button>
        <button onClick={redo} disabled={!futureRef.current.length} title="Ctrl+Shift+Z">
          ↪ Redo
        </button>
        <div className="timecode">
          {fmt(currentTime)} <span className="dim">/ {data ? fmt(data.total) : '–'}</span>
        </div>
        <label className="chk">
          <input type="checkbox" checked={loopScene} onChange={(e) => setLoopScene(e.target.checked)} disabled={!selectedScene} /> Loop scene
        </label>
        <label className="chk">
          <input type="checkbox" checked={dragMode} onChange={(e) => setDragMode(e.target.checked)} /> Drag posisi
        </label>
        <label>
          Zoom <input type="range" min={2} max={24} step={1} value={px} onChange={(e) => setPx(Number(e.target.value))} />
        </label>
      </header>

      {error && <div className="error">{error}</div>}

      <div className="main">
        <div className="preview">
          {episode && data && inputProps ? (
            <div className="preview-wrap">
              <Player
                component={Video}
                inputProps={inputProps}
                durationInFrames={Math.ceil(data.total * FPS)}
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
              {dragMode && (
                <div className="overlay">
                  {overlayBeats.map((b) => (
                    <div
                      key={b.id}
                      className={`ov-beat ${selection?.type === 'beat' && selection.beatId === b.id ? 'sel' : ''}`}
                      style={{
                        left: `${b.x}%`,
                        top: `${b.y}%`,
                        width: Math.max(54, Math.min(240, (b.size || 40) * 1.7)),
                        height: 30,
                      }}
                      title={`${b.id} · ${b.k}${b.text ? ` · ${b.text}` : ''}${b.anchored ? ' · anchored (posisi mengikuti kamera — perkiraan)' : ''}`}
                      onPointerDown={(e) => startPosDrag(e, b)}
                    >
                      <span>{b.text || b.k}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="loading">Memuat episode…</div>
          )}
          <div className="hint">
            Spasi = putar/jeda · Seret elemen di timeline untuk mengubah waktunya (tempel ke kata −0,06 dtk, tahan Alt untuk bebas) · Seret tepi kanan scene
            untuk mengubah batasnya · Aktifkan “Drag posisi” untuk menggeser elemen langsung di preview.
          </div>
        </div>
        <aside className="panel">
          {!selection && (
            <div>
              <h2>Info pilihan</h2>
              <p className="dim">Belum ada yang dipilih. Klik scene atau elemen di timeline{dragMode ? ' atau di preview' : ''}.</p>
            </div>
          )}
          {selection?.type === 'scene' && selectedScene && <ScenePanel scene={selectedScene} onField={onSceneField} />}
          {selection?.type === 'beat' && selectedBeat && selectedScene && <BeatPanel scene={selectedScene} beat={selectedBeat} onField={onBeatField} />}
          <p className="dim tahap">Tahap 2: mengedit aktif — perubahan tersimpan otomatis (cadangan 20 versi terakhir di folder backups/).</p>
          <div className="renderbox">
            <h2>Render</h2>
            <div className="renderbtns">
              <button onClick={() => startRender('sekitar')} disabled={renderRunning}>
                ±5 dtk di playhead
              </button>
              <button onClick={() => startRender('scene')} disabled={renderRunning || !selectedScene}>
                Scene terpilih
              </button>
              <button onClick={() => startRender('cek')} disabled={renderRunning}>
                Cek 60 dtk (540p)
              </button>
              <button onClick={() => startRender('penuh')} disabled={renderRunning}>
                Film penuh
              </button>
            </div>
            <div className="dim">{renderRunning ? `Sedang merender: ${renderLabel}…` : renderLabel ? `Terakhir: ${renderLabel}` : 'Hasil masuk ke folder hasil/'}</div>
            {renderLog.length > 0 && <pre className="renderlog">{renderLog.slice(-30).join('\n')}</pre>}
          </div>
        </aside>
      </div>

      {episode && data && (
        <Timeline
          data={data}
          words={words}
          voUrl={`/${episode.data.vo.split('/').pop()}`}
          px={px}
          currentTime={currentTime}
          selection={selection}
          onSeek={seek}
          onSelect={setSelection}
          onBeatTime={onBeatTime}
          onSceneBoundary={onSceneBoundary}
        />
      )}
    </div>
  );
};
