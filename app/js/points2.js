/* W9 part A: server points (GET /api/me/points + /api/me/weekly-summary) replace the client-side points screen.
   Also exposes window.RiceW9 (cache + helpers) for lessons.js and league.js. Plain JS, registered through window.RiceModules. */
(function () {
  'use strict';
  var A, R;
  var NAMES = { evidence_approved: 'หลักฐานผ่านการตรวจ', evidence_reversed: 'ยกเลิกแต้มหลักฐาน', lesson_passed: 'ผ่านบทเรียน', admin_adjust: 'เจ้าหน้าที่ปรับแต้ม' };
  var W = window.RiceW9 = {
    NAMES: NAMES,
    uid: function () { try { var s = A.S(); return (s.account && s.account.id) || 'anon'; } catch (e) { return 'anon'; } },
    put: function (k, d) { try { localStorage.setItem('riceos.w9.' + W.uid() + '.' + k, JSON.stringify({ t: Date.now(), d: d })); } catch (e) {} },
    get: function (k) { try { return JSON.parse(localStorage.getItem('riceos.w9.' + W.uid() + '.' + k)); } catch (e) { return null; } },
    /* network first, cached copy when there is no signal. Auth errors and real server answers are not hidden by the cache. */
    load: function (key, path) {
      return A.api.req('GET', path).then(function (j) { W.put(key, j); return { data: j, stale: false }; }, function (e) {
        if (e && !e.network && e.status !== 0 && e.status < 500) throw e;
        var c = W.get(key); if (c) return { data: c.d, stale: true, at: c.t }; throw e;
      });
    },
    alive: function (h) { return document.body.dataset.screen === h; },
    staleNote: function (r) { return r.stale ? '<p class="w9stale" role="status">ไม่มีสัญญาณ แสดงข้อมูลที่บันทึกไว้เมื่อ ' + new Date(r.at).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' }) + '</p>' : ''; },
    hrs: function (n) { return (Math.round(Number(n || 0) * 10) / 10).toLocaleString('en-US', { maximumFractionDigits: 1 }); },
    bar: function (pct, label) { pct = Math.max(0, Math.min(100, Math.round(pct))); return '<div class="w9bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + pct + '" aria-label="' + A.esc(label) + '"><i style="width:' + pct + '%"></i></div>'; },
    shell: function (title, sub, inner) { A.app.innerHTML = A.header() + '<div class="sheet w9">' + A.titleRow(title, sub) + inner + '</div>'; },
    err: function (title, e, retryRoute) { W.shell(title, '', '<div class="card w9card"><p class="w9p">' + A.esc((e && e.message) || 'เปิดข้อมูลไม่ได้ในตอนนี้') + '</p><button class="btn" id="w9retry">ลองใหม่</button></div>'); var b = document.getElementById('w9retry'); if (b) b.onclick = function () { A.route(); }; },
    date: function (iso) { try { return new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }); } catch (e) { return ''; } }
  };

  var origPoints, more = null;
  function histRow(r) {
    var d = Number(r.delta) || 0, nm = NAMES[r.reason] || r.reason;
    return '<li><span>' + A.esc(nm) + '<small>' + W.date(r.event_at || r.created_at) + (r.note ? ' · ' + A.esc(r.note) : '') + '</small></span><b class="' + (d < 0 ? 'neg' : '') + '">' + (d > 0 ? '+' : '') + A.fmt(d) + '</b></li>';
  }
  function evRow(ev, approvedIds) {
    var done = approvedIds[ev.id], t = ev.mission_type || ev.type || '', nm = /burn/.test(t) ? 'หลักฐานไม่เผาฟาง' : /awd|water|tube/.test(t) ? 'ถ่ายท่อวัดน้ำ AWD' : 'หลักฐานจากแปลง';
    return '<li><span>' + A.esc(nm) + '<small>' + W.date(ev.captured_at_client || ev.server_time) + '</small></span>' + (done ? '<b class="ok">ได้แต้มแล้ว</b>' : '<b class="wait">รอเจ้าหน้าที่ตรวจ</b>') + '</li>';
  }
  function rankLine(rk, nm) { return rk ? '<a class="w9rank" href="#/league?level=' + nm[0] + '"><span>' + nm[1] + '</span><b>อันดับ ' + A.fmt(rk.rank) + ' จาก ' + A.fmt(rk.of) + '</b></a>' : ''; }

  function pointsPage() {
    var uid = A.me() && A.me().user && A.me().user.public_id;
    if (!uid && !(A.S().account && A.S().account.id)) { return origPoints(); }
    W.shell('แต้มของฉัน', '', '<div class="card w9card"><p class="w9p">กำลังโหลดแต้ม...</p></div>');
    Promise.all([W.load('points', '/api/me/points?limit=20'), W.load('weekly', '/api/me/weekly-summary'), A.api.req('GET', '/api/evidence').then(function (j) { W.put('evidence', j); return j; }, function () { var c = W.get('evidence'); return c ? c.d : { evidence: [] }; })]).then(function (rs) {
      if (!W.alive('points')) return;
      var p = rs[0].data, wk = rs[1].data, evs = (rs[2].evidence || []).filter(function (e) { return e.status === 'complete' || e.status === 'approved'; });
      more = p.next_before || null;
      var approved = {}; (p.history || []).forEach(function (r) { if (r.reason === 'evidence_approved' && r.ref_id) approved[r.ref_id] = 1; });
      var th = wk.training_hours || {}, rk = wk.rank || {};
      var inner = W.staleNote(rs[0].stale ? rs[0] : rs[1]) +
        '<div class="card w9card w9hero"><span>แต้มสะสมของฉัน</span><b id="w9bal">' + A.fmt(p.balance) + '</b><small>แต้ม</small></div>' +
        '<div class="card w9card"><h3>สัปดาห์นี้</h3><div class="w9grid"><div><b>' + A.fmt(wk.points_week || 0) + '</b><small>แต้มสัปดาห์นี้</small></div><div><b>' + A.fmt(wk.points_prev_week || 0) + '</b><small>สัปดาห์ก่อน</small></div><div><b>' + A.fmt(wk.evidence_approved || 0) + '</b><small>หลักฐานที่ตรวจแล้ว</small></div><div><b>' + A.fmt(wk.lessons_passed || 0) + '</b><small>บทเรียนที่ผ่าน</small></div></div>' +
        '<a class="w9rank" href="#/training"><span>ชั่วโมงอบรม</span><b>' + W.hrs(th.done) + ' จาก ' + W.hrs(th.target || 30) + ' ชม.</b></a>' + W.bar((th.done || 0) * 100 / (th.target || 30), 'ชั่วโมงอบรม') + '</div>' +
        ((rk.tambon || rk.amphoe || rk.province) ? '<div class="card w9card"><h3>อันดับของฉัน</h3>' + rankLine(rk.tambon, ['tambon', 'ในตำบล']) + rankLine(rk.amphoe, ['amphoe', 'ในอำเภอ']) + rankLine(rk.province, ['province', 'ในจังหวัด']) + '</div>' : '') +
        '<a class="btn w9btn" href="#/league">ดูลีกของพื้นที่</a>' +
        '<div class="card w9card"><h3>หลักฐานที่ส่งแล้ว</h3><p class="w9note">แต้มจากรูปหลักฐานจะได้เมื่อเจ้าหน้าที่ตรวจและอนุมัติแล้วเท่านั้น</p>' + (evs.length ? '<ul class="w9list">' + evs.slice(0, 8).map(function (e) { return evRow(e, approved); }).join('') + '</ul>' : '<p class="w9p">ยังไม่มีหลักฐานที่ส่ง</p>') + '</div>' +
        '<div class="card w9card"><h3>ประวัติแต้ม</h3>' + ((p.history || []).length ? '<ul class="w9list" id="w9hist">' + p.history.map(histRow).join('') + '</ul>' : '<p class="w9p">ยังไม่มีแต้ม เริ่มจากทำบทเรียนหรือถ่ายรูปหลักฐาน</p>') + (more ? '<button class="btn ghost" id="w9more">ดูรายการเก่ากว่านี้</button>' : '') +
        '<p class="w9note">กติกาแต้มเวอร์ชัน ' + A.esc(p.rules_version || '-') + ' ยอดแต้มคำนวณที่เซิร์ฟเวอร์ ไม่ใช่ในเครื่อง</p></div>' +
        '<a class="btn ghost w9btn" href="#/settings">ตั้งค่าบัญชี / ถอนความยินยอม / ลบบัญชี</a>';
      W.shell('แต้มของฉัน', 'ยอดจากระบบกลางของโครงการ', inner);
      var mb = document.getElementById('w9more');
      if (mb) mb.onclick = function () { mb.disabled = true; A.api.req('GET', '/api/me/points?limit=20&before=' + encodeURIComponent(more)).then(function (j) { document.getElementById('w9hist').insertAdjacentHTML('beforeend', (j.history || []).map(histRow).join('')); more = j.next_before || null; if (!more) mb.remove(); else mb.disabled = false; }, function (e) { mb.disabled = false; A.toast(e.message); }); };
    }).catch(function (e) {
      if (!W.alive('points')) return;
      if (e && e.status === 401) { location.hash = '#/login'; return; }
      if (e && (e.network || e.status === 404 || e.status === 0)) return origPoints();
      W.err('แต้มของฉัน', e);
    });
  }

  function decorate(h) {
    var S = A.S();
    if (h === 'home' && S.registered && !S.seeded) {
      W.load('points', '/api/me/points?limit=20').then(function (r) { if (!W.alive('home')) return; var b = A.app.querySelector('.ptspill b'); if (b) b.textContent = A.fmt(r.data.balance); }, function () {});
    }
    if (h === 'missions') { var g = document.getElementById('go'); if (g) g.innerHTML = g.innerHTML.replace(/\(\+([\d.,]+) แต้ม\)/, function (m, n) { return /^[0.,]+$/.test(n) ? '<span class="sub2">(แต้มเมื่อเจ้าหน้าที่ตรวจ)</span>' : '(+' + n + ' แต้ม เมื่อเจ้าหน้าที่ตรวจ)'; }); }
  }
  (window.RiceModules = window.RiceModules || []).push(function (app) {
    A = app; R = app.R; origPoints = R.points; R.points = pointsPage; app.after(decorate);
  });
})();
