import {Easing} from 'remotion';

export const W = 1920;
export const H = 1080;
export const PAPER = '#efe6d0';
export const WHITE = '#f8f4ea';
export const KRAFT = '#c7a674';
export const INK = '#1b1916';
export const RED = '#b3312a';
export const GREY = '#6b665d';
export const FONT = {
  anton: "Anton, Impact, 'Arial Narrow', sans-serif",
  elite: "'Special Elite', 'Courier New', monospace",
  osw: "Oswald, 'Arial Narrow', sans-serif",
  play: "'Playfair Display', Georgia, serif",
};

export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const easeOut = Easing.out(Easing.cubic);
export const easeBack = Easing.out(Easing.back(1.9));
export const easeInOut = Easing.inOut(Easing.quad);
export function prog(frame: number, start: number, dur: number, ease: (t: number) => number = easeOut) {
  return ease(clamp01((frame - start) / dur));
}
export const px = (pct: number) => (pct / 100) * W;
export const py = (pct: number) => (pct / 100) * H;

// clip-path polygon dengan tepi sobekan acak (CSS)
export function tornClip(seed: number, amp = 5, steps = 10) {
  const r = rng(seed);
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) pts.push(`${((i / steps) * 100).toFixed(1)}% ${(r() * amp).toFixed(1)}px`);
  pts.push(`calc(100% - ${(r() * amp).toFixed(1)}px) 50%`);
  for (let i = steps; i >= 0; i--) pts.push(`${((i / steps) * 100).toFixed(1)}% calc(100% - ${(r() * amp).toFixed(1)}px)`);
  pts.push(`${(r() * amp).toFixed(1)}px 50%`);
  return `polygon(${pts.join(',')})`;
}
