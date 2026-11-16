/* RiceOS Thai ID card reader wrapper. Plain JS, no build. Exposes window.RiceIdReader.
   Native (Android app): delegates to the Capacitor plugin "ThaiIdReader" (USB OTG CCID reader).
   Web / no plugin / no reader: isAvailable() resolves false and the manual + verifier-queue path stays the way in.
   Simulator: a made-up checksum-valid test card, only when window.RICEOS_DEBUG === true (dev/debug builds). The native
   plugin applies the same rule itself (debuggable APK only), so a release build can never simulate.
   API: isAvailable() -> Promise<boolean>; requestPermission() -> Promise<true>; readCard() -> Promise<{idNumber,
   titleTh, firstNameTh, lastNameTh, tambon, amphoe, province}>; rejects with Error whose .code is one of
   NO_READER | NO_CARD | PERMISSION_DENIED | READ_FAILED. Card data is never logged or stored here. */
(function () {
  'use strict';
  var CODES = { NO_READER: 1, NO_CARD: 1, PERMISSION_DENIED: 1, READ_FAILED: 1 };
  var cap = window.Capacitor;
  var native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var plugin = native && cap.Plugins ? cap.Plugins.ThaiIdReader : null;
  var simOn = false;

  function err(code, msg) { var e = new Error(msg || code); e.code = CODES[code] ? code : 'READ_FAILED'; return e; }
  function wrap(e) { return err(e && e.code, e && e.message); }
  function debugAllowed() { return window.RICEOS_DEBUG === true; }

  /* Made-up card. ID starts with 0 (no real card does) and has a valid check digit. Mirrors the native simulator. */
  var SIM = { idNumber: '0123456789019', titleTh: 'นางสาว', firstNameTh: 'ทดสอบ', lastNameTh: 'ระบบทดสอบ',
    tambon: 'บางทดสอบ', amphoe: 'เมืองทดสอบ', province: 'สุพรรณบุรี' };
  function checkDigit(id) { var s = 0, i; for (i = 0; i < 12; i++) s += (id.charCodeAt(i) - 48) * (13 - i); return (11 - s % 11) % 10; }
  SIM.idNumber = '012345678901' + checkDigit('012345678901');

  function isAvailable() {
    if (simOn) return Promise.resolve(true);
    if (!plugin) return Promise.resolve(false);
    return plugin.isAvailable().then(function (r) { return !!(r && r.available); }, function () { return false; });
  }
  function requestPermission() {
    if (simOn) return Promise.resolve(true);
    if (!plugin) return Promise.reject(err('NO_READER', 'no reader'));
    return plugin.requestPermission().then(function () { return true; }, function (e) { throw wrap(e); });
  }
  function readCard() {
    if (simOn) return Promise.resolve({ idNumber: SIM.idNumber, titleTh: SIM.titleTh, firstNameTh: SIM.firstNameTh,
      lastNameTh: SIM.lastNameTh, tambon: SIM.tambon, amphoe: SIM.amphoe, province: SIM.province });
    if (!plugin) return Promise.reject(err('NO_READER', 'no reader'));
    return plugin.readCard().then(function (r) {
      return { idNumber: r.idNumber, titleTh: r.titleTh, firstNameTh: r.firstNameTh, lastNameTh: r.lastNameTh,
        tambon: r.tambon, amphoe: r.amphoe, province: r.province };
    }, function (e) { throw wrap(e); });
  }
  /* Debug only. Returns Promise<boolean> = whether the simulator is now on. Ignored (false) in release builds. */
  function enableSimulator(on) {
    on = !!on;
    if (plugin) {
      return plugin.setSimulator({ enabled: on }).then(function (r) { simOn = !!(r && r.simulator); return simOn; }, function () { simOn = false; return false; });
    }
    simOn = on && debugAllowed();
    return Promise.resolve(simOn);
  }
  function isSimulator() { return simOn; }

  window.RiceIdReader = { isAvailable: isAvailable, requestPermission: requestPermission, readCard: readCard,
    enableSimulator: enableSimulator, isSimulator: isSimulator, CODES: Object.keys(CODES) };
})();
