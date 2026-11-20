import React from 'react';
import {Beat} from './types';
import {FONT, GREY, INK, KRAFT, PAPER, RED, WHITE, easeBack, easeOut, hash, prog, rng, tornClip} from './lib';

type P = {b: Beat; fb: number; ex: number};

const box = (b: Beat, ex: number, extra: React.CSSProperties = {}): React.CSSProperties => ({
  position: 'absolute',
  left: `${b.x}%`,
  top: `${b.y}%`,
  transform: `translate(-50%,-50%) rotate(${b.rot || 0}deg) scale(${1 - 0.08 * ex})`,
  opacity: 1 - ex,
  ...extra,
});

// Teks potongan koran (strip kertas)
export const Strip: React.FC<P> = ({b, fb, ex}) => {
  const lines = (b.text || '').split('\n');
  const maxc = Math.max(...lines.map((l) => l.length));
  const size = Math.min(b.size || 92, 1640 / (maxc * 0.5));
  const h = hash(b.text || '');
  const pal = [[PAPER, INK], [INK, PAPER], [PAPER, RED], [WHITE, INK]][h % 4];
  return (
    <div style={box(b, ex, {display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.07, filter: 'drop-shadow(0 8px 9px rgba(0,0,0,.45))'})}>
      {lines.map((l, i) => {
        const p = prog(fb, i * 3, 7, easeBack);
        return (
          <div
            key={i}
            style={{
              background: pal[0], color: pal[1], fontFamily: FONT.anton, fontSize: size, lineHeight: 1.04,
              padding: `${size * 0.1}px ${size * 0.3}px ${size * 0.06}px`, letterSpacing: size * 0.02, whiteSpace: 'pre',
              clipPath: tornClip(h + i * 7, size * 0.075),
              transform: `translateY(${(1 - p) * 46}px) rotate(${(i % 2 ? 1 : -1) * 1.1}deg) scale(${0.82 + 0.18 * p})`,
              opacity: Math.min(1, p * 1.6),
            }}
          >
            {l}
          </div>
        );
      })}
    </div>
  );
};

// Teks "ransom note": tiap huruf potongan koran sendiri
export const Ransom: React.FC<P> = ({b, fb, ex}) => {
  const lines = (b.text || '').split('\n');
  const maxw = Math.max(...lines.map((l) => l.replace(/ /g, '').length + (l.split(' ').length - 1) * 0.45));
  const size = Math.min(b.size || 110, 1680 / (maxw * 0.8));
  const h = hash(b.text || '');
  const r = rng(h);
  const fonts = [FONT.anton, FONT.play, FONT.elite, FONT.osw];
  let idx = 0;
  return (
    <div style={box(b, ex, {display: 'flex', flexDirection: 'column', alignItems: 'center', gap: size * 0.1, filter: 'drop-shadow(0 7px 8px rgba(0,0,0,.5))'})}>
      {lines.map((l, li) => (
        <div key={li} style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: size * 0.025}}>
          {l.split('').map((ch, ci) => {
            if (ch === ' ') return <div key={ci} style={{width: size * 0.32}} />;
            const k = idx++;
            const q = r();
            const bg = q < 0.3 ? PAPER : q < 0.5 ? WHITE : q < 0.66 ? KRAFT : q < 0.86 ? INK : RED;
            const fg = bg === INK || bg === RED ? PAPER : INK;
            const f = fonts[Math.floor(r() * 4)];
            const sc = 0.9 + r() * 0.24;
            const rot = (r() - 0.5) * 9;
            const dy = (r() - 0.5) * size * 0.12;
            const p = prog(fb, k * 1.7, 6, easeBack);
            return (
              <div
                key={ci}
                style={{
                  background: bg, color: fg, fontFamily: f, fontWeight: f === FONT.play || f === FONT.osw ? 900 : 400,
                  fontSize: size * 0.8 * sc, lineHeight: 1, padding: `${size * 0.1}px ${size * 0.11}px`,
                  clipPath: tornClip(h + k * 13, size * 0.06, 4),
                  transform: `translateY(${dy + (1 - p) * -60}px) rotate(${rot}deg) scale(${p})`, opacity: p > 0 ? 1 : 0,
                  minWidth: size * 0.46, textAlign: 'center',
                }}
              >
                {ch}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// Stempel merah
export const Stamp: React.FC<P> = ({b, fb, ex}) => {
  const lines = (b.text || '').split('\n');
  const maxc = Math.max(...lines.map((l) => l.length));
  const size = Math.min(b.size || 110, 1500 / (maxc * 0.52));
  const col = b.color === 'ink' ? INK : b.color === 'grey' ? GREY : RED;
  const p = prog(fb, 0, 6, easeOut);
  const shake = fb > 4 && fb < 9 ? (fb % 2 ? 3 : -3) : 0;
  return (
    <div
      style={{
        position: 'absolute', left: `${b.x}%`, top: `${b.y}%`,
        transform: `translate(-50%,-50%) translateX(${shake}px) rotate(${(b.rot || 0) + (1 - p) * 8}deg) scale(${(1 + (1 - p) * 1.4) * (1 - 0.08 * ex)})`,
        opacity: Math.min(1, p * 2) * (1 - ex),
        filter: 'url(#rough) drop-shadow(0 5px 6px rgba(0,0,0,.35))',
      }}
    >
      <div style={{border: `${size * 0.055}px solid ${col}`, padding: `${size * 0.06}px ${size * 0.22}px`, background: 'rgba(244,236,218,.92)', outline: `${size * 0.02}px solid ${col}`, outlineOffset: -size * 0.12}}>
        {lines.map((l, i) => (
          <div key={i} style={{color: col, fontFamily: FONT.anton, fontSize: size, lineHeight: 1.05, letterSpacing: size * 0.03, textAlign: 'center', whiteSpace: 'pre'}}>
            {l}
          </div>
        ))}
      </div>
    </div>
  );
};

// Mesin ketik di lembar kertas
export const Typewriter: React.FC<P> = ({b, fb, ex}) => {
  const full = b.text || '';
  const size = b.size || 64;
  const n = Math.min(full.length, Math.max(0, Math.floor(fb * 0.85)));
  const p = prog(fb, 0, 8, easeOut);
  const caret = Math.floor(fb / 8) % 2 === 0;
  return (
    <div style={box(b, ex, {opacity: (1 - ex) * p, filter: 'drop-shadow(0 12px 14px rgba(0,0,0,.5))', transform: `translate(-50%,-50%) rotate(${b.rot || -1}deg) translateY(${(1 - p) * 30}px)`})}>
      <div style={{background: PAPER, padding: `${size * 0.9}px ${size * 1.1}px`, clipPath: tornClip(hash(full), size * 0.15, 14), fontFamily: FONT.elite, fontSize: size, color: INK, whiteSpace: 'pre', lineHeight: 1.35}}>
        <span>{full.slice(0, n)}</span>
        <span style={{opacity: caret ? 1 : 0, color: RED}}>▌</span>
        <span style={{opacity: 0}}>{full.slice(n)}</span>
      </div>
    </div>
  );
};

// Label selotip kecil (peta)
export const Label: React.FC<P> = ({b, fb}) => {
  const size = b.size || 44;
  const p = prog(fb, 0, 8, easeBack);
  return (
    <div style={{position: 'absolute', left: `${b.x}%`, top: `${b.y}%`, transform: `translate(-50%,-50%) rotate(${b.rot || 0}deg) scale(${p})`, opacity: p > 0 ? 1 : 0, filter: 'drop-shadow(0 5px 6px rgba(0,0,0,.45))'}}>
      <div style={{background: KRAFT, color: INK, fontFamily: FONT.anton, fontSize: size, letterSpacing: size * 0.05, padding: `${size * 0.12}px ${size * 0.5}px`, clipPath: tornClip(hash(b.text || ''), size * 0.08, 8), whiteSpace: 'pre'}}>
        {b.text}
      </div>
      <div style={{position: 'absolute', left: -size * 0.3, top: -size * 0.2, width: size * 1.1, height: size * 0.5, background: 'rgba(236,226,196,.75)', transform: 'rotate(-28deg)'}} />
      <div style={{position: 'absolute', right: -size * 0.3, bottom: -size * 0.2, width: size * 1.1, height: size * 0.5, background: 'rgba(236,226,196,.75)', transform: 'rotate(-28deg)'}} />
    </div>
  );
};
