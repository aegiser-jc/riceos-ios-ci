/* RiceOS service worker: the app opens offline. Page, CSS, JS and JSON are network-first (cache when offline or slow), so a deploy shows on the
   first open; images and fonts are cache-first. Bump VERSION on every release.
   18 Nov (v37, kept in v38, v39, v40, v41, v42, v43, v44, v45, v46, v47, v48): CSS/JS are linked with ?v=<n> from index.html and precached under those exact URLs; when a new version replaces an older one,
   activate reloads every open /next/ window once, so a page that an older cache-first SW (v35 and before) answered from its cache shows the
   new CSS without the user clearing anything. Keep these ?v= in step with index.html. */
const VERSION = 'riceos-next-v48';
const ASSETS = [
  './',
  './content/flags.json',
  './content/privacy.json',
  './css/app.css?v=48',
  './css/w8.css?v=48',
  './css/w9.css?v=48',
  './css/w9b.css?v=48',
  './css/vc6.css?v=48',
  './css/dailycheck.css?v=48',
  './data/knowledge.json',
  './data/lessons.json',
  './data/ruleset_v2.json',
  './fonts/Prompt-Bold.ttf',
  './fonts/Prompt-SemiBold.ttf',
  './fonts/Sarabun-Bold.ttf',
  './fonts/Sarabun-Regular.ttf',
  './icons/apple-touch-icon.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-192.png',
  './icons/maskable-512.png',
  './img/avatar.png',
  './img/banner-rice.jpg',
  './img/buyer1.jpg',
  './img/buyer2.jpg',
  './img/buyer3.jpg',
  './img/chat-rice.jpg',
  './img/coins.jpg',
  './img/ears-thumb.jpg',
  './img/header-photo.jpg',
  './img/ic-carbon.jpg',
  './img/ic-gov.jpg',
  './img/ic-market.jpg',
  './img/ic-mentor.jpg',
  './img/ic-mission.jpg',
  './img/ic-plot.jpg',
  './img/ic-soil.jpg',
  './img/ic-wallet.jpg',
  './img/landscape.jpg',
  './img/logo-pl.png',
  './img/logo.png',
  './img/map-thumb.jpg',
  './img/map.jpg',
  './img/mascot-head.png',
  './img/mascot-mkt.jpg',
  './img/mascot-plot.jpg',
  './img/mascot-title.png',
  './img/mascot-top.jpg',
  './img/mascot.jpg',
  './img/mission-card.jpg',
  './img/opt1.jpg',
  './img/opt2.jpg',
  './img/opt3.jpg',
  './img/trend-chart.jpg',
  './index.html',
  './js/api.js?v=48',
  './js/app.js?v=48',
  './js/enrol.js?v=48',
  './js/idreader.js?v=48',
  './js/league.js?v=48',
  './js/w9b.js?v=48',
  './js/vc6.js?v=48',
  './js/booth.js?v=48',
  './js/fieldreview.js?v=48',
  './js/dailycheck.js?v=48',
  './js/plotplan.js?v=48',
  './js/awd.js?v=48',
  './content/rewards.json',
  './js/lessons.js?v=48',
  './js/native.js?v=48',
  './js/plots2.js?v=48',
  './js/points.js?v=48',
  './js/points2.js?v=48',
  './js/regpoint.js?v=48',
  './manifest.webmanifest',
  './vendor/jsqr.js?v=48',
  './vendor/qrcode.js?v=48'
];
const OWN = new Set(ASSETS.map(a => new URL(a, self.registration.scope).pathname));
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS.map(a => new Request(a, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
/* Delete only our own old caches (riceos-next-vN) and legacy /next/ names riceos-v2x/v3x. Root SW owns riceos-vN (v7);
   game, nalamun etc. caches are never touched. */
const STALE = k => k !== VERSION && (/^riceos-next-v\d+$/.test(k) || /^riceos-v(2\d|3\d)$/.test(k));
self.addEventListener('activate', e => {
  const cleaned = caches.keys().then(ks => { const old = ks.filter(STALE); return Promise.all(old.map(k => caches.delete(k))).then(() => old.length); });
  e.waitUntil(cleaned.then(() => self.clients.claim()));
  /* an older release was here: its pages may still show the old CSS/JS from its cache. Reload each open window once (navigate() needs the
     claim above). Not inside waitUntil: the reload's own fetch waits for this activation to finish, so waiting on it would deadlock.
     Runs once per version, so it cannot loop; the page-side controllerchange handler (app.js) skips its own reload after this.
     First install (no old cache): nothing old on screen, no reload. */
  cleaned.then(n => n && self.clients.claim().then(() => self.clients.matchAll({ type: 'window' }))
    .then(cs => cs.forEach(c => c.navigate(c.url).catch(() => {})))).catch(() => {});
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  const path = new URL(e.request.url).pathname;
  if (path.startsWith('/api/')) return; /* the API is never cached and never answered with the app shell */
  if (path.startsWith('/next/game-')) return; /* games (/next/game-np, game-cx ...) have their own SW; never answer or cache them here */
  const net = () => fetch(e.request).then(res => {
    /* cache only the app's own files: the ASSETS list, or a non-HTML file under /next/; never an HTML fallback for an unknown path */
    const own = OWN.has(path) || (path.startsWith('/next/') && !(res.headers.get('content-type') || '').includes('text/html'));
    if (res.ok && own) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  });
  const cached = () => caches.match(e.request, { ignoreSearch: true });
  /* 17 Nov (PingEris "gap still tight"): cache-first served the previous release's CSS on the first open after every deploy.
     Page, CSS, JS and JSON now come from the network; the cache answers offline, on error, or after 4 s without a reply. */
  if (e.request.mode === 'navigate' || /\.(css|js|json|html)$/.test(path) || path.endsWith('/')) {
    e.respondWith(new Promise(done => {
      let settled = false; const give = r => { if (!settled && r) { settled = true; done(r); } };
      const fallback = () => cached().then(hit => hit || caches.match('./index.html')).then(r => { if (r) give(r); return r; });
      const t = setTimeout(fallback, 4000);
      net().then(res => { clearTimeout(t); give(res); }, () => { clearTimeout(t); fallback().then(r => { if (!r) give(Response.error()); }); });
    }));
    return;
  }
  e.respondWith(cached().then(hit => hit || net()).catch(() => caches.match('./index.html')));
});
