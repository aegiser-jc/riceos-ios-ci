/* RiceOS service worker: cache-first app shell so the app opens offline. Bump VERSION on every release. */
const VERSION = 'riceos-v12';
const ASSETS = [
  './',
  './content/flags.json',
  './content/privacy.json',
  './css/app.css',
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
  './js/api.js',
  './js/app.js',
  './js/points.js',
  './manifest.webmanifest',
  './vendor/jsqr.js',
  './vendor/qrcode.js'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  if (new URL(e.request.url).pathname.startsWith('/api/')) return; /* the API is never cached and never answered with the app shell */
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
