import React from 'react';
import {Beat} from './types';
import {FONT, GREY, H, INK, KRAFT, PAPER, RED, W, clamp01, easeBack, easeInOut, easeOut, hash, prog, px, py, rng, tornClip} from './lib';

type P = {b: Beat; fb: number};

const full: React.CSSProperties = {position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'visible', pointerEvents: 'none'};

// Silang merah dua goresan kuas
export const XMark: React.FC<P> = ({b, fb}) => {
  const s = b.size || 380;
  const a = prog(fb, 0, 5, easeOut);
  const c = prog(fb, 4, 5, easeOut);
  return (
    <svg viewBox="0 0 100 100" style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: s, height: s, transform: 'translate(-50%,-50%) rotate(-3deg)', filter: 'url(#rough) drop-shadow(0 4px 5px rgba(0,0,0,.4))', overflow: 'visible'}}>
      <path d="M12 14 Q48 46 88 86" pathLength={1} fill="none" stroke={RED} strokeWidth={13} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - a} />
      <path d="M88 12 Q52 50 12 88" pathLength={1} fill="none" stroke={RED} strokeWidth={13} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - c} />
    </svg>
  );
};

// Lingkaran spidol tangan
export const CircleMark: React.FC<P> = ({b, fb}) => {
  const rx = (px(b.w || 30)) / 2, ry = (py(b.h || 20)) / 2;
  const cx = px(b.x), cy = py(b.y);
  const pts: string[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const t = i / N, a = -2.2 + t * (Math.PI * 2 + 0.55);
    const wob = 1 + 0.035 * Math.sin(a * 3 + 1) + 0.02 * t;
    pts.push(`${i ? 'L' : 'M'}${(cx + rx * wob * Math.cos(a)).toFixed(1)} ${(cy + ry * wob * Math.sin(a)).toFixed(1)}`);
  }
  const p = prog(fb, 0, 14, easeInOut);
  return (
    <svg style={{...full, filter: 'url(#rough) drop-shadow(0 4px 5px rgba(0,0,0,.35))'}}>
      <path d={pts.join(' ')} pathLength={1} fill="none" stroke={RED} strokeWidth={11} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
    </svg>
  );
};

// Panah melengkung digambar bertahap
export const ArrowMark: React.FC<P> = ({b, fb}) => {
  const x1 = px(b.x), y1 = py(b.y), x2 = px(b.x2 || 0), y2 = py(b.y2 || 0);
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
  const dx = x2 - x1, dy = y2 - y1;
  const bend = b.bend ?? 0.2;
  const cx = mx - dy * bend, cy = my + dx * bend;
  const dur = (b.dur || 0.6) * 30;
  const p = prog(fb, 0, dur, easeInOut);
  // arah kepala panah di ujung
  const ang = Math.atan2(y2 - cy, x2 - cx);
  const hs = 38;
  const head = `M${x2} ${y2} L${x2 - hs * Math.cos(ang - 0.45)} ${y2 - hs * Math.sin(ang - 0.45)} L${x2 - hs * Math.cos(ang + 0.45)} ${y2 - hs * Math.sin(ang + 0.45)} Z`;
  const col = b.color === 'ink' ? INK : RED;
  return (
    <svg style={{...full, filter: 'drop-shadow(0 4px 5px rgba(0,0,0,.4))'}}>
      <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} pathLength={1} fill="none" stroke={col} strokeWidth={10} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - p} />
      <path d={head} fill={col} opacity={p > 0.95 ? 1 : 0} />
    </svg>
  );
};

// Pin peta + label
export const Pin: React.FC<P> = ({b, fb}) => {
  const p = prog(fb, 0, 9, easeBack);
  return (
    <div style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, transform: `translate(-27px,-100%) translateY(${(1 - p) * -90}px)`, opacity: p > 0 ? 1 : 0, filter: 'drop-shadow(0 6px 6px rgba(0,0,0,.5))'}}>
      <div style={{display: 'flex', alignItems: 'flex-end', gap: 10}}>
        <svg width={54} height={74} viewBox="0 0 54 74"><path d="M27 72 C27 72 4 44 4 26 A23 23 0 0 1 50 26 C50 44 27 72 27 72Z" fill={RED} stroke={PAPER} strokeWidth={3} /><circle cx={27} cy={26} r={9} fill={PAPER} /></svg>
        <div style={{background: PAPER, color: INK, fontFamily: FONT.anton, fontSize: 40, padding: '4px 16px', letterSpacing: 2, clipPath: tornClip(hash(b.text || ''), 5, 8), whiteSpace: 'nowrap', marginBottom: 6}}>{b.text}</div>
      </div>
    </div>
  );
};

// Riak air / cahaya
export const Ripple: React.FC<P> = ({b, fb}) => {
  const s = b.size || 260;
  const col = b.color === 'gold' ? '#e0b04c' : '#5f87a0';
  const fadeIn = clamp01(fb / 10);
  return (
    <div style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: 0, height: 0, opacity: fadeIn}}>
      {[0, 1, 2].map((i) => {
        const ph = (((fb + i * 14) % 42) / 42);
        const r = (s / 2) * (0.15 + ph);
        return <div key={i} style={{position: 'absolute', left: -r, top: -r * 0.55, width: r * 2, height: r * 1.1, borderRadius: '50%', border: `${7 - ph * 5}px solid ${col}`, opacity: (1 - ph) * 0.85}} />;
      })}
    </div>
  );
};

// Hajar berlari 7 kali antara dua titik (Shafa-Marwah)
export const Run7: React.FC<P & {fps: number}> = ({b, fb, fps}) => {
  const f0 = 0, f1 = ((b.t2 || b.t + 4) - b.t) * fps;
  const legs = 7;
  const x1 = px(b.x1 || 24), y1 = py(b.y1 || 56), x2 = px(b.x2 || 76), y2 = py(b.y2 || 56);
  const u = clamp01((fb - f0) / (f1 - f0)) * legs;
  const leg = Math.min(legs - 1, Math.floor(u));
  const lp = easeInOut(u - leg >= 1 ? 1 : u - leg);
  const fromA = leg % 2 === 0;
  const ax = fromA ? x1 : x2, bx = fromA ? x2 : x1;
  const dx = ax + (bx - ax) * lp, dy = y1 + (y2 - y1) * lp + Math.sin(lp * Math.PI) * -70;
  const done = Math.min(legs, Math.floor(u + 0.02));
  const legEnd = (f1 / legs) * done;
  const pop = done > 0 ? prog(fb - legEnd, 0, 7, easeBack) : 0;
  const badges: React.ReactNode = done > 0 ? (
    <div style={{position: 'absolute', left: '50%', top: '27%', width: 190, height: 190, marginLeft: -95, marginTop: -95, transform: `scale(${0.7 + 0.3 * pop}) rotate(${(done % 3 - 1) * 4}deg)`, background: RED, color: PAPER, borderRadius: '50%', border: `8px solid ${PAPER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT.anton, fontSize: 112, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,.5))'}}>
      {done}<span style={{fontSize: 52, opacity: 0.8, marginTop: 28}}>/7</span>
    </div>
  ) : null;
  const trail = prog(fb, 0, 6);
  return (
    <div style={{...full}}>
      <svg style={full}><path d={`M${x1} ${y1} L${x2} ${y2}`} stroke={RED} strokeWidth={6} strokeDasharray="4 22" strokeLinecap="round" opacity={0.75 * trail} fill="none" /></svg>
      <div style={{position: 'absolute', left: dx - 17, top: dy - 17, width: 34, height: 34, borderRadius: '50%', background: RED, border: `5px solid ${PAPER}`, filter: 'drop-shadow(0 4px 5px rgba(0,0,0,.5))', opacity: trail}} />
      {badges}
    </div>
  );
};

// Cipratan tinta
export const Splat: React.FC<P> = ({b, fb}) => {
  const s = b.size || 300;
  const r = rng(hash(`${b.x}${b.y}${b.t}`));
  const col = b.color === 'red' ? RED : INK;
  const p = prog(fb, 0, 5, easeOut);
  const fade = 1 - clamp01((fb - 28) / 14);
  let d = '';
  const N = 22;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2, rr = 38 + (i % 2 ? r() * 12 : r() * 4);
    d += `${i ? 'L' : 'M'}${50 + rr * Math.cos(a)} ${50 + rr * Math.sin(a)} `;
  }
  const drops = Array.from({length: 9}, () => ({a: r() * 6.28, d: 46 + r() * 38, s: 1.5 + r() * 4.5}));
  return (
    <svg viewBox="0 0 100 100" style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, width: s * p, height: s * p, transform: 'translate(-50%,-50%)', opacity: 0.88 * fade, overflow: 'visible'}}>
      <path d={d + 'Z'} fill={col} />
      {drops.map((q, i) => <circle key={i} cx={50 + q.d * Math.cos(q.a)} cy={50 + q.d * Math.sin(q.a)} r={q.s} fill={col} />)}
    </svg>
  );
};

// Retakan bendungan
export const Crack: React.FC<P> = ({b, fb}) => {
  const r = rng(hash('crack'));
  const x0 = px(b.x), y0 = py(b.y);
  const mk = (sx: number, sy: number, len: number, dir: number, jag: number) => {
    let x = sx, y = sy, d = `M${x} ${y}`;
    const n = 16;
    for (let i = 0; i < n; i++) { x += dir * (len / n) * (0.4 + r()) + (r() - 0.5) * jag; y += (len / n) * (0.7 + r() * 0.6); d += ` L${x.toFixed(0)} ${y.toFixed(0)}`; }
    return d;
  };
  const main = mk(x0, 0, H * 1.05, 0.3, 90);
  const b1 = mk(x0 + 60, H * 0.28, H * 0.5, 1.6, 70);
  const b2 = mk(x0 - 40, H * 0.5, H * 0.5, -1.7, 70);
  const p = prog(fb, 0, 24, easeOut);
  const flash = 1 - clamp01(fb / 7);
  return (
    <>
      <svg style={{...full, filter: 'drop-shadow(0 0 10px rgba(255,255,255,.65))'}}>
        {[main, b1, b2].map((d, i) => <path key={i} d={d} pathLength={1} fill="none" stroke={PAPER} strokeWidth={i ? 9 : 15} strokeLinecap="round" strokeLinejoin="bevel" strokeDasharray={1} strokeDashoffset={1 - clamp01(p * (i ? 1.25 : 1) - (i ? 0.2 : 0))} />)}
        {[main, b1, b2].map((d, i) => <path key={'k' + i} d={d} pathLength={1} fill="none" stroke={INK} strokeWidth={i ? 4 : 7} strokeLinecap="round" strokeLinejoin="bevel" strokeDasharray={1} strokeDashoffset={1 - clamp01(p * (i ? 1.25 : 1) - (i ? 0.2 : 0))} />)}
      </svg>
      <div style={{position: 'absolute', inset: 0, background: '#fff', opacity: flash * 0.55}} />
    </>
  );
};

// Bara api
export const Embers: React.FC<P> = ({b, fb}) => {
  const dur = (b.dur || 3.5) * 30;
  const life = clamp01(fb / 12) * (1 - clamp01((fb - dur + 14) / 14));
  if (life <= 0) return null;
  const r = rng(31);
  const parts = Array.from({length: 70}, () => ({x: r() * W, sp: 1.4 + r() * 3.4, ph: r(), s: 3 + r() * 8, sw: r() * 6.28, hue: r()}));
  return (
    <div style={{...full, opacity: life}}>
      <div style={{position: 'absolute', left: 0, right: 0, bottom: 0, height: H * 0.55, background: 'linear-gradient(to top, rgba(210,90,25,.55), rgba(210,90,25,0))', mixBlendMode: 'screen'}} />
      {parts.map((q, i) => {
        const y = H - (((q.ph * H + fb * q.sp * 2.2) % (H * 1.1)));
        const x = q.x + Math.sin(fb / 14 + q.sw) * 30;
        return <div key={i} style={{position: 'absolute', left: x, top: y, width: q.s, height: q.s, borderRadius: '50%', background: q.hue > 0.5 ? '#ffb24a' : '#ff6a2a', boxShadow: '0 0 14px 4px rgba(255,120,40,.75)', opacity: 0.4 + 0.6 * clamp01(y / H)}} />;
      })}
    </div>
  );
};

// Tag nama bergantung pada benang merah (silsilah)
export const Tag: React.FC<P & {prev?: Beat; part: 'thread' | 'tag'}> = ({b, fb, prev, part}) => {
  const size = b.size || 70;
  const p = prog(fb, 0, 10, easeBack);
  const swing = Math.sin(fb / 5) * Math.exp(-fb / 14) * 8;
  const bg = b.color === 'ink' ? INK : b.color === 'kraft' ? KRAFT : PAPER;
  const fg = b.color === 'ink' ? PAPER : INK;
  const th = prog(fb, 0, 12, easeInOut);
  let thread: React.ReactNode = null;
  if (prev) {
    const x1 = px(prev.x), y1 = py(prev.y), x2 = px(b.x), y2 = py(b.y);
    const cx = (x1 + x2) / 2, cy = Math.min(y1, y2) - 120;
    thread = (
      <svg style={full}>
        <path d={`M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}`} pathLength={1} fill="none" stroke={RED} strokeWidth={6} strokeLinecap="round" strokeDasharray={1} strokeDashoffset={1 - th} style={{filter: 'drop-shadow(0 3px 3px rgba(0,0,0,.4))'}} />
      </svg>
    );
  }
  if (part === 'thread') return <>{thread}</>;
  return (
    <>
      <div style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, transform: `translate(-50%,-50%) translateY(${(1 - p) * -380}px) rotate(${(b.rot || 0) + swing}deg)`, opacity: p > 0 ? 1 : 0, filter: 'drop-shadow(0 8px 9px rgba(0,0,0,.5))'}}>
        <div style={{background: bg, color: fg, fontFamily: FONT.anton, fontSize: size, letterSpacing: size * 0.04, padding: `${size * 0.22}px ${size * 0.5}px ${size * 0.16}px`, clipPath: `polygon(0 0, 100% 0, 100% 100%, 0 100%)`, border: `4px solid ${b.color === 'ink' ? KRAFT : 'rgba(0,0,0,.25)'}`, position: 'relative'}}>
          <div style={{position: 'absolute', left: '50%', top: size * 0.08, width: size * 0.2, height: size * 0.2, marginLeft: -size * 0.1, borderRadius: '50%', background: '#2a2620', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.8)'}} />
          <div style={{marginTop: size * 0.16, whiteSpace: 'nowrap'}}>{b.text}</div>
        </div>
      </div>
    </>
  );
};
