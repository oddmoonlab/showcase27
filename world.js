// 영화관·미술관이 같이 쓰는 3D 바탕: 화면, 블록 캐릭터, 이름표, 말풍선, 카메라, 탭 처리
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('c'), antialias: devicePixelRatio < 2, alpha: true }) // alpha: 영화관 스크린에 구멍을 뚫어 뒤의 유튜브가 보이게;
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // 아이패드 버벅임 방지
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

const hemi = new THREE.HemisphereLight(0xffffff, 0x554455, 0.95);
const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(5, 12, 8);
scene.add(hemi, sun);

const _mats = {};
function mat(c) { return _mats[c] || (_mats[c] = new THREE.MeshLambertMaterial({ color: c })); }
const _geo = {};
function box(w, h, d) { const k = w + ',' + h + ',' + d; return _geo[k] || (_geo[k] = new THREE.BoxGeometry(w, h, d)); }
function block(w, h, d, color, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(box(w, h, d), mat(color)); m.position.set(x, y, z); (parent || scene).add(m); return m;
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.minFilter = THREE.LinearFilter; return t;
}
const FONT = '"Apple SD Gothic Neo","Malgun Gothic","Noto Sans KR",sans-serif';

// ── 블록 캐릭터 ──
const PRESETS = [
  { skin: 0xf6d24a, shirt: 0xe85d75, pants: 0x3b3b5c, acc: 'cat', ac: 0x333333 },
  { skin: 0xffd7b0, shirt: 0x8e6cd8, pants: 0x2d2d2d, acc: 'hair', ac: 0x5a3b22 },
  { skin: 0xffd7b0, shirt: 0x31b59a, pants: 0x34495e, acc: 'cap', ac: 0xe74c3c },
  { skin: 0xf6d24a, shirt: 0xf39c12, pants: 0x2c3e50, acc: 'bunny', ac: 0xffffff },
  { skin: 0xffd7b0, shirt: 0x3498db, pants: 0x7f5539, acc: 'hat', ac: 0x222222 },
  { skin: 0xf6d24a, shirt: 0x95c47a, pants: 0x5d4e8c, acc: 'bear', ac: 0x8b5a2b },
  { skin: 0xffd7b0, shirt: 0xff8fab, pants: 0x4a4e69, acc: 'longhair', ac: 0x1f1f1f },
  { skin: 0xf1c27d, shirt: 0x222831, pants: 0x5c6b8a, acc: 'beanie', ac: 0x4ecdc4 },
  { skin: 0xf6d24a, shirt: 0xffffff, pants: 0x1d3557, acc: 'crown', ac: 0xffc300 },
  { skin: 0xf1c27d, shirt: 0xffd166, pants: 0x6d597a, acc: 'cat', ac: 0xff9f43 },
];
const _faces = {};
function faceMat(skin) {
  return _faces[skin] || (_faces[skin] = new THREE.MeshLambertMaterial({
    map: canvasTex(64, 64, (g) => {
      g.fillStyle = '#' + skin.toString(16).padStart(6, '0'); g.fillRect(0, 0, 64, 64);
      g.fillStyle = '#222'; g.fillRect(19, 22, 6, 9); g.fillRect(39, 22, 6, 9);
      g.strokeStyle = '#222'; g.lineWidth = 3.5; g.beginPath(); g.arc(32, 36, 13, 0.25 * Math.PI, 0.75 * Math.PI); g.stroke();
    }),
  }));
}
function accessory(p, head) {
  const c = p.ac, add = (w, h, d, x, y, z, col = c) => block(w, h, d, col, x, y, z, head);
  if (p.acc === 'cat') { for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.26, 4), mat(c)); e.position.set(s * 0.19, 0.42, 0); e.rotation.y = Math.PI / 4; head.add(e); } }
  if (p.acc === 'bunny') for (const s of [-1, 1]) { add(0.13, 0.5, 0.07, s * 0.14, 0.52, 0); add(0.06, 0.36, 0.02, s * 0.14, 0.52, 0.04, 0xffb3c6); }
  if (p.acc === 'bear') for (const s of [-1, 1]) add(0.18, 0.18, 0.08, s * 0.25, 0.32, 0);
  if (p.acc === 'hair' || p.acc === 'longhair') { add(0.66, 0.18, 0.66, 0, 0.3, -0.01); add(0.66, p.acc === 'hair' ? 0.42 : 0.72, 0.14, 0, p.acc === 'hair' ? 0.08 : -0.07, -0.27); }
  if (p.acc === 'cap') { add(0.64, 0.16, 0.64, 0, 0.36, 0); add(0.5, 0.04, 0.32, 0, 0.3, 0.42); }
  if (p.acc === 'hat') { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 0.05, 12), mat(c)); b.position.y = 0.32; head.add(b); const t = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.36, 12), mat(c)); t.position.y = 0.52; head.add(t); }
  if (p.acc === 'beanie') { add(0.66, 0.24, 0.66, 0, 0.38, 0); add(0.16, 0.16, 0.16, 0, 0.58, 0, 0xffffff); }
  if (p.acc === 'mustache') { add(0.66, 0.16, 0.66, 0, 0.32, -0.01); add(0.66, 0.4, 0.14, 0, 0.08, -0.27); add(0.3, 0.07, 0.04, 0, -0.1, 0.31); } // 지배인: 단정한 머리 + 콧수염
  if (p.acc === 'shades') { add(0.66, 0.2, 0.66, 0, 0.3, -0.01); add(0.66, 0.5, 0.16, 0, 0.02, -0.26); add(0.22, 0.13, 0.04, -0.14, 0.06, 0.31, 0x111111); add(0.22, 0.13, 0.04, 0.14, 0.06, 0.31, 0x111111); add(0.1, 0.03, 0.04, 0, 0.09, 0.31, 0x111111); } // 강사: 단발 + 선글라스
  if (p.acc === 'beret') { // 작가 베레모
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.4, 0.13, 14), mat(c)); b.position.set(-0.04, 0.36, 0); b.rotation.z = 0.22; head.add(b);
    add(0.05, 0.08, 0.05, -0.06, 0.46, 0);
  }
  if (p.acc === 'crown') { const k = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 6, 1, true), mat(c)); k.position.y = 0.42; head.add(k); }
}

function labelSprite(text, { bg = 'rgba(30,30,40,.78)', fg = '#fff', size = 28, maxW = 600 } = {}) {
  const tmp = document.createElement('canvas').getContext('2d'); tmp.font = `bold ${size}px ${FONT}`;
  const w = Math.min(maxW, Math.ceil(tmp.measureText(text).width) + size), h = size + 18;
  const tex = canvasTex(w, h, (g) => {
    g.fillStyle = bg; const r = h / 2; g.beginPath(); g.moveTo(r, 0); g.arcTo(w, 0, w, h, r); g.arcTo(w, h, 0, h, r); g.arcTo(0, h, 0, 0, r); g.arcTo(0, 0, w, 0, r); g.fill();
    g.fillStyle = fg; g.font = `bold ${size}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 1, w - 10);
  });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthTest: false, transparent: true }));
  s.scale.set(w / 100, h / 100, 1); s.renderOrder = 10; return s;
}

// 손에 드는 것(팝콘·음료·팜플렛…)
const ITEMS = {
  popcorn: { food: true, label: '팝콘', emoji: '🍿', build(g) { block(0.3, 0.32, 0.3, 0xe63946, 0, 0, 0, g); block(0.32, 0.08, 0.32, 0xffffff, 0, 0.05, 0, g); block(0.3, 0.12, 0.3, 0xffe066, 0, 0.21, 0, g); } },
  cola: { food: true, label: '콜라', emoji: '🥤', build(g) { block(0.22, 0.36, 0.22, 0xd62828, 0, 0, 0, g); block(0.24, 0.04, 0.24, 0xffffff, 0, 0.2, 0, g); block(0.03, 0.18, 0.03, 0xffffff, 0.04, 0.3, 0, g); } },
  coffee: { food: true, label: '커피', emoji: '☕', build(g) { block(0.22, 0.3, 0.22, 0xf1e3c8, 0, 0, 0, g); block(0.23, 0.1, 0.23, 0x7f5539, 0, -0.02, 0, g); block(0.24, 0.05, 0.24, 0xffffff, 0, 0.17, 0, g); } },
  hotdog: { food: true, label: '핫도그', emoji: '🌭', build(g) { block(0.14, 0.42, 0.14, 0xe9b872, 0, 0.02, 0, g); block(0.1, 0.5, 0.1, 0xb5452a, 0, 0.03, 0.05, g); block(0.04, 0.4, 0.03, 0xffd60a, 0, 0.05, 0.11, g); } },
  nachos: { food: true, label: '나초', emoji: '🧀', build(g) { block(0.34, 0.12, 0.26, 0x333333, 0, 0, 0, g); block(0.28, 0.12, 0.2, 0xf4a259, 0, 0.1, 0, g); block(0.1, 0.06, 0.1, 0xffd60a, 0.08, 0.17, 0, g); } },
  flowers: { label: '꽃다발', emoji: '💐', build(g) {
    const w = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 6), mat(0xfff1f5)); w.rotation.x = Math.PI; w.position.y = 0.05; g.add(w);
    [[0, 0.36, 0, 0xff4d6d], [0.12, 0.32, 0.05, 0xffd166], [-0.12, 0.32, 0.04, 0xc77dff], [0.04, 0.33, -0.12, 0xff8fab], [-0.05, 0.42, 0.08, 0xffffff]].forEach(([x, y, z, c]) => block(0.13, 0.13, 0.13, c, x, y, z, g));
    block(0.4, 0.04, 0.04, 0x52b788, 0, 0.2, 0, g);
  } },
  folder: { label: '출석부', emoji: '📋', build(g) { const f = block(0.08, 0.62, 0.48, 0x1b4332, 0, 0.32, -0.05, g); block(0.09, 0.5, 0.36, 0xfdf6e3, 0.005, 0.32, -0.05, g); f.rotation.x = 0.15; } }, // 강사: 옆구리에 낀 출석부
  pamphlet: { label: '팜플렛', emoji: '📖', build(g) { block(0.3, 0.4, 0.04, 0xfdf6e3, 0, 0.05, 0, g); block(0.26, 0.12, 0.05, 0x6c5ce7, 0, 0.14, 0, g); } },
};

const avatars = new Map();
function makeAvatar(id, preset, name, over = {}) {
  const p = { ...PRESETS[preset % PRESETS.length], ...over }; // over: 미술관 베레모 등 덮어쓰기
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); scene.add(root);
  const limb = (x, y, w, h, color) => { const g = new THREE.Group(); g.position.set(x, y, 0); block(w, h, 0.4, color, 0, -h / 2, 0, g); body.add(g); return g; };
  const legs = [limb(-0.2, 0.9, 0.38, 0.9, p.pants), limb(0.2, 0.9, 0.38, 0.9, p.pants)];
  block(0.82, 0.9, 0.42, p.shirt, 0, 1.35, 0, body);
  const arms = [limb(-0.6, 1.76, 0.36, 0.86, p.skin), limb(0.6, 1.76, 0.36, 0.86, p.skin)];
  for (const a of arms) block(0.38, 0.32, 0.42, p.shirt, 0, -0.14, 0, a); // 소매
  const head = new THREE.Group(); head.position.y = 2.12; body.add(head);
  const sm = mat(p.skin);
  head.add(new THREE.Mesh(box(0.6, 0.6, 0.6), [sm, sm, sm, sm, faceMat(p.skin), sm]));
  accessory(p, head);
  const tag = over.tag || labelSprite(name); tag.position.y = 3.05; root.add(tag);
  const hands = arms.map(a => { const g = new THREE.Group(); g.position.set(0, -0.92, 0.12); a.add(g); return g; });
  const av = { id, root, body, legs, arms, hands, held: '', path: [], sit: null, phase: 0, bubble: null, bubbleT: 0, clapT: 0, onArrive: null, name, tag };
  avatars.set(id, av); return av;
}
function removeAvatar(id) { const av = avatars.get(id); if (av) { scene.remove(av.root); avatars.delete(id); } }
let FOOD_SCALE = 1; // 영화관은 먹을 것을 크게(3배) 보여 줘요
function setHeld(av, items) {
  const key = (items || []).join(','); if (av.held === key) return; av.held = key;
  av.hands.forEach((h, i) => { h.clear(); const it = ITEMS[(items || [])[i]]; if (it) it.build(h); h.scale.setScalar(it && it.food ? FOOD_SCALE : 1); });
}
function say(av, text, secs = 5) {
  if (av.bubble) av.root.remove(av.bubble);
  av.bubble = labelSprite(text, { bg: 'rgba(255,255,255,.95)', fg: '#222', size: 26 }); av.bubble.position.y = 3.7; av.root.add(av.bubble); av.bubbleT = secs;
}
// 경로(점 목록)를 따라 걷기. sit 이 있으면 도착해서 앉음.
function walk(av, points, sit = null, onArrive = null) { av.path = points.slice(); av.sit = null; av.pendingSit = sit; av.onArrive = onArrive; }
function place(av, x, z) { av.root.position.set(x, 0, z); av.path = []; }
function updateAvatar(av, dt) {
  const pos = av.root.position; let moving = false;
  if (av.path.length) {
    const t = av.path[0], dx = t.x - pos.x, dz = t.z - pos.z, d = Math.hypot(dx, dz), step = (av.speed || 4.2) * dt;
    if (d <= step) { pos.x = t.x; pos.z = t.z; av.path.shift(); } else { pos.x += dx / d * step; pos.z += dz / d * step; moving = true; }
    if (d > 0.01) av.root.rotation.y = Math.atan2(dx, dz);
    if (!av.path.length) { if (av.pendingSit) { av.sit = av.pendingSit; av.root.rotation.y = av.sit.rot; } const f = av.onArrive; av.onArrive = null; f && f(); }
  }
  av.phase = moving ? av.phase + dt * 9 : 0;
  const sw = Math.sin(av.phase) * 0.6, sit = !!av.sit && !av.path.length;
  av.body.position.y = sit ? (av.sit.y ?? -0.38) : 0;
  av.legs[0].rotation.x = sit ? -Math.PI / 2 : sw; av.legs[1].rotation.x = sit ? -Math.PI / 2 : -sw;
  const holding = !!av.held;
  if (av.poseT > 0) { av.poseT -= dt; const p = av.pose || [-2.9, -0.35, -2.9, 0.35]; av.arms[0].rotation.set(p[0], 0, p[1]); av.arms[1].rotation.set(p[2], 0, p[3]); } // 사진 포즈 (기본: 만세)
  else if (av.clapT > 0) { av.clapT -= dt; const c = Math.abs(Math.sin(av.clapT * 18)) * 0.25; av.arms[0].rotation.set(-1.3, 0, -0.35 + c); av.arms[1].rotation.set(-1.3, 0, 0.35 - c); }
  else if (av.hug) { av.arms[0].rotation.set(-1.1, 0, 0.45); av.arms[1].rotation.set(-1.1, 0, -0.45); } // 두 손으로 안고 들기 (꽃다발)
  else { av.arms[0].rotation.set(holding ? -0.5 : -sw, 0, 0); av.arms[1].rotation.set(holding ? -0.5 : sw, 0, 0); }
  if (av.bubble && (av.bubbleT -= dt) <= 0) { av.root.remove(av.bubble); av.bubble = null; }
}

// ── 카메라: 한 손가락 끌기 = 돌리기, 두 손가락 벌리기·휠 = 확대 ──
const cam = { yaw: 0, pitch: 0.62, dist: 12, fixed: null };
function updateCamera(target) {
  if (cam.fixed) { camera.position.copy(cam.fixed.pos); camera.lookAt(cam.fixed.look); return; }
  const t = new THREE.Vector3(target.x, 1.6, target.z);
  camera.position.set(t.x + Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.dist, t.y + Math.sin(cam.pitch) * cam.dist, t.z + Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.dist);
  camera.lookAt(t);
}
const ray = new THREE.Raycaster();
function onTap(handler) {
  const el = renderer.domElement, ptrs = new Map(); let start = null, pinch = 0;
  el.addEventListener('pointerdown', e => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); start = ptrs.size === 1 ? { x: e.clientX, y: e.clientY, t: Date.now(), moved: false } : null; });
  el.addEventListener('pointermove', e => {
    const p = ptrs.get(e.pointerId); if (!p) return;
    if (ptrs.size === 2) {
      p.x = e.clientX; p.y = e.clientY; const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinch) cam.dist = Math.min(22, Math.max(4, cam.dist * pinch / d)); pinch = d; return;
    }
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) start.moved = true;
    if (start && start.moved) { cam.yaw -= dx * 0.008; cam.pitch = Math.min(1.35, Math.max(0.15, cam.pitch + dy * 0.006)); }
  });
  const up = e => {
    ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = 0;
    if (start && !start.moved && Date.now() - start.t < 600) {
      ray.setFromCamera({ x: e.clientX / innerWidth * 2 - 1, y: -(e.clientY / innerHeight) * 2 + 1 }, camera);
      handler(ray);
    }
    start = null;
  };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', e => { ptrs.delete(e.pointerId); start = null; pinch = 0; });
  el.addEventListener('wheel', e => { e.preventDefault(); cam.dist = Math.min(22, Math.max(4, cam.dist * (e.deltaY > 0 ? 1.1 : 0.9))); }, { passive: false });
}

// 효과음은 파일 없이 코드로 만들어요
let actx = null;
function audio() { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); return actx; }
function clapSound() {
  const a = audio();
  for (let i = 0; i < 4; i++) {
    const t = a.currentTime + i * 0.13 + Math.random() * 0.03, len = 0.08;
    const buf = a.createBuffer(1, a.sampleRate * len, a.sampleRate), d = buf.getChannelData(0);
    for (let j = 0; j < d.length; j++) d[j] = (Math.random() * 2 - 1) * Math.pow(1 - j / d.length, 3);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = 1500; g.gain.value = 0.35;
    s.connect(f).connect(g).connect(a.destination); s.start(t);
  }
}
function dingSound() {
  const a = audio(), o = a.createOscillator(), g = a.createGain();
  o.frequency.value = 880; g.gain.setValueAtTime(0.15, a.currentTime); g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + 0.6);
  o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + 0.6);
}

function toast(msg, ms = 2600) {
  const t = document.getElementById('toast'); t.textContent = msg; t.classList.add('on');
  clearTimeout(toast.h); toast.h = setTimeout(() => t.classList.remove('on'), ms);
}
function myId() { let id = null; try { id = sessionStorage.getItem('oid'); } catch {} if (!id) { id = Math.random().toString(36).slice(2, 10); try { sessionStorage.setItem('oid', id); } catch {} } return id; }

// ── 단체사진 (영화관·미술관 공통) ──
// 들어온 사람 모두를 가상의 단상에 결혼식 사진처럼 세워 찍어요. 실제 캐릭터는 그대로 두고 사진용 복제만 만들어요.
const TEACHER_CODE = '0530', TEACHER_NAME = '유여진 강사';
const TEACHER_LOOK = { skin: 0xffd7b0, shirt: 0x2b2d42, pants: 0x1d1d1d, acc: 'shades', ac: 0x3a2618 };
const POSES = [[-2.9, -0.35, -2.9, 0.35], [0, 0, -2.9, 0.5], [-2.6, 0.5, -2.6, -0.5], [0, -0.8, 0, 0.8], [-1.4, 0, 0, 0], [-2.9, -0.3, 0, 0], [-0.3, -1.2, -0.3, 1.2]];
// 줄 나누기: 20명 → 12/8, 15명 → 7/5/3
function rowsFor(n) {
  if (n <= 8) return [n];
  if (n <= 14 || (n >= 20 && n <= 24)) { const f = Math.ceil(n * 0.6); return [f, n - f]; }
  const a = Math.round(n * 0.47), b = Math.round(n * 0.33); return [a, b, n - a - b];
}
// all: 들어온 사람들 {id,name,ch,teacher,joined,...}. make(id,p): 캐릭터 만들기, dress(av,p): 손에 든 것 등.
function groupStudio(all, { make, dress, backMap, backColor = 0x6c5ce7 }, seed) {
  let r = seed >>> 0; const rnd = () => { r = (r + 0x6D2B79F5) >>> 0; let t = r; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  all = all.slice().sort((a, b) => (a.joined || 0) - (b.joined || 0) || (a.id < b.id ? -1 : 1));
  // 강사는 늘 앞줄 가운데로 소환
  const teacher = all.find(p => p.teacher) || { id: 'teacher', name: TEACHER_NAME, teacher: true };
  const crowd = all.filter(p => !p.teacher), rows = rowsFor(crowd.length + 1), lines = []; let k = 0;
  rows.forEach((n, ri) => { const take = ri ? n : n - 1, row = crowd.slice(k, k + take); k += take; if (!ri) row.splice(Math.floor(row.length / 2), 0, teacher); lines.push(row); });
  const Z0 = 300, STEP = 1.2, SP = 1.05, g = new THREE.Group(); scene.add(g);
  const maxN = Math.max(...lines.map(l => l.length)), wid = maxN * SP + 3;
  lines.forEach((row, ri) => { if (ri) block(wid, ri * STEP, STEP, 0x8e1b2c, 0, ri * STEP / 2, Z0 - ri * STEP, g); });
  block(wid + 4, 0.1, lines.length * STEP + 8, 0x8e1b2c, 0, -0.05, Z0, g);
  const bh = lines.length * STEP + 4.6, back = new THREE.Mesh(new THREE.PlaneGeometry(wid + 4, bh), new THREE.MeshBasicMaterial({ map: backMap || null, color: backMap ? 0xffffff : backColor }));
  back.position.set(0, bh / 2, Z0 - lines.length * STEP - 0.4); g.add(back);
  // 뒤 배경 둘레를 넓게 같은 색 벽으로 (사진 가장자리에 하늘이 안 나오게)
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(400, 120), new THREE.MeshBasicMaterial({ color: backColor })); wall.position.set(0, 0, Z0 - lines.length * STEP - 0.6); g.add(wall);
  const temps = [];
  lines.forEach((row, ri) => row.forEach((p, i) => {
    const av = make('gp-' + p.id, p);
    place(av, (i - (row.length - 1) / 2) * SP, Z0 - ri * STEP); av.root.position.y = ri * STEP; av.root.rotation.y = 0;
    dress && dress(av, p);
    av.tag.position.y = 2.75; av.tag.scale.multiplyScalar(0.8); av.tag.visible = true;
    av.pose = POSES[Math.floor(rnd() * POSES.length)]; av.poseT = 99; temps.push(av);
  }));
  const hh = (lines.length - 1) * STEP + 3.3, yc = hh / 2, t = Math.tan(27.5 * Math.PI / 180), asp = innerWidth / innerHeight;
  const dist = Math.max(hh / 2 / t, (maxN * SP + 1.5) / 2 / (t * asp)) + 1.2;
  return { g, temps, names: lines.flat().map(p => p.name),
    cam: { pos: new THREE.Vector3(0, yc + 0.4, Z0 + dist), look: new THREE.Vector3(0, yc, Z0 - (lines.length - 1) * STEP / 2) } };
}
function endGroupStudio(st) { st.temps.forEach(a => removeAvatar(a.id)); scene.remove(st.g); }
