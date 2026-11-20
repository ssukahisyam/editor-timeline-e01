import React from 'react';
import {beatFields, BEAT_SCHEMA, type BeatKind} from '../../src/schema/beats';
import type {Beat, SceneT} from '../../src/types';
import {fmt} from './timeline';

export type EditPhase = 'begin' | 'update' | 'commit';

export interface AssetItem {
  id: string;
  src: string;
}

const PALETTE = ['red', 'ink', 'blue', 'cream', 'kraft', 'gold', 'grey'];
const TRANSITIONS = ['cut', 'slap', 'tear-r', 'tear-l', 'tear-d', 'tear-u'];

export const AddBeatButtons: React.FC<{onAdd: (kind: BeatKind) => void}> = ({onAdd}) => {
  const [kind, setKind] = React.useState<BeatKind>('strip');
  return (
    <div className="addbeat">
      <select value={kind} onChange={(e) => setKind(e.target.value as BeatKind)}>
        {(Object.keys(BEAT_SCHEMA) as BeatKind[]).map((k) => (
          <option key={k} value={k}>
            {BEAT_SCHEMA[k].label}
          </option>
        ))}
      </select>
      <button onClick={() => onAdd(kind)}>＋ Tambah elemen</button>
    </div>
  );
};

interface BeatPanelProps {
  scene: SceneT;
  beat: Beat;
  onField: (beatId: string, key: string, value: unknown, phase: EditPhase) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const BeatPanel: React.FC<BeatPanelProps> = ({scene, beat, onField, onDuplicate, onDelete}) => {
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
                  onField(beat.id, f.key, e.target.checked, 'update');
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
                  onField(beat.id, f.key, e.target.value, 'update');
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
      <div className="beat-actions">
        <button onClick={onDuplicate}>⧉ Duplikat (Ctrl+D)</button>
        <button className="danger" onClick={onDelete}>
          🗑 Hapus (Del)
        </button>
      </div>
    </div>
  );
};

const AssetPicker: React.FC<{
  label: string;
  items: AssetItem[];
  value: string | null;
  onPick: (id: string | null) => void;
}> = ({label, items, value, onPick}) => (
  <div className="fld">
    <span>
      {label} — saat ini: <b>{value || '(tidak ada)'}</b>
    </span>
    <div className="assetgrid">
      <button type="button" className={`asset-none ${!value ? 'sel' : ''}`} onClick={() => onPick(null)} title="Tanpa aset">
        ✕
      </button>
      {items.map((it) => (
        <button
          type="button"
          key={it.id}
          className={`asset-thumb ${value === it.id ? 'sel' : ''}`}
          onClick={() => onPick(it.id)}
          title={it.id}
        >
          <img src={it.src} alt={it.id} loading="lazy" />
          <span>{it.id}</span>
        </button>
      ))}
    </div>
  </div>
);

interface ScenePanelProps {
  scene: SceneT;
  assets: {img: AssetItem[]; tex: AssetItem[]};
  onField: (sceneN: number, key: string, value: unknown, phase: EditPhase) => void;
  onAddBeat: (kind: BeatKind) => void;
}

export const ScenePanel: React.FC<ScenePanelProps> = ({scene, assets, onField, onAddBeat}) => {
  const pickOnce = (key: string, v: unknown) => {
    onField(scene.n, key, v, 'begin');
    onField(scene.n, key, v, 'update');
    onField(scene.n, key, v, 'commit');
  };
  const camSet = (idx: number, pos: number, v: number, phase: EditPhase) => {
    if (phase !== 'update') return onField(scene.n, 'cam', scene.cam, phase);
    const next = scene.cam.map((c, i) => (i === idx ? (c.map((x, j) => (j === pos ? v : x)) as [number, number, number]) : c));
    onField(scene.n, 'cam', next, 'update');
  };
  return (
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
            onField(scene.n, 'trans', e.target.value, 'update');
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
      <AssetPicker label="Gambar (img)" items={assets.img} value={scene.img} onPick={(id) => pickOnce('img', id)} />
      <AssetPicker label="Latar tekstur (bg)" items={assets.tex} value={scene.bg} onPick={(id) => pickOnce('bg', id)} />
      <div className="fld">
        <span>
          Kamera — titik-titik [x, y, zoom] tersebar merata sepanjang scene ({(scene.end - scene.start).toFixed(1)} dtk)
        </span>
        {scene.cam.map((c, i) => (
          <div key={i} className="camrow">
            <span className="dim">#{i + 1}</span>
            {(['x', 'y', 'zoom'] as const).map((lbl, j) => (
              <label key={lbl}>
                {lbl}
                <input
                  type="number"
                  step={j === 2 ? 0.05 : 1}
                  value={c[j]}
                  onFocus={() => camSet(i, j, c[j], 'begin')}
                  onChange={(e) => camSet(i, j, Number(e.target.value), 'update')}
                  onBlur={() => camSet(i, j, c[j], 'commit')}
                />
              </label>
            ))}
            <button
              type="button"
              disabled={scene.cam.length <= 1}
              onClick={() => pickOnce('cam', scene.cam.filter((_, x) => x !== i))}
              title="Hapus titik kamera"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => pickOnce('cam', [...scene.cam, [...scene.cam[scene.cam.length - 1]]])}>
          ＋ Tambah titik kamera
        </button>
      </div>
      <dl>
        <dt>Waktu</dt>
        <dd>
          {fmt(scene.start)} – {fmt(scene.end)} ({(scene.end - scene.start).toFixed(1)} dtk) — geser batasnya di lajur Scene
        </dd>
        <dt>Jumlah elemen</dt>
        <dd>{scene.beats.length}</dd>
        <dt>Narasi</dt>
        <dd className="vo">{scene.vo}</dd>
      </dl>
      <h2 style={{marginTop: 14}}>Tambah elemen ke scene ini</h2>
      <AddBeatButtons onAdd={onAddBeat} />
    </div>
  );
};
