/* W9 part A: league screen from GET /api/league (tabs village/tambon/amphoe/province), my rank, opt-out toggle through the public_rank consent. Display names only. */
(function () {
  'use strict';
  var A, W;
  var TABS = [['village', 'หมู่บ้าน'], ['tambon', 'ตำบล'], ['amphoe', 'อำเภอ'], ['province', 'จังหวัด']];
  var esc = function (s) { return A.esc(s); };

  function league() {
    var m = location.hash.match(/level=(\w+)/), level = m && TABS.some(function (t) { return t[0] === m[1]; }) ? m[1] : 'tambon';
    W.shell('ลีก', 'เปรียบเทียบกับพื้นที่ใกล้เคียง', '<div class="card w9card"><p class="w9p">กำลังโหลดอันดับ...</p></div>');
    W.load('league.' + level, '/api/league?level=' + level).then(function (r) {
      if (!W.alive('league')) return;
      var d = r.data, me = d.me || {}, ma = me.area, mp = me.person || {}, opted = mp.opted_in !== undefined ? mp.opted_in : !!(A.S().consent || {}).public_rank;
      var tabs = '<div class="w9tabs" role="tablist">' + TABS.map(function (t) { return '<a role="tab" aria-selected="' + (t[0] === level) + '" class="' + (t[0] === level ? 'on' : '') + '" href="#/league?level=' + t[0] + '">' + t[1] + '</a>'; }).join('') + '</div>';
      var mine = '<div class="card w9card w9hero"><span>' + (ma ? 'พื้นที่ของฉัน: ' + esc(ma.name) : 'พื้นที่ของฉัน') + '</span>' +
        (ma ? '<b>อันดับ ' + A.fmt(ma.rank) + '</b><small>จาก ' + A.fmt(ma.of) + ' พื้นที่ · คะแนน ' + A.fmt(ma.score) + ' · สมาชิก ' + A.fmt(ma.members) + ' คน</small>' : '<small>ยังไม่มีพื้นที่ของท่านในอันดับ ระบุที่อยู่แปลงในหน้า เข้าร่วมโครงการ</small>') + '</div>' +
        '<div class="card w9card"><h3>อันดับของฉันในพื้นที่</h3>' + (opted && mp.rank ? '<p class="w9p">ท่านอยู่อันดับ ' + A.fmt(mp.rank) + ' จาก ' + A.fmt(mp.of) + ' คน (คะแนน ' + A.fmt(mp.score) + ')</p>' : opted ? '<p class="w9p">ยังไม่มีคะแนน ทำบทเรียนหรือส่งหลักฐานเพื่อเข้าอันดับ</p>' : '<p class="w9p">ท่านเลือกไม่แสดงชื่อในอันดับ คะแนนของท่านยังนับรวมในพื้นที่ แต่ไม่แสดงเป็นรายบุคคล</p>') +
        '<label class="chk w9opt"><input type="checkbox" id="w9opt"' + (opted ? ' checked' : '') + '> แสดงชื่อแสดงตนของฉันในอันดับ</label><p class="w9note">แสดงเฉพาะชื่อแสดงตน (ชื่อต้นและอักษรย่อนามสกุล) ไม่แสดงเบอร์โทรหรือที่อยู่ เปลี่ยนใจได้ทุกเมื่อ</p></div>';
      var areas = (d.areas || []).length ? '<div class="card w9card"><h3>อันดับพื้นที่</h3><ol class="w9list w9ol">' + d.areas.map(function (a) { return '<li class="' + (a.is_mine ? 'me' : '') + '"><i>' + A.fmt(a.rank) + '</i><span>' + esc(a.name) + (a.is_mine ? ' (ของฉัน)' : '') + '<small>' + A.fmt(a.members) + ' คน</small></span><b>' + A.fmt(a.score) + '</b></li>'; }).join('') + '</ol></div>' : '<div class="card w9card"><p class="w9p">ยังไม่มีอันดับในระดับนี้</p></div>';
      var ppl = (d.people || []).length ? '<div class="card w9card"><h3>เกษตรกรอันดับต้นในพื้นที่ของฉัน</h3><ol class="w9list w9ol">' + d.people.map(function (p) { return '<li class="' + (p.is_me ? 'me' : '') + '"><i>' + A.fmt(p.rank) + '</i><span>' + esc(p.display_name) + (p.is_me ? ' (ฉัน)' : '') + '</span><b>' + A.fmt(p.score) + '</b></li>'; }).join('') + '</ol></div>' : '';
      W.shell('ลีก', 'เปรียบเทียบกับพื้นที่ใกล้เคียง', W.staleNote(r) + tabs + mine + areas + ppl + '<a class="btn ghost w9btn" href="#/points">กลับไปหน้าแต้ม</a>');
      var cb = document.getElementById('w9opt');
      cb.onchange = function () {
        var v = cb.checked; cb.disabled = true;
        A.api.consent('public_rank', v, (A.api && A.api.consentVer ? A.api.consentVer() : 'c3')).then(function () {
          var S = A.S(); S.consent = S.consent || {}; S.consent.public_rank = v; S.consent.at = new Date().toISOString(); A.save();
          try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('riceos.w9.' + W.uid() + '.league.') === 0) localStorage.removeItem(k); }); } catch (e) {}
          A.toast(v ? 'จะแสดงชื่อแสดงตนของท่านในอันดับ' : 'ซ่อนชื่อของท่านจากอันดับแล้ว'); league();
        }, function (e) { cb.checked = !v; cb.disabled = false; A.toast(e.network ? 'ต้องมีสัญญาณเพื่อเปลี่ยนการยินยอม' : e.message); });
      };
    }).catch(function (e) {
      if (!W.alive('league')) return;
      if (e && e.status === 401) { location.hash = '#/login'; return; }
      W.err('ลีก', e);
    });
  }
  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; W = window.RiceW9; app.R.league = league; });
})();
