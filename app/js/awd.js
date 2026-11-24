/* ตรวจเช็คแปลงเมื่อถึงกำหนดตามแผน เปียกสลับแห้ง (AWD, PingEris 20 Nov): a menu on the plot page (#/plot) opens #/awd, a form
   "วันนี้ทำอะไร ใช้เท่าไร จ่ายเท่าไร" for the chosen plot and today's Bangkok date. Done when the plan says, not every day.
   Stored ONLY on this phone under its own key riceos.next.awd.v1 = { v:1, o:{ <owner>:{ <plot>:{ <YYYY-MM-DD>:{ do:[codes], items:[{n,q,u}], cost, at } } } } }.
   Never reads, writes or clears riceos.v1; not in any API body; no network. Logout / account delete remove this key with the other personal keys. */
(function () {
  'use strict';
  var KEY = 'riceos.next.awd.v1', KEEP = 60, HIST = 5, MAXI = 10, A;
  var esc = function (s) { return A.esc(s); };
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  var TITLE = 'ตรวจเช็คแปลงเมื่อถึงกำหนดตามแผน เปียกสลับแห้ง';
  /* wording verbatim from the request; several may be ticked */
  var DO = [['water', 'ให้น้ำ'], ['drain', 'ระบายน้ำ'], ['fert', 'ใส่ปุ๋ย'], ['microbe', 'ใช้จุลินทรีย์ตามแผน'], ['pest', 'จัดการโรค แมลง หรือวัชพืช'], ['levee', 'ซ่อมคันนา'], ['straw', 'จัดการฟางโดยไม่เผา']];

  /* ---------- storage (own key only, every access guarded) ---------- */
  function readAll() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.v === 1 && j.o && typeof j.o === 'object' ? j : { v: 1, o: {} }; } catch (e) { return { v: 1, o: {} }; } }
  function writeAll(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function owner() { var a = (A.S() || {}).account || {}; return String(a.id || a.phone || 'local'); }
  function plotKey(p) { return p ? String(p.pid || p.id || p.code || 'plot') : ''; }
  function today() { return new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); } /* Bangkok calendar day */
  function thDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + TH_MON[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  /* r12: --dc-bar = the real Save-row height, so the space kept free under the form (phone: #app height, PC: sheet padding + scroll margins)
     always matches the bar, whatever its status text wraps to */
  function fitBar(f) {
    var b = f.querySelector('.dc-bar'); if (!b) return;
    function fit() { if (!document.body.contains(b)) { if (ro) ro.disconnect(); return; } document.body.style.setProperty('--dc-bar', Math.ceil(b.getBoundingClientRect().height) + 'px'); }
    var ro = window.ResizeObserver ? new ResizeObserver(fit) : null; if (ro) ro.observe(b); fit();
  }
  function hhmm(at) { return new Date(Date.parse(at) + 7 * 36e5).toISOString().slice(11, 16); }
  function plotDays(p) { try { var o = readAll().o[owner()] || {}; return o[plotKey(p)] || {}; } catch (e) { return {}; } }
  function putEntry(p, day, e) {
    try {
      var d = readAll(), ow = owner(), pk = plotKey(p);
      d.o[ow] = d.o[ow] || {}; d.o[ow][pk] = d.o[ow][pk] || {}; d.o[ow][pk][day] = e;
      Object.keys(d.o[ow][pk]).sort().reverse().slice(KEEP).forEach(function (k) { delete d.o[ow][pk][k]; }); /* keep the latest 60 records per plot */
      return writeAll(d);
    } catch (x) { return false; }
  }
  function doLabel(c) { var r = DO.filter(function (x) { return x[0] === c; })[0]; return r ? r[1] : ''; }
  function money(v) { var n = Number(v); return isFinite(n) ? n.toLocaleString('en-US', { maximumFractionDigits: 2 }) : esc(v); }
  function num(v) { return String(v || '').trim().replace(/[๐-๙]/g, function (d) { return String(d.charCodeAt(0) - 0x0E50); }).replace(/,/g, '').replace(/\s+/g, ''); }

  /* ---------- plot page: the menu sits under the plot name (and plot switcher) ---------- */
  function decorate(h) {
    if (h !== 'plot') return;
    var app = A.app, sh = app.querySelector('.sheet'), p = A.P(); if (!sh || !p || app.querySelector('.aw-menu')) return;
    var at = sh.querySelector(':scope>.plotsw') || sh.querySelector(':scope>.titlerow'); if (!at) return;
    var days = plotDays(p), last = Object.keys(days).sort().pop(), e = last ? days[last] : null, done = last === today();
    var st = e ? 'บันทึกล่าสุด ' + thDay(last) + ((e.do || []).length ? '\nทำ: ' + (e.do || []).map(doLabel).filter(Boolean).join(', ') : '') : 'ยังไม่มีบันทึก'; /* r12: the schedule wording is already in the title line above */
    at.insertAdjacentHTML('afterend', '<a class="dc-home done aw-menu" id="awmenu" href="#/awd?plot=' + encodeURIComponent(p.id) + '">' +
      '<span class="dc-ico" aria-hidden="true">' + RiceIco('drop') + '</span>' +
      '<span class="dc-txt"><b class="aw-mt">' + TITLE.replace(/^(ตรวจเช็คแปลง)(.*) (\S+)$/, '<span class="aw-m1"><span>$1</span><span>$2</span></span> <span class="aw-m2">$3</span>') + '</b><small class="dc-st">' + st.split('\n').map(function (x) { return '<span>' + esc(x) + '</span>'; }).join(' ') + '</small>' + (window.RiceFieldReview && e ? RiceFieldReview.line('awd', p, last, e, 'card') : '') + '</span>' +
      '<span class="dc-go">' + RiceIco('clip') + (done ? 'ดู / แก้ไข' : 'เริ่มบันทึก') + '</span></a>');
  }

  /* ---------- #/awd ---------- */
  function itemHtml(i, it) {
    it = it || {};
    return '<div class="aw-item" data-i="' + i + '">' +
      '<label class="aw-f aw-fn"><span>สิ่งที่ใช้</span><input class="dc-x aw-n" id="aw-n-' + i + '" type="text" maxlength="80" autocomplete="off" placeholder="เช่น ปุ๋ยสูตร 46-0-0" value="' + esc(it.n || '') + '"></label>' +
      '<label class="aw-f aw-fq"><span>ปริมาณ</span><input class="dc-x aw-q" id="aw-q-' + i + '" type="text" inputmode="decimal" maxlength="9" autocomplete="off" placeholder="เช่น 25" value="' + esc(it.q || '') + '"></label>' +
      '<label class="aw-f aw-fu"><span>หน่วย</span><input class="dc-x aw-u" id="aw-u-' + i + '" type="text" maxlength="20" autocomplete="off" placeholder="เช่น กก." value="' + esc(it.u || '') + '"></label>' +
      '<button type="button" class="aw-del" data-del="' + i + '" aria-label="ลบสิ่งที่ใช้ รายการนี้">ลบ</button></div>';
  }
  function histHtml(p, day) {
    var days = plotDays(p), ks = Object.keys(days).filter(function (k) { return k < day; }).sort().reverse().slice(0, HIST);
    if (!ks.length) return '';
    return '<section class="card dc-hist aw-hist" aria-label="ย้อนหลัง"><h2>ย้อนหลัง ' + ks.length + ' ครั้งล่าสุด</h2><ul>' + ks.map(function (k) {
      var e = days[k] || {};
      return '<li><b>' + thDay(k) + '</b><span>' + (e.do || []).map(function (c) { var l = doLabel(c); return l ? '<i>' + esc(l) + '</i>' : ''; }).join('') +
        (e.items || []).map(function (it) { return '<i class="aw-hi">' + esc(it.n) + (it.q ? ' ' + esc(it.q) : '') + (it.u ? ' ' + esc(it.u) : '') + '</i>'; }).join('') +
        (e.cost ? '<i class="aw-hc">รวม ' + money(e.cost) + ' บาท</i>' : '') + '</span>' + (window.RiceFieldReview ? RiceFieldReview.line('awd', p, k, e, 'hist') : '') + '</li>';
    }).join('') + '</ul></section>';
  }
  function savedLine(e) { return e && e.at ? RiceIco('check') + '<span><b>บันทึกแล้ว</b><small>แก้ไขได้ตลอดวันนี้</small></span>' : ''; }
  function screen() {
    var S = A.S(), plots = S.plots || [], want = (/[?&]plot=([^&]+)/.exec(location.hash) || [])[1], day = today();
    var p = plots.filter(function (x) { return want && String(x.id) === decodeURIComponent(want); })[0] || A.P(); /* chosen plot lives in the URL only */
    var head = A.header() + '<div class="sheet dc-sheet aw-sheet">' + A.titleRow(TITLE, 'วันนี้ ' + thDay(day) + (p ? ' แปลง: ' + esc(p.name || p.code || '') : ''));
    if (!p) { A.app.innerHTML = head + '<div class="card dc-empty"><p class="big">ยังไม่มีแปลง เพิ่มแปลงก่อน แล้วกลับมาบันทึกได้</p><a class="btn" href="#/plotedit?new=1">เพิ่มแปลง</a></div></div>'; return; }
    var e = plotDays(p)[day] || {}, items = (e.items || []).length ? e.items : [{}], has = {};
    (e.do || []).forEach(function (c) { has[c] = 1; });
    var sw = plots.length > 1 ? '<div class="plotsw" role="tablist" aria-label="เลือกแปลง">' + plots.map(function (x) { return '<button type="button" data-pl="' + esc(x.id) + '" class="' + (x === p ? 'on' : '') + '"><b>' + esc(x.name || ('แปลง ' + x.code)) + '</b><small>' + A.fmt(x.rai) + ' ไร่</small></button>'; }).join('') + '</div>' : '';
    A.app.innerHTML = head + sw +
      '<p class="aw-when">' + RiceIco('clip') + '<span>ทำเมื่อถึงกำหนดตามแผน ไม่มีจำนวนวันตายตัว ไม่จำเป็นต้องทำทุกวัน</span></p>' +
      '<div class="dc-saved" id="awsaved" role="status" aria-live="polite"' + (e.at ? '' : ' hidden') + '>' + savedLine(e) + '</div>' +
      '<div class="fr-wrap" id="awreview" aria-live="polite">' + (window.RiceFieldReview ? RiceFieldReview.line('awd', p, day, e, 'form') : '') + '</div>' +
      '<form class="dc-form aw-form" id="awform" novalidate><div class="dc-hrow"><h2 class="dc-h">วันนี้ทำอะไร ใช้เท่าไร จ่ายเท่าไร</h2></div>' +
      '<fieldset class="card dc-g aw-g" data-g="do"><legend><span class="dc-n">1</span>วันนี้ทำอะไร<small class="dc-one">เลือกได้หลายข้อ</small></legend>' +
        DO.map(function (o) { var id = 'aw-do-' + o[0], c = !!has[o[0]]; return '<div class="dc-opt' + (c ? ' on' : '') + '"><label class="dc-chk" for="' + id + '"><input type="checkbox" id="' + id + '" name="aw-do" value="' + o[0] + '"' + (c ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label></div>'; }).join('') + '</fieldset>' +
      '<fieldset class="card dc-g aw-g" data-g="items"><legend><span class="dc-n">2</span>ใช้เท่าไร</legend><div id="awitems">' + items.map(function (it, i) { return itemHtml(i, it); }).join('') + '</div>' +
        '<button type="button" class="btn ghost aw-add" id="awadd">+ เพิ่มสิ่งที่ใช้</button></fieldset>' +
      '<fieldset class="card dc-g aw-g" data-g="cost"><legend><span class="dc-n">3</span>จ่ายเท่าไร</legend><label class="aw-f aw-fc" for="aw-cost"><span>ค่าใช้จ่ายรวม</span><span class="dc-numrow"><input class="dc-x aw-c" id="aw-cost" type="text" inputmode="decimal" maxlength="12" autocomplete="off" placeholder="เช่น 1500" value="' + esc(e.cost || '') + '"><span class="dc-unit">บาท</span></span></label></fieldset>' +
      '<p class="dc-err" id="awerr" role="alert" hidden></p>' +
      '<div class="dc-bar"><span class="dc-bst" id="awbst"></span><button class="btn dc-save" id="awsave" type="submit" aria-describedby="awbst">' + RiceIco('check') + (e.at ? ' บันทึกการแก้ไข' : ' บันทึก') + '</button></div>' +
      '<p class="hint dc-note"><span>แก้ไขได้ตลอดวันนี้</span></p></form>' +
      histHtml(p, day) + '</div>';
    wire(p, day, e.at ? e : null);
  }
  function wire(p, day, last) {
    var f = document.getElementById('awform'), err = document.getElementById('awerr'), saved = document.getElementById('awsaved'), box = document.getElementById('awitems'), dirty = false, next = box.children.length;
    function filled() { return !!f.querySelector('input[name="aw-do"]:checked') || [].some.call(f.querySelectorAll('.aw-n,.aw-q,.aw-u,.aw-c'), function (x) { return x.value.trim(); }); }
    function bar() {
      var st = document.getElementById('awbst'), b = document.getElementById('awsave'), k = !filled() ? 'need' : dirty ? 'stale' : last ? 'ok' : 'need';
      st.dataset.k = k;
      var tm = last ? hhmm(last.at) + '\u00a0น.' : '';
      st.innerHTML = (k === 'need' ? '<span>เลือกหรือกรอก</span> <span>อย่างน้อย 1 ข้อ</span><span>ก่อนบันทึก</span>' : k === 'ok' ? '<span>บันทึกแล้ว</span> <span class="dc-tmv">เวลา ' + tm + '</span>' :
        '<i class="dc-ph">' + (last ? '<span>มีการแก้ไข</span> <span>ยังไม่ได้บันทึก</span>' : '<span>ยังไม่ได้บันทึก</span>') + '</i><i class="dc-pc">' + (last ? '<span>บันทึกล่าสุด</span> <span>เวลา ' + tm + '</span>' : '<span>ยังไม่มีบันทึกวันนี้</span>') + '</i>') +
        (window.RiceFieldReview && last ? RiceFieldReview.dev('awd', p, day, last) : '<small class="dc-dev">บันทึกไว้ในเครื่องนี้</small>');
      b.classList.toggle('idle', k !== 'stale');
    }
    function dels() { var n = box.children.length; box.querySelectorAll('.aw-del').forEach(function (b) { b.hidden = n < 2; }); document.getElementById('awadd').hidden = n >= MAXI; }
    function changed() {
      err.hidden = true;
      if (!saved.classList.contains('stale')) { var first = !last; saved.classList.add('stale'); saved.hidden = false; saved.innerHTML = RiceIco('clip') + '<span><b>' + (first ? 'ยังไม่ได้บันทึก' : 'มีการแก้ไข ยังไม่ได้บันทึก') + '</b><small>กดปุ่ม ' + (first ? 'บันทึก' : 'บันทึกการแก้ไข') + ' ด้านล่าง</small></span>'; }
      dirty = true; bar();
    }
    bar(); dels(); fitBar(f);
    document.querySelectorAll('.aw-sheet .plotsw [data-pl]').forEach(function (b) { b.onclick = function () { if (b.classList.contains('on')) return; location.replace('#/awd?plot=' + encodeURIComponent(b.dataset.pl)); }; });
    f.addEventListener('change', function (ev) { var c = ev.target; if (c.type !== 'checkbox') return; c.closest('.dc-opt').classList.toggle('on', c.checked); changed(); });
    f.addEventListener('input', function (ev) { if (ev.target.classList.contains('dc-x')) changed(); });
    document.getElementById('awadd').onclick = function () {
      if (box.children.length >= MAXI) return;
      box.insertAdjacentHTML('beforeend', itemHtml(next++)); dels(); changed();
      var n = box.lastElementChild.querySelector('.aw-n'); n.scrollIntoView({ block: 'center' }); try { n.focus({ preventScroll: true }); } catch (x) { n.focus(); }
    };
    box.addEventListener('click', function (ev) {
      var b = ev.target.closest('.aw-del'); if (!b || box.children.length < 2) return;
      var row = b.closest('.aw-item'), to = row.previousElementSibling || row.nextElementSibling; row.remove(); dels(); changed();
      if (to) to.querySelector('.aw-n').focus();
    });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (!dirty && last) { A.toast('บันทึกแล้ว'); return; }
      var e = { do: [].map.call(f.querySelectorAll('input[name="aw-do"]:checked'), function (c) { return c.value; }), items: [] }, bad = '', badEl = null;
      box.querySelectorAll('.aw-item').forEach(function (r) {
        var n = r.querySelector('.aw-n').value.trim().replace(/\s+/g, ' ').slice(0, 80), qe = r.querySelector('.aw-q'), q = num(qe.value), u = r.querySelector('.aw-u').value.trim().replace(/\s+/g, ' ').slice(0, 20);
        if (!n && !q && !u) return;
        if (!n) { bad = bad || 'สิ่งที่ใช้: ใส่ชื่อสิ่งที่ใช้ก่อน แล้วจึงใส่ปริมาณและหน่วย'; badEl = badEl || r.querySelector('.aw-n'); return; }
        if (q && !(/^\d{1,6}(\.\d{1,2})?$/.test(q) && +q > 0)) { bad = bad || 'ปริมาณ: กรอกเป็นตัวเลข เช่น 25 หรือ 2.5'; badEl = badEl || qe; return; }
        var it = { n: n }; if (q) it.q = String(+q); if (u) it.u = u; e.items.push(it);
      });
      var c = num(document.getElementById('aw-cost').value);
      if (c && !(/^\d{1,7}(\.\d{1,2})?$/.test(c))) { bad = bad || 'ค่าใช้จ่ายรวม: กรอกเป็นตัวเลขบาท เช่น 1500'; badEl = badEl || document.getElementById('aw-cost'); }
      if (bad) return showErr(bad, badEl);
      if (c) e.cost = String(+c);
      if (!e.do.length && !e.items.length && !e.cost) return showErr('เลือกหรือกรอกอย่างน้อย 1 ข้อก่อนบันทึก');
      e.at = new Date().toISOString();
      if (!putEntry(p, day, e)) return showErr('บันทึกไม่ได้: พื้นที่ในเครื่องเต็ม หรือเครื่องไม่อนุญาตให้บันทึก');
      saved.innerHTML = savedLine(e); saved.hidden = false; saved.classList.remove('stale'); last = e; dirty = false; bar();
      document.getElementById('awsave').innerHTML = RiceIco('check') + ' บันทึกการแก้ไข';
      if (window.RiceFieldReview) { document.getElementById('awreview').innerHTML = RiceFieldReview.line('awd', p, day, e, 'form'); RiceFieldReview.submit(); } /* staff copy after the local save */
      A.toast('บันทึกแล้ว');
      saved.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    function showErr(m, el) { err.textContent = m; err.hidden = false; err.scrollIntoView({ block: 'center' }); if (el) try { el.focus({ preventScroll: true }); } catch (x) {} return false; }
  }

  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; app.R.awd = screen; app.after(decorate); });
})();
