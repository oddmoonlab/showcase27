// ── 여기 두 줄만 채우면 여러 사람이 함께 접속돼요. 비어 있으면 '혼자 테스트' 모드(이 컴퓨터 안의 탭끼리만). ──
const SUPABASE_URL = 'https://kgjbxhxknxgbmsihvshe.supabase.co'; // 포트폴리오·모바일 작업실과 같은 프로젝트
const SUPABASE_KEY = 'sb_publishable_1K_wet7KC7fq7aPn6vB5dQ_nldPYACn'; // Publishable key (sb_publishable_ 로 시작). Secret key는 절대 넣지 마세요.

const ONLINE = !!(SUPABASE_URL && SUPABASE_KEY);
const sb = ONLINE ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;
const ROOM = ((new URLSearchParams(location.search).get('room')) || 'main').replace(/[^\w가-힣-]/g, '').slice(0, 20) || 'main';
const MAX_PEOPLE = 30;
const bc = ONLINE ? null : new BroadcastChannel('oddmoon-' + ROOM);

const LS = {
  get(k, d) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

// 작품 목록·설정 (관리자 페이지가 고치고, 영화관·미술관이 읽음)
const DB = {
  async list(table) {
    if (ONLINE) {
      const { data, error } = await sb.from(table).select('*').order('ord').order('id');
      if (error) throw error;
      return data;
    }
    return LS.get('t_' + table, []).sort((a, b) => a.ord - b.ord || a.id - b.id);
  },
  async insert(table, row) {
    if (ONLINE) { const { error } = await sb.from(table).insert(row); if (error) throw error; return; }
    const rows = LS.get('t_' + table, []); rows.push({ id: Date.now(), ...row }); LS.set('t_' + table, rows);
  },
  async update(table, id, row) {
    if (ONLINE) { const { error } = await sb.from(table).update(row).eq('id', id); if (error) throw error; return; }
    LS.set('t_' + table, LS.get('t_' + table, []).map(r => r.id === id ? { ...r, ...row } : r));
  },
  async remove(table, id) {
    if (ONLINE) { const { error } = await sb.from(table).delete().eq('id', id); if (error) throw error; return; }
    LS.set('t_' + table, LS.get('t_' + table, []).filter(r => r.id !== id));
  },
  async settings() {
    if (ONLINE) {
      const { data, error } = await sb.from('settings').select('*');
      if (error) throw error;
      return Object.fromEntries(data.map(r => [r.key, r.value]));
    }
    return LS.get('t_settings', {});
  },
  async saveSettings(obj) {
    if (ONLINE) {
      const { error } = await sb.from('settings').upsert(Object.entries(obj).map(([key, value]) => ({ key, value })));
      if (error) throw error; return;
    }
    LS.set('t_settings', { ...LS.get('t_settings', {}), ...obj });
  },
};

// 상영 상태: 지금 몇 번째 순서(idx)를 언제(at) 시작했는지. 모두가 같은 값을 보고 같은 장면을 틀어요.
let clockOffset = 0;
const Show = {
  async syncClock() {
    if (!ONLINE) return;
    const t0 = Date.now(); const { data } = await sb.rpc('server_now'); const t1 = Date.now();
    if (data) clockOffset = new Date(data).getTime() - (t0 + t1) / 2;
  },
  now() { return Date.now() + clockOffset; },
  async get(room = ROOM) {
    if (ONLINE) {
      const { data } = await sb.from('shows').select('*').eq('room', room).maybeSingle();
      return data ? { idx: data.idx, at: new Date(data.started_at).getTime() } : { idx: -1, at: 0 };
    }
    return LS.get('show_' + room, { idx: -1, at: 0 });
  },
  async start() {
    if (ONLINE) return sb.rpc('start_show', { p_room: ROOM });
    const s = LS.get('show_' + ROOM, { idx: -1 });
    if (s.idx < 0) { LS.set('show_' + ROOM, { idx: 0, at: Date.now() }); bc.postMessage({ t: 'show' }); Show.cb && Show.cb(); }
  },
  async advance(from) {
    if (ONLINE) return sb.rpc('advance_show', { p_room: ROOM, p_from: from });
    const s = LS.get('show_' + ROOM, { idx: -1, at: 0 });
    if (s.idx === from && Date.now() - s.at > 3000) { LS.set('show_' + ROOM, { idx: from + 1, at: Date.now() }); bc.postMessage({ t: 'show' }); Show.cb && Show.cb(); }
  },
  // 관리자용: idx -1 = 상영 전(모두 앉으면 시작), 0 = 지금 처음부터
  async set(room, idx) {
    if (ONLINE) {
      const { error } = await sb.from('shows').upsert({ room, idx, started_at: new Date(Show.now()).toISOString() });
      if (error) throw error; return;
    }
    LS.set('show_' + room, { idx, at: Date.now() });
    new BroadcastChannel('oddmoon-' + room).postMessage({ t: 'show' });
  },
  watch(cb) {
    if (ONLINE) {
      sb.channel('show-' + ROOM)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'shows', filter: 'room=eq.' + ROOM }, () => cb())
        .subscribe();
    } else { Show.cb = cb; bc.addEventListener('message', e => e.data.t === 'show' && cb()); } // 같은 탭은 자기 알림을 못 받아서 직접 부름
    setInterval(cb, 15000); // 혹시 놓친 알림 대비
  },
};

// 같은 방 사람들: 각자 자기 상태(이름·캐릭터·목적지·자리…)를 알리고, 모두의 상태 목록을 받아요.
function joinRoom(me, onPeople, onEvent, space = 'cinema') { // 영화관·미술관은 서로 다른 방
  let state = {};
  if (ONLINE) {
    const ch = sb.channel('room-' + space + '-' + ROOM, { config: { presence: { key: me }, broadcast: { self: false } } });
    ch.on('presence', { event: 'sync' }, () => {
      const ps = ch.presenceState();
      onPeople(Object.entries(ps).map(([id, arr]) => ({ ...arr[arr.length - 1], id })));
    });
    ch.on('broadcast', { event: 'ev' }, ({ payload }) => onEvent(payload));
    let ready = false, timer = null, last = 0;
    const flush = () => { timer = null; last = Date.now(); ch.track(state); };
    ch.subscribe(st => { if (st === 'SUBSCRIBED') { ready = true; flush(); } });
    return {
      track(s) {
        state = s;
        if (!ready || timer) return;
        const wait = Math.max(0, 250 - (Date.now() - last)); // 너무 자주 보내지 않기(무료 한도 보호)
        timer = setTimeout(flush, wait);
      },
      send(p) { ch.send({ type: 'broadcast', event: 'ev', payload: p }); },
      leave() { ch.unsubscribe(); },
    };
  }
  const bc = new BroadcastChannel('oddmoon-' + space + '-' + ROOM);
  const peers = new Map();
  const emit = () => onPeople([{ ...state, id: me }, ...[...peers].map(([id, p]) => ({ ...p.s, id }))]);
  bc.addEventListener('message', e => {
    const m = e.data;
    if (m.t === 'state') { peers.set(m.id, { s: m.s, seen: Date.now() }); emit(); }
    else if (m.t === 'bye') { peers.delete(m.id); emit(); }
    else if (m.t === 'hello') bc.postMessage({ t: 'state', id: me, s: state });
    else if (m.t === 'ev') onEvent(m.p);
  });
  setInterval(() => {
    bc.postMessage({ t: 'state', id: me, s: state });
    for (const [id, p] of peers) if (Date.now() - p.seen > 6000) peers.delete(id);
    emit();
  }, 2000);
  addEventListener('pagehide', () => bc.postMessage({ t: 'bye', id: me }));
  bc.postMessage({ t: 'hello' });
  return {
    track(s) { state = s; bc.postMessage({ t: 'state', id: me, s }); emit(); },
    send(p) { bc.postMessage({ t: 'ev', p }); },
    leave() { bc.postMessage({ t: 'bye', id: me }); },
  };
}

// 유튜브·쇼츠 주소 → 영상 id
function youtubeId(url) {
  const m = String(url).match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}
function instagramEmbed(url) {
  const m = String(url).match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
  return m ? `https://www.instagram.com/${m[1] === 'reels' ? 'reel' : m[1]}/${m[2]}/embed` : null;
}
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

// 상영 순서 만들기: 제목 → 광고 → 작품1 → (15초 다음 작품 안내 → 작품2) … → 끝
function buildPhases(films, settings) {
  const ph = [{ type: 'title', secs: 7 }];
  if (settings.ad_url) ph.push({ type: 'ad', url: settings.ad_url, secs: +settings.ad_seconds || (youtubeId(settings.ad_url) ? 0 : 30) });
  films.forEach((f, i) => {
    if (i > 0) ph.push({ type: 'break', film: f, secs: 15 });
    ph.push({ type: 'film', film: f, url: f.url, secs: +f.seconds || (youtubeId(f.url) ? 0 : 60) });
  });
  ph.push({ type: 'end' });
  return ph;
}

// 미술관 방명록 (누구나 쓰기·보기, 지우기는 관리자만)
const Guestbook = {
  async list(room = ROOM) {
    if (ONLINE) {
      const { data, error } = await sb.from('guestbook').select('*').eq('room', room).order('created_at', { ascending: false }).limit(100);
      if (error) throw error; return data;
    }
    return LS.get('gb_' + room, []);
  },
  async add(name, text) {
    const row = { room: ROOM, name: String(name).slice(0, 10), text: String(text).slice(0, 80) };
    if (ONLINE) { const { error } = await sb.from('guestbook').insert(row); if (error) throw error; return; }
    LS.set('gb_' + ROOM, [{ id: Date.now(), ...row, created_at: new Date().toISOString() }, ...LS.get('gb_' + ROOM, [])].slice(0, 100));
  },
  async remove(id, room) {
    if (ONLINE) { const { error } = await sb.from('guestbook').delete().eq('id', id); if (error) throw error; return; }
    LS.set('gb_' + room, LS.get('gb_' + room, []).filter(r => r.id !== id));
  },
};

// ── 학생 포트폴리오 사이트에서 작품 자동으로 가져오기 (읽기만 해요) ──
// 관리자 페이지에 포트폴리오 사이트 주소를 넣으면, 그 사이트의 저장 칸 정보(src)를 설정 'portfolio_<방 이름>' 에 저장해요.
// 학생이 넣은 애니메이션 → 영화관, 이모티콘·스톡이미지 → 미술관. 관리자 표의 작품 뒤에 학생 번호 순으로 붙어요.
const Portfolio = {
  // 포트폴리오 index.html 글에서 저장 칸 정보를 찾아요. 공개용 키만 받아요.
  parse(html, site) {
    const pick = n => { const m = html.match(new RegExp('const\\s+' + n + '\\s*=\\s*([\'"`])(.*?)\\1')); return m ? m[2] : null; };
    const src = { url: pick('SUPABASE_URL'), key: pick('SUPABASE_ANON_KEY'), table: pick('KV_TABLE') || 'kv_store', prefix: pick('KEY_PREFIX') || '', course: pick('COURSE_MAIN') || '', site: site || '' };
    if (!src.url || !/^https:\/\/[\w-]+\.supabase\.co$/.test(src.url)) throw new Error('포트폴리오 사이트의 저장소 주소를 못 찾았어요');
    if (!src.key || /secret|service_role/i.test(src.key)) throw new Error('포트폴리오 사이트의 공개용 키를 못 찾았어요');
    if (!/^[\w-]+$/.test(src.table)) throw new Error('저장 칸 이름이 이상해요');
    return src;
  },
  async fromSite(site) {
    const r = await fetch(site, { cache: 'no-store' }); // 포트폴리오 사이트가 다른 곳의 읽기를 막으면 여기서 실패 → 파일로 고르기
    if (!r.ok) throw new Error('주소를 열 수 없어요 (' + r.status + ')');
    return Portfolio.parse(await r.text(), site);
  },
  src(settings, room = ROOM) { try { return JSON.parse(settings['portfolio_' + room] || 'null'); } catch { return null; } },
  async load(src) {
    if (!src) return { films: [], artworks: [], names: [] };
    const q = (k, op) => `key.${op}.${JSON.stringify(src.prefix + k)}`;
    const r = await fetch(`${src.url}/rest/v1/${src.table}?select=key,value&or=(${encodeURIComponent(q('config', 'eq') + ',' + q('student-*', 'like'))})`,
      { headers: { apikey: src.key } });
    if (!r.ok) throw new Error('포트폴리오 ' + r.status);
    const kv = Object.fromEntries((await r.json()).map(x => [x.key.slice(src.prefix.length), x.value || {}]));
    const names = (kv.config && kv.config.names) || [];
    const films = [], artworks = [];
    names.forEach((n, i) => {
      const d = kv['student-' + i]; if (!d) return;
      const who = (n || '').trim() || String(i + 1).padStart(3, '0');
      const ok = s => typeof s === 'string' && s.trim();
      ((d.animations || {}).video || []).forEach((v, j) => ok(v.link) && films.push({ id: `p${i}v${j}`, student: who, title: v.title || '', url: v.link.trim(), seconds: null, from: 'portfolio' }));
      const pics = [...((d.emoticons || {}).ogq || []), ...((d.emoticons || {}).line || [])].map(x => [x, '큰', 'emoticon'])
        .concat([...((d.stockImages || {}).miri || []), ...((d.stockImages || {}).crowdpic || [])].map((x, k) => [x, k % 3 ? '보통' : '큰', 'stock']));
      pics.forEach(([x, size, kind], j) => ok(x.image) && artworks.push({ id: `p${i}a${j}`, artist: who, title: x.title || '', image_url: x.image.trim(), size, kind, link: x.link || '', from: 'portfolio' }));
    });
    return { films, artworks, names };
  },
  // 관리자 표의 목록 + 포트폴리오 작품 (관리자가 '빼기' 한 것과 이미 표에 있는 주소는 빼요)
  async merge(table, rows, settings) {
    let extra = [];
    try { extra = (await Portfolio.load(Portfolio.src(settings)))[table]; } catch (e) { console.error(e); return rows; }
    const hidden = new Set((settings.portfolio_hidden || '').split('\n').filter(Boolean));
    const k = table === 'films' ? 'url' : 'image_url', have = new Set(rows.map(r => r[k]));
    return rows.concat(extra.filter(r => !hidden.has(pfKey(r[k])) && !have.has(r[k])));
  },
};
// 다른 사이트 그림은 3D 벽에 못 거는 경우가 많아서, 그림 중계 주소를 거쳐 불러와요
function wallSrc(u) { return /^data:|supabase\.co\/storage|images\.weserv\.nl/.test(u) ? u : 'https://images.weserv.nl/?url=' + encodeURIComponent(u); }
// '빼기' 목록에 넣을 짧은 이름 (올린 그림은 주소가 아주 길어서 줄여요)
function pfKey(u) { if (u.length < 300) return u; let h = 0; for (let i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0; return '#' + u.length + ':' + h; }
