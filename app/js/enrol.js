/* RiceOS participation (W5 backend): pick the programme cycle, status, village/tambon/amphoe/province; claim screen for accounts opened at a
   registration point; ธ.ก.ส. document checklist (checklist only, no bank link, no eligibility claim); SRP topic tag + training-hours log on lessons.
   Plain JS. Routes: #/enrol  #/claim  #/baac  #/training. Registered through window.RiceModules. */
(function () {
  'use strict';
  var A = null, R = null, R_enrol;
  var STATUS = { applied: ['สมัครแล้ว รอเจ้าหน้าที่ยืนยัน', 'wait'], active: ['กำลังเข้าร่วม', 'ok'], completed: ['เข้าร่วมครบรอบแล้ว', 'ok'], withdrawn: ['ถอนตัวแล้ว', 'off'] };
  var MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  function esc(s) { return A.esc(s); }
  function thDate(iso) { var m = /^(\d{4})-(\d\d)-(\d\d)/.exec(iso || ''); return m ? (+m[3]) + ' ' + MON[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  function page(title, sub, inner) { A.app.innerHTML = A.header() + '<div class="sheet w8">' + A.titleRow(title, sub) + inner + '</div>'; }
  function errMsg(e) { return (e && e.message) || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'; }
  function parseDistrict(s) { /* "อ.บางระกำ จ.พิษณุโลก" from the older profile field */
    var a = /อ\.\s*([^\s]+)/.exec(s || ''), p = /จ\.\s*([^\s]+)/.exec(s || '');
    return { amphoe: a ? a[1] : '', province: p ? p[1] : '' };
  }

  /* ---------------- participation ---------------- */
  function areaForm(e, id) {
    var S = A.S(), d = parseDistrict((S.profile || {}).district), plots = (S.plots || []).filter(function (p) { return p.pid; });
    e = e || {};
    return '<label for="' + id + 'vl">หมู่บ้าน / หมู่ที่</label><input id="' + id + 'vl" maxlength="80" value="' + esc(e.village || '') + '">' +
      '<div class="w8grid"><div><label for="' + id + 'tb">ตำบล</label><input id="' + id + 'tb" maxlength="80" value="' + esc(e.tambon || '') + '"></div>' +
      '<div><label for="' + id + 'am">อำเภอ</label><input id="' + id + 'am" maxlength="80" value="' + esc(e.amphoe || d.amphoe) + '"></div>' +
      '<div><label for="' + id + 'pv">จังหวัด</label><input id="' + id + 'pv" maxlength="80" value="' + esc(e.province || d.province) + '"></div></div>' +
      (plots.length ? '<label for="' + id + 'pl">แปลงที่เข้าร่วม</label><select id="' + id + 'pl"><option value="">ไม่ระบุแปลง</option>' + plots.map(function (p) { return '<option value="' + esc(p.pid) + '"' + (e.plot_id === p.pid ? ' selected' : '') + '>' + esc(p.name || 'แปลง') + (p.plotCode ? ' (' + esc(p.plotCode) + ')' : '') + '</option>'; }).join('') + '</select>' : '');
  }
  function readArea(id) {
    var g = function (k) { var e = document.getElementById(id + k); return e ? e.value.trim() : ''; }, o = {};
    if (g('vl')) o.village = g('vl'); if (g('tb')) o.tambon = g('tb'); if (g('am')) o.amphoe = g('am'); if (g('pv')) o.province = g('pv'); if (g('pl')) o.plot_id = g('pl');
    return o;
  }
  R_enrol = function () {
    page('เข้าร่วมโครงการ', 'เลือกรอบและบอกที่อยู่ของแปลงนา', '<div id="w8body"><p class="big" style="padding:18px">กำลังโหลดรอบการเข้าร่วม...</p></div>');
    Promise.all([A.api.req('GET', '/api/cycles'), A.api.req('GET', '/api/me/enrolments')]).then(function (r) {
      var cycles = r[0].cycles || [], en = r[1].enrolments || [], by = {}; en.forEach(function (x) { by[x.cycle.code] = x; });
      en.forEach(function (x) { if (!cycles.some(function (c) { return c.code === x.cycle.code; })) cycles.push({ code: x.cycle.code, name: x.cycle.name, starts_on: '', ends_on: '', status: 'closed' }); });
      var box = document.getElementById('w8body');
      if (!cycles.length) { box.innerHTML = '<div class="card w8card"><h3>ยังไม่มีรอบที่เปิดรับ</h3><p>เมื่อโครงการเปิดรับสมัคร รอบการเข้าร่วมจะแสดงที่หน้านี้ ท่านไม่ต้องทำอะไรเพิ่ม</p></div>'; return; }
      box.innerHTML = cycles.map(function (c, i) {
        var e = by[c.code], st = e ? STATUS[e.status] || [e.status, 'wait'] : null, id = 'c' + i;
        return '<section class="card w8card" data-cy="' + esc(c.code) + '"><div class="w8head"><h3>' + esc(c.name) + '</h3>' + (st ? '<span class="w8pill ' + st[1] + '">' + st[0] + '</span>' : c.status === 'open' ? '<span class="w8pill wait">เปิดรับสมัคร</span>' : '') + '</div>' +
          (c.starts_on ? '<p class="w8dates">ช่วงเวลา ' + thDate(c.starts_on) + (c.ends_on ? ' ถึง ' + thDate(c.ends_on) : '') + '</p>' : '') +
          (e ? '<p class="w8line">ที่อยู่แปลงที่แจ้ง: ' + esc([e.village && 'หมู่บ้าน ' + e.village, e.tambon && 'ต.' + e.tambon, e.amphoe && 'อ.' + e.amphoe, e.province && 'จ.' + e.province].filter(Boolean).join(' ') || 'ยังไม่ได้ระบุ') + '</p>' +
            (e.registered_by === 'staff' ? '<p class="w8line">ลงทะเบียนโดยเจ้าหน้าที่ที่จุดลงทะเบียน</p>' : '') + (e.joined_at ? '<p class="w8line">เข้าร่วมเมื่อ ' + thDate(e.joined_at) + '</p>' : '') : '') +
          (e && e.status === 'withdrawn' ? '' : '<details class="w8det"' + (e ? '' : ' open') + '><summary>' + (e ? 'แก้ไขที่อยู่ของแปลง' : 'กรอกที่อยู่แล้วเข้าร่วม') + '</summary>' + areaForm(e, id) + '</details>' +
            '<p class="err" id="e' + id + '" role="alert" hidden></p><div class="w8btns"><button class="btn" data-' + (e ? 'save' : 'join') + '="' + esc(c.code) + '" data-id="' + id + '">' + (e ? 'บันทึกที่อยู่' : 'เข้าร่วมรอบนี้') + '</button>' +
            (e ? '<button class="btn ghost" data-out="' + esc(c.code) + '">ขอถอนตัวจากรอบนี้</button>' : '') + '</div>') + '</section>';
      }).join('');
      var fail = function (id, e) { var x = document.getElementById('e' + id); if (x) { x.hidden = false; x.textContent = e.code === 'cycle_closed' ? 'รอบนี้ปิดรับสมัครแล้ว' : e.code === 'already_enrolled' ? 'ท่านเข้าร่วมรอบนี้แล้ว' : errMsg(e); } };
      box.querySelectorAll('[data-join]').forEach(function (b) { b.onclick = function () {
        var body = readArea(b.dataset.id); body.cycle = b.dataset.join; A.busy(b, true);
        A.api.req('POST', '/api/me/enrolments', body).then(function () { A.toast('เข้าร่วมโครงการแล้ว'); R_enrol(); }, function (e) { A.busy(b, false); if (e.code === 'already_enrolled') return R_enrol(); fail(b.dataset.id, e); });
      }; });
      box.querySelectorAll('[data-save]').forEach(function (b) { b.onclick = function () {
        A.busy(b, true, 'กำลังบันทึก...');
        A.api.req('PATCH', '/api/me/enrolments/' + encodeURIComponent(b.dataset.save), readArea(b.dataset.id)).then(function () { A.toast('บันทึกที่อยู่แล้ว'); R_enrol(); }, function (e) { A.busy(b, false); fail(b.dataset.id, e); });
      }; });
      box.querySelectorAll('[data-out]').forEach(function (b) { b.onclick = function () {
        if (!confirm('ขอถอนตัวจากรอบนี้ใช่หรือไม่')) return;
        A.api.req('PATCH', '/api/me/enrolments/' + encodeURIComponent(b.dataset.out), { status: 'withdrawn' }).then(function () { A.toast('ถอนตัวแล้ว'); R_enrol(); }, function (e) { A.toast(errMsg(e)); });
      }; });
    }, function (e) { var b = document.getElementById('w8body'); if (b) b.innerHTML = '<div class="card w8card"><h3>เปิดข้อมูลไม่ได้</h3><p>' + esc(errMsg(e)) + '</p><button class="btn" id="w8retry">ลองใหม่</button></div>'; var r = document.getElementById('w8retry'); if (r) r.onclick = R_enrol; });
  };

  /* ---------------- claim: farmer opens an account made at a registration point ---------------- */
  function claimPage() {
    var pre = (location.hash.match(/code=([A-Za-z0-9-]+)/) || [])[1] || '';
    page('รับบัญชีที่ลงทะเบียนไว้', 'ใช้รหัสที่เจ้าหน้าที่ให้', '<div class="card w8card"><label for="cc">รหัสรับบัญชี (8 ตัวอักษร)</label><input id="cc" class="w8code" maxlength="9" autocapitalize="characters" autocomplete="off" value="' + esc(pre) + '">' +
      '<p class="hint">ตั้งเบอร์มือถือและ PIN เพื่อเข้าใช้ครั้งต่อไป (ถ้ายังไม่ตั้ง ภายหลังตั้งได้ที่เมนู ข้อมูลของฉัน)</p>' +
      '<label for="cph">เบอร์มือถือ</label><input id="cph" inputmode="tel" maxlength="10" autocomplete="tel">' +
      '<label for="cpn">PIN 6 หลัก</label><input id="cpn" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<label for="cpn2">ใส่ PIN อีกครั้ง</label><input id="cpn2" class="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="new-password">' +
      '<p class="err" id="err" role="alert" hidden></p><button class="btn" id="cgo" style="margin-top:10px">รับบัญชี</button></div>');
    A.wireForm(A.app);
    var say = function (m) { var e = document.getElementById('err'); e.hidden = false; e.textContent = m; };
    document.getElementById('cgo').onclick = function () {
      var code = document.getElementById('cc').value.replace(/[^A-Za-z0-9]/g, '').toUpperCase(), ph = document.getElementById('cph').value.replace(/\D/g, ''), pn = document.getElementById('cpn').value, pn2 = document.getElementById('cpn2').value;
      if (code.length !== 8) return say('รหัสต้องมี 8 ตัวอักษร กรุณาตรวจรหัสที่เจ้าหน้าที่ให้');
      var body = { code: code, client: A.api.native ? 'native' : 'web' };
      if (ph || pn || pn2) {
        if (!/^0\d{9}$/.test(ph)) return say('เบอร์มือถือต้องเป็นตัวเลข 10 หลัก เช่น 0812345678');
        if (!/^\d{6}$/.test(pn)) return say('PIN ต้องเป็นตัวเลข 6 หลัก');
        if (pn !== pn2) return say('PIN สองครั้งไม่ตรงกัน');
        body.phone = ph; body.pin = pn;
      }
      var b = document.getElementById('cgo'); A.busy(b, true, 'กำลังตรวจรหัส...');
      A.api.req('POST', '/api/auth/claim', body).then(function (j) {
        if (j.token && A.api.setToken) A.api.setToken(j.token);
        return A.api.setUser(j.user && j.user.public_id).then(function () { return A.getMe(true); });
      }).then(function (me) {
        var S = A.S(); S.profile = S.profile || {}; S.account = { phone: body.phone || '', id: (me.user || {}).public_id }; S.profile.name = (me.user || {}).name || S.profile.name;
        A.hydrate(me, true); S.account = { phone: body.phone || '', id: (me.user || {}).public_id }; A.save(); A.flush().catch(function () {}); location.hash = '#/home';
      }).catch(function (e) { A.busy(b, false); say(e.code === 'bad_code' ? 'รหัสไม่ถูกต้องหรือหมดอายุ ขอรหัสใหม่จากเจ้าหน้าที่' : e.code === 'phone_taken' ? 'เบอร์นี้ลงทะเบียนแล้ว ใช้เบอร์อื่นหรือเข้าสู่ระบบ' : errMsg(e)); });
    };
  }

  /* ---------------- ธ.ก.ส. checklist (checklist only) ---------------- */
  var BAAC = [
    ['id', 'บัตรประจำตัวประชาชนตัวจริง', 'ใช้ยืนยันตัวตนที่สาขา'],
    ['house', 'สำเนาทะเบียนบ้าน', 'ถ้าสาขากำหนด'],
    ['book', 'สมุดบัญชีเงินฝากหรือเลขที่บัญชี ธ.ก.ส.', 'ถ้ามีบัญชีอยู่แล้ว'],
    ['farmer', 'เอกสารทะเบียนเกษตรกร (ทบก.) หรือหลักฐานที่หน่วยงานเกษตรออกให้', 'ตรวจกับเกษตรตำบลว่าข้อมูลเป็นปัจจุบัน'],
    ['land', 'เอกสารสิทธิ์ที่ดินหรือสัญญาเช่า', 'ถ้าเช่า ให้เตรียมสัญญาเช่าหรือหนังสือยินยอมจากเจ้าของ'],
    ['plot', 'ข้อมูลแปลงนา: ชื่อแปลง จำนวนไร่ พันธุ์ข้าว วันปลูก ตำแหน่ง', 'ดูสรุปจากแอปด้านล่าง'],
    ['phone', 'โทรศัพท์มือถือที่ใช้เบอร์เดียวกับที่แจ้งไว้', 'เผื่อสาขาติดต่อกลับ']
  ];
  function baacPage() {
    var S = A.S(), done = S.baacCheck = S.baacCheck || {}, plots = S.plots || [];
    var rows = plots.length ? plots.map(function (p) {
      return '<tr><td>' + esc(p.name || 'แปลง') + '</td><td>' + esc(A.fmt(p.rai || 0)) + ' ไร่</td><td>' + esc(p.variety || '-') + '</td><td>' + esc(p.plotCode || '-') + '</td><td>' + (p.lat && p.lon ? 'มีตำแหน่ง' : 'ยังไม่มี') + '</td></tr>';
    }).join('') : '<tr><td colspan="5">ยังไม่มีแปลงในแอป</td></tr>';
    page('เอกสารที่ควรเตรียมก่อนไปสาขา', 'รายการเตรียมตัวเท่านั้น', '<div class="card w8card"><p class="w8note"><b>โปรดทราบ</b> หน้านี้เป็นเพียงรายการช่วยจำ แอปไม่ได้เชื่อมต่อกับ ธ.ก.ส. ไม่ตรวจและไม่ตัดสินสิทธิ์ใด ๆ สาขา ธ.ก.ส. เป็นผู้กำหนดเอกสารและตรวจสอบสิทธิ์ โปรดสอบถามสาขาก่อนเดินทาง</p></div>' +
      '<div class="card w8card"><h3>เตรียมให้ครบ</h3><ul class="w8chk">' + BAAC.map(function (r) { return '<li><label class="chk"><input type="checkbox" data-bk="' + r[0] + '"' + (done[r[0]] ? ' checked' : '') + '><span><b>' + r[1] + '</b><small>' + r[2] + '</small></span></label></li>'; }).join('') + '</ul>' +
      '<div class="w8prog" id="bprog"></div></div>' +
      '<div class="card w8card"><h3>ข้อมูลแปลงของท่านในแอป</h3><div class="w8scroll"><table class="t w8t"><tr><th>แปลง</th><th>พื้นที่</th><th>พันธุ์</th><th>รหัสแปลง</th><th>GPS</th></tr>' + rows + '</table></div></div>' +
      '<button class="btn ghost" onclick="window.print()" style="margin-top:6px">พิมพ์รายการนี้</button>');
    var upd = function () { var n = Object.keys(done).filter(function (k) { return done[k]; }).length; document.getElementById('bprog').textContent = 'เตรียมแล้ว ' + n + ' จาก ' + BAAC.length + ' รายการ'; };
    A.app.querySelectorAll('[data-bk]').forEach(function (c) { c.onchange = function () { done[c.dataset.bk] = c.checked; A.save(); upd(); }; }); upd();
  }

  /* ---------------- SRP tag + training hours ---------------- */
  function trainingRows() {
    var S = A.S(), L = A.lessons(), pass = (L && L.pass_score) || 70, log = S.training = S.training || {}, changed = false;
    ((L && L.lessons) || []).forEach(function (l) { if ((S.lessons || {})[l.id] >= pass && !log[l.id]) { log[l.id] = { min: l.minutes || 0, at: new Date().toISOString().slice(0, 10) }; changed = true; } });
    if (changed) A.save();
    return ((L && L.lessons) || []).filter(function (l) { return log[l.id]; }).map(function (l) { return { l: l, e: log[l.id] }; });
  }
  function trainingPage() {
    var rows = trainingRows(), tot = rows.reduce(function (a, r) { return a + (r.e.min || 0); }, 0);
    page('ชั่วโมงอบรมของฉัน', 'นับจากบทเรียนที่ผ่านแบบทดสอบ', '<div class="card w8card"><div class="w8big">' + Math.floor(tot / 60) + ' ชม. ' + (tot % 60) + ' นาที</div><p class="w8line">รวมจาก ' + rows.length + ' บทเรียนที่ผ่าน</p></div>' +
      '<div class="card w8card"><h3>บันทึกการเรียน</h3>' + (rows.length ? '<ul class="w8log">' + rows.map(function (r) { return '<li><b>' + esc(r.l.title) + '</b><small>' + thDate(r.e.at) + ' · ' + (r.e.min || 0) + ' นาที' + (r.l.srp ? ' · หัวข้อ SRP: ' + esc(r.l.srp) : '') + '</small></li>'; }).join('') + '</ul>' : '<p>ยังไม่มีบทเรียนที่ผ่าน ลองเรียนบทแรกได้ที่เมนู บทเรียน</p>') + '<a class="btn ghost" href="#/lessons" style="margin-top:8px">ไปที่บทเรียน</a></div>' +
      '<div class="card w8card"><p class="w8note">หัวข้อ SRP คือหัวข้อของหลักสูตรข้าวยั่งยืนที่บทเรียนนี้เกี่ยวข้อง ไม่ใช่หลักสูตรที่ได้รับรองจาก SRP และชั่วโมงที่นับเป็นเวลาเรียนโดยประมาณในแอป ไม่ใช่ใบรับรอง</p></div>');
  }
  function decorate(h) {
    var app = A.app, S = A.S();
    if (h === 'lessons' && !/id=/.test(location.hash) && A.lessons()) {
      var L = A.lessons().lessons, cards = app.querySelectorAll('a.lesson');
      cards.forEach(function (c, i) { var l = L[i]; if (l && l.srp && !c.querySelector('.srp')) c.insertAdjacentHTML('beforeend', '<span class="srp">หัวข้อ SRP (ข้าวยั่งยืน): ' + esc(l.srp) + '</span>'); });
      var tot = trainingRows().reduce(function (a, r) { return a + (r.e.min || 0); }, 0), sh = app.querySelector('.sheet');
      if (sh && !sh.querySelector('.w8hours')) sh.insertAdjacentHTML('beforeend', '<a class="card w8hours" href="#/training"><span><b>ชั่วโมงอบรมของฉัน</b><small>' + Math.floor(tot / 60) + ' ชม. ' + (tot % 60) + ' นาที · ดูบันทึกการเรียน</small></span><span aria-hidden="true">→</span></a>');
    }
    if ((h === 'home' || h === 'settings') && S.registered) {
      var sh2 = app.querySelector('.sheet') || app;
      if (!sh2.querySelector('.w8links')) sh2.insertAdjacentHTML('beforeend', '<div class="w8links"><h3>โครงการและเอกสาร</h3><a href="#/enrol"><b>เข้าร่วมโครงการ</b><small>เลือกรอบ ดูสถานะ บอกที่อยู่แปลง</small></a><a href="#/baac"><b>เอกสารที่ควรเตรียมก่อนไปสาขา</b><small>รายการช่วยจำสำหรับไป ธ.ก.ส.</small></a><a href="#/training"><b>ชั่วโมงอบรมของฉัน</b><small>บันทึกการเรียนจากบทเรียน</small></a></div>');
    }
    if (h === 'login') {
      var au = app.querySelector('.stepcard.auth');
      if (au && !au.querySelector('.w8alt')) au.insertAdjacentHTML('beforeend', '<div class="w8alt"><a href="#/claim">มีรหัสรับบัญชีจากเจ้าหน้าที่</a><a href="#/regpoint">สำหรับเจ้าหน้าที่จุดลงทะเบียน</a></div>');
    }
  }
  (window.RiceModules = window.RiceModules || []).push(function (app) {
    A = app; R = app.R; R.enrol = R_enrol; R.claim = claimPage; R.baac = baacPage; R.training = trainingPage; app.after(decorate);
  });
})();
