import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {Data} from './types';
import {H, W, clamp01, easeInOut, easeOut, rng} from './lib';
import {SceneView} from './Scene';

export const OV = 16; // frame transisi

type Dir = 'r' | 'l' | 'd' | 'u';
function tear(dir: Dir, p: number, seed: number) {
  const r = rng(seed);
  const N = 56;
  const jag = Array.from({length: N + 1}, () => (r() - 0.5) * 46);
  const wid = Array.from({length: N + 1}, () => 10 + r() * 22);
  const horiz = dir === 'r' || dir === 'l';
  const L = horiz ? H : W, M = horiz ? W : H;
  const P: number[][] = [], Q: number[][] = [];
  for (let i = 0; i <= N; i++) {
    const sv = (i / N) * L;
    const f = -90 + p * (M + 180) + jag[i];
    if (dir === 'r') { P.push([f, sv]); Q.push([f + wid[i], sv]); }
    if (dir === 'l') { P.push([M - f, sv]); Q.push([M - f - wid[i], sv]); }
    if (dir === 'd') { P.push([sv, f]); Q.push([sv, f + wid[i]]); }
    if (dir === 'u') { P.push([sv, H - f]); Q.push([sv, H - f - wid[i]]); }
  }
  const corner: Record<Dir, [number[], number[]]> = {r: [[0, 0], [0, H]], l: [[W, 0], [W, H]], d: [[0, 0], [W, 0]], u: [[0, H], [W, H]]};
  const clip = [corner[dir][0], ...P, corner[dir][1]];
  const str = (pts: number[][]) => pts.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(0)}`).join(' ');
  return {
    clip: `polygon(${clip.map(([x, y]) => `${x.toFixed(0)}px ${y.toFixed(0)}px`).join(',')})`,
    strip: str([...P, ...Q.slice().reverse()]),
  };
}

const Transition: React.FC<{kind: string; ov: number; seed: number; children: React.ReactNode}> = ({kind, ov, seed, children}) => {
  const frame = useCurrentFrame();
  if (!ov || frame >= ov) return <AbsoluteFill>{children}</AbsoluteFill>;
  if (kind === 'slap') {
    const e = easeOut(clamp01(frame / ov));
    return (
      <AbsoluteFill style={{transform: `translateY(${(1 - e) * -130}px) scale(${1 + 0.14 * (1 - e)}) rotate(${(1 - e) * -2.4}deg)`, opacity: Math.min(1, frame / (ov * 0.3)), boxShadow: '0 40px 90px rgba(0,0,0,.65)'}}>
        {children}
      </AbsoluteFill>
    );
  }
  const dir = (kind.split('-')[1] || 'r') as Dir;
  const p = easeInOut(clamp01(frame / ov));
  const g = tear(dir, p, seed);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{clipPath: g.clip}}>{children}</AbsoluteFill>
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, filter: 'drop-shadow(0 0 9px rgba(0,0,0,.6))'}}>
        <polygon points={g.strip} fill="#f3ecda" />
      </svg>
    </AbsoluteFill>
  );
};

const GlobalFx: React.FC = () => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  const q = Math.floor(frame / 2);
  const j = rng(q + 11);
  const jx = j() * 64, jy = j() * 64;
  const dust = React.useMemo(() => { const r = rng(5); return Array.from({length: 28}, () => ({x: r() * W, y: r() * H, s: 2 + r() * 4, v: 0.3 + r() * 0.9, o: 0.15 + r() * 0.25})); }, []);
  const fade = 1 - clamp01((durationInFrames - frame) / 24);
  return (
    <>
      <div style={{position: 'absolute', inset: -64, backgroundImage: `url(${staticFile('textures/gen_grain.png')})`, backgroundSize: '512px', mixBlendMode: 'multiply', opacity: 0.5, transform: `translate(${jx}px,${jy}px)`}} />
      <div style={{position: 'absolute', inset: 0, backgroundImage: `url(${staticFile('textures/gen_cream.jpg')})`, backgroundSize: 'cover', mixBlendMode: 'multiply', opacity: 0.16}} />
      <div style={{position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(20,12,4,.5) 100%)'}} />
      {dust.map((d, i) => (
        <div key={i} style={{position: 'absolute', left: (d.x + Math.sin(frame / 40 + i) * 20) % W, top: ((d.y - frame * d.v) % H + H) % H, width: d.s, height: d.s, borderRadius: '50%', background: '#fff7e0', opacity: d.o}} />
      ))}
      <div style={{position: 'absolute', inset: 0, background: '#000', opacity: fade}} />
    </>
  );
};

export const Video: React.FC<{data: Data; voFile?: string}> = ({data, voFile = 'vo.mp3'}) => {
  const {fps, durationInFrames} = useVideoConfig();
  return (
    <AbsoluteFill style={{background: '#14120f'}}>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <defs>
          <filter id="rough" x="-6%" y="-6%" width="112%" height="112%">
            <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="4" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="6" />
          </filter>
        </defs>
      </svg>
      <Audio src={staticFile(voFile)} />
      {data.scenes.map((s, i) => {
        const startF = Math.round(s.start * fps);
        const nextStart = i + 1 < data.scenes.length ? Math.round(data.scenes[i + 1].start * fps) : durationInFrames;
        const ov = i === 0 || s.trans === 'cut' ? 0 : OV;
        const from = startF - ov;
        return (
          <Sequence key={i} from={from} durationInFrames={nextStart - from}>
            <Transition kind={s.trans} ov={ov} seed={i * 97 + 13}>
              <SceneView scene={s} from={from} ov={ov} fps={fps} />
            </Transition>
          </Sequence>
        );
      })}
      <GlobalFx />
    </AbsoluteFill>
  );
};
