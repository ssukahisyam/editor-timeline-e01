// Skema bersama jenis elemen (beat) — Tahap 0.
//
// Satu-satunya definisi field per jenis elemen. Dipakai oleh:
// - panel properti editor (Tahap 2, dibuat otomatis dari skema ini), dan
// - kode render (Scene.tsx / Text.tsx / Marks.tsx) sebagai acuan field sah.
//
// Field disusun dari data nyata scenes.json E01 (diverifikasi 20 Nov 2026).
// Tiga koreksi terhadap tabel rancangan awal, mengikuti data:
// - `label` juga punya `slot` (12/12 elemen di data).
// - `type` juga punya `slot` (1/1).
// - `run7` juga punya `anchored` (1/1).

export type BeatFieldType = 'text' | 'number' | 'color' | 'boolean';

export interface BeatFieldDef {
  key: string;
  label: string;
  type: BeatFieldType;
  unit?: string;
  step?: number;
}

const num = (key: string, label: string, unit?: string, step?: number): BeatFieldDef => ({
  key,
  label,
  type: 'number',
  unit,
  step,
});
const txt = (key: string, label: string): BeatFieldDef => ({key, label, type: 'text'});
const col = (key: string, label: string): BeatFieldDef => ({key, label, type: 'color'});
const bool = (key: string, label: string): BeatFieldDef => ({key, label, type: 'boolean'});

export const F = {
  t: num('t', 'Waktu', 'detik', 0.01),
  text: txt('text', 'Teks'),
  x: num('x', 'X', '%', 0.1),
  y: num('y', 'Y', '%', 0.1),
  x2: num('x2', 'X akhir', '%', 0.1),
  y2: num('y2', 'Y akhir', '%', 0.1),
  x1: num('x1', 'X awal', '%', 0.1),
  y1: num('y1', 'Y awal', '%', 0.1),
  rot: num('rot', 'Rotasi', '°', 0.5),
  size: num('size', 'Ukuran', undefined, 1),
  slot: txt('slot', 'Slot'),
  color: col('color', 'Warna'),
  anchored: bool('anchored', 'Menempel ke gambar'),
  bend: num('bend', 'Lengkung', undefined, 1),
  dur: num('dur', 'Durasi', 'detik', 0.1),
  w: num('w', 'Lebar', '%', 0.1),
  h: num('h', 'Tinggi', '%', 0.1),
  t2: num('t2', 'Waktu akhir', 'detik', 0.01),
} as const;

export type BeatKind =
  | 'strip'
  | 'ransom'
  | 'stamp'
  | 'label'
  | 'x'
  | 'arrow'
  | 'tag'
  | 'ripple'
  | 'pin'
  | 'circle'
  | 'splat'
  | 'run7'
  | 'embers'
  | 'type'
  | 'crack';

export interface BeatKindDef {
  kind: BeatKind;
  label: string;
  /** Field khusus jenis ini, di luar field bersama `k`, `id`, dan `t`. */
  fields: BeatFieldDef[];
}

export const BEAT_SCHEMA: Record<BeatKind, BeatKindDef> = {
  strip: {kind: 'strip', label: 'Strip teks', fields: [F.text, F.x, F.y, F.rot, F.size, F.slot]},
  ransom: {kind: 'ransom', label: 'Teks ransom', fields: [F.text, F.x, F.y, F.rot, F.size, F.slot]},
  stamp: {kind: 'stamp', label: 'Stempel', fields: [F.text, F.x, F.y, F.rot, F.size, F.color, F.slot]},
  label: {kind: 'label', label: 'Label', fields: [F.text, F.x, F.y, F.rot, F.size, F.anchored, F.slot]},
  x: {kind: 'x', label: 'Tanda X', fields: [F.x, F.y, F.size, F.anchored]},
  arrow: {
    kind: 'arrow',
    label: 'Panah',
    fields: [F.x, F.y, F.x2, F.y2, F.bend, F.color, F.dur, F.anchored],
  },
  tag: {kind: 'tag', label: 'Tag', fields: [F.text, F.x, F.y, F.rot, F.size, F.color]},
  ripple: {kind: 'ripple', label: 'Riak', fields: [F.x, F.y, F.size, F.color, F.anchored]},
  pin: {kind: 'pin', label: 'Pin', fields: [F.text, F.x, F.y, F.anchored]},
  circle: {kind: 'circle', label: 'Lingkaran', fields: [F.x, F.y, F.w, F.h, F.anchored]},
  splat: {kind: 'splat', label: 'Percikan', fields: [F.x, F.y, F.size, F.color]},
  run7: {kind: 'run7', label: 'Lari 7', fields: [F.x1, F.y1, F.x2, F.y2, F.t2, F.anchored]},
  embers: {kind: 'embers', label: 'Bara', fields: [F.dur]},
  type: {kind: 'type', label: 'Mesin tik', fields: [F.text, F.x, F.y, F.size, F.slot]},
  crack: {kind: 'crack', label: 'Retakan', fields: [F.x, F.y]},
};

export const BEAT_KINDS = Object.keys(BEAT_SCHEMA) as BeatKind[];

/** Semua field yang bisa diedit untuk satu jenis elemen: `t` bersama + field khusus. */
export function beatFields(kind: string): BeatFieldDef[] {
  const def = BEAT_SCHEMA[kind as BeatKind];
  return def ? [F.t, ...def.fields] : [F.t];
}

export function isBeatKind(kind: string): kind is BeatKind {
  return kind in BEAT_SCHEMA;
}
