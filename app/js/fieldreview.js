/* Staff review of ตรวจเช็คแปลงรายวัน ('daily') and ตรวจเช็คแปลงเมื่อถึงกำหนดตามแผน เปียกสลับแห้ง ('awd') (PingEris 23 Nov).
   The checks are still saved on the phone first (dailycheck.js / awd.js, unchanged keys); after each local save a copy goes to
   PUT /api/me/field-checks/<kind>/<plot pid>/<day>, and GET /api/me/field-checks tells the farmer waiting / checked / fix.
   Review cache: riceos.next.dailycheck.review.v1 = { v:1, off:bool, o:{ <owner>:{ "<kind>|<plot pid>|<day>":{ s, note, sent:<entry.at sent> } } } }
   (under the riceos.next.dailycheck. prefix, so logout / account delete already remove it). Never reads or writes riceos.v1.
   Backend without these routes (404 not_found, or a static host): state "off", local save exactly as before. Inert in the native store build. */
(function () {
  'use strict';
  var KEY = 'riceos.next.dailycheck.review.v1', SRC = { daily: 'riceos.next.dailycheck.v1', awd: 'riceos.next.awd.v1' }, BACK = 7, WAIT = 60e3, A;
  var mode = null, lastGet = 0, busy = null, again = false;
  var TH_MON = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
  /* one outline family with js/vc6.js (24px grid, 2px round stroke); each state has its own shape */
  var IC = { waiting: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', checked: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    fix: '<path d="M12 3 2 20h20L12 3z"/><path d="M12 10v4M12 17h.01"/>', unsent: '<path d="M12 16V5M7 10l5-5 5 5"/><path d="M5 19h14"/>',
    off: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>' };
  IC.nologin = IC.noplot = IC.off;
  function ico(k) { return '<svg class="ri fr-i" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + (IC[k] || '') + '</svg>'; }
  var TXT = { waiting: 'ส่งให้เจ้าหน้าที่แล้ว รอตรวจ', checked: 'เจ้าหน้าที่ตรวจแล้ว', fix: 'เจ้าหน้าที่ขอให้แก้ไข', unsent: 'ยังไม่ได้ส่งให้เจ้าหน้าที่ จะส่งเมื่อมีสัญญาณอินเทอร์เน็ต',
    off: 'บันทึกไว้ในเครื่องนี้ การส่งให้เจ้าหน้าที่ตรวจยังไม่เปิดใช้', nologin: 'ยังไม่ได้เข้าสู่ระบบ จึงยังส่งให้เจ้าหน้าที่ตรวจไม่ได้',
    noplot: 'แปลงนี้ยังไม่เข้าระบบ จะส่งให้เจ้าหน้าที่เมื่อแปลงเข้าระบบแล้ว' };

  function inert() { return !!(window.RiceNative && window.RiceNative.native) || !window.RiceAPI || !A; }
  function uid() { try { return window.RiceAPI.userId(); } catch (e) { return null; } }
  function readC() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.v === 1 && j.o && typeof j.o === 'object' ? j : { v: 1, o: {} }; } catch (e) { return { v: 1, o: {} }; } }
  function writeC(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} }
  function owner() { var a = (A.S() || {}).account || {}; return String(a.id || a.phone || 'local'); } /* same rule as dailycheck.js / awd.js */
  function bkk(ms) { return new Date(ms + 7 * 36e5).toISOString().slice(0, 10); }
  function today() { return bkk(Date.now()); }
  function first() { return bkk(Date.now() - BACK * 864e5); }
  function esc(s) { return A.esc(s); }
  function thDay(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || ''); return m ? (+m[3]) + ' ' + TH_MON[+m[2] - 1] + ' ' + (+m[1] + 543) : ''; }
  function isOff() { return mode === 'off' || (mode === null && readC().off === true); }

  /* state of one saved record: '' (nothing to say), off, nologin, noplot, unsent, waiting, checked, fix */
  function stateOf(kind, pid, day, at) {
    if (inert() || !at) return { k: '' };
    if (isOff()) return { k: 'off' };
    if (!uid()) return { k: 'nologin' };
    if (!pid) return { k: 'noplot' };
    var c = (readC().o[owner()] || {})[kind + '|' + pid + '|' + day];
    if (c && c.sent === at && TXT[c.s]) return { k: c.s, note: c.note || '' };
    if (day < first()) return { k: '' }; /* older than the backend accepts and never sent: say nothing */
    return { k: 'unsent' };
  }
  function inner(st, day, w) {
    var h = ico(st.k) + '<span class="fr-t"><b>' + TXT[st.k] + '</b>';
    if (st.k === 'fix') {
      if (st.note) h += '<span class="fr-note">' + esc(st.note) + '</span>';
      h += '<span class="fr-do">' + (day !== today() ? 'รายการของวันก่อนแก้ในแอปไม่ได้ กรุณาติดต่อเจ้าหน้าที่' : w === 'form' ? 'แก้ไขแล้วกดบันทึกการแก้ไข' : 'เปิดรายการ แก้ไข แล้วกดบันทึกการแก้ไข') + '</span>';
    }
    return h + '</span>';
  }
  /* HTML for a status line; w = where it sits (today: in the home block, card: missions / menu, form: under the saved banner, hist: a history row) */
  function line(kind, plot, day, entry, w) {
    if (inert() || !entry || !entry.at) return '';
    var pid = plot && plot.pid ? String(plot.pid) : '', st = stateOf(kind, pid, day, entry.at);
    return '<span class="fr-st fr-' + (w || 'card') + '" data-fr="' + esc(kind + '|' + pid + '|' + day) + '" data-at="' + esc(entry.at) + '" data-w="' + esc(w || 'card') + '" data-k="' + st.k + '"' + (st.k ? '' : ' hidden') + '>' + (st.k ? inner(st, day, w) : '') + '</span>';
  }
  /* the device note beside Save: changes only when this record really went to the staff */
  function sentText(st) { return /^(waiting|checked|fix)$/.test(st.k) ? 'บันทึกไว้ในเครื่องนี้ และส่งให้เจ้าหน้าที่แล้ว' : 'บันทึกไว้ในเครื่องนี้'; }
  function dev(kind, plot, day, entry) {
    var pid = plot && plot.pid ? String(plot.pid) : '', at = entry && entry.at || '';
    return '<small class="dc-dev" data-frdev="' + esc(kind + '|' + pid + '|' + day) + '" data-at="' + esc(at) + '">' + sentText(stateOf(kind, pid, day, at)) + '</small>';
  }
  function paint() {
    if (!A) return;
    document.querySelectorAll('[data-fr]').forEach(function (el) {
      var p = el.dataset.fr.split('|'), st = stateOf(p[0], p[1], p[2], el.dataset.at);
      if (el.dataset.k === st.k && el.dataset.note === (st.note || '')) return; /* unchanged: no repaint, no shift */
      el.dataset.k = st.k; el.dataset.note = st.note || ''; el.hidden = !st.k; el.innerHTML = st.k ? inner(st, p[2], el.dataset.w) : '';
    });
    document.querySelectorAll('[data-frdev]').forEach(function (el) {
      var p = el.dataset.frdev.split('|'), t = sentText(stateOf(p[0], p[1], p[2], el.dataset.at)); if (el.textContent !== t) el.textContent = t;
    });
  }

  /* ---------- network ---------- */
  function offNow(e) { return e && (e.code === 'not_found' || e.code === 'unreachable' || e.code === 'http_404' || e.code === 'http_405'); } /* routes missing / no backend */
  function setMode(m) { mode = m; var d = readC(); if (d.off !== (m === 'off')) { d.off = m === 'off'; writeC(d); } }
  function refresh() {
    return window.RiceAPI.fieldChecks(bkk(Date.now() - 30 * 864e5)).then(function (j) {
      setMode('on'); lastGet = Date.now();
      var d = readC(), ow = owner(), o = d.o[ow] = d.o[ow] || {};
      ((j && j.field_checks) || []).forEach(function (r) {
        var k = r.kind + '|' + r.plot_id + '|' + r.day, c = o[k] = o[k] || {};
        c.s = r.status; c.note = r.status === 'fix' ? (r.note || '') : '';
      });
      writeC(d); return true;
    }, function (e) { if (offNow(e)) { setMode('off'); lastGet = Date.now(); } return false; });
  }
  function pending() { /* saved records of today and the 7 days before, for this owner, whose latest save is not on the server yet */
    var S = A.S() || {}, plots = S.plots || [], ow = owner(), c = readC().o[ow] || {}, out = [], from = first(), to = today();
    Object.keys(SRC).forEach(function (kind) {
      var all; try { all = JSON.parse(localStorage.getItem(SRC[kind]) || 'null'); } catch (e) { all = null; }
      var mine = all && all.v === 1 && all.o && all.o[ow]; if (!mine) return;
      Object.keys(mine).forEach(function (pk) {
        var p = plots.filter(function (x) { return String(x.pid || '') === pk || String(x.id) === pk; })[0]; if (!p || !p.pid) return;
        Object.keys(mine[pk] || {}).forEach(function (day) {
          var e = mine[pk][day]; if (!e || !e.at || day < from || day > to) return;
          var k = kind + '|' + p.pid + '|' + day; if (c[k] && c[k].sent === e.at) return;
          var ans = {}; Object.keys(e).forEach(function (x) { if (x !== 'at') ans[x] = e[x]; });
          out.push({ kind: kind, pid: String(p.pid), day: day, at: e.at, ans: ans, k: k });
        });
      });
    });
    return out;
  }
  function flush() {
    var list = pending(), i = 0;
    function next() {
      if (i >= list.length) return Promise.resolve();
      var it = list[i++];
      return window.RiceAPI.putFieldCheck(it.kind, it.pid, it.day, it.ans).then(function (j) {
        var f = (j && j.field_check) || {}, d = readC(), ow = owner(); d.o[ow] = d.o[ow] || {};
        d.o[ow][it.k] = { s: f.status || 'waiting', note: f.status === 'fix' ? (f.note || '') : '', sent: it.at }; writeC(d); paint(); return next();
      }, function (e) {
        if (e && e.code === 'not_found' && /แปลง/.test(e.message || '')) { var d = readC(), ow = owner(); d.o[ow] = d.o[ow] || {}; d.o[ow][it.k] = { s: 'noplot', sent: it.at }; writeC(d); return next(); }
        if (offNow(e)) { setMode('off'); return; }
        if (e && (e.network || e.status === 401 || e.status === 429 || e.status >= 500)) return; /* try again on the next screen */
        return next(); /* refused (old day, bad answers): leave it, go on */
      });
    }
    return next();
  }
  /* force: a record was just saved, send now (asks the server again when it was off or unknown) */
  function sync(force) {
    if (inert()) return Promise.resolve();
    if (!uid()) { paint(); return Promise.resolve(); }
    if (busy) { again = again || !!force; return busy; }
    var get = mode !== 'on' ? (force || Date.now() - lastGet > WAIT) : Date.now() - lastGet > WAIT;
    if (!get && mode !== 'on') { paint(); return Promise.resolve(); }
    busy = (get ? refresh() : Promise.resolve(true)).then(function (on) { return on ? flush() : null; }).then(null, function () {}).then(function () {
      busy = null; paint();
      if (again) { var f = again; again = false; return sync(f); }
    });
    return busy;
  }
  function submit() { paint(); return sync(true); }

  window.RiceFieldReview = { line: line, dev: dev, paint: paint, sync: sync, submit: submit, stateOf: stateOf, thDay: thDay };
  (window.RiceModules = window.RiceModules || []).push(function (app) {
    A = app;
    app.after(function (h) { if (/^(home|missions|plot|dailycheck|awd)$/.test(h)) sync(false); });
    window.addEventListener('online', function () { lastGet = 0; sync(false); });
  });
})();
