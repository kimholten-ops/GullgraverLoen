import './style.css';
import {
  M, DIGGABLE, OPEN, PRICES, START_MONEY, RUMORS, TOWN_NAME, HERO, HERO_FIRST, HOME,
  TILE, TRAIL_LEN as L, MIN_PER_TILE, MINE_W, MINE_H,
} from './data.js';
import { hash2 } from './rng.js';
import { generateTrail, generateMine, veinYield, MINE_ENTRY } from './world.js';
import { Renderer, drawMap } from './draw.js';
import { RES } from './assets.js';
import { playSfx, setMusicZone, isMuted, toggleMuted } from './audio.js';

const SAVE_KEY = 'gullgraver-loen:v2';
const $ = (id) => document.getElementById(id);
const renderer = new Renderer($('view'));

let tr = null;          // stien (genereres fra frøet)
let S = null;           // lagret spilltilstand
let panelFn = null;     // aktivt panel
let snakes = [];
const held = { left: false, right: false };
const phys = { vy: 0, kb: 0, onGround: true, invuln: 0, walk: 0, moving: false, t: 0 };

// ---------- Hjelpere ----------

const fmt = (n) => n.toFixed(2).replace('.', ',');
const round2 = (n) => Math.round(n * 100) / 100;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const hour = () => S.min / 60;
const clock = () => `${String(Math.floor(S.min / 60)).padStart(2, '0')}:${String(Math.floor(S.min % 60)).padStart(2, '0')}`;
const isNight = () => hour() < 5.5 || hour() >= 20;
const isDaySnakes = () => hour() >= 7 && hour() < 19;
function darkness() {
  const h = hour();
  if (h >= 6 && h < 18) return 0;
  if (h >= 18 && h < 20) return ((h - 18) / 2) * 0.75;
  if (h >= 5 && h < 6) return (6 - h) * 0.75;
  return 0.75;
}
const goldPrice = () => 16 + Math.floor(hash2(S.day, 3, S.seed) * 5);
const col = () => clamp(Math.floor(S.px / TILE), 0, L - 1);
const groundY = (px) => tr.surf[clamp(Math.floor(px / TILE), 0, L - 1)] * TILE;
const groundUnder = (px) => Math.min(groundY(px - 4), groundY(px + 4));
const canPlay = () => S && !S.over && !panelFn && $('title').hidden;
const near = (x, r = 14) => Math.abs(S.px - (x + 0.5) * TILE) < r;

function toB64(arr) { let s = ''; for (const v of arr) s += String.fromCharCode(v); return btoa(s); }
function fromB64(str, len) {
  const s = atob(str); const a = new Uint8Array(len);
  for (let i = 0; i < len && i < s.length; i++) a[i] = s.charCodeAt(i);
  return a;
}

// ---------- Lagring ----------

let lastSave = 0;
function save() {
  if (!S || S.over) return;
  lastSave = performance.now();
  const mines = {};
  for (const [k, m] of Object.entries(S.mines)) mines[k] = { tiles: toB64(m.tiles), seen: toB64(m.seen) };
  const data = { ...S, explored: toB64(S.explored), mines, log: S.log.slice(0, 6) };
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(data)); } catch { /* lagring utilgjengelig */ }
}
function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    d.explored = fromB64(d.explored, L);
    for (const k of Object.keys(d.mines)) {
      d.mines[k] = { tiles: fromB64(d.mines[k].tiles, MINE_W * MINE_H), seen: fromB64(d.mines[k].seen, MINE_W * MINE_H) };
    }
    return d;
  } catch { return null; }
}
function clearSave() { try { localStorage.removeItem(SAVE_KEY); } catch { /* ignorer */ } }

// ---------- Start ----------

function setupTrail(seed) {
  tr = generateTrail(seed);
  snakes = tr.snakes.map((s) => ({ ...s, x: (s.home + 0.5) * TILE, dir: 1 }));
}

function newGame() {
  const seed = (Math.random() * 2 ** 31) | 0;
  setupTrail(seed);
  S = {
    seed, px: (tr.spawn + 0.5) * TILE, py: 0, facing: 1, dist: 0,
    day: 1, min: 7 * 60, money: START_MONEY, bank: 0, gold: 0, earned: 0,
    health: 100, food: 80, water: 100,
    inv: { pan: true, pick: false, lantern: false, dynamite: 0, mule: false },
    explored: new Uint8Array(L), panned: {}, heard: [], lastRumor: null,
    dutchRevealed: false, dutchFound: false, mode: 'world', mine: null, mines: {},
    over: false, log: [],
  };
  S.py = groundY(S.px);
  reveal();
  log(`${HERO} fra ${HOME} står i ${TOWN_NAME} med $${START_MONEY}, ei gullpanne og en drøm.`);
  log('Gå langs gata og trykk ▲ ved en dør for å gå inn. Fjellene ligger langt mot øst.');
  start();
}

function continueGame(d) {
  S = d;
  setupTrail(S.seed);
  if (S.mode === 'mine') revealMine();
  start();
}

function start() {
  $('title').hidden = true;
  closePanel(true);
  phys.vy = 0; phys.kb = 0; phys.onGround = true;
  refresh();
}

function log(msg) {
  if (S.log[0] === msg) return;
  S.log.unshift(msg);
  S.log.length = Math.min(S.log.length, 6);
}

// ---------- Tid og behov ----------

function pass(minutes) {
  const hrs = minutes / 60;
  const h = hour();
  const hot = S.mode === 'world' && h >= 10 && h < 17;
  S.food = Math.max(0, S.food - hrs * 2);
  S.water = Math.max(0, S.water - hrs * (hot ? 4.5 : S.mode === 'mine' ? 2 : 2.5));
  if (S.food <= 0) S.health -= hrs * 3;
  if (S.water <= 0) S.health -= hrs * 5;
  const before = S.day;
  S.min += minutes;
  while (S.min >= 1440) { S.min -= 1440; S.day++; }
  if (S.day !== before) log(`Dag ${S.day} gryr over ørkenen.`);
  if (S.water <= 0) log('Tunga klistrer seg til ganen. Du trenger vann!');
  else if (S.food <= 0) log('Magen skriker. Du trenger mat!');
  checkDeath();
}

function hurt(n, msg) {
  S.health -= n;
  playSfx('hurt');
  log(`${msg} (−${n} helse)`);
  checkDeath();
}

function checkDeath() {
  if (S.health > 0 || S.over) return;
  S.health = 0;
  S.over = true;
  held.left = held.right = false;
  clearSave();
  const cause = S.water <= 0 ? 'Tørsten tok ham.' : S.food <= 0 ? 'Sulten tok ham.' : 'Ørkenen tok ham.';
  openPanel(() => ({
    title: `${HERO_FIRST} er ikke mer`,
    text: `${cause} Han holdt ut i ${S.day} dager og tjente $${S.earned} på gullet sitt.${S.dutchFound ? ' Men han fant Hollenderens gruve, og det kan ingen ta fra ham.' : ''} Hjemme på ${HOME} venter de fortsatt på brev.`,
    buttons: [{ label: 'Begynn på nytt', act: () => newGame() }],
    locked: true,
  }));
}

// ---------- Utforsking ----------

function reveal() {
  const c = col();
  for (let x = c - 11; x <= c + 11; x++) if (x >= 0 && x < L) S.explored[x] = 1;
  if (!S.dutchRevealed && Math.abs(c - tr.dutch) <= 2) {
    S.dutchRevealed = true;
    log('Bak noen tornebusker skimter du en gammel, gjengrodd sjakt!');
  }
}

const lightRadius = () => (S.inv.lantern ? 4.5 : 1.5);

function revealMine() {
  const m = S.mines[S.mine.key];
  const r = lightRadius(), R = Math.ceil(r);
  const { x: px, y: py } = S.mine;
  m.lit = new Uint8Array(MINE_W * MINE_H);
  for (let dy = -R; dy <= R; dy++) {
    for (let dx = -R; dx <= R; dx++) {
      const x = px + dx, y = py + dy;
      if (x < 0 || y < 0 || x >= MINE_W || y >= MINE_H || Math.hypot(dx, dy) > r) continue;
      if (!lineOfSight(m.tiles, px, py, x, y)) continue;
      m.seen[y * MINE_W + x] = 1;
      m.lit[y * MINE_W + x] = 1;
    }
  }
}

function lineOfSight(tiles, x0, y0, x1, y1) {
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy, x = x0, y = y0;
  while (!(x === x1 && y === y1)) {
    if (!(x === x0 && y === y0) && !OPEN.has(tiles[y * MINE_W + x])) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

// ---------- Ute: sanntid ----------

function stepWorld(dt) {
  phys.t += dt;
  phys.invuln = Math.max(0, phys.invuln - dt);
  const inWater = tr.creekAt(col()) >= 0;
  const dir = (held.right ? 1 : 0) - (held.left ? 1 : 0);
  if (dir) S.facing = dir;
  const speed = (S.inv.mule ? 8 : 5) * TILE * (inWater ? 0.6 : 1);
  phys.moving = dir !== 0;
  if (phys.moving) phys.walk += dt;

  // Vannrett bevegelse med trinn og vegger.
  const oldX = S.px;
  const nx = clamp(S.px + (dir * speed + phys.kb) * dt, 8, L * TILE - 8);
  phys.kb *= Math.pow(0.02, dt);
  const gy = groundUnder(nx);
  if (gy < S.py - (phys.onGround ? 17 : 0)) {
    // for høyt: blokkert
    if (phys.moving && phys.onGround && gy < S.py - 17) setPrompt('▲ Hopp opp');
  } else {
    if (gy < S.py) S.py = gy;
    S.px = nx;
  }

  // Loddrett: tyngdekraft og landing.
  const g2 = groundUnder(S.px);
  if (phys.onGround && S.py < g2 && g2 - S.py <= 17 && phys.vy >= 0) S.py = g2;
  phys.vy += 900 * dt;
  S.py += phys.vy * dt;
  if (S.py >= g2) { S.py = g2; phys.vy = 0; phys.onGround = true; } else phys.onGround = false;

  // Snakker, kaktuser.
  const day = isDaySnakes();
  for (const sn of snakes) {
    sn.x += sn.dir * 18 * dt;
    if (Math.abs(sn.x - (sn.home + 0.5) * TILE) > sn.range * TILE) sn.dir *= -1;
    if (day && phys.invuln <= 0 && Math.abs(sn.x - S.px) < 10 && S.py > groundY(sn.x) - 8) {
      hurt(12, 'En klapperslange hogg deg i leggen!');
      knock(sn.x);
    }
  }
  for (const c of tr.cacti) {
    const cx = (c + 0.5) * TILE;
    if (phys.invuln <= 0 && Math.abs(cx - S.px) < 8 && S.py > groundY(cx) - 32) {
      hurt(4, 'Au! Kaktusnåler i leggen.');
      knock(cx);
    }
  }

  // Avstand blir tid.
  S.dist += Math.abs(S.px - oldX) / TILE;
  while (S.dist >= 1 && !S.over) {
    S.dist -= 1;
    tileWalked(inWater);
  }
  prompt();
  if (performance.now() - lastSave > 4000) save();
}

function knock(fromX) {
  phys.invuln = 1.2;
  phys.kb = (S.px < fromX ? -1 : 1) * 260;
  phys.vy = -160;
  phys.onGround = false;
}

function jump() {
  if (phys.onGround) { phys.vy = -310; phys.onGround = false; playSfx('jump'); }
}

function tileWalked(inWater) {
  pass(MIN_PER_TILE * (S.inv.mule ? 0.5 : 1) * (inWater ? 1.5 : 1));
  reveal();
  if (tr.inTown(col())) return;
  const r = Math.random();
  if (isNight() && r < 0.004 && (S.money > 0 || S.gold > 0)) bandits();
  else if (r > 0.9985) {
    const g = round2(0.1 + Math.random() * 0.2);
    S.gold = round2(S.gold + g);
    log(`Du sparker borti noe som glinser: en liten gullklump! (+${fmt(g)} oz)`);
  }
}

function bandits() {
  const m = Math.ceil(S.money * 0.5);
  const g = round2(S.gold * 0.5);
  S.money -= m;
  S.gold = round2(S.gold - g);
  log(`Banditter i mørket! De rir av gårde med $${m} og ${fmt(g)} oz gull.`);
}

function interactTarget() {
  const b = tr.buildings.find((b) => Math.abs(S.px - (b.x + 4.5) * TILE) < 24);
  if (b) return { label: b.name, act: () => openBuilding(b.id) };
  if (near(tr.well, 16)) return { label: 'Drikk ved brønnen', act: drinkWell };
  const mi = tr.mines.findIndex((m) => near(m));
  if (mi >= 0) return { label: 'Gå inn i gruva', act: () => enterMine(mi) };
  if (S.dutchRevealed && near(tr.dutch)) return { label: 'Gå ned i den gamle sjakta', act: () => enterMine(-1) };
  return null;
}

function interact() {
  const t = phys.onGround && interactTarget();
  if (t) t.act(); else jump();
  refresh();
}

function drinkWell() {
  playSfx('splash');
  S.water = 100;
  pass(5);
  log('Du drikker deg utørst og fyller feltflaska ved brønnen.');
}

let promptText = '';
function setPrompt(t) { promptText = t; }
function prompt() {
  if (S.mode === 'mine') {
    const here = S.mines[S.mine.key].tiles;
    const at = (dx, dy) => here[(S.mine.y + dy) * MINE_W + S.mine.x + dx];
    promptText = at(-1, 0) === M.EXIT ? '◀ Ut av gruva' : S.inv.pick ? 'Gå inn i veggen for å hakke' : 'Du trenger en hakke for å grave';
  } else {
    const t = interactTarget();
    if (t) promptText = `▲ ${t.label}`;
    else if (tr.creekAt(col()) >= 0) promptText = 'Bekk: vask gull eller fyll vann';
    else if (!promptText.startsWith('▲ Hopp')) promptText = '';
  }
  setText('prompt', promptText || ' ');
  if (promptText.startsWith('▲ Hopp')) promptText = '';
}

// ---------- Gruva: ruter og tyngdekraft ----------

function enterMine(i) {
  const key = i < 0 ? 'dutch' : `m${i}`;
  if (!S.mines[key]) {
    const seed = i < 0 ? S.seed ^ 0xd07c : S.seed + (i + 1) * 7919;
    S.mines[key] = { tiles: generateMine(seed, i < 0), seen: new Uint8Array(MINE_W * MINE_H) };
  }
  S.mine = { key, x: MINE_ENTRY.x, y: MINE_ENTRY.y, wx: S.px };
  S.mode = 'mine';
  S.facing = 1;
  held.left = held.right = false;
  revealMine();
  if (i < 0 && !S.dutchFound) {
    S.dutchFound = true;
    log('Du har funnet Hollenderens gruve!');
    openPanel(() => ({
      title: 'Hollenderens gruve',
      text: `Bak tornebuskene åpner det seg en gammel sjakt med morkne stempler. I lyktelyset glitrer veggene. Legenden var sann, og nå er den din, ${HERO_FIRST}.`,
      buttons: [{ label: 'Gå inn', act: () => closePanel() }],
    }));
    return;
  }
  log(S.inv.lantern ? 'Du tenner lykta og går inn i den gamle gruva.' : 'Det er beksvart der inne. En lykt ville hjulpet.');
}

function exitMine() {
  S.px = S.mine.wx;
  S.py = groundY(S.px);
  S.mode = 'world';
  S.mine = null;
  phys.vy = 0; phys.onGround = true;
  log('Du kryper ut i lyset igjen.');
}

const mt = (m, x, y) => m.tiles[y * MINE_W + x];

function mineStep(dx, dy) {
  const m = S.mines[S.mine.key];
  const { x, y } = S.mine;
  if (dx) S.facing = dx;
  const nx = x + dx, ny = y + dy;
  const t = mt(m, nx, ny), here = mt(m, x, y);

  if (t === M.BEDROCK) { log('Grunnfjell. Hakka preller av.'); return; }
  if (t === M.EXIT) { exitMine(); return; }

  if (DIGGABLE.has(t)) {
    if (!S.inv.pick) { log('Du trenger en hakke for å grave her. Hansens handel har.'); return; }
    const gold = dig(m, nx, ny, 1, dy !== 0 ? M.LADDER : M.AIR);
    playSfx(gold > 0.6 ? 'success' : 'dig');
    if (dy < 0 && here === M.AIR) m.tiles[y * MINE_W + x] = M.LADDER;
    pass(45);
    if (S.over) return;
    log(gold > 0 ? `Du hakker løs gullmalm: +${fmt(gold)} oz!` : dy > 0 ? 'Du hakker deg nedover og setter opp en stige.' : dy < 0 ? 'Du hakker deg oppover og setter opp en stige.' : 'Du hakker deg et stykke innover. Bare gråstein.');
    if (Math.random() < 0.012) hurt(10, 'Løs stein raser ned fra taket!');
    if (dy > 0) { S.mine.y = ny; }
    revealMine();
    return;
  }

  // Åpen rute
  if (dy < 0 && here !== M.LADDER) { log('Du når ikke opp uten stige.'); return; }
  S.mine.x = nx; S.mine.y = ny;
  pass(5);
  fall(m);
  revealMine();
}

function fall(m) {
  let n = 0;
  while (mt(m, S.mine.x, S.mine.y) === M.AIR && mt(m, S.mine.x, S.mine.y + 1) === M.AIR) { S.mine.y++; n++; }
  if (n > 3) hurt((n - 3) * 8, `Du faller ${n} favner ned i mørket!`);
}

function dig(m, x, y, factor, becomes) {
  const i = y * MINE_W + x;
  const t = m.tiles[i];
  const seed = S.mine.key === 'dutch' ? S.seed ^ 0xd07c : S.seed + S.mine.key.length;
  const g = round2(veinYield(t, x, y, seed) * factor);
  m.tiles[i] = becomes;
  S.gold = round2(S.gold + g);
  return g;
}

// ---------- Handlinger ----------

function panGold() {
  if (S.mode !== 'world') return log('Det finnes ingen bekk her nede.');
  const ci = tr.creekAt(col());
  if (ci < 0) return log('Du må stå i en bekk for å vaske gull.');
  playSfx('splash');
  pass(60);
  if (S.over) return;
  const n = S.panned[ci] || 0;
  const rich = 0.3 + hash2(ci, 0, S.seed + 11) * 0.7 * (0.6 + tr.creeks[ci].x0 / L);
  const amt = round2((rich ** 3 * 0.5) / (1 + n * 0.35) * (0.4 + Math.random() * 0.9));
  S.panned[ci] = n + 1;
  if (amt < 0.02) log(n > 4 ? 'Denne bekken virker vasket tom. Prøv en annen.' : 'Bare sand og småstein i panna.');
  else { S.gold = round2(S.gold + amt); log(`Det glitrer i panna! +${fmt(amt)} oz gull.`); }
}

function fillWater() {
  if (S.mode !== 'world' || tr.creekAt(col()) < 0) return log('Du finner ikke vann her. Gå til en bekk eller brønnen i byen.');
  playSfx('splash');
  S.water = 100;
  pass(10);
  log('Du drikker og fyller feltflaska i bekken.');
}

function blast() {
  if (S.mode !== 'mine') return log('Spar dynamitten til gruva.');
  if (S.inv.dynamite <= 0) return log('Du har ikke dynamitt. Hansens handel selger det.');
  S.inv.dynamite--;
  const m = S.mines[S.mine.key];
  let gold = 0, n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = S.mine.x + dx, y = S.mine.y + dy;
      if (DIGGABLE.has(mt(m, x, y))) { gold += dig(m, x, y, 0.75, M.AIR); n++; }
    }
  }
  pass(20);
  playSfx('blast');
  log(`BOM! ${n} vegger raser sammen${gold > 0 ? `, og du plukker ${fmt(gold)} oz gull ut av steinene` : ''}.`);
  if (Math.random() < 0.15) hurt(18, 'Taket gir etter og deler av det faller over deg!');
  fall(m);
  revealMine();
}

function camp() {
  if (S.mode === 'mine') return log('Å sove i en gruve er å be om ulykke. Gå ut først.');
  if (tr.inTown(col())) return log('Hotellet ligger rett ved. Seng for $2.');
  const h = hour();
  const sleep = h >= 18 ? (24 - h + 6) * 60 : h < 6 ? (6 - h) * 60 : 6 * 60;
  const fed = S.food > 0 && S.water > 0;
  pass(sleep);
  if (S.over) return;
  if (fed) S.health = clamp(S.health + 30, 0, 100);
  log(`Du slår leir under stjernene og våkner klokka ${clock()}.`);
  if (Math.random() < 0.18 && (S.money > 0 || S.gold > 0)) bandits();
}

// ---------- Bygninger ----------

function buy(price, fn) {
  if (S.money < price) { playSfx('error'); log(`Du har ikke råd. Det koster $${price}.`); return; }
  S.money -= price;
  playSfx('coin');
  fn();
}

const BUILDING_PANELS = {
  butikk: () => ({
    title: 'Hansens handel',
    text: `Hans Hansen fra Voss tørker disken. «Nei, se! En trønder! Hva skal det være, landsmann?» Du har $${S.money}.`,
    buttons: [
      { label: `Proviant, fyll matsekken ($${PRICES.provisions})`, act: () => buy(PRICES.provisions, () => { S.food = 100; log('Matsekken er full av bønner, flesk og kavring.'); }) },
      { label: `Hakke ($${PRICES.pick})`, hide: S.inv.pick, act: () => buy(PRICES.pick, () => { S.inv.pick = true; log('Du kjøper en solid hakke.'); }) },
      { label: `Lykt ($${PRICES.lantern})`, hide: S.inv.lantern, act: () => buy(PRICES.lantern, () => { S.inv.lantern = true; log('Du kjøper en parafinlykt.'); }) },
      { label: `1 dynamittgubbe ($${PRICES.dynamite})`, act: () => buy(PRICES.dynamite, () => { S.inv.dynamite++; }) },
      { label: `5 dynamittgubber ($${PRICES.dynamite * 5})`, act: () => buy(PRICES.dynamite * 5, () => { S.inv.dynamite += 5; }) },
    ],
  }),
  analyse: () => {
    const p = goldPrice();
    const value = Math.floor(S.gold * p);
    return {
      title: 'Analysekontoret',
      text: `Analytikeren skrur opp vekta. Dagens pris er $${p} per unse. Du har ${fmt(S.gold)} oz.`,
      buttons: [{
        label: S.gold >= 0.01 ? `Selg alt gullet for $${value}` : 'Du har ikke noe gull å selge',
        disabled: S.gold < 0.01,
        act: () => { S.money += value; S.earned += value; S.gold = 0; log(`Du selger gullet ditt for $${value}.`); },
      }],
    };
  },
  bank: () => ({
    title: 'Tørrbekk Bank',
    text: `Kassereren ser på deg over brilleglassene. Du har $${S.money} på deg og $${S.bank} i banken. Pengene i banken er trygge for banditter.`,
    buttons: [
      { label: 'Sett inn alt', disabled: S.money <= 0, act: () => { S.bank += S.money; S.money = 0; } },
      { label: 'Ta ut $10', disabled: S.bank < 10, act: () => { S.bank -= 10; S.money += 10; } },
      { label: 'Ta ut alt', disabled: S.bank <= 0, act: () => { S.money += S.bank; S.bank = 0; } },
    ],
  }),
  saloon: () => ({
    title: 'Den tørste mulen',
    text: S.lastRumor || 'Røyk, pianoklimpring og støvete cowboyer. Noen her vet sikkert noe om Hollenderen.',
    buttons: [
      { label: `Kjøp en drink og lytt ($${PRICES.drink})`, act: () => buy(PRICES.drink, () => { pass(30); S.lastRumor = rumor(); }) },
      { label: `Spill poker ($${PRICES.bet} i innsats)`, act: () => buy(PRICES.bet, () => {
        pass(30);
        if (Math.random() < 0.45) { S.money += PRICES.bet * 2; S.lastRumor = `Tre damer! Du vinner $${PRICES.bet * 2}.`; }
        else S.lastRumor = 'Kortene svikter deg. Innsatsen er borte.';
      }) },
    ],
  }),
  hotell: () => ({
    title: 'Dede&Cams Hotell',
    text: `Et rent rom, ei ekte seng og frokost i morgen: $${PRICES.hotel}.`,
    buttons: [{
      label: `Sov til morgenen ($${PRICES.hotel})`,
      act: () => buy(PRICES.hotel, () => {
        const h = hour();
        pass((h < 6 ? 6 - h : 24 - h + 6) * 60);
        if (S.over) return;
        S.health = 100; S.food = Math.min(100, S.food + 25); S.water = 100;
        log(`Du våkner uthvilt på hotellet. Dag ${S.day}, klokka ${clock()}.`);
        closePanel();
      }),
    }],
  }),
  stall: () => ({
    title: 'Ridskolan',
    text: S.inv.mule
      ? 'Brunsi, muldyret ditt, tygger fornøyd på høy. Hun er stelt og klar.'
      : `Et sta, men sterkt muldyr ved navn Brunsi står til salgs: $${PRICES.mule}. Med henne reiser du dobbelt så fort.`,
    buttons: [{
      label: `Kjøp Brunsi ($${PRICES.mule})`, hide: S.inv.mule,
      act: () => buy(PRICES.mule, () => { S.inv.mule = true; log('Brunsi blir med deg. Nå går det unna.'); }),
    }],
  }),
};

function rumor() {
  const heardHint = S.heard.includes('hint');
  if (Math.random() < (heardHint ? 0.15 : 0.35)) {
    if (!heardHint) S.heard.push('hint');
    log(`Rykte: ${tr.hint}`);
    return `En gammel gruvearbeider lener seg nærmere: ${tr.hint}`;
  }
  return `Noen ved baren mumler: «${RUMORS[Math.floor(Math.random() * RUMORS.length)]}»`;
}

function openBuilding(id) {
  S.lastRumor = null;
  held.left = held.right = false;
  playSfx('door');
  openPanel(BUILDING_PANELS[id]);
}

// ---------- Paneler ----------

function openPanel(fn) {
  panelFn = fn;
  renderPanel();
  $('panel').hidden = false;
}

function closePanel(force = false) {
  if (!force && panelFn && panelFn().locked) return;
  if (panelFn) playSfx('click');
  panelFn = null;
  $('panel').hidden = true;
  $('map-wrap').hidden = true;
  refresh();
}

function renderPanel() {
  const p = panelFn();
  $('panel-title').textContent = p.title;
  $('panel-text').textContent = p.text;
  $('panel-close').hidden = !!p.locked;
  const box = $('panel-buttons');
  box.replaceChildren();
  for (const b of p.buttons) {
    if (b.hide) continue;
    const el = document.createElement('button');
    el.className = 'btn';
    el.textContent = b.label;
    el.disabled = !!b.disabled;
    el.addEventListener('click', () => { playSfx('click'); b.act(); if (panelFn) renderPanel(); refresh(); });
    box.append(el);
  }
  (box.querySelector('button:not(:disabled)') || $('panel-close'))?.focus({ preventScroll: true });
}

function openMap() {
  if (!canPlay()) return;
  held.left = held.right = false;
  openPanel(() => ({ title: 'Kartet ditt', text: 'Byen ligger i vest, fjellene i øst. Rødt er deg, svarte merker er gamle gruver, den høye lyse søyla er Nåla.', buttons: [] }));
  $('map-wrap').hidden = false;
  drawMap($('map'), S, tr);
}

// ---------- HUD ----------

const textCache = {};
function setText(id, t) { if (textCache[id] !== t) { textCache[id] = t; $(id).textContent = t; } }
function bar(id, v) {
  const el = $(id);
  el.style.setProperty('--v', `${clamp(v, 0, 100)}%`);
  el.classList.toggle('low', v < 25);
}

let logSig = '';
function updateHud() {
  setText('hud-day', `Dag ${S.day}, ${clock()}`);
  setText('hud-money', `$${S.money}${S.bank ? ` (+$${S.bank} i banken)` : ''}`);
  setText('hud-gold', `${fmt(S.gold)} oz gull`);
  bar('bar-health', S.health); bar('bar-food', S.food); bar('bar-water', S.water);
  const inv = ['Gullpanne'];
  if (S.inv.pick) inv.push('Hakke');
  if (S.inv.lantern) inv.push('Lykt');
  if (S.inv.dynamite) inv.push(`Dynamitt ×${S.inv.dynamite}`);
  if (S.inv.mule) inv.push('Muldyret Brunsi');
  setText('hud-inv', inv.join(', '));
  const sig = S.log.slice(0, 3).join('|');
  if (sig !== logSig) {
    logSig = sig;
    $('log').replaceChildren(...S.log.slice(0, 3).map((m) => { const p = document.createElement('p'); p.textContent = m; return p; }));
  }
  const inMine = S.mode === 'mine';
  const creek = !inMine && tr.creekAt(col()) >= 0;
  $('act-pan').disabled = !creek;
  $('act-water').disabled = !creek;
  $('act-blast').disabled = !inMine || S.inv.dynamite <= 0;
  $('act-camp').disabled = inMine || tr.inTown(col());
  setText('where', inMine ? (S.mine.key === 'dutch' ? 'Hollenderens gruve' : 'En gammel gruve') : tr.inTown(col()) ? TOWN_NAME : col() > L * 0.6 ? 'Fjellfoten' : 'Ørkenen');
  setMusicZone(S.over ? 'gameover' : inMine ? 'mine' : tr.inTown(col()) ? 'town' : 'trail');
}

function refresh() {
  if (!S) return;
  updateHud();
  prompt();
  if (panelFn) renderPanel();
  save();
}

// ---------- Hovedløkke ----------

let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  if (S) {
    if (S.mode === 'world') {
      if (canPlay()) stepWorld(dt);
      renderer.drawTrail(S, tr, {
        hour: hour(), dark: darkness(), snakes: isDaySnakes() ? snakes : null,
        t: phys.t, invuln: phys.invuln, onGround: phys.onGround, moving: phys.moving && canPlay(), walk: phys.walk,
      });
    } else {
      renderer.drawMine(S, S.mines[S.mine.key], lightRadius(), { t: phys.t, walk: 0 });
    }
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Kontroller ----------

const KEYMAP = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
  ArrowUp: 'up', w: 'up', ' ': 'up', ArrowDown: 'down', s: 'down',
};
const VEC = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
const ACTIONS = { v: panGold, f: fillWater, x: blast, l: camp };

function press(dir) {
  if (!canPlay()) return;
  if (S.mode === 'world') {
    if (dir === 'left' || dir === 'right') held[dir] = true;
    else if (dir === 'up') interact();
  } else {
    mineStep(...VEC[dir]);
    refresh();
  }
}
function release(dir) { if (dir in held) held[dir] = false; }

function act(fn) {
  if (!canPlay()) return;
  fn();
  refresh();
}

document.addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (k === 'Escape') { if (panelFn) closePanel(); return; }
  if (!$('title').hidden || panelFn) return;
  const dir = KEYMAP[k];
  if (dir) {
    e.preventDefault();
    if (e.repeat && S?.mode === 'world') return;
    press(dir);
    return;
  }
  if (ACTIONS[k]) { e.preventDefault(); act(ACTIONS[k]); return; }
  if (k === 'm') { e.preventDefault(); openMap(); }
});
document.addEventListener('keyup', (e) => {
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if (KEYMAP[k]) release(KEYMAP[k]);
});
window.addEventListener('blur', () => { held.left = held.right = false; });

// Styrekors: holdes inne for å gå ute, gjentar steg i gruva.
let repeat = null;
function stopRepeat() { clearTimeout(repeat); repeat = null; }
document.querySelectorAll('[data-dir]').forEach((btn) => {
  const dir = btn.dataset.dir;
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    btn.setPointerCapture?.(e.pointerId);
    press(dir);
    stopRepeat();
    if (S?.mode === 'mine') {
      const loop = (delay) => { repeat = setTimeout(() => { if (S?.mode === 'mine') press(dir); loop(170); }, delay); };
      loop(350);
    }
  });
  const up = () => { stopRepeat(); release(dir); };
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((ev) => btn.addEventListener(ev, up));
});

$('act-pan').addEventListener('click', () => act(panGold));
$('act-water').addEventListener('click', () => act(fillWater));
$('act-blast').addEventListener('click', () => act(blast));
$('act-camp').addEventListener('click', () => act(camp));
$('act-map').addEventListener('click', () => openMap());
$('panel-close').addEventListener('click', () => closePanel());
$('panel').addEventListener('click', (e) => { if (e.target === $('panel')) closePanel(); });

// ---------- Skalering ----------

function fit() {
  const stage = $('stage');
  const c = $('view');
  const px = TILE * RES; // skjermpiksler per rute ved 1:1-skala
  // Vis minst det opprinnelige utsynet (18×10 ruter); på større vinduer vises mer av verden
  // i stedet for at pikslene bare blåses opp.
  const vw = clamp(Math.round(stage.clientWidth / px), 18, 40);
  const vh = clamp(Math.round(stage.clientHeight / px), 10, 24);
  renderer.setView(vw, vh);
  const k = Math.min(stage.clientWidth / c.width, stage.clientHeight / c.height);
  const scale = k >= 2 ? Math.floor(k) : k;
  c.style.width = `${Math.floor(c.width * scale)}px`;
  c.style.height = `${Math.floor(c.height * scale)}px`;
}
new ResizeObserver(fit).observe($('stage'));
fit();

// ---------- Tittelskjerm ----------

const saved = loadSave();
$('btn-continue').hidden = !saved;
$('btn-continue').addEventListener('click', () => continueGame(saved));
$('btn-new').addEventListener('click', newGame);
(saved ? $('btn-continue') : $('btn-new')).focus();

// ---------- Lyd ----------

function updateMuteBtn() {
  const m = isMuted();
  $('btn-mute').textContent = m ? '🔇' : '🔊';
  $('btn-mute').setAttribute('aria-label', m ? 'Skru på lyd' : 'Skru av lyd');
}
$('btn-mute').addEventListener('click', () => { toggleMuted(); updateMuteBtn(); });
updateMuteBtn();
