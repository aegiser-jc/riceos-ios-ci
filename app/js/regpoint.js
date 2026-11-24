/* RiceOS registration-point mode (route #/regpoint): staff (role registrar/admin) sign in, then for each farmer:
   consent on the tablet -> insert card and read (window.RiceIdReader) or type by hand -> confirm name + tambon/amphoe/province ->
   POST /api/admin/registration-point/register -> one-time claim code (+QR) for the farmer -> next farmer.
   PDPA: the ID number lives only in a closure variable between read and submit, is never rendered, never logged, and is wiped on submit/cancel/idle.
   After a registration only the last 4 digits (from the server) are shown. Plain JS. Registered through window.RiceModules. */
(function () {
  'use strict';
  var A = null, root = null, idleT = null, IDLE_MS = 180000;
  var st = { admin: null, cycles: [], cycle: '', recent: [], today: 0, pub: false, baac: false, age: false, idc: null, cur: null, result: null, err: '' };
  var cur = null; /* { id, name, tambon, amphoe, province, source } -- id never leaves this variable except in the POST body */

  function esc(s) { return A.esc(s); }
  /* staff sign-in inside the native wrapper: Bearer token (login with client:'native', no cookie); on web the cookie flow is unchanged */
  var isNative = function () { return !!window.Capacitor; };
  function bearer() { if (!isNative()) return null; try { return sessionStorage.getItem('riceos.admintok'); } catch (e) { return null; } }
  function setBearer(t) { try { t ? sessionStorage.setItem('riceos.admintok', t) : sessionStorage.removeItem('riceos.admintok'); } catch (e) {} }
  function areq(method, path, body) {
    var base = (A.api && A.api.base) || '', native = !!(A.api && A.api.native);
    var tok = bearer(), opt = { method: method, credentials: tok ? 'omit' : (native ? 'include' : 'same-origin'), headers: { 'X-RiceOS': '1' } };
    if (tok) opt.headers.Authorization = 'Bearer ' + tok;
    if (body !== undefined) { opt.headers['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
    return fetch(base + path, opt).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) {}
        if (!j) { var n = new Error('ติดต่อระบบไม่ได้ กรุณาตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่'); n.code = 'network'; throw n; }
        if (!r.ok) { var e = new Error(j.message_th || 'ทำรายการไม่สำเร็จ กรุณาลองใหม่'); e.code = j.error; e.status = r.status; e.data = j; throw e; }
        return j;
      });
    }, function () { var n = new Error('ติดต่อระบบไม่ได้ กรุณาตรวจสัญญาณอินเทอร์เน็ตแล้วลองใหม่'); n.code = 'network'; throw n; });
  }
  function validNid(s) { if (!/^\d{13}$/.test(s)) return false; var t = 0, i; for (i = 0; i < 12; i++) t += (s.charCodeAt(i) - 48) * (13 - i); return (11 - t % 11) % 10 === s.charCodeAt(12) - 48; }
  function wipe() { cur = null; st.cur = null; }
  function resetFlow() { wipe(); st.pub = false; st.baac = false; st.age = false; st.idc = null; st.result = null; st.err = ''; }
  function bump() { clearTimeout(idleT); idleT = setTimeout(function () { if (/^#\/regpoint/.test(location.hash) && st.admin) { resetFlow(); go('home'); } }, IDLE_MS); }
  var step = 'login';
  function go(s) { step = s; draw(); }

  /* ---------- screens ---------- */
  function bar() {
    return '<div class="rp-bar"><div class="rp-brand"><b>จุดลงทะเบียน</b><span>RiceOS</span></div>' + (st.admin ? '<div class="rp-who">เจ้าหน้าที่ ' + esc(st.admin.username) + ' <button class="rp-link" id="rpout">ออกจากระบบ</button></div>' : '<a class="rp-link" href="#/home">กลับหน้าแอป</a>') + '</div>';
  }
  function errBox() { return '<p class="rp-err" id="rperr" role="alert"' + (st.err ? '' : ' hidden') + '>' + esc(st.err) + '</p>'; }
  function setErr(m) { st.err = m || ''; var e = root.querySelector('#rperr'); if (e) { e.textContent = st.err; e.hidden = !st.err; } }

  function recentHtml() {
    var rows = st.recent.map(function (r) {
      return '<li><div><b>' + esc(r.name) + '</b><small>ต.' + esc(r.tambon) + ' อ.' + esc(r.amphoe) + ' จ.' + esc(r.province) + '</small></div><div class="rp-r2">' +
        (r.national_id && r.national_id.last4 ? '<small>เลขบัตรลงท้าย ' + esc(r.national_id.last4) + '</small>' : '<small>ไม่ได้เก็บเลขบัตร</small>') +
        (r.claimed ? '<span class="rp-pill ok">รับบัญชีแล้ว</span>' : '<button class="rp-link" data-reissue="' + esc(r.public_id) + '">ออกรหัสใหม่</button>') + '</div></li>';
    }).join('');
    return '<aside class="rp-side"><h2>ลงทะเบียนล่าสุด</h2><p class="rp-sub">วันนี้ ' + st.today + ' คน</p>' + (rows ? '<ul class="rp-list" id="rplist">' + rows + '</ul>' : '<p class="rp-empty">ยังไม่มีรายการ</p>') + '</aside>';
  }

  function screenLogin() {
    return '<div class="rp-panel rp-narrow"><h1>เข้าสู่ระบบเจ้าหน้าที่</h1><p class="rp-sub">สำหรับเจ้าหน้าที่ที่ได้รับสิทธิ์ลงทะเบียนเท่านั้น</p>' +
      '<label for="rpu">ชื่อผู้ใช้</label><input id="rpu" autocomplete="username" autocapitalize="none">' +
      '<label for="rpp">รหัสผ่าน</label><input id="rpp" type="password" autocomplete="current-password">' +
      '<label for="rpt">รหัสยืนยัน 6 หลักจากแอปยืนยันตัวตน</label><input id="rpt" inputmode="numeric" maxlength="7" autocomplete="one-time-code">' + errBox() +
      '<button class="rp-btn" id="rplogin">เข้าสู่ระบบ</button></div>';
  }
  function screenHome() {
    var cs = st.cycles, sel = cs.length > 1 ? '<label for="rpcy">รอบการเข้าร่วม</label><select id="rpcy">' + cs.map(function (c) { return '<option value="' + esc(c.code) + '"' + (c.code === st.cycle ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' : cs.length === 1 ? '<p class="rp-cycle">รอบ: <b>' + esc(cs[0].name) + '</b></p>' : '<p class="rp-err">ยังไม่มีรอบที่เปิดรับ กรุณาแจ้งผู้ดูแลระบบ</p>';
    return '<div class="rp-main"><div class="rp-panel rp-home"><h1>พร้อมลงทะเบียน</h1><p class="rp-sub">ลงทะเบียนเกษตรกรทีละคน ใช้เวลาประมาณ 2 นาที</p>' + sel + errBox() +
      '<button class="rp-btn big" id="rpnew"' + (cs.length ? '' : ' disabled') + '>เริ่มลงทะเบียนเกษตรกรคนต่อไป</button></div>' + recentHtml() + '</div>';
  }
  function screenConsent() {
    return '<div class="rp-panel rp-wide rp-consent"><div class="rp-hand">ส่งแท็บเล็ตให้เกษตรกรอ่านและกดเอง</div><h1>ขอความยินยอมใช้ข้อมูลของท่าน</h1>' +
      '<div class="rp-2col"><div>' + 
      '<h2>เราจะเก็บ</h2><ul><li>ชื่อและนามสกุล</li><li>ตำบล อำเภอ จังหวัด ที่อยู่ในบัตร</li><li>เลขบัตรประชาชน (ถ้าท่านยินยอม) เก็บแบบเข้ารหัส เจ้าหน้าที่มองไม่เห็นเลขเต็ม</li></ul><h2>เราจะไม่เก็บ</h2><ul><li>รูปบนบัตร</li><li>วันเดือนปีเกิด</li><li>เลขที่บ้านและหมู่</li></ul>' +
      '<h2>ใช้เพื่ออะไร</h2><p class="rp-p">ใช้ลงทะเบียนเข้าร่วมโครงการนาข้าว ติดตามแปลงนาและภารกิจ และยืนยันว่าท่านเป็นเกษตรกรตัวจริง ท่านถอนความยินยอมและขอลบข้อมูลได้ทุกเมื่อที่เมนู ตั้งค่า / ลบบัญชี</p>' +
      '</div><div>' +
      '<label class="rp-chk"><input type="checkbox" id="rpage"' + (st.age ? ' checked' : '') + '><span>ข้าพเจ้าอายุ 20 ปีขึ้นไป หรือมีผู้ปกครองยินยอมแล้ว <small>(จำเป็น)</small></span></label>' +
      '<label class="rp-chk"><input type="checkbox" id="rppub"' + (st.pub ? ' checked' : '') + '><span>ให้เกษตรกรในพื้นที่เดียวกันเห็นชื่อและคะแนนของฉันในอันดับคะแนน <small>(ไม่บังคับ)</small></span></label>' +
      '<label class="rp-chk"><input type="checkbox" id="rpbaac"' + (st.baac ? ' checked' : '') + '><span>บันทึกความสนใจเรื่อง ธ.ก.ส. ไว้สำหรับอนาคต <small>(ไม่บังคับ)</small></span></label>' +
      '<h2>เลขบัตรประชาชน</h2><div class="rp-choice"><button class="rp-opt" id="rpidy">ยินยอมให้อ่านและเก็บเลขบัตร<small>เสียบบัตรเข้าเครื่องอ่าน ระบบอ่านเฉพาะชื่อ เลขบัตร และตำบล อำเภอ จังหวัด</small></button>' +
      '<button class="rp-opt alt" id="rpidn">ไม่ยินยอม ลงทะเบียนโดยไม่เก็บเลขบัตร<small>พิมพ์ชื่อและที่อยู่เอง ยังเข้าร่วมโครงการได้เหมือนกัน</small></button></div>' + errBox() +
      '</div></div><button class="rp-link" id="rpcancel">ยกเลิก กลับหน้าแรก</button></div>';
  }
  function screenCard() {
    return '<div class="rp-panel rp-narrow rp-center"><div class="rp-card-ico" aria-hidden="true"><svg viewBox="0 0 64 44" fill="none" stroke="currentColor" stroke-width="3"><rect x="3" y="3" width="58" height="38" rx="6"/><rect x="10" y="12" width="12" height="10" rx="2"/><path d="M30 14h24M30 22h18M10 32h44"/></svg></div>' +
      '<h1>เสียบบัตรประชาชนในเครื่องอ่าน</h1><p class="rp-sub" id="rpcs">เสียบบัตรให้สุด หันชิปขึ้น แล้วกดอ่านบัตร</p>' + errBox() +
      '<button class="rp-btn big" id="rpread">อ่านบัตร</button><button class="rp-link" id="rpmanual">ไม่มีบัตรหรืออ่านไม่ได้ กรอกข้อมูลเอง</button><button class="rp-link" id="rpcancel">ยกเลิก กลับหน้าแรก</button></div>';
  }
  function screenManual() {
    var idf = st.idc ? '<label for="rpid">เลขบัตรประชาชน 13 หลัก <small>(พิมพ์เอง ไม่แสดงบนจอ)</small></label><input id="rpid" type="password" inputmode="numeric" maxlength="13" autocomplete="off">' : '';
    return '<div class="rp-panel rp-wide"><h1>กรอกข้อมูลเอง</h1><p class="rp-sub">' + (st.idc ? 'ให้เกษตรกรพิมพ์ข้อมูลเอง' : 'ลงทะเบียนโดยไม่เก็บเลขบัตร') + '</p>' +
      '<label for="rpnm">ชื่อและนามสกุล</label><input id="rpnm" maxlength="80" autocomplete="off">' + idf +
      '<div class="rp-grid3"><div><label for="rptb">ตำบล</label><input id="rptb" maxlength="80"></div><div><label for="rpam">อำเภอ</label><input id="rpam" maxlength="80"></div><div><label for="rppv">จังหวัด</label><input id="rppv" maxlength="80"></div></div>' + errBox() +
      '<button class="rp-btn" id="rpmnext">ต่อไป</button><button class="rp-link" id="rpcancel">ยกเลิก กลับหน้าแรก</button></div>';
  }
  function screenConfirm() {
    var c = cur || {};
    return '<div class="rp-panel rp-wide"><h1>ตรวจสอบข้อมูล</h1><p class="rp-sub">ข้อมูลนี้ถูกต้องใช่หรือไม่</p>' +
      '<div class="rp-big"><div class="rp-k">ชื่อ</div><div class="rp-v" id="rpvname">' + esc(c.name) + '</div><div class="rp-k">ตำบล / อำเภอ / จังหวัด</div><div class="rp-v" id="rpvarea">ต.' + esc(c.tambon) + ' อ.' + esc(c.amphoe) + ' จ.' + esc(c.province) + '</div></div>' +
      '<div class="rp-grid2"><div><label for="rpvl">หมู่บ้าน / หมู่ที่ <small>(ถ้ามี)</small></label><input id="rpvl" maxlength="80"></div><div><label for="rpph">เบอร์มือถือ <small>(ถ้ามี)</small></label><input id="rpph" inputmode="tel" maxlength="10"></div></div>' + errBox() +
      '<button class="rp-btn big" id="rpgo">ถูกต้อง ลงทะเบียน</button><button class="rp-link" id="rpredo">ไม่ถูกต้อง เริ่มใหม่</button></div>';
  }
  function fmtCode(c) { return String(c).replace(/^(.{4})(.+)$/, '$1-$2'); }
  function screenResult() {
    var r = st.result || {};
    return '<div class="rp-panel rp-wide rp-center"><div class="rp-ok" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div><h1>' + (r.name ? 'ลงทะเบียนแล้ว: ' + esc(r.name) : 'ออกรหัสใหม่แล้ว') + '</h1>' +
      (r.last4 ? '<p class="rp-sub">เลขบัตรบันทึกแล้ว ลงท้าย ' + esc(r.last4) + '</p>' : '') +
      '<p class="rp-sub">ให้เกษตรกรใช้รหัสนี้เพื่อตั้งรหัส PIN หรือเชื่อม LINE ในแอป RiceOS</p><div class="rp-codewrap"><div class="rp-code" id="rpcode" aria-label="รหัสรับบัญชี">' + esc(fmtCode(r.code)) + '</div>' +
      '<div class="rp-qr" id="rpqr" aria-label="รหัส QR สำหรับรับบัญชี"></div></div><p class="rp-sub">ใช้ได้ครั้งเดียว หมดอายุวันที่ ' + esc((function (d) { return isNaN(d) ? (r.exp || '').slice(0, 10) : d.toLocaleDateString('th-TH', { timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', year: 'numeric' }); })(new Date(r.exp || ''))) + ' ให้จดรหัสหรือถ่ายรูปก่อนกดปุ่มด้านล่าง รหัสจะไม่แสดงอีก</p>' +
      '<button class="rp-btn big" id="rpnext">เสร็จแล้ว คนถัดไป</button></div>';
  }

  /* ---------- wiring ---------- */
  function draw() {
    if (!root) return; bump();
    var body = step === 'login' ? screenLogin() : step === 'home' ? screenHome() : step === 'consent' ? screenConsent() : step === 'card' ? screenCard() : step === 'manual' ? screenManual() : step === 'confirm' ? screenConfirm() : screenResult();
    root.innerHTML = bar() + (step === 'home' ? body : '<div class="rp-main one">' + body + '</div>');
    var $ = function (id) { return root.querySelector('#' + id); }, on = function (id, f) { var e = $(id); if (e) e.onclick = f; };
    on('rpout', function () { areq('POST', '/api/admin/logout', {}).catch(function () {}).then(function () { setBearer(null); resetFlow(); st.admin = null; st.recent = []; go('login'); }); });
    on('rpcancel', function () { resetFlow(); loadHome(); });
    if (step === 'login') {
      var doLogin = function () {
        var b = $('rplogin'); b.disabled = true; setErr('');
        areq('POST', '/api/admin/login', Object.assign({ username: $('rpu').value.trim(), password: $('rpp').value, totp: $('rpt').value.replace(/\s/g, '') }, isNative() ? { client: 'native' } : {})).then(function (j) {
          if (isNative() && j.token) setBearer(j.token);
          if (['registrar', 'admin'].indexOf(j.admin.role) < 0) { areq('POST', '/api/admin/logout', {}).catch(function () {}); b.disabled = false; return setErr('บัญชีนี้ไม่มีสิทธิ์ลงทะเบียนเกษตรกร ใช้บัญชีเจ้าหน้าที่จุดลงทะเบียน'); }
          st.admin = j.admin; loadHome();
        }, function (e) { b.disabled = false; setErr(e.code === 'bad_credentials' ? 'ชื่อผู้ใช้ รหัสผ่าน หรือรหัสยืนยันไม่ถูกต้อง รหัสยืนยันใช้ซ้ำไม่ได้ รอรหัสใหม่ประมาณ 30 วินาที' : e.message); });
      };
      on('rplogin', doLogin); root.querySelectorAll('input').forEach(function (i) { i.onkeydown = function (ev) { if (ev.key === 'Enter') doLogin(); }; });
    } else if (step === 'home') {
      var cy = $('rpcy'); if (cy) cy.onchange = function () { st.cycle = cy.value; };
      on('rpnew', function () { resetFlow(); go('consent'); });
      root.querySelectorAll('[data-reissue]').forEach(function (b) { b.onclick = function () {
        b.disabled = true;
        areq('POST', '/api/admin/registration-point/users/' + encodeURIComponent(b.dataset.reissue) + '/claim-code', {}).then(function (j) { st.result = { code: j.claim_code, exp: j.claim_expires_at }; go('result'); }, function (e) { b.disabled = false; setErr(e.message); });
      }; });
    } else if (step === 'consent') {
      var pick = function (idc) {
        if (!$('rpage').checked) return setErr('กรุณากดเลือกช่องยืนยันอายุก่อน');
        st.age = true; st.pub = $('rppub').checked; st.baac = $('rpbaac').checked; st.idc = idc; setErr('');
        if (idc) enterCard(); else go('manual');
      };
      on('rpidy', function () { pick(true); }); on('rpidn', function () { pick(false); });
    } else if (step === 'card') {
      on('rpread', readNow); on('rpmanual', function () { go('manual'); });
      if (window.RICEOS_DEBUG === true && window.RiceIdReader) window.RiceIdReader.enableSimulator(true).catch(function () {});
      if (window.RiceIdReader) window.RiceIdReader.isAvailable().then(function (ok) { var e = $('rpcs'); if (e && !ok) e.textContent = 'ยังไม่พบเครื่องอ่านบัตรที่ต่อกับแท็บเล็ต ต่อเครื่องอ่านบัตรเข้ากับแท็บเล็ตด้วยสาย USB แล้วกดอ่านบัตร หรือเลือกกรอกข้อมูลเอง'; });
    } else if (step === 'manual') {
      on('rpmnext', function () {
        var nm = $('rpnm').value.trim().replace(/\s+/g, ' '), tb = $('rptb').value.trim(), am = $('rpam').value.trim(), pv = $('rppv').value.trim(), idv = $('rpid') ? $('rpid').value.replace(/\D/g, '') : '';
        if (!nm) return setErr('กรุณากรอกชื่อและนามสกุล'); if (!tb || !am || !pv) return setErr('กรุณากรอกตำบล อำเภอ และจังหวัดให้ครบ');
        if ($('rpid') && !validNid(idv)) return setErr('เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจเลข 13 หลักอีกครั้ง');
        cur = { id: $('rpid') ? idv : '', name: nm, tambon: tb, amphoe: am, province: pv, source: 'manual' }; if ($('rpid')) $('rpid').value = ''; go('confirm');
      });
    } else if (step === 'confirm') {
      on('rpredo', function () { wipe(); go(st.idc ? 'card' : 'manual'); if (st.idc) enterCard(); });
      on('rpgo', submit);
    } else if (step === 'result') {
      var q = $('rpqr'), r = st.result || {};
      if (q && window.qrcode && r.code) { try { var z = qrcode(0, 'M'); z.addData(r.code); z.make(); q.innerHTML = z.createSvgTag({ cellSize: 4, margin: 2, scalable: true }); } catch (e) { q.remove(); } } else if (q) q.remove();
      on('rpnext', function () { resetFlow(); loadHome(); });
    }
  }
  function enterCard() { go('card'); }
  var MSG = { NO_READER: 'ไม่พบเครื่องอ่านบัตร ตรวจสายและเสียบเครื่องอ่านให้แน่น แล้วลองใหม่', NO_CARD: 'ไม่พบบัตรในเครื่องอ่าน เสียบบัตรให้สุด หันชิปขึ้น แล้วลองใหม่', PERMISSION_DENIED: 'แท็บเล็ตยังไม่อนุญาตให้ใช้เครื่องอ่านบัตร กด อนุญาต เมื่อมีหน้าต่างถาม แล้วลองใหม่', READ_FAILED: 'อ่านบัตรไม่สำเร็จ ลองเสียบบัตรใหม่ หรือเลือกกรอกข้อมูลเอง' };
  function readNow() {
    var b = root.querySelector('#rpread'), R = window.RiceIdReader; if (!R) return setErr(MSG.NO_READER);
    b.disabled = true; b.textContent = 'กำลังอ่านบัตร... อย่าดึงบัตรออก'; setErr('');
    R.requestPermission().then(function () { return R.readCard(); }).then(function (r) {
      var id = String(r.idNumber || ''), name = [r.firstNameTh, r.lastNameTh].filter(Boolean).join(' ').trim();
      if (!validNid(id) || !name || !r.tambon || !r.amphoe || !r.province) { var e = new Error('x'); e.code = 'READ_FAILED'; throw e; }
      cur = { id: id, name: name, tambon: r.tambon, amphoe: r.amphoe, province: r.province, source: 'card_read' }; r = null; go('confirm');
    }).catch(function (e) { b.disabled = false; b.textContent = 'อ่านบัตรอีกครั้ง'; setErr(MSG[e && e.code] || MSG.READ_FAILED); });
  }
  function submit() {
    var b = root.querySelector('#rpgo'), c = cur; if (!c) return go('home');
    var ph = root.querySelector('#rpph').value.replace(/\D/g, ''), vl = root.querySelector('#rpvl').value.trim();
    if (ph && !/^0\d{9}$/.test(ph)) return setErr('เบอร์มือถือต้องเป็นตัวเลข 10 หลัก หรือเว้นว่างไว้');
    var body = { name: c.name, source: c.source, cycle: st.cycle || undefined, province: c.province, amphoe: c.amphoe, tambon: c.tambon,
      consent: { version: (A.api && A.api.consentVer ? A.api.consentVer() : 'c4'), core: true, age_guardian: true, public_rank: st.pub, baac: st.baac } };
    if (vl) body.village = vl; if (ph) body.phone = ph;
    if (st.idc && c.id) { body.national_id = c.id; body.consent.national_id = true; }
    b.disabled = true; b.textContent = 'กำลังลงทะเบียน...'; setErr('');
    areq('POST', '/api/admin/registration-point/register', body).then(function (j) {
      body = null; wipe(); /* the ID number is gone from memory as soon as the server answers */
      var n = (j.user && j.user.national_id) || {};
      st.result = { name: j.user && j.user.name, code: j.claim_code, exp: j.claim_expires_at, last4: n.last4 || '' }; go('result');
    }, function (e) {
      b.disabled = false; b.textContent = 'ถูกต้อง ลงทะเบียน';
      setErr(e.code === 'national_id_taken' ? 'เลขบัตรนี้ลงทะเบียนไว้แล้ว ไม่ต้องลงทะเบียนซ้ำ หากเกษตรกรลืมรหัส ให้ออกรหัสใหม่จากรายการล่าสุด' : e.code === 'phone_taken' ? 'เบอร์มือถือนี้ใช้ลงทะเบียนแล้ว ลบเบอร์ออกหรือใช้เบอร์อื่น' : e.status === 401 ? 'หมดเวลาเข้าสู่ระบบ กรุณาเข้าสู่ระบบใหม่' : e.message);
      if (e.status === 401) { st.admin = null; wipe(); setTimeout(function () { go('login'); }, 1500); }
    });
  }
  function loadHome() {
    Promise.all([areq('GET', '/api/admin/registration-point/recent'), areq('GET', '/api/cycles')]).then(function (r) {
      st.recent = r[0].registrations || []; st.today = r[0].today_utc || 0; st.cycles = r[1].cycles || [];
      if (!st.cycles.some(function (c) { return c.code === st.cycle; })) st.cycle = st.cycles[0] ? st.cycles[0].code : '';
      go('home');
    }, function (e) { if (e.status === 401) { st.admin = null; return go('login'); } st.err = e.message; go('home'); });
  }

  function view() {
    root = A.app; document.body.classList.add('rp-mode'); A.app.innerHTML = '<div class="rp"><p class="rp-sub" style="padding:24px">กำลังเปิด...</p></div>'; root = A.app.firstChild;
    areq('GET', '/api/admin/me').then(function (j) { if (['registrar', 'admin'].indexOf(j.admin.role) >= 0) { st.admin = j.admin; loadHome(); } else go('login'); }, function () { go('login'); });
  }
  window.addEventListener('hashchange', function () { if (!/^#\/regpoint/.test(location.hash)) { document.body.classList.remove('rp-mode'); wipe(); clearTimeout(idleT); } });
  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; app.R.regpoint = view; });
})();
