import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import assets from './data/assets.json';
import {Beat, SceneT} from './types';
import {FONT, GREY, INK, clamp01, easeInOut} from './lib';
import {Label, Ransom, Stamp, Strip, Typewriter} from './Text';
import {ArrowMark, CircleMark, Crack, Embers, Pin, Ripple, Run7, Splat, Tag, XMark} from './Marks';

const TEXT = new Set(['strip', 'ransom', 'stamp', 'type']);
const A = assets as {img: Record<string, string>; tex: Record<string, string>};

const Placeholder: React.FC<{id: string; title: string}> = ({id, title}) => (
  <AbsoluteFill style={{backgroundImage: `url(${staticFile('textures/gen_cream.jpg')})`, backgroundSize: 'cover'}}>
    <div style={{position: 'absolute', inset: 70, border: `6px dashed ${GREY}`, opacity: 0.45}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: '30%', textAlign: 'center', fontFamily: FONT.anton, fontSize: 420, color: INK, opacity: 0.12, lineHeight: 1}}>{id}</div>
    <div style={{position: 'absolute', left: 0, right: 0, top: '58%', textAlign: 'center', fontFamily: FONT.osw, fontWeight: 700, fontSize: 40, color: GREY, letterSpacing: 6}}>GAMBAR {id} BELUM ADA · {title.toUpperCase()}</div>
  </AbsoluteFill>
);

const Background: React.FC<{scene: SceneT}> = ({scene}) => {
  if (scene.img) {
    const src = A.img[scene.img];
    if (!src) return <Placeholder id={scene.img} title={scene.title} />;
    return <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover', filter: 'sepia(.14) contrast(1.05) saturate(.92)'}} />;
  }
  const t = scene.bg || 't1';
  const src = A.tex[t] || (t === 't2' ? 'textures/gen_dark.jpg' : 'textures/gen_cream.jpg');
  return <Img src={staticFile(src)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />;
};

export const SceneView: React.FC<{scene: SceneT; from: number; ov: number; fps: number}> = ({scene, from, ov, fps}) => {
  const frame = useCurrentFrame();
  const abs = frame + from;
  const beats = scene.beats;

  // penggantian teks dalam slot yang sama
  const outMap = React.useMemo(() => {
    const m = new Map<Beat, number>();
    const by: Record<string, Beat[]> = {};
    beats.forEach((b) => { if (TEXT.has(b.k)) (by[b.slot || 'main'] ||= []).push(b); });
    Object.values(by).forEach((arr) => { arr.sort((a, b) => a.t - b.t); arr.forEach((b, i) => { if (arr[i + 1]) m.set(b, arr[i + 1].t); }); });
    return m;
  }, [beats]);
  const tags = beats.filter((b) => b.k === 'tag');

  // kamera
  const qa = Math.floor(abs / 2) * 2; // stop-motion 15fps
  const f0 = scene.start * fps - ov, f1 = scene.end * fps;
  const e = easeInOut(clamp01((qa - f0) / (f1 - f0)));
  const [c0, c1] = scene.cam;
  const s = c0[2] + (c1[2] - c0[2]) * e;
  const fx = c0[0] + (c1[0] - c0[0]) * e, fy = c0[1] + (c1[1] - c0[1]) * e;
  const lim = (s - 1) * 50;
  let tx = Math.max(-lim, Math.min(lim, -s * (fx - 50)));
  let ty = Math.max(-lim, Math.min(lim, -s * (fy - 50)));
  const ck = beats.find((b) => b.k === 'crack');
  if (ck) {
    const fc = abs - ck.t * fps;
    if (fc >= 0 && fc < 30) { const a = 1.1 * (1 - fc / 30); tx += (fc % 2 ? 1 : -1) * a; ty += (fc % 3 ? 0.6 : -0.6) * a; }
  }

  const renderBeat = (b: Beat, i: number, part: 'thread' | 'tag' = 'tag') => {
    const fb = abs - b.t * fps;
    if (fb < 0) return null;
    const tOut = outMap.get(b);
    const fOut = tOut !== undefined ? (tOut - b.t) * fps : Infinity;
    if (fb > fOut + 6) return null;
    const ex = fOut === Infinity ? 0 : clamp01((fb - fOut) / 5);
    switch (b.k) {
      case 'strip': return <Strip key={i} b={b} fb={fb} ex={ex} />;
      case 'ransom': return <Ransom key={i} b={b} fb={fb} ex={ex} />;
      case 'stamp': return <Stamp key={i} b={b} fb={fb} ex={ex} />;
      case 'type': return <Typewriter key={i} b={b} fb={fb} ex={ex} />;
      case 'label': return <Label key={i} b={b} fb={fb} ex={0} />;
      case 'x': return <XMark key={i} b={b} fb={fb} />;
      case 'circle': return <CircleMark key={i} b={b} fb={fb} />;
      case 'arrow': return <ArrowMark key={i} b={b} fb={fb} />;
      case 'pin': return <Pin key={i} b={b} fb={fb} />;
      case 'ripple': return <Ripple key={i} b={b} fb={fb} />;
      case 'run7': return <Run7 key={i} b={b} fb={fb} fps={fps} />;
      case 'splat': return fb < 44 ? <Splat key={i} b={b} fb={fb} /> : null;
      case 'crack': return <Crack key={i} b={b} fb={fb} />;
      case 'embers': return <Embers key={i} b={b} fb={fb} />;
      case 'tag': return <Tag key={i} b={b} fb={fb} prev={tags[tags.indexOf(b) - 1]} part={part} />;
      default: return null;
    }
  };

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{transform: `translate(${tx}%, ${ty}%) scale(${s})`, transformOrigin: '50% 50%'}}>
        <Background scene={scene} />
        {beats.map((b, i) => (b.anchored ? renderBeat(b, i) : null))}
      </AbsoluteFill>
      {beats.map((b, i) => (b.k === 'tag' ? renderBeat(b, i, 'thread') : null))}
      {beats.map((b, i) => (b.anchored ? null : renderBeat(b, i)))}
    </AbsoluteFill>
  );
};
