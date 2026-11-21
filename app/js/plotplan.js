/* หน้าเพิ่มแปลง: แผนปุ๋ย / แผนน้ำ / เงื่อนไขผู้ซื้อ (PingEris 20 Nov, Assist YES 20 Nov). Shown on #/plotedit (add and edit).
   Stored ONLY on this phone under its own key riceos.next.plotplan.v1 = { v:1, o:{ <owner>:{ <plot local id>:{ pid, fert:{c}, water:{c,x}, buyer:{c,x}, at } } } }.
   Never part of riceos.v1 or of the POST/PATCH /api/plots body; no network. Logout / account delete remove this key with the other personal keys. */
(function () {
  'use strict';
  var KEY = 'riceos.next.plotplan.v1', A;
  /* wording verbatim from the request; x = the section has a text box. One answer per section. */
  var GROUPS = [
    { k: 'fert', h: 'แผนปุ๋ย', o: [{ v: 'have', l: 'มีแล้ว' }, { v: 'wait', l: 'รอข้อมูล' }] },
    { k: 'water', h: 'แผนน้ำ', o: [{ v: 'have', l: 'มีแล้ว' }, { v: 'wait', l: 'รอข้อมูล' }], x: true },
    { k: 'buyer', h: 'เงื่อนไขผู้ซื้อ', o: [{ v: 'ack', l: 'รับทราบแล้ว' }, { v: 'wait', l: 'รอข้อมูล' }], x: true }
  ];
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  function readAll() { try { var j = JSON.parse(localStorage.getItem(KEY) || 'null'); return j && j.v === 1 && j.o && typeof j.o === 'object' ? j : { v: 1, o: {} }; } catch (e) { return { v: 1, o: {} }; } }
  function writeAll(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); return true; } catch (e) { return false; } }
  function owner() { var a = ((A && A.S()) || {}).account || {}; return String(a.id || a.phone || 'local'); }
  /* the plot's entry: by server id when both sides know it, else by the local id */
  function find(p) {
    if (!p) return null;
    var o = readAll().o[owner()] || {};
    if (p.pid) for (var k in o) if (o[k] && o[k].pid === p.pid) return o[k];
    var e = o[String(p.id)];
    return e && (!e.pid || !p.pid || e.pid === p.pid) ? e : null;
  }
  function html(p) {
    var e = find(p) || {};
    return '<section class="pp" id="pp" aria-label="แผนปุ๋ย แผนน้ำ เงื่อนไขผู้ซื้อ">' + GROUPS.map(function (g) {
      var cur = e[g.k] || {};
      return '<fieldset class="card dc-g pp-g" data-g="' + g.k + '"><legend>' + esc(g.h) + '<small class="dc-one">เลือก 1 ข้อ</small></legend>' +
        '<div class="pp-opts">' + g.o.map(function (o) {
          var id = 'pp-' + g.k + '-' + o.v, c = cur.c === o.v;
          return '<div class="dc-opt' + (c ? ' on' : '') + '"><label class="dc-chk" for="' + id + '"><input type="checkbox" id="' + id + '" name="pp-' + g.k + '" value="' + o.v + '"' + (c ? ' checked' : '') + '><span>' + esc(o.l) + '</span></label></div>';
        }).join('') + '</div>' +
        (g.x ? '<div class="pp-xw"><textarea class="dc-x pp-x" id="pp-' + g.k + '-x" rows="2" maxlength="300" autocomplete="off" placeholder="พิมพ์รายละเอียด (ถ้ามี)" aria-label="' + esc(g.h) + ' รายละเอียด">' + esc(cur.x || '') + '</textarea></div>' : '') + /* r7: the box is the bottom band of its section card; neutral placeholder (decision 14/16) */
        '</fieldset>';
    }).join('') + '</section>';
  }
  function wire() {
    var root = document.getElementById('pp'); if (!root) return;
    root.addEventListener('change', function (ev) { /* one answer per section: ticking one unticks the other */
      var c = ev.target; if (c.type !== 'checkbox') return;
      if (c.checked) root.querySelectorAll('input[type=checkbox][name="' + c.name + '"]').forEach(function (x) { if (x !== c) x.checked = false; });
      root.querySelectorAll('input[type=checkbox][name="' + c.name + '"]').forEach(function (x) { x.closest('.dc-opt').classList.toggle('on', x.checked); });
    });
  }
  /* called after the plot itself was saved; reads the form, writes only KEY. Never throws. */
  function save(p) {
    try {
      var root = document.getElementById('pp'); if (!root || !p) return true;
      var ent = {}, any = false;
      GROUPS.forEach(function (g) {
        var ch = root.querySelector('input[name="pp-' + g.k + '"]:checked'), tx = g.x ? (document.getElementById('pp-' + g.k + '-x').value || '').trim().slice(0, 300) : '';
        if (!ch && !tx) return;
        ent[g.k] = {}; if (ch) ent[g.k].c = ch.value; if (tx) ent[g.k].x = tx; any = true;
      });
      var d = readAll(), ow = owner(), o = d.o[ow] = d.o[ow] || {};
      var had = false; Object.keys(o).forEach(function (k) { if (k === String(p.id) || (p.pid && o[k] && o[k].pid === p.pid)) { delete o[k]; had = true; } }); /* one entry per plot */
      if (!any && !had) return true; /* nothing filled and nothing stored before: write nothing */
      if (any) { if (p.pid) ent.pid = p.pid; ent.at = new Date().toISOString(); o[String(p.id)] = ent; }
      if (!Object.keys(o).length) delete d.o[ow];
      if (!writeAll(d)) { if (A) A.toast('บันทึกแผนปุ๋ย แผนน้ำ เงื่อนไขผู้ซื้อ ในเครื่องนี้ไม่ได้'); return false; }
      return true;
    } catch (e) { return false; }
  }
  window.RicePlan = { html: html, wire: wire, save: save, KEY: KEY };
  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; });
})();
