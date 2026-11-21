/* ตรวจเช็คแปลงรายวัน (PingEris 20 Nov): first item on home, every day; #/dailycheck is a checklist for today's date (Bangkok) and the active plot.
   Stored ONLY on this phone under its own key riceos.next.dailycheck.v1 = { v:1, o:{ <owner>:{ <plot>:{ <YYYY-MM-DD>:entry } } } }.
   Never reads, writes or clears riceos.v1 (shared with the root app). No network. Logout / account delete remove this key with the other personal keys. */
(function () {
  'use strict';
  var KEY = 'riceos.next.dailycheck.v1', KEEP_DAYS = 120, HIST = 7, A;
  var esc = function (s) { return A.esc(s); };
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  /* the checklist, wording verbatim from the request. t = option has a text box; unit = text after the box. One answer per topic. */
  var GROUPS = [
    { k: 'water', h: 'น้ำในแปลง', o: [{ v: 'level', l: 'ระดับน้ำเทียบผิวดิน:', t: 'num', unit: 'ซม.' }, { v: 'notmeasured', l: 'ไม่ได้วัด' }] },
    { k: 'plant', h: 'ต้นข้าว', o: [{ v: 'normal', l: 'ปกติ' }, { v: 'abnormal', l: 'ผิดปกติ', t: 'text' }] },
    { k: 'pest', h: 'โรค แมลง วัชพืช', o: [{ v: 'none', l: 'ไม่พบปัญหา' }, { v: 'found', l: 'พบปัญหา', t: 'text' }] },
    { k: 'levee', h: 'คันนาและทางน้ำ', o: [{ v: 'normal', l: 'ปกติ' }, { v: 'leak', l: 'รั่วหรืออุดตัน', t: 'text' }] },
    { k: 'weather', h: 'สภาพอากาศ', o: [{ v: 'rain', l: 'มีฝน' }, { v: 'norain', l: 'ไม่มีฝน' }, { v: 'other', l: 'อื่นๆ', t: 'text' }] }
  ];

  /* ---------- storage (own key only, every access guarded) ---------- */
  function readAll() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.v === 1 && j.o && typeof j.o === 'object' ? j : { v: 1, o: {} }; } catch (e) { return { v: 1, o: {} }; } }
  function writeAll(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function owner() { var a = (A.S() || {}).account || {}; return String(a.id || a.phone || 'local'); }
  function plotKey(p) { return p ? String(p.pid || p.id || p.code || 'plot') : ''; }
  function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); } /* Bangkok calendar day, whatever the phone's zone */
  function thDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + TH_MON[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  function plotDays(p) { var o = readAll().o[owner()] || {}; return o[plotKey(p)] || {}; }
  function getEntry(p, day) { return plotDays(p)[day] || null; }
  function putEntry(p, day, e) {
    var d = readAll(), ow = owner(), pk = plotKey(p);
    d.o[ow] = d.o[ow] || {}; d.o[ow][pk] = d.o[ow][pk] || {}; d.o[ow][pk][day] = e;
    var cut = new Date(Date.parse(day + 'T00:00:00Z') - KEEP_DAYS * 864e5).toISOString().slice(0, 10); /* keep about 4 months per plot */
    Object.keys(d.o[ow][pk]).forEach(function (k) { if (k < cut) delete d.o[ow][pk][k]; });
    return writeAll(d);
  }
  function progText(e) { return 'ตอบแล้ว ' + answered(e) + ' จาก ' + GROUPS.length + ' หัวข้อ'; }
  function answered(e) { return e ? GROUPS.filter(function (g) { return e[g.k] && e[g.k].c; }).length : 0; }

  /* ---------- home entry: first child of the sheet, above everything ---------- */
  function decorate(h) {
    if (h !== 'home') return;
    var app = A.app, sh = app.querySelector('.sheet'); if (!sh || app.querySelector('.dc-home')) return;
    var p = A.P(), e = p ? getEntry(p, today()) : null, n = answered(e);
    var st = !p ? 'เพิ่มแปลงก่อน แล้วตรวจได้ทุกวัน' : e ? 'บันทึกแล้ววันนี้ · ตอบ ' + n + ' จาก ' + GROUPS.length + ' หัวข้อ' : 'ยังไม่ได้ตรวจวันนี้ · ' + GROUPS.length + ' หัวข้อ';
    sh.insertAdjacentHTML('afterbegin', '<a class="dc-home' + (e ? ' done' : '') + '" id="dchome" href="#/dailycheck">' +
      '<span class="dc-ico" aria-hidden="true">' + RiceIco(e ? 'check' : 'clip') + '</span>' +
      '<span class="dc-txt"><b>ตรวจเช็คแปลงรายวัน</b><small class="dc-date">วันนี้ ' + thDay(today()) + (p && p.name ? ' · ' + esc(p.name) : '') + '</small><small class="dc-st">' + st + '</small></span>' +
      '<span class="dc-go">' + (e ? 'ดู / แก้ไข' : 'เริ่มตรวจ') + '<i aria-hidden="true">›</i></span></a>');
  }

  /* ---------- #/dailycheck ---------- */
  function optHtml(g, o, cur) {
    var c = cur && cur.c === o.v, id = 'dc-' + g.k + '-' + o.v, txt = c ? (cur.x || '') : '';
    var box = '';
    if (o.t === 'num') box = '<span class="dc-numrow"><input class="dc-x dc-num" id="' + id + '-x" data-for="' + id + '" type="text" inputmode="text" autocomplete="off" maxlength="6" placeholder="เช่น 5" aria-label="ระดับน้ำเทียบผิวดิน หน่วยเซนติเมตร" value="' + esc(txt) + '"><span class="dc-unit">' + esc(o.unit) + '</span></span><small class="dc-numhint"><span>น้ำท่วมผิวดิน ใส่ตัวเลขปกติ เช่น <b class="dc-ex">5</b></span><span>น้ำพอดีผิวดิน ใส่ <b class="dc-ex">0</b></span><span>น้ำอยู่ใต้ผิวดิน ใส่ลบ เช่น <b class="dc-ex neg">-10</b></span></small>';
    else if (o.t) box = '<textarea class="dc-x" id="' + id + '-x" data-for="' + id + '" rows="2" autocomplete="off" maxlength="200" placeholder="อธิบาย เช่น จุดไหน มากน้อยแค่ไหน" aria-label="' + esc(o.l) + ' อธิบาย">' + esc(txt) + '</textarea>';
    return '<div class="dc-opt' + (c ? ' on' : '') + (o.t ? ' hasx' : '') + (o.t === 'num' ? ' isnum' : '') + '"><label class="dc-chk" for="' + id + '"><input type="checkbox" id="' + id + '" name="' + g.k + '" value="' + o.v + '"' + (c ? ' checked' : '') + '><span>' + esc(o.l) + (o.t === 'text' ? ' อธิบาย' : '') + '</span></label>' + box + '</div>';
  }
  function histHtml(p, day) {
    var days = plotDays(p), ks = Object.keys(days).filter(function (k) { return k < day; }).sort().reverse().slice(0, HIST);
    if (!ks.length) return '';
    return '<section class="card dc-hist" aria-label="ย้อนหลัง"><h2>ย้อนหลัง ' + ks.length + ' วันล่าสุด</h2><ul>' + ks.map(function (k) {
      var e = days[k];
      return '<li><b>' + thDay(k) + '</b><span>' + GROUPS.map(function (g) {
        var a = e[g.k], o = a && g.o.filter(function (x) { return x.v === a.c; })[0];
        if (!o) return '';
        var bad = /abnormal|found|leak/.test(o.v);
        return '<i class="' + (bad ? 'bad' : '') + '">' + esc(g.h) + ': ' + esc(o.l.replace(/:$/, '')) + (a.x ? ' ' + esc(a.x) + (o.unit ? ' ' + esc(o.unit) : '') : '') + '</i>';
      }).join('') + '</span></li>';
    }).join('') + '</ul></section>';
  }
  function screen() {
    var S = A.S(), plots = S.plots || [], want = (/[?&]plot=([^&]+)/.exec(location.hash) || [])[1], day = today();
    var p = plots.filter(function (x) { return want && String(x.id) === decodeURIComponent(want); })[0] || A.P(); /* chosen plot lives in the URL: never written to riceos.v1 */
    var head = A.header() + '<div class="sheet dc-sheet">' + A.titleRow('ตรวจเช็คแปลงรายวัน', 'วันนี้ ' + thDay(day) + (p ? ' · ' + esc(p.name || ('แปลง ' + (p.code || ''))) : ''));
    if (!p) {
      A.app.innerHTML = head + '<div class="card dc-empty"><p class="big">ยังไม่มีแปลง เพิ่มแปลงก่อน แล้วกลับมาตรวจเช็คได้ทุกวัน</p><a class="btn" href="#/plotedit?new=1">เพิ่มแปลง</a></div></div>';
      return;
    }
    var e = getEntry(p, day) || {};
    var sw = plots.length > 1 ? '<div class="plotsw" role="tablist" aria-label="เลือกแปลง">' + plots.map(function (x) { return '<button type="button" data-pl="' + esc(x.id) + '" class="' + (x === p ? 'on' : '') + '"><b>' + esc(x.name || ('แปลง ' + x.code)) + '</b><small>' + A.fmt(x.rai) + ' ไร่</small></button>'; }).join('') + '</div>' : '';
    A.app.innerHTML = head + sw +
      '<div class="dc-saved" id="dcsaved" role="status" aria-live="polite"' + (e.at ? '' : ' hidden') + '>' + savedLine(e) + '</div>' +
      '<form class="dc-form" id="dcform" novalidate><div class="dc-hrow"><h2 class="dc-h">รายการสิ่งที่ตรวจ</h2><span class="dc-prog" id="dcprog">' + progText(e) + '</span></div>' +
      GROUPS.map(function (g, i) { return '<fieldset class="card dc-g" data-g="' + g.k + '"><legend><span class="dc-n">' + (i + 1) + '</span>' + esc(g.h) + '<small class="dc-one">เลือก 1 ข้อ</small></legend>' + g.o.map(function (o) { return optHtml(g, o, e[g.k]); }).join('') + '</fieldset>'; }).join('') +
      '<p class="dc-err" id="dcerr" role="alert" hidden></p>' +
      '<div class="dc-bar"><span class="dc-bst" id="dcbst"></span><button class="btn dc-save" id="dcsave" type="submit" aria-describedby="dcbst">' + RiceIco('check') + (e.at ? ' บันทึกการแก้ไข' : ' บันทึก') + '</button></div>' +
      '<p class="hint dc-note"><span>แก้ไขได้ตลอดวันนี้</span> <span>พรุ่งนี้จะเริ่มรายการใหม่</span></p></form>' +
      histHtml(p, day) + '</div>';
    wire(p, day);
  }
  /* r12: --dc-bar = the real Save-row height, so the space kept free under the form (phone: #app height, PC: sheet padding + scroll margins)
     always matches the bar, whatever its status text wraps to */
  function fitBar(f) {
    var b = f.querySelector('.dc-bar'); if (!b) return;
    function fit() { if (!document.body.contains(b)) { if (ro) ro.disconnect(); return; } document.body.style.setProperty('--dc-bar', Math.ceil(b.getBoundingClientRect().height) + 'px'); }
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(b); fit();
  }
  function savedLine(e) {
    if (!e || !e.at) return '';
    var t = new Date(Date.parse(e.at) + 7 * 36e5).toISOString().slice(11, 16);
    return RiceIco('check') + '<span><b>บันทึกแล้ว</b><span class="dc-tm"> เวลา ' + t + ' น.</span><small>แก้ไขได้ตลอดวันนี้</small></span>';
  }
  function wire(p, day) {
    var f = document.getElementById('dcform'), err = document.getElementById('dcerr'), saved = document.getElementById('dcsaved'), last = getEntry(p, day), dirty = false;
    /* r7: the fixed Save row carries the state next to the button (existing wording); Save looks inactive when there is nothing it would save:
       no topic answered (the form needs at least 1) or nothing changed since the last save. It stays tappable so the reason can be shown. */
    function bar() {
      var n = f.querySelectorAll('.dc-g input[type=checkbox]:checked').length, st = document.getElementById('dcbst'), b = document.getElementById('dcsave');
      var k = !n ? 'need' : dirty ? 'stale' : last && last.at ? 'ok' : 'need';
      st.dataset.k = k;
      /* r9: each phrase is one unbreakable span, so a wrapped status never splits mid-phrase (same wording, same textContent) */
      var tm = last && last.at ? new Date(Date.parse(last.at) + 7 * 36e5).toISOString().slice(11, 16) + '\u00a0น.' : '';
      /* r12: PC banner carries the bold unsaved status, so the PC Save row shows other facts while unsaved (last save time / answered count);
         the hidden variant is display:none, so it is left out of the button's description. The device note sits under the status, next to Save. */
      st.innerHTML = (k === 'need' ? '<span>เลือกอย่างน้อย</span> <span>1\u00a0หัวข้อ</span><span>ก่อนบันทึก</span>' : k === 'ok' ? '<span>บันทึกแล้ว</span> <span class="dc-tmv">เวลา ' + tm + '</span>' :
        '<i class="dc-ph">' + (last && last.at ? '<span>มีการแก้ไข</span> <span>ยังไม่ได้บันทึก</span>' : '<span>ยังไม่ได้บันทึก</span>') + '</i><i class="dc-pc">' + (last && last.at ? '<span>บันทึกล่าสุด</span> <span>เวลา ' + tm + '</span>' : '<span>ตอบแล้ว ' + n + ' จาก 5 หัวข้อ</span>') + '</i>') +
        '<small class="dc-dev">บันทึกไว้ในเครื่องนี้</small>';
      b.classList.toggle('idle', k !== 'stale');
    }
    bar(); fitBar(f);
    saved.addEventListener('click', function (ev) { /* amber banner: jump to the Save button */
      if (!ev.target.closest('.dc-jump')) return; var b = document.getElementById('dcsave'); b.scrollIntoView({ block: 'center', behavior: 'smooth' }); try { b.focus({ preventScroll: true }); } catch (e) { b.focus(); }
    });
    document.querySelectorAll('.dc-sheet .plotsw [data-pl]').forEach(function (b) { b.onclick = function () { if (b.classList.contains('on')) return; location.replace('#/dailycheck?plot=' + encodeURIComponent(b.dataset.pl)); }; });
    function sync(g) { /* one answer per topic: ticking one unticks the others; the row of the ticked answer is highlighted */
      f.querySelectorAll('input[type=checkbox][name="' + g + '"]').forEach(function (c) { c.closest('.dc-opt').classList.toggle('on', c.checked); });
    }
    function changed() { err.hidden = true; if (!saved.classList.contains('stale')) { var first = saved.hidden; saved.classList.add('stale'); saved.hidden = false; saved.innerHTML = RiceIco('clip') + '<span><b>' + (first ? 'ยังไม่ได้บันทึก' : 'มีการแก้ไข ยังไม่ได้บันทึก') + '</b><small>กดปุ่ม ' + (first ? 'บันทึก' : 'บันทึกการแก้ไข') + ' ด้านล่าง</small></span>'; /* r6: Save sits in its own always-visible row, so no jump button */ } var n = f.querySelectorAll('.dc-g input[type=checkbox]:checked').length; document.getElementById('dcprog').textContent = 'ตอบแล้ว ' + n + ' จาก ' + GROUPS.length + ' หัวข้อ'; dirty = true; bar(); }
    f.addEventListener('change', function (ev) {
      var c = ev.target; if (c.type !== 'checkbox') return;
      if (c.checked) f.querySelectorAll('input[type=checkbox][name="' + c.name + '"]').forEach(function (o) { if (o !== c) o.checked = false; });
      sync(c.name); changed();
      var x = document.getElementById(c.id + '-x'); if (c.checked && x && !x.value) setTimeout(function () { x.focus(); }, 0); /* the box shows once its option is ticked */
    });
    f.addEventListener('input', function (ev) {
      var x = ev.target; if (!x.classList.contains('dc-x')) return;
      var c = document.getElementById(x.dataset.for);
      if (x.value.trim() && !c.checked) { c.checked = true; f.querySelectorAll('input[type=checkbox][name="' + c.name + '"]').forEach(function (o) { if (o !== c) o.checked = false; }); sync(c.name); }
      changed();
    });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!dirty && last && last.at) { A.toast('บันทึกแล้ว'); return; } /* nothing changed since the last save */
      var e = {}, bad = '';
      GROUPS.forEach(function (g) {
        var c = f.querySelector('input[type=checkbox][name="' + g.k + '"]:checked'); if (!c) return;
        var a = { c: c.value }, x = document.getElementById(c.id + '-x');
        if (x) {
          var v = x.value.trim().replace(/\s+/g, ' ');
          if (x.classList.contains('dc-num')) {
            v = v.replace(/[−–]/g, '-').replace(',', '.').replace(/[๐-๙]/g, function (d) { return String(d.charCodeAt(0) - 0x0E50); });
            if (v && !(/^[+-]?\d{1,3}(\.\d)?$/.test(v) && Math.abs(+v) <= 200)) bad = bad || 'ระดับน้ำ: กรอกเป็นตัวเลขเซนติเมตร เช่น 5 หรือ -10 (น้ำอยู่ใต้ผิวดินใส่ลบ)';
            if (v) v = String(+v);
          }
          if (v) a.x = v.slice(0, 200);
        }
        e[g.k] = a;
      });
      if (bad) return showErr(bad);
      if (!answered(e)) return showErr('เลือกอย่างน้อย 1 หัวข้อก่อนบันทึก');
      e.at = new Date().toISOString();
      if (!putEntry(p, day, e)) return showErr('บันทึกไม่ได้: พื้นที่ในเครื่องเต็ม หรือเครื่องไม่อนุญาตให้บันทึก');
      saved.innerHTML = savedLine(e); saved.hidden = false; saved.classList.remove('stale'); last = e; dirty = false; bar();
      document.getElementById('dcsave').innerHTML = RiceIco('check') + ' บันทึกการแก้ไข';
      A.toast('บันทึกแล้ว');
      saved.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    function showErr(m) { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'center' }); return false; }
  }

  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; app.R.dailycheck = screen; app.after(decorate); });
})();
