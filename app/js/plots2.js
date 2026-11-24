/* RiceOS plot specification (W3 backend fields): area rai/ngan/wa, soil, irrigation, planting method, tenure, owner, GPS point and
   polygon by walking the bund, plot code RP... with QR, and a "measure position" retry for plots that have no GPS yet.
   Plain JS. Registered through window.RiceModules; app.js calls RiceP2.formHtml/read/body/absorb from the plot form and sync. */
(function () {
  'use strict';
  var L = {
    soil_type: [['', 'ไม่ระบุ'], ['clay', 'ดินเหนียว'], ['loam', 'ดินร่วน'], ['sandy', 'ดินทราย'], ['peat', 'ดินพรุ / ดินอินทรีย์'], ['saline', 'ดินเค็ม'], ['other', 'อื่น ๆ']],
    irrigation_type: [['', 'ไม่ระบุ'], ['irrigated', 'ชลประทาน'], ['rainfed', 'น้ำฝน'], ['pumped', 'สูบน้ำ'], ['mixed', 'หลายแหล่งรวมกัน']],
    planting_method: [['', 'ไม่ระบุ'], ['broadcast', 'นาหว่าน'], ['transplant', 'นาดำ'], ['direct_seed', 'หยอดเมล็ด / หว่านน้ำตม'], ['other', 'อื่น ๆ']],
    tenure: [['', 'ไม่ระบุ'], ['owner', 'เจ้าของที่ดิน'], ['lessee', 'เช่า'], ['family', 'ที่ดินของครอบครัว'], ['other', 'อื่น ๆ']]
  };
  var IC = { chev: '<path d="M6 9l6 6 6-6"/>', pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>', plus: '<path d="M12 5v14M5 12h14"/>', warn: '<path d="M12 3l10 18H2L12 3zM12 10v5M12 18v.5"/>', map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2V6zM9 4v14M15 6v14"/>', qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 19h2M14 20h1M20 14h1"/>' };
  function ico(n) { return '<svg class="p2ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + IC[n] + '</svg>'; }
  var A = null, draft = { lat: null, lon: null, acc: null, poly: [] };
  function esc(s) { return A ? A.esc(s) : String(s == null ? '' : s); }
  /* own dropdown (Gong rules: no native select; Assist 23 Nov plot form). The button keeps the id and .value (button value attribute)
     and fires a bubbling change event, so read() and other code work unchanged. Keys: ArrowDown/Up/Enter/Space open, arrows/Home/End move,
     Enter/Space pick, Escape closes back to the button, Tab or a click outside closes. The menu floats (no layout shift). */
  function dd(id, key, val, label) {
    var cur = L[key].filter(function (o) { return o[0] === (val || ''); })[0] || L[key][0];
    return '<label id="' + id + '-l" for="' + id + '">' + label + '</label><div class="p2dd"><button type="button" class="p2dd-b" id="' + id + '" value="' + esc(cur[0]) + '" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '-m" aria-labelledby="' + id + '-l ' + id + '-t"><span class="p2dd-t" id="' + id + '-t">' + cur[1] + '</span>' + ico('chev') + '</button>' +
      '<div class="p2dd-m" id="' + id + '-m" role="listbox" aria-labelledby="' + id + '-l" hidden>' + L[key].map(function (o) { return '<button type="button" role="option" tabindex="-1" data-v="' + esc(o[0]) + '" aria-selected="' + (o === cur) + '">' + o[1] + '</button>'; }).join('') + '</div></div>';
  }
  function ddOpts(b) { return [].slice.call(document.getElementById(b.id + '-m').querySelectorAll('[role=option]')); }
  function ddClose(b, back) { var m = document.getElementById(b.id + '-m'); if (!m || m.hidden) return; m.hidden = true; b.setAttribute('aria-expanded', 'false'); if (back) b.focus(); }
  function ddOpen(b, last) { [].forEach.call(document.querySelectorAll('.p2dd-b[aria-expanded=true]'), function (x) { if (x !== b) ddClose(x); }); var m = document.getElementById(b.id + '-m'); m.hidden = false; b.setAttribute('aria-expanded', 'true'); var os = ddOpts(b), on = os.filter(function (o) { return o.getAttribute('aria-selected') === 'true'; })[0]; (last ? os[os.length - 1] : on || os[0]).focus(); }
  function ddPick(b, o) { var ch = b.value !== o.dataset.v; ddOpts(b).forEach(function (x) { x.setAttribute('aria-selected', String(x === o)); }); b.value = o.dataset.v; document.getElementById(b.id + '-t').textContent = o.textContent; ddClose(b, true); if (ch) b.dispatchEvent(new Event('change', { bubbles: true })); }
  function ddKey(ev) {
    var t = ev.target; if (!t.closest || !t.closest('.p2dd')) return;
    var b = t.closest('.p2dd').querySelector('.p2dd-b'), k = ev.key;
    if (t === b) { if (k === 'ArrowDown' || k === 'ArrowUp') { ev.preventDefault(); ddOpen(b, k === 'ArrowUp'); } else if (k === 'Escape' && b.getAttribute('aria-expanded') === 'true') { ev.preventDefault(); ev.stopPropagation(); ddClose(b, true); } return; }
    var os = ddOpts(b), i = os.indexOf(t); if (i < 0) return;
    if (k === 'ArrowDown' || k === 'ArrowUp' || k === 'Home' || k === 'End') { ev.preventDefault(); os[k === 'Home' ? 0 : k === 'End' ? os.length - 1 : Math.max(0, Math.min(os.length - 1, i + (k === 'ArrowDown' ? 1 : -1)))].focus(); }
    else if (k === 'Enter' || k === ' ') { ev.preventDefault(); ddPick(b, t); }
    else if (k === 'Escape') { ev.preventDefault(); ev.stopPropagation(); ddClose(b, true); }
    else if (k === 'Tab') ddClose(b, false);
  }
  function ddClick(ev) {
    var t = ev.target.closest ? ev.target.closest('.p2dd-b,.p2dd-m [role=option]') : null;
    [].forEach.call(document.querySelectorAll('.p2dd-b[aria-expanded=true]'), function (x) { if (!t || t.closest('.p2dd') !== x.closest('.p2dd')) ddClose(x); });
    if (!t) return;
    if (t.classList.contains('p2dd-b')) { if (t.getAttribute('aria-expanded') === 'true') ddClose(t, false); else ddOpen(t); return; }
    ddPick(t.closest('.p2dd').querySelector('.p2dd-b'), t);
  }
  function opts(key, val) { return L[key].map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === (val || '') ? ' selected' : '') + '>' + o[1] + '</option>'; }).join(''); }
  function gpsText() {
    if (draft.lat == null) return 'ยังไม่ได้วัดตำแหน่ง';
    return 'บันทึกตำแหน่งแล้ว' + (draft.acc ? ' (คลาดเคลื่อนประมาณ ' + draft.acc + ' เมตร)' : '');
  }
  function polyText() { var n = draft.poly.length; return n ? 'เดินแล้ว ' + n + ' จุด' + (n < 3 ? ' (ต้องมีอย่างน้อย 3 จุด)' : ' พร้อมใช้') : 'ยังไม่ได้เดินรอบแปลง (ไม่บังคับ)'; }

  function formHtml(p) {
    p = p || {}; var sp = p.spec || {}, a = p.area || {};
    draft = { lat: p.lat || null, lon: p.lon || null, acc: p.acc || null, poly: (p.polygon || []).slice() };
    var open = (sp.soil_type || sp.irrigation_type || sp.planting_method || sp.tenure || a.ngan || a.wa || p.polygon) ? ' open' : '';
    return '<details class="p2box" id="p2box"' + open + '><summary>ข้อมูลแปลงเพิ่มเติม <small>ไม่บังคับ</small></summary>' +
      '<div class="p2row"><div><label for="p2ngan">งาน (0-3)</label><input id="p2ngan" inputmode="numeric" maxlength="1" value="' + esc(a.ngan || '') + '" placeholder="0"></div>' +
      '<div><label for="p2wa">ตารางวา (0-99)</label><input id="p2wa" inputmode="numeric" maxlength="2" value="' + esc(a.wa || '') + '" placeholder="0"></div></div>' +
      '<p class="hint">ช่อง "พื้นที่ (ไร่)" ด้านบนคือจำนวนไร่เต็ม ถ้ามีเศษให้ใส่งานและตารางวาที่นี่ เช่น 2 ไร่ 1 งาน 50 ตารางวา</p>' +
      dd('p2soil', 'soil_type', sp.soil_type, 'ชนิดดิน') +
      dd('p2irr', 'irrigation_type', sp.irrigation_type, 'แหล่งน้ำ') +
      dd('p2met', 'planting_method', sp.planting_method, 'วิธีปลูก') +
      dd('p2ten', 'tenure', sp.tenure, 'สิทธิ์ในที่ดิน') +
      '<label for="p2own">ชื่อเจ้าของที่ดิน (ถ้าไม่ใช่ท่านเอง)</label><input id="p2own" maxlength="80" value="' + esc(sp.owner_name || '') + '">' +
      '<div class="p2gps"><b>ตำแหน่งแปลง</b><div class="p2st" id="p2gps" role="status">' + gpsText() + '</div>' +
      '<button type="button" class="btn sm ghost" data-p2="loc">' + ico('pin') + 'วัดตำแหน่งตรงนี้</button>' +
      '<b style="margin-top:12px;display:block">เดินรอบแปลง (วัดแนวเขต)</b><p class="hint">ยืนที่มุมแปลง กด "เพิ่มจุดมุม" แล้วเดินไปมุมถัดไป ทำให้ครบทุกมุม อย่างน้อย 3 จุด</p>' +
      '<div class="p2st" id="p2poly" role="status">' + polyText() + '</div>' +
      '<div class="p2btns"><button type="button" class="btn sm" data-p2="pt">' + ico('plus') + 'เพิ่มจุดมุม</button><button type="button" class="btn sm ghost" data-p2="clr">ล้างจุด</button></div></div></details>';
  }
  function setTxt(id, t) { var e = document.getElementById(id); if (e) e.textContent = t; }
  function fix(p, msg) { var e = document.getElementById('p2msg'); if (e) e.textContent = msg; else A.toast(msg); }
  var MSG_GPS = 'หาพิกัด GPS ไม่ได้ กรุณาเปิดตำแหน่งในเครื่อง อนุญาตให้แอปใช้ตำแหน่ง และออกไปที่โล่งแจ้งแล้วลองใหม่';
  function getPos(cb) {
    var N = window.RiceNative; /* iOS app: native Geolocation plugin; browsers: navigator.geolocation (native.js) */
    if (!(N ? N.geoAvailable() : navigator.geolocation)) return cb(null, 'เครื่องนี้ไม่รองรับ GPS');
    var done = false, t = setTimeout(function () { if (!done) { done = true; cb(null, MSG_GPS); } }, 12000);
    try {
      (N ? N.getPosition : navigator.geolocation.getCurrentPosition.bind(navigator.geolocation))(function (g) {
        if (done) return; done = true; clearTimeout(t);
        var la = g.coords.latitude, lo = g.coords.longitude;
        if (!(la >= 5 && la <= 21 && lo >= 97 && lo <= 106)) return cb(null, 'ตำแหน่งที่ได้อยู่นอกประเทศไทย กรุณาลองใหม่');
        cb({ lat: la, lon: lo, acc: Math.round(g.coords.accuracy || 0) || null });
      }, function (er) { if (done) return; done = true; clearTimeout(t); cb(null, er && er.code === 1 ? 'ท่านไม่อนุญาตให้ใช้ตำแหน่ง กรุณาเปิดสิทธิ์ตำแหน่งของแอปในตั้งค่าเครื่อง' : MSG_GPS); }, { enableHighAccuracy: true, timeout: 11000, maximumAge: 0 });
    } catch (e) { done = true; clearTimeout(t); cb(null, MSG_GPS); }
  }

  /* ----- plot form buttons (event delegation, wired once) ----- */
  function onClick(ev) {
    var b = ev.target.closest ? ev.target.closest('[data-p2]') : null; if (!b) return;
    var k = b.dataset.p2;
    if (k === 'loc') { b.disabled = true; setTxt('p2gps', 'กำลังวัดตำแหน่ง...'); getPos(function (g, err) { b.disabled = false; if (g) { draft.lat = g.lat; draft.lon = g.lon; draft.acc = g.acc; } setTxt('p2gps', err || gpsText()); }); }
    else if (k === 'pt') {
      if (draft.poly.length >= 50) return setTxt('p2poly', 'เพิ่มได้สูงสุด 50 จุด');
      b.disabled = true; setTxt('p2poly', 'กำลังวัดตำแหน่งจุดมุม...');
      getPos(function (g, err) { b.disabled = false; if (g) { draft.poly.push({ lat: g.lat, lon: g.lon }); if (draft.lat == null) { draft.lat = g.lat; draft.lon = g.lon; draft.acc = g.acc; setTxt('p2gps', gpsText()); } } setTxt('p2poly', err || polyText()); });
    }
    else if (k === 'clr') { draft.poly = []; setTxt('p2poly', polyText()); }
    else if (k === 'fix') measureAgain(b);
  }
  function measureAgain(b) {
    var p = A.P(); if (!p) return;
    b.disabled = true; setTxt('p2gpsline', 'กำลังวัดตำแหน่ง...');
    getPos(function (g, err) {
      if (!g) { b.disabled = false; setTxt('p2gpsline', err); return; }
      p.lat = g.lat; p.lon = g.lon; p.acc = g.acc; p.gpsSent = false; p.gpsDenied = false; A.save();
      A.syncPlot(p).then(function () { setTxt('p2gpsline', 'บันทึกตำแหน่งแปลงแล้ว' + (g.acc ? ' (คลาดเคลื่อนประมาณ ' + g.acc + ' เมตร)' : '')); b.disabled = false; },
        function (e) { b.disabled = false; setTxt('p2gpsline', e && e.network ? 'ไม่มีสัญญาณอินเทอร์เน็ต ยังส่งไม่ได้ บันทึกพิกัด GPS ไว้ในเครื่องแล้ว และจะส่งให้เองเมื่อมีสัญญาณ' : 'ส่งตำแหน่งไม่สำเร็จ: ' + ((e && e.message) || 'กรุณาลองใหม่')); });
    });
  }

  /* ----- called by app.js ----- */
  function num(id, max) { var e = document.getElementById(id); if (!e) return 0; var n = Math.floor(Number((e.value || '').replace(/\D/g, ''))); return n > max ? max : n > 0 ? n : 0; }
  function val(id) { var e = document.getElementById(id); return e ? e.value.trim() : ''; }
  function read(p) {
    if (!document.getElementById('p2box')) return;
    var ngan = num('p2ngan', 3), wa = num('p2wa', 99);
    p.spec = { soil_type: val('p2soil'), irrigation_type: val('p2irr'), planting_method: val('p2met'), tenure: val('p2ten'), owner_name: val('p2own') };
    if (ngan || wa) { p.area = { rai: Math.floor(Number(p.rai) || 0), ngan: ngan, wa: wa }; p.rai = p.area.rai + ngan / 4 + wa / 400; } else delete p.area;
    if (draft.lat != null && !(p.lat && p.lon)) { p.lat = draft.lat; p.lon = draft.lon; p.acc = draft.acc || undefined; p.gpsSent = false; }
    else if (draft.lat != null && (p.lat !== draft.lat || p.lon !== draft.lon)) { p.lat = draft.lat; p.lon = draft.lon; p.acc = draft.acc || undefined; p.gpsSent = false; }
    if (draft.poly.length >= 3) { if (JSON.stringify(p.polygon || []) !== JSON.stringify(draft.poly)) p.polyDirty = true; p.polygon = draft.poly.slice(); }
    else if (!draft.poly.length && p.polygon) { delete p.polygon; p.polyDirty = true; }
  }
  function body(p) {
    var o = {}, sp = p.spec || {};
    if (p.variety) o.variety = p.variety;
    if (p.area && (p.area.ngan || p.area.wa)) o.area = { rai: p.area.rai, ngan: p.area.ngan, wa: p.area.wa };
    ['soil_type', 'irrigation_type', 'planting_method', 'tenure', 'owner_name'].forEach(function (k) { if (sp[k]) o[k] = sp[k]; });
    if (p.polygon && p.polygon.length >= 3) {
      var ring = p.polygon.map(function (q) { return [q.lon, q.lat]; }); ring.push(ring[0]);
      o.polygon = { type: 'Polygon', coordinates: [ring] };
    } else if (p.polyDirty && p.pid) o.polygon = null;
    return o;
  }
  function absorb(p, sp) {
    if (!sp) return;
    if (sp.plot_code) p.plotCode = sp.plot_code;
    if ('area_check' in sp) p.areaCheck = sp.area_check || null;
    if (sp.lat != null && sp.lon != null && !(p.lat && p.lon)) { p.lat = sp.lat; p.lon = sp.lon; p.acc = sp.acc_m || undefined; p.gpsSent = true; }
    if (sp.lat != null && p.lat === sp.lat && p.lon === sp.lon) p.gpsSent = true;
    p.spec = p.spec || {};
    ['soil_type', 'irrigation_type', 'planting_method', 'tenure', 'owner_name'].forEach(function (k) { if (sp[k] && !p.spec[k]) p.spec[k] = sp[k]; });
    if (sp.area && !p.area && (sp.area.ngan || sp.area.wa)) p.area = { rai: sp.area.rai, ngan: sp.area.ngan, wa: sp.area.wa };
    if (sp.polygon && sp.polygon.coordinates && !p.polygon) {
      var r = sp.polygon.coordinates[0] || []; p.polygon = r.slice(0, Math.max(0, r.length - 1)).map(function (c) { return { lat: c[1], lon: c[0] }; });
    }
    if (sp.polygon === null && p.polyDirty) p.polyDirty = false;
    if (sp.polygon) p.polyDirty = false;
  }

  /* ----- plot screen: plot code + QR + GPS status + area check ----- */
  function decorate(h) {
    if (h !== 'plot') return;
    var p = A.P(), app = A.app; if (!p || app.querySelector('.p2card')) return;
    var has = !!(p.lat && p.lon), code = p.plotCode, ac = p.areaCheck;
    var html = '<div class="card p2card"><h3>รหัสแปลงและตำแหน่ง</h3>' +
      '<div class="p2top"><div class="p2qr" id="p2qr" aria-label="QR รหัสแปลง"></div><div><div class="p2code">' + (code ? esc(code) : 'ยังไม่มีรหัส') + '</div>' +
      '<div class="hint">' + (code ? 'ใช้รหัสนี้ยืนยันแปลงเมื่อเจ้าหน้าที่ตรวจ' : 'รหัสแปลงจะขึ้นหลังส่งข้อมูลแปลงสำเร็จ') + '</div></div></div>' +
      '<div class="p2st" id="p2gpsline" role="status">' + (has ? ico('pin') + 'มีตำแหน่งแปลงแล้ว' + (p.acc ? ' (คลาดเคลื่อนประมาณ ' + p.acc + ' เมตร)' : '') + (p.gpsSent ? '' : ' รอส่ง') : ico('warn') + 'ยังไม่มีตำแหน่ง GPS ของแปลงนี้') + '</div>' +
      (p.polygon && p.polygon.length >= 3 ? '<div class="p2st">' + ico('map') + 'มีแนวเขตแปลง ' + p.polygon.length + ' จุด' + (ac && ac.polygon_rai ? ' พื้นที่จากแนวเขต ' + A.fmt(Math.round(ac.polygon_rai * 100) / 100) + ' ไร่' + (ac.ok === false ? ' (ต่างจากที่แจ้ง ' + Math.round(ac.diff_pct) + '% เจ้าหน้าที่อาจติดต่อเพื่อตรวจสอบ)' : '') : '') + '</div>' : '') +
      '<div class="p2btns"><button class="btn sm' + (has ? ' ghost' : '') + '" data-p2="fix">' + ico('pin') + (has ? 'วัดตำแหน่งใหม่' : 'วัดตำแหน่ง') + '</button><a class="btn sm ghost" href="#/plotedit">แก้ไขข้อมูลแปลง</a></div></div>';
    var anchor = app.querySelector('.lot-entry'); if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else (app.querySelector('.sheet') || app).insertAdjacentHTML('beforeend', html);
    var q = document.getElementById('p2qr');
    if (code && q && window.qrcode) { try { var z = qrcode(0, 'M'); z.addData(code); z.make(); q.innerHTML = z.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { q.textContent = code; } }
    else if (q) q.innerHTML = ico('qr');
  }

  window.RiceP2 = { formHtml: formHtml, read: read, body: body, absorb: absorb, labels: L };
  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; document.addEventListener('click', onClick); document.addEventListener('click', ddClick); document.addEventListener('keydown', ddKey, true); app.after(decorate); });
})();
