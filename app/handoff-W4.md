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

## vc4 fixes (stage A, 13 Nov 2026, sw riceos-v16)
Status: done, not deployed (stage C). smoke, e2e (+12 vc4 checks), e2e-real (+2), backend npm test 64/64 green at default speed.
## Done
- #1 bad_gps dead end -> js/app.js failDialog()/readGps()/GPS_HELP (badge tap opens dialog: Thai how-to, ลองใหม่ = fresh GPS read then resend with NEW coords, out-of-Thailand reading not resent, delete+reshoot); capture sheet has "ลองหาพิกัดใหม่" after a GPS failure; api.js OB.update, MSG.bad_gps.
- #2 counter after relogin -> server ALREADY returns it (GET /api/evidence?since=): app.js pullToday() (called after hydrate and on /api/me load), done-count now compares local day; api.js API.evidenceSince. Backend unchanged.
- #3 add-plot date label -> app.js R.plotedit now calls wireDate(); plot lat/lon: locatePlot() best-effort GPS on save, sent only when inside Thailand (plotBody).
- #4 photo sheet: no layout jump (#vbox fixed 4:3 box shows the confirmation panel when preview collapses), placeholder "เช่น RICE-TUBE-A-1", hint clears on valid typed code (oninput). Beauty/styling untouched (stage B).
- sw riceos-v16 (sw.js, smoke.cjs).
- Tests: e2e.cjs 7b block, e2e-real.cjs counter check, stub-api GET /api/evidence, backend test/evidence.test.mjs "vc4: ...".
## Next
1. Stage B: photo bottom-sheet beauty (8.5 -> 9). 2. Stage C: deploy/build.
## Facts
- Offline sync delay (~1 min) is the 60 s flush interval; unchanged.
- sha256(12): 777fc1752b97 js/app.js;139a7fb44788 js/api.js;f2021f775f3b sw.js;fc1c605aae2d tests/e2e.cjs;7a8d31ea330c tests/e2e-real.cjs;30f45c1ca093 tests/stub-api.cjs;76b6135ef187 tests/smoke.cjs;f451ce8cc742 ../backend/test/evidence.test.mjs;

## vc4 stage B: photo/evidence sheet beauty (13 Nov 2026, sw riceos-v16 unchanged)
Status: done (3 iteration rounds used); Sol did NOT reach 9 on any viewport. Not deployed.
## Done
- Sheet restyled: flex column (scroll body + pinned footer), grab handle, fixed-height preview (clamp 160-200px, no jump), QR aiming guide, compact green confirmation panel with water icon, equal-width pill toggle for มีน้ำ/แห้ง (aria-pressed, .on), pinned CTA "📷 ถ่ายรูปยืนยัน" 54px, Close 48px, green focus ring. Behaviour of stage A (retry dialog, counter, date label, no-jump, hint clearing) unchanged. -> js/app.js capture() markup, css/app.css (end of file, ".capsheet").
- New: tests/shots-sheet.cjs (render a/b states at 390x844@2x and 360x640@2x, fake camera), tests/score-sol-sheet.sh (Codex gpt-6.1-sol). Shots: tests/shots/sheet/sheet-{a,b}-{390x844,360x640}.png (a=live preview, b=code+state chosen).
- Sol scores (a-390, b-390, a-360, b-360; reference): R1 baseline 6,5,5,4 (ref 8); R2 6,5,6,5 (7); R3 6,7,6,7 (8); R4 6,7,6,6 (8). Outputs /tmp/claude-1001/sol-sheet-{1..4}.md. Sol rates the partner's own reference 7-8, so 9 is likely unreachable on this scale.
- Tests default speed: smoke OK (56 sw assets), e2e 82 ok / E2E OK (clip check clean, 0 console errors), e2e-real 97 ok / REAL E2E OK, backend npm test 64/64.
- sha256 sw.js f2021f775f3bb09300edcada4fa54dd33c20abc1b61cd4eb64b56b21a3b97869
## Next
1. Sol's last open items: confirmation panel shorter/horizontal (but fixed height is what stops the layout jump), remove duplicate confirmation (qrok text must keep the checkmark: e2e asserts it), radio-style water choice + legend, "รหัสท่อ" persistent label, SVG icons instead of emoji, disable CTA until tube+state chosen (changes behaviour, not done).
2. Stage C deploy/build. A human/independent look at the real render is needed to judge the 9 bar.

## vc4 stage C: deploy (13 Nov 2026, sw riceos-v16)
Status: done. riceos-web main 1d74ecb1597343a27853e41b3198fa2dec9d1f1d (site/next synced from app/, excl. tests, *.md, capacitor.config.json). No backend release (source unchanged).
- Verified live https://riceos.donaus.com: /next/sw.js sha f2021f775f3b = app/sw.js, has riceos-v16; root /sw.js 11865c79210b unchanged; /next/ 200 text/html; /next/js/app.js (f01fe436bd98) and /next/css/app.css (b6db26cbf508) correct type and equal to app/; /api/health 200 ok.
- Token: ~/private/github/token-voyiro-org via ephemeral GIT_ASKPASS in scratchpad (deleted).

## W8 app: registration point, plot spec, enrolment, checklist, SRP, privacy (13 Nov 2026, sw riceos-v18)
Status: done; repo 8ba844e; published to /next/ via riceos-web main 7d14d4c (verified: /next/sw.js sha 496c5284e814 = app/sw.js riceos-v18, regpoint/plots2/enrol/w8.css/app.js equal to repo with right content-types, root /sw.js 11865c79210b unchanged, /api/health 200). Not in /next/: content/lessons-*.json (backend serves them). Backend npm test: 84 pass, 1 fail (auth lockout-expiry test, clock-based, not touched by W8; 2 fails seen once under load). REAL CARD READER NEVER TESTED (simulator only, window.RICEOS_DEBUG=true).
## Done
- NEW js/regpoint.js (#/regpoint): staff sign-in (admin cookie + TOTP, registrar/admin only) -> consent on the tablet FIRST (age/guardian, public_rank, baac, national_id yes/no) -> RiceIdReader.readCard (or manual form with checksum) -> confirm shows only name + tambon/amphoe/province -> POST /api/admin/registration-point/register -> claim code big + QR -> next; recent list with last4 + re-issue code. ID number lives in one closure variable, wiped on submit/cancel/3 min idle; never rendered, never logged. 1280x800 two-column, phone stacks.
- Order note: brief said read -> consent; plugin HANDOFF + scope doc s.6 say consent BEFORE read (PDPA), so consent screen comes first.
- NEW js/plots2.js: area rai/ngan/wa, soil, irrigation, method, tenure, owner, GPS point, polygon by walking the bund (3-50 pts), plot code RP.. + QR + GPS status + "measure again" on #/plot. Hooks: RiceP2.formHtml/read/body/absorb called from app.js plotForm/savePlotForm/plotBody/syncPlot/hydrate.
- NEW js/enrol.js: #/enrol (cycles, status, village/tambon/amphoe/province, plot, withdraw), #/claim (farmer enters the claim code + phone + PIN -> /api/auth/claim), #/baac checklist (no bank link, no eligibility claim; wording needs Jarin ok), #/training (hours from passed lessons), SRP tag on lessons (data/lessons.json: minutes, srp). Entry links on home/settings/login via RiceApp.after hooks.
- app.js (minimal): RiceApp hook object + RiceModules loader, PUBLIC/nav lists, GPS FIX: register step 2 does locatePlot().then(syncPlot) with Thai toast when no GPS; locatePlot returns bool, stores acc, sets gpsDenied; flushOutbox retries GPS (max 3, not after denial) and PATCHes plots with pid+lat but gpsSent=false. api.js: API.setToken exported. idreader.js now loaded (test card strings reworded: banned-word check).
- css/w8.css, index.html, sw.js (v18, new files precached), smoke.cjs (v18).
- Tests: smoke OK; e2e (stub) 82 ok; e2e-real 97 ok; NEW tests/e2e-w8.cjs 65 ok (registration point sim card + manual + duplicate + role refusal, last4 only, no ID in console/storage/DB clear, claim + used code, plot GPS persisted, polygon, plot code, GPS retry, enrolment, checklist, SRP); backend npm test see commit message. Shots: tests/shots/w8/.
- Privacy edited: app/content/privacy.json (text only, version stays c2), android/store/privacy-policy.html, android/store/listing-th.md (national ID moved to Collected + data-safety row).
## Next
1. Real reader + tablet test 17-25 Nov (Native: staff cookie across origin uses credentials 'include' -> verify CORS allows credentials for https://localhost, else add a Bearer path for admin).
2. NOT done / must change: site/privacy.html lives in voyiro/riceos-web ROOT (production): same edits as android/store/privacy-policy.html (l.80,104,115,116 equivalents); NOT published because it would publish reader wording before the reader is verified. Bump backend CONSENT_VERSION / privacy.json version (c2 -> c3) together when the registration point goes live; update the Play Data safety form to match listing-th.md.
3. Jarin ok needed: wording of #/baac and the SRP topic names (L1 water management, L2 straw/stubble).
4. Sol/other scorer not run; visual self-check by sonnet reviewer only.
## Tried and rejected
- Read-then-consent order (violates plugin handoff / PDPA). Emoji icons (house style): SVG used. Cross-origin admin cookie fallback not built.
## Facts
- Admin accounts for tests: backend/bin/admin.mjs with RICEOS_ADMIN_PASSWORD; totp via backend/src/totp.mjs hotp(secret, stepOf(Date.now())).
- Running e2e suites in parallel starves the backend start (10 s) and makes e2e-real photo check flaky: run them one after another.

## W9 part A: server points, lessons, training hours, league (13 Nov 2026, sw VERSION untouched)
Status: done for review; not published to /next/, sw not bumped (final agent does both).
## Done
- NEW js/points2.js: #/points from GET /api/me/points (+ "see older") and /api/me/weekly-summary; evidence shows "รอเจ้าหน้าที่ตรวจ" until a ledger row evidence_approved with its id exists; home pill shows the server balance; mission button no longer promises points. Also exports window.RiceW9 (cache in localStorage riceos.w9.<user>.*, wiped by wipeLocal).
- NEW js/lessons.js: #/lessons list + detail from /api/lessons (20, SRP tag, minutes, stage, progress), quiz POST /api/me/lessons/:id/complete {answers} (server scores, result screen with points and hours), #/training = /api/me/training-hours vs 30 h with progress bar. Offline: cached list/detail/hours shown with a no-signal note; submit refused with Thai text, answers kept. Old local screens still used when there is no backend (seeded/demo state or 404/network with no cache).
- NEW js/league.js: #/league tabs village/tambon/amphoe/province, my area rank, my person rank, top-10 display names, opt-out checkbox = POST /api/me/consents public_rank (version from local consent, c2).
- css/w9.css, index.html (3 scripts + css), sw.js ASSETS (css + 3 js added, VERSION left), app.js: NAV_OF (training, league) and wipeLocal clears riceos.w9.* only.
- tests: stub-api.cjs gained lessons/points/weekly/training/league; NEW tests/e2e-w9.cjs (96 checks, shots tests/shots/w9/ at 360/390/1440); e2e-w8 training assertion now accepts the new counter text. smoke, e2e, e2e-real, e2e-w8, e2e-w9 green (run one after another; e2e-real failed once on the photo row, passed on rerun: known load flake).
## Next
1. Final agent: bump sw VERSION, publish /next/, add plot summary, W11, game link; add links to #/league from home if wanted (now reachable from #/points).
2. Independent visual review of tests/shots/w9/ (not done: the context guard blocked image reads in this run).
3. Run e2e-w9 flow against the real backend with the 20-lesson file (RICEOS_LESSONS_FILE) and with an approved evidence (admin review endpoint).
## Tried and rejected
- Keeping client points as a fallback ledger: rejected, server is the source; local ledger code stays only for the no-backend state.
- Queueing offline quiz submissions: rejected, server must score; answers are kept on screen instead.
## Facts
- Real backend shapes checked with a throwaway script: /api/lessons, /api/lessons/:id ({pass_score, lesson}), points, weekly-summary, training-hours, league (me.person can be null; area empty until an enrolment exists).
- Legacy R.lessons/R.points/R.training are kept as origLessons/origPoints/origTraining inside the modules.

## W9 part B: game link, income page W11, plot summary (13 Nov 2026, sw VERSION untouched, /next/ not published)
Status: done for review; final agent bumps sw VERSION and publishes /next/.
## Done
- NEW js/w9b.js + css/w9b.css (index.html + sw.js ASSETS updated; app.js: route() maps #/plot/<id>/summary to R.plotsummary, NAV_OF income/plotsummary).
- Game link: RiceW9b.gameUrl(plot) builds /game/?v&a&s&g&p per game-dev2/PLOT-LINK.md (invalid or unknown keys omitted, encodeURIComponent, g from sow age 10/25/45/65/85/110, p = server plot id). Button "เล่นเกมนาข้าวของแปลงนี้" on #/home (under tile grid) and #/plot.
- #/income "นาข้าวหนึ่งแปลง หลายรายได้": AWD carbon-credit awareness, 5 income ideas, price rows are placeholders (x,xxx) labelled "ตัวอย่างเพื่อวางแผน", sources footer, no promises. Linked from home (green card) only; there is no "more" menu in the app.
- #/plot/<id>/summary: QR of plotCode (vendor/qrcode.js), area, variety, sow date, GPS, polygon points, points of this plot (approved evidence ledger rows) and total, evidence timeline for the plot from GET /api/evidence (cached copy offline, local list before the call returns), print CSS + button window.print(). Linked from #/plot.
- smoke.cjs: the banned word "ตัวอย่าง" is allowed only inside the mandated phrase "ตัวอย่างเพื่อวางแผน".
- tests/e2e-w9b.cjs (stub, no stub-api change); shots tests/shots/w9b/ at 360/390/1440 plus summary-print.pdf. smoke, e2e, e2e-real, e2e-w8, e2e-w9, e2e-w9b green one after another.
- Extra scope: every consent send reads its version from GET /api/consent/current ({current|version, accepted_versions}) via RiceAPI.consentVer() (fallback c3; no 'c2' literal left in app/js; consent gate uses accepted_versions, any cN until the server answers). Staff sign-in (regpoint.js): with window.Capacitor, POST /api/admin/login sends client:'native', token kept in sessionStorage and sent as Authorization: Bearer on all admin calls (credentials omitted); web keeps the cookie. Tests in e2e-w9b.cjs (route-intercepted admin API, stub state.cv). Native path not run against the real backend.
## Next
1. Final agent: bump sw VERSION, publish /next/. Check /game/ is reachable from the published origin (link is absolute /game/).
2. Real income numbers and sources need a Jarin/partner review before real farmers see the page (placeholders only now).
3. Home tile sub-labels (~12px) and plot chips are pre-existing and below the elderly bar; not touched.
## Tried and rejected
- Plot-level points from the ledger by plot id: ledger has no plot field, so plot points = sum of evidence_approved rows whose ref_id is one of this plot's evidence ids (last 100 rows).
## Facts
- Visual review done by sonnet subagent on downscaled copies (main-loop context guard blocks image reads).

## W9 publish (13 Nov 2026, sw riceos-v19)
Status: done; repo bf86c7f8449c (sw v19, smoke/e2e-w9/e2e-w9b green); published to /next/ via riceos-web main fbf4302fd5fa (content/lessons-*.json excluded as before).
- Verified: /next/sw.js sha 22effdcf443c = app/sw.js; root /sw.js 11865c79210b unchanged; /next/ 200 text/html; league/lessons/points2/w9b js = application/javascript, w9/w9b css = text/css; /game/sw.js riceos-nalamun2-shell-v9.
