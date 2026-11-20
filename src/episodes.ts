// Registri episode — satu mesin render, banyak episode (keputusan 20 Nov 2026).
//
// Setiap episode membawa datanya sendiri (scenes + words + VO + gambar) dengan
// skema yang sama. Editor (Tahap 1+) memakai daftar ini sebagai pemilih episode;
// Root.tsx mendaftarkan satu Composition per episode dengan id = `code`.
//
// Menambah episode baru:
// 1. Taruh datanya mengikuti pola E01 (scenes.json skema sama, words.json, vo).
// 2. Tambahkan satu entri di EPISODES di bawah ini.
// 3. Daftarkan manifesnya di episodes/eXX/episode.json (untuk server editor).

import scenesE01 from './data/scenes.json';
import {Data} from './types';

export interface EpisodeDef {
  /** Id folder/manifes, mis. 'e01'. */
  id: string;
  /** Kode Composition Remotion, mis. 'E01'. */
  code: string;
  title: string;
  data: Data;
  /** Nama berkas VO di folder public episode ini. */
  voFile: string;
}

export const EPISODES: EpisodeDef[] = [
  {
    id: 'e01',
    code: 'E01',
    title: 'Negeri yang Tak Pernah Dijajah',
    data: scenesE01 as unknown as Data,
    voFile: 'vo.mp3',
  },
];

export const DEFAULT_EPISODE = EPISODES[0];
