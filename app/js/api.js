/* RiceOS API client + photo outbox. Plain JS, no build. Codes to the RiceOS backend spec, section 4.
   API base: window.RICEOS_API_BASE, or localStorage 'riceos.api', or '' (same origin, /api/...). */
(function () {
  'use strict';
  var MSG = {
    consent_required: 'ต้องยินยอมการใช้ข้อมูลหลักก่อน', consent_version: 'ข้อความความยินยอมมีการปรับปรุง กรุณาเปิดแอปใหม่',
    bad_phone: 'เบอร์มือถือไม่ถูกต้อง ต้องเป็นตัวเลข 10 หลัก', weak_pin: 'PIN เดาง่ายเกินไป เช่น 123456 หรือเลขซ้ำ กรุณาเลือกใหม่',
    bad_name: 'กรุณากรอกชื่อ', phone_taken: 'เบอร์นี้ลงทะเบียนแล้ว เข้าสู่ระบบ หรือ ติดต่อเจ้าหน้าที่',
    bad_credentials: 'เบอร์หรือ PIN ไม่ถูกต้อง', locked: 'ใส่ PIN ผิดหลายครั้ง ถูกล็อกชั่วคราว', disabled: 'บัญชีนี้ถูกปิดใช้งาน กรุณาติดต่อเจ้าหน้าที่',
    no_session: 'กรุณาเข้าสู่ระบบอีกครั้ง', csrf: 'ส่งข้อมูลไม่สำเร็จ กรุณาเปิดแอปใหม่', daily_cap: 'ส่งรูปครบ 20 รูปแล้ววันนี้ จะส่งต่อพรุ่งนี้',
    storage_full: 'พื้นที่เก็บรูปของระบบเต็ม กรุณาติดต่อเจ้าหน้าที่', bad_code: 'รหัสจากเจ้าหน้าที่ไม่ถูกต้องหรือหมดอายุ',
    network: 'ติดต่อระบบไม่ได้ (ไม่มีสัญญาณอินเทอร์เน็ต) กรุณาลองใหม่', server: 'ระบบขัดข้อง กรุณาลองใหม่ภายหลัง'
  };
  MSG.unreachable = 'เชื่อมต่อระบบของโครงการไม่ได้ในขณะนี้ ข้อมูลของท่านยังอยู่ในเครื่อง กรุณาลองอีกครั้งภายหลัง';
  MSG.line_disabled = 'ยังไม่เปิดใช้การเข้าสู่ระบบด้วย LINE'; MSG.bad_ticket = 'ลิงก์เข้าสู่ระบบหมดอายุ กรุณาเริ่มใหม่'; MSG.line_taken = 'บัญชี LINE นี้ผูกกับบัญชีอื่นแล้ว';
  MSG.last_login_method = 'ต้องตั้งเบอร์มือถือและ PIN ก่อน จึงจะยกเลิกการผูก LINE ได้'; MSG.has_pin = 'บัญชีนี้มีเบอร์และ PIN อยู่แล้ว'; MSG.no_pin = 'บัญชีนี้ยังไม่ได้ตั้งเบอร์มือถือและ PIN';
  MSG.bad_national_id = 'เลขบัตรประชาชนไม่ถูกต้อง กรุณาตรวจสอบเลข 13 หลัก'; MSG.national_id_taken = 'เลขบัตรนี้ถูกใช้กับบัญชีอื่นแล้ว กรุณาติดต่อเจ้าหน้าที่'; MSG.already_verified = 'เลขบัตรของท่านผ่านการยืนยันแล้ว';
  MSG.national_id_disabled = 'ขณะนี้ยังไม่เปิดให้ยืนยันด้วยเลขบัตรประชาชน'; MSG.confirm_required = 'กรุณากดยืนยันการลบบัญชี';
  var base = ''; try { base = window.RICEOS_API_BASE || localStorage.getItem('riceos.api') || ''; } catch (e) { base = window.RICEOS_API_BASE || ''; }
  var cap = window.Capacitor, native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  if (!base && native) base = 'https://riceos.donaus.com'; /* bundled app (https://localhost origin) has no same-origin backend */
  base = String(base).replace(/\/+$/, '');
  var prefs = native && cap.Plugins ? cap.Plugins.Preferences : null, token = null;
  function lsTok(v) { try { if (v === undefined) return localStorage.getItem('riceos.token'); v ? localStorage.setItem('riceos.token', v) : localStorage.removeItem('riceos.token'); } catch (e) {} return null; }
  function getToken() { if (token) return Promise.resolve(token); if (!prefs) { token = native ? lsTok() : null; return Promise.resolve(token); } return prefs.get({ key: 'riceos.token' }).then(function (r) { token = r && r.value || null; return token; }).catch(function () { return null; }); }
  function setToken(t) { token = t || null; if (native && !prefs) lsTok(token); if (prefs) { try { t ? prefs.set({ key: 'riceos.token', value: t }) : prefs.remove({ key: 'riceos.token' }); } catch (e) {} } }

  function fail(status, j, network) {
    var code = network ? (typeof navigator !== 'undefined' && navigator.onLine === false ? 'network' : 'unreachable') : (j && j.error) || (status >= 500 ? 'server' : 'http_' + status);
    var e = new Error((j && j.message_th) || MSG[code] || MSG.server); e.code = code; e.status = status || 0; e.network = !!network; e.data = j || {};
    if (code === 'locked' && j && j.retry_after_s) e.message = 'ใส่ PIN ผิดหลายครั้ง ลองใหม่อีก ' + Math.max(1, Math.ceil(j.retry_after_s / 60)) + ' นาที หรือขอรหัสจากเจ้าหน้าที่';
    else if (MSG[code] && code !== 'phone_taken' && !(j && j.message_th)) e.message = MSG[code];
    return e;
  }
  function req(method, path, body, raw) {
    return getToken().then(function (tk) {
      var ctl = window.AbortController ? new AbortController() : null, timer = ctl ? setTimeout(function () { ctl.abort(); }, 15000) : null;
      var h = { 'X-RiceOS': '1' };
      if (tk) h.Authorization = 'Bearer ' + tk;
      var opt = { method: method, credentials: 'same-origin', headers: h, signal: ctl ? ctl.signal : undefined };
      if (raw) { h['Content-Type'] = raw.type || 'image/jpeg'; opt.body = raw; } else if (body !== undefined) { h['Content-Type'] = 'application/json'; opt.body = JSON.stringify(body); }
      return fetch(base + path, opt).then(function (r) {
        clearTimeout(timer);
        var ct = r.headers.get('content-type') || '';
        if (ct.indexOf('application/json') < 0) throw fail(r.status, null, r.status === 0 || r.ok || r.status === 404 ? true : false); /* HTML shell or missing backend = no backend */
        return r.json().then(function (j) { if (!r.ok) throw fail(r.status, j); return j; });
      }, function () { clearTimeout(timer); throw fail(0, null, true); });
    });
  }
  var API = { MSG: MSG, base: base, native: native, req: req };
  API.health = function () { return req('GET', '/api/health'); };
  API.me = function () { return req('GET', '/api/me'); };
  API.register = function (b) { b.client = native ? 'native' : 'web'; return req('POST', '/api/auth/register', b).then(function (j) { if (j.token) setToken(j.token); return j; }); };
  API.login = function (b) { b.client = native ? 'native' : 'web'; return req('POST', '/api/auth/login', b).then(function (j) { if (j.token) setToken(j.token); return j; }); };
  API.logout = function () { return req('POST', '/api/auth/logout', {}).then(function (j) { setToken(null); return j; }, function (e) { setToken(null); throw e; }); };
  API.reset = function (phone, code, pin) { return req('POST', '/api/auth/reset', { phone: phone, code: code, new_pin: pin }); };
  API.patchMe = function (b) { return req('PATCH', '/api/me', b); };
  API.changePin = function (o, n) { return req('PUT', '/api/me/pin', { old_pin: o, new_pin: n }); };
  API.consent = function (purpose, granted, version) { return req('POST', '/api/me/consents', { purpose: purpose, granted: granted, version: version }); };
  API.deleteMe = function (pin) { return req('DELETE', '/api/me', pin ? { pin: pin } : { confirm: true }).then(function (j) { setToken(null); return j; }); };
  API.putState = function (blob) { return req('PUT', '/api/me/state', { blob: blob }); };
  API.createPlot = function (b) { return req('POST', '/api/plots', b); };
  API.config = function () { return req('GET', '/api/config'); };
  API.lineStart = function () { return req('POST', '/api/auth/line/start', {}); };
  API.lineFinish = function (ticket, shared) { return req('POST', '/api/auth/line/finish', { ticket: ticket, client: native ? 'native' : 'web', shared_device: !!shared }).then(function (j) { if (j.token) setToken(j.token); return j; }); };
  API.lineRegister = function (b) { b.client = native ? 'native' : 'web'; return req('POST', '/api/auth/line/register', b).then(function (j) { if (j.token) setToken(j.token); return j; }); };
  API.linkLine = function () { return req('POST', '/api/me/line/start', {}); };
  API.unlinkLine = function () { return req('DELETE', '/api/me/line'); };
  API.addCredentials = function (phone, pin) { return req('POST', '/api/me/credentials', { phone: phone, pin: pin }); };
  API.putNationalId = function (number) { return req('PUT', '/api/me/national-id', { number: number, consent: true, version: 'id1' }); };
  API.deleteNationalId = function () { return req('DELETE', '/api/me/national-id'); };
  API.consentCurrent = function () { return req('GET', '/api/consent/current'); };

  /* ---------- outbox: photos stay in IndexedDB until the server confirms the upload ---------- */
  var DB = null;
  function db() {
    if (DB) return DB;
    DB = new Promise(function (ok, no) {
      if (!window.indexedDB) return no(new Error('no idb'));
      var r = indexedDB.open('riceos-outbox', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('items', { keyPath: 'client_uuid' }); };
      r.onsuccess = function () { ok(r.result); }; r.onerror = function () { no(r.error); };
    });
    return DB;
  }
  function tx(mode, fn) { return db().then(function (d) { return new Promise(function (ok, no) { var t = d.transaction('items', mode), res = fn(t.objectStore('items')); t.oncomplete = function () { ok(res && res.result !== undefined ? res.result : undefined); }; t.onerror = t.onabort = function () { no(t.error); }; }); }); }
  var OB = {};
  OB.add = function (item) { return tx('readwrite', function (s) { return s.put(item); }); };
  OB.all = function () { return tx('readonly', function (s) { return s.getAll(); }).then(function (a) { return (a || []).sort(function (x, y) { return (x.meta.client_time > y.meta.client_time) ? 1 : -1; }); }, function () { return []; }); };
  OB.del = function (id) { return tx('readwrite', function (s) { return s.delete(id); }); };
  OB.count = function () { return OB.all().then(function (a) { return { pending: a.filter(function (x) { return !x.failed; }).length, failed: a.filter(function (x) { return x.failed; }).length }; }); };
  var flushing = null;
  /* hooks.prepare(item) may fill item.meta.plot_id; hooks.sent(item) is called after each upload. Resolves {sent, left, reason}. */
  OB.flush = function (hooks) {
    if (flushing) return flushing; hooks = hooks || {};
    flushing = OB.all().then(function (items) {
      var out = { sent: 0, left: 0, reason: null }, i = 0;
      function next() {
        if (i >= items.length) return out;
        var it = items[i++]; if (it.failed) return next();
        if (hooks.prepare) hooks.prepare(it);
        if (!it.meta.plot_id) { out.left++; out.reason = out.reason || 'plot'; return next(); }
        var step = it.evid ? Promise.resolve({ evidence: { id: it.evid } }) : req('POST', '/api/evidence', it.meta);
        return step.then(function (j) {
          var id = (j.evidence || j).id;
          if (!it.evid) { it.evid = id; return OB.add(it).then(function () { return id; }); }
          return id;
        }).then(function (id) { return req('PUT', '/api/evidence/' + encodeURIComponent(id) + '/photo', undefined, it.blob); })
          .then(function () { return OB.del(it.client_uuid).then(function () { out.sent++; if (hooks.sent) hooks.sent(it); return next(); }); })
          .catch(function (e) {
            if (e.network || e.status === 401 || e.status === 429 || e.status >= 500 || e.code === 'storage_full') { out.left++; out.reason = e.code; return finish(items, i, out); }
            it.failed = e.code; out.left++; out.reason = e.code; return OB.add(it).then(next); /* permanent rejection: keep the photo, flag it, do not retry */
          });
      }
      function finish(all, idx, o) { o.left += all.slice(idx).filter(function (x) { return !x.failed; }).length; return o; }
      return next();
    }).catch(function () { return { sent: 0, left: 0, reason: 'idb' }; }).then(function (o) { flushing = null; return o; });
    return flushing;
  };
  API.outbox = OB;
  window.RiceAPI = API;
})();
