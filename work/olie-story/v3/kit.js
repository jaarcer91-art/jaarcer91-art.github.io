// Shared helpers for the Olie clips. Every scene is a pure function of time:
// window.setTime(t) puts every element where it belongs at second t.
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, t) => a + (b - a) * t;
const E = {
  lin: (t) => t,
  o3: (t) => 1 - (1 - t) ** 3,
  o4: (t) => 1 - (1 - t) ** 4,
  o5: (t) => 1 - (1 - t) ** 5,
  i3: (t) => t ** 3,
  i4: (t) => t ** 4,
  io3: (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  io4: (t) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2),
  io5: (t) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2),
};
/** Progress 0..1 of t between a and b, eased. */
const seg = (t, a, b, e = E.io4) => e(clamp((t - a) / (b - a)));
/** 1 while a <= t < b, with fades of length f at both ends. */
const win = (t, a, b, f = 0.3) => Math.min(clamp((t - a) / f), clamp((b - t) / f));
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const NS = 'http://www.w3.org/2000/svg';
const svg = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const h = (tag, attrs = {}, parent, html) => {
  const n = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'style') n.style.cssText = attrs[k];
    else n.setAttribute(k, attrs[k]);
  }
  if (html != null) n.innerHTML = html;
  if (parent) parent.appendChild(n);
  return n;
};
const money = (v, d = 0) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Olie's own colours. */
const C = {
  black: '#000',
  vault: '#080605',
  champagne: '#CFB97D',
  champSoft: '#E1D4AE',
  champPale: '#F5EBCF',
  champDim: '#6E695E',
  bone: '#F7F3EC',
  paper: '#DEDBD4',
  ink: '#141210',
  green: '#31BD65',
  grey: '#8E8E93',
};

/** Monotone cubic through points [[x,y],...]: returns {at(x) -> y, path(x0,x1,step) -> svg d}. */
function monotone(pts) {
  const n = pts.length;
  const dx = [], m = [], d = [];
  for (let i = 0; i < n - 1; i++) { dx.push(pts[i + 1][0] - pts[i][0]); d.push((pts[i + 1][1] - pts[i][1]) / dx[i]); }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / d[i - 1] + (dx[i] + 2 * dx[i - 1]) / d[i]);
  const at = (x) => {
    let i = 0;
    while (i < n - 2 && x > pts[i + 1][0]) i++;
    const t = clamp((x - pts[i][0]) / dx[i]);
    const t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * pts[i][1] + (t3 - 2 * t2 + t) * dx[i] * m[i] + (-2 * t3 + 3 * t2) * pts[i + 1][1] + (t3 - t2) * dx[i] * m[i + 1];
  };
  return { at };
}

/** An image sequence player: frames live in seq/<name>/0001.jpg ... */
function seqImg(img, name, count) {
  let cur = -1;
  return async (frame) => {
    const f = Math.max(1, Math.min(count, Math.round(frame)));
    if (f === cur) return;
    cur = f;
    img.src = `seq/${name}/${String(f).padStart(4, '0')}.jpg`;
    try { await img.decode(); } catch (e) {}
  };
}

/** Fonts every scene uses. */
const FONT_CSS = `
@font-face{font-family:"Space Grotesk";font-weight:500;src:url(fonts/SpaceGrotesk_500Medium.woff2) format("woff2")}
@font-face{font-family:"Geist";font-weight:500;src:url(fonts/Geist-Medium.ttf) format("truetype")}
@font-face{font-family:"IBM Plex Mono";font-weight:300;src:url(fonts/IBMPlexMono_300Light.woff2) format("woff2")}
*{box-sizing:border-box;margin:0;padding:0}
html,body{background:#000;overflow:hidden}
body{font-family:Inter,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
#stage{position:relative;overflow:hidden}
.fig{font-family:"Space Grotesk",Inter,sans-serif;font-weight:500;font-feature-settings:"tnum";letter-spacing:-0.03em}
`;
function boot(scene) {
  window.SCENE = scene;
  const st = document.createElement('style');
  st.textContent = FONT_CSS;
  document.head.appendChild(st);
  const stage = document.getElementById('stage');
  stage.style.width = scene.w + 'px';
  stage.style.height = scene.h + 'px';
  return stage;
}
async function fontsReady(list = ['400 16px Inter', '500 16px Inter', '600 16px Inter', '500 16px "Space Grotesk"', '500 16px Geist', '300 16px "IBM Plex Mono"']) {
  await Promise.all(list.map((f) => document.fonts.load(f).catch(() => {})));
  await document.fonts.ready;
}

/** Grounds, measured from the reference clips. */
const GROUND = {
  black: '#000',
  studio: 'linear-gradient(180deg,#8c8c8c 0%,#5c5c5c 36%,#1c1c1c 82%,#0c0c0c 100%)', // grey studio wall falling to black
  dusk: 'linear-gradient(180deg,#050505 0%,#1b1b1b 34%,#6f6f6f 100%)',               // black falling to grey (close-ups of one control)
  paper: '#DAD7D0',
  champagne: '#CFB97D',
  slate: '#111111',
};
/** A flat phone screen (no bezel): a black rounded rectangle holding one <img>. Returns {el, img}. */
function flatScreen(parent, { x, y, w, src }) {
  const hgt = Math.round((w * 1282) / 590);
  const el = h('div', { style: `position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${hgt}px;border-radius:${Math.round(w * 0.145)}px;overflow:hidden;background:#000` }, parent);
  const img = h('img', { alt: '', style: 'display:block;width:100%;height:100%;object-fit:cover' }, el);
  if (src) img.src = src;
  return { el, img, h: hgt };
}
