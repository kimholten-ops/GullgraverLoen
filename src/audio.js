// Lyd: musikk (by/ørken/game over) og korte effekter. Filene ligger i public/audio/,
// generert fra audio-src/ av scripts/prepare-audio.sh. Kilder og lisenser: se CREDITS.md.

const MUTE_KEY = 'gullgraver-loen:muted';
const base = import.meta.env.BASE_URL;
const url = (name) => `${base}audio/${name}`;

let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* ignorer */ }

const SFX = {
  dig: url('dig.mp3'), blast: url('blast.mp3'), coin: url('coin.mp3'), door: url('door.mp3'),
  splash: url('splash.mp3'), success: url('success.mp3'), click: url('click.mp3'),
  error: url('error.mp3'), hurt: url('hurt.mp3'), jump: url('jump.mp3'),
};
const MUSIC = { town: url('music-town.mp3'), trail: url('music-trail.mp3'), gameover: url('music-gameover.mp3') };
const SFX_VOLUME = { blast: 0.8, coin: 0.6, success: 0.7, hurt: 0.7, click: 0.35, error: 0.5, door: 0.6, splash: 0.5, dig: 0.5, jump: 0.4 };

const sfxPool = {};
export function playSfx(name) {
  if (muted || !SFX[name]) return;
  const el = sfxPool[name] || (sfxPool[name] = new Audio(SFX[name]));
  const a = el.paused ? el : el.cloneNode();
  a.volume = SFX_VOLUME[name] ?? 0.6;
  a.currentTime = 0;
  a.play().catch(() => {});
}

let musicEl = null;
let zone = null;
const MUSIC_VOLUME = 0.32;

export function setMusicZone(z) {
  if (z === zone) return;
  zone = z;
  if (!musicEl) musicEl = new Audio();
  const src = MUSIC[z];
  if (!src) { musicEl.pause(); return; }
  musicEl.loop = z !== 'gameover';
  musicEl.src = src;
  musicEl.volume = muted ? 0 : MUSIC_VOLUME;
  musicEl.currentTime = 0;
  musicEl.play().catch(() => {});
}

export function isMuted() { return muted; }
export function setMuted(v) {
  muted = v;
  try { localStorage.setItem(MUTE_KEY, v ? '1' : '0'); } catch { /* ignorer */ }
  if (musicEl) musicEl.volume = muted ? 0 : MUSIC_VOLUME;
}
export function toggleMuted() { setMuted(!muted); return muted; }
