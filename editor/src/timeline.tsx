import React from 'react';
import type {Beat, Data, SceneT} from '../../src/types';

export interface Word {
  w: string;
  s: number;
  e: number;
}

/** Pilihan disimpan sebagai id/nomor supaya tetap sah setelah data diedit. */
export type Selection = {type: 'scene'; sceneN: number} | {type: 'beat'; beatId: string} | null;

const FPS = 30;
export const fmt = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
};

/** Tempel ke awal kata −0,06 dtk (aturan proyek); ambang 0,35 dtk. */
export function snapToWord(words: Word[], t: number): number {
  let best: number | null = null;
  let bestDist = 0.35;
  for (const w of words) {
    const cand = w.s - 0.06;
    const d = Math.abs(cand - t);
    if (d < bestDist) {
      bestDist = d;
      best = cand;
    }
  }
  return best === null ? t : Math.round(best * 100) / 100;
}

const KIND_COLORS: Record<string, string> = {
  strip: '#c9a86a',
  ransom: '#b3312a',
  stamp: '#7fa3a8',
  label: '#8a9a5b',
  type: '#d9d3c3',
  tag: '#a67c9e',
  pin: '#d97b29',
  arrow: '#4f83cc',
  x: '#cc4444',
  circle: '#4f83cc',
  ripple: '#4f83cc',
  splat: '#cc4444',
  crack: '#888888',
  embers: '#d97b29',
  run7: '#b3312a',
};

export const laneKeyOf = (b: Beat) => (b.slot ? `slot:${b.slot}` : `jenis:${b.k}`);

interface Lane {
  key: string;
  label: string;
  items: {beat: Beat; scene: SceneT; end: number}[];
}

function buildLanes(data: Data): Lane[] {
  const map = new Map<string, Lane>();
  for (const scene of data.scenes) {
    const beats = [...scene.beats].sort((a, b) => a.t - b.t);
    beats.forEach((beat, i) => {
      const key = laneKeyOf(beat);
      const next = beats.slice(i + 1).find((b) => laneKeyOf(b) === key);
      const end = next ? next.t : scene.end;
      if (!map.has(key)) map.set(key, {key, label: key.replace('slot:', 'slot ').replace('jenis:', ''), items: []});
      map.get(key)!.items.push({beat, scene, end});
    });
  }
  return [...map.values()].sort((a, b) => a.items[0].beat.t - b.items[0].beat.t);
}

const Waveform: React.FC<{url: string; total: number; px: number; onSeek: (s: number) => void}> = ({url, total, px, onSeek}) => {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const dataRef = React.useRef<Float32Array | null>(null);
  const [ready, setReady] = React.useState(0);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const res = await fetch(url);
      const buf = await res.arrayBuffer();
      const ctx = new OfflineAudioContext(1, 1, 44100);
      const audio = await ctx.decodeAudioData(buf);
      if (!alive) return;
      dataRef.current = audio.getChannelData(0);
      setReady((v) => v + 1);
    })().catch(() => {});
    return () => {
      alive = false;
    };
  }, [url]);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ch = dataRef.current;
    if (!canvas || !ch) return;
    const width = Math.ceil(total * px);
    const height = 46;
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d')!;
    g.clearRect(0, 0, width, height);
    g.fillStyle = '#6f97a3';
    const perSecond = ch.length / total;
    for (let x = 0; x < width; x++) {
      const t0 = (x / px) * perSecond;
      const t1 = ((x + 1) / px) * perSecond;
      let max = 0;
      const step = Math.max(1, Math.floor((t1 - t0) / 24));
      for (let i = Math.floor(t0); i < t1 && i < ch.length; i += step) {
        const v = Math.abs(ch[i]);
        if (v > max) max = v;
      }
      const h = Math.max(1, max * (height - 4));
      g.fillRect(x, (height - h) / 2, 1, h);
    }
  }, [ready, px, total]);

  return (
    <canvas
      ref={canvasRef}
      className="wave"
      style={{width: total * px, height: 46}}
      onClick={(e) => {
        const r = (e.target as HTMLCanvasElement).getBoundingClientRect();
        onSeek((e.clientX - r.left) / px);
      }}
    />
  );
};

export type DragPhase = 'start' | 'move' | 'end';

interface Props {
  data: Data;
  words: Word[];
  voUrl: string;
  px: number;
  currentTime: number;
  selection: Selection;
  onSeek: (sec: number) => void;
  onSelect: (sel: Selection) => void;
  onBeatTime: (scene: SceneT, beat: Beat, t: number, phase: DragPhase) => void;
  onSceneBoundary: (index: number, t: number, phase: DragPhase) => void;
}

export const Timeline: React.FC<Props> = ({data, words, voUrl, px, currentTime, selection, onSeek, onSelect, onBeatTime, onSceneBoundary}) => {
  const lanes = React.useMemo(() => buildLanes(data), [data]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const draggedRef = React.useRef(false);
  const width = Math.ceil(data.total * px);
  const playX = currentTime * px;

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const viewL = el.scrollLeft;
    const viewR = viewL + el.clientWidth - 140;
    if (playX < viewL + 120 || playX > viewR) el.scrollLeft = Math.max(0, playX - 220);
  }, [playX]);

  const ticks: number[] = [];
  const step = px >= 12 ? 5 : px >= 6 ? 10 : 30;
  for (let t = 0; t <= data.total; t += step) ticks.push(t);

  const seekFromClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, (e.clientX - r.left) / px));
  };

  const startBeatDrag = (e: React.PointerEvent, scene: SceneT, beat: Beat) => {
    if (e.button !== 0) return;
    e.preventDefault();
    onSelect({type: 'beat', beatId: beat.id});
    const startX = e.clientX;
    const origT = beat.t;
    draggedRef.current = false;
    onBeatTime(scene, beat, origT, 'start');
    const move = (ev: PointerEvent) => {
      const raw = origT + (ev.clientX - startX) / px;
      if (Math.abs(ev.clientX - startX) > 3) draggedRef.current = true;
      const snapped = ev.altKey ? raw : snapToWord(words, raw);
      const clamped = Math.min(scene.end - 0.1, Math.max(scene.start, snapped));
      onBeatTime(scene, beat, Math.round(clamped * 100) / 100, 'move');
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onBeatTime(scene, beat, beat.t, 'end');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const startBoundaryDrag = (e: React.PointerEvent, index: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const scene = data.scenes[index];
    const next = data.scenes[index + 1];
    const startX = e.clientX;
    const origT = scene.end;
    onSceneBoundary(index, origT, 'start');
    const move = (ev: PointerEvent) => {
      const raw = origT + (ev.clientX - startX) / px;
      const snapped = ev.altKey ? raw : snapToWord(words, raw);
      const clamped = Math.min(next.end - 0.5, Math.max(scene.start + 0.5, snapped));
      onSceneBoundary(index, Math.round(clamped * 100) / 100, 'move');
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      onSceneBoundary(index, data.scenes[index].end, 'end');
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <div className="timeline" ref={scrollRef}>
      <div className="tl-inner" style={{width: width + 120}}>
        <div className="tl-playhead" style={{left: 120 + playX}} />
        <div className="tl-row tl-ruler">
          <div className="tl-label">Waktu</div>
          <div className="tl-track" onClick={seekFromClick}>
            {ticks.map((t) => (
              <div key={t} className="tl-tick" style={{left: t * px}}>
                {fmt(t)}
              </div>
            ))}
          </div>
        </div>
        <div className="tl-row">
          <div className="tl-label">VO</div>
          <div className="tl-track">
            <Waveform url={voUrl} total={data.total} px={px} onSeek={onSeek} />
          </div>
        </div>
        <div className="tl-row tl-words">
          <div className="tl-label">Kata</div>
          <div className="tl-track">
            {words.map((w, i) => (
              <span
                key={i}
                className={`tl-word ${currentTime >= w.s && currentTime < w.e ? 'active' : ''}`}
                style={{left: w.s * px}}
                title={`${w.w} · ${fmt(w.s)}`}
                onClick={() => onSeek(w.s)}
              >
                {w.w}
              </span>
            ))}
          </div>
        </div>
        <div className="tl-row tl-scenes">
          <div className="tl-label">Scene</div>
          <div className="tl-track">
            {data.scenes.map((s, i) => (
              <div
                key={s.n}
                className={`tl-scene ${selection?.type === 'scene' && selection.sceneN === s.n ? 'sel' : ''}`}
                style={{left: s.start * px, width: Math.max(4, (s.end - s.start) * px - 2)}}
                title={`${s.n}. ${s.title} · ${fmt(s.start)}–${fmt(s.end)} · geser tepi kanan untuk mengubah batas`}
                onClick={() => {
                  onSelect({type: 'scene', sceneN: s.n});
                  onSeek(s.start);
                }}
              >
                <span>
                  {s.n}. {s.title}
                </span>
                {i < data.scenes.length - 1 && (
                  <div className="tl-boundary" onPointerDown={(e) => startBoundaryDrag(e, i)} title="Geser batas scene" />
                )}
              </div>
            ))}
          </div>
        </div>
        {lanes.map((lane) => (
          <div className="tl-row tl-lane" key={lane.key}>
            <div className="tl-label">{lane.label}</div>
            <div className="tl-track">
              {lane.items.map(({beat, scene, end}) => (
                <div
                  key={beat.id}
                  className={`tl-beat ${selection?.type === 'beat' && selection.beatId === beat.id ? 'sel' : ''}`}
                  style={{
                    left: beat.t * px,
                    width: Math.max(4, (end - beat.t) * px - 1),
                    background: KIND_COLORS[beat.k] || '#999',
                  }}
                  title={`${beat.id} · ${beat.k}${beat.text ? ` · ${beat.text}` : ''} · ${fmt(beat.t)} · seret untuk menggeser (Alt = bebas)`}
                  onPointerDown={(e) => startBeatDrag(e, scene, beat)}
                  onClick={() => {
                    if (!draggedRef.current) onSeek(beat.t);
                    draggedRef.current = false;
                  }}
                >
                  <span>{beat.text || beat.k}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        <div style={{height: 8}} />
      </div>
    </div>
  );
};

export {FPS};
