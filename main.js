import * as THREE from 'three';
import * as A from './audio.js';
const $ = i => document.getElementById(i), V = THREE.Vector3;
const M = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: .85, flatShading: true, ...o });
const B = (w, h, d) => new THREE.BoxGeometry(w, h, d), wait = ms => new Promise(r => setTimeout(r, ms));
let _s = 11; const rnd = () => (_s = _s * 16807 % 2147483647) / 2147483647;

// ---------- Motor ----------
const R = new THREE.WebGLRenderer({ antialias: true });
R.setPixelRatio(Math.min(devicePixelRatio, 1.5)); R.setSize(innerWidth, innerHeight);
R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap; $('game').appendChild(R.domElement);
const scene = new THREE.Scene(), cam = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, .1, 500);
addEventListener('resize', () => { R.setSize(innerWidth, innerHeight); cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix(); });
const sun = new THREE.DirectionalLight(0xffffff, 2.2), hemi = new THREE.HemisphereLight(0xbfe3ff, 0x4a6b2f, 1.1);
sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, far: 140 });
scene.add(sun, sun.target, hemi);

let W = new THREE.Group(); scene.add(W);
let C = [], I = [], K = [], U = [], En = [], bound = 30, cin = null, time = 0;
const PS = [], keys = {}, G = { lvl: 0, frag: 0, lf: 0, gems: 0, play: false, paused: false, ui: false, inv: [], onFrag: null };
const P = { pos: new V(), vy: 0, yaw: 0, pitch: .35, hp: 5, lock: true, atk: 0, inv: 0, adult: false, face: 0, on: true, spawn: [0, 0], model: null, run: 0 };

// ---------- Utilidades de construcción ----------
function mk(geo, mat, x = 0, y = 0, z = 0, parent = W) { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m; }
function tex(a, b, rep, n = 900, grid = 0) {
  const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
  g.fillStyle = a; g.fillRect(0, 0, 256, 256); g.fillStyle = b;
  for (let i = 0; i < n; i++) { g.globalAlpha = .12 + .25 * Math.random(); const s = 2 + Math.random() * 5; g.fillRect(Math.random() * 256, Math.random() * 256, s, s * (1 + Math.random() * 2)); }
  g.globalAlpha = 1; if (grid) { g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(0, 0, 256, 256); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.colorSpace = THREE.SRGBColorSpace; return t;
}
const sky = (c, n, f) => { scene.background = new THREE.Color(c); scene.fog = new THREE.Fog(c, n, f); };
function ground(r, t, y = 0) { const g = new THREE.Mesh(new THREE.CircleGeometry(r, 48), M(0xffffff, { map: t, flatShading: false })); g.rotation.x = -Math.PI / 2; g.position.y = y; g.receiveShadow = true; W.add(g); return g; }
const addCircle = (x, z, r, h = 99) => { const c = { x, z, r, h }; C.push(c); return c; };
const addBox = (x, z, w, d, h) => { const b = { x, z, w, d, h }; C.push(b); return b; };
function solid(x, z, w, d, h, mat, y0 = 0) { const m = mk(B(w, h, d), mat, x, y0 + h / 2, z); return addBox(x, z, w, d, h + y0); }
function tree(x, z, s = 1, col = 0x2e7d32) {
  mk(new THREE.CylinderGeometry(.28 * s, .4 * s, 2.6 * s, 6), M(0x6b4423), x, 1.3 * s, z); const c = M(col);
  mk(new THREE.IcosahedronGeometry(1.9 * s, 0), c, x, 3.9 * s, z); mk(new THREE.IcosahedronGeometry(1.3 * s, 0), c, x + .4 * s, 5.4 * s, z - .2 * s); addCircle(x, z, .7 * s);
}
function rock(x, z, s = 1) { mk(new THREE.IcosahedronGeometry(s, 0), M(0x7d8590), x, s * .6, z).rotation.set(rnd() * 3, rnd() * 3, 0); addCircle(x, z, s * .85, s); }
function mountains(col = 0x6f86a8, r = 150) { for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283 + rnd() * .2, h = 30 + rnd() * 35, w = 22 + rnd() * 18, x = Math.cos(a) * r, z = Math.sin(a) * r; mk(new THREE.ConeGeometry(w, h, 6), M(col), x, h / 2 - 2, z); mk(new THREE.ConeGeometry(w * .35, h * .3, 6), M(0xf2f6ff), x, h * .85 - 2, z); } }
function flowers(n, rad, avoid = () => false) {
  const im = new THREE.InstancedMesh(new THREE.SphereGeometry(.13, 5, 4), new THREE.MeshBasicMaterial(), n), d = new THREE.Object3D(), cols = [0xffffff, 0xff7aa8, 0xffe14d, 0xb48bff];
  for (let i = 0; i < n; i++) { let x, z; do { const a = rnd() * 6.283, r = Math.sqrt(rnd()) * rad; x = Math.cos(a) * r; z = Math.sin(a) * r; } while (avoid(x, z)); d.position.set(x, .15, z); d.updateMatrix(); im.setMatrixAt(i, d.matrix); im.setColorAt(i, new THREE.Color(cols[i % 4])); }
  W.add(im);
}
function amb(col, n, rad, h, size = .15) {
  const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = (rnd() - .5) * rad * 2; a[i * 3 + 1] = rnd() * h; a[i * 3 + 2] = (rnd() - .5) * rad * 2; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const p = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size, transparent: true, opacity: .8, depthWrite: false, blending: THREE.AdditiveBlending })); W.add(p);
  U.push(() => { p.position.set(P.pos.x, 0, P.pos.z); p.rotation.y = time * .05; p.material.opacity = .6 + Math.sin(time * 2) * .3; });
}
function burst(p, col, n = 30, sp = 4, up = 3, life = 1, grav = 4) {
  const a = new Float32Array(n * 3), v = []; for (let i = 0; i < n; i++) { a.set([p.x, p.y, p.z], i * 3); v.push([(rnd() - .5) * sp, rnd() * up, (rnd() - .5) * sp]); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(a, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ color: col, size: .28, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; scene.add(pts); PS.push({ pts, a, v, life, t: 0, grav });
}
const beam = (x, z, col, h = 16, y = 0, par = W) => mk(new THREE.CylinderGeometry(.5, .5, h, 12, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), x, y + h / 2, z, par);
function tween(d, f, done) { let t = 0; const u = dt => { t += dt; f(Math.min(t / d, 1)); if (t >= d) { U.splice(U.indexOf(u), 1); done && done(); } }; U.push(u); }

// ---------- Personajes (modelos 3D originales) ----------
function fig(o) {
  const g = new THREE.Group(), u = {}, m = c => M(c);
  u.legs = [-.15, .15].map(x => { const l = new THREE.Group(); l.position.set(x, .8, 0); g.add(l); mk(B(.24, .75, .28), m(o.pants), 0, -.38, 0, l); mk(B(.28, .18, .4), m(0x5b3a1e), 0, -.74, .06, l); return l; });
  if (o.dress) mk(new THREE.CylinderGeometry(.24, .64, 1, 14), m(o.dress), 0, .85, 0, g);
  mk(new THREE.CylinderGeometry(.3, .38, .8, 12), m(o.tunic), 0, 1.25, 0, g); mk(new THREE.CylinderGeometry(.39, .39, .1, 12), m(0x6b4423), 0, 1.0, 0, g);
  mk(new THREE.SphereGeometry(.32, 14, 10), m(o.skin), 0, 1.8, 0, g);
  [-.11, .11].forEach(x => mk(new THREE.SphereGeometry(.05, 6, 6), m(0x1a2a5a), x, 1.82, .29, g));
  if (o.hat) { mk(new THREE.SphereGeometry(.35, 12, 8), m(o.hat), 0, 1.95, -.03, g).scale.y = .7; const c = mk(new THREE.ConeGeometry(.33, o.adult ? 1 : 1.3, 8), m(o.hat), 0, 2.2, -.3, g); c.rotation.x = -1.0; mk(B(.3, .12, .1), m(0xe8c96a), 0, 2.0, .3, g); [-1, 1].forEach(s => { const e = mk(new THREE.ConeGeometry(.07, .3, 5), m(o.skin), s * .36, 1.8, 0, g); e.rotation.z = -s * 1.4; }); }
  else { mk(new THREE.SphereGeometry(.36, 12, 8), m(o.hair), 0, 1.86, -.07, g); mk(new THREE.CylinderGeometry(.3, .22, 1.0, 8), m(o.hair), 0, 1.4, -.2, g); mk(new THREE.SphereGeometry(.1, 6, 6), m(0xff7aa8), .22, 2.0, .15, g); }
  [-1, 1].forEach(s => { const a = new THREE.Group(); a.position.set(s * .44, 1.5, 0); g.add(a); mk(B(.18, .65, .18), m(o.tunic), 0, -.3, 0, a); mk(new THREE.SphereGeometry(.1, 6, 6), m(o.skin), 0, -.66, 0, a); u[s > 0 ? 'armR' : 'armL'] = a; });
  if (o.sword) { mk(B(.07, .05, .95), m(0xdfe8f2), 0, -.66, .55, u.armR); mk(B(.3, .06, .08), m(0xc9a24a), 0, -.66, .08, u.armR); }
  if (o.shield) mk(B(.08, .55, .42), m(0x2e4a9e), -.12, -.45, .1, u.armL);
  g.scale.setScalar(o.s || 1); g.userData = u; return g;
}
const linkOpts = a => ({ tunic: a ? 0x1f7a36 : 0x2f9e44, pants: 0xf2ead0, skin: 0xf2c29b, hat: a ? 0x1f7a36 : 0x2f9e44, adult: a, s: a ? 1.08 : .78, sword: 1, shield: a });
function setAdult(a) { if (P.model) scene.remove(P.model); P.adult = a; P.model = fig(linkOpts(a)); scene.add(P.model); }
const fairy = new THREE.Group(); { const s = new THREE.Mesh(new THREE.SphereGeometry(.14, 8, 8), new THREE.MeshBasicMaterial({ color: 0xbff4ff })); fairy.add(s, new THREE.PointLight(0x9fe8ff, 6, 9, 2)); scene.add(fairy); }
const npc = (x, z, o, y = 0) => { const f = fig(o); f.position.set(x, y, z); W.add(f); return f; };

// ---------- Interfaz ----------
const hud = () => { $('hearts').textContent = '♥'.repeat(Math.max(P.hp, 0)); $('frag').textContent = `Recuerdos ${G.frag}/8`; $('items').textContent = G.lvl === 2 ? `Gemas ${G.gems}/3` : ''; $('inv').innerHTML = G.inv.map(i => `<span>${i}</span>`).join(''); };
const quest = t => { $('quest').innerHTML = '<b>Misión:</b> ' + t; };
let mq = [], busy = false;
function say(t, ms = 5200) { mq.push([t, ms]); if (!busy) nextMsg(); }
function nextMsg() { const e = mq.shift(); if (!e) { busy = false; $('msg').classList.remove('on'); return; } busy = true; $('msg').innerHTML = e[0]; $('msg').classList.add('on'); setTimeout(nextMsg, e[1]); }
const MEM = [
  'Hace un tiempo, en una noche de agosto, dos personas empezaron a escribirse…',
  'La conversación no se detenía: cada respuesta pedía otra.',
  'Cuando miraron, ya estaba amaneciendo. Ninguna quería despedirse.',
  'En un lado del mapa está Colombia. En el otro, Panamá. Entre las dos, un mismo camino.',
  'Cada mensaje tuyo es una luz que enciende mi bosque, aunque estemos lejos.',
  'La distancia pesa, pero la ilusión de encontrarnos pesa mucho más.',
  'Imagino el día en que no haya pantalla entre nosotras.',
  'Y ese día, por fin, estaremos juntas… y tengo una canción preparada.'];
function getFrag() { const m = MEM[G.frag++]; G.lf++; G.inv.push('Recuerdo ' + G.frag); A.sfx('ok'); burst(new V(P.pos.x, P.pos.y + 1.5, P.pos.z), 0xffe08a, 40, 5, 4, 1.4); hud(); say(`<b>✦ Fragmento de recuerdo ${G.frag}/8 ✦</b><br>${m}`, 7500); G.onFrag && G.onFrag(); }
function damage() { if (P.inv > 0 || P.lock) return; P.hp--; P.inv = 1.3; A.sfx('hit'); if (P.hp <= 0) { P.hp = 5; P.pos.set(P.spawn[0], 0, P.spawn[1]); say('Has caído… pero un héroe siempre se levanta.', 3000); } hud(); }

// ---------- Objetos de juego ----------
function pick(m, fn, r = 1.4) { K.push({ m, x: m.position.x, z: m.position.z, y: m.position.y, fn, r, got: false }); }
function fragObj(x, z, y = 1.2) { const g = new THREE.Group(); g.position.set(x, y, z); W.add(g); mk(new THREE.OctahedronGeometry(.45), M(0xffd24a, { emissive: 0xffb300, emissiveIntensity: 1.2 }), 0, 0, 0, g); beam(0, 0, 0xffe08a, 14, -y, g); pick(g, getFrag); return g; }
function gemObj(x, z, y = .7) { const g = mk(new THREE.IcosahedronGeometry(.3), M(0x3fa8ff, { emissive: 0x2277ff, emissiveIntensity: 1 }), x, y, z); pick(g, () => { G.gems++; G.inv.push('Gema azul'); A.sfx('coin'); hud(); if (G.gems === 3) say('Has encontrado las 3 gemas escondidas. Brillan como las estrellas de aquella madrugada.', 5000); }); }
function chest(x, z, y, onOpen) {
  const g = new THREE.Group(); g.position.set(x, y, z); W.add(g); mk(B(1.1, .6, .8), M(0x8a5a2b), 0, .3, 0, g);
  const lid = new THREE.Group(); lid.position.set(0, .6, -.4); g.add(lid); mk(B(1.1, .25, .8), M(0xa06a30), 0, .12, .4, lid); mk(B(.2, .25, .1), M(0xffd24a, { emissive: 0x8a6a00 }), 0, .1, .82, lid);
  const it = { x, z, r: 2.3, label: 'Abrir cofre', on: true, use() { it.on = false; A.sfx('chest'); tween(.6, t => lid.rotation.x = -t * 1.9, onOpen); } }; I.push(it);
}
function sign(x, z, txt, label = 'Leer letrero') { mk(B(.2, 1.3, .2), M(0x6b4423), x, .65, z); mk(B(1.2, .7, .15), M(0xb98b52), x, 1.5, z); I.push({ x, z, r: 2.3, label, on: true, use: () => { A.sfx('coin'); say(txt, 6500); } }); }
function seqPuzzle(defs, order, done, wrong) {
  let step = 0; const gems = [];
  defs.forEach((d, i) => {
    mk(new THREE.CylinderGeometry(.6, .8, 1, 8), M(0x777b86), d.x, .5, d.z); addCircle(d.x, d.z, .8);
    const gem = mk(d.geo, M(d.c, { emissive: d.c, emissiveIntensity: .12 }), d.x, 1.5, d.z); gems.push(gem);
    I.push({ x: d.x, z: d.z, r: 2.4, label: 'Activar: ' + d.n, on: true, use() {
      if (step >= order.length) return;
      if (order[step] === i) { gem.material.emissiveIntensity = 2.2; step++; A.sfx('coin'); burst(gem.position, d.c, 18, 3, 3, .8); if (step === order.length) { A.sfx('ok'); done(); } }
      else { step = 0; gems.forEach(g => g.material.emissiveIntensity = .12); A.sfx('err'); say(wrong, 3200); } } });
  });
}
function portal(x, z, label, fn, col = 0x66e6ff) {
  const g = new THREE.Group(); g.position.set(x, 0, z); W.add(g); mk(new THREE.TorusGeometry(2, .25, 8, 28), M(col, { emissive: col, emissiveIntensity: 1.5 }), 0, 2.4, 0, g);
  const d = new THREE.Mesh(new THREE.CircleGeometry(1.9, 24), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })); d.position.y = 2.4; g.add(d); beam(0, 0, col, 12, 0, g);
  U.push((dt) => { d.rotation.z += dt * 2; d.scale.setScalar(1 + Math.sin(time * 3) * .05); }); I.push({ x, z, r: 3.2, label, on: true, use: fn }); A.sfx('ok'); say('Se ha abierto un portal luminoso.', 3000);
}
function house(x, z, col, roof) { solid(x, z, 4.2, 4, 2.4, M(col)); const r = mk(new THREE.ConeGeometry(3.6, 2.2, 4), M(roof), x, 3.5, z); r.rotation.y = Math.PI / 4; mk(B(.8, 1.5, .1), M(0x4a2f17), x, .75, z + 2.02); mk(B(.6, .6, .1), M(0xffe9a0, { emissive: 0xffc94a, emissiveIntensity: .8 }), x + 1.3, 1.5, z + 2.02); }
function slime(x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z); W.add(g); const b = mk(new THREE.SphereGeometry(.7, 12, 8), M(0xb03aa0, { emissive: 0x401040 }), 0, .5, 0, g); b.scale.y = .75;
  [-.2, .2].forEach(s => { mk(new THREE.SphereGeometry(.14, 6, 6), M(0xffffff), s, .75, .55, g); mk(new THREE.SphereGeometry(.06, 6, 6), M(0x000000), s, .75, .66, g); }); En.push({ g, b, hp: 2, x, z, cd: 0, vx: 0, vz: 0 });
}

// ---------- Niveles ----------
const NAMES = { 1: ['Bosque Kokiri', 'Donde todo comienza'], 2: ['Llanuras de Hyrule', 'Un horizonte sin fin'], 3: ['Templo del Tiempo', 'Donde el tiempo se detiene'], 4: ['Sala de la Melodía', 'Una canción espera su nombre'], 5: ['La Promesa', ''] };
const FB = { 1: 0, 2: 3, 3: 5, 4: 8, 5: 8 };

function L1() {
  sky(0x9bd7ff, 30, 120); bound = 34; P.spawn = [0, 24]; A.music('forest');
  ground(75, tex('#3f7d2a', '#a5d85a', 26)); mountains(0x5d8a6a, 130);
  const wt = tex('#2f86c8', '#bfe6ff', 8, 400); const w = mk(new THREE.PlaneGeometry(90, 4.5), M(0xffffff, { map: wt, transparent: true, opacity: .85, flatShading: false, roughness: .2 }), 0, .04, -10); w.rotation.x = -Math.PI / 2; U.push(dt => wt.offset.x += dt * .1);
  addBox(-23, -10, 42, 4.4, 6); addBox(23, -10, 42, 4.4, 6); solid(0, -10, 4, 5, .3, M(0x9a6a3a));
  const keep = [[0, 6, 5], [-12, 8, 6], [12, 10, 6], [-14, -22, 6], [14, -22, 7], [-4, -22, 8], [-26, -28, 5], [28, -4, 5], [0, -4, 5], [0, -10, 6], [0, 22, 6], [0, 14, 4]];
  for (let i = 0; i < 70; i++) { const a = rnd() * 6.283, r = 6 + rnd() * 26, x = Math.cos(a) * r, z = Math.sin(a) * r; if (Math.abs(z + 10) < 4 || keep.some(k => Math.hypot(x - k[0], z - k[1]) < k[2])) continue; tree(x, z, .8 + rnd() * .6, rnd() > .5 ? 0x2e7d32 : 0x3b8f3a); }
  for (let i = 0; i < 30; i++) { const a = i / 30 * 6.283, x = Math.cos(a) * 35, z = Math.sin(a) * 35; tree(x, z, 1.5, 0x1f5a2a); }
  house(-12, 8, 0xe8d8b0, 0x2e7d32); house(12, 10, 0xd9c79a, 0xb0432f); house(-14, -22, 0xe8d8b0, 0x2e7d32);
  flowers(160, 32, (x, z) => Math.abs(z + 10) < 3); amb(0xfff3a0, 70, 26, 5);
  const kira = npc(0, 6, { tunic: 0x5fbf6a, pants: 0x3a7d44, skin: 0xf2c29b, hair: 0xa8d65a, s: .8 }); kira.rotation.y = Math.PI;
  I.push({ x: 0, z: 6, r: 3, label: 'Hablar con Kira', on: true, use() { A.sfx('coin'); say('<b>Kira:</b> ¡Link! Los recuerdos de una noche muy especial se dispersaron por el bosque. Encuentra <b>tres fragmentos</b>: un cofre en la colina, una luz entre los árboles y el secreto de las piedras de las hadas. Cruza el puente del arroyo.', 9000); } });
  solid(0, -4, 6, 1, .8, M(0x7a5230)); solid(-5, 3, 1, 4, .8, M(0x7a5230));
  solid(14, -22, 6, 6, 1.2, M(0x8a8f99)); solid(14, -17.6, 3, 2, .6, M(0x9aa0aa)); chest(14, -22, 1.2, () => fragObj(14, -22, 2.4));
  fragObj(-26, -28, 1.2); sign(-4, -17, '«Las hadas despiertan primero al fuego, luego al agua y, por último, al bosque.»', 'Leer letrero de las hadas');
  seqPuzzle([{ x: -9, z: -22, c: 0xff3b3b, n: 'Piedra roja (fuego)', geo: new THREE.ConeGeometry(.4, .8, 6) }, { x: -4, z: -25, c: 0x3b8bff, n: 'Piedra azul (agua)', geo: new THREE.SphereGeometry(.4, 8, 8) }, { x: 1, z: -22, c: 0x3bff6b, n: 'Piedra verde (bosque)', geo: new THREE.OctahedronGeometry(.45) }],
    [0, 1, 2], () => { say('Las hadas despiertan y dejan caer un fragmento.', 3000); fragObj(-4, -21, 1.6); }, 'Las piedras se apagan… el orden no era el de las hadas.');
  G.onFrag = () => { quest(`Recupera los fragmentos de recuerdos (${G.lf}/3): cofre en la colina, luz entre los árboles y las piedras de las hadas.`); if (G.lf >= 3) { quest('¡Lo lograste! Cruza el portal al este.'); portal(28, -4, 'Cruzar el portal', () => goLevel(2)); } };
  quest('Habla con Kira y recupera 3 fragmentos de recuerdos (0/3).');
}
function L2() {
  sky(0x8fd0ff, 70, 280); bound = 95; P.spawn = [0, 44]; A.music('plain'); let rp = 0, act = false, kills = 0;
  ground(135, tex('#6aa23a', '#d4ea6a', 40)); mountains(0x7a8fb5, 150);
  const dt = tex('#a98258', '#7a5a38', 2, 600); dt.repeat.set(1, 20); const p = mk(new THREE.PlaneGeometry(5, 150), M(0xffffff, { map: dt, flatShading: false }), 0, .03, -20); p.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 40; i++) { const x = (rnd() - .5) * 170, z = (rnd() - .5) * 170; if (Math.abs(x) < 7 || Math.hypot(x - 36, z + 20) < 20 || Math.hypot(x + 32, z + 32) < 12 || z < -68 && Math.abs(x) < 25) continue; tree(x, z, 1.1 + rnd() * .5, 0x4a8f3a); }
  flowers(260, 90, (x, z) => Math.abs(x) < 3); amb(0xfff0b0, 60, 30, 6, .12);
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, h = 2 + rnd() * 5, x = -32 + Math.cos(a) * 8, z = -32 + Math.sin(a) * 8; mk(new THREE.CylinderGeometry(.7, .8, h, 8), M(0xc9c3b0), x, h / 2, z); addCircle(x, z, .9); }
  solid(-30, -30, 6, 1.4, 1, M(0xb5af9c)); rock(-45, -12, 1.6); rock(52, -55, 1.8); rock(-60, 20, 1.5); rock(40, 30, 1.2);
  gemObj(-34, -35); gemObj(55, -55); gemObj(-62, 20);
  // Arena de rupees
  for (let i = 0; i < 18; i++) { const a = i / 18 * 6.283; mk(new THREE.CylinderGeometry(.5, .6, 1.6, 6), M(0x9aa0aa), 36 + Math.cos(a) * 16, .8, -20 + Math.sin(a) * 16); }
  const rups = [], bol = [];
  for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283, r = 5 + (i % 2) * 5; const m = mk(new THREE.OctahedronGeometry(.4), M(0x2eea6a, { emissive: 0x13a040, emissiveIntensity: 1 }), 36 + Math.cos(a) * r, 1, -20 + Math.sin(a) * r); m.scale.y = 1.5; m.visible = false; rups.push(m);
    pick(m, () => { }, 1.3); K[K.length - 1].rup = true; }
  K.forEach(k => { if (k.rup) k.fn = () => { rp++; A.sfx('coin'); quest(`Recoge los rupees (${rp}/8) y esquiva las rocas rodantes.`); if (rp === 8) { act = false; A.sfx('ok'); say('¡Prueba superada! Un fragmento aparece.', 3000); fragObj(36, -20, 1.4); quest('Derrota a las criaturas y consigue el otro fragmento.'); } }; });
  for (let i = 0; i < 3; i++) { const b = mk(new THREE.IcosahedronGeometry(1.3, 0), M(0x5c5750), 36 + (i - 1) * 7, 1.3, -20); bol.push({ b, sp: .8 + i * .25, ph: i * 2, x: 36 + (i - 1) * 7 }); }
  sign(36, -2, '<b>Prueba de los rupees:</b> recoge los 8 rupees del círculo y esquiva las rocas. ¡Si una te golpea, la prueba se reinicia! Pulsa E sobre el letrero para comenzar.', 'Comenzar la prueba de rupees');
  I[I.length - 1].use = () => { if (act || rp >= 8) return; act = true; rp = 0; rups.forEach(m => m.visible = true); K.forEach(k => { if (k.rup) k.got = false; }); A.sfx('ok'); say('¡Comienza la prueba! Recoge los 8 rupees y salta o rodea las rocas.', 4000); quest('Recoge los rupees (0/8) y esquiva las rocas rodantes.'); };
  U.push(() => { bol.forEach(o => { o.b.position.z = -20 + Math.sin(time * o.sp + o.ph) * 13; o.b.rotation.x += .05; if (act && Math.hypot(P.pos.x - o.x, P.pos.z - o.b.position.z) < 1.8 && P.pos.y < 1.1 && !P.lock) { act = false; A.sfx('err'); rp = 0; rups.forEach(m => { m.visible = false; }); K.forEach(k => { if (k.rup) { k.got = false; k.m.parent || W.add(k.m); } }); P.pos.set(36, 0, -2); say('¡Una roca te golpeó! La prueba se reinicia: vuelve a leer el letrero.', 3500); quest('Reinicia la prueba de rupees en el letrero (E).'); } }); });
  K.forEach(k => { if (k.rup) { const f = k.fn; k.fn = () => { if (!act) { k.got = false; k.m.parent || W.add(k.m); return; } f(); }; } });
  // Enemigos
  [[-20, 10], [-30, -5], [20, -45], [-10, -50]].forEach(([x, z]) => slime(x, z)); let lastE = null;
  G.onKill = e => { kills++; lastE = e; if (kills === 4) { say('Las criaturas han sido derrotadas. Algo brilla donde cayó la última.', 4000); fragObj(e.x, e.z, 1.4); } };
  // Templo
  mk(B(30, 14, 2), M(0xaab4c8), 0, 7, -86); addBox(0, -86, 30, 2, 14); [-6, 6].forEach(x => { mk(new THREE.CylinderGeometry(1.2, 1.3, 12, 10), M(0xd8dcea), x, 6, -80); addCircle(x, -80, 1.3); }); mk(B(16, 2, 3), M(0xd8dcea), 0, 13, -80);
  [0, 1, 2].forEach(i => solid(0, -77 - i * 1.5, 16 - i * 2, 1.4, .3 * (i + 1), M(0xc4cada))); const door = mk(new THREE.CircleGeometry(4, 24), new THREE.MeshBasicMaterial({ color: 0x444a66 }), 0, 5, -84.9);
  const gate = { x: 0, z: -80, r: 4.5, label: 'Entrar al Templo del Tiempo', on: false, use: () => goLevel(3) }; I.push(gate);
  G.onFrag = () => { if (G.lf < 2) return; gate.on = true; door.material.color.set(0x7ae6ff); beam(0, -84, 0x7ae6ff, 30, 0); quest('¡El Templo del Tiempo se ha abierto! Entra por la puerta del norte.'); A.sfx('ok'); say('Las puertas del Templo del Tiempo brillan al fondo del camino.', 4000); };
  quest('Sigue el camino. Completa la prueba de rupees (este) y derrota a las criaturas (oeste). Busca 3 gemas escondidas.');
  say('<b>Llanuras de Hyrule.</b> Un horizonte enorme… y en algún lugar al norte, el Templo del Tiempo.', 5000);
}
function L3() {
  sky(0x0c101c, 15, 100); bound = 200; P.spawn = [0, 26]; A.music('temple'); sun.intensity = .5; hemi.intensity = .6; hemi.color.set(0x7a8cc0); let stage = 0;
  const fl = M(0xffffff, { map: tex('#7b8196', '#4a4f66', 14, 600, 1), flatShading: false }), wl = M(0xffffff, { map: tex('#5d6380', '#383c52', 6, 500, 1), flatShading: false });
  const f = new THREE.Mesh(new THREE.PlaneGeometry(34, 106), fl); f.rotation.x = -Math.PI / 2; f.position.set(0, 0, -21); f.receiveShadow = true; W.add(f);
  [-16, 16].forEach(x => { mk(B(2, 18, 106), wl, x, 9, -21); addBox(x, -21, 2, 106, 18); }); mk(B(34, 18, 2), wl, 0, 9, 33); addBox(0, 33, 34, 2, 18); mk(B(34, 18, 2), wl, 0, 9, -75); addBox(0, -75, 34, 2, 18);
  mk(B(34, 1, 106), M(0x1a1e30), 0, 18.5, -21);
  for (const z of [20, 8, -30, -44, -58]) [-10, 10].forEach(x => { mk(new THREE.CylinderGeometry(1.2, 1.4, 17, 12), M(0xc9cde0), x, 8.5, z); mk(B(3.2, .8, 3.2), M(0x9aa0b8), x, .4, z); mk(B(3.2, .8, 3.2), M(0x9aa0b8), x, 17.2, z); addCircle(x, z, 1.5); });
  [-10, 10].forEach(s => mk(B(.4, 6, .4), M(0xffd24a, { emissive: 0xc08a00 }), s * 1.4, 3, 30));
  const door = mk(B(6, 8, 1), M(0x8a7a4a, { emissive: 0x3a2a00 }), 0, 4, -12); const dc = addBox(0, -12, 6, 1, 8); [-9.5, 9.5].forEach(x => { mk(B(13, 12, 1.2), wl, x, 6, -12); addBox(x, -12, 13, 1.2, 12); }); mk(B(32, 4, 1.2), wl, 0, 14, -12);
  const shaft = mk(new THREE.CylinderGeometry(3.6, 1.8, 18, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }), 0, 9, -24);
  const pl = new THREE.PointLight(0xffd9a0, 300, 45, 2); pl.position.set(0, 8, -22); W.add(pl); const pl2 = new THREE.PointLight(0x9fb4ff, 200, 40, 2); pl2.position.set(0, 8, 14); W.add(pl2); amb(0xffe9b0, 140, 14, 14, .1);
  sign(0, 22, '«El tiempo empieza con el Sol, la Luna le sigue, después la Estrella y, al final, el Corazón que los une.»', 'Leer inscripción');
  const gate27 = addBox(0, -27, 32, 1, 8);
  seqPuzzle([{ x: -9, z: 2, c: 0xffc93c, n: 'Sol', geo: new THREE.SphereGeometry(.42, 10, 10) }, { x: -3, z: 0, c: 0xbfd7ff, n: 'Luna', geo: new THREE.TorusGeometry(.38, .13, 8, 14) }, { x: 3, z: 0, c: 0x66e0ff, n: 'Estrella', geo: new THREE.OctahedronGeometry(.5) }, { x: 9, z: 2, c: 0xff4d6d, n: 'Corazón', geo: new THREE.ConeGeometry(.4, .8, 6) }],
    [0, 1, 2, 3], () => { say('Un mecanismo antiguo despierta: la puerta del templo se abre.', 3500); quest('Cruza la puerta y toma la espada del altar.'); A.sfx('chest'); tween(2.5, t => door.position.y = 4 - t * 8, () => { dc.off = true; altar.on = true; }); }, 'Los símbolos se apagan… el orden de la inscripción era otro.');
  mk(new THREE.CylinderGeometry(1.8, 2.2, 1, 12), M(0x9aa0b8), 0, .5, -24); addCircle(-0, -24, 1.9, 1); mk(B(.15, 1.5, .05), M(0xdfe8f2, { emissive: 0x88aaff, emissiveIntensity: .8 }), 0, 1.75, -24); mk(B(.6, .1, .12), M(0xc9a24a), 0, 1.1, -24);
  const altar = { x: 0, z: -24, r: 3.6, label: 'Tomar la Espada del Tiempo', on: false, use: () => { altar.on = false; transform(); } }; I.push(altar);
  quest('Descifra los símbolos del templo para abrir la puerta.'); say('<b>Templo del Tiempo.</b> Aquí el tiempo se detiene. Lee la inscripción de la entrada.', 5000);
  async function transform() {
    P.lock = true; A.sfx('magic'); A.music('time'); const c = P.pos.clone(), t0 = time; quest('…');
    cin = () => { const a = (time - t0) * .7; cam.position.set(c.x + Math.cos(a) * 5.5, 2.6 + (time - t0) * .5, c.z + Math.sin(a) * 5.5); cam.lookAt(c.x, 1.8 + (time - t0) * .2, c.z); };
    const em = setInterval(() => burst(new V(c.x, .2, c.z), 0xffe9a0, 24, 3, 6, 2.2, -1), 150); say('El tiempo se detiene… la luz envuelve a Link.', 3000);
    await wait(2800); $('flash').style.opacity = 1; await wait(1000); setAdult(true); hemi.color.set(0xffe2a8); hemi.intensity = 1; sun.color.set(0xffe2a8); shaft.material.opacity = .3; pl.color.set(0xffc060); P.pos.set(0, 0, -28); c.set(0, 0, -28);
    $('flash').style.opacity = 0; burst(new V(c.x, 1, c.z), 0xffffff, 80, 8, 8, 2.5, -1); A.sfx('ok'); say('<b>Pasaron los años.</b> Link ya no es un niño. El camino hacia lo que más importa apenas comienza.', 6000); await wait(3200);
    clearInterval(em); cin = null; P.lock = false; gate27.off = true; stage = 2; trial();
  }
  function trial() {
    quest('Prueba final: recoge las 3 esferas de recuerdo. ¡Salta sobre las barras giratorias!'); let got = 0; const bars = [];
    [[-38, 1.1, 5], [-50, -1.3, -5], [-62, 1.5, 5]].forEach(([z, sp, ox]) => {
      const piv = new THREE.Group(); piv.position.set(0, 0, z); W.add(piv); mk(B(14, .5, .5), M(0xd94a4a, { emissive: 0x601010 }), 0, .25, 0, piv); mk(new THREE.CylinderGeometry(.6, .6, 1.2, 10), M(0xc9a24a), 0, .6, z); addCircle(0, z, .7, 1.2); bars.push({ piv, sp, z });
      const o = new THREE.Group(); o.position.set(ox, 1.2, z + 1); W.add(o); mk(new THREE.SphereGeometry(.45, 12, 12), M(0xffd24a, { emissive: 0xffb300, emissiveIntensity: 1.3 }), 0, 0, 0, o); beam(0, 0, 0xffe08a, 12, -1.2, o);
      pick(o, () => { getFrag(); got++; if (got === 3) { quest('El templo se ilumina. Cruza el portal del fondo.'); portal(0, -69, 'Entrar a la Sala de la Melodía', () => goLevel(4), 0xffd24a); } });
    });
    U.push(dt => bars.forEach(b => { b.piv.rotation.y += b.sp * dt; const a = b.piv.rotation.y, dx = Math.cos(a), dz = -Math.sin(a), rx = P.pos.x, rz = P.pos.z - b.z, t = Math.max(-7, Math.min(7, rx * dx + rz * dz)); if (Math.hypot(rx - t * dx, rz - t * dz) < .9 && P.pos.y < .7 && !P.lock) { damage(); P.pos.set(0, 0, -30); A.sfx('err'); } }));
  }
}
function L4() {
  sky(0x070a16, 10, 70); bound = 15; P.spawn = [0, 12]; A.music('riddle'); sun.intensity = .3; hemi.intensity = .8; hemi.color.set(0x8aa0ff);
  const f = ground(16, new THREE.CanvasTexture((() => { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#141a33'; g.fillRect(0, 0, 256, 256); g.strokeStyle = '#c9a24a'; g.lineWidth = 3; [30, 60, 100, 126].forEach(r => { g.beginPath(); g.arc(128, 128, r, 0, 7); g.stroke(); }); return c; })()));
  mk(new THREE.CylinderGeometry(16, 16, 16, 32, 1, true), M(0x1d2547, { side: THREE.BackSide }), 0, 8, 0); amb(0xffffff, 220, 15, 15, .12);
  const cr = mk(new THREE.OctahedronGeometry(1.2), M(0xffd24a, { emissive: 0xffb300, emissiveIntensity: 1.2 }), 0, 3.2, 0); beam(0, 0, 0xffd24a, 14); U.push(dt => { cr.rotation.y += dt; cr.position.y = 3.2 + Math.sin(time * 2) * .2; });
  const pl = new THREE.PointLight(0xffd9a0, 200, 30, 2); pl.position.set(0, 7, 0); W.add(pl);
  let read = 0; const seen = [], found = [];
  const cl = [['Pista 1', 'Dos anillos entrelazados: la celebración en la que dos personas se prometen para siempre. Es una palabra de 4 letras.', [0, -10]], ['Pista 2', 'Un nombre propio de 6 letras: empieza con C y termina con O. Es quien da nombre a la fiesta.', [-8.7, 5]], ['Pista 3', 'Es una canción para bailar abrazadas: «La ____ de ______».', [8.7, 5]]];
  cl.forEach(([t, txt, [x, z]], i) => {
    mk(new THREE.CylinderGeometry(.7, .9, 1.2, 8), M(0x777b86), x, .6, z); addCircle(x, z, .9);
    if (i === 0) { const r1 = mk(new THREE.TorusGeometry(.4, .07, 8, 18), M(0xffd24a, { emissive: 0xa07000 }), x - .25, 2, z), r2 = mk(new THREE.TorusGeometry(.4, .07, 8, 18), M(0xffd24a, { emissive: 0xa07000 }), x + .25, 2, z); r1.rotation.y = r2.rotation.y = 1.2; U.push(() => { r1.rotation.x = r2.rotation.x = time; }); }
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#10162e'; g.fillRect(0, 0, 512, 256); g.strokeStyle = '#c9a24a'; g.lineWidth = 8; g.strokeRect(4, 4, 504, 248); g.fillStyle = '#ffe7a1'; g.textAlign = 'center'; g.font = 'bold 44px serif'; g.fillText(t, 256, 70);
    g.font = '34px serif'; g.fillText(['B _ _ _', 'C _ _ _ _ O', 'La ___ de ______'][i], 256, 150); g.font = '30px serif'; g.fillText(['♪  una fiesta  ♪', '♪  un nombre  ♪', '♪  una canción  ♪'][i], 256, 210);
    const p = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c) })); p.position.set(x, 3.4, z); p.lookAt(0, 3.4, 0); W.add(p);
    I.push({ x, z, r: 2.6, label: 'Leer ' + t, on: true, use() { A.sfx('coin'); say(`<b>${t}:</b> ${txt}`, 6000); if (!seen[i]) { seen[i] = 1; read++; found[i] = `<b>${t}:</b> ${txt}`; } if (read === 3 && !seen.o) { seen.o = 1; setTimeout(openRiddle, 5500); I.push({ x: 0, z: 0, r: 3.5, label: 'Responder el acertijo', on: true, use: openRiddle }); } } });
  });
  window.__clues = found;
  quest('Examina los 3 pedestales para reunir las pistas del acertijo musical.'); say('<b>Sala de la Melodía.</b> Una canción está escondida en esta sala. Lee las tres pistas.', 5000);
}
async function openRiddle() { G.ui = true; document.exitPointerLock(); $('clues').innerHTML = (window.__clues || []).join('<br>'); $('riddle').classList.add('on'); $('ans').focus(); }
const norm = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z]/g, '');
$('send').onclick = () => {
  const a = norm($('ans').value);
  if (a === 'labodadecamilo' || a === 'bodadecamilo') { A.sfx('ok'); $('rmsg').textContent = '¡Esa es! La canción se desbloquea…'; setTimeout(() => { $('riddle').classList.remove('on'); G.ui = false; goLevel(5); }, 1500); }
  else { A.sfx('err'); $('rmsg').textContent = 'No es esa canción… relee las pistas (combina "La", la fiesta y el nombre).'; }
};
$('ans').onkeydown = e => { e.stopPropagation(); if (e.key === 'Enter') $('send').click(); };
$('back').onclick = () => { $('riddle').classList.remove('on'); G.ui = false; };

async function L5() {
  sky(0x050816, 40, 220); bound = 60; P.lock = true; sun.color.set(0x9fb4ff); sun.intensity = .6; hemi.color.set(0x334477); hemi.groundColor.set(0x0a1018); hemi.intensity = .9;
  ground(140, tex('#1d3a2a', '#3b6a4a', 30)); const hill = mk(new THREE.SphereGeometry(30, 32, 16), M(0x21452f, { flatShading: false }), 0, 0, 0); hill.scale.y = .12;
  mountains(0x1a2240, 160); for (let i = 0; i < 26; i++) { const a = i / 26 * 6.283, r = 38 + rnd() * 14; tree(Math.cos(a) * r, Math.sin(a) * r, 1.6, 0x0f2a1a); }
  const sa = new Float32Array(6000); for (let i = 0; i < 2000; i++) { const th = rnd() * 6.283, ph = Math.acos(rnd() * .95 + .02) , r = 200; sa.set([Math.sin(ph) * Math.cos(th) * r, Math.cos(ph) * r, Math.sin(ph) * Math.sin(th) * r], i * 3); }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sa, 3)); const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, fog: false })); W.add(stars);
  const moon = mk(new THREE.SphereGeometry(9, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff6dd, fog: false }), -50, 70, -150); mk(new THREE.SphereGeometry(13, 24, 24), new THREE.MeshBasicMaterial({ color: 0xfff6dd, transparent: true, opacity: .15, fog: false }), -50, 70, -150);
  const wl = new THREE.PointLight(0xffb870, 160, 30, 2); wl.position.set(0, 6, 3); W.add(wl); amb(0xffe08a, 120, 30, 10, .18);
  const lant = []; for (let i = 0; i < 40; i++) { const l = mk(B(.5, .7, .5), new THREE.MeshBasicMaterial({ color: 0xffb347 }), (rnd() - .5) * 50, 1 + rnd() * 3, -10 + (rnd() - .5) * 40); lant.push(l); }
  P.model.visible = true; P.model.position.set(-.8, 3.6, 0); P.model.rotation.y = Math.PI; P.model.userData.armR.rotation.x = 0;
  const mad = npc(.8, 0, { tunic: 0xe7b6ff, pants: 0x222, dress: 0xb86bd6, skin: 0xe9b48a, hair: 0x2a1a14, s: 1.0 }, 3.6); mad.rotation.y = Math.PI; fairy.visible = false;
  cin = () => { const t = time - t0; const k = Math.min(t / 16, 1), e = k * k * (3 - 2 * k), a = Math.PI * e; cam.position.set(Math.sin(a) * -9 + 0, 5.2 + e * 1.3, Math.cos(a) * 11); cam.lookAt(0, 5.2, 0); cam.position.x = Math.sin(a) * -10; cam.position.z = Math.cos(a) * 11; }; const t0 = time;
  U.push(dt => { lant.forEach((l, i) => { l.position.y += dt * (rise ? .8 + i % 5 * .2 : 0); l.position.y += Math.sin(time * 1.5 + i) * .003; }); });
  let rise = false; $('hud').classList.remove('on'); $('quest').innerHTML = ''; await wait(2500);
  if (!A.playSong()) A.music('love');
  const ps = [...document.querySelectorAll('#final p')]; $('final').classList.add('on');
  for (let i = 0; i < ps.length; i++) { ps[i].classList.add('show'); if (i === ps.length - 1) break; await wait([10500, 10500, 6500][i]); ps[i].classList.remove('show'); await wait(1900); }
  rise = true; burst(new V(0, 6, 0), 0xffd36a, 120, 12, 8, 4, -.5); await wait(9000); $('end').classList.add('on');
}
const LV = { 1: L1, 2: L2, 3: L3, 4: L4, 5: L5 };

function build(n) {
  scene.remove(W); W = new THREE.Group(); scene.add(W); C = []; I = []; K = []; U = []; En = []; cin = null; G.lvl = n; G.frag = FB[n]; G.lf = 0; G.gems = 0; G.onFrag = null; G.onKill = null; G.inv = Array.from({ length: G.frag }, (_, i) => 'Recuerdo ' + (i + 1));
  sun.intensity = 2.2; sun.color.set(0xffffff); hemi.intensity = 1.1; hemi.color.set(0xbfe3ff); hemi.groundColor.set(0x4a6b2f);
  setAdult(n >= 4); P.hp = 5; P.vy = 0; LV[n](); P.pos.set(P.spawn[0], 0, P.spawn[1]); P.yaw = 0; P.pitch = .35; hud();
}
function goLevel(n) {
  G.play = false; P.lock = true; $('t-t').textContent = NAMES[n][0]; $('t-s').textContent = NAMES[n][1]; $('trans').classList.add('on');
  setTimeout(() => { build(n); setTimeout(() => { $('trans').classList.remove('on'); if (n < 5) { P.lock = false; G.play = true; $('hud').classList.add('on'); } }, 2200); }, 1000);
}

// ---------- Entrada ----------
function nearI() { let b = null, bd = 1e9; for (const t of I) { if (!t.on) continue; const d = Math.hypot(P.pos.x - t.x, P.pos.z - t.z); if (d < t.r && d < bd) { b = t; bd = d; } } return b; }
function attack() { if (P.atk > 0 || P.lock) return; P.atk = .35; A.sfx('slash'); for (const e of [...En]) if (Math.hypot(e.x - P.pos.x, e.z - P.pos.z) < 3) { e.hp--; A.sfx('hit'); const a = Math.atan2(e.x - P.pos.x, e.z - P.pos.z); e.x += Math.sin(a) * 1.5; e.z += Math.cos(a) * 1.5; burst(new V(e.x, 1, e.z), 0xff77ff, 12, 3, 3, .6); if (e.hp <= 0) { W.remove(e.g); En.splice(En.indexOf(e), 1); burst(new V(e.x, 1, e.z), 0xffaaff, 40, 5, 5, 1); G.onKill && G.onKill(e); } } }
function pause(on) { if (on === G.paused) return; G.paused = on; $('pause').classList.toggle('on', on); if (on) { G.pt = performance.now(); document.exitPointerLock(); } }
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return; keys[e.code] = 1; if (e.code === 'Space') e.preventDefault();
  if (e.code === 'KeyE' && G.play && !G.ui && !G.paused && !P.lock) { const t = nearI(); t && t.use(t); }
  if (e.code === 'Escape' && G.play && !G.ui) { if (!G.paused) pause(true); else if (performance.now() - G.pt > 400) resume(); }
});
addEventListener('keyup', e => keys[e.code] = 0);
document.addEventListener('mousemove', e => { if (!G.play || P.lock || G.paused || G.ui) return; if (document.pointerLockElement || e.buttons & 2) { P.yaw -= e.movementX * .0027; P.pitch = THREE.MathUtils.clamp(P.pitch + e.movementY * .0025, -.15, 1.1); } });
R.domElement.addEventListener('mousedown', e => { if (!G.play || G.ui || G.paused) return; if (e.button === 0) { if (!document.pointerLockElement) R.domElement.requestPointerLock && R.domElement.requestPointerLock(); attack(); } });
R.domElement.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && G.play && !G.ui && !G.paused && !P.lock) pause(true); });
function resume() { pause(false); R.domElement.requestPointerLock && R.domElement.requestPointerLock(); }
$('resume').onclick = resume; $('rlevel').onclick = () => { pause(false); goLevel(G.lvl); }; $('rgame').onclick = () => location.reload(); $('ctl').onclick = () => { $('controls').style.display = 'block'; };
document.querySelectorAll('.songfile').forEach(i => i.onchange = e => { const f = e.target.files[0]; if (!f) return; const n = A.setSong(f); document.querySelectorAll('.songname').forEach(s => s.textContent = '♪ ' + n); if (G.lvl === 5) A.playSong(); });
$('start').onclick = () => { A.init(); $('title').classList.remove('on'); cin = null; goLevel(1); };

// ---------- Bucle ----------
function groundAt(x, z, feet) { let g = 0; for (const b of C) if (b.w && !b.off && Math.abs(x - b.x) < b.w / 2 + .3 && Math.abs(z - b.z) < b.d / 2 + .3 && feet >= b.h - .35) g = Math.max(g, b.h); return g; }
function collide(feet) {
  const PR = .45, p = P.pos;
  for (const b of C) { if (b.off) continue;
    if (b.r) { const dx = p.x - b.x, dz = p.z - b.z, d = Math.hypot(dx, dz), m = b.r + PR; if (d < m && d > 1e-4 && feet < b.h - .1) { p.x = b.x + dx / d * m; p.z = b.z + dz / d * m; } }
    else if (feet < b.h - .3) { const hx = b.w / 2 + PR, hz = b.d / 2 + PR, dx = p.x - b.x, dz = p.z - b.z; if (Math.abs(dx) < hx && Math.abs(dz) < hz) { if (hx - Math.abs(dx) < hz - Math.abs(dz)) p.x = b.x + Math.sign(dx || 1) * hx; else p.z = b.z + Math.sign(dz || 1) * hz; } } }
}
const tv = new V();
function step(dt) {
  for (const u of [...U]) u(dt, time);
  if (G.play && !P.lock && !G.ui) {
    const f = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0), s = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    let mx = -Math.sin(P.yaw) * f + Math.cos(P.yaw) * s, mz = -Math.cos(P.yaw) * f - Math.sin(P.yaw) * s; const l = Math.hypot(mx, mz), mv = l > 0; const sp = (keys.ShiftLeft || keys.ShiftRight ? 8.5 : 4.8) * (P.adult ? 1.1 : 1);
    if (mv) { mx /= l; mz /= l; P.pos.x += mx * sp * dt; P.pos.z += mz * sp * dt; let d = Math.atan2(mx, mz) - P.face; d = Math.atan2(Math.sin(d), Math.cos(d)); P.face += d * Math.min(1, dt * 14); }
    P.run = mv ? sp : 0; if (keys.Space && P.on) { P.vy = 8.6; P.on = false; A.sfx('jump'); }
    collide(P.pos.y); const d = Math.hypot(P.pos.x, P.pos.z); if (d > bound) { P.pos.x *= bound / d; P.pos.z *= bound / d; }
    P.vy -= 22 * dt; P.pos.y += P.vy * dt; const g = groundAt(P.pos.x, P.pos.z, P.pos.y); if (P.pos.y <= g) { P.pos.y = g; P.vy = 0; P.on = true; } else P.on = false;
    P.atk = Math.max(0, P.atk - dt); P.inv = Math.max(0, P.inv - dt);
  } else P.run = 0;
  const m = P.model, u = m.userData; if (G.lvl !== 5) { m.position.copy(P.pos); m.rotation.y = P.face; } m.visible = !(G.lvl === 0) ;
  const ph = time * (P.run > 6 ? 13 : 9) * (P.run ? 1 : 0); u.legs[0].rotation.x = Math.sin(ph) * .7 * (P.run ? 1 : 0); u.legs[1].rotation.x = -u.legs[0].rotation.x; u.armL.rotation.x = -u.legs[0].rotation.x * .8;
  u.armR.rotation.x = P.atk > 0 ? -2.3 * Math.sin((1 - P.atk / .35) * Math.PI) - .2 : u.legs[0].rotation.x * .8; if (P.inv > 0) m.visible = Math.floor(time * 20) % 2 === 0;
  // Ítems
  for (const k of K) { if (k.got) continue; k.m.rotation.y += dt * 2; k.m.position.y = k.y + Math.sin(time * 3 + k.x) * .15; if (k.m.visible && G.play && !P.lock && Math.hypot(P.pos.x - k.x, P.pos.z - k.z) < k.r && Math.abs(P.pos.y + 1 - k.m.position.y) < 2.5) { k.got = true; k.m.parent && k.m.parent.remove(k.m); k.fn(); } }
  // Enemigos
  for (const e of En) { const dx = P.pos.x - e.x, dz = P.pos.z - e.z, d = Math.hypot(dx, dz); if (d < 16 && !P.lock) { e.x += dx / d * 2.4 * dt; e.z += dz / d * 2.4 * dt; if (d < 1.3) damage(); } e.g.position.set(e.x, 0, e.z); e.b.scale.set(1 + Math.sin(time * 6) * .08, .75 - Math.sin(time * 6) * .08, 1); e.g.rotation.y = Math.atan2(dx, dz); }
  // Partículas
  for (let i = PS.length - 1; i >= 0; i--) { const p = PS[i]; p.t += dt; p.v.forEach((v, j) => { v[1] -= p.grav * dt; p.a[j * 3] += v[0] * dt; p.a[j * 3 + 1] += v[1] * dt; p.a[j * 3 + 2] += v[2] * dt; }); p.pts.geometry.attributes.position.needsUpdate = true; p.pts.material.opacity = Math.max(0, 1 - p.t / p.life); if (p.t >= p.life) { scene.remove(p.pts); PS.splice(i, 1); } }
  fairy.position.lerp(tv.set(P.pos.x + Math.cos(time * 1.5) * 1.2, P.pos.y + 2.3 + Math.sin(time * 2) * .3, P.pos.z + Math.sin(time * 1.5) * 1.2), Math.min(1, dt * 4));
  // Cámara y luces
  if (cin) cin(dt); else if (G.lvl > 0) { const d = P.adult ? 7.5 : 6.5, h = Math.sin(P.pitch) * d, r = Math.cos(P.pitch) * d; tv.set(P.pos.x + Math.sin(P.yaw) * r, P.pos.y + 1.7 + h, P.pos.z + Math.cos(P.yaw) * r); cam.position.lerp(tv, 1 - Math.exp(-12 * dt)); cam.lookAt(P.pos.x, P.pos.y + 1.5, P.pos.z); }
  sun.position.set(P.pos.x + 25, 40, P.pos.z + 15); sun.target.position.copy(P.pos);
  const t = G.play && !G.ui && !P.lock ? nearI() : null; $('prompt').classList.toggle('on', !!t); if (t) $('prompt').textContent = '[E] ' + t.label;
  $('hint').style.display = G.play && !document.pointerLockElement && !G.paused && !G.ui ? 'block' : 'none';
}
const clock = new THREE.Clock();
function loop() { requestAnimationFrame(loop); const dt = Math.min(clock.getDelta(), .05); if (!G.paused) { time += dt; step(dt); } R.render(scene, cam); }

// ---------- Inicio ----------
try {
  setAdult(false); P.model.visible = false; build(1); G.lvl = 0; P.model.visible = false; $('hud').classList.remove('on'); const t0 = time;
  cin = () => { const a = (time - t0) * .15; cam.position.set(Math.cos(a) * 30, 12, Math.sin(a) * 30); cam.lookAt(0, 3, -5); };
  loop(); window.__ok = true; setTimeout(() => $('loading').classList.remove('on'), 700);
} catch (e) { $('errt').textContent = 'Error al iniciar WebGL/recursos: ' + e.message; $('err').classList.add('on'); }
