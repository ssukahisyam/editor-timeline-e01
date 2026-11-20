export type Beat = {
  id: string; k: string; t: number; t2?: number; text?: string;
  x: number; y: number; rot?: number; size?: number; slot?: string; color?: string;
  anchored?: boolean; x2?: number; y2?: number; bend?: number; w?: number; h?: number; dur?: number;
  x1?: number; y1?: number;
};
export type SceneT = {
  n: number; img: string | null; bg: string | null; start: number; end: number; title: string;
  beats: Beat[]; cam: number[][]; trans: string; vo: string;
};
export type Data = {total: number; fps: number; scenes: SceneT[]};
