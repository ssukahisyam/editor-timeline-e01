import React from 'react';
import {beatFields, BEAT_SCHEMA, type BeatKind} from '../../src/schema/beats';
import type {Beat, SceneT} from '../../src/types';
import {fmt} from './timeline';

export type EditPhase = 'begin' | 'update' | 'commit';

const PALETTE = ['red', 'ink', 'blue', 'cream', 'kraft', 'gold', 'grey'];
const TRANSITIONS = ['cut', 'slap', 'tear-r', 'tear-l', 'tear-d', 'tear-u'];

interface BeatPanelProps {
  scene: SceneT;
  beat: Beat;
  onField: (beatId: string, key: string, value: unknown, phase: EditPhase) => void;
}

export const BeatPanel: React.FC<BeatPanelProps> = ({scene, beat, onField}) => {
  const fields = beatFields(beat.k);
  return (
    <div>
      <h2>Elemen · {BEAT_SCHEMA[beat.k as BeatKind]?.label || beat.k}</h2>
      <div className="dim" style={{marginBottom: 8}}>
        {beat.id} · scene {scene.n}. {scene.title}
      </div>
      {fields.map((f) => {
        const value = (beat as unknown as Record<string, unknown>)[f.key];
        if (f.type === 'boolean') {
          return (
            <label key={f.key} className="fld chk">
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={(e) => {
                  onField(beat.id, f.key, e.target.checked, 'begin');
                  onField(beat.id, f.key, e.target.checked, 'commit');
                }}
              />{' '}
              {f.label}
            </label>
          );
        }
        if (f.type === 'color') {
          const v = typeof value === 'string' ? value : '';
          return (
            <label key={f.key} className="fld">
              <span>{f.label}</span>
              <select
                value={PALETTE.includes(v) ? v : '__custom'}
                onChange={(e) => {
                  if (e.target.value === '__custom') return;
                  onField(beat.id, f.key, e.target.value, 'begin');
                  onField(beat.id, f.key, e.target.value, 'commit');
                }}
              >
                {PALETTE.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
                {!PALETTE.includes(v) && <option value="__custom">{v || '(khusus)'}</option>}
              </select>
            </label>
          );
        }
        if (f.type === 'number') {
          return (
            <label key={f.key} className="fld">
              <span>
                {f.label}
                {f.unit ? ` (${f.unit})` : ''}
              </span>
              <input
                type="number"
                step={f.step ?? 1}
                value={typeof value === 'number' ? value : ''}
                onFocus={() => onField(beat.id, f.key, value, 'begin')}
                onChange={(e) => onField(beat.id, f.key, e.target.value === '' ? undefined : Number(e.target.value), 'update')}
                onBlur={() => onField(beat.id, f.key, value, 'commit')}
              />
            </label>
          );
        }
        return (
          <label key={f.key} className="fld">
            <span>{f.label}</span>
            <input
              type="text"
              value={typeof value === 'string' ? value : ''}
              onFocus={() => onField(beat.id, f.key, value, 'begin')}
              onChange={(e) => onField(beat.id, f.key, e.target.value, 'update')}
              onBlur={() => onField(beat.id, f.key, value, 'commit')}
            />
          </label>
        );
      })}
    </div>
  );
};

interface ScenePanelProps {
  scene: SceneT;
  onField: (sceneN: number, key: string, value: unknown, phase: EditPhase) => void;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({scene, onField}) => (
  <div>
    <h2>Scene {scene.n}</h2>
    <label className="fld">
      <span>Judul</span>
      <input
        type="text"
        value={scene.title}
        onFocus={() => onField(scene.n, 'title', scene.title, 'begin')}
        onChange={(e) => onField(scene.n, 'title', e.target.value, 'update')}
        onBlur={() => onField(scene.n, 'title', scene.title, 'commit')}
      />
    </label>
    <label className="fld">
      <span>Transisi masuk</span>
      <select
        value={scene.trans}
        onChange={(e) => {
          onField(scene.n, 'trans', e.target.value, 'begin');
          onField(scene.n, 'trans', e.target.value, 'commit');
        }}
      >
        {TRANSITIONS.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
        {!TRANSITIONS.includes(scene.trans) && <option value={scene.trans}>{scene.trans}</option>}
      </select>
    </label>
    <label className="fld">
      <span>Gambar (img)</span>
      <input
        type="text"
        value={scene.img || ''}
        placeholder="mis. 07 — kosongkan bila pakai latar"
        onFocus={() => onField(scene.n, 'img', scene.img, 'begin')}
        onChange={(e) => onField(scene.n, 'img', e.target.value || null, 'update')}
        onBlur={() => onField(scene.n, 'img', scene.img, 'commit')}
      />
    </label>
    <label className="fld">
      <span>Latar tekstur (bg)</span>
      <input
        type="text"
        value={scene.bg || ''}
        placeholder="mis. t1 — kosongkan bila pakai gambar"
        onFocus={() => onField(scene.n, 'bg', scene.bg, 'begin')}
        onChange={(e) => onField(scene.n, 'bg', e.target.value || null, 'update')}
        onBlur={() => onField(scene.n, 'bg', scene.bg, 'commit')}
      />
    </label>
    <dl>
      <dt>Waktu</dt>
      <dd>
        {fmt(scene.start)} – {fmt(scene.end)} ({(scene.end - scene.start).toFixed(1)} dtk) — geser batasnya di lajur Scene
      </dd>
      <dt>Kamera (awal → akhir)</dt>
      <dd>
        {scene.cam.map((c) => `[${c.join(', ')}]`).join(' → ')} <span className="dim">(edit kamera di Tahap 4)</span>
      </dd>
      <dt>Jumlah elemen</dt>
      <dd>{scene.beats.length}</dd>
      <dt>Narasi</dt>
      <dd className="vo">{scene.vo}</dd>
    </dl>
  </div>
);
