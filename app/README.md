# RiceOS farmer app (PWA)

Plain HTML/CSS/JS, no build step, no server, no CDN at runtime. Data stays in the phone's localStorage.
Screens follow คุณนพดล's 7 images (docs/nopadon-7nov-0850/7484-7490.jpg). Flagged texts/figures are switched in `content/flags.json` (default = identical to his images).

## Run locally
```
cd /home/jarin/rice-farmer/app
python3 -m http.server 8080
# open http://localhost:8080/            (new farmer: PDPA consent -> 4-step registration)
# open http://localhost:8080/?seed=1     (loads ลุงสมชาย as on his screens)
```
Service worker, camera and GPS need `localhost` or HTTPS. On a phone, serve it over HTTPS (any free static host or a tunnel); plain http on a LAN IP will not install and will not get camera/GPS.

## Install on the phone
- Android (Chrome): open the HTTPS URL -> menu ⋮ -> "Install app" / "Add to Home screen".
- iPhone (Safari only): open the URL -> Share -> "Add to Home Screen". iOS 16.4+ runs it standalone; camera works from a user tap.

## Tests
```
node tests/smoke.cjs     # referenced files exist, JS/JSON parse, every shipped file is in the SW cache, banned UI words absent
node tests/shots.cjs     # headless Chromium screenshots (393x852 @2.168x) + side-by-side with his images -> tests/shots/, fails on console errors
```

## Store publishing -- NOT done
Publishing to Google Play (one-time USD 25 developer fee) or the Apple App Store (USD 99 per year) costs money and needs Jarin's approval. Nothing has been registered or paid. `capacitor.config.json` is only a stub for wrapping later; no Capacitor packages are installed.

## Files
- `index.html`, `css/app.css`, `js/app.js` (screens, router, capture), `js/points.js` (port of proto/riceproto/engine.py evaluate/caps)
- `content/flags.json` -- one switch per flagged item
- `data/ruleset_v2.json` (copy of proto/rules), `data/knowledge.json` (mentor answers; only docs/research/05-verified-facts.md figures), `data/lessons.json`
- `img/` -- regions cropped from his 7 images (logos, photos, mascot, tile icons); `icons/` -- generated with PIL; `fonts/` Prompt + Sarabun (OFL); `vendor/` qrcode.js, jsQR
