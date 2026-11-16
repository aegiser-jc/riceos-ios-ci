/* Booth screens (13 Nov): #/symptoms (ตรวจอาการข้าวเบื้องต้น, guided checklist over data/knowledge.json "symptom_check")
   and #/rewards (ของรางวัล, read-only sample tiers from content/rewards.json). No AI claim, no redemption.
   Registered through window.RiceModules. */
(function () {
  'use strict';
  var A, W, cache = {};
  var esc = function (s) { return A.esc(s); };
  function load(path) {
    if (cache[path]) return Promise.resolve(cache[path]);
    return fetch(path).then(function (r) { if (!r.ok) throw new Error(path); return r.json(); }).then(function (j) { cache[path] = j; return j; });
  }
  function shell(title, sub, inner) { A.app.innerHTML = A.header() + '<div class="sheet w9 bt">' + A.titleRow(title, sub) + inner + '</div>'; window.scrollTo(0, 0); }
  var GI = { leaf: 'leaf', spot: 'spot', lodge: 'lodge', pest: 'bug', water: 'drop' }, TI = { t1: 'badge', t2: 'shirt', t3: 'tube', t4: 'sack', t5: 'cert' };
  var steps = function (n) { return '<ol class="bt-steps" aria-label="ขั้นที่ ' + n + ' จาก 3">' + ['เลือกหมวด', 'เลือกอาการ', 'ดูแนวทาง'].map(function (t, i) { return '<li class="' + (i + 1 === n ? 'on' : i + 1 < n ? 'done' : '') + '"><b>' + (i + 1) + '</b><span>' + t + '</span></li>'; }).join('') + '</ol>'; };
  function fail(title) { shell(title, '', '<div class="card w9card"><p class="w9p">เปิดข้อมูลไม่ได้ในตอนนี้ กรุณาลองใหม่เมื่อมีสัญญาณ</p><a class="btn" href="#/home">กลับหน้าแรก</a></div>'); }
  var ul = function (a) { return '<ul class="bt-ul">' + a.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>'; };

  /* ---------- #/symptoms ---------- */
  function symptoms() {
    var tok = document.body.dataset.screen;
    shell('ตรวจอาการข้าวเบื้องต้น', 'เลือกสิ่งที่เห็นในแปลง', '<div class="card w9card"><p class="w9p">กำลังโหลด...</p></div>');
    load('data/knowledge.json').then(function (kb) {
      if (document.body.dataset.screen !== tok) return;
      var sc = kb.symptom_check; if (!sc) return fail('ตรวจอาการข้าวเบื้องต้น');
      var banner = '<div class="bt-honest" role="note"><b>' + esc(sc.honest) + '</b></div>';
      var step1 = function () {
        shell('ตรวจอาการข้าวเบื้องต้น', 'ท่านเห็นอะไรในแปลง', banner + steps(1) + '<div class="bt-groups">' + sc.groups.map(function (g) {
          return '<button type="button" class="bt-group" data-g="' + g.id + '"><span aria-hidden="true">' + RiceIco(GI[g.id] || 'leaf') + '</span><b>' + esc(g.label) + '</b></button>'; }).join('') + '</div>' +
          '<p class="w9note">' + esc(kb.disclaimer) + '</p>');
        A.app.querySelectorAll('.bt-group').forEach(function (b) { b.onclick = function () { step2(b.dataset.g); }; });
      };
      var step2 = function (gid) {
        var g = sc.groups.filter(function (x) { return x.id === gid; })[0];
        shell('ตรวจอาการข้าวเบื้องต้น', g.label + ': ตรงกับข้อไหนมากที่สุด', banner + steps(2) +
          '<div class="bt-list">' + g.symptoms.map(function (s) { return '<button type="button" class="bt-sym" data-s="' + s.id + '"><span>' + esc(s.label) + '</span><i aria-hidden="true">›</i></button>'; }).join('') + '</div>' +
          '<button type="button" class="btn ghost bt-back" id="btback">เปลี่ยนหมวด</button>');
        A.app.querySelectorAll('.bt-sym').forEach(function (b) { b.onclick = function () { step3(g, b.dataset.s); }; });
        document.getElementById('btback').onclick = step1;
      };
      var step3 = function (g, sid) {
        var s = g.symptoms.filter(function (x) { return x.id === sid; })[0], e = s.kb && kb.entries.filter(function (x) { return x.id === s.kb; })[0];
        shell('ตรวจอาการข้าวเบื้องต้น', 'ผลที่เป็นไปได้ (เบื้องต้น)', banner + steps(3) +
          '<div class="bt-resgrid"><div class="card w9card bt-res"><h3>🔎 อาการที่เลือก</h3><p class="w9p bt-sel">' + esc(s.label) + '</p>' +
          '<h4>อาจเป็นเพราะ</h4>' + ul(s.causes) + '<h4>ลองทำเบื้องต้น</h4>' + ul(s.advice) + '</div>' +
          '<div class="card w9card bt-call"><h3>📞 เรียกเจ้าหน้าที่เกษตรเมื่อ</h3>' + ul(s.call_officer) + '<p class="w9p">' + esc(sc.always_call) + '</p></div></div>' +
          (e ? '<details class="card w9card bt-more"><summary>คำแนะนำประกอบจากคลังความรู้</summary><p class="w9p">' + esc(e.answer) + '</p></details>' : '') +
          '<button type="button" class="btn bt-again" id="btagain">ตรวจอาการอื่น</button><a class="btn ghost bt-lnk" href="#/lessons">เปิดบทเรียน</a>');
        document.getElementById('btagain').onclick = step1;
      };
      step1();
    }).catch(function () { if (document.body.dataset.screen === tok) fail('ตรวจอาการข้าวเบื้องต้น'); });
  }

  /* ---------- #/rewards ---------- */
  function rewards() {
    var tok = document.body.dataset.screen;
    shell('ของรางวัล', 'ดูรางวัลและแต้มสะสมของท่าน', '<div class="card w9card"><p class="w9p">กำลังโหลด...</p></div>');
    var pts = A.api && A.api.req && W ? W.load('points', '/api/me/points?limit=20').then(function (r) { return { bal: Number(r.data.balance) || 0, stale: r.stale, r: r }; }, function () { return { bal: null }; }) : Promise.resolve({ bal: null });
    Promise.all([load('content/rewards.json'), pts]).then(function (rs) {
      if (document.body.dataset.screen !== tok) return;
      var rw = rs[0], bal = rs[1].bal, tiers = rw.tiers.slice().sort(function (a, b) { return a.points - b.points; });
      var next = bal == null ? null : tiers.filter(function (t) { return t.points > bal; })[0];
      var hero = bal == null ? '<div class="card w9card w9hero"><span>แต้มสะสมของท่าน</span><b>-</b><small>ยังเปิดแต้มไม่ได้ ลองใหม่เมื่อมีสัญญาณ</small></div>' :
        '<div class="card w9card w9hero"><span>แต้มสะสมของท่าน</span><b>' + RiceIco('star') + ' ' + A.fmt(bal) + '</b><small>' + (next ? 'รางวัลถัดไป: ' + esc(next.title) + ' อีก ' + A.fmt(next.points - bal) + ' แต้ม' : 'ท่านถึงเกณฑ์ทุกระดับในรายการนี้แล้ว') + '</small></div>';
      shell('ของรางวัล', 'ดูรางวัลและแต้มสะสมของท่าน',
        '<div class="bt-rwtop"><div class="bt-honest" role="note"><b>' + esc(rw.label) + '</b><span>' + esc(rw.note) + '</span></div>' + hero + '</div>' + (rs[1].stale ? W.staleNote(rs[1].r) : '') +
        '<ol class="bt-tiers">' + tiers.map(function (t) {
          var got = bal != null && bal >= t.points, pct = bal == null ? 0 : Math.min(100, bal * 100 / t.points);
          return '<li class="card w9card bt-tier' + (got ? ' got' : '') + '"><div class="bt-th"><span class="bt-ti" aria-hidden="true">' + RiceIco(TI[t.id] || 'gift') + '</span><b>' + esc(t.title) + '</b><span class="bt-pt">' + RiceIco('star') + ' ' + A.fmt(t.points) + ' แต้ม</span></div><p class="w9p">' + esc(t.desc) + '</p>' +
            W.bar(pct, 'ความคืบหน้าสู่ ' + t.title) + '<p class="bt-st">' + (bal == null ? 'ยังไม่ทราบแต้ม' : got ? 'แต้มถึงเกณฑ์แล้ว · ' + esc(rw.no_redeem) : 'ขาดอีก ' + A.fmt(t.points - bal) + ' แต้ม') + '</p></li>'; }).join('') + '</ol>' +
        '<p class="w9note">หน้านี้ใช้ดูอย่างเดียว ยังไม่เปิดให้แลกในแอป รายการและแต้มจริงจะประกาศเมื่อโครงการกำหนดเสร็จ</p>' +
        '<a class="btn ghost bt-lnk" href="#/points">ดูประวัติแต้ม</a>');
    }).catch(function () { if (document.body.dataset.screen === tok) fail('ของรางวัล'); });
  }

  /* ---------- entry links: home tiles, lessons list, points page ---------- */
  var LINK_SYM = '<a class="bt-entry" id="btsym" href="#/symptoms"><span class="bt-ei" aria-hidden="true">' + RiceIco('sprout') + '</span><span class="bt-et"><b>ตรวจอาการข้าวเบื้องต้น</b><small>เลือกอาการที่เห็น ดูแนวทางเบื้องต้น</small></span><i aria-hidden="true">›</i></a>';
  var LINK_RW = '<a class="bt-entry" id="btrw" href="#/rewards"><span class="bt-ei" aria-hidden="true">' + RiceIco('gift') + '</span><span class="bt-et"><b>ของรางวัล</b><small>ดูรายการรางวัลและแต้มของท่าน</small></span><i aria-hidden="true">›</i></a>';
  var obs = null;
  function place(h) {
    var app = A.app, q = function (s) { return app.querySelector(s); };
    if (h === 'home' && !q('.bt-home')) {
      var anchor = q('.w9b-home') || q('.grid4'); if (anchor) anchor.insertAdjacentHTML('afterend', '<div class="bt-home">' + LINK_SYM + LINK_RW + '</div>');
    } else if (h === 'lessons' && !/[?&]id=/.test(location.hash) && !q('#btsym') && q('.w9hours')) {
      q('.w9hours').insertAdjacentHTML('beforebegin', '<div class="bt-home">' + LINK_SYM + '</div>');
    } else if (h === 'points' && !q('#btrw') && q('.w9hero')) {
      q('.w9hero').insertAdjacentHTML('afterend', '<div class="bt-home">' + LINK_RW + '</div>');
    }
  }
  function decorate(h) {
    if (obs) { obs.disconnect(); obs = null; }
    place(h);
    if ((h === 'lessons' || h === 'points') && window.MutationObserver) {
      obs = new MutationObserver(function () { if (document.body.dataset.screen !== h) { obs.disconnect(); obs = null; return; } obs.disconnect(); place(h); if (obs) obs.observe(A.app, { childList: true, subtree: true }); });
      obs.observe(A.app, { childList: true, subtree: true });
    }
  }

  (window.RiceModules = window.RiceModules || []).push(function (app) { A = app; W = window.RiceW9; app.R.symptoms = symptoms; app.R.rewards = rewards; app.after(decorate); });
})();
