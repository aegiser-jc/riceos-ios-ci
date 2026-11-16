/* RiceOS native bridge (iOS app). When the page runs inside the Capacitor app AND the plugin is in that build
   (iOS has @capacitor/camera + @capacitor/geolocation; the Android build does not), use the native plugin.
   Everywhere else (browser, LINE, Android app) fall through to the web APIs unchanged. Plain JS, no build. */
(function () {
  'use strict';
  var cap = window.Capacitor, native = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  function plugin(n) { return native && cap.Plugins && cap.Plugins[n] && typeof cap.Plugins[n][n === 'Camera' ? 'getPhoto' : 'getCurrentPosition'] === 'function' ? cap.Plugins[n] : null; }
  var Geo = plugin('Geolocation'), Cam = plugin('Camera');
  /* Geolocation with the navigator.geolocation callback shape: success({coords:{latitude,longitude,accuracy}}), error({code}) where 1 = denied */
  function geoAvailable() { return !!(Geo || navigator.geolocation); }
  function getPosition(ok, no, opt) {
    if (!Geo) return navigator.geolocation.getCurrentPosition(ok, no, opt);
    opt = opt || {};
    Geo.getCurrentPosition({ enableHighAccuracy: !!opt.enableHighAccuracy, timeout: opt.timeout || 15000, maximumAge: opt.maximumAge || 0 }).then(function (p) {
      var c = (p && p.coords) || {};
      ok({ coords: { latitude: c.latitude, longitude: c.longitude, accuracy: c.accuracy }, timestamp: p && p.timestamp });
    }, function (e) {
      var code = String((e && e.code) || ''), msg = String((e && e.message) || '');
      var denied = /GLOC-000[38]$/.test(code) || /denied|restricted/i.test(msg); /* 0003 denied, 0008 restricted (Settings > Privacy) */
      if (no) no({ code: denied ? 1 : 2, message: msg });
    });
  }
  /* Native camera: resolves a JPEG Blob, null when the farmer cancelled; rejects {denied:true} when camera access is off */
  function takePhoto() {
    return Cam.getPhoto({ source: 'CAMERA', resultType: 'uri', quality: 85, width: 2048, correctOrientation: true, saveToGallery: false, allowEditing: false })
      .then(function (ph) { return fetch(ph.webPath).then(function (r) { return r.blob(); }).then(function (b) { return b.type ? b : new Blob([b], { type: 'image/' + (ph.format || 'jpeg') }); }); },
        function (e) { var m = String((e && e.message) || ''); if (/cancel/i.test(m)) return null; var x = new Error(m); x.denied = /denied|access|permission/i.test(m); throw x; });
  }
  /* Capacitor App 'resume' (app back to foreground): callers use it to retry the photo outbox */
  function onResume(fn) { var A = native && cap.Plugins && cap.Plugins.App; if (A && A.addListener) { try { A.addListener('resume', fn); } catch (e) {} } }
  window.RiceNative = { native: native, camera: !!Cam, geo: !!Geo, geoAvailable: geoAvailable, getPosition: getPosition, takePhoto: Cam ? takePhoto : null, onResume: onResume };
})();
