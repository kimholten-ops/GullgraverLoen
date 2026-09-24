// Grafikk: Stian, bakken, kaktuser og pynt kommer fra OpenGameArt (se CREDITS.md og src/assets.js).
// Bygninger, gruver, muldyr, slanger og landemerker er tegnet i kode, piksel for piksel.
import {
  TILE, VIEW_W, VIEW_H, M, MINE_W, MINE_H, TRAIL_LEN as L, TRAIL_H, TOWN_END,
} from './data.js';
import { mulberry32, hash2, valueNoise } from './rng.js';
import { ASSETS, RES } from './assets.js';

function sprite(w, h, fn) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const p = (x, y, ww, hh, col) => { g.fillStyle = col; g.fillRect(x, y, ww, hh); };
  fn(p, g);
  return c;
}
function specks(p, seed, w, h, base, cols, n) {
  p(0, 0, w, h, base);
  const r = mulberry32(seed);
  for (let i = 0; i < n; i++) p((r() * w) | 0, (r() * h) | 0, 1, 1, cols[i % cols.length]);
}

// ---------- Stian Lønvik ----------
function hero(frame) {
  // 16x24, vendt mot høyre. frame: 0 står, 1 og 2 går, 3 hopper
  return sprite(16, 24, (p) => {
    const skin = '#f0c09a', beard = '#b5823c', shirt = '#a8322c', vest = '#3b2a1c', pants = '#44546e', boot = '#2a1a0e';
    // hatt
    p(5, 0, 7, 3, '#6b4526'); p(5, 2, 7, 1, '#2a1a0e'); p(3, 3, 11, 1, '#4a2e16'); p(6, 0, 4, 1, '#80563a');
    // ansikt og skjegg
    p(6, 4, 6, 4, skin); p(10, 5, 1, 1, '#1d1d1d'); p(12, 6, 1, 1, skin);
    p(6, 7, 6, 3, beard); p(7, 10, 4, 1, beard); p(6, 5, 1, 2, beard);
    // kropp
    p(5, 10, 7, 6, shirt); p(5, 10, 2, 6, vest); p(10, 10, 2, 6, vest); p(5, 15, 7, 1, '#2a1a0e');
    // armer
    if (frame === 3) { p(12, 8, 2, 4, shirt); p(12, 7, 2, 1, skin); p(3, 11, 2, 4, shirt); }
    else { p(12, 11, 2, 4, shirt); p(12, 15, 2, 1, skin); p(3, 11, 2, 4, shirt); p(3, 15, 2, 1, skin); }
    // gullpanne på ryggen
    p(2, 11, 2, 5, '#8a8a86'); p(2, 12, 1, 3, '#b3afa5');
    // bein
    if (frame === 0) { p(6, 16, 2, 6, pants); p(9, 16, 2, 6, pants); p(5, 22, 3, 2, boot); p(9, 22, 3, 2, boot); }
    if (frame === 1) { p(5, 16, 2, 6, pants); p(10, 16, 2, 5, pants); p(3, 22, 4, 2, boot); p(10, 21, 3, 2, boot); }
    if (frame === 2) { p(7, 16, 2, 6, pants); p(8, 16, 2, 6, pants); p(6, 22, 3, 2, boot); p(8, 22, 3, 2, boot); }
    if (frame === 3) { p(5, 16, 2, 4, pants); p(10, 16, 2, 5, pants); p(4, 20, 3, 2, boot); p(10, 21, 3, 2, boot); }
  });
}

function muleSprite(frame) {
  return sprite(24, 18, (p) => {
    const c = '#857060', d = '#6d5a4c';
    p(3, 6, 15, 6, c); p(4, 6, 13, 1, '#9c8674');
    p(17, 2, 4, 6, c); p(20, 4, 3, 3, c); p(17, 0, 1, 3, d); p(19, 0, 1, 3, d);
    p(21, 4, 1, 1, '#111'); p(22, 6, 1, 1, '#4d4036');
    const legs = frame ? [[4, 12], [7, 13], [13, 13], [16, 12]] : [[5, 12], [7, 12], [14, 12], [16, 12]];
    for (const [x, y] of legs) p(x, y, 2, 18 - y, d);
    p(1, 6, 2, 1, d); p(1, 7, 1, 4, '#4d4036');
    p(7, 2, 7, 5, '#b5884e'); p(7, 4, 7, 1, '#8c6636'); p(9, 1, 3, 1, '#8a8a86');
  });
}

function snakeSprite(frame) {
  return sprite(16, 8, (p) => {
    const c = '#9a7a3a', d = '#6e5424';
    if (frame) { p(1, 5, 4, 2, c); p(4, 4, 4, 2, c); p(7, 5, 4, 2, c); p(10, 4, 3, 2, c); }
    else { p(1, 4, 4, 2, c); p(4, 5, 4, 2, c); p(7, 4, 4, 2, c); p(10, 5, 3, 2, c); }
    p(12, 3, 3, 3, c); p(14, 4, 1, 1, '#111'); p(15, 5, 1, 1, '#c4402a');
    p(2, 5, 1, 1, d); p(6, 5, 1, 1, d); p(9, 5, 1, 1, d);
    p(0, 4, 1, 2, '#e0d2a8');
  });
}

// ---------- Terreng og landskap ----------
function buildSprites() {
  const V = [0, 1, 2];
  const t = {};
  t.sandTop = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 10 + v, 16, 16, '#dcb77c', ['#c89f63', '#ebcf9c'], 10);
    p(0, 0, 16, 2, '#ecd3a0'); p(0, 2, 16, 1, '#c9a36a');
  }));
  t.rockTop = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 20 + v, 16, 16, '#a67a58', ['#8e6446', '#bb8f6a'], 12);
    p(0, 0, 16, 2, '#c49a74'); p(3 + v * 3, 5, 5, 3, '#8e6446'); p(4 + v * 3, 5, 3, 1, '#c49a74');
  }));
  t.roadTop = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 30 + v, 16, 16, '#c49b62', ['#ad844e', '#d3ad76'], 10);
    p(0, 0, 16, 1, '#d7b582'); p(0, 3, 16, 1, '#a9804a');
  }));
  t.dirt = V.map((v) => sprite(16, 16, (p) => specks(p, 40 + v, 16, 16, '#a9794c', ['#946640', '#b98a5a'], 12)));
  t.deep = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 50 + v, 16, 16, '#8a5c3a', ['#744b2e', '#9a6a45'], 12);
    p(2 + v * 4, 6, 4, 2, '#6a4429');
  }));
  t.water = sprite(16, 16, (p) => {
    p(0, 0, 16, 16, 'rgba(63,134,180,0.78)');
    p(0, 0, 16, 1, 'rgba(160,215,240,0.9)'); p(3, 4, 4, 1, 'rgba(160,215,240,0.6)'); p(10, 9, 4, 1, 'rgba(160,215,240,0.5)');
  });
  t.cactus = sprite(16, 32, (p) => {
    p(6, 4, 4, 28, '#4a8238'); p(7, 4, 1, 28, '#6aa34d'); p(6, 3, 4, 1, '#5b9443');
    p(1, 12, 5, 3, '#4a8238'); p(1, 6, 3, 7, '#4a8238'); p(2, 6, 1, 6, '#6aa34d');
    p(10, 16, 4, 3, '#4a8238'); p(12, 9, 3, 8, '#4a8238'); p(13, 9, 1, 7, '#6aa34d');
    for (let y = 6; y < 30; y += 4) p(9, y, 1, 1, '#d8e8b0');
  });
  t.rock = V.map((v) => sprite(16, 8, (p) => {
    p(2 + v, 2, 10, 6, '#9a7552'); p(3 + v, 1, 7, 2, '#b08a62'); p(4 + v, 1, 4, 1, '#d2b088'); p(2 + v, 7, 11, 1, '#6e5238');
  }));
  t.bush = sprite(16, 10, (p) => {
    p(2, 4, 12, 6, '#667535'); p(4, 2, 8, 3, '#7d8f45'); p(5, 1, 3, 1, '#9aad5c'); p(10, 3, 2, 1, '#9aad5c');
  });
  t.well = sprite(16, 24, (p) => {
    p(2, 0, 12, 2, '#6b4526'); p(3, 2, 1, 12, '#5a3a1e'); p(12, 2, 1, 12, '#5a3a1e'); p(7, 2, 1, 6, '#a58a5e');
    p(6, 8, 3, 3, '#6b4a2a'); p(1, 14, 14, 10, '#8d8a82'); p(1, 14, 14, 1, '#b3afa5');
    for (let y = 17; y < 24; y += 3) p(1, y, 14, 1, '#76736c');
  });
  t.adit = sprite(24, 26, (p) => {
    p(4, 6, 16, 20, '#140d08'); p(2, 2, 20, 4, '#6b4a2a'); p(2, 2, 20, 1, '#8a6238');
    p(2, 6, 3, 20, '#6b4a2a'); p(19, 6, 3, 20, '#6b4a2a'); p(3, 6, 1, 20, '#8a6238');
    p(7, 22, 10, 1, '#4a3420'); p(8, 18, 1, 5, '#4a3420'); p(15, 18, 1, 5, '#4a3420');
  });
  t.shaft = sprite(24, 20, (p) => {
    p(5, 8, 14, 12, '#120b06'); p(3, 6, 18, 2, '#5a3e22'); p(4, 8, 1, 10, '#5a3e22'); p(18, 9, 1, 8, '#5a3e22');
    p(0, 10, 7, 10, '#667535'); p(17, 12, 7, 8, '#667535'); p(2, 8, 4, 2, '#7d8f45'); p(18, 10, 4, 2, '#7d8f45');
    p(10, 14, 1, 1, '#f2c94c'); p(14, 17, 1, 1, '#f2c94c');
  });
  t.needle = sprite(32, 112, (p) => {
    p(12, 0, 6, 10, '#93624a'); p(10, 10, 10, 30, '#83553c'); p(8, 40, 15, 40, '#744a33'); p(5, 80, 22, 32, '#6a4230');
    p(13, 0, 2, 40, '#c48d6b'); p(11, 40, 2, 70, '#b07a5a'); p(18, 12, 2, 98, '#5a3526');
    p(7, 60, 3, 2, '#5a3526'); p(15, 90, 5, 2, '#5a3526'); p(12, 25, 3, 1, '#5a3526');
  });

  // Gruve
  const g = {};
  const wall = (p, v) => {
    specks(p, 60 + v, 16, 16, '#7d6149', ['#8f7156', '#664d39'], 14);
    p(0, 5 + v, 7, 1, '#5e4634'); p(8, 11 - v, 8, 1, '#5e4634');
  };
  g[M.AIR] = V.map((v) => sprite(16, 16, (p) => specks(p, 70 + v, 16, 16, '#33271d', ['#3d2f24', '#2b2119'], 10)));
  g[M.WALL] = V.map((v) => sprite(16, 16, (p) => wall(p, v)));
  g[M.VEIN] = V.map((v) => sprite(16, 16, (p) => {
    wall(p, v);
    const r = mulberry32(80 + v);
    for (let i = 0; i < 6; i++) p((r() * 14) | 0, (r() * 14) | 0, 2, 1, i % 2 ? '#e9b525' : '#ffd95e');
  }));
  g[M.RICH] = V.map((v) => sprite(16, 16, (p) => {
    wall(p, v);
    const r = mulberry32(90 + v);
    for (let i = 0; i < 12; i++) p((r() * 13) | 0, (r() * 13) | 0, 3, 2, i % 3 ? '#f0bf2e' : '#fff0a0');
  }));
  g[M.BEDROCK] = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 100 + v, 16, 16, '#3a302a', ['#453931', '#2e2621'], 10);
    p(2, 3, 5, 3, '#2e2621'); p(9, 10, 5, 3, '#2e2621');
  }));
  g[M.EXIT] = V.map(() => sprite(16, 16, (p) => {
    p(0, 0, 16, 16, '#e8d29a'); p(0, 12, 16, 4, '#c49b62'); p(0, 0, 2, 16, '#6b4a2a'); p(0, 0, 16, 2, '#6b4a2a');
  }));
  g[M.LADDER] = V.map((v) => sprite(16, 16, (p) => {
    specks(p, 70 + v, 16, 16, '#33271d', ['#3d2f24', '#2b2119'], 10);
    p(3, 0, 2, 16, '#9a7446'); p(11, 0, 2, 16, '#9a7446');
    for (let y = 2; y < 16; y += 5) p(3, y, 10, 2, '#b08855');
  }));
  const timber = sprite(16, 16, (p) => { p(1, 0, 2, 16, '#6b4a2a'); p(13, 0, 2, 16, '#6b4a2a'); p(0, 0, 16, 2, '#7d5832'); });

  return {
    t, g, timber,
    hero: [0, 1, 2, 3].map(hero),
    mule: [0, 1].map(muleSprite),
    snake: [0, 1].map(snakeSprite),
  };
}

function facade(b) {
  // 96x80 falsk front i westernstil med skilt.
  const colors = {
    butikk: ['#9b6a3c', '#85582f'], analyse: ['#8a7a5a', '#766848'], bank: ['#7b6f68', '#655b55'],
    saloon: ['#a0522d', '#86431f'], hotell: ['#6f7d5a', '#5b6849'], stall: ['#8b5a2b', '#744a22'],
  }[b.id];
  return sprite(96, 80, (p, g) => {
    const [wall, line] = colors;
    p(4, 0, 88, 80, wall);
    for (let x = 8; x < 92; x += 6) p(x, 0, 1, 80, line);
    p(4, 0, 88, 3, '#3a2412');
    p(10, 8, 76, 16, '#2a170b'); p(12, 10, 72, 12, '#f3dfae');
    g.fillStyle = '#2a170b'; g.font = 'bold 10px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(b.sign, 48, 16.5);
    p(0, 34, 96, 4, '#5a3a1e'); p(0, 38, 96, 2, '#3a2412');
    p(4, 40, 2, 40, '#5a3a1e'); p(90, 40, 2, 40, '#5a3a1e');
    // vinduer
    for (const wx of [12, 68]) {
      p(wx, 46, 16, 16, '#3a2412'); p(wx + 2, 48, 12, 12, '#3d5a73'); p(wx + 7, 48, 2, 12, '#3a2412'); p(wx + 2, 48, 4, 2, '#7da0bb');
    }
    // dør
    if (b.id === 'saloon') {
      p(38, 44, 20, 36, '#140d08'); p(38, 54, 9, 14, '#c4893f'); p(49, 54, 9, 14, '#c4893f');
    } else if (b.id === 'stall') {
      p(34, 42, 28, 38, '#5a3a1e'); p(36, 44, 24, 36, '#744a22'); p(36, 44, 24, 2, '#3a2412');
      g.strokeStyle = '#3a2412'; g.lineWidth = 2; g.beginPath(); g.moveTo(36, 44); g.lineTo(60, 80); g.moveTo(60, 44); g.lineTo(36, 80); g.stroke();
    } else {
      p(38, 44, 20, 36, '#3a2412'); p(40, 46, 16, 34, '#4d311a'); p(52, 62, 2, 2, '#e8b64a');
    }
    p(0, 78, 96, 2, '#5a3a1e');
  });
}

// ---------- Renderer ----------
// Logikken regner i logiske piksler (16 per rute). Lerretet har RES skjermpiksler per logisk piksel,
// slik at grafikken fra OpenGameArt kan tegnes skarpt i full oppløsning.

function loadImages() {
  const img = {};
  for (const [k, src] of Object.entries(ASSETS)) { const i = new Image(); i.src = src; img[k] = i; }
  return img;
}
const ok = (i) => i && i.complete && i.naturalWidth > 0;

export class Renderer {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.sp = buildSprites();
    this.img = loadImages();
    this.facades = {};
    this.camY = null;
    this.setView(VIEW_W, VIEW_H);
  }

  setView(vw, vh) {
    if (vw === this.vw && vh === this.vh) return false;
    this.vw = vw; this.vh = vh;
    this.c.width = vw * TILE * RES; this.c.height = vh * TILE * RES;
    this.camY = null;
    return true;
  }

  begin() {
    const g = this.g;
    g.setTransform(RES, 0, 0, RES, 0, 0);
    g.imageSmoothingEnabled = false;
    return [this.vw * TILE, this.vh * TILE];
  }

  // Tegner et bilde med føttene (bunnen) i (cx, by), speilet når facing < 0.
  // s er skala: 1.5 for kodetegnede figurer, 1/RES for ferdigskalert grafikk.
  put(img, cx, by, s = 1, facing = 1, anchor = 0.5) {
    const g = this.g;
    const w = (img.naturalWidth || img.width) * s, h = (img.naturalHeight || img.height) * s;
    const x = Math.round((cx - w * (facing < 0 ? 1 - anchor : anchor)) * RES) / RES;
    const y = Math.round((by - h) * RES) / RES;
    if (facing < 0) { g.save(); g.translate(x + w, y); g.scale(-1, 1); g.drawImage(img, 0, 0, w, h); g.restore(); }
    else g.drawImage(img, x, y, w, h);
  }

  heroImg(env) {
    const I = this.img;
    if (!env.onGround && ok(I.hero_jump0)) return I.hero_jump0;
    if (env.moving) { const f = I[`hero_walk${Math.floor(env.walk * 9) % 4}`]; if (ok(f)) return f; }
    const f = I[`hero_idle${Math.floor(env.t * 3) % 4}`];
    return ok(f) ? f : null;
  }

  // s = 1: hver kunstpiksel blir 2 skjermpiksler (ute). s = 0.5: 1 skjermpiksel (i gruva).
  drawHero(env, cx, by, facing, s = 1) {
    const img = this.heroImg(env);
    if (!img) { this.put(this.sp.hero[env.moving ? 1 + (Math.floor(env.walk * 8) % 2) : 0], cx, by, s * 1.5, facing); return; }
    // Figuren står ikke midt i rammen (x ≈ 16 av 50), så ankeret er forskjøvet.
    this.put(img, cx, by + 1 * s, s, facing, 16 / 50);
  }

  sky(hour, dark, W, H) {
    const g = this.g;
    const day = ['#7fb7dd', '#f2d9a4'];
    const dusk = ['#5b3f78', '#f08a4b'];
    const night = ['#0e0c28', '#2a2350'];
    const [top, bot] = dark >= 0.7 ? night : dark > 0 ? dusk : day;
    const grad = g.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, top); grad.addColorStop(1, bot);
    g.fillStyle = grad; g.fillRect(0, 0, W, H);
    if (dark > 0.3) {
      const r = mulberry32(7);
      g.fillStyle = `rgba(255,245,220,${Math.min(1, dark)})`;
      for (let i = 0; i < 70; i++) g.fillRect((r() * W) | 0, (r() * H * 0.6) | 0, 1, 1);
    }
    const isDay = hour >= 6 && hour < 20;
    const f = isDay ? (hour - 6) / 14 : ((hour + 4) % 24) / 10;
    const cx = W * (0.1 + 0.8 * f), cy = H * (0.55 - Math.sin(Math.PI * f) * 0.45);
    g.fillStyle = isDay ? '#fff1b8' : '#ece6cf';
    g.beginPath(); g.arc(cx, cy, 7, 0, Math.PI * 2); g.fill();
    if (!isDay) { g.fillStyle = 'rgba(14,12,40,0.9)'; g.beginPath(); g.arc(cx + 3, cy - 2, 6, 0, Math.PI * 2); g.fill(); }
  }

  mountains(camX, seed, groundY, W) {
    const g = this.g;
    const layers = [[0.12, '#c9a28f', 30, 6], [0.3, '#a8745c', 20, 10]];
    for (const [k, col, amp, sc] of layers) {
      g.fillStyle = col;
      g.beginPath();
      g.moveTo(0, groundY + 200);
      for (let x = 0; x <= W; x += 2) {
        const wx = (x + camX * k) / 4;
        const h = valueNoise(wx, k * 100, seed, sc) * amp + valueNoise(wx, k * 50, seed + 3, sc / 3) * amp * 0.25 + (k > 0.2 ? 8 : 22);
        g.lineTo(x, groundY - h - 20);
      }
      g.lineTo(W, groundY + 200);
      g.fill();
    }
  }

  ground(tr, c, camY, ox, H) {
    const g = this.g, I = this.img;
    const s = tr.surf[c];
    const x = c * TILE + ox;
    const rocky = c > L * 0.6;
    const set = (n) => I[`${rocky ? 'rock' : 'tile'}${n}`];
    const left = c > 0 ? tr.surf[c - 1] : s, right = c < L - 1 ? tr.surf[c + 1] : s;
    if (!ok(set(2))) {
      const v = (hash2(c, 5, 3) * 3) | 0;
      const top = c < TOWN_END ? this.sp.t.roadTop[v] : rocky ? this.sp.t.rockTop[v] : this.sp.t.sandTop[v];
      g.drawImage(top, x, s * TILE - camY);
      for (let row = s + 1; row * TILE - camY < H; row++) g.drawImage(row - s > 3 ? this.sp.t.deep[v] : this.sp.t.dirt[v], x, row * TILE - camY);
      return;
    }
    const topN = left > s && right > s ? 2 : left > s ? 1 : right > s ? 3 : 2;
    g.drawImage(set(topN), x, s * TILE - camY, TILE, TILE);
    for (let row = s + 1; row * TILE - camY < H; row++) {
      const l = left > row, r = right > row;
      g.drawImage(set(l && !r ? 4 : r && !l ? 6 : 5), x, row * TILE - camY, TILE, TILE);
    }
  }

  drawTrail(S, tr, env) {
    const g = this.g;
    const [W, H] = this.begin();
    const camX = Math.max(0, Math.min(L * TILE - W, S.px - W / 2));
    const targetY = Math.max(0, Math.min(TRAIL_H * TILE - H, S.py - H * 0.64));
    this.camY = this.camY == null ? targetY : this.camY + (targetY - this.camY) * 0.12;
    const camY = Math.round(this.camY * RES) / RES;
    const ox = -Math.round(camX * RES) / RES;
    const I = this.img;

    this.sky(env.hour, env.dark, W, H);
    this.mountains(camX, tr.seed, tr.surf[Math.min(L - 1, Math.max(0, Math.floor(S.px / TILE)))] * TILE - camY, W);

    const c0 = Math.max(0, Math.floor(camX / TILE) - 1), c1 = Math.min(L - 1, c0 + this.vw + 2);
    const vis = (c, pad = 3) => c >= c0 - pad && c <= c1 + pad;
    const foot = (c) => tr.surf[c] * TILE - camY;
    const mid = (c) => (c + 0.5) * TILE + ox;

    // Byen
    for (const b of tr.buildings) {
      if (!vis(b.x, 10)) continue;
      if (!this.facades[b.id]) this.facades[b.id] = facade(b);
      this.put(this.facades[b.id], b.x * TILE + ox, foot(b.x), 1.5, 1, 0);
    }
    this.put(this.sp.t.well, mid(tr.well), foot(tr.well), 1.5);
    if (ok(I.crate)) this.put(I.crate, mid(tr.buildings[0].x + 8), foot(0), 1 / RES);
    if (ok(I.signArrow) && vis(TOWN_END + 1)) this.put(I.signArrow, mid(TOWN_END + 1), foot(TOWN_END + 1) + 1, 1 / RES);

    // Landemerker og gruver
    if (vis(tr.needle, 4)) this.put(this.sp.t.needle, mid(tr.needle), foot(tr.needle) + 3, 1.5);
    for (const m of tr.mines) if (vis(m)) this.put(this.sp.t.adit, mid(m), foot(m) + 3, 1.5);
    if (vis(tr.dutch)) {
      if (S.dutchRevealed) this.put(this.sp.t.shaft, mid(tr.dutch), foot(tr.dutch) + 3, 1.5);
      else if (ok(I.bush2)) this.put(I.bush2, mid(tr.dutch), foot(tr.dutch) + 2, 1 / RES);
      else this.put(this.sp.t.bush, mid(tr.dutch), foot(tr.dutch) + 1, 1.5);
    }
    for (const d of tr.decor) if (vis(d.x, 1) && ok(I[d.kind])) this.put(I[d.kind], mid(d.x), foot(d.x) + 3, 1 / RES);

    // Bakken
    for (let c = c0; c <= c1; c++) this.ground(tr, c, camY, ox, H);

    // Kaktuser
    for (const c of tr.cacti) {
      if (!vis(c, 2)) continue;
      const img = c % 2 ? I.cactus1 : I.cactus3;
      if (ok(img)) this.put(img, mid(c), foot(c) + 3, 1 / RES);
      else this.put(this.sp.t.cactus, mid(c), foot(c) + 2, 1);
    }

    // Slanger (bare om dagen)
    if (env.snakes) {
      for (const sn of env.snakes) {
        const c = Math.floor(sn.x / TILE);
        if (!vis(c, 1)) continue;
        this.put(this.sp.snake[Math.floor(env.t * 4) % 2], sn.x + ox, foot(c) + 1, 1.5, sn.dir);
      }
    }

    // Muldyr og helt
    if (S.inv.mule) {
      const mx = S.px - S.facing * 30;
      const mc = Math.max(0, Math.min(L - 1, Math.floor(mx / TILE)));
      this.put(this.sp.mule[env.moving ? Math.floor(env.walk * 6) % 2 : 0], mx + ox, Math.min(S.py, foot(mc) + camY) - camY + 1, 1.5, S.facing);
    }
    const blink = env.invuln > 0 && Math.floor(env.t * 12) % 2;
    if (!blink) this.drawHero(env, S.px + ox, S.py - camY, S.facing);

    // Vann foran føttene
    for (const cr of tr.creeks) {
      for (let c = cr.x0; c <= cr.x1; c++) if (vis(c, 0)) g.drawImage(this.sp.t.water, c * TILE + ox, cr.level * TILE - camY + 4);
    }

    // Natt: mørke med lys rundt Stian
    if (env.dark > 0) {
      const px = S.px + ox, py = S.py - 18 - camY;
      const r0 = S.inv.lantern ? 40 : 16, r1 = S.inv.lantern ? 130 : 70;
      const grad = g.createRadialGradient(px, py, r0, px, py, r1);
      grad.addColorStop(0, `rgba(10,8,34,${(env.dark * 0.25).toFixed(3)})`);
      grad.addColorStop(1, `rgba(10,8,34,${env.dark.toFixed(3)})`);
      g.fillStyle = grad; g.fillRect(0, 0, W, H);
    }
  }

  drawMine(S, mine, radius, env) {
    const g = this.g;
    const [W, H] = this.begin();
    const { x: px, y: py } = S.mine;
    const cx = Math.max(0, Math.min(MINE_W - this.vw, px - (this.vw >> 1)));
    const cy = Math.max(0, Math.min(MINE_H - this.vh, py - (this.vh >> 1)));
    g.fillStyle = '#050403'; g.fillRect(0, 0, W, H);
    for (let vy = 0; vy < this.vh; vy++) {
      for (let vx = 0; vx < this.vw; vx++) {
        const x = cx + vx, y = cy + vy, i = y * MINE_W + x;
        if (x >= MINE_W || y >= MINE_H || !mine.seen[i]) continue;
        const sx = vx * TILE, sy = vy * TILE;
        const t = mine.tiles[i];
        g.drawImage(this.sp.g[t][(hash2(x, y, 77) * 3) | 0], sx, sy);
        if (t === M.AIR && x % 4 === 0 && mine.tiles[i + MINE_W] !== M.AIR && mine.tiles[i - MINE_W] !== M.AIR) {
          g.drawImage(this.sp.timber, sx, sy);
        }
        const lit = mine.lit && mine.lit[i];
        if (lit) { g.fillStyle = 'rgba(255,184,80,0.10)'; g.fillRect(sx, sy, TILE, TILE); }
        const d = Math.hypot(x - px, y - py);
        const a = lit ? Math.max(0, (d - 1) / (radius + 1)) * 0.6 : 0.7;
        g.fillStyle = `rgba(8,5,3,${a.toFixed(3)})`; g.fillRect(sx, sy, TILE, TILE);
      }
    }
    // I de trange stollene tegnes Stian i halv størrelse.
    this.drawHero({ ...env, moving: false, onGround: true }, (px - cx + 0.5) * TILE, (py - cy + 1) * TILE, S.facing, 0.5);
  }
}

export function drawMap(canvas, S, tr) {
  const k = 1, top = 7, ys = 6;
  canvas.width = L * k;
  canvas.height = (TRAIL_H - top) * ys;
  const g = canvas.getContext('2d');
  g.fillStyle = '#1d1838'; g.fillRect(0, 0, canvas.width, canvas.height);
  const Y = (row) => (row - top) * ys;
  for (let x = 0; x < L; x++) {
    if (!S.explored[x]) continue;
    g.fillStyle = x < TOWN_END ? '#c49b62' : x > L * 0.6 ? '#a67a58' : '#dcb77c';
    g.fillRect(x * k, Y(tr.surf[x]), k, canvas.height);
  }
  for (const c of tr.creeks) {
    if (!S.explored[c.x0]) continue;
    g.fillStyle = '#3f86b4'; g.fillRect(c.x0 * k - 1, Y(c.level), (c.x1 - c.x0 + 1) * k + 2, ys);
  }
  const mark = (x, col, h = 10) => {
    g.fillStyle = col; g.fillRect(x * k - 1, Y(tr.surf[x]) - h, k + 2, h);
  };
  for (const b of tr.buildings) mark(b.x + 3, '#6b4226', 8);
  for (const m of tr.mines) if (S.explored[m]) mark(m, '#140d08', 6);
  if (S.explored[tr.needle]) mark(tr.needle, '#f4e9d0', 22);
  if (S.dutchRevealed) mark(tr.dutch, '#f2b632', 8);
  const px = S.mode === 'mine' ? S.mine.wx / TILE : S.px / TILE;
  g.fillStyle = '#e0402a';
  g.fillRect(Math.round(px * k) - 2, Y(tr.surf[Math.floor(px)]) - 14, 4, 12);
}
