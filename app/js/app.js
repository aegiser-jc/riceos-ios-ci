/* RiceOS farmer PWA. Plain JS, no build, localStorage only (no server).
   Screens follow คุณนพดล's 7 images; flagged items switch via content/flags.json (true = as on his screen, false = alt text). */
(function () {
  'use strict';
  var KEY = 'riceos.v1', app = document.getElementById('app'), nav = document.getElementById('nav');
  var FLAGS = {}, KB = null, LESSONS = null, RULESETS = [];
  var params = new URLSearchParams(location.search);
  if (params.get('shot')) document.body.classList.add('shot');

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var FLAG_TEXT = {"agency_logo":{"identical":{"show_logo":true,"agency_line":"กรมการข้าว × จังหวัดพิษณุโลก"},"alt":{"show_logo":false,"agency_line":""}},"profit_before_2700":{"identical":{"before":"(เดิม 2,700 บ./ไร่)","pct":"+42.6%"},"alt":{"before":"(เดิม 3,150 บ./ไร่)","pct":"+22%"}},"yield_750_600":{"identical":{"y750":"750","y600":"600"},"alt":{"y750":"ไม่มีข้อมูลยืนยัน","y600":"ไม่มีข้อมูลยืนยัน"}},"prices_98_95_110":{"identical":{"p98":"9.8","p95":"9.5","p110":"11.0","p92":"9.2"},"alt":{"p98":"-","p95":"-","p110":"-","p92":"-","note":"ราคา: ไม่มีข้อมูลยืนยัน"}},"locked_15_ton":{"identical":{"locked":"ล็อกแล้ว 15 ตัน","cta":"รับสัญญา (ล็อกราคา)"},"alt":{"locked":"ยังไม่มีสัญญา","cta":"แจ้งความสนใจขาย"}},"ai_advice_figures":{"identical":{"use_his_chat":true,"ref":"อ้างอิง: คู่มือกรมการข้าว 2568"},"alt":{"use_his_chat":false,"ref":"อ้างอิง: ไม่มีข้อมูลยืนยัน"}},"ph_label_inconsistency":{"identical":{"plot_label":"ปานกลาง","table_label":"เป็นกรดเล็กน้อย"},"alt":{"plot_label":"ไม่มีข้อมูลยืนยัน","table_label":"ไม่มีข้อมูลยืนยัน"}},"typos_as_shown":{"identical":{"ask1":"กามได้ทุกเรื่อง","ask2":"กามพี่เลี้ยง AI","canal":"เขตชลประทานคลองช้าย","om":"(อินทริยวัตถุ)","offer_tag":"จ้งเสนอแนะนำ"},"alt":{"ask1":"ถามได้ทุกเรื่อง","ask2":"ถามพี่เลี้ยง AI","canal":"เขตชลประทานคลองซ้าย","om":"(อินทรียวัตถุ)","offer_tag":"ข้อเสนอแนะนำ"}}};
  function F(flag, key) { var t = FLAG_TEXT[flag]; if (!t || typeof FLAGS[flag] !== 'boolean') return ''; return (FLAGS[flag] ? t.identical : t.alt)[key]; }
  function fmt(n) { return Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 }); }
  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('บันทึกไม่ได้: พื้นที่เครื่องเต็ม'); } try { scheduleSync(); } catch (e) {} }
  function toast(t) { document.querySelectorAll('.toast').forEach(function (x) { x.remove(); }); var d = document.createElement('div'); d.className = 'toast'; d.textContent = t; document.body.appendChild(d); setTimeout(function () { d.remove(); }, 2600); }
  function today() { var d = new Date(); d.setHours(0, 0, 0, 0); return d; }
  function daysSince(iso) { return Math.floor((today() - new Date(iso + 'T00:00:00')) / 864e5); }
  function isoDate(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10); }
  function getJSON(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  var S = load();
  if (S.profile && S.profile.idHash !== undefined) { delete S.profile.idHash; try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} } /* no ID-card hash is kept any more */

  /* ---------- seed: the farmer shown on คุณนพดล's screens ---------- */
  function seed() {
    var sow = new Date(today().getTime() - 42 * 864e5);
    var plot = { id: 'p1', code: 'A', name: 'แปลงลุงสมชาย', rai: 20, area_source: 'self_declared', variety: 'กข85', sowDate: isoDate(sow),
      district: 'อ.บางระกำ จ.พิษณุโลก', soil: { ph: '5.2', om: '1.1%' }, map: true, kratongs: [] };
    for (var i = 1; i <= 10; i++) plot.kratongs.push({ seq: i, label: 'กระทง ' + i, qr: 'RICE-TUBE-A-' + i, lastRead: null });
    S = { seeded: true, consent: { core: true, public_rank: true, baac: false, ver: 'c1', at: new Date().toISOString() },
      profile: { name: 'ลุงสมชาย', district: 'อ.บางระกำ จ.พิษณุโลก', voice: 'ชาย', avatar: 'img/avatar.png',
        weather: { t: '31°C', rain: 'ฝน 60% พรุ่งนี้' }, wallet: '48,500', credit: 'A' },
      plots: [plot], evidence: [], lessons: {},
      ledger: [{ id: 1, rule_id: 'OPENING', rule_set_version: '-', points: 1250, league_points: 1250, state: 'confirmed', reason: 'ยอดยกมา', occurred_at: new Date().toISOString() }] };
    save();
  }
  var dev = false; try { dev = localStorage.getItem('riceos.dev') === '1'; } catch (e) {}
  if (dev && params.get('seed') && !S.registered) seed(); /* screen-check only: needs a localStorage dev key, never set by URL */

  /* ---------- icons (inline SVG, stroke) ---------- */
  var IC = {
    home: '<path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/>',
    plot: '<path d="M2 20c4-6 8-9 20-10M2 15c5-5 9-7 20-8M4 21c5-3 10-5 18-5"/>',
    market: '<path d="M3 9l2-5h14l2 5M3 9h18M3 9c0 2 4 2 4 0 0 2 5 2 5 0 0 2 5 2 5 0 0 2 4 2 4 0M5 11v9h14v-9M10 20v-5h4v5"/>',
    money: '<ellipse cx="9" cy="6" rx="6" ry="2.5"/><path d="M3 6v4c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5V6M3 10v4c0 1.4 2.7 2.5 6 2.5M15 13a6 2.5 0 1 0 6 0M15 13v4c0 1.4 2.7 2.5 6 2.5V13"/>',
    mission: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8.5 13l2.5 2.5 4.5-5"/>'
  };
  function svg(name) { return '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + IC[name] + '</svg>'; }
  var NAV = [['home', 'หน้าแรก', 'home'], ['plot', 'แปลง', 'plot'], ['market', 'ตลาด', 'market'], ['wallet', 'เงิน', 'money'], ['missions', 'ภารกิจ', 'mission']];
  var NAV_OF = { home: 'home', register: 'home', plot: 'plot', analysis: 'plot', options: 'plot', kratong: 'plot', market: 'market', points: 'wallet', wallet: 'wallet', lot: 'plot', dashboard: '', gov: '', missions: 'missions', lessons: 'missions', mentor: '' };
  function drawNav(route) {
    var on = NAV_OF[route];
    nav.innerHTML = NAV.map(function (n) { return '<a href="#/' + n[0] + '" class="' + (n[0] === 'home' ? 'home ' : '') + (on === n[0] ? 'on' : '') + '">' + svg(n[2]) + n[1] + '</a>'; }).join('');
  }

  /* ---------- shared blocks ---------- */
  function header(opts) {
    opts = opts || {};
    var logo = F('agency_logo', 'show_logo') ? '<img class="logo" alt="" src="' + (opts.pl ? 'img/logo-pl.png' : 'img/logo.png') + '">' : '';
    return '<header class="hdr' + (opts.tall ? ' tall' : '') + '">' + logo + '<div><div class="brand">Rice<span>OS</span></div>' +
      '<div class="l2">โครงการนาเดียว หลายรายได้</div><div class="l3">' + esc(F('agency_logo', 'agency_line')) + '</div></div>' +
      (opts.bell ? '<button class="bell" aria-label="แจ้งเตือน" onclick="location.hash=\'#/missions\'">🔔<i></i></button>' : '') + '</header>';
  }
  function titleRow(title, sub, extra, pre) {
    return '<div class="titlerow"><button class="back" aria-label="กลับ" onclick="history.length>1?history.back():location.hash=\'#/home\'">←</button>' + (pre || '') +
      '<div><h1>' + title + '</h1>' + (sub ? '<div class="sub">' + sub + '</div>' : '') + '</div>' + (extra || '') + '</div>';
  }
  function P() { return S.plots && S.plots[0]; }
  function age(p) { return p && p.sowDate ? Math.max(0, daysSince(p.sowDate)) : null; }
  function profileCard(rows, thumb) {
    var pr = S.profile || {};
    return '<div class="card pcard"><img class="av" alt="" src="' + esc(pr.avatar || 'icons/icon-192.png') + '"><div><b style="font-size:20px">' + esc(pr.name || '') + '</b>' +
      '<div style="font-size:13.5px"><span class="green">📍</span>' + esc(pr.district || '') + '</div></div>' +
      '<div class="info">' + rows.map(function (r) { return '<div>' + r + '</div>'; }).join('') + '</div>' + (thumb ? '<img class="th" alt="" src="' + thumb + '">' : '') + '</div>';
  }
  function stdRows() { var p = P() || {}; return ['🌾 แปลง ' + fmt(p.rai || 0) + ' ไร่', '📅 พันธุ์ ' + esc(p.variety || '-'), '🌱 อายุข้าว ' + (age(p) == null ? '-' : age(p)) + ' วัน']; }
  function advice() { return '<p class="note">คำแนะนำประกอบเท่านั้น ไม่รับประกันผลผลิตหรือรายได้ ตัวเลขในหน้านี้มาจากข้อมูลที่ได้รับ ยังต้องยืนยันกับเจ้าหน้าที่</p>'; }

  /* ---------- points ---------- */
  function totals() {
    var t = { confirmed: 0, pending: 0, league: 0, week: 0 }, wk = RicePoints.weekStart(new Date());
    (S.ledger || []).forEach(function (r) {
      if (r.state === 'pending') t.pending += r.points; else t.confirmed += r.points;
      if (r.rule_id !== 'OPENING' && RicePoints.weekStart(r.occurred_at) === wk) t.week += r.league_points;
    });
    return t;
  }
  function award(eventType, payload, state) {
    var ts = new Date().toISOString(), rs = RicePoints.inForce(RULESETS, ts);
    if (!rs) return 0;
    var p = P(), used = RicePoints.usedFromLedger((S.ledger || []).filter(function (r) { return r.rule_id !== 'OPENING'; }));
    var rows = RicePoints.evaluate(rs, { type: eventType, payload: payload, occurred_at: ts }, p ? p.rai : 0, p ? p.area_source : null, used);
    var sum = 0;
    rows.forEach(function (r) { r.id = (S.ledger.length + 1); r.state = state; r.occurred_at = ts; S.ledger.push(r); sum += r.points; });
    save(); return sum;
  }
  function previewPoints(missionType) {
    var rs = RicePoints.inForce(RULESETS, new Date().toISOString()), p = P();
    if (!rs || !p) return 0;
    var used = RicePoints.usedFromLedger((S.ledger || []).filter(function (r) { return r.rule_id !== 'OPENING'; }));
    return RicePoints.evaluate(rs, { type: 'mission_completed', payload: { mission_type: missionType, quality: 'pass' }, occurred_at: new Date().toISOString() }, p.rai, p.area_source, used)
      .reduce(function (a, r) { return a + r.points; }, 0);
  }

  /* ---------- missions by rice age (placeholder calendar, awaiting expert approval) ---------- */
  function sampleToday(p) {
    if (!p || !p.kratongs.length) return [];
    var k = Math.max(1, Math.ceil(p.kratongs.length * 0.2));
    return p.kratongs.slice().sort(function (a, b) { return (a.lastRead || '') < (b.lastRead || '') ? -1 : (a.lastRead || '') > (b.lastRead || '') ? 1 : a.seq - b.seq; }).slice(0, k);
  }
  function mission(p) {
    var a = age(p);
    if (a == null) return null;
    if (p.harvested) return { type: 'no_burn', title: 'ไม่เผาฟางและตอซัง', sub: 'ถ่ายรูปแปลงหลังเก็บเกี่ยวพร้อมพิกัด' };
    var due = sampleToday(p), done = due.filter(function (k) { return k.lastRead && k.lastRead.slice(0, 10) === isoDate(today()); }).length;
    var dayN = (a % 7) + 1;
    return { type: 'awd_tube_photo', title: 'ปล่อยน้ำแห้ง วันที่ ' + dayN + '/7 (AWD)', sub: 'ช่วยลดต้นทุน เพิ่มผลผลิต และลดคาร์บอน',
      detail: 'วันนี้ถ่ายรูปกระทงที่ ' + due.map(function (k) { return k.seq; }).join(', ') + ' (จากทั้งหมด ' + p.kratongs.length + ' กระทง) ถ่ายแล้ว ' + done + ' จาก ' + due.length, due: due };
  }

  /* ---------- screens ---------- */
  var R = {};

  /* ---------- session, forms and sync (API in js/api.js) ---------- */
  var ME = null, MEPROMISE = null, OFFLINE = false, API = window.RiceAPI || null;
  var WEAK_PINS = ['000000', '123456', '654321', '121212', '112233'];
  function normPhone(v) { return String(v || '').replace(/\D/g, ''); }
  function pinProblem(p, p2) {
    if (!/^\d{6}$/.test(p)) return 'PIN ต้องเป็นตัวเลข 6 หลัก';
    if (/^(\d)\1{5}$/.test(p) || WEAK_PINS.indexOf(p) >= 0) return 'PIN เดาง่ายเกินไป เช่น 123456 หรือเลขซ้ำ กรุณาเลือกใหม่';
    if (p2 !== undefined && p !== p2) return 'PIN สองช่องไม่ตรงกัน';
    return '';
  }
  function pinField(id, label) {
    return '<label for="' + id + '">' + label + '</label><div class="pinrow"><input id="' + id + '" class="pin" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="6" autocomplete="off" placeholder="ใส่เลข 6 หลัก">' +
      '<button type="button" class="pinshow" data-for="' + id + '" aria-label="แสดงหรือซ่อน PIN">แสดง</button></div>';
  }
  function wireForm(root) {
    root.querySelectorAll('.pinshow').forEach(function (b) { b.onclick = function () { var i = root.querySelector('#' + b.dataset.for), show = i.type === 'password'; root.querySelectorAll('.pin').forEach(function (x) { x.type = show ? 'text' : 'password'; }); root.querySelectorAll('.pinshow').forEach(function (x) { x.textContent = show ? 'ซ่อน' : 'แสดง'; }); }; });
    root.querySelectorAll('.pin').forEach(function (i) { i.oninput = function () { var v = i.value.replace(/\D/g, '').slice(0, 6); if (v !== i.value) i.value = v; }; });
    root.querySelectorAll('input[inputmode=tel]').forEach(function (i) { i.oninput = function () { var v = i.value.replace(/[^\d]/g, '').slice(0, 10); if (v !== i.value) i.value = v; }; });
  }
  function showErr(msg, html) { var e = document.getElementById('err'); if (!e) return toast(msg);
    document.querySelectorAll('.pinrow.bad').forEach(function (x) { x.classList.remove('bad'); });
    var pin = document.getElementById('pin'), pr = pin && pin.closest('.pinrow');
    var ph = document.getElementById('ph'); if (ph) ph.classList.remove('bad');
    if (pr && /PIN/.test(msg || '')) { pr.classList.add('bad'); pr.insertAdjacentElement('afterend', e); if (ph && /เบอร์/.test(msg) && /หรือ/.test(msg)) ph.classList.add('bad'); } if (html) e.innerHTML = html; else e.textContent = msg; e.hidden = !(msg || html); if (msg || html) try { e.scrollIntoView({ block: 'center' }); } catch (x) {} }
  function busy(b, on, label) { if (!b) return; if (on) { b.dataset.l = b.textContent; b.textContent = label || 'กำลังส่ง...'; b.disabled = true; } else { b.textContent = b.dataset.l || b.textContent; b.disabled = false; } }
  function noApi() { return !API; }
  var CFG = null;
  function getConfig() {
    if (CFG) return Promise.resolve(CFG); if (noApi()) return Promise.resolve({});
    return API.config().then(function (j) { CFG = j; return j; }, function () { return {}; });
  }
  /* LINE sign-in is hidden when the server flag is off and inside the iOS app wrapper */
  function lineAllowed(c) {
    var cap = window.Capacitor, plat = cap && (cap.getPlatform ? cap.getPlatform() : cap.platform);
    return !!(c && c.line_login) && plat !== 'ios';
  }
  function lineBtn(label) { return '<button type="button" class="btn line" id="linebtn"><span class="lg" aria-hidden="true">LINE</span>' + label + '</button>'; }
  function wireLine(root, fn) {
    var b = root.querySelector('#linebtn'); if (!b) return;
    b.onclick = function () { busy(b, true, 'กำลังเปิด LINE...'); (fn || API.lineStart)().then(function (j) { location.href = j.authorize_url; }, function (e) { busy(b, false); showErr(e.message); }); };
  }
  var LINE_ERR = { state: 'การเข้าสู่ระบบหมดเวลา กรุณาเริ่มใหม่อีกครั้ง', denied: 'ท่านยังไม่ได้อนุญาตใน LINE กรุณาลองใหม่ หรือใช้เบอร์มือถือและ PIN', line_failed: 'เชื่อมต่อ LINE ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', line_taken: 'บัญชี LINE นี้ผูกกับบัญชีอื่นแล้ว', disabled: 'ยังไม่เปิดใช้การเข้าสู่ระบบด้วย LINE', line_disabled: 'ยังไม่เปิดใช้การเข้าสู่ระบบด้วย LINE' };
  function getMe(force) {
    if (noApi()) return Promise.reject({ network: true });
    if (!force && ME) return Promise.resolve(ME);
    if (!force && MEPROMISE) return MEPROMISE;
    MEPROMISE = API.me().then(function (j) { ME = j; OFFLINE = false; MEPROMISE = null; return j; }, function (e) { MEPROMISE = null; if (e.status !== 401) OFFLINE = true; throw e; });
    return MEPROMISE;
  }
  /* rebuild local state from the server on a new phone or after login */
  function hydrate(me, fresh) {
    var u = me.user || {}, st = me.state || {}, blob = st.blob || st;
    if (fresh) { var keep = { consent: S.consent }; S = keep; }
    S.account = { phone: u.phone || (S.account || {}).phone, id: u.public_id || (S.account || {}).id };
    S.profile = S.profile || {}; S.profile.name = u.name || S.profile.name || 'เกษตรกร';
    S.profile.district = u.district || S.profile.district || ''; S.profile.voice = u.voice || S.profile.voice || 'ชาย'; S.profile.avatar = S.profile.avatar || 'img/avatar.png';
    delete S.profile.idHash;
    var old = S.plots || [], byPid = {}; old.forEach(function (p) { if (p.pid) byPid[p.pid] = p; });
    var extra = {}; ((blob && blob.plotMeta) || []).forEach(function (m) { extra[m.pid] = m; });
    if ((me.plots || []).length) S.plots = me.plots.map(function (sp, i) {
      var pid = sp.id, p = byPid[pid] || { id: 'p' + (i + 1), code: String.fromCharCode(65 + i), area_source: 'self_declared', kratongs: [] };
      p.pid = pid; p.name = sp.name || p.name; p.rai = Number(sp.rai) || p.rai; p.sowDate = sp.sow_date || p.sowDate; p.district = sp.district || p.district; p.variety = p.variety || (extra[pid] || {}).variety || '';
      var n = Number(sp.kratong_count) || p.kratongs.length || 1; while (p.kratongs.length < n) { var s = p.kratongs.length + 1; p.kratongs.push({ seq: s, label: 'กระทง ' + s, qr: 'RICE-TUBE-' + p.code + '-' + s, lastRead: null }); }
      p.kratongs = p.kratongs.slice(0, n); return p;
    });
    if (blob && blob.ledger && (!S.ledger || !S.ledger.length || fresh)) S.ledger = blob.ledger;
    if (blob && blob.lessons && (fresh || !S.lessons)) S.lessons = blob.lessons;
    S.ledger = S.ledger || []; S.evidence = S.evidence || []; S.lessons = S.lessons || {};
    var c = me.consents || {};
    if (c.core) S.consent = { core: true, public_rank: !!c.public_rank, baac: !!c.baac, ver: c.version || 'c2', at: (S.consent || {}).at || new Date().toISOString() };
    S.registered = true; S.regStep = 1; save();
  }
  function goHome() { if (location.hash === '#/home') route(); else location.hash = '#/home'; }
  var syncT = null;
  function stateBlob() { return { ledger: (S.ledger || []).slice(-300), lessons: S.lessons || {}, plotMeta: (S.plots || []).filter(function (p) { return p.pid; }).map(function (p) { return { pid: p.pid, variety: p.variety || '' }; }) }; }
  function scheduleSync() {
    if (noApi() || !S.registered || S.seeded || !ME) return; clearTimeout(syncT);
    syncT = setTimeout(function () { try { API.putState(stateBlob()).catch(function () {}); } catch (e) {} }, 5000);
  }
  function plotBody(p) { return { name: p.name, rai: p.rai, district: p.district || (S.profile || {}).district || '-', sow_date: p.sowDate, kratong_count: p.kratongs.length }; }
  function syncPlot(p) {
    if (noApi() || !p) return Promise.reject({ network: true });
    if (p.pid) return API.req('PATCH', '/api/plots/' + encodeURIComponent(p.pid), plotBody(p));
    return API.createPlot(plotBody(p)).then(function (j) { var sp = j.plot || j; p.pid = sp.id; save(); return j; });
  }
  /* ---------- outbox glue ---------- */
  function updateBadge() {
    var b = document.getElementById('obx'); if (!b || noApi()) return;
    API.outbox.count().then(function (c) { var n = c.pending + c.failed; b.hidden = !n; b.innerHTML = n ? '📤 รอส่ง ' + n + ' รายการ' + (c.failed ? ' <small>(ส่งไม่ผ่าน ' + c.failed + ')</small>' : '') : ''; });
  }
  function flushOutbox() {
    if (noApi() || (S.seeded && !S.registered)) return Promise.resolve({ sent: 0, left: 0 });
    var need = (S.plots || []).filter(function (p) { return !p.pid; });
    return Promise.all(need.map(function (p) { return syncPlot(p).catch(function () {}); })).then(function () {
      return API.outbox.flush({
        prepare: function (it) { if (!it.meta.plot_id) { var p = (S.plots || []).filter(function (x) { return x.id === it.plot_local; })[0]; if (p && p.pid) it.meta.plot_id = p.pid; } },
        sent: function (it) { (S.evidence || []).forEach(function (e) { if (e.uuid === it.client_uuid) e.sent = true; }); }
      });
    }).then(function (r) { save(); updateBadge(); return r; });
  }
  setInterval(function () { if (!document.hidden) flushOutbox().catch(function () {}); }, 60000);
  window.addEventListener('online', function () { flushOutbox().catch(function () {}); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) flushOutbox().catch(function () {}); });

  /* ---------- register (consent, account + PIN, plot, voice) ---------- */
  R.register = function () {
    var consent = S.consent && S.consent.core && S.consent.ver === 'c2';
    var step = !consent ? 0 : (!S.account && !S.seeded ? 1 : Math.min(3, Math.max(S.account ? 2 : 1, Number(params.get('step') || S.regStep || 1))));
    if (S.seeded && !S.account && step === 1) step = 2;
    var steps = [['สร้างบัญชี', '& PIN'], ['ยืนยัน', 'แปลง'], ['เลือก', 'เสียงพี่เลี้ยง']];
    var body = '', pr = S.profile || {};
    if (!consent) {
      body = '<div class="stepcard auth"><h2>ความยินยอม (PDPA)</h2><p class="big">ใช้ข้อมูลเพื่อบริการในโครงการเท่านั้น <b>เก็บชื่อ แปลง รูปหลักฐานและพิกัด GPS ตอนถ่ายรูปภารกิจ</b> ไม่เก็บรูปบัตรประชาชน เลขบัตรเก็บเฉพาะเมื่อท่านเลือกส่งเองและยินยอมแยกต่างหาก ถอนความยินยอมหรือลบบัญชีได้<span class="nw"> ทุกเมื่อ</span></p>' +
        '<a class="lnk" href="#/privacy">อ่านประกาศความเป็นส่วนตัวฉบับเต็ม</a>' +
        '<label class="chk"><input type="checkbox" id="c1" checked onclick="return false" aria-readonly="true"> ใช้งานหลักของแอป: บัญชี แปลง รูปหลักฐานและพิกัด (จำเป็น)</label>' +
        '<label class="chk"><input type="checkbox" id="c2"> แสดงชื่อแสดงตนในอันดับลีก (เลือกได้)</label>' +
        '<label class="chk"><input type="checkbox" id="c3"> ส่งข้อมูลให้ ธ.ก.ส. (เลือกได้)</label>' +
        '<button class="btn" id="agree" style="margin-top:14px">ยินยอมและเริ่มลงทะเบียน</button>' +
        '<a class="lnk" href="#/login" style="margin-top:10px">มีบัญชีแล้ว เข้าสู่ระบบ</a></div>';
    } else if (step === 1) {
      body = '<div class="stepcard auth"><h2 class="sth"><span class="sr">ขั้นตอนที่ 1 / 3 </span>สร้างบัญชีและ PIN</h2>' +
        '<div id="linebox"></div>' +
        '<div class="fgrid"><div class="fg"><h3 class="fgh">ข้อมูลบัญชี</h3><label for="nm">ชื่อที่ใช้แสดง</label><input id="nm" autocomplete="name" value="' + esc(pr.name || '') + '" placeholder="เช่น ลุงสมชาย">' +
        '<label for="ph">เบอร์มือถือ (10 หลัก)</label><input id="ph" inputmode="tel" maxlength="10" autocomplete="tel" placeholder="0812345678" value="' + esc((S.account || {}).phone || '') + '"></div><div class="fg"><h3 class="fgh">ตั้ง PIN เข้าแอป</h3>' +
        pinField('pin', 'PIN 6 หลัก (ใช้เข้าแอป)') + pinField('pin2', 'ใส่ PIN อีกครั้ง') + '</div></div>' +
        '<p class="note">จำ PIN ไว้ให้ดี ถ้าลืมให้ขอรหัสจากเจ้าหน้าที่ อย่าบอก PIN กับใคร</p>' +
        '<label class="chk"><input type="checkbox" id="sh"> เครื่องนี้ใช้ร่วมกับคนอื่น</label>' +
        '<p class="err" id="err" role="alert" hidden></p>' +
        '<button class="btn" id="next" style="margin-top:8px">ถัดไป →</button>' +
        '<a class="lnk" href="#/login">มีบัญชีแล้ว เข้าสู่ระบบ</a></div>';
    } else if (step === 2) {
      var p = P() || {};
      body = '<div class="stepcard auth"><h2 class="sth"><span class="sr">ขั้นตอนที่ 2 / 3 </span>ยืนยันแปลง</h2>' +
        plotForm(p) + '<label for="ds">อำเภอ / จังหวัด</label><input id="ds" value="' + esc((p.district || pr.district || '')) + '" placeholder="เช่น อ.บางระกำ จ.พิษณุโลก">' +
        '<p class="err" id="err" role="alert" hidden></p></div><button class="btn" id="next" style="margin-top:12px">ถัดไป →</button>';
    } else {
      body = '<div class="stepcard auth"><h2 class="sth"><span class="sr">ขั้นตอนที่ 3 / 3 </span>เลือกเสียงพี่เลี้ยง</h2><p class="hint" style="margin-top:0">แตะเพื่อเลือกและฟังเสียงที่ท่านชอบ</p>' +
        ['ชาย', 'หญิง'].map(function (v) { return '<button class="choice' + ((pr.voice || 'ชาย') === v ? ' sel' : '') + '" data-voice="' + v + '" role="radio" aria-checked="' + ((pr.voice || 'ชาย') === v) + '"><i class="rd"></i><span class="cl">🔊 เสียง' + v + '</span><span class="lis">▶ ฟังเสียง</span></button>'; }).join('') +
        '</div><button class="btn" id="next" style="margin-top:12px">เริ่มใช้งาน ✓</button>';
    }
    app.innerHTML = header() + '<div class="sheet authpage" style="background:#f7f7f7"><div class="reg-title">ลงทะเบียนใช้งาน</div>' +
      (consent ? '<div class="stepper s3">' + steps.map(function (s, i) { return '<div class="' + (i + 1 <= step ? 'on' : '') + (i + 1 === step ? ' cur' : '') + '"><i>' + (i + 1) + '</i>' + s[0] + '<br>' + s[1] + '</div>'; }).join('') + '</div>' : '<div class="reg-sub">ใช้เวลาประมาณ 3 นาที</div>') +
      body + '</div>';
    var go = function (n) { S.regStep = n; save(); params.delete('step'); route(); };
    var el = function (id) { return document.getElementById(id); };
    wireForm(app); wireDate(app);
    if (!consent) {
      el('agree').onclick = function () { S.consent = { core: true, public_rank: el('c2').checked, baac: el('c3').checked, ver: 'c2', at: new Date().toISOString() }; S.ledger = S.ledger || []; save(); route(); };
      return;
    }
    if (step === 1) {
      getConfig().then(function (c) {
        var lb = el('linebox'); if (!lb || !lineAllowed(c)) return;
        lb.innerHTML = lineBtn('ลงทะเบียนด้วย LINE') + '<div class="or"><span>หรือใช้เบอร์มือถือและ PIN</span></div>'; wireLine(app);
      });
      el('next').onclick = function () {
        var name = el('nm').value.trim(), phone = normPhone(el('ph').value), pin = el('pin').value, bad;
        if (!name) return showErr('กรุณากรอกชื่อ');
        if (!/^0\d{9}$/.test(phone)) return showErr('เบอร์มือถือไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลัก เช่น 0812345678');
        if ((bad = pinProblem(pin, el('pin2').value))) return showErr(bad);
        if (noApi()) return showErr('ระบบยังไม่พร้อม กรุณาลองใหม่');
        var b = el('next'), c = S.consent; busy(b, true);
        API.register({ name: name, phone: phone, pin: pin, shared_device: el('sh').checked, consent: { version: 'c2', core: true, public_rank: !!c.public_rank, baac: !!c.baac } }).then(function (j) {
          ME = { user: j.user || {}, plots: [], consents: {} }; S.account = { phone: phone, id: (j.user || {}).public_id }; S.shared = el('sh').checked;
          S.profile = S.profile || {}; S.profile.name = name; delete S.profile.idHash; S.profile.avatar = S.profile.avatar || 'img/avatar.png'; go(2);
        }, function (e) {
          busy(b, false);
          if (e.code === 'phone_taken') showErr('', esc(e.message) + ' <a href="#/login">เข้าสู่ระบบ</a>'); else showErr(e.message);
        });
      };
    } else if (step === 2) {
      el('next').onclick = function () {
        var ds = el('ds').value.trim(); S.profile = S.profile || {}; if (ds) S.profile.district = ds;
        if (!savePlotForm(P())) return;
        var p = P(); p.district = ds || p.district;
        if (noApi() || (S.seeded && !S.account)) return go(3);
        var b = el('next'); busy(b, true);
        syncPlot(p).then(function () { go(3); }, function (e) { busy(b, false); if (e.status === 401) { location.hash = '#/login'; return; } showErr(e.message); });
      };
    } else {
      app.querySelectorAll('[data-voice]').forEach(function (b) { b.onclick = function () { S.profile.voice = b.dataset.voice; save(); speak('สวัสดีครับ พี่เลี้ยงพร้อมช่วยแล้ว'); app.querySelectorAll('[data-voice]').forEach(function (x) { x.classList.toggle('sel', x === b); }); }; });
      el('next').onclick = function () {
        S.registered = true; S.regStep = 1; save();
        if (!noApi() && S.account) API.patchMe({ voice: S.profile.voice || 'ชาย', district: S.profile.district || undefined }).catch(function () {});
        scheduleSync(); flushOutbox().catch(function () {});
        getConfig().then(function (c) { if (c.collect_id && !S.idAsked && !(ME && ME.user && ME.user.national_id && ME.user.national_id.status !== 'none')) { S.idAsked = true; save(); location.hash = '#/idcheck'; } else goHome(); });
      };
    }
  };

  /* ---------- login / forgot PIN ---------- */
  function authPage(title, inner) {
    app.innerHTML = header() + '<div class="sheet authpage" style="background:#f7f7f7"><div class="reg-title">' + title + '</div><div class="stepcard auth">' + inner + '</div></div>';
    wireForm(app);
  }
  R.login = function () {
    authPage('เข้าสู่ระบบ',
      '<div id="linebox"></div><div id="phbox"><div class="or" id="orph" hidden><span>หรือใช้เบอร์มือถือและ PIN</span></div>' +
      '<label for="ph">เบอร์มือถือ</label><input id="ph" inputmode="tel" maxlength="10" autocomplete="tel" value="' + esc((S.account || {}).phone || '') + '">' +
      pinField('pin', 'PIN 6 หลัก') +
      '<label class="chk"><input type="checkbox" id="sh"' + (S.shared ? ' checked' : '') + '> เครื่องนี้ใช้ร่วมกับคนอื่น</label>' +
      '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="go" style="margin-top:8px">เข้าสู่ระบบด้วยเบอร์และ PIN</button></div>' +
      '<a class="lnk" href="#/reset">ลืม PIN (ขอรหัสจากเจ้าหน้าที่)</a><a class="lnk" href="#/register">ลงทะเบียนใหม่</a>');
    getConfig().then(function (c) {
      var lb = document.getElementById('linebox'); if (!lb || !lineAllowed(c)) return;
      lb.innerHTML = lineBtn('เข้าสู่ระบบด้วย LINE'); document.getElementById('orph').hidden = false; document.getElementById('go').classList.add('ghost'); wireLine(app);
    });
    var el = function (id) { return document.getElementById(id); };
    el('go').onclick = function () {
      var phone = normPhone(el('ph').value), pin = el('pin').value;
      if (!/^0\d{9}$/.test(phone)) return showErr('เบอร์มือถือไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลัก');
      if (!/^\d{6}$/.test(pin)) return showErr('PIN ต้องเป็นตัวเลข 6 หลัก');
      if (noApi()) return showErr('ระบบยังไม่พร้อม กรุณาลองใหม่');
      var b = el('go'); busy(b, true, 'กำลังเข้าสู่ระบบ...');
      API.login({ phone: phone, pin: pin, shared_device: el('sh').checked }).then(function () { return getMe(true); }).then(function (me) {
        var other = S.account && S.account.phone && S.account.phone !== phone;
        S.shared = el('sh').checked; hydrate(me, !S.registered || other || !(S.plots || []).length);
        S.account.phone = phone; save(); flushOutbox().catch(function () {}); goHome();
      }).catch(function (e) { busy(b, false); showErr(e.message); });
    };
  };
  R.reset = function () {
    authPage('ลืม PIN',
      '<p class="big">ขอรหัสจากเจ้าหน้าที่โครงการ (รหัส 8 ตัวอักษร ใช้ได้ครั้งเดียว ภายใน 24 ชั่วโมง) แล้วตั้ง PIN ใหม่ที่นี่</p>' +
      '<label for="ph">เบอร์มือถือ</label><input id="ph" inputmode="tel" maxlength="10" autocomplete="tel" placeholder="0812345678" value="' + esc((S.account || {}).phone || '') + '">' +
      '<label for="cd">รหัสจากเจ้าหน้าที่</label><input id="cd" autocapitalize="characters" autocomplete="off" maxlength="12" placeholder="เช่น 7K2M9QXA" style="text-transform:uppercase;letter-spacing:2px">' +
      pinField('pin', 'PIN ใหม่ 6 หลัก') + pinField('pin2', 'ใส่ PIN ใหม่อีกครั้ง') +
      '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="go" style="margin-top:8px">ตั้ง PIN ใหม่</button><a class="lnk" href="#/login">กลับไปเข้าสู่ระบบ</a>');
    var el = function (id) { return document.getElementById(id); };
    el('go').onclick = function () {
      var phone = normPhone(el('ph').value), code = el('cd').value.replace(/[\s-]/g, '').toUpperCase(), bad;
      if (!/^0\d{9}$/.test(phone)) return showErr('เบอร์มือถือไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลัก');
      if (code.length < 6) return showErr('กรุณากรอกรหัสจากเจ้าหน้าที่');
      if ((bad = pinProblem(el('pin').value, el('pin2').value))) return showErr(bad);
      if (noApi()) return showErr('ระบบยังไม่พร้อม กรุณาลองใหม่');
      var b = el('go'); busy(b, true);
      API.reset(phone, code, el('pin').value).then(function () { S.account = S.account || {}; S.account.phone = phone; save(); toast('ตั้ง PIN ใหม่แล้ว เข้าสู่ระบบได้เลย'); location.hash = '#/login'; },
        function (e) { busy(b, false); showErr(e.code === 'bad_credentials' || e.code === 'bad_code' ? 'รหัสไม่ถูกต้องหรือหมดอายุ ขอรหัสใหม่จากเจ้าหน้าที่' : e.message); });
    };
  };

  /* ---------- LINE return: #/line?r=login|register|linked&ticket=...  or  ?error=... ---------- */
  var PURPOSE_TXT = ['เก็บและใช้ข้อมูลของท่านเพื่อบริการในโครงการเท่านั้น', 'ส่งต่อให้ ธ.ก.ส. เฉพาะเมื่อท่านเลือกให้ใช้'];
  function lineMsg(html, back) { authPage('LINE', '<p class="big">' + html + '</p>' + (back === false ? '' : '<a class="btn" href="#/login" style="display:flex;align-items:center;justify-content:center;text-decoration:none">กลับไปหน้าเข้าสู่ระบบ</a>')); }
  R.line = function () {
    var q = new URLSearchParams(location.hash.split('?')[1] || ''), r = q.get('r'), ticket = q.get('ticket'), er = q.get('error');
    try { history.replaceState(null, '', location.pathname + location.search + '#/line'); } catch (e) {}
    if (er) return lineMsg(esc(LINE_ERR[er] || LINE_ERR.line_failed));
    if (r === 'linked') { toast('ผูกบัญชี LINE แล้ว'); getMe(true).catch(function () {}).then(function () { location.hash = '#/settings'; }); return lineMsg('กำลังเปิด...', false); }
    if (!ticket || (r !== 'login' && r !== 'register')) return lineMsg('ลิงก์เข้าสู่ระบบไม่ถูกต้อง กรุณาเริ่มใหม่');
    lineMsg('กำลังตรวจสอบกับ LINE...', false);
    if (noApi()) return lineMsg('ระบบยังไม่พร้อม กรุณาลองใหม่');
    API.lineFinish(ticket, S.shared).then(function (j) {
      if (j.needs_registration) return lineRegisterForm(ticket, j.display_name || '');
      return getMe(true).then(function (me) {
        var other = S.account && S.account.id && S.account.id !== (me.user || {}).public_id;
        hydrate(me, !S.registered || other || !(S.plots || []).length); save(); flushOutbox().catch(function () {}); goHome();
      });
    }).catch(function (e) { lineMsg(esc(e.message)); });
  };
  function lineRegisterForm(ticket, dn) {
    var c = S.consent || {};
    authPage('สร้างบัญชีด้วย LINE',
      '<p class="big">ขั้นตอนสุดท้ายก่อนเริ่มใช้งาน กรุณาอ่านและเลือกความยินยอม</p>' +
      '<label for="nm">ชื่อที่ใช้แสดง</label><input id="nm" autocomplete="name" value="' + esc(dn) + '">' +
      '<a class="lnk" href="#/privacy">อ่านประกาศความเป็นส่วนตัวฉบับเต็ม</a>' +
      '<label class="chk"><input type="checkbox" id="c1" checked onclick="return false" aria-readonly="true"> ใช้งานหลักของแอป: บัญชี แปลง รูปหลักฐานและพิกัด (จำเป็น)</label>' +
      '<label class="chk"><input type="checkbox" id="c2"' + (c.public_rank ? ' checked' : '') + '> แสดงชื่อแสดงตนในอันดับลีก (เลือกได้)</label>' +
      '<label class="chk"><input type="checkbox" id="c3"' + (c.baac ? ' checked' : '') + '> ส่งข้อมูลให้ ธ.ก.ส. (เลือกได้)</label>' +
      '<label class="chk"><input type="checkbox" id="sh"' + (S.shared ? ' checked' : '') + '> เครื่องนี้ใช้ร่วมกับคนอื่น</label>' +
      '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="go" style="margin-top:8px">ยินยอมและสร้างบัญชี</button>');
    var el = function (id) { return document.getElementById(id); };
    el('go').onclick = function () {
      var name = el('nm').value.trim(); if (!name) return showErr('กรุณากรอกชื่อ');
      var b = el('go'); busy(b, true);
      API.lineRegister({ ticket: ticket, name: name, shared_device: el('sh').checked, consent: { version: 'c2', core: true, public_rank: el('c2').checked, baac: el('c3').checked } }).then(function (j) {
        ME = { user: j.user || {}, plots: [], consents: {} }; S.shared = el('sh').checked;
        S.consent = { core: true, public_rank: el('c2').checked, baac: el('c3').checked, ver: 'c2', at: new Date().toISOString() };
        S.account = { phone: (j.user || {}).phone || null, id: (j.user || {}).public_id }; S.profile = S.profile || {}; S.profile.name = name; S.profile.avatar = S.profile.avatar || 'img/avatar.png';
        S.ledger = S.ledger || []; S.regStep = 2; save(); location.hash = '#/register';
      }, function (e) { busy(b, false); showErr(e.message); });
    };
  }

  /* ---------- optional national ID: own consent screen, never required ---------- */
  var ID_LABEL = { none: 'ยังไม่ได้ส่ง', pending: 'ส่งแล้ว รอเจ้าหน้าที่ตรวจ', verified: 'ยืนยันแล้ว', rejected: 'ไม่ผ่านการตรวจ ส่งเลขใหม่ได้' };
  function idBack() { var b = (location.hash.split('?')[1] || '').indexOf('back=settings') >= 0; return b ? '#/settings' : '#/home'; }
  R.idcheck = function () {
    var back = idBack();
    authPage('ยืนยันตัวตนด้วยบัตรประชาชน',
      '<div class="idgrid"><div class="id1c"><p class="big"><b>ไม่บังคับ</b> ข้ามได้ และใช้แอปได้ครบทุกอย่างโดยไม่ต้องส่ง</p>' +
      '<h3 class="ph3">ขอความยินยอมแยกต่างหาก</h3>' +
      '<details class="idd"><summary>เก็บและใช้เลขบัตรอย่างไร (แตะเพื่ออ่าน)</summary><ul class="idl"><li>ใช้ให้เจ้าหน้าที่โครงการตรวจสอบตัวตนของท่านเท่านั้น</li><li>เก็บเลขแบบเข้ารหัส ไม่เก็บรูปบัตร แสดงเพียงเลขท้าย 4 หลัก</li><li>เฉพาะเจ้าหน้าที่ที่ได้รับสิทธิ์เปิดดูเลขเต็มได้ และมีบันทึกทุกครั้ง</li><li>ถอนความยินยอมได้ทุกเมื่อ เลขจะถูกลบทันที</li></ul></details></div><div class="id2c">' +
      '<label class="chk"><input type="checkbox" id="idc"> ข้าพเจ้ายินยอมให้เก็บเลขบัตรประชาชนตามข้อความข้างต้น</label>' +
      '<label for="idn">เลขบัตรประชาชน 13 หลัก</label><input id="idn" inputmode="numeric" maxlength="13" autocomplete="off" placeholder="ใส่เลข 13 หลัก" disabled aria-describedby="err">' +
      '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="go" style="margin-top:8px" disabled>ส่งเลขบัตรเพื่อยืนยัน</button></div></div>' +
      '<a class="lnk" id="skip" href="' + back + '">ข้ามไปก่อน (ใช้แอปได้ครบ)</a>');
    var el = function (id) { return document.getElementById(id); };
    if (window.innerWidth >= 1024) { var dd = document.querySelector('.idd'); if (dd) dd.open = true; }
    function idOk(n) { if (!/^\d{13}$/.test(n)) return false; for (var i = 0, t = 0; i < 12; i++) t += +n[i] * (13 - i); return (11 - (t % 11)) % 10 === +n[12]; }
    function idState() {
      var n = el('idn').value, bad = n.length === 13 && !idOk(n), e = el('err');
      el('idn').classList.toggle('bad', bad); el('idn').setAttribute('aria-invalid', bad ? 'true' : 'false');
      e.hidden = !bad; if (bad) e.textContent = 'เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบตัวเลขอีกครั้ง';
      el('go').disabled = !(el('idc').checked && idOk(n));
    }
    el('idc').onchange = function () { el('idn').disabled = !this.checked; idState(); if (this.checked) el('idn').focus(); };
    el('idn').oninput = function () { var v = this.value.replace(/\D/g, '').slice(0, 13); if (v !== this.value) this.value = v; idState(); };
    el('go').onclick = function () {
      var n = el('idn').value.replace(/\D/g, ''); if (!idOk(n)) { idState(); return showErr('เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบตัวเลขอีกครั้ง'); }
      var b = el('go'); busy(b, true);
      API.putNationalId(n).then(function (j) { if (ME && ME.user) ME.user.national_id = j.national_id; toast('ส่งแล้ว รอเจ้าหน้าที่ตรวจ'); location.hash = back; }, function (e) { busy(b, false); showErr(e.message); });
    };
  };

  /* ---------- privacy notice ---------- */
  var PRIV = null;
  R.privacy = function () {
    app.innerHTML = header() + '<div class="sheet">' + titleRow('ความเป็นส่วนตัว (PDPA)') + '<div class="card auth" id="pv" style="padding:14px"><p class="big">กำลังเปิด...</p></div></div>';
    (PRIV ? Promise.resolve(PRIV) : getJSON('content/privacy.json')).then(function (j) {
      PRIV = j; var h = '<p class="big"><b>ผู้ควบคุมข้อมูล:</b> ' + esc(j.controller_name) + '<br><b>ติดต่อ:</b> ' + esc(j.contact) + '</p>';
      if (j.summary) h += '<h3 class="ph3">สรุปสั้น ๆ</h3><ul class="sum">' + j.summary.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>';
      (j.sections || []).forEach(function (s) { h += '<details class="pv"><summary>' + esc(s.title) + '</summary>' + (s.items || []).map(function (t) { return '<p class="big">' + esc(t) + '</p>'; }).join('') + '</details>'; });
      h += '<p class="note">ฉบับ ' + esc(j.version) + '</p>';
      document.getElementById('pv').innerHTML = h;
    }).catch(function () { document.getElementById('pv').innerHTML = '<p class="big">เปิดประกาศไม่ได้ กรุณาเชื่อมอินเทอร์เน็ตแล้วลองใหม่</p>'; });
  };

  /* ---------- settings: PIN, consents, logout, delete account ---------- */
  function sheetModal(html) { var m = document.createElement('div'); m.className = 'modal'; m.innerHTML = '<div class="auth">' + html + '</div>'; document.body.appendChild(m); wireForm(m); return m; }
  R.settings = function () {
    var pr = S.profile || {}, c = S.consent || {};
    app.innerHTML = header() + '<div class="sheet setpage">' + titleRow('ข้อมูลของฉัน') +
      '<div class="card auth" style="padding:14px"><b style="font-size:22px">' + esc(pr.name || '') + '</b><div class="big" id="ph0">📱 ' + esc((S.account || {}).phone || '-') + '</div><div class="big">📍 ' + esc(pr.district || '-') + '</div></div>' +
      '<div class="card auth" id="acct" style="padding:14px;margin-top:10px"><h3 class="ph3">วิธีเข้าสู่ระบบ</h3><p class="big" id="acctb">กำลังเปิด...</p></div>' +
      '<div class="card auth" style="padding:14px;margin-top:10px"><h3 class="ph3">ความยินยอม</h3>' +
      '<label class="chk"><input type="checkbox" id="k2"' + (c.public_rank ? ' checked' : '') + '> แสดงชื่อแสดงตนในอันดับลีก</label>' +
      '<label class="chk"><input type="checkbox" id="k3"' + (c.baac ? ' checked' : '') + '> ส่งข้อมูลให้ ธ.ก.ส.</label>' +
      '<a class="lnk" href="#/privacy">ประกาศความเป็นส่วนตัว</a></div>' +
      '<div class="card auth" style="padding:14px;margin-top:10px"><div id="obx" class="obx" hidden></div>' +
      '<button class="btn" id="chpin">เปลี่ยน PIN</button><button class="btn ghost" id="lo" style="margin-top:10px">ออกจากระบบ</button></div>' +
      '<div class="card auth danger" style="padding:14px;margin-top:10px"><h3 class="ph3">ลบบัญชี</h3><p class="big">ลบบัญชีและรูปหลักฐานทั้งหมดของท่านออกจากระบบถาวร ย้อนกลับไม่ได้ ใช้ PIN ยืนยัน</p><button class="btn dng" id="del">ลบบัญชีของฉัน</button></div></div>';
    updateBadge();
    var el = function (id) { return document.getElementById(id); };
    function reloadAcct() { return getMe(true).then(fillAcct, function () { var b = el('acctb'); if (b) b.textContent = 'ดูข้อมูลบัญชีไม่ได้ในขณะนี้ กรุณาเชื่อมต่อระบบ'; }); }
    function fillAcct() {
      var box = el('acct'), u = (ME || {}).user || {}; if (!box) return;
      var idn = u.national_id || { status: 'none', last4: null };
      getConfig().then(function (c) {
        if (!el('acct')) return;
        var h = '<h3 class="ph3">วิธีเข้าสู่ระบบ</h3>';
        if (u.phone) { var ph0 = el('ph0'); if (ph0) ph0.textContent = '📱 ' + u.phone; }
        if (lineAllowed(c) || u.has_line) h += '<div class="arow"><div><b>LINE</b><br><span class="muted">' + (u.has_line ? 'ผูกบัญชีแล้ว' : 'ยังไม่ได้ผูก') + '</span></div>' +
          (u.has_line ? (u.has_pin ? '<button class="btn ghost sm" id="unln">ยกเลิกการผูก</button>' : '<button class="btn ghost sm" id="unln" disabled aria-describedby="unlh">ยกเลิกการผูก</button>') : '<button class="btn sm" id="linebtn">ผูก LINE</button>') + '</div>' + (u.has_line && !u.has_pin ? '<p class="hint" id="unlh">ต้องเพิ่มเบอร์มือถือและ PIN ก่อน จึงจะยกเลิกการผูก LINE ได้ ไม่เช่นนั้นจะเข้าบัญชีไม่ได้</p>' : '');
        h += '<div class="arow"><div><b>เบอร์มือถือและ PIN</b><br><span class="muted">' + (u.has_pin ? 'ตั้งไว้แล้ว' : 'ยังไม่ได้ตั้ง') + '</span></div>' + (u.has_pin ? '' : '<button class="btn sm" id="addcr">เพิ่มเบอร์และ PIN</button>') + '</div>';
        if (c.collect_id || idn.status !== 'none') {
          h += '<h3 class="ph3">ยืนยันตัวตนด้วยบัตรประชาชน (ไม่บังคับ)</h3><div class="arow"><div><b id="idst">' + esc(ID_LABEL[idn.status] || ID_LABEL.none) + '</b>' +
            (idn.last4 ? '<br><span class="muted">เลขท้าย ' + esc(idn.last4) + '</span>' : '') + '</div>' +
            (idn.status !== 'verified' && c.collect_id ? '<a class="btn sm" id="idgo" href="#/idcheck?back=settings" style="display:flex;align-items:center;justify-content:center;text-decoration:none">' + (idn.status === 'none' ? 'ส่งเลขบัตร' : 'ส่งเลขใหม่') + '</a>' : '') + '</div>' +
            (idn.status !== 'none' ? '<button class="btn ghost" id="iderase" style="margin-top:8px">ถอนความยินยอมและลบเลขบัตร</button>' : '');
        }
        box.innerHTML = h;
        var chp = el('chpin'); if (chp) chp.hidden = !u.has_pin;
        if (el('linebtn')) wireLine(box, API.linkLine);
        if (el('unln')) el('unln').onclick = function () { var b = this; if (!confirm('ยกเลิกการผูกบัญชี LINE?')) return; busy(b, true); API.unlinkLine().then(function () { toast('ยกเลิกการผูก LINE แล้ว'); return reloadAcct(); }, function (e) { busy(b, false); toast(e.message); }); };
        if (el('addcr')) el('addcr').onclick = function () {
          var m = sheetModal('<h2 style="margin:0 0 8px;font:700 22px Prompt">เพิ่มเบอร์มือถือและ PIN</h2><label for="cp">เบอร์มือถือ (10 หลัก)</label><input id="cp" inputmode="tel" maxlength="10" autocomplete="tel">' + pinField('pin', 'PIN 6 หลัก') + pinField('pin2', 'ใส่ PIN อีกครั้ง') +
            '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="ok" style="margin-top:8px">บันทึก</button><button class="btn ghost" id="x" style="margin-top:8px">ปิด</button>');
          m.querySelector('#x').onclick = function () { m.remove(); };
          m.querySelector('#ok').onclick = function () {
            var phone = normPhone(m.querySelector('#cp').value), pin = m.querySelector('#pin').value, bad;
            if (!/^0\d{9}$/.test(phone)) return showErr('เบอร์มือถือไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลัก');
            if ((bad = pinProblem(pin, m.querySelector('#pin2').value))) return showErr(bad);
            var b = m.querySelector('#ok'); busy(b, true);
            API.addCredentials(phone, pin).then(function (j) { S.account = S.account || {}; S.account.phone = phone; save(); m.remove(); toast('เพิ่มเบอร์และ PIN แล้ว'); return reloadAcct(); }, function (e) { busy(b, false); showErr(e.message); });
          };
        };
        if (el('iderase')) el('iderase').onclick = function () { var b = this; if (!confirm('ลบเลขบัตรประชาชนของท่านออกจากระบบ?')) return; busy(b, true); API.deleteNationalId().then(function () { toast('ลบเลขบัตรแล้ว'); return reloadAcct(); }, function (e) { busy(b, false); toast(e.message); }); };
      });
    }
    reloadAcct();
    [['k2', 'public_rank'], ['k3', 'baac']].forEach(function (x) {
      el(x[0]).onchange = function () {
        var box = this, v = box.checked;
        if (noApi()) { box.checked = !v; return toast('ต้องต่อระบบก่อนจึงเปลี่ยนความยินยอมได้'); }
        API.consent(x[1], v, 'c2').then(function () { S.consent[x[1]] = v; S.consent.at = new Date().toISOString(); save(); toast('บันทึกแล้ว'); }, function (e) { box.checked = !v; toast(e.message); });
      };
    });
    el('chpin').onclick = function () {
      var m = sheetModal('<div class="mh"><h2>เปลี่ยน PIN</h2><button class="xbtn" id="x2" aria-label="ปิด">✕</button></div>' + pinField('o', 'PIN เดิม') + pinField('n', 'PIN ใหม่') + pinField('n2', 'ใส่ PIN ใหม่อีกครั้ง') +
        '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="ok" style="margin-top:8px">บันทึก</button><button class="btn ghost" id="x" style="margin-top:8px">ปิด</button>');
      m.querySelector('#x').onclick = m.querySelector('#x2').onclick = function () { m.remove(); };
      m.querySelector('#ok').onclick = function () {
        var o = m.querySelector('#o').value, n = m.querySelector('#n').value, bad = !/^\d{6}$/.test(o) ? 'PIN เดิมต้องเป็นตัวเลข 6 หลัก' : pinProblem(n, m.querySelector('#n2').value);
        if (bad) return showErr(bad); var b = m.querySelector('#ok'); busy(b, true);
        API.changePin(o, n).then(function () { m.remove(); toast('เปลี่ยน PIN แล้ว'); }, function (e) { busy(b, false); showErr(e.code === 'bad_credentials' ? 'PIN เดิมไม่ถูกต้อง' : e.message); });
      };
    };
    el('lo').onclick = function () { logout(); };
    el('del').onclick = function () {
      var m = sheetModal('<h2 style="margin:0 0 8px;font:700 22px Prompt;color:#b3261e">ลบบัญชีถาวร?</h2><p class="big">ข้อมูลและรูปหลักฐานทั้งหมดจะถูกลบ และกู้คืนไม่ได้ ' + (((ME || {}).user || {}).has_pin === false ? 'บัญชีนี้เข้าด้วย LINE จึงไม่ต้องใช้ PIN ให้ติ๊กยืนยันด้านล่าง' : 'ใส่ PIN เพื่อยืนยัน') + '</p><p class="big"><b>' + esc((S.profile || {}).name || '') + '</b></p>' + (((ME || {}).user || {}).has_pin === false ? '<label class="chk"><input type="checkbox" id="dc"> ฉันเข้าใจ ลบแล้วกู้คืนไม่ได้</label>' : pinField('dp', 'PIN 6 หลัก')) +
        '<p class="err" id="err" role="alert" hidden></p><button class="btn dng" id="ok" style="margin-top:8px">ลบบัญชีของฉันถาวร</button><button class="btn ghost" id="x" style="margin-top:8px">ยกเลิก</button>');
      m.querySelector('#x').onclick = function () { m.remove(); };
      m.querySelector('#ok').onclick = function () {
        var nopin = ((ME || {}).user || {}).has_pin === false, pin = nopin ? '' : m.querySelector('#dp').value; if (nopin && !m.querySelector('#dc').checked) return showErr('กรุณาติ๊กยืนยันก่อนลบบัญชี'); if (!nopin && !/^\d{6}$/.test(pin)) return showErr('PIN ต้องเป็นตัวเลข 6 หลัก');
        var b = m.querySelector('#ok'); busy(b, true, 'กำลังลบ...');
        API.deleteMe(pin).then(function () { wipeLocal(); m.remove(); toast('ลบบัญชีแล้ว'); location.hash = '#/register'; location.reload(); }, function (e) { busy(b, false); showErr(e.code === 'bad_credentials' ? 'PIN ไม่ถูกต้อง' : e.message); });
      };
    };
  };
  function wipeLocal() { try { localStorage.removeItem(KEY); } catch (e) {} S = {}; ME = null; if (API) API.outbox.all().then(function (a) { a.forEach(function (i) { API.outbox.del(i.client_uuid); }); }); }
  function logout() {
    function done() { var shared = S.shared; ME = null; API.logout().catch(function () {}).then(function () { if (shared) wipeLocal(); else { S.registered = true; save(); } location.hash = '#/login'; if (shared) location.reload(); }); }
    flushOutbox().catch(function () {}).then(function () { return API.outbox.count(); }).then(function (c) {
      if (c.pending + c.failed > 0 && S.shared && !confirm('ยังมีรูปที่ส่งไม่ครบ ' + (c.pending + c.failed) + ' รายการ ถ้าออกจากระบบบนเครื่องใช้ร่วม รูปจะหายไป ออกจากระบบต่อไหม?')) return;
      done();
    });
  }
  function speak(t) { try { var u = new SpeechSynthesisUtterance(t); u.lang = 'th-TH'; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { toast(t); } }
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function thDate(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ''); return m ? (+m[3]) + ' ' + TH_MON[+m[2] - 1] + ' ' + (+m[1] + 543) : 'แตะเพื่อเลือกวันที่'; }
  function wireDate(root) {
    var i = root.querySelector('#pd'), d = root.querySelector('#pdt'); if (!i || !d) return;
    var upd = function () { d.textContent = thDate(i.value); d.classList.toggle('empty', !i.value); };
    i.addEventListener('input', upd); i.addEventListener('change', upd);
    i.addEventListener('click', function () { try { i.showPicker && i.showPicker(); } catch (e) {} });
  }
  function plotForm(p) {
    return '<label for="pn">ชื่อแปลง</label><input id="pn" value="' + esc(p.name || '') + '">' +
      '<label for="pr">พื้นที่ (ไร่)</label><input id="pr" inputmode="decimal" value="' + esc(p.rai || '') + '">' +
      '<label for="pv">พันธุ์ข้าว</label><input id="pv" value="' + esc(p.variety || '') + '">' +
      '<label for="pd">วันปลูก</label><div class="datebox"><span id="pdt" class="dt' + (p.sowDate ? '' : ' empty') + '">' + thDate(p.sowDate) + '</span><span class="dtc" aria-hidden="true">📅</span><input id="pd" type="date" value="' + esc(p.sowDate || '') + '" aria-label="วันปลูก"></div>' +
      '<label for="pk">จำนวนกระทง (1-30)</label><input id="pk" inputmode="numeric" value="' + esc(p.kratongs ? p.kratongs.length : 1) + '"><p class="hint">1 กระทง = 1 ท่อวัดน้ำ ถ่ายรูปท่อละ 1 ภาพ</p>';
  }
  function savePlotForm(p) {
    var g = function (id) { return document.getElementById(id).value.trim(); };
    var rai = Number(g('pr')), n = Math.round(Number(g('pk')));
    if (!(rai > 0) || !(n >= 1 && n <= 30) || !g('pd')) { toast('กรุณากรอกพื้นที่ วันปลูก และจำนวนกระทง 1-30'); return false; }
    S.plots = S.plots || [];
    if (!p) { p = { id: 'p' + (S.plots.length + 1), code: String.fromCharCode(65 + S.plots.length), kratongs: [], area_source: 'self_declared' }; S.plots.push(p); }
    p.name = g('pn') || ('แปลง ' + p.code); p.rai = rai; p.variety = g('pv'); p.sowDate = g('pd');
    while (p.kratongs.length < n) { var s = p.kratongs.length + 1; p.kratongs.push({ seq: s, label: 'กระทง ' + s, qr: 'RICE-TUBE-' + p.code + '-' + s, lastRead: null }); }
    if (p.kratongs.length > n) p.kratongs = p.kratongs.slice(0, n);
    save(); return true;
  }

  R.home = function () {
    var pr = S.profile || {}, p = P(), m = mission(p), t = totals(), w = pr.weather || {};
    var tiles = [['plot', 'แปลง<br>ของฉัน', '', '#/plot'], ['soil', 'ดิน & ปุ๋ย', '', '#/analysis'], ['mentor', 'พี่เลี้ยง AI', '', '#/mentor'], ['market', 'ตลาดขายข้าว', '', '#/market'],
      ['wallet', 'เงิน', '(Wallet)', '#/wallet'], ['carbon', 'คาร์บอน & QR', '(ลดคาร์บอน)', '#/kratong'], ['mission', 'ภารกิจ', '& แต้ม', '#/missions'], ['gov', 'บริการรัฐ', '(เชื่อมข้อมูล)', '#/gov']];
    app.innerHTML = header({ tall: true, bell: true }) + '<div class="sheet">' +
      '<div class="hgrid"><div class="hc1"><div class="profile"><img class="av" alt="" src="' + esc(pr.avatar || 'icons/icon-192.png') + '"><h2>สวัสดี ' + esc(pr.name || '') + '</h2>' +
      '<div><span class="green">📍</span> ' + esc(pr.district || '') + '</div>' +
      '<a class="setlink" href="#/settings" aria-label="ข้อมูลของฉันและตั้งค่า">⚙️</a><div id="obx" class="obx" hidden></div>' +
      (p ? '<div>🌾 ' + fmt(p.rai) + ' ไร่ · ' + esc(p.variety) + ' · <span class="nw">อายุ ' + age(p) + ' วัน</span></div>' : '') + '</div>' +
      '<div class="duo"><a class="weather" href="#/mentor" style="color:inherit;text-decoration:none">' + (w.t ? '🌧️ <b>' + esc(w.t) + '</b><span class="wt">' + esc(w.rain || '') + '</span>' : '🌤️ <span class="wt nob">ยังไม่มีข้อมูลอากาศ</span>') + '<span aria-hidden="true">›</span></a>' +
      '<a class="ptspill" href="#/points" style="text-decoration:none">⭐ <b>' + fmt(t.confirmed + t.pending) + '</b> แต้ม</a></div>' +
      '<div class="row"><a class="wallet" href="#/wallet" style="flex:0 0 58%;color:inherit;text-decoration:none"><span style="color:#0c8208;font-size:20px">👛</span><span style="font:600 15px Prompt">ยอด Wallet</span> <b>' + (pr.wallet ? esc(pr.wallet) + ' บ.' : 'รอเชื่อมต่อ') + '</b><span style="margin-left:auto">›</span></a>' +
      '<div class="credit">เครดิต ' + (pr.credit ? '<span class="badgeA">' + esc(pr.credit) + '</span>' : '<b>รอประเมิน</b>') + '</div></div>' +
      (m ? '<div class="today"><div class="tag">📋 วันนี้ต้องทำ</div><h3>' + esc(m.title) + '</h3><p>' + esc(m.sub) + '</p>' +
        '<button class="shoot" id="shoot"><i>📷</i>ถ่ายรูปยืนยัน</button><span class="plus">⭐ +' + fmt(Math.round(previewPoints(m.type))) + ' แต้ม</span></div>' : '<a class="btn" href="#/register" style="margin-top:12px">เพิ่มแปลงของท่าน</a>') +
      (m && m.detail ? '<p class="note">' + esc(m.detail) + '</p>' : '') + '</div><div class="hc2"><div class="grid4">' + tiles.map(function (x) { return '<a class="tile" href="' + x[3] + '"><img alt="" src="img/ic-' + x[0] + '.jpg">' + x[1] + (x[2] ? '<small>' + x[2] + '</small>' : '') + '</a>'; }).join('') + '</div>' +
      (w.rain ? '<a class="alert" href="#/mentor" style="text-decoration:none"><span style="font-size:34px">🌧️</span><span style="flex:1"><b>' + esc(w.rain) + '</b>แนะนำ: เลื่อนใส่ปุ๋ยออกไปก่อน</span><span style="font-size:26px">›</span></a>' : '<a class="alert calm" href="#/mentor" style="text-decoration:none"><span style="font-size:30px">💧</span><span style="flex:1"><b>ตรวจระดับน้ำก่อนใส่ปุ๋ย</b>เมื่อเชื่อมข้อมูลอากาศแล้ว จะแจ้งเตือนฝนที่นี่</span><span style="font-size:26px">›</span></a>') +
      '<div style="position:relative"><a class="status" href="#/plot" style="display:block;color:inherit;text-decoration:none"><h3>สภาพแปลงล่าสุด</h3>' +
      '<div class="row"><img alt="" src="img/ears-thumb.jpg" style="width:44px;height:58px;border-radius:8px;object-fit:cover"><div class="cols" style="flex:1">' +
      '<div><span class="dot" style="background:#2e9a2e">✓</span><br>น้ำ<br><span style="color:#0e6e0c">เหมาะสม</span></div>' +
      '<div><span class="dot" style="background:#f5b800;color:#2b1d00">!</span><br>ธาตุอาหาร<br><span style="color:#d71013">ต่ำ</span></div>' +
      '<div><span class="dot" style="background:#e53935">!</span><br>เสี่ยงโรค<br><span style="font-weight:500">(ไหม้คอรวง)</span></div></div></div></a>' +
      '</div><a class="askai" href="#/mentor"><img alt="" src="img/mascot.jpg"><span><b>พี่เลี้ยง AI</b>' + esc(F('typos_as_shown', 'ask2')) + ' ได้ทุกเรื่อง</span><span class="chev" aria-hidden="true">›</span></a>' +
      '</div></div></div>';
    var b = document.getElementById('shoot'); if (b) b.onclick = function () { capture(m.type); };
    updateBadge();
  };

  R.plot = function () {
    var p = P(), tab = params.get('tab') || 'hist';
    if (!p) { location.hash = '#/register'; return; }
    var soil = p.soil || {}, rows5 = [['2569 (คาด)', 'กข85', F('yield_750_600', 'y750'), '3,500'], ['2568', 'กข85', '720', '4,200'], ['2567', 'กข85', '710', '4,300'], ['2566', 'พิษณุโลก 2', '680', '4,500'], ['2565', 'กข85', '690', '4,600']];
    var body = '';
    if (tab === 'hist') {
      body = (p.map ? '<div class="card" style="margin-top:0;overflow:hidden;border-radius:14px"><table class="t"><tr><th>ปี</th><th>พันธุ์</th><th>ผลผลิต (กก./ไร่)</th><th>ต้นทุน (บ./ไร่)</th></tr>' +
        rows5.map(function (r, i) { return '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td' + (i ? '' : ' style="color:#1e7a1e;font-weight:600"') + '>' + r[2] + '</td><td>' + r[3] + '</td></tr>'; }).join('') + '</table></div>' +
        '<div style="position:relative"><div class="trend"><span style="width:44px;height:37px;border-radius:10px;background:linear-gradient(#5cc22a,#2f8a12);display:grid;place-items:center;color:#fff">📈</span>' +
        '<div><div style="font:500 16px Prompt">แนวโน้ม 5 ปี</div><div style="font:700 19px Prompt;color:#047106">ผลผลิตเพิ่มขึ้น  +8.7%</div><div style="font-size:16px">ต้นทุนลดลง -23.9%</div></div>' +
        '<img alt="" src="img/trend-chart.jpg" style="width:80px;margin-left:auto"></div><img class="mascot" alt="" src="img/mascot-plot.jpg" style="right:-4px;top:4px;width:74px"></div>'
        : '<p class="note">ประวัติผลผลิตของแปลงนี้: ไม่มีข้อมูลยืนยัน</p>') +
        '<a class="btn" href="#/analysis" style="width:82%;margin-top:6px;font-size:21px">🤖 ดูตารางวิเคราะห์ AI <span>→</span></a><a class="btn ghost" href="#/options" style="margin-top:10px">ทางเลือกก่อนปลูก</a>';
    } else body = kratongList(p);
    app.innerHTML = header() + '<div class="sheet">' + titleRow('แปลงของฉัน', '', '<div class="ico"><span>🔗</span><a href="#/plotedit" style="color:inherit;text-decoration:none">✏️</a></div>') +
      (p.map ? '<div class="mapcard"><img alt="แผนที่แปลง" src="img/map.jpg" style="width:100%"></div>' : '<div class="card" style="padding:20px;text-align:center">แนวเขตแปลงจากโฉนด: ยังไม่มีข้อมูล</div>') +
      '<div class="chips"><span>🌾 ' + esc(p.variety) + '</span><span><span style="color:#17881c">📅</span> อายุข้าว ' + age(p) + ' วัน</span>' + (p.map ? '<span>🏛️ ' + esc(F('typos_as_shown', 'canal')) + '</span>' : '') + '</div>' +
      (p.map ? '<div class="metrics"><div style="background:linear-gradient(#fdf6da,#fcebb3);border:1px solid #f0e2b8">pH ดิน<div class="v" style="color:#3b1e05">' + esc(soil.ph) + '</div><span class="pill" style="background:#fcc012;font-size:12.5px;padding:0 6px">● ' + esc(F('ph_label_inconsistency', 'plot_label')) + '</span></div>' +
        '<div style="background:linear-gradient(#fcf0f0,#fce4ea);border:1px solid #f3d0d6">OM<div style="font:400 13px Sarabun">' + esc(F('typos_as_shown', 'om')) + '</div><div class="v" style="color:#bf040f;font-size:24px">' + esc(soil.om) + '</div><span class="pill" style="background:#f6aeb4;font-size:12.5px;padding:0 8px"><span style="color:#b0000f">●</span> ต่ำ</span></div>' +
        '<div style="background:#f9fafc;border:1px solid #e3e5e8">N - P - K<div style="margin:6px 0 2px;display:flex;justify-content:space-around"><span class="dot" style="background:#fc0204"></span><span class="dot" style="background:#ffce00"></span><span class="dot" style="background:#15a208"></span></div><div style="font:600 13px Prompt;display:flex;justify-content:space-around">ต่ำ<span>กลาง</span>สูง</div></div>' +
        '<div style="background:#eaf8e1;border:1px solid #cfe8c0">ผลผลิตคาด<div class="v" style="color:#006603;font-size:' + (F('yield_750_600', 'y750').length > 4 ? '13px' : '30px') + '">' + esc(F('yield_750_600', 'y750')) + '</div><div style="font:600 13px Prompt;color:#0a5a13">กก./ไร่</div></div></div>' : '') +
      '<div class="seg"><button data-tab="hist" class="' + (tab === 'hist' ? 'on' : '') + '">📊 ประวัติ 5 ปี</button><button data-tab="kt" class="' + (tab === 'kt' ? 'on' : '') + '">📅 ไทม์ไลน์ดูแล</button><button data-go="analysis">✨ วิเคราะห์ AI</button></div>' +
      body + '<a class="lot-entry" href="#/lot"><span class="outline-icon">▦</span><span><b>ล็อตข้าว Digital ID</b><small>ตรวจสอบย้อนกลับจากแปลงถึงถุง</small></span><span>→</span></a><button class="btn ghost" id="addplot" style="margin-top:12px">+ เพิ่มแปลง</button></div>';
    app.querySelectorAll('[data-tab]').forEach(function (b) { b.onclick = function () { params.set('tab', b.dataset.tab); route(); }; });
    app.querySelector('[data-go]').onclick = function () { location.hash = '#/analysis'; };
    document.getElementById('addplot').onclick = function () { location.hash = '#/plotedit?new=1'; };
    bindKratong(p);
  };
  R.plotedit = function () {
    var isNew = /new=1/.test(location.hash), p = isNew ? null : P();
    app.innerHTML = header() + '<div class="sheet">' + titleRow(isNew ? 'เพิ่มแปลง' : 'แก้ไขแปลง') + '<div class="card" style="padding:12px">' + plotForm(p || {}) + '</div><button class="btn" id="sv" style="margin-top:12px">บันทึก</button></div>';
    document.getElementById('sv').onclick = function () { if (savePlotForm(p)) { var np = isNew ? S.plots[S.plots.length - 1] : p; if (isNew) { S.plots.unshift(S.plots.pop()); save(); } syncPlot(np).catch(function () { toast('แปลงบันทึกในเครื่องแล้ว จะส่งเข้าระบบเมื่อมีสัญญาณ'); }); location.hash = '#/plot'; } };
  };
  function kratongList(p) {
    var due = sampleToday(p).map(function (k) { return k.seq; });
    return '<p style="font-size:16px;margin:10px 0 0">1 กระทง = 1 ท่อวัดน้ำ = 1 QR · วันนี้ถ่าย ' + due.length + ' จาก ' + p.kratongs.length + ' กระทง</p>' +
      '<div class="kt">' + p.kratongs.map(function (k) {
        return '<div class="card"><b style="font-size:18px">' + esc(k.label) + (due.indexOf(k.seq) >= 0 ? ' <span style="color:#d71013">• วันนี้</span>' : '') + '</b><div class="qr" data-qr="' + esc(k.qr) + '"></div>' +
          '<div style="font-size:13px">' + esc(k.qr) + '</div><div style="font-size:14px">' + (k.lastRead ? 'อ่านล่าสุด ' + new Date(k.lastRead).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) + ' (' + (k.state === 'DRY' ? 'แห้ง' : k.state === 'WET' ? 'มีน้ำ' : '-') + ')' : 'ยังไม่เคยวัด') + '</div></div>';
      }).join('') + '</div><button class="btn" id="scanall" style="margin-top:12px">📷 สแกน QR ท่อ + ถ่ายรูป</button><button class="btn ghost" style="margin-top:8px" onclick="window.print()">พิมพ์ QR ทั้งหมด</button>';
  }
  function bindKratong(p) {
    app.querySelectorAll('[data-qr]').forEach(function (d) {
      try { var q = qrcode(0, 'M'); q.addData(d.dataset.qr); q.make(); d.innerHTML = q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch (e) { d.textContent = d.dataset.qr; }
    });
    var b = document.getElementById('scanall'); if (b) b.onclick = function () { capture('awd_tube_photo'); };
  }
  R.kratong = function () { params.set('tab', 'kt'); R.plot(); };

  /* ---------- capture: scan tube QR, take photo with GPS + time ---------- */
  function capture(missionType) {
    var p = P(); if (!p) return;
    var m = document.createElement('div'); m.className = 'modal';
    var needQr = missionType === 'awd_tube_photo';
    m.innerHTML = '<div><h2 style="margin:0 0 8px;font:700 22px Prompt">' + (needQr ? 'สแกน QR ที่ท่อวัดน้ำ' : 'ถ่ายรูปแปลง') + '</h2>' +
      (needQr ? '<video id="cv" playsinline muted></video><canvas id="cc" hidden></canvas><label for="qrin">หรือพิมพ์รหัสบนท่อ</label><input id="qrin" placeholder="RICE-TUBE-' + p.code + '-1">' +
        '<div class="row" style="margin-top:6px"><button class="btn sm" data-st="WET">มีน้ำ</button><button class="btn sm" data-st="DRY">แห้ง</button></div>' : '') +
      '<p id="qrok" style="font-size:17px"></p><label class="btn" for="ph" id="phl">📷 ถ่ายรูป</label><input id="ph" type="file" accept="image/*" capture="environment" hidden>' +
      '<p id="gps" class="note"></p><button class="btn ghost" id="cl" style="margin-top:8px">ปิด</button></div>';
    document.body.appendChild(m);
    var st = { code: null, kratong: null, state: null, stream: null, timer: null, closed: false };
    var $ = function (id) { return m.querySelector('#' + id); };
    function close() { st.closed = true; if (st.stream) { st.stream.getTracks().forEach(function (t) { t.stop(); }); st.stream = null; } clearInterval(st.timer); try { var vv = m.querySelector('video'); if (vv) { vv.pause(); vv.srcObject = null; } } catch (e) {} m.remove(); if (capClose === close) capClose = null; }
    if (capClose) capClose(); capClose = close;
    $('cl').onclick = close;
    function accept(raw) {
      var v = String(raw || '').trim().toUpperCase(), mm = v.match(/^RICE-TUBE-([A-Z0-9]+)-(\d+)(?:-(WET|DRY))?$/);
      if (!mm) { $('qrok').textContent = 'รหัสไม่ถูกต้อง'; return false; }
      if (mm[1] !== p.code) { $('qrok').textContent = 'QR นี้เป็นของแปลงอื่น'; return false; }
      var k = p.kratongs.filter(function (x) { return x.seq === Number(mm[2]); })[0];
      if (!k) { $('qrok').textContent = 'ไม่พบกระทงนี้ในแปลง'; return false; }
      st.code = v; st.kratong = k; if (mm[3]) st.state = mm[3];
      $('qrok').innerHTML = '✅ ' + esc(k.label) + (st.state ? ' · ' + (st.state === 'DRY' ? 'แห้ง' : 'มีน้ำ') : '') + ' แล้วกดถ่ายรูป';
      if (st.stream) { st.stream.getTracks().forEach(function (t) { t.stop(); }); clearInterval(st.timer); $('cv').hidden = true; }
      return true;
    }
    if (needQr) {
      $('qrin').onchange = function () { accept(this.value); };
      m.querySelectorAll('[data-st]').forEach(function (b) { b.onclick = function () { st.state = b.dataset.st; if (st.kratong) accept(st.code.replace(/-(WET|DRY)$/, '') + '-' + st.state); else $('qrok').textContent = 'สแกนหรือพิมพ์รหัสก่อน'; }; });
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(function (s) {
          if (st.closed) { s.getTracks().forEach(function (t) { t.stop(); }); return; }
          st.stream = s; var v = $('cv'); v.srcObject = s; v.play();
          var det = ('BarcodeDetector' in window) ? new BarcodeDetector({ formats: ['qr_code'] }) : null, c = $('cc'), cx = c.getContext('2d', { willReadFrequently: true });
          st.timer = setInterval(function () {
            if (!v.videoWidth || st.kratong) return;
            if (det) det.detect(v).then(function (r) { if (r[0]) accept(r[0].rawValue); }).catch(function () {});
            else if (window.jsQR) { c.width = v.videoWidth; c.height = v.videoHeight; cx.drawImage(v, 0, 0); var r = jsQR(cx.getImageData(0, 0, c.width, c.height).data, c.width, c.height); if (r) accept(r.data); }
          }, 400);
        }).catch(function () { $('cv').hidden = true; $('qrok').textContent = 'เปิดกล้องไม่ได้ พิมพ์รหัสแทนได้'; });
      } else $('cv').hidden = true;
    }
    var gps = null, gpsStatus = 'unavailable';
    if (navigator.geolocation) navigator.geolocation.getCurrentPosition(function (g) { gpsStatus = 'ok'; gps = { lat: g.coords.latitude, lon: g.coords.longitude, acc: g.coords.accuracy }; $('gps').textContent = 'พิกัด ' + gps.lat.toFixed(5) + ', ' + gps.lon.toFixed(5) + ' (±' + Math.round(gps.acc) + ' ม.)'; },
      function (er) { gpsStatus = er && er.code === 1 ? 'denied' : 'unavailable'; $('gps').textContent = 'ไม่ได้รับพิกัด GPS (รูปยังบันทึกและส่งได้ แต่เจ้าหน้าที่อาจขอให้ถ่ายใหม่)'; }, { enableHighAccuracy: true, timeout: 15000 });
    $('ph').onchange = function () {
      var f = this.files[0]; if (!f) return;
      if (needQr && !st.kratong) { toast('สแกน QR ท่อก่อนถ่ายรูป'); this.value = ''; return; }
      Promise.all([thumb(f), resizeJpeg(f)]).then(function (r) {
        var data = r[0], blob = r[1], now = new Date().toISOString(), uuid = newUuid();
        S.evidence.push({ id: S.evidence.length + 1, uuid: uuid, mission_type: missionType, plot: p.id, kratong: st.kratong ? st.kratong.seq : null, qr: st.code, state: st.state, captured_at_client: now, gps: gps, thumb: data, review_state: 'pending' });
        if (st.kratong) { st.kratong.lastRead = now; st.kratong.state = st.state; }
        var pts = award('mission_completed', { mission_type: missionType, quality: 'pass' }, 'pending');
        while (S.evidence.length > 30) S.evidence.shift();
        save(); close();
        var meta = { client_uuid: uuid, plot_id: p.pid || null, mission_type: missionType, client_time: now, gps_status: gps ? 'ok' : gpsStatus };
        if (st.kratong) meta.kratong_seq = st.kratong.seq; if (st.code) meta.scanned_code = st.code;
        if (gps) { meta.lat = gps.lat; meta.lon = gps.lon; meta.acc_m = Math.round(gps.acc); }
        var msg = pts > 0 ? 'บันทึกแล้ว +' + fmt(pts) + ' แต้ม (รอตรวจ)' : 'บันทึกหลักฐานแล้ว (รอตรวจ)';
        if (!blob || !API) { toast(msg + ' · ส่งรูปไม่ได้ในเครื่องนี้'); route(); return; }
        API.outbox.add({ client_uuid: uuid, plot_local: p.id, meta: meta, blob: blob, saved_at: now }).then(function () { return flushOutbox(); }).then(function (r) {
          toast(r.left ? msg + (r.reason === 'unreachable' ? ' · รอส่ง (ระบบยังติดต่อไม่ได้)' : ' · รอส่ง (ไม่มีสัญญาณ)') : msg + ' · ส่งแล้ว');
          if (document.body.dataset.screen === 'home' || document.body.dataset.screen === 'settings') updateBadge();
        }, function () { toast(msg + ' · เก็บรูปในเครื่องไม่ได้ พื้นที่เต็ม'); });
        route();
      });
    };
  }
  function newUuid() { try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {} return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); }); }
  /* resize to at most 1024 px and re-encode as JPEG q0.6: the canvas drops EXIF; retry smaller if over the 600 KB server limit */
  function resizeJpeg(file) {
    return new Promise(function (res) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () {
        URL.revokeObjectURL(u);
        function enc(max, q) { var s = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * s)); c.height = Math.max(1, Math.round(img.height * s)); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); return new Promise(function (ok) { c.toBlob(ok, 'image/jpeg', q); }); }
        enc(1024, 0.6).then(function (b) { return b && b.size > 580000 ? enc(800, 0.45) : b; }).then(res, function () { res(null); });
      };
      img.onerror = function () { URL.revokeObjectURL(u); res(null); };
      img.src = u;
    });
  }
  function thumb(file) {
    return new Promise(function (res) {
      var img = new Image(), u = URL.createObjectURL(file);
      img.onload = function () { var s = Math.min(1, 320 / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = img.width * s; c.height = img.height * s; c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.6)); };
      img.onerror = function () { URL.revokeObjectURL(u); res(null); };
      img.src = u;
    });
  }

  /* ---------- mentor (AI) ---------- */
  function hisChat() {
    return '<div class="msg me"><div class="b">วันนี้ใส่ปุ๋ยได้ไหมครับ<div class="tm">09:28 <em>✓✓</em></div></div></div>' +
      '<div class="msg ai"><img alt="" src="img/mascot-head.png" style="width:52px"><div class="b"><div style="display:flex;gap:8px"><div style="flex:1">' +
      '<div style="font:800 22px Prompt">🌧️ ยังไม่ควรใส่ปุ๋ยครับ</div><div>🌧 พรุ่งนี้มีฝน 60%</div><div>📅 แนะนำรอ 3 วัน</div><div>🌿 เพื่อลดการสูญเสียปุ๋ย<br>และประหยัดค่าใช้จ่าย</div>' +
      '<div>ประมาณ <b class="pill" style="background:#f8ee45;padding:0 8px;font-size:20px">350 บ./ไร่</b></div></div><img alt="" src="img/chat-rice.jpg" style="width:88px;height:108px;border-radius:14px;object-fit:cover"></div>' +
      '<div style="font-size:17px">📄 ' + esc(F('ai_advice_figures', 'ref')) + '</div><span class="advice">คำแนะนำประกอบ</span><div class="tm">09:29</div></div></div>' +
      '<div class="msg me"><div class="b">แล้วควรทำอะไรต่อครับ<div class="tm">09:30 <em>✓✓</em></div></div></div>' +
      '<div class="msg ai"><img alt="" src="img/mascot-head.png" style="width:52px"><div class="b"><b style="font-size:19px">✅ ลำดับงานแนะนำ (3 วันนี้)</b>' +
      '<ol style="margin:4px 0;padding-left:24px;font-size:17px"><li>ตรวจระดับน้ำ และคงไว้ที่ 5–10 ซม.</li><li>สำรวจโรคใบ (โดยเฉพาะไหม้คอรวง)</li><li>บันทึกสถานะแปลง เพื่อรับแต้ม <b class="pill" style="background:#fbefa0;padding:0 6px">⭐ +20</b></li></ol><span class="advice">คำแนะนำประกอบ</span><div class="tm">09:31</div></div></div>';
  }
  function answer(q) {
    var t = q.toLowerCase(), best = null, score = 0;
    KB.entries.forEach(function (e) { var s = e.keywords.filter(function (k) { return t.indexOf(k.toLowerCase()) >= 0; }).length; if (s > score) { score = s; best = e; } });
    var now = new Date().toTimeString().slice(0, 5);
    var body = best ? esc(best.answer) : 'ไม่พบเรื่องนี้ในคลังความรู้ของแอป: ' + esc(KB.no_data) + ' กรุณาสอบถามเจ้าหน้าที่ในพื้นที่';
    var src = best ? best.source : KB.no_data;
    return '<div class="msg ai"><img alt="" src="img/mascot-head.png" style="width:52px"><div class="b" style="font-size:18px">' + body +
      '<div class="src">ที่มา: ' + esc(src) + '</div><span class="advice">' + esc(KB.label) + '</span><div class="src">' + esc(KB.disclaimer) + '</div><div class="tm">' + now + '</div></div></div>';
  }
  R.mentor = function () {
    var p = P() || {};
    S.chat = S.chat || [];
    var intro = F('ai_advice_figures', 'use_his_chat') && S.seeded ? hisChat() : answer('awd');
    app.innerHTML = header() + '<div class="sheet">' + titleRow('พี่เลี้ยง AI', 'ผู้ช่วยเกษตรกรมืออาชีพ 24 ชม.', '<span style="margin-left:auto;font-size:22px;color:#074810">⋮</span>', '<img alt="" src="img/mascot-title.png" style="width:55px">') +
      '<div class="card farm"><img class="av" alt="" src="' + esc((S.profile || {}).avatar || 'icons/icon-192.png') + '"><div style="flex:1"><b style="font-size:19px">แปลง ' + esc((S.profile || {}).name || '') + '</b><div style="font-size:14px">📍 ' + esc((S.profile || {}).district || '') + '</div></div>' +
      '<div style="border-left:1px solid #c3c9c5;padding-left:8px;font-size:14px;line-height:1.4">🌾 ' + fmt(p.rai || 0) + ' ไร่<br>📅 ' + esc(p.variety || '-') + '<br>🌱 อายุข้าว ' + (age(p) == null ? '-' : age(p)) + ' วัน</div>' + (p.map ? '<img alt="" src="img/map-thumb.jpg" style="width:72px;border-radius:10px">' : '') + '</div>' +
      '<div id="thread">' + intro + S.chat.join('') + '</div>' +
      '<div style="font:700 20px Prompt;color:#0b4a12;margin:8px 2px 4px">ถามเรื่องอื่นได้เลย</div>' +
      '<div class="qchips"><button data-q="ใบเหลือง ทำอย่างไร">🍃 ใบเหลือง<br>ทำอย่างไร?</button><button data-q="ราคาข้าว วันนี้">📈 ราคาข้าว<br>วันนี้</button><button data-q="น้ำ AWD ท่อวัดน้ำ">💧 น้ำจะมา<br>เมื่อไหร่?</button><button data-q="สูตรปุ๋ย กข85">🌾 สูตรปุ๋ย<br>สำหรับ กข85</button></div>' +
      '<form class="inputbar" id="ask"><span style="color:#5b5a5f">📷</span><input id="q" placeholder="พิมพ์คำถาม หรือกดพูด..." autocomplete="off"><button type="button" class="mic" id="mic" aria-label="พูด">🎤</button><button aria-label="ส่ง" style="color:#3e8e4e;font-size:22px">➤</button></form></div>';
    function ask(q) {
      if (!q) return;
      var me = '<div class="msg me"><div class="b">' + esc(q) + '<div class="tm">' + new Date().toTimeString().slice(0, 5) + '</div></div></div>';
      S.chat.push(me, answer(q)); while (S.chat.length > 40) S.chat.shift(); save();
      document.getElementById('thread').insertAdjacentHTML('beforeend', me + S.chat[S.chat.length - 1]);
      window.scrollTo(0, document.body.scrollHeight);
    }
    document.getElementById('ask').onsubmit = function (e) { e.preventDefault(); var i = document.getElementById('q'); ask(i.value.trim()); i.value = ''; };
    app.querySelectorAll('[data-q]').forEach(function (b) { b.onclick = function () { ask(b.dataset.q); }; });
    document.getElementById('mic').onclick = function () {
      var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) { toast('เครื่องนี้ยังไม่รองรับการพูด กรุณาพิมพ์'); return; }
      var r = new SR(); r.lang = 'th-TH'; r.onresult = function (e) { ask(e.results[0][0].transcript); }; r.start();
    };
  };

  R.analysis = function () {
    var dot = function (c) { return '<span class="dt" style="background:' + c + '"></span>'; };
    var G = '#2fa52f', Y = '#f6b800', RD = '#e53935';
    var rows = [
      ['🟤 ดิน (pH)', dot(Y) + '5.2<br><small>' + esc(F('ph_label_inconsistency', 'table_label')) + '</small>', 'ปรับสภาพดิน', '⚪ ใส่โดโลไมต์<br>100 กก./ไร่', '+15–20%<br><small>ผลผลิต</small>'],
      ['🍃 อินทรีย์วัตถุ<br>(OM)', dot(RD) + '1.1%<br><small>ต่ำ</small>', 'เพิ่มอินทรีย์วัตถุ', '🌾 ไถกลบฟาง<br>/เพิ่มปุ๋ยหมัก', '+10–15%<br><small>ความอุดมสมบูรณ์</small>'],
      ['🧺 N-P-K', dot(RD) + 'N ต่ำ<br>' + dot(Y) + 'P กลาง<br>' + dot(G) + 'K สูง', 'ปรับสมดุลธาตุ', '🔵 ปุ๋ยสั่งตัด<br>46-0-0 +<br>18-46-0', 'ประหยัด<br>350 บ./ไร่'],
      ['🌾 พันธุ์', dot(G) + 'กข85<br><small>เหมาะสม</small>', 'ให้คงใช้ต่อ', '🟡 ใช้พันธุ์ กข85<br>(เหมาะพื้นที่)', 'ผลผลิตดี<br>สม่ำเสมอ'],
      ['💧 น้ำ', dot(G) + 'AWD<br><small>เหมาะสม</small>', 'จัดการน้ำตาม<br>ช่วงอายุ', '🚿 ปล่อยน้ำแห้งสลับ<br>(AWD)', 'ลดค่าสูบ<br>30%'],
      ['🐞 โรค', dot(Y) + '<span style="color:#d32f2f">ไหม้คอรวง</span><br><small>(เสี่ยงสูง)</small>', 'เฝ้าระวังและ<br>ป้องกันทันที', '🧴 ใช้สารตามทะเบียน<br>กรมวิชาการเกษตร', 'ลดความเสี่ยง<br>ผลผลิต'],
      ['🪙 ต้นทุน', '4,200 บ./ไร่', 'ลดต้นทุนได้', '🪙 ปรับเหลือ<br>3,500 บ./ไร่', 'ลดลง<br>700 บ./ไร่'],
      ['🏪 ตลาด', 'โรงสี A<br>' + esc(F('prices_98_95_110', 'p98')) + ' บ./กก.', 'ตลาดรองรับดี', '📄 ทำสัญญาขาย<br>ล่วงหน้า', 'รายได้มั่นคง']];
    if (!F('ai_advice_figures', 'use_his_chat')) rows.forEach(function (r) { r[4] = KB ? esc(KB.no_data) : '-'; });
    app.innerHTML = header({ pl: true }) + '<div class="sheet" style="background:#fff">' + titleRow('ตารางวิเคราะห์แปลง (AI)', 'ผลวิเคราะห์จากข้อมูลดิน น้ำ พันธุ์ และสภาพอากาศ') +
      '<img class="mascot" alt="" src="img/mascot-top.jpg" style="right:4px;top:-14px;width:76px;border-radius:38px">' +
      profileCard(stdRows(), 'img/map-thumb.jpg') +
      '<div class="profit"><img alt="" src="img/coins.jpg" style="width:66px;border-radius:10px"><div style="flex:1"><div style="font:600 17px Prompt">กำไรคาด</div><div class="big">3,850 <small>บ./ไร่</small></div></div>' +
      '<div style="text-align:right;border-left:1px solid rgba(255,255,255,.4);padding-left:8px;font-size:14px">' + esc(F('profit_before_2700', 'before')) + '<br><span class="up">↗ เพิ่มขึ้น <b>' + esc(F('profit_before_2700', 'pct')) + '</b></span></div></div>' +
      '<div class="card" style="margin-top:6px;overflow:hidden;border-radius:14px"><table class="an"><tr><th>หัวข้อ</th><th>ค่าที่วัด /<br>สถานะ</th><th>AI วิเคราะห์</th><th>คำแนะนำ<br>(ปฏิบัติ)</th><th>ผลต่อเงิน</th></tr>' +
      rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>' +
      '<div class="plan"><b style="color:#023b01;font-size:16px">🎯 สรุปแผนปฏิบัติ (3 ขั้นตอนสำคัญ)</b><div class="steps">' +
      '<div class="st"><i>1</i>🟤<br>ปรับปรุงดิน<br><small>(โดโลไมต์ + ไถกลบฟาง)</small></div><b class="green">›</b><div class="st"><i>2</i>💧<br>จัดการน้ำแบบ<br>AWD</div><b class="green">›</b><div class="st"><i>3</i>🧺<br>ให้ปุ๋ยสั่งตัด<br><small>46-0-0 + 18-46-0</small></div></div></div>' +
      '<button class="btn" id="do" style="margin-top:12px">⊙ ทำตามนี้ ✓</button>' + advice() + '</div>';
    document.getElementById('do').onclick = function () { location.hash = '#/missions'; };
  };

  R.options = function () {
    var y7 = F('yield_750_600', 'y750'), y6 = F('yield_750_600', 'y600');
    var opt = function (best, img, nm, d, sell, col, bg, prof, risk, rc, seg, foot, fc) {
      return '<div class="card opt' + (best ? ' best' : '') + '">' + (best ? '<span class="tag">👑 แนะนำสูงสุด</span>' : '') + '<span class="radio' + (best ? ' on' : '') + '"></span>' +
        '<img class="ph" alt="" src="img/' + img + '.jpg"><div><div class="nm">' + nm + '</div><div style="font-size:14px">📅 ' + d + '</div><div style="font-size:14px">🏭 ' + sell + '</div></div>' +
        '<div><div class="pb" style="background:' + bg + '">กำไรคาด<br><b style="color:' + col + '">' + prof + '</b> <b style="color:' + col + ';font-size:16px">บ./ไร่</b></div><div style="font-size:13px">ความเสี่ยง: <b style="color:' + rc + ';font:600 13px Prompt">' + risk + '</b></div><div class="risk">' + seg + '</div></div>' +
        '<div class="foot"><span class="dot" style="background:' + fc + '">✓</span> ' + foot + '</div></div>';
    };
    var segs = function (n, tot, c) { var s = ''; for (var i = 0; i < tot; i++) s += '<i style="' + (i < n ? 'background:' + c : '') + '"></i>'; return s; };
    app.innerHTML = header({ pl: true }) + '<div class="sheet" style="background:#fff">' + titleRow('ทางเลือกก่อนปลูก', 'เปรียบเทียบผลตอบแทน ความเสี่ยง และตลาดล่วงหน้า') +
      '<img class="mascot" alt="" src="img/mascot-top.jpg" style="right:4px;top:-14px;width:72px;border-radius:36px">' +
      profileCard(['🌾 แปลง ' + fmt((P() || {}).rai || 0) + ' ไร่', '📅 รอบปลูกใหม่', '🌱 เริ่มปลูก มิ.ย. 2569']) +
      opt(true, 'opt1', 'กข85', 'ปลูก 15 มิ.ย. 2569', 'ขาย โรงสี A', '#1d7a14', '#eaf7e3', '3,850', 'ต่ำ', '#111', segs(6, 6, '#1b8a12'), 'ผลผลิตสูง เหมาะพื้นที่บางระกำ มีตลาดรองรับแน่นอน', '#2e9a2e') +
      opt(false, 'opt2', 'พิษณุโลก 2', 'ปลูก 1 ก.ค. 2569', 'ขาย สหกรณ์ B', '#8a5200', '#fdf3d8', '3,400', 'ปานกลาง', '#8a6100', segs(3, 5, '#fbaf04'), 'ทนแล้งดี ต้นทุนใกล้เคียง กำไรเหมาะสม', '#a86f00') +
      opt(false, 'opt3', 'หอมมะลิ', 'ปลูก 20 ก.ค. 2569', 'ขาย ตลาดกลาง', '#a31515', '#fdeaea', '2,900', 'สูง', '#d32f2f', segs(3, 5, '#e11015'), 'ราคาดี แต่เสี่ยงต่อโรคและสภาพอากาศ', '#d32f2f') +
      '<div class="card" style="margin-top:8px;padding:6px 6px 4px"><b style="font-size:18px">📶 สรุปเปรียบเทียบ</b> <span style="font:600 14px Prompt">(ต่อไร่)</span>' +
      '<table class="cmp"><tr><th>พันธุ์</th><th>ผลผลิตคาด<br><span class="nw">(กก./ไร่)</span></th><th>ราคาคาด<br><span class="nw">(บ./กก.)</span></th><th>รายได้<br><span class="nw">(บ./ไร่)</span></th><th>ต้นทุน<br><span class="nw">(บ./ไร่)</span></th><th>กำไรสุทธิ<br><span class="nw">(บ./ไร่)</span></th></tr>' +
      '<tr class="hl"><td><b>👑 กข85</b></td><td>' + y7 + '</td><td>' + F('prices_98_95_110', 'p98') + '</td><td>7,350</td><td>3,500</td><td><b style="color:#1d7a14">3,850</b></td></tr>' +
      '<tr><td><b>พิษณุโลก 2</b></td><td>720</td><td>' + F('prices_98_95_110', 'p95') + '</td><td>6,840</td><td>3,440</td><td><b>3,400</b></td></tr>' +
      '<tr><td><b>หอมมะลิ</b></td><td>' + y6 + '</td><td>' + F('prices_98_95_110', 'p110') + '</td><td>6,600</td><td>3,700</td><td><b>2,900</b></td></tr></table></div>' +
      '<div class="airec"><span class="p">🎯 ข้อแนะนำจาก AI</span><span><b>เลือก “กข85”</b> ปลูก 15 มิ.ย. 2569<br>เพื่อกำไรสูงสุด และความเสี่ยงต่ำ</span></div>' +
      '<button class="btn" style="margin-top:6px" onclick="location.hash=\'#/plot\'">⊙ เลือกทางนี้ →</button>' + advice() + '</div>';
  };

  R.market = function () {
    var note = F('prices_98_95_110', 'note');
    var buyer = function (best, img, nm, list, price, col, pill, pillbg) {
      return '<div class="card buyer' + (best ? ' best' : '') + '">' + (best ? '<span class="tag">👑 ' + esc(F('typos_as_shown', 'offer_tag')) + '</span><span class="dot" style="position:absolute;right:10px;top:8px;background:#2ea52e;width:20px;height:20px">✓</span>' : '<span class="radio" style="top:10px"></span>') +
        '<img class="ph" alt="" src="img/' + img + '.jpg"><div><div class="nm">' + nm + '</div><ul>' + list.map(function (l) { return '<li>' + l + '</li>'; }).join('') + '</ul></div>' +
        '<div class="pr">เสนอราคา<br><b style="color:' + col + '">' + price + ' <small>บ./กก.</small></b><span class="lk" style="background:' + pillbg + '">' + pill + '</span></div></div>';
    };
    app.innerHTML = header({ pl: true }) + '<div class="sheet" style="background:#fff">' + titleRow('ตลาดนำ – ผู้ซื้อเสนอราคาล่วงหน้า', 'เชื่อมตรงผู้ซื้อ • ล็อกราคาได้ • ลดความเสี่ยง', '<span style="margin-left:auto;color:#0d3d10;font-size:20px">🔗</span>') +
      profileCard(stdRows(), 'img/ears-thumb.jpg') +
      '<div class="banner"><span style="font-size:32px">🤝</span><div><b style="font:700 19px Prompt;color:#0b3d0b">จับคู่ผู้ซื้อสำหรับ “กข85”</b><div style="font-size:13px">ผลผลิตคาด 15,000 กก. (15 ตัน) • เริ่มรับซื้อ ก.ย. – ต.ค.</div></div></div>' +
      buyer(true, 'buyer1', 'โรงสี A', ['ต้องการ: กข85', 'ความชื้น: ≤ 15%', 'รับซื้อ: ก.ย. – ต.ค.'], F('prices_98_95_110', 'p98'), '#13641a', '🤝 ' + esc(F('locked_15_ton', 'locked')).replace(/ (\d+) ตัน/, ' $1\u00a0ตัน'), '#dff2d4') +
      buyer(false, 'buyer2', 'สหกรณ์ B', ['ต้องการ: กข85', 'ความชื้น: ≤ 15%', 'รับซื้อ: ก.ย. – ต.ค.'], F('prices_98_95_110', 'p95'), '#7a4a05', 'รอการยืนยัน', '#fdf0c8') +
      buyer(false, 'buyer3', '<span style="font-size:20px">🌐</span> ผู้ส่งออก C', ['ต้องการ: กข85 (มี QR)', 'มาตรฐาน: GAP/คาร์บอนต่ำ', 'ความชื้น: ≤ 14%', 'รับซื้อ: ต.ค. – พ.ย.'], F('prices_98_95_110', 'p92'), '#a50f0f', '🤝 ต้องมี QR ล็อตข้าว', '#fdf0c8') +
      (note ? '<p class="note">' + esc(note) + '</p>' : '') +
      '<div class="card feat"><img class="mascot" alt="" src="img/mascot-mkt.jpg" style="right:2px;top:-22px;width:70px"><b style="font:700 17px Prompt;color:#0d2a10">จุดเด่นการขายล่วงหน้าผ่าน RiceOS</b><div class="c4">' +
      '<div><span style="font-size:24px">🛡️</span><br>ราคามั่นคง<small>ลดความเสี่ยง</small></div><div><span style="font-size:24px">🪙</span><br>มีผู้ซื้อจริง<small>ตรวจสอบได้</small></div><div><span style="font-size:24px">🍃</span><br>เพิ่มมูลค่า<small>คาร์บอนต่ำ</small></div><div><span style="font-size:24px">▦</span><br>มี QR ล็อตข้าว<small>ตรวจสอบย้อนกลับ</small></div></div></div>' +
      '<button class="btn" id="deal" style="margin-top:8px">🤝 ' + esc(F('locked_15_ton', 'cta')) + ' →</button>' +
      '<p class="note">แอปยังไม่ทำสัญญาซื้อขายแทนท่าน การตกลงจริงต้องทำกับผู้ซื้อและเจ้าหน้าที่โครงการ ราคาขึ้นกับพันธุ์และความชื้น</p></div>';
    document.getElementById('deal').onclick = function () { toast('บันทึกความสนใจแล้ว เจ้าหน้าที่จะติดต่อกลับ (ยังไม่ใช่สัญญา)'); };
  };

  R.points = function () {
    var t = totals(), pr = S.profile || {}, rs = RicePoints.inForce(RULESETS, new Date().toISOString());
    var names = { 'R1-awd-photo': 'ถ่ายท่อวัดน้ำ AWD', 'R2-no-burn': 'ไม่เผาฟาง', 'R3-lesson': 'ผ่านบทเรียน', OPENING: 'ยอดยกมา' };
    app.innerHTML = header() + '<div class="sheet">' + titleRow('เงิน & แต้ม') +
      '<div class="duo"><div class="wallet" style="margin:0;display:block"><div style="font:600 15px Prompt">ยอด Wallet</div><b>' + esc(pr.wallet || '-') + ' บ.</b></div><div class="ptspill" style="flex-direction:column;padding:6px">⭐ <b>' + fmt(t.confirmed + t.pending) + '</b>แต้ม</div></div>' +
      '<p class="note">ยืนยันแล้ว ' + fmt(t.confirmed) + ' · รอส่งเมื่อระบบกลางพร้อม ' + fmt(t.pending) + ' · แต้มลีกสัปดาห์นี้ ' + fmt(t.week) + '</p>' +
      '<div class="card" style="padding:12px;margin-top:8px"><h3 style="margin:0;font:700 19px Prompt">🏆 ลีก</h3><p style="font-size:16px">อันดับในตำบล/อำเภอ/จังหวัด จะแสดงเมื่อเชื่อมระบบกลางของโครงการ' + (S.consent && S.consent.public_rank ? ' (ท่านยินยอมให้แสดงชื่อแสดงตน)' : ' (ท่านเลือกไม่แสดงชื่อในอันดับ)') + '</p></div>' +
      '<div class="card" style="padding:12px;margin-top:8px"><h3 style="margin:0;font:700 19px Prompt">🎁 รางวัล</h3><p style="font-size:16px">รายการรางวัลรอคณะกรรมการโครงการอนุมัติ</p></div>' +
      '<div class="card" style="padding:12px;margin-top:8px"><h3 style="margin:0 0 4px;font:700 19px Prompt">กติกาแต้ม ' + (rs ? 'เวอร์ชัน ' + esc(rs.version) + ' (มีผล ' + rs.effective_from.slice(0, 10) + ')' : '') + '</h3>' +
      (rs ? rs.rules.map(function (r) { return '<div style="font-size:16px;padding:4px 0;border-top:1px solid #eee">' + esc(names[r.id] || r.id) + ': ' + r.formula.base + (r.formula.per_rai ? ' แต้มต่อไร่' : ' แต้ม') + ' สูงสุด ' + r.formula.cap_per_week + ' ต่อสัปดาห์</div>'; }).join('') : '') + '</div>' +
      '<div class="card" style="padding:12px;margin-top:8px"><h3 style="margin:0;font:700 19px Prompt">ประวัติแต้ม</h3><ul class="league" style="list-style:none;padding:0;margin:0">' +
      (S.ledger || []).slice().reverse().slice(0, 20).map(function (r) { return '<li><span>' + esc(names[r.rule_id] || r.rule_id) + (r.state === 'pending' ? ' · รอตรวจ' : '') + '<br><small class="muted">' + new Date(r.occurred_at).toLocaleDateString('th-TH') + (r.rule_set_version && r.rule_set_version !== '-' ? ' · กติกา ' + esc(r.rule_set_version) : '') + '</small></span><b>+' + fmt(r.points) + '</b></li>'; }).join('') + '</ul></div>' +
      '<button class="btn ghost" id="wd" style="margin-top:12px">ตั้งค่าบัญชี / ถอนความยินยอม / ลบบัญชี</button></div>';
    document.getElementById('wd').onclick = function () { location.hash = '#/settings'; };
  };

  R.missions = function () {
    var p = P(), m = mission(p), done = LESSONS ? LESSONS.lessons.filter(function (l) { return (S.lessons || {})[l.id] >= LESSONS.pass_score; }).length : 0;
    app.innerHTML = header() + '<div class="sheet">' + titleRow('ภารกิจ & แต้ม', p ? 'อายุข้าว ' + age(p) + ' วัน · ปฏิทินเบื้องต้น รอผู้เชี่ยวชาญยืนยัน' : '') +
      (m ? '<div class="card" style="padding:12px"><b style="font-size:20px">📋 ' + esc(m.title) + '</b><p style="font-size:16px;margin:6px 0">' + esc(m.detail || m.sub) + '</p><button class="btn" id="go">📷 ถ่ายรูปยืนยัน (+' + fmt(Math.round(previewPoints(m.type))) + ' แต้ม)</button></div>' : '<a class="btn" href="#/register">เพิ่มแปลงก่อน</a>') +
      '<div class="card" style="padding:12px;margin-top:10px"><b style="font-size:20px">📚 บทเรียน</b><p style="font-size:16px;margin:6px 0">ผ่านแล้ว ' + done + ' จาก ' + (LESSONS ? LESSONS.lessons.length : 0) + ' บท</p><a class="btn" href="#/lessons">เปิดบทเรียน</a></div>' +
      '<div class="card" style="padding:12px;margin-top:10px"><b style="font-size:20px">🖼️ หลักฐานล่าสุด</b>' + ((S.evidence || []).slice(-6).reverse().map(function (e) { return '<div class="row" style="margin-top:8px">' + (e.thumb ? '<img alt="" src="' + e.thumb + '" style="width:64px;height:64px;object-fit:cover;border-radius:10px">' : '') + '<div style="font-size:15px">' + (e.kratong ? 'กระทง ' + e.kratong : 'แปลง') + ' · ' + new Date(e.captured_at_client).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) + '<br>' + (e.gps ? e.gps.lat.toFixed(4) + ', ' + e.gps.lon.toFixed(4) : 'ไม่มีพิกัด') + ' · รอตรวจ</div></div>'; }).join('') || '<p class="note">ยังไม่มี</p>') + '</div></div>';
    var g = document.getElementById('go'); if (g) g.onclick = function () { capture(m.type); };
  };

  R.lessons = function () {
    var id = (location.hash.match(/id=([\w-]+)/) || [])[1], L = LESSONS.lessons.filter(function (l) { return l.id === id; })[0];
    if (!L) {
      app.innerHTML = header() + '<div class="sheet">' + titleRow('บทเรียน') + LESSONS.lessons.map(function (l) {
        var sc = (S.lessons || {})[l.id];
        return '<a class="card lesson" href="#/lessons?id=' + l.id + '" style="display:block;color:inherit;text-decoration:none"><h3>📖 ' + esc(l.title) + '</h3><div style="font-size:16px">' + (sc == null ? 'ยังไม่ได้ทำแบบทดสอบ' : 'คะแนน ' + sc + '%' + (sc >= LESSONS.pass_score ? ' ✅ ผ่าน' : '')) + '</div></a>';
      }).join('') + '</div>';
      return;
    }
    var ans = {};
    app.innerHTML = header() + '<div class="sheet">' + titleRow(esc(L.title)) + '<div class="card lesson">' + L.body.map(function (b) { return '<p style="font-size:19px">' + esc(b) + '</p>'; }).join('') +
      '<button class="btn sm ghost" id="rd">🔊 ฟัง</button></div>' +
      L.quiz.map(function (q, i) { return '<div class="card lesson"><h3>' + (i + 1) + '. ' + esc(q.q) + '</h3>' + q.choices.map(function (c, j) { return '<button class="choice" data-i="' + i + '" data-j="' + j + '">' + esc(c) + '</button>'; }).join('') + '</div>'; }).join('') +
      '<button class="btn" id="sub" style="margin-top:12px">ส่งคำตอบ</button></div>';
    app.querySelectorAll('.choice').forEach(function (b) { b.onclick = function () { ans[b.dataset.i] = Number(b.dataset.j); app.querySelectorAll('.choice[data-i="' + b.dataset.i + '"]').forEach(function (x) { x.classList.toggle('sel', x === b); }); }; });
    document.getElementById('rd').onclick = function () { speak(L.body.join(' ')); };
    document.getElementById('sub').onclick = function () {
      if (Object.keys(ans).length < L.quiz.length) { toast('กรุณาตอบให้ครบทุกข้อ'); return; }
      var ok = L.quiz.filter(function (q, i) { return ans[i] === q.answer; }).length, sc = Math.round(ok * 100 / L.quiz.length);
      S.lessons = S.lessons || {}; var prev = S.lessons[L.id];
      S.lessons[L.id] = Math.max(prev || 0, sc); save();
      var pts = (sc >= LESSONS.pass_score && !(prev >= LESSONS.pass_score)) ? award('lesson_passed', { score: sc, lesson_id: L.id }, 'confirmed') : 0;
      toast('ได้ ' + sc + '%' + (sc >= LESSONS.pass_score ? ' ผ่าน' : ' ลองใหม่ได้') + (pts ? ' +' + fmt(pts) + ' แต้ม' : ''));
      location.hash = '#/lessons';
    };
  };

  R.gov = function () {
    app.innerHTML = header() + '<div class="sheet">' + titleRow('บริการรัฐ') + '<div class="card" style="padding:14px;font-size:18px">การเชื่อมข้อมูลกับหน่วยงานจะเปิดเมื่อได้รับอนุญาตจากหน่วยงานเจ้าของข้อมูล ตอนนี้ยังไม่มีการส่งข้อมูลออกจากเครื่องนี้</div><a class="lot-entry" href="#/dashboard"><span class="outline-icon">▥</span><span><b>แดชบอร์ดจังหวัด</b><small>RiceOS พิษณุโลก</small></span><span>→</span></a></div>';
  };

  /* ---------- wallet, rice lot and provincial overview ---------- */
  function iconLine(path) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + path + '</svg>';
  }
  var NEW_IC = {
    loan: '<path d="M3 10h18L12 3 3 10zm2 3v6m7-6v6m7-6v6M3 22h18"/>',
    shield: '<path d="M12 3l8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3zM8 12l3 3 5-6"/>',
    relief: '<path d="M3 15h4l4 3h5l5-5M3 20h5l4 2 9-6M9 10V5m-3 3l3 3 3-3M16 3v6"/>',
    arrow: '<path d="M7 17L17 7M7 7h10v10"/>',
    bag: '<path d="M5 8h14l2 13H3L5 8zm3 0V6a4 4 0 018 0v2"/>',
    share: '<path d="M12 16V3m-5 5l5-5 5 5M5 13v8h14v-8"/>',
    chart: '<path d="M4 3v17h17M8 15l4-5 4 2 5-7"/>',
    leaf: '<path d="M4 20C2 7 12 3 21 3c0 9-4 18-15 15M4 20L16 8"/>',
    people: '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0112 0v3M16 5a3 3 0 010 6m2 4c3 0 4 3 4 6"/>'
  };
  function ni(name) { return iconLine(NEW_IC[name]); }
  function serviceNotice(kind, opener) {
    var agency = { loan: 'ธ.ก.ส.', insurance: 'บริษัทประกัน', relief: 'หน่วยงานเยียวยา' }[kind];
    var name = { loan: 'ขอสินเชื่อ', insurance: 'ประกัน', relief: 'ชดเชย' }[kind];
    var d = document.createElement('dialog'); d.className = 'service-notice';
    d.setAttribute('aria-labelledby', 'notice-title');
    d.innerHTML = '<div class="notice-handle"></div><span class="notice-icon">' + ni(kind === 'insurance' ? 'shield' : kind) + '</span><h2 id="notice-title">' + name + '</h2><p>ท่านต้องติดต่อ ' + agency + ' โดยตรงเพื่อดำเนินการ</p><div class="notice-status"><span>◷</span><div><b>รอส่งเมื่อระบบกลางพร้อม</b><p>แอปจะเชื่อมต่อเมื่อระบบกลางพร้อม ขณะนี้ยังไม่มีการส่งคำขอหรือข้อมูลของท่าน</p></div></div><button class="premium-button" autofocus>เข้าใจแล้ว</button>';
    document.body.appendChild(d);
    d.querySelector('button').onclick = function () { d.close(); };
    d.addEventListener('close', function () { d.remove(); if (opener && opener.isConnected) opener.focus(); });
    d.addEventListener('click', function (e) { if (e.target === d) { var b = d.getBoundingClientRect(); if (e.clientY < b.top || e.clientY > b.bottom || e.clientX < b.left || e.clientX > b.right) d.close(); } });
    d.showModal();
  }
  // Shared farmer navigation becomes a sidebar on desktop; the phone keeps its five-tab dock.
  function farmerShell(screen) {
    var links = NAV.concat([['lot', 'ล็อตข้าว Digital ID', 'plot'], ['dashboard', 'แดชบอร์ดจังหวัด', 'chart']]);
    return '<div class="farmer-shell"><aside class="farmer-sidebar">' + header() + '<nav class="farmer-nav" aria-label="พื้นที่การทำงาน"><span class="sidebar-caption">พื้นที่การทำงาน</span>' + links.map(function (item) {
      return '<a class="farmer-nav-link' + (screen === item[0] ? ' active' : '') + '" href="#/' + item[0] + '"' + (screen === item[0] ? ' aria-current="page"' : '') + '>' + (item[2] === 'chart' ? ni('chart') : svg(item[2])) + '<span>' + item[1] + '</span>' + (screen === item[0] ? '<span class="sidebar-current">›</span>' : '') + '</a>';
    }).join('') + '</nav><div class="farmer-foot"><span class="province-monogram">พล</span><div><b>จังหวัดพิษณุโลก</b><small>โครงการนาเดียว หลายรายได้</small></div></div></aside><div class="farmer-main">';
  }
  R.wallet = function () {
    var seeded = !!S.seeded, t = totals();
    var tx = [
      ['ขายข้าวโรงสี A +45,000', 'ขายข้าวโรงสี A', '+45,000', 'arrow', 'in'],
      ['เงินชดเชยภัยแล้ง +3,500', 'เงินชดเชยภัยแล้ง', '+3,500', 'relief', 'in'],
      ['ซื้อปุ๋ยกลุ่ม −980', 'ซื้อปุ๋ยกลุ่ม', '−980', 'bag', 'out']
    ];
    app.innerHTML = farmerShell('wallet') + '<main class="sheet premium-sheet wallet-sheet">' + titleRow('เงินของฉัน', 'รับเงินขายข้าว สินเชื่อ ประกัน ชดเชย') +
      '<div class="wallet-layout"><div class="wallet-overview"><section class="balance-card" aria-label="ยอด Wallet"><div class="balance-top"><span>ยอด Wallet</span>' + ni('shield') + '</div><div class="balance-number">' + (seeded ? '48,500 บ.' : 'ยังไม่มีข้อมูล') + '</div><div class="balance-foot"><span>' + esc((S.profile || {}).name || 'บัญชีของท่าน') + '</span><span class="credit-chip">✓ ' + (seeded ? 'เครดิตแปลง A' : 'เครดิตแปลง ยังไม่มีข้อมูล') + '</span></div></section>' +
      '<div class="wallet-tools"><div class="money-actions"><button data-service="loan">' + ni('loan') + '<span>ขอสินเชื่อ</span></button><button data-service="insurance">' + ni('shield') + '<span>ประกัน</span></button><button data-service="relief">' + ni('relief') + '<span>ชดเชย</span></button></div>' +
      '<a class="points-link" href="#/points"><span class="points-star">✦</span><span>แต้มของฉัน <b>' + fmt(t.confirmed + t.pending) + '</b></span><span>→</span></a></div></div><div class="wallet-activity"><section class="premium-card transaction-card"><div class="section-heading"><h2>รายการล่าสุด</h2><span class="quiet-label">บาท</span></div>' +
      (seeded ? '<ul class="transactions">' + tx.map(function (r) { return '<li aria-label="' + r[0] + '"><span class="transaction-icon ' + r[4] + '">' + ni(r[3]) + '</span><span class="transaction-name">' + r[1] + '</span><b class="amount ' + r[4] + '">' + r[2] + '</b></li>'; }).join('') + '</ul>' : '<div class="empty-finance">' + svg('money') + '<b>ยังไม่มีรายการ</b><span>รายการรับและจ่ายจะแสดงที่นี่<br>เมื่อเชื่อมต่อระบบกลาง</span></div>') + '</section>' +
      '<section class="premium-card profit-chart"><div class="section-heading"><h2>กำไร/ไร่ 3 ฤดู</h2><span class="quiet-label">บ./ไร่</span></div>' +
      (seeded ? '<svg viewBox="0 12 440 132" preserveAspectRatio="xMidYMid meet" role="img" aria-label="แนวโน้มกำไรต่อไร่เพิ่มขึ้นใน 3 ฤดู"><path d="M24 124C94 121 152 110 220 92S348 52 416 28V138H24Z" fill="#edf5ef"/><path d="M24 24H416M24 81H416M24 138H416" stroke="#dce6df" stroke-dasharray="3 4"/><path d="M24 124C94 121 152 110 220 92S348 52 416 28" fill="none" stroke="#1D7A3E" stroke-width="3" vector-effect="non-scaling-stroke"/><g fill="#fff" stroke="#1D7A3E" stroke-width="2.5"><circle cx="24" cy="124" r="4"/><circle cx="220" cy="92" r="4"/><circle cx="416" cy="28" r="4"/></g></svg><div class="profit-seasons"><span>ฤดู 1</span><span>ฤดู 2</span><span>ฤดู 3</span></div>' : '<div class="chart-empty">—<span>ยังไม่มีข้อมูลกำไรต่อไร่</span></div>') + '</section></div></div></main></div></div>';
    app.querySelectorAll('[data-service]').forEach(function (b) { b.onclick = function () { serviceNotice(b.dataset.service, b); }; });
  };

  var LOT_ID = 'LOT-PL-2569-00412', lotDockObserver = null;
  function lotCanvas() {
    var q = qrcode(0, 'M'); q.addData(LOT_ID); q.make();
    var modules = q.getModuleCount(), cell = 16, margin = 4;
    var c = document.createElement('canvas'); c.width = c.height = (modules + margin * 2) * cell;
    var ctx = c.getContext('2d'); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, c.width, c.height); ctx.fillStyle = '#123c28';
    for (var r = 0; r < modules; r++) for (var col = 0; col < modules; col++) if (q.isDark(r, col)) ctx.fillRect((col + margin) * cell, (r + margin) * cell, cell, cell);
    c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'QR ' + LOT_ID); return c;
  }
  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  R.lot = function () {
    var chain = ['แปลง', 'เกี่ยว 20 ต.ค.', 'ชั่ง', 'อบ', 'สี โรงสี A', 'คัดเกรด', 'บรรจุ'];
    app.innerHTML = farmerShell('lot') + '<main class="sheet premium-sheet lot-sheet">' + titleRow('ล็อตข้าว Digital ID', 'ตรวจสอบย้อนกลับล็อตข้าว') +
      '<div class="lot-layout"><div class="lot-identity"><section class="premium-card lot-passport"><div class="passport-top"><span>RICEOS · DIGITAL ID</span><span>✓ มาตรฐาน Q</span></div><div class="lot-qr" id="lot-qr"></div><div class="lot-code">' + LOT_ID + '</div><p class="lot-summary">LOT-PL-2569-00412 · 15 ตัน · ความชื้น 14.5%</p>' +
      '<div class="lot-badges"><span>' + ni('leaf') + 'คาร์บอนต่ำ -0.8 tCO2e</span><span>' + ni('shield') + 'มาตรฐาน Q</span></div>' +
      '<div class="lot-action"><button class="premium-button" id="share-lot">' + ni('share') + 'แชร์ QR</button><span id="share-status" role="status" aria-live="polite"></span></div></section></div>' +
      '<div class="lot-details"><section class="premium-card lot-chain"><div class="section-heading"><h2>เส้นทางล็อตข้าว</h2><span class="quiet-label">7 ขั้นตอน</span></div><p>ตรวจสอบย้อนกลับจากแปลงถึงถุง</p><ol aria-label="แปลง → เกี่ยว 20 ต.ค. → ชั่ง → อบ → สี โรงสี A → คัดเกรด → บรรจุ">' + chain.map(function (name, i) { var parts = i === 1 ? ['เกี่ยว', '20 ต.ค.'] : i === 4 ? ['สี', 'โรงสี A'] : [name]; return '<li><span class="chain-index">' + (i + 1) + '</span><span class="chain-label">' + parts[0] + (parts[1] ? ' <small>' + parts[1] + '</small>' : '') + '</span>' + (i < 6 ? '<span class="chain-arrow" aria-hidden="true">→</span>' : '<span class="chain-check">✓</span>') + '</li>'; }).join('') + '</ol></section></div></div></main></div></div>';
    var dock = app.querySelector('.lot-action');
    function sizeLotDock() { app.style.setProperty('--lot-dock-h', Math.ceil(dock.getBoundingClientRect().height) + 'px'); }
    sizeLotDock();
    if (typeof ResizeObserver === 'function') {
      lotDockObserver = new ResizeObserver(sizeLotDock);
      lotDockObserver.observe(dock);
    }
    var canvas;
    try { canvas = lotCanvas(); document.getElementById('lot-qr').appendChild(canvas); }
    catch (e) { document.getElementById('lot-qr').textContent = 'สร้าง QR ไม่สำเร็จ กรุณาเปิดหน้านี้อีกครั้ง'; }
    document.getElementById('share-lot').onclick = async function () {
      var b = this, status = document.getElementById('share-status');
      if (!canvas) { status.textContent = 'สร้าง QR ไม่สำเร็จ กรุณาเปิดหน้านี้อีกครั้ง'; return; }
      b.disabled = true;
      try {
        var blob = await new Promise(function (resolve, reject) { canvas.toBlob(function (v) { if (v) resolve(v); else reject(new Error('PNG')); }, 'image/png'); });
        var file = typeof File === 'function' ? new File([blob], LOT_ID + '.png', { type: 'image/png' }) : null;
        var shared = false;
        if (file && navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
          try { await navigator.share({ files: [file], title: 'ล็อตข้าว Digital ID', text: LOT_ID }); shared = true; status.textContent = 'แชร์ QR แล้ว'; }
          catch (err) { if (err.name === 'AbortError') { status.textContent = 'ยกเลิกการแชร์แล้ว'; return; } }
        }
        if (!shared) { downloadBlob(blob, LOT_ID + '.png'); status.textContent = 'ดาวน์โหลด QR เป็น PNG แล้ว'; toast('ดาวน์โหลด QR เป็น PNG แล้ว'); }
      } catch (e) { status.textContent = 'บันทึก QR ไม่สำเร็จ กรุณากดแชร์อีกครั้ง'; }
      finally { b.disabled = false; }
    };
  };

  // Each boundary is drawn once and reversed for its neighbour, so all nine faces meet.
  // Cubic control points follow the province's north-east uplands and southern lowlands.
  var MAP_BORDERS = {
    pa: [183,91, 190,81,191,68,207,63, 225,57,230,41,245,32],
    ab: [245,32, 260,35,268,22,284,24, 303,26,321,18,340,26],
    bc: [340,26, 352,34,354,49,369,53, 388,58,386,78,400,84, 412,92,408,106,420,115],
    cd: [420,115, 421,138,441,148,437,171, 432,193,458,211,455,235],
    de: [455,235, 446,254,455,276,442,296, 429,314,442,337,427,355, 414,368,419,384,406,399],
    ef: [406,399, 402,417,410,433,395,451, 381,469,388,488,374,501, 366,510,367,522,359,528],
    fg: [359,528, 338,526,311,548,289,541],
    gh: [289,541, 279,522,281,493,264,473],
    hi: [264,473, 239,478,218,505,197,501, 186,498,180,507,174,503],
    ij: [174,503, 164,493,168,473,152,462],
    jk: [152,462, 128,458,105,477,73,472],
    kl: [73,472, 62,457,65,444,51,436, 43,428,42,417,34,406],
    lm: [34,406, 35,389,46,382,44,366, 42,347,55,330,62,311],
    mn: [62,311, 58,290,75,273,73,253, 72,236,85,224,88,207],
    no: [88,207, 107,207,130,185,150,178],
    op: [150,178, 158,163,153,150,167,138, 178,126,174,105,183,91],
    pq: [183,91, 199,105,209,124,231,127, 248,129,256,147,275,149],
    qc: [275,149, 301,155,314,133,343,137, 372,140,394,122,420,115],
    qr: [275,149, 285,178,256,209,266,246],
    rd: [266,246, 296,237,313,252,340,240, 379,224,418,246,455,235],
    rs: [266,246, 244,250,235,272,209,281],
    st: [209,281, 188,278,181,258,158,258],
    to: [158,258, 166,233,144,208,150,178],
    tu: [158,258, 151,286,131,308,134,332, 136,342,130,354,126,360],
    um: [126,360, 109,344,85,349,62,311],
    uv: [126,360, 149,358,164,390,188,387],
    vj: [188,387, 183,411,159,428,152,462],
    vw: [188,387, 204,390,216,375,230,381],
    ws: [230,381, 222,354,235,331,221,308, 214,297,217,290,209,281],
    wx: [230,381, 252,394,253,420,285,437],
    xe: [285,437, 300,413,323,424,346,407, 367,391,389,409,406,399],
    xh: [285,437, 279,452,273,461,264,473]
  };
  function districtPath(boundaries) {
    var path = '';
    boundaries.split(' ').forEach(function (key) {
      var reverse = key[0] === '-', points = MAP_BORDERS[reverse ? key.slice(1) : key], curves = [];
      for (var i = 2; i < points.length; i += 6) {
        var c = points.slice(i - 2, i).concat(points.slice(i, i + 6));
        function at(t) {
          var u = 1 - t;
          return [0, 1].map(function (j) { return u*u*u*c[j] + 3*u*u*t*c[j+2] + 3*u*t*t*c[j+4] + t*t*t*c[j+6]; });
        }
        function tangent(t) {
          var u = 1 - t;
          return [0, 1].map(function (j) { return 3*u*u*(c[j+2]-c[j]) + 6*u*t*(c[j+4]-c[j+2]) + 3*t*t*(c[j+6]-c[j+4]); });
        }
        var offsets = [0, 2.6, -1.8, 0];
        for (var part = 0; part < 3; part++) {
          var t0 = part / 3, t1 = (part + 1) / 3;
          var a = at(t0), b = at(t1), da = tangent(t0), db = tangent(t1);
          var na = Math.hypot(da[0], da[1]) || 1, nb = Math.hypot(db[0], db[1]) || 1;
          a = [a[0] - da[1] / na * offsets[part], a[1] + da[0] / na * offsets[part]];
          b = [b[0] - db[1] / nb * offsets[part+1], b[1] + db[0] / nb * offsets[part+1]];
          curves.push(a.concat([a[0]+da[0]/9, a[1]+da[1]/9, b[0]-db[0]/9, b[1]-db[1]/9], b));
        }
      }
      if (reverse) curves = curves.reverse().map(function (c) { return [c[6], c[7], c[4], c[5], c[2], c[3], c[0], c[1]]; });
      curves.forEach(function (c) {
        if (!path) path = 'M' + c[0] + ' ' + c[1];
        path += 'C' + c.slice(2).join(' ');
      });
    });
    return path + 'Z';
  }
  var DISTRICTS = [
    { name: 'เมืองพิษณุโลก', level: 'low', x: 178, y: 326, borders: '-st -ws -vw -uv -tu' },
    { name: 'นครไทย', level: 'low', x: 363, y: 193, borders: 'cd -rd -qr qc' },
    { name: 'ชาติตระการ', level: 'low', x: 304, y: 86, borders: 'pa ab bc -qc -pq' },
    { name: 'บางระกำ', level: 'high', x: 108, y: 411, borders: '-um uv vj jk kl lm' },
    { name: 'บางกระทุ่ม', level: 'low', x: 216, y: 443, borders: 'vw wx xh hi ij -vj' },
    { name: 'พรหมพิราม', level: 'watch', x: 109, y: 278, borders: '-to tu um mn no' },
    { name: 'วัดโบสถ์', level: 'watch', x: 211, y: 209, borders: 'pq qr rs st to op' },
    { name: 'วังทอง', level: 'low', x: 333, y: 329, borders: 'rd de -xe -wx ws -rs' },
    { name: 'เนินมะปราง', level: 'low', x: 335, y: 477, borders: 'ef fg gh -xh xe' }
  ];
  var RISK = { low: ['✓', 'เฝ้าระวังปกติ'], watch: ['!', 'เฝ้าระวัง'], high: ['▲', 'เสี่ยงสูง'] };
  function riskPill(level) { return '<span class="risk-label ' + level + '"><i>' + RISK[level][0] + '</i>' + RISK[level][1] + '</span>'; }
  function provinceMap() {
    return '<svg class="province-svg" viewBox="0 0 490 570" role="img" aria-label="แผนที่ความเสี่ยง 9 อำเภอ จังหวัดพิษณุโลก"><defs><filter id="province-shadow" x="-15%" y="-15%" width="130%" height="135%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#153c28" flood-opacity=".14"/></filter></defs><g class="map-districts" filter="url(#province-shadow)">' + DISTRICTS.map(function (d, i) {
      return '<g class="district ' + d.level + '"><title>' + d.name + ' · ' + RISK[d.level][1] + '</title><path d="' + districtPath(d.borders) + '"/><circle cx="' + d.x + '" cy="' + d.y + '" r="19"/><text x="' + d.x + '" y="' + (d.y + 6) + '" text-anchor="middle">' + (i + 1) + '</text></g>';
    }).join('') + '</g><g class="map-compass"><path d="M25 64V31m-6 9l6-9 6 9"/><text x="25" y="22" text-anchor="middle">N</text></g></svg>';
  }
  var ALERTS = [['บางระกำ', 'high'], ['พรหมพิราม', 'watch'], ['วัดโบสถ์', 'watch']];
  R.dashboard = function () {
    var kpis = [
      ['พื้นที่เข้าร่วม', '100,000', 'ไร่', 'plot', '100,000 ไร่'],
      ['เกษตรกร', '10,000', 'เกษตรกร', 'people', '10,000 เกษตรกร'],
      ['ต้นทุนลด', '11%', '', 'chart', 'ต้นทุนลด 11%'],
      ['ข้าว QR', '5,200', 'ตัน', 'bag', 'ข้าว QR 5,200 ตัน'],
      ['คาร์บอน', '8,400', 'tCO2e', 'leaf', 'คาร์บอน 8,400 tCO2e'],
      ['WAU', '62%', '', 'people', 'WAU 62%']
    ];
    app.innerHTML = '<div class="dashboard-shell"><aside class="dashboard-sidebar">' + header() + '<div class="sidebar-body"><span class="sidebar-caption">พื้นที่การทำงาน</span><a class="sidebar-link active" href="#/dashboard" aria-current="page">' + ni('chart') + 'ภาพรวมจังหวัด<span>›</span></a><a class="sidebar-link" href="#/gov">' + ni('loan') + 'บริการรัฐ</a><a class="sidebar-link" href="#/home">' + svg('home') + 'แอปเกษตรกร</a></div><div class="sidebar-foot"><span class="province-monogram">พล</span><div><b>จังหวัดพิษณุโลก</b><small>โครงการนาเดียว หลายรายได้</small></div></div></aside>' +
      '<div class="dashboard-main"><header class="dashboard-title"><div><span class="eyebrow">แดชบอร์ดจังหวัด</span><h1>RiceOS พิษณุโลก</h1><p>KPI 6 ตัว แผนที่ความเสี่ยง และแนวโน้ม</p></div><button class="export-button" id="export-alerts" aria-label="ส่งออก CSV">' + ni('share') + '<span>ส่งออก CSV</span></button></header>' +
      '<section class="kpi-grid" aria-label="ตัวชี้วัดจังหวัด">' + kpis.map(function (k) { return '<article class="premium-card kpi" aria-label="' + k[4] + '"><div class="kpi-heading"><span>' + k[0] + '</span>' + (k[3] === 'plot' ? svg('plot') : ni(k[3])) + '</div><div class="kpi-number">' + k[1] + '</div><span class="kpi-unit">' + (k[2] || (k[0] === 'WAU' ? 'ผู้ใช้งานรายสัปดาห์' : 'ต่อไร่')) + '</span></article>'; }).join('') + '</section>' +
      '<div class="dashboard-panels"><section class="premium-card map-panel"><div class="premium-card map-overview"><div class="panel-heading"><div><span class="eyebrow">PHITSANULOK</span><h2>แผนที่ความเสี่ยง</h2></div><span class="district-count">9 อำเภอ</span></div><div class="map-body">' + provinceMap() + '</div><div class="map-legend">' + riskPill('low') + riskPill('watch') + riskPill('high') + '</div></div><div class="premium-card district-panel"><ol class="district-key">' + DISTRICTS.map(function (d, i) { return '<li><span class="district-number">' + (i + 1) + '</span><span>' + d.name + '</span><i class="map-risk-icon ' + d.level + '" aria-label="' + RISK[d.level][1] + '">' + RISK[d.level][0] + '</i></li>'; }).join('') + '</ol></div></section>' +
      '<div class="dashboard-right"><section class="premium-card trend-panel"><div class="panel-heading"><div><span class="eyebrow">แนวโน้มรายฤดู</span><h2>ต้นทุน vs ผลผลิต 3 ฤดู</h2></div></div><div class="trend-legend"><span><i></i>ต้นทุน (บ./ไร่)</span><span><i></i>ผลผลิต (กก./ไร่)</span></div>' +
      '<svg class="province-trend" viewBox="0 0 440 200" role="img" aria-label="แนวโน้มต้นทุนลดลงและผลผลิตเพิ่มขึ้นใน 3 ฤดู แยกแกนตามหน่วย"><g stroke="#e8eee9" stroke-dasharray="3 5"><path d="M45 25H392M45 70H392M45 115H392M45 160H392"/></g><g class="chart-label"><text x="0" y="30">5,000</text><text x="0" y="75">4,000</text><text x="0" y="120">3,000</text><text x="0" y="165">2,000</text><text x="405" y="30">800</text><text x="405" y="75">700</text><text x="405" y="120">600</text><text x="405" y="165">500</text><text x="45" y="192">ฤดู 1</text><text x="219" y="192" text-anchor="middle">ฤดู 2</text><text x="392" y="192" text-anchor="end">ฤดู 3</text></g><path d="M45 52C105 54 160 70 219 79S335 96 392 106" fill="none" stroke="#1D7A3E" stroke-width="3"/><path d="M45 113C100 110 160 90 219 84S335 56 392 47" fill="none" stroke="#D4A017" stroke-width="3" stroke-dasharray="7 5"/><g fill="#fff" stroke-width="2.5"><g stroke="#1D7A3E"><circle cx="45" cy="52" r="4"/><circle cx="219" cy="79" r="4"/><circle cx="392" cy="106" r="4"/></g><g stroke="#D4A017"><circle cx="45" cy="113" r="4"/><circle cx="219" cy="84" r="4"/><circle cx="392" cy="47" r="4"/></g></g></svg></section>' +
      '<section class="premium-card alerts-panel"><div class="panel-heading"><div><span class="eyebrow">การเฝ้าระวัง</span><h2>เสี่ยงโรค</h2></div><span class="alert-count">! 3 อำเภอ</span></div><p class="alert-summary">เสี่ยงโรค: บางระกำ, พรหมพิราม, วัดโบสถ์</p><table class="alert-table"><caption class="sr-only">พื้นที่เสี่ยงโรค</caption><thead><tr><th scope="col">อำเภอ</th><th scope="col">ระดับความเสี่ยง</th></tr></thead><tbody>' + ALERTS.map(function (r) { return '<tr><th scope="row">' + r[0] + '</th><td>' + riskPill(r[1]) + '</td></tr>'; }).join('') + '</tbody></table><div class="export-status" id="export-status" role="status" aria-live="polite"></div></section></div></div><footer class="dashboard-footer"><span>RiceOS · โครงการนาเดียว หลายรายได้</span><span>จังหวัดพิษณุโลก</span></footer></div></div>';
    document.getElementById('export-alerts').onclick = function () {
      try {
        var quote = function (v) { return '"' + String(v).replace(/"/g, '""') + '"'; };
        var rows = [['อำเภอ', 'ระดับความเสี่ยง']].concat(ALERTS.map(function (r) { return [r[0], RISK[r[1]][1]]; }));
        downloadBlob(new Blob(['\uFEFF' + rows.map(function (r) { return r.map(quote).join(','); }).join('\r\n') + '\r\n'], { type: 'text/csv;charset=utf-8' }), 'riceos-phitsanulok-alerts.csv');
        document.getElementById('export-status').textContent = 'ส่งออกตารางเสี่ยงโรคแล้ว'; toast('ดาวน์โหลด CSV แล้ว');
      } catch (e) { document.getElementById('export-status').textContent = 'ส่งออกไม่สำเร็จ กรุณาลองอีกครั้ง'; }
    };
  };

  /* ---------- router ---------- */
  var PUBLIC = ['register', 'login', 'reset', 'privacy', 'line', 'wallet', 'lot', 'dashboard'], routeTok = 0;
  var capClose = null;
  function route() {
    if (capClose) capClose();
    document.querySelectorAll('.modal').forEach(function (x) { x.remove(); });
    var h = (location.hash.replace(/^#\/?/, '') || '').split('?')[0], tok = ++routeTok;
    if (!S.consent || (!S.registered && !S.seeded)) { if (PUBLIC.indexOf(h) < 0) h = 'register'; }
    if (!R[h]) h = S.registered || S.seeded ? 'home' : 'register';
    /* guard: a registered farmer needs a live session. A 401 goes to #/login; no backend or no signal keeps the app usable offline. */
    if (S.registered && !S.seeded && !ME && PUBLIC.indexOf(h) < 0 && API) {
      getMe().then(function () { if (tok === routeTok) render(h); }, function (e) {
        if (tok !== routeTok) return;
        if (e && e.status === 401) { location.hash = '#/login'; if (h === 'login') render('login'); } else render(h);
      });
      if (!app.innerHTML || /กำลังเปิด/.test(app.innerHTML)) app.innerHTML = '<p style="padding:24px;font-size:20px">กำลังเปิด RiceOS...</p>';
      return;
    }
    render(h);
  }
  function render(h) {
    document.body.classList.toggle('dashboard-mode', h === 'dashboard');
    document.body.classList.toggle('farmer-mode', h === 'wallet' || h === 'lot');
    document.body.classList.toggle('premium-mode', ['wallet', 'lot', 'dashboard'].indexOf(h) >= 0);
    document.body.dataset.screen = h;
    if (lotDockObserver) { lotDockObserver.disconnect(); lotDockObserver = null; }
    app.style.removeProperty('--lot-dock-h');
    document.querySelectorAll('.service-notice').forEach(function (d) { d.close(); d.remove(); });
    drawNav(h);
    nav.style.display = ['login', 'reset', 'register', 'line', 'idcheck'].indexOf(h) >= 0 ? 'none' : '';
    document.body.classList.toggle('nonav', ['login', 'reset', 'register', 'line', 'idcheck'].indexOf(h) >= 0);
    try { R[h](); } catch (e) { console.error(e); app.innerHTML = '<p style="padding:20px;font-size:18px">เกิดข้อผิดพลาด กรุณาเปิดใหม่</p>'; }
    if (['wallet', 'lot', 'dashboard'].indexOf(h) >= 0) app.insertAdjacentHTML('beforeend', '<a class="mentor-float" href="#/mentor" aria-label="พี่เลี้ยง AI">' + iconLine('<path d="M5 4h14a2 2 0 012 2v10a2 2 0 01-2 2h-8l-6 4v-4H5a2 2 0 01-2-2V6a2 2 0 012-2z"/>') + '<span>AI</span></a>');
    if (!params.get('keep')) { window.scrollTo(0, 0); app.scrollTop = 0; if (document.body.classList.contains('premium-mode')) requestAnimationFrame(function () { app.scrollTop = 0; }); }
  }
  window.addEventListener('hashchange', function () { params = new URLSearchParams(location.search); route(); });

  Promise.all([getJSON('content/flags.json'), getJSON('data/knowledge.json'), getJSON('data/lessons.json'), getJSON('data/ruleset_v2.json')]).then(function (r) {
    FLAGS = r[0].flags; KB = r[1]; LESSONS = r[2]; RULESETS = [r[3]];
    S.ledger = S.ledger || []; S.evidence = S.evidence || [];
    route();
    flushOutbox().catch(function () {});
  }).catch(function (e) { console.error(e); app.innerHTML = '<p style="padding:20px;font-size:18px">เปิดข้อมูลไม่ได้ กรุณาเชื่อมอินเทอร์เน็ตครั้งแรก</p>'; });

  if ('serviceWorker' in navigator && location.protocol !== 'file:' && !params.get('shot')) navigator.serviceWorker.register('sw.js').catch(function () {});
})();
