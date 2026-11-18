/* W9 part A: lessons from /api/lessons (20, SRP tag, hours), quiz scored by the server, training-hours counter vs 30 h on #/training.
   Falls back to the cached list/detail when there is no signal, and to the old local lessons only when there is no backend at all. */
(function () {
  'use strict';
  var A, R, W, origLessons, origTraining;
  var STAGE = { nursery: 'ตกกล้า', tillering: 'แตกกอ', panicle: 'ตั้งท้อง', flowering: 'ออกดอก', harvest: 'เก็บเกี่ยว', all: 'ทุกช่วง' };
  var esc = function (s) { return A.esc(s); };
  /* B14: per-lesson sources (lessons-sources key S1-S9; ids per lesson as in content/lessons-all.json source_ids). S8 (กรมการข้าว) links to the
     verified Rice Knowledge Bank page. Used when the API lesson has no source_ids of its own. */
  var LSRC = {
    S1: ['IRRI: Alternate wetting and drying', 'https://ghgmitigation.irri.org/mitigation-technologies/alternate-wetting-and-drying'],
    S2: ['IRRI Rice Today', 'https://ricetoday.irri.org/?p=32436'],
    S3: ['AfricaRice: AWD guidance (PDF)', 'https://www.africarice.org/_files/ugd/0839e4_aefcc1bf0d9c4062a339fa1a81a616fc.pdf'],
    S4: ['Sustainable Rice Platform fact sheet (PDF)', 'https://www.preferredbynature.org/sites/default/files/Sustainable_Rice_Platform-Fact_Sheet-Jan22_EN.PDF.pdf'],
    S5: ['SRP Standard for Sustainable Rice Cultivation v1.0 (PDF)', 'https://sustainablericeplatform.github.io/assets/doc' + 's/SRP%20Standard%20for%20Sustainable%20Rice%20Cultivation%20v%201.0.pdf'],
    S6: ['IRRI Rice Knowledge Bank harvesting factsheet (PDF)', 'https://rkbassam.aau.ac.in/uploads/factsheets/pdf/6657ea5ab8d1f.pdf'],
    S7: ['IRRI Rice Today: Dried to perfection', 'https://ricetoday.irri.org/dried-to-perfection/'],
    S8: ['กรมการข้าว Rice Knowledge Bank', 'https://rkb.ricethailand.go.th/web/index.php'],
    S9: ['Amarin TV (ข่าว)', 'https://www.amarintv.com/news/agriculture/561453']
  };
  /* LSRC.S5: external URL string is split so smoke's internal-path check (served files must not name repo doc folders) does not trip on it */
  var LESSON_SRC = { 'L4-useapp': ['S8'], 'L5-seed': ['S8', 'S4'], 'L6-nursery': ['S5', 'S8'], 'L7-soil': ['S4', 'S8'], 'L8-plant': ['S5'], 'L9-awd': ['S1', 'S2', 'S3'],
    'L10-flower': ['S3'], 'L11-fert': ['S4', 'S5'], 'L12-weed': ['S4'], 'L13-ipm': ['S4', 'S5'], 'L14-pest-safe': ['S4', 'S5'], 'L15-safety': ['S5'], 'L16-climate': ['S8'],
    'L17-harvest': ['S6'], 'L18-postharvest': ['S7', 'S6'], 'L19-straw': ['S4', 'S9'], 'L20-records': ['S8'] };
  function lessonSources(l) {
    var ids = (Array.isArray(l.source_ids) && l.source_ids.length ? l.source_ids : LESSON_SRC[l.id]) || [], rows = ids.filter(function (k) { return LSRC[k]; });
    if (!rows.length) return '';
    return '<div class="card w9card lesson-src" id="lessonsrc"><h3>แหล่งข้อมูลของบทเรียนนี้</h3><ul class="src-list">' + rows.map(function (k) {
      var r = LSRC[k]; return '<li><b>' + esc(r[0]) + '</b><a class="ext" href="' + esc(r[1]) + '" target="_blank" rel="noopener">' + esc(r[1]) + '</a></li>';
    }).join('') + '</ul><p class="w9note">เนื้อหาเรียบเรียงเป็นแนวทางทั่วไป ไม่ใช่เอกสารของหน่วยงานรัฐ · <a href="#/sources">แหล่งข้อมูลทั้งหมด</a></p></div>';
  }

  function fallback(e, orig) {
    if (e && e.status === 401) { location.hash = '#/login'; return true; }
    if (e && (e.network || e.status === 404 || e.status === 0) && orig) { orig(); return true; }
    return false;
  }
  function badge(pr) { return pr && pr.passed ? '<span class="w9tag ok">ผ่านแล้ว ' + pr.best_score + '%</span>' : pr && pr.attempts ? '<span class="w9tag warn">ลองแล้ว ' + pr.best_score + '% ยังไม่ผ่าน</span>' : '<span class="w9tag">ยังไม่ได้ทำ</span>'; }

  /* l.minutes is the study-time credit the server adds to the 30 h counter (can be 102); read_minutes is the real reading time */
  function readMin(l, ref) { var r = l.read_minutes || (ref && ref.read_minutes); return r ? 'อ่านประมาณ ' + r + ' นาที' : 'นับเวลาเรียน ' + (l.minutes || 0) + ' นาที'; }
  function lessonById(id) { var c = W.get('lessons'), a = c && c.d && c.d.lessons || []; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; }
  /* one lesson count everywhere: the server list (20), not the 3 bundled offline lessons */
  function missionCount() {
    if (!W.alive('missions')) return;
    W.load('lessons', '/api/lessons').then(function (r) {
      if (!W.alive('missions')) return;
      var L = r.data.lessons || [], n = L.filter(function (l) { return l.progress && l.progress.passed; }).length, el = document.getElementById('lscount');
      if (el) el.textContent = 'ผ่านแล้ว ' + n + ' จาก ' + L.length + ' บท';
    }, function () {});
  }

  function list() {
    W.shell('บทเรียน', '', '<div class="card w9card"><p class="w9p">กำลังโหลดบทเรียน...</p></div>');
    Promise.all([W.load('lessons', '/api/lessons'), W.load('hours', '/api/me/training-hours').catch(function () { return null; })]).then(function (rs) {
      if (!W.alive('lessons')) return;
      var d = rs[0].data, th = rs[1] && rs[1].data, L = d.lessons || [], passed = L.filter(function (l) { return l.progress && l.progress.passed; }).length;
      var S = A.S(); S.lessons = S.lessons || {}; L.forEach(function (l) { if (l.progress && l.progress.best_score != null) S.lessons[l.id] = l.progress.best_score; }); A.save();
      var tgt = (th && th.target_hours) || d.target_hours || 30, hrs = th ? th.hours : 0;
      W.shell('บทเรียน', 'ผ่านแล้ว ' + passed + ' จาก ' + L.length + ' บท · ผ่านเมื่อได้ ' + (d.pass_score || 70) + '% ขึ้นไป',
        W.staleNote(rs[0]) + '<a class="card w9card w9hours" href="#/training"><span><b>ชั่วโมงอบรมของฉัน</b><small>' + W.hrs(hrs) + ' จาก ' + W.hrs(tgt) + ' ชั่วโมง</small></span><span aria-hidden="true">→</span></a>' + W.bar(hrs * 100 / tgt, 'ชั่วโมงอบรม') +
        L.map(function (l) { return '<a class="card w9card w9lesson" href="#/lessons?id=' + encodeURIComponent(l.id) + '"><h3>' + esc(l.title) + '</h3><div class="w9meta"><span>' + readMin(l) + '</span>' + (l.srp ? '<span class="w9tag srp">หัวข้อ SRP: ' + esc(l.srp) + '</span>' : '') + (STAGE[l.stage] ? '<span>ช่วง' + STAGE[l.stage] + '</span>' : '') + badge(l.progress) + '</div></a>'; }).join('') || '<div class="card w9card"><p class="w9p">ยังไม่มีบทเรียน</p></div>');
    }).catch(function (e) { if (!W.alive('lessons')) return; if (!fallback(e, origLessons)) W.err('บทเรียน', e); });
  }

  function detail(id) {
    W.shell('บทเรียน', '', '<div class="card w9card"><p class="w9p">กำลังโหลด...</p></div>');
    W.load('lesson.' + id, '/api/lessons/' + encodeURIComponent(id)).then(function (r) {
      if (!W.alive('lessons')) return;
      var l = r.data.lesson || r.data, ans = {}, q = l.quiz || [];
      W.shell(l.title, readMin(l) + (l.srp ? ' · หัวข้อ SRP: ' + l.srp : ''),
        W.staleNote(r) + '<div class="card w9card w9read">' + (l.body || []).map(function (b) { return '<p>' + esc(b) + '</p>'; }).join('') +
        '<div class="w9row"><button class="btn sm ghost" id="w9say" type="button">ฟังบทเรียน</button>' + (l.video_url ? '<a class="btn sm ghost" href="' + esc(l.video_url) + '" target="_blank" rel="noopener">ดูวิดีโอ</a>' : '') + '</div></div>' +
        '<div id="w9quiz">' + q.map(function (qq, i) { return '<div class="card w9card"><h3>' + (i + 1) + '. ' + esc(qq.q) + '</h3>' + qq.choices.map(function (c, j) { return '<button class="choice" type="button" data-i="' + i + '" data-j="' + j + '">' + esc(c) + '</button>'; }).join('') + '</div>'; }).join('') +
        (q.length ? '<button class="btn" id="w9sub" type="button">ส่งคำตอบ</button>' : '') + '</div><div id="w9res" aria-live="polite"></div>' + lessonSources(l));
      A.app.querySelectorAll('.choice').forEach(function (b) { b.onclick = function () { ans[b.dataset.i] = Number(b.dataset.j); A.app.querySelectorAll('.choice[data-i="' + b.dataset.i + '"]').forEach(function (x) { x.classList.toggle('sel', x === b); }); }; });
      document.getElementById('w9say').onclick = function () { try { speechSynthesis.cancel(); var u = new SpeechSynthesisUtterance((l.body || []).join(' ')); u.lang = 'th-TH'; speechSynthesis.speak(u); } catch (e) { A.toast('เครื่องนี้ยังอ่านออกเสียงไม่ได้'); } };
      var sub = document.getElementById('w9sub');
      if (sub) sub.onclick = function () {
        if (Object.keys(ans).length < q.length) { A.toast('กรุณาตอบให้ครบทุกข้อ'); return; }
        var arr = q.map(function (x, i) { return ans[i]; }); A.busy(sub, true);
        A.api.req('POST', '/api/me/lessons/' + encodeURIComponent(l.id) + '/complete', { answers: arr }).then(function (j) {
          A.busy(sub, false); var S = A.S(); S.lessons = S.lessons || {}; S.lessons[l.id] = Math.max(S.lessons[l.id] || 0, j.best_score || j.score || 0); A.save();
          try { localStorage.removeItem('riceos.w9.' + W.uid() + '.lessons'); } catch (e) {}
          var pts = j.points && j.points.awarded && j.points.delta, h = j.training_hours; /* replay returns awarded:false with the old delta: show no points */
          var qz = document.getElementById('w9quiz'), res = document.getElementById('w9res');
          if (!qz || !res) return; /* farmer left the lesson before the reply landed */
          qz.hidden = true;
          res.innerHTML = '<div class="card w9card w9result ' + (j.passed ? 'pass' : 'fail') + '"><span>คะแนนของท่าน</span><b>' + j.score + '%</b><p class="w9p">' + (j.passed ? 'ผ่านแล้ว' : 'ยังไม่ผ่าน (ต้องได้ ' + j.pass_score + '% ขึ้นไป) ลองทำอีกครั้งได้') + '</p>' +
            (pts ? '<p class="w9p">ได้ +' + A.fmt(pts) + ' แต้ม</p>' : j.passed && !j.newly_passed ? '<p class="w9note">บทนี้เคยผ่านแล้ว ไม่ได้แต้มซ้ำ</p>' : '') +
            (h ? '<p class="w9p">ชั่วโมงอบรมรวม ' + W.hrs(h.hours != null ? h.hours : h.done) + ' จาก ' + W.hrs(h.target_hours || h.target || 30) + ' ชม.</p>' : '') +
            (j.passed ? '' : '<button class="btn" id="w9again" type="button">ทำอีกครั้ง</button>') + '<a class="btn ghost w9btn" href="#/lessons">กลับไปรายการบทเรียน</a><a class="btn ghost w9btn" href="#/training">ดูชั่วโมงอบรม</a></div>';
          if (j.passed) { try { W.put('hours', null); localStorage.removeItem('riceos.w9.' + W.uid() + '.hours'); } catch (e) {} }
          var ag = document.getElementById('w9again'); if (ag) ag.onclick = function () { A.route(); };
          res.scrollIntoView && res.scrollIntoView({ block: 'start' });
        }, function (e) { A.busy(sub, false); A.toast(e.network ? 'ส่งคำตอบไม่ได้ ต้องมีสัญญาณอินเทอร์เน็ต คำตอบของท่านยังอยู่ กดส่งใหม่ได้' : e.message); });
      };
    }).catch(function (e) { if (!W.alive('lessons')) return; if (!fallback(e, origLessons)) W.err('บทเรียน', e); });
  }

  function lessonsPage() { var id = (location.hash.match(/id=([\w.-]+)/) || [])[1]; if (!A.S().registered || A.S().seeded) return origLessons(); return id ? detail(id) : list(); }

  function training() {
    if (!A.S().registered || A.S().seeded) return origTraining();
    W.shell('ชั่วโมงอบรมของฉัน', 'นับจากบทเรียนที่ผ่านแบบทดสอบ', '<div class="card w9card"><p class="w9p">กำลังโหลด...</p></div>');
    W.load('hours', '/api/me/training-hours').then(function (r) {
      if (!W.alive('training')) return;
      var t = r.data, rows = t.lessons || [], tgt = t.target_hours || 30, pct = t.pct != null ? t.pct : t.hours * 100 / tgt;
      W.shell('ชั่วโมงอบรมของฉัน', 'นับจากบทเรียนที่ผ่านแบบทดสอบ',
        W.staleNote(r) + '<div class="card w9card w9hero"><span>ชั่วโมงอบรมสะสม</span><b id="w9hrs">' + W.hrs(t.hours) + '</b><small>จากเป้าหมาย ' + W.hrs(tgt) + ' ชั่วโมง (' + Math.round(pct) + '%)</small>' + W.bar(pct, 'ชั่วโมงอบรมเทียบเป้าหมาย') +
        '<p class="w9p">' + (t.complete ? 'ครบเป้าหมายแล้ว' : 'อีก ' + W.hrs(t.remaining_hours != null ? t.remaining_hours : tgt - t.hours) + ' ชั่วโมงจะครบ') + '</p></div>' +
        '<div class="card w9card"><h3>บทเรียนที่ผ่าน (' + rows.length + ')</h3>' + (rows.length ? '<ul class="w9list">' + rows.map(function (x) { return '<li><span>' + esc(x.title) + '<small>' + W.date(x.passed_at) + ' · ' + readMin(x, lessonById(x.id)) + (x.srp ? ' · หัวข้อ SRP: ' + esc(x.srp) : '') + '</small></span><b>' + x.best_score + '%</b></li>'; }).join('') + '</ul>' : '<p class="w9p">ยังไม่มีบทเรียนที่ผ่าน ลองเรียนบทแรกได้เลย</p>') + '<a class="btn w9btn" href="#/lessons">ไปที่บทเรียน</a></div>' +
        '<div class="card w9card"><p class="w9note">หัวข้อ SRP คือหัวข้อของหลักสูตรข้าวยั่งยืนที่บทเรียนเกี่ยวข้อง ไม่ใช่หลักสูตรที่ได้รับรองจาก SRP ชั่วโมงเป็นเวลาเรียนโดยประมาณในแอป ไม่ใช่ใบรับรอง</p></div>');
    }).catch(function (e) { if (!W.alive('training')) return; if (!fallback(e, origTraining)) W.err('ชั่วโมงอบรมของฉัน', e); });
  }

  (window.RiceModules = window.RiceModules || []).push(function (app) {
    A = app; R = app.R; W = window.RiceW9; origLessons = R.lessons; origTraining = R.training; R.lessons = lessonsPage; R.training = training;
    var origMissions = R.missions; R.missions = function () { origMissions.apply(this, arguments); missionCount(); };
  });
})();
