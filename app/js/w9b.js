/* W9 part B: game link (plot screen + home), #/income (static awareness page), #/plot/<id>/summary (printable plot sheet with QR).
   Registered through window.RiceModules; no network except GET /api/evidence and GET /api/me/points for the summary. */
(function () {
  'use strict';
  var A;
  var esc = function (s) { return A.esc(s); };
  var STAGE_DAYS = [10, 25, 45, 65, 85, 110];
  var MISSIONS = { awd_tube_photo: 'ถ่ายรูปท่อวัดน้ำ', no_burn: 'รูปแปลงไม่เผาฟาง' };
  var STATUS = { approved: 'ผ่านการตรวจ', complete: 'ส่งแล้ว รอเจ้าหน้าที่ตรวจ', pending_photo: 'รอส่งรูป', rejected: 'ไม่ผ่านการตรวจ' };

  /* ---------- game link (contract: game-dev2/PLOT-LINK.md). Keys that are not known or not valid are left out. ---------- */
  function gameUrl(p) {
    var q = [], add = function (k, v) { q.push(k + '=' + encodeURIComponent(v)); };
    if (!p) return '/game/';
    var v = String(p.variety || '').replace(/[^0-9A-Za-z฀-๿ .\-_]/g, '').trim().slice(0, 24); if (v) add('v', v);
    var a = Number(p.rai); if (isFinite(a) && a >= 0.1 && a <= 1000) add('a', Math.round(a * 100) / 100);
    var s = String(p.sowDate || '').slice(0, 10), d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? Math.floor((Date.now() - Date.parse(s + 'T00:00:00+07:00')) / 864e5) : NaN;
    if (isFinite(d) && d >= 0 && d <= 400) { add('s', s); var g = 0; STAGE_DAYS.forEach(function (x) { if (d >= x) g++; }); add('g', g); }
    var id = String(p.pid || p.id || '').replace(/-/g, ''); if (/^[A-Za-z0-9_-]{1,32}$/.test(id)) add('p', id); /* server plot ids are 36-char UUIDs; the contract allows 32: hyphens dropped */
    var h = String(location.hash || ''); add('back', /^#\/plot\/[A-Za-z0-9_%-]{1,60}$/.test(h) ? '/next/' + h : '/next/'); /* back button in the game; game accepts only paths starting with /next/ */
    return '/game/' + (q.length ? '?' + q.join('&') : '');
  }
  function gameBtn(p, id) {
    return '<a class="btn w9b-game" id="' + id + '" href="' + esc(gameUrl(p)) + '"><span class="w9b-gi" aria-hidden="true">&#127806;</span><span>เล่นเกมนาข้าวของแปลงนี้</span></a>';
  }

  /* ---------- decorate home + plot screens ---------- */
  function decorate(h) {
    var p = A.P(), app = A.app;
    if (h === 'home' && !app.querySelector('.w9b-home')) {
      var g = app.querySelector('.grid4'); if (!g) return;
      g.insertAdjacentHTML('afterend', '<div class="w9b-home">' + (p ? gameBtn(p, 'w9bgamehome') : '') +
        '<a class="w9b-inc" href="#/income"><b>นาข้าวหนึ่งแปลง หลายรายได้</b><small>รู้จักรายได้เสริมจากนาข้าว</small><span aria-hidden="true">&rsaquo;</span></a></div>');
    }
    if (h === 'plot' && p && !app.querySelector('.w9b-plot')) {
      var anchor = app.querySelector('.p2card') || app.querySelector('.lot-entry'), html = '<div class="w9b-plot">' + gameBtn(p, 'w9bgameplot') +
        '<a class="btn ghost w9b-sum" id="w9bsum" href="#/plot/' + encodeURIComponent(p.id) + '/summary">สรุปแปลง พิมพ์ / บันทึก PDF</a></div>';
      if (anchor) anchor.insertAdjacentHTML('beforebegin', html); else (app.querySelector('.sheet') || app).insertAdjacentHTML('beforeend', html);
    }
  }

  /* ---------- #/income ---------- */
  var PRICES = [['ราคาข้าวเปลือกหอมมะลิ', 'บาท/ตัน'], ['ราคาข้าวเปลือกเจ้า', 'บาท/ตัน'], ['ราคาฟางก้อน', 'บาท/ก้อน'], ['ราคาคาร์บอนเครดิตจาก<span class="nw">นาข้าว</span>', 'บาท/ตัน CO&#8322;']];
  var IDEAS = [
    ['ข้าวคุณภาพและข้าวพันธุ์พิเศษ', 'ข้าวที่ดูแลตามมาตรฐานและมีบันทึกย้อนกลับ อาจขายได้ในช่องทางที่ผู้ซื้อต้องการหลักฐาน ควรสอบถามราคาจากผู้ซื้อก่อนตัดสินใจ'],
    ['จัดการฟางและตอซัง', 'ไม่เผาฟาง นำไปทำปุ๋ยหมัก คลุมดิน หรือขายเป็นฟางก้อน ช่วยลดควันและลดค่าปุ๋ยบางส่วน'],
    ['ปลาและผักในพื้นที่นา', 'ปลูกผักบนคันนา หรือเลี้ยงปลาในร่องน้ำตามความเหมาะสมของพื้นที่ ใช้เป็นอาหารในครัวเรือนและขายส่วนเกิน'],
    ['รวมกลุ่มแปรรูปและขายตรง', 'รวมกลุ่มกับเพื่อนบ้านเพื่อสีข้าว บรรจุถุง หรือขายตรง ควรปรึกษาเกษตรอำเภอเรื่องทะเบียนและมาตรฐาน'],
    ['ลดต้นทุนน้ำ แรงงาน และปุ๋ย', 'การขังน้ำสลับแห้งอาจช่วยลดค่าน้ำมัน<span class="nw">สูบน้ำ</span> เงินที่ประหยัดได้ก็นับเป็นรายได้ที่เพิ่มขึ้นเช่นกัน']
  ];
  var SOURCES = [
    'สถาบันวิจัยข้าวนานาชาติ (IRRI): แนวทางการจัดการน้ำแบบเปียกสลับแห้ง (Alternate Wetting and Drying)',
    'กรมการข้าว กระทรวงเกษตรและสหกรณ์: ข้อแนะนำการปลูกข้าวและการจัดการน้ำ <a class="ext" href="https://rkb.ricethailand.go.th/web/index.php" target="_blank" rel="noopener">https://rkb.ricethailand.go.th/web/index.php</a> <a class="ext" href="https://www.moac.go.th/" target="_blank" rel="noopener">https://www.moac.go.th/</a>',
    'องค์การบริหารจัดการก๊าซเรือนกระจก (องค์การมหาชน) หรือ อบก.: ข้อมูลโครงการคาร์บอนเครดิตภายในประเทศ <a class="ext" href="https://tver.tgo.or.th/database/public/methodology/90?category_id=28&amp;lang=th" target="_blank" rel="noopener">https://tver.tgo.or.th/database/public/methodology/90?category_id=28&amp;lang=th</a>',
    'IPCC 2019 Refinement to the 2006 Guidelines, ข้อมูลก๊าซมีเทนจากนาข้าว',
    'ราคาจริง: สอบถามโรงสี สหกรณ์ หรือสำนักงานเกษตรอำเภอในวันที่ท่านจะขาย ราคาสินค้าเกษตร สำนักงานเศรษฐกิจการเกษตร <a class="ext" href="https://oae.go.th/" target="_blank" rel="noopener">https://oae.go.th/</a>',
    'ดูแหล่งข้อมูลทั้งหมด: <a href="#/sources">แหล่งข้อมูล</a>'
  ];
  function income() {
    var li = function (a) { return '<li><b>' + a[0] + '</b><span>' + a[1] + '</span></li>'; };
    A.app.innerHTML = A.header() + '<div class="sheet w9 w9b">' + A.titleRow('นาข้าวหนึ่งแปลง หลายรายได้', 'ความรู้เพื่อวางแผน ยังไม่ใช่การรับรองรายได้') +
      '<div class="card w9card w9hero"><span>นาแปลงเดียว มีหลายทางสร้างรายได้</span><small>หน้านี้เป็นข้อมูลให้ท่านคิดและวางแผนเท่านั้น ไม่ใช่คำสัญญาว่าจะได้เงิน</small></div>' +
      '<div class="card w9card" id="inc-awd"><h3>คาร์บอนเครดิตจากการทำนาแบบเปียกสลับแห้ง (AWD)</h3>' +
      '<p class="w9p">AWD คือการปล่อยให้น้ำในนาแห้งลงเป็นช่วง ๆ แทนการขังน้ำตลอด ใช้ท่อวัดระดับน้ำช่วยดู ช่วยให้นาปล่อยก๊าซมีเทนน้อยลง</p>' +
      '<p class="w9p">เมื่อมีโครงการที่ตรวจวัดและรับรองผลได้ การลดก๊าซนี้อาจนำไปแลกเป็นคาร์บอนเครดิต และอาจมีส่วนแบ่งกลับมาถึงเกษตรกร</p>' +
      '<p class="w9note"><b>โปรดทราบ</b> ยังไม่มีการรับรองว่าแปลงของท่านจะได้คาร์บอนเครดิตหรือได้เงินเท่าใด ขึ้นอยู่กับเงื่อนไขโครงการ การตรวจสอบ และราคาในตลาดขณะนั้น</p>' +
      '<a class="btn w9btn" href="#/kratong">ดูท่อวัดน้ำและ QR ของแปลง</a></div>' +
      '<div class="card w9card" id="inc-ideas"><h3>ไอเดียรายได้อื่นจากนาและครัวเรือน</h3><ul class="w9list w9b-ideas">' + IDEAS.map(li).join('') + '</ul></div>' +
      '<div class="card w9card" id="inc-prices"><h3>ราคาอ้างอิง</h3><span class="w9b-tag">ตัวอย่างเพื่อวางแผน</span>' +
      '<p class="w9note">ตัวเลข x,xxx ด้านล่างเป็นที่ว่างสำหรับจดราคา ตัวอย่างเพื่อวางแผน ยังไม่ใช่ราคาจริง กรุณาสอบถามราคาปัจจุบันก่อนตัดสินใจ</p><ul class="w9list">' +
      PRICES.map(function (r) { return '<li><span>' + r[0] + '<small>' + r[1] + '</small></span><b class="w9b-ph">x,xxx</b></li>'; }).join('') + '</ul></div>' +
      '<div class="card w9card"><h3>ขั้นต่อไป</h3><a class="btn w9btn" href="#/lessons">เรียนบทเรียนการจัดการน้ำ</a><a class="btn ghost w9btn" href="#/mentor">ถามพี่เลี้ยงนาข้าว</a></div>' +
      '<footer class="w9b-src" id="inc-src"><h3>แหล่งที่มา</h3><ul>' + SOURCES.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ul>' +
      '<p>ข้อมูลในหน้านี้เป็นความรู้ทั่วไป ไม่ใช่คำแนะนำทางการเงิน ไม่รับประกันรายได้</p></footer></div>';
  }

  /* ---------- #/plot/<id>/summary ---------- */
  var thDate = function (iso) { try { return new Date(iso).toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return ''; } };
  var thTime = function (iso) { try { return new Date(iso).toLocaleString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
  function plotById(id) { var a = A.S().plots || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  function summary() {
    var m = location.hash.match(/^#\/plot\/([^/?]+)\/summary/), id = m ? decodeURIComponent(m[1]) : '', p = plotById(id), tok = {};
    summary.tok = tok;
    if (!p) { A.app.innerHTML = A.header() + '<div class="sheet w9">' + A.titleRow('สรุปแปลง') + '<div class="card w9card"><p class="w9p">ไม่พบแปลงนี้ กรุณาเลือกแปลงจากหน้าแปลงของฉัน</p><a class="btn w9btn" href="#/plot">ไปหน้าแปลง</a></div></div>'; return; }
    var local = (A.S().evidence || []).filter(function (e) { return e.plot === p.id; }).map(function (e) { return { id: 'l' + e.id, mission_type: e.mission_type, client_time: e.captured_at_client, status: e.sent ? 'complete' : 'pending_photo', kratong_seq: e.kratong, local: true }; });
    var draw = function (evs, bal, plotPts, note) {
      if (summary.tok !== tok) return;
      var has = p.lat && p.lon, code = p.plotCode;
      var tl = evs.length ? '<ol class="w9b-tl">' + evs.slice(0, 40).map(function (e) {
        return '<li><b>' + esc(MISSIONS[e.mission_type] || 'หลักฐานภารกิจ') + (e.kratong_seq ? ' · กระทง ' + esc(e.kratong_seq) : '') + '</b><span>' + esc(thTime(e.client_time || e.server_time)) + '</span><em>' + esc(STATUS[e.status] || 'ส่งแล้ว') + '</em></li>';
      }).join('') + '</ol>' + (evs.length > 40 ? '<p class="w9note">แสดง 40 รายการล่าสุด จากทั้งหมด ' + A.fmt(evs.length) + ' รายการ</p>' : '') : '<p class="w9p">ยังไม่มีหลักฐานของแปลงนี้</p>';
      A.app.innerHTML = A.header() + '<div class="sheet w9 w9b w9b-sum">' + A.titleRow('สรุปแปลง', esc(p.name || 'แปลงของฉัน')) +
        '<div class="w9b-actions"><button class="btn w9btn" id="w9bprint" type="button">พิมพ์ / บันทึก PDF</button><a class="btn ghost w9btn" href="#/plot">กลับไปหน้าแปลง</a></div>' +
        '<div class="w9b-sheet"><h2 class="w9b-ptitle">สรุปแปลงนา ' + esc(p.name || '') + '</h2>' +
        '<div class="card w9card w9b-id"><div class="w9b-qr" id="w9bqr" role="img" aria-label="QR รหัสแปลง"></div><div><span class="w9b-lbl">รหัสแปลง</span><b class="w9b-code" id="w9bcode">' + (code ? esc(code) : 'ยังไม่มีรหัส') + '</b>' +
        (code ? '' : '<small>รหัสจะขึ้นหลังส่งข้อมูลแปลงสำเร็จ</small>') + '</div></div>' +
        '<div class="card w9card"><h3>ข้อมูลแปลง</h3><dl class="w9b-dl"><dt>ชื่อแปลง</dt><dd>' + esc(p.name || '-') + '</dd><dt>พื้นที่</dt><dd>' + (p.rai ? A.fmt(p.rai) + ' ไร่' : '-') + '</dd><dt>พันธุ์ข้าว</dt><dd>' + esc(p.variety || '-') + '</dd><dt>วันปลูก</dt><dd>' + (p.sowDate ? esc(thDate(p.sowDate + 'T00:00:00+07:00')) : '-') + '</dd>' +
        '<dt>ตำแหน่ง GPS</dt><dd>' + (has ? Number(p.lat).toFixed(5) + ', ' + Number(p.lon).toFixed(5) + (p.acc ? '<small>คลาดเคลื่อน<span class="nw">ประมาณ ' + esc(p.acc) + '&nbsp;เมตร</span></small>' : '') : 'ยังไม่มีตำแหน่ง') + '</dd>' +
        (p.polygon && p.polygon.length >= 3 ? '<dt>แนวเขตแปลง</dt><dd>' + p.polygon.length + ' จุด</dd>' : '') + '</dl></div>' +
        '<div class="card w9card"><h3>แต้ม</h3>' + (bal === null ? '<p class="w9p">ดูแต้มได้เมื่อมีสัญญาณและเข้าสู่ระบบ</p>' : '<dl class="w9b-dl"><dt>แต้มจากแปลงนี้</dt><dd>' + A.fmt(plotPts) + ' แต้ม</dd><dt>แต้มสะสมทั้งหมดของท่าน</dt><dd>' + A.fmt(bal) + ' แต้ม</dd></dl>') + '</div>' +
        '<div class="card w9card"><h3>หลักฐานที่ส่ง</h3>' + (note || '') + tl + '</div>' +
        '<p class="w9note w9b-foot">พิมพ์เมื่อ ' + esc(thDate(new Date().toISOString())) + ' · ข้อมูลจากแอป RiceOS</p></div></div>';
      var q = document.getElementById('w9bqr');
      if (code && q && window.qrcode) { try { var z = qrcode(0, 'M'); z.addData(code); z.make(); q.innerHTML = z.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { q.textContent = code; } }
      else if (q) q.textContent = 'ไม่มี QR';
      document.getElementById('w9bprint').onclick = function () { window.print(); };
    };
    draw(local, null, 0, '');
    if (!A.api || !A.api.req || !p.pid) return;
    var W = window.RiceW9 || {};
    Promise.all([A.api.req('GET', '/api/evidence').then(function (j) { if (W.put) W.put('evidence', j); return { j: j, stale: false }; }, function () { var c = W.get && W.get('evidence'); return c ? { j: c.d, stale: true } : null; }),
      A.api.req('GET', '/api/me/points?limit=100').then(function (j) { return j; }, function () { return null; })]).then(function (rs) {
      if (summary.tok !== tok || !rs[0]) return;
      var evs = (rs[0].j.evidence || []).filter(function (e) { return e.plot_id === p.pid; }).sort(function (a, b) { return Date.parse(b.client_time || b.server_time) - Date.parse(a.client_time || a.server_time); });
      var ids = {}; evs.forEach(function (e) { ids[e.id] = 1; });
      var pts = rs[1] ? (rs[1].history || []).reduce(function (a, r) { return a + (r.reason === 'evidence_approved' && ids[r.ref_id] ? Number(r.delta) || 0 : 0); }, 0) : 0;
      draw(evs, rs[1] ? rs[1].balance : null, pts, rs[0].stale ? '<p class="w9stale">แสดงข้อมูลที่บันทึกไว้ในเครื่อง ไม่มีสัญญาณล่าสุด</p>' : '');
    });
  }

  window.RiceW9b = { gameUrl: gameUrl };
  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; app.R.income = income; app.R.plotsummary = summary; app.after(decorate); });
})();
