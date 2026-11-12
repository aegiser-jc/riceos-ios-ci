# W4 app integration -- handoff
Status: done (not deployed). W4c (v9) below. W4b: real-backend alignment, LINE Login, national ID, sol-review fixes, sw riceos-v8. Verified against the real backend.

## Done
- app/js/api.js (new): RiceAPI fetch wrapper (X-RiceOS, 15 s timeout, Thai error map, Bearer for native), IndexedDB outbox `riceos-outbox` + flush. API base: window.RICEOS_API_BASE or localStorage `riceos.api`, default same origin.
- app/js/app.js: register (consent c2 -> account+PIN -> plot -> voice, 3 steps), #/login, #/reset, #/settings (consents, change PIN, logout, delete account), #/privacy, router guard (401 -> #/login, no backend -> keeps working offline), hydrate from GET /api/me, debounced PUT /api/me/state (5 s), capture() resizes to 1024 px JPEG q0.6 and queues to the outbox, flush on start / online / 60 s / visible, badge "รอส่ง N รายการ" on home and settings. ID-card step, idnum, idcam, checkId, hash and idHash removed (a stored idHash is deleted on load).
- app/sw.js: riceos-v7, /api/ bypass, api.js and content/privacy.json in ASSETS, img/idcard-scan.jpg removed.
- app/content/privacy.json (new, texts c2), app/css/app.css (auth styles at the end), app/index.html (api.js before app.js).
- Tests: app/tests/smoke.cjs updated (v7, api bypass, ASSETS, no idnum/idHash, new routes); app/tests/stub-api.cjs (local stub, tests only); app/tests/e2e.cjs (53 checks, Playwright at /tmp/claude-1001/pw/node_modules/playwright-core, or PLAYWRIGHT_PATH). Screenshots: app/tests/shots/w4/.

## Next
1. When W1 is up, run the app against the real API (set localStorage riceos.api or serve same-origin) and check the field names the app assumes: user.public_id, plots[].public_id / sow_date / kratong_count, evidence.public_id, GET /api/me state shape ({state:{blob}} or the blob itself; both handled).
2. controller_name and contact in privacy.json are placeholders pending the DPO / project owner (D-open in plan).
3. Native bundle: set window.RICEOS_API_BASE in the Capacitor build and confirm Preferences plugin name for the Bearer token.

## Tried and rejected
- Playwright python / PIL for the test JPEG: not installed on vm2; the JPEG is built in the browser and an APP1 segment is spliced in by Node.

## Facts worth not re-discovering
- The app only knows the first plot for capture (P()); extra plots are synced via syncPlot on save.
- Registered user with no reachable backend (HTML 200 from /api) is treated as offline, not logged out.
- Hash unchanged (#/home) does not fire hashchange; use goHome().
- Existing smoke requires the wording "รอส่งเมื่อระบบกลางพร้อม" to stay in app.js (still in the points screen).

## W4b (this pass)
- Done: api.js ids fixed (plots[].id, evidence.id; the API has no public_id on those), API.config/lineStart/lineFinish/lineRegister/linkLine/unlinkLine/addCredentials/putNationalId/deleteNationalId, offline vs unreachable messages (navigator.onLine), Thai msgs for new codes.
- app.js: getConfig/lineAllowed (hidden when line_login off or window.Capacitor platform ios), login = LINE main + phone ghost, R.line (#/line?r=login|register|linked&ticket|error, ticket stripped from URL), LINE register consent screen, R.idcheck (own consent id1, optional, skip, ?back=settings), settings: login methods (link/unlink LINE, add phone+PIN), ID status+last4+send/erase, delete without PIN for LINE-only, change-PIN hidden w/o PIN. Privacy: summary + collapsible sections, ID wording corrected, raw URL removed.
- Review (sol): nav hidden on login/reset/register/line/idcheck (body.nonav), 88px clearance, PIN empty-slot placeholder + error under field, 24-32px less register header, workflow panel removed, +0 แต้ม replaced, >=48-56px targets, red delete, voice radio.
- Tests: tests/real-backend.cjs (spawns backend/src/server.mjs, temp DB + PHOTO_DIR, same-origin proxy, fake LINE) + tests/e2e-real.cjs (66 checks); e2e.cjs (stub) and smoke.cjs kept green. Run: node app/tests/e2e-real.cjs (about 100 s).
## Next
1. Real LINE channel: untested live (fake only). Console must register LINE_REDIRECT_URI; app only needs LINE_APP_URL = site origin.
2. Reset-PIN is covered by the stub only (real needs an admin-issued code).
3. Admin ID queue/reveal screens are not in app/ (backend API ready).
## Facts
- Real API: me.state is the blob itself; plots[].id / evidence.id; ID consent not in me.consents (use user.national_id).
- Backend cookies are Secure+SameSite=Strict: test origin must be http://127.0.0.1 (Chromium treats it as secure) and RICEOS_ORIGINS must list it.
- No git repo in /home/jarin/rice-farmer: sha256 of changed files in the final reply.

## W4c (sol round 2 fixes + 3 scored rounds)
Status: done (not deployed), sw riceos-v9. Sol overall 5 -> 6 -> 6 (ref itself 8); target 9 not reached.
- Done: PIN placeholder text (no hollow squares), one step heading, compact auth header, Thai sow date (#pd transparent date input over #pdt), idcheck Thai checksum client-side (red state, button disabled, nothing reaches pending), 'id1' removed (app.js + privacy.json), unlink disabled with reason, LINE-only delete via tick-box, in-flow AI row (.askai) replaces mascot/bubble, calm weather banner when no weather data, 'ยังไม่เชื่อมต่อ/รอประเมิน' states, labels ส่งเลขบัตร / เพิ่มเบอร์และ PIN, toast at bottom, 52px back/links, bordered check rows, desktop: top sticky nav, 1180px card, two-column home/settings/ID/register.
- Tests: smoke, e2e (stub), e2e-real all green (e2e-real now also checks 48px targets, nav clearance at end of scroll, invalid ID). VIEW=desk SHOT_OUT=dir node tests/e2e-real.cjs shoots desktop 1440x900. tests/score-sol.sh <round> <phone-dir> <desk-dir> runs Sol.
## Next
1. LINE-only account deletion: backend re-auth (LINE) instead of tick-box.
2. Real-device check of PIN sheets with keyboard open; one icon family instead of emoji.

## 13 Nov 2026 -- intern pre-check fixes (sw riceos-v10), live at /next/
- Consent screen short text + c1 label (register and LINE) now state photos + GPS collected, no ID-card photo, ID number only with separate consent -> js/app.js; matches content/privacy.json c2 (unchanged, already correct).
- Date field: stray `.dt` legend-dot rule (9x9) shrank `.datebox .dt` -> override at end of css/app.css. Chips (.seg, .credit) shrink <=400px.
- QR capture modal + camera: closed on route change/Back (capClose in route()), late getUserMedia stream stopped. Toast replaces previous. Points preview rounded + "ประมาณ".
- Not done: LOW 6 (desktop nav inconsistency), preview vs actual points rule mismatch (needs rules owner).
- Tests: smoke, e2e (new consent + modal/camera checks), e2e-real all green. Deployed: riceos-web main 81a63bb, sw d41ca38dc5af, app.js ad1d55bdc144, css f1fe12241683.

## 12 Nov 2026 -- age/guardian required checkbox (sw riceos-v13)
- Row `label.chk.req #ag` "ฉันอายุ 20 ปีขึ้นไป หรือผู้ปกครองยินยอมให้ใช้งานแล้ว" on consent screen (#agree) and LINE register (#go): button disabled + red hint #agh until ticked. consent.age_guardian=true in API.register / lineRegister and S.consent.age_guardian (local). css/app.css end block; stub stores purpose age_guardian (4 rows).
- Tests: smoke/e2e/e2e-real tick #ag; asserts blocked-until-ticked, >=52px, clip @360/390/1440, stub row stored, real /api/me consents.age_guardian===true (warn-only if backend lacks it).
- Not done: settings screen has no age_guardian toggle (not requested). Clip audit script needs ai4; replaced by Playwright bounds check.
