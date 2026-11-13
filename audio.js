// Audio procedural (Web Audio): música y efectos sin archivos externos + reproductor de la canción del usuario.
let ctx, master, timer, song = null;
const hz = m => 440 * 2 ** ((m - 69) / 12);
export function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = .5; master.connect(ctx.destination);
}
function note(f, t, d, type = 'sine', v = .12) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = f;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .03); g.gain.exponentialRampToValueAtTime(.0001, t + d);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + d + .05);
}
const SONGS = {
  forest: { s: [0, 4, 7, 12, 9, 7, 4, 2, 0, 5, 9, 12, 11, 9, 5, 4], r: 64, t: .3, ty: 'triangle' },
  plain:  { s: [0, 7, 9, 7, 4, 7, 2, 4, 0, 7, 12, 9, 7, 4, 2, 0], r: 62, t: .38, ty: 'triangle' },
  temple: { s: [0, 3, 7, 10, 7, 3, 0, -2, 0, 3, 8, 12, 8, 3, 0, -4], r: 55, t: .55, ty: 'sine' },
  time:   { s: [0, 7, 12, 16, 19, 16, 12, 7], r: 60, t: .45, ty: 'sine' },
  riddle: { s: [0, 5, 7, 12, 7, 5, 3, 2], r: 57, t: .6, ty: 'sine' },
  love:   { s: [0, 4, 7, 11, 12, 11, 7, 4, 2, 5, 9, 12, 14, 12, 9, 5], r: 60, t: .5, ty: 'sine' }
};
export function music(name) {
  if (!ctx) return; clearInterval(timer); if (!name) return;
  const d = SONGS[name]; let i = 0;
  timer = setInterval(() => {
    if (song && !song.paused) return;
    const t = ctx.currentTime + .05, n = d.s[i % d.s.length];
    note(hz(d.r + n), t, d.t * 2.4, d.ty, .11);
    if (i % 8 === 0) note(hz(d.r - 12 + d.s[0]), t, d.t * 8, 'sine', .1);
    if (i % 4 === 2) note(hz(d.r + n + 7), t, d.t * 3, 'sine', .04);
    i++;
  }, d.t * 1000);
}
const FX = {
  jump: [[440, 0, .1, 'square', .05], [660, .06, .1, 'square', .05]],
  coin: [[880, 0, .1, 'square', .06], [1320, .08, .2, 'square', .06]],
  chest: [[392, 0, .15, 'triangle', .1], [523, .12, .15, 'triangle', .1], [659, .24, .15, 'triangle', .1], [784, .36, .5, 'triangle', .1]],
  err: [[160, 0, .3, 'sawtooth', .08], [120, .12, .3, 'sawtooth', .08]],
  hit: [[200, 0, .15, 'sawtooth', .1], [100, .05, .2, 'square', .08]],
  slash: [[900, 0, .08, 'sawtooth', .04], [500, .05, .1, 'sawtooth', .04]],
  ok: [[523, 0, .2, 'sine', .12], [659, .15, .2, 'sine', .12], [784, .3, .2, 'sine', .12], [1047, .45, .6, 'sine', .12]],
  magic: [[330, 0, 1.5, 'sine', .12], [495, .3, 1.5, 'sine', .1], [660, .6, 1.5, 'sine', .1], [990, .9, 2, 'sine', .1], [1320, 1.2, 2.5, 'sine', .08]]
};
export function sfx(k) { if (!ctx) return; const t = ctx.currentTime; (FX[k] || []).forEach(([f, dt, d, ty, v]) => note(f, t + dt, d, ty, v)); }
export function setSong(file) { if (song) song.pause(); song = new Audio(URL.createObjectURL(file)); song.loop = true; return file.name; }
export function hasSong() { return !!song; }
export function playSong() { if (!song) return false; clearInterval(timer); song.currentTime = 0; song.play().catch(() => {}); return true; }
