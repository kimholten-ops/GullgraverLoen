// Prosedyregenerering av stien (sidevisning) og gruvene (tverrsnitt).
import { mulberry32, hash2, valueNoise } from './rng.js';
import {
  M, BUILDINGS, TRAIL_LEN as L, TOWN_END, TOWN_GROUND, MINE_W, MINE_H,
} from './data.js';

export function generateTrail(seed) {
  const rng = mulberry32(seed);
  const surf = new Int8Array(L); // radnummer for bakkeoverflaten (y nedover)

  // 1. Terreng: flatt i byen, bølgende ørken, stigende fjellfot i øst.
  for (let x = 0; x < L; x++) {
    if (x < TOWN_END) { surf[x] = TOWN_GROUND; continue; }
    const t = (x - TOWN_END) / (L - TOWN_END);
    const hill = valueNoise(x, 0, seed, 11) * 3 + valueNoise(x, 0, seed + 1, 4) * 1.4;
    const rise = t < 0.55 ? 0 : ((t - 0.55) / 0.45) * 7;
    const ramp = Math.min(1, (x - TOWN_END) / 12);
    surf[x] = Math.max(8, Math.min(20, Math.round(TOWN_GROUND + (1.5 - hill) * ramp - rise)));
  }

  // 2. Bekker: små søkk med vann.
  const creeks = [];
  for (let tries = 0; creeks.length < 6 && tries < 200; tries++) {
    const x0 = TOWN_END + 12 + Math.floor(rng() * (L - TOWN_END - 30));
    const w = 4 + Math.floor(rng() * 3);
    if (creeks.some((c) => Math.abs(c.x0 - x0) < 32)) continue;
    const bank = Math.max(surf[x0 - 1], surf[x0 + w]);
    surf[x0 - 1] = bank; surf[x0 + w] = bank;
    for (let x = x0; x < x0 + w; x++) surf[x] = bank + 1;
    creeks.push({ x0, x1: x0 + w - 1, level: bank });
  }
  creeks.sort((a, b) => a.x0 - b.x0);
  const inCreek = (x, pad = 0) => creeks.some((c) => x >= c.x0 - 1 - pad && x <= c.x1 + 1 + pad);

  // 3. Maks to ruters trinn, så alt kan nås med et hopp.
  const fixed = (x) => x < TOWN_END || inCreek(x);
  for (let pass = 0; pass < 4; pass++) {
    for (let x = 1; x < L; x++) {
      if (fixed(x)) continue;
      if (surf[x] < surf[x - 1] - 2) surf[x] = surf[x - 1] - 2;
      if (surf[x] > surf[x - 1] + 2) surf[x] = surf[x - 1] + 2;
    }
    for (let x = L - 2; x >= 0; x--) {
      if (fixed(x)) continue;
      if (surf[x] < surf[x + 1] - 2) surf[x] = surf[x + 1] - 2;
      if (surf[x] > surf[x + 1] + 2) surf[x] = surf[x + 1] + 2;
    }
  }

  // 4. Byen.
  // Fasadene er 9 ruter brede; døra står midt på (x + 4.5).
  const buildings = BUILDINGS.map((b, i) => ({ ...b, x: 3 + i * 10 }));
  const well = 1;
  const spawn = 4;

  // 5. Plassering av ting langs stien.
  const taken = [];
  const free = (x, gap) => !inCreek(x, 1) && !taken.some((t) => Math.abs(t - x) < gap);
  const place = (lo, hi, gap, tries = 300) => {
    for (let i = 0; i < tries; i++) {
      const x = Math.floor(lo + rng() * (hi - lo));
      if (free(x, gap)) { taken.push(x); return x; }
    }
    return -1;
  };

  const needle = place(L * 0.72, L * 0.86, 6);
  const dir = rng() < 0.5 ? -1 : 1;
  let dutch = -1;
  for (let i = 0; i < 200 && dutch < 0; i++) {
    const x = needle + dir * (8 + Math.floor(rng() * 14));
    if (x > TOWN_END + 20 && x < L - 4 && free(x, 5)) { dutch = x; taken.push(x); }
  }
  if (dutch < 0) dutch = place(L * 0.6, L - 4, 3);

  const mines = [];
  for (let i = 0; i < 7; i++) {
    const x = place(L * 0.42, L - 6, 16);
    if (x > 0) mines.push(x);
  }
  mines.sort((a, b) => a - b);

  const cacti = [];
  for (let i = 0; i < 34; i++) {
    const x = place(TOWN_END + 4, L - 3, 4);
    if (x > 0) cacti.push(x);
  }
  // Pynt: steiner, gress, busker og en og annen hodeskalle.
  const KINDS = ['stone', 'grass1', 'grass2', 'bush1', 'bush2', 'stone', 'grass1', 'skull'];
  const decor = [];
  for (let x = TOWN_END + 2; x < L - 1; x++) {
    if (inCreek(x) || taken.some((t) => Math.abs(t - x) < 2)) continue;
    const h = hash2(x, 1, seed);
    if (h > 0.87) decor.push({ x, kind: KINDS[Math.floor(hash2(x, 2, seed) * KINDS.length)] });
  }

  const snakes = [];
  for (let i = 0; i < 16; i++) {
    const x = Math.floor(TOWN_END + 10 + rng() * (L - TOWN_END - 16));
    if (!inCreek(x, 3)) snakes.push({ home: x, range: 2 + Math.floor(rng() * 3) });
  }

  const dist = Math.abs(dutch - needle);
  const hint = `«Hollenderen gikk alltid ut fra Nåla. Rett ${dutch > needle ? 'øst' : 'vest'} derfra, ${dist <= 12 ? 'et kvarters gange' : 'en halvtimes gange'}.»`;

  return {
    seed, surf, creeks, buildings, well, spawn, needle, dutch, mines, cacti, decor, snakes, hint,
    creekAt: (x) => creeks.findIndex((c) => x >= c.x0 && x <= c.x1),
    inTown: (x) => x < TOWN_END,
  };
}

// ---------- Gruver (tverrsnitt) ----------

export const MINE_ENTRY = { x: 2, y: 3 };

export function generateMine(seed, rich) {
  const w = MINE_W, h = MINE_H;
  const rng = mulberry32(seed);
  const t = new Uint8Array(w * h).fill(M.WALL);
  const idx = (x, y) => y * w + x;
  const inside = (x, y) => x > 0 && y > 0 && x < w - 1 && y < h - 1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!inside(x, y) || y < 2) t[idx(x, y)] = M.BEDROCK;
      else if (hash2(x, y, seed + 9) > 0.96) t[idx(x, y)] = M.BEDROCK;
    }
  }
  const air = [];
  const carve = (x, y, kind = M.AIR) => {
    if (!inside(x, y) || y < 2) return false;
    const i = idx(x, y);
    if (t[i] === M.LADDER) return true;
    t[i] = kind;
    if (kind === M.AIR) air.push([x, y]);
    return true;
  };
  // Stoll inn fra fjellsiden.
  t[idx(1, 3)] = M.EXIT;
  const len0 = 8 + Math.floor(rng() * 10);
  for (let x = 2; x < 2 + len0; x++) carve(x, 3);
  // Sjakter ned og nye stoller ut fra bunnen.
  const levels = rich ? 3 : 5;
  for (let n = 0; n < levels; n++) {
    const cands = air.filter(([x, y]) => x > 3 && y < h - 8);
    if (!cands.length) break;
    const [sx, sy] = cands[Math.floor(rng() * cands.length)];
    const depth = 4 + Math.floor(rng() * 6);
    let y = sy;
    for (let d = 0; d < depth; d++) { carve(sx, y, M.LADDER); y++; }
    carve(sx, y, M.LADDER);
    const dir = rng() < 0.5 ? -1 : 1;
    const len = 4 + Math.floor(rng() * 10);
    for (let d = 1; d <= len; d++) if (!carve(sx + dir * d, y)) break;
  }
  // Gullårer: rikere jo dypere du kommer.
  for (let y = 2; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = idx(x, y);
      if (t[i] !== M.WALL) continue;
      const n = valueNoise(x, y, seed + 5, 3);
      const depth = y / h;
      if (rich) {
        if (n > 0.8 - depth * 0.08) t[i] = M.RICH;
        else if (n > 0.64) t[i] = M.VEIN;
      } else if (n > 0.8 - depth * 0.1) t[i] = M.VEIN;
    }
  }
  return t;
}

export function veinYield(type, x, y, seed) {
  const r = hash2(x, y, seed + 21);
  const deep = 1 + (y / MINE_H) * 0.8;
  if (type === M.RICH) return (0.8 + r * 1.2) * deep;
  if (type === M.VEIN) return (0.06 + r * 0.2) * deep;
  return 0;
}
