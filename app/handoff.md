# RiceOS farmer PWA -- handoff

## Clip-audit fix pass (2026-11-08 ~13:00 BKK) -- Status: done (not deployed)
- Fixed all H1-H7, M1-M8 of docs/clipped-text-audit-20261108.md. Wording unchanged (คลองช้าย etc. kept); only nbsp in month ranges, nowrap spans, colours.
- Files: css/app.css 879c07ba3cf5 (override block at end "clip-audit fixes" + line 270 12.5->13px), js/app.js fd26b6cab3cb, img/mission-card.jpg 11335ff6d134 (baked text removed; orig in scratchpad mc/), sw.js 11865c79210b (riceos-v6), tests/smoke.cjs eeedbea6cdca (pins v6). smoke PASS.
- Audit rerun on ai4 (local copy /data/rice-shots/clip-audit/site served :18793; runall.sh <outdir>; count2.mjs <outdir> excludes audit-listed FPs + toast pointer-events artifact): app High 12->0, Med 11->0, font<13 227->0 (390/360/1440). Out: out-fix4/. Sol (gpt-6.1-sol) on 4 screens before last tweaks: home 8.0, market 7.8, register 8.1, harvest 8.0 -> FAIL 9 bar; applied its clipping notes (game toast to top of sheet, nowrap 42 วัน / 15 ตัน, timer own row + title clamp, ribbon padding, checkbox accent). Not re-scored. Remaining Sol polish ideas (not clipping): bottom-nav overlaps shortcut row at scroll 0, darker mission subtitle gradient.
- Toast now top-of-screen, pointer-events:none. Text min 13px on all info elements; 48px targets on buttons/back/bell/shoot/weather/points/seg/qchips.
- Backups of pre-pass files: /tmp/claude-1001/-home-jarin-rice-farmer/afe20034-999c-44ef-93d2-45621c8b7398/scratchpad/bak/. Sol check: /tmp/claude-1001/-home-jarin-rice-farmer/afe20034-999c-44ef-93d2-45621c8b7398/scratchpad/sol/sol.md
Status: blocked (2026-11-08 ~11:45 BKK) -- vm2 root disk FULL (61G/61G, ~60MB free; Codex rollouts fail with ENOSPC; biggest: /home/jarin/donaus-backup-2026-08-10 21G). Not >=9 yet. Not deployed; cache riceos-v5.

## Round r4-r8 (2026-11-08, this pass)
- Files now: js/app.js 8b3421f9de91, css/app.css f620dffcc8a4, sw.js 66790280e898 (riceos-v5), tests/smoke.cjs fd6bdaca18c8 (Codex edited; PASS 0 failures), tests/shots.cjs 0c2b802e4224 unchanged.
- Done: PC Wallet/Lot rebuilt as sidebar shell + two balanced columns; phone Lot content padding clears share dock + nav + safe area; district map redrawn as curved shared-border paths; phone dashboard map enlarged; 0 console errors; no จำลอง/ทดลอง/เดโม/ตัวอย่าง in app.js; 'คลองช้าย' kept.
- Fresh-Sol scores (wallet/lot/dash phone, dash/wallet/lot PC): r4 8.2/7.9/7.6/8.3/7.8/7.9; r5 7.8/7.7/7.6/8.3/8.0/8.1; r6 7.8/7.6/7.3/8.0/7.7/7.6; r7 7.1/7.4/7.2/7.7/7.3/7.5; r8 (current code) 7.9/7.8/7.6/8.2/7.9/8.1. Blind fix rounds (Codex cannot see renders) oscillate; the reviewer's notes contradict round to round.
- Code snapshots: scratchpad snap/{r7,s1,s2}/app.{js,css}; r3 baseline in scratchpad bak/. Current = s3 (loop's last edit). Latest renders: scratchpad shots/r8 and ai4 /data/rice-shots/riceos/out/r8.

## Done (S09 / S13 / W01, sha256[:12], 2026-11-08 UTC)
- `js/app.js` `aeafa435676e`
- `css/app.css` `a5776c6d859d`
- `sw.js` `a8abecf1a54b`
- `tests/smoke.cjs` `ee37bfcd2136`
- `tests/shots.cjs` `0c2b802e4224`
- `handoff.md`: this delivery log; its final SHA-256[:12] is in the delivery message, avoiding a self-referential file hash.
- Independent design review of the six supplied Chromium renders, BEFORE this pass (9 = a top-tier fintech designer would ship as-is):
  - Phone Wallet **7.8/10**: the points dock cuts across the chart's season labels; the fixed secondary row consumes space comparable to the primary navigation; the title/actions stack leaves too little room for the financial trend.
  - Phone Lot **7.5/10**: the last trace stage runs under the fixed share dock; the tall passport dominates the viewport; alternating diagonal arrows make the numbered reading order less clear.
  - Phone Dashboard **7.3/10**: three tall KPI rows push most of the risk map below the first viewport and navigation; the first view contains no complete map or chart; the pale map colours have little visual weight beside the dark KPI tile.
  - PC Dashboard **8.2/10**: the line chart is visibly small and centred within a much wider card, leaving excess horizontal whitespace and tiny axes; pale map fills weaken the risk hierarchy; the AI button sits across the alert-card corner.
  - PC Wallet **8.3/10**: the left column stops well above the chart-card bottom, leaving a disconnected empty area; the balance is relatively small inside the main financial card; the two columns lack a shared lower alignment.
  - PC Lot **8.2/10**: the share button and carbon/Q badges end at different baselines; tiny arrows at the far right compete with the connected timeline on the left; the timeline has a weak visual connection to its primary action.
- Fixes in this pass: Wallet points now form an inline trailing row with space for the phone AI button, freeing the entire chart from the fixed points dock. Phone titles use tighter spacing; the QR passport is shorter while preserving a 176px frame, four-module quiet zone, exact summary and both badges. Trace labels stay together; misleading diagonal continuations are removed, and desktop continuation arrows are subdued and consistent. Phone Dashboard uses three KPI columns/two rows from 360px, with a two-column fallback below 360px; its complete heatmap sits beside the nine-district key, with enlarged map markers and stronger green/gold/risk fills. Desktop Wallet stretches its balance card to align both column bottoms and enlarges the balance to 64px. Desktop Lot aligns the timeline/action column with the passport/badges column. Desktop Dashboard removes the SVG height cap so the chart fills its card width; its AI button moves into clear sidebar space. The mobile AI remains bottom-right, and every mobile new screen retains the logo and five-menu nav.
- Scope: only js/app.js, css/app.css and this handoff changed. sw.js is byte-unchanged (VERSION riceos-v4). Legacy CSS before the v4 block is byte-identical; seeded home/plot generated HTML and nav match the saved pre-edit version exactly. Existing lot/government entry-link CSS is retained.
- Validation after this pass: `node --check js/app.js` PASS; `node tests/smoke.cjs` PASS (8 HTML refs, 4 icons, 55 assets, 81 files, 4 chips, 0 failures). A temporary Node VM harness compared before/after seeded home/plot HTML and nav byte-for-byte, verified the unchanged legacy CSS prefix and service worker, rendered seeded/fresh Wallet/Lot/Dashboard, and checked the three transactions, fresh-user empty state, seven trace stages, six KPIs, nine districts and five nav links. All PASS. Chromium was NOT run. Layout outcomes remain subject to fresh renders on the other host; no post-fix 9/10 claim is made.
- S09 `#/wallet`: green balance card, three agency notices (no money action, request or data submission), exact three transactions including true minus, local SVG profit trend and credit chip. Money nav/home Wallet links now open Wallet. `#/points` stays available from the inline wallet points row; the home points chip still opens points. Wallet figures/transactions/chart/credit appear only for the existing seeded persona; a fresh user sees dashes and empty states. The three new routes can open directly before registration.
- S13 `#/lot`: QR generated offline with the shipped qrcode vendor, exactly `LOT-PL-2569-00412`, four-module quiet zone, seven-step trace chain and exact carbon/Q labels. PNG canvas is shared as a File when supported; download fallback and visible outcomes cover unsupported/failed sharing, cancellation and PNG errors. Fixed share action above bottom nav. Entry from the plot screen.
- W01 `#/dashboard`: full sidebar desktop shell at >=1024px with no phone frame/bottom nav; single column on phones. Six exact KPIs, stylised inline SVG of all nine districts in approximate relative positions, numbered district key, icon-paired green/amber/red legend, dual-axis SVG trend, and the exact three-district disease alert table. Local UTF-8 BOM/CRLF CSV export uses the displayed table rows. Entry from `#/gov`.
- Reuses existing logo, header photo, nav, vendored fonts and mascot assets; no new shipped files, so the existing 55-entry ASSETS list already covers every runtime file. SW bumped to `riceos-v4`.
- `node --check` passed directly for all seven JS/CJS files. `node tests/smoke.cjs`: `OK: 8 html refs, 4 icons, 55 sw assets, 81 files, 4 chips answered, 0 failures`. Smoke now asserts routes and verbatim screen content. This host rejects smoke's subprocess spawns with `EPERM`; only on that error it uses `vm.Script` to parse the same classic JS without executing it; all other errors still fail.
- Screenshot script supports ROUTES, W, H, DPR, OUT, CHROME; seeded URL plus localStorage dev flag, awaited fonts, full viewport `<route>-<W>x<H>.png`, per-route and total console-error counts. Default 11-route reference/side-by-side run and legacy filenames remain. Chromium was intentionally NOT run here; no runtime/browser or visual-score claim.
- S03 wording intentionally NOT changed, per “ตามที่ผิดนั่นแหละ”. The requested note calls the app chip “คลองข้าย” (if present), and the source says “คลองซ้าย”; the actual existing `FLAG_TEXT.typos_as_shown.identical.canal` in this checkout is `เขตชลประทานคลองช้าย`, which remains byte-for-byte unchanged. The corrected alternate flag string is also unchanged.

## Done (sha256[:12], 2026-11-07 BKK)
- index.html 583ef6b651a4 · sw.js f30cdef03433 (cache `riceos-v1`, 55 assets, cache-first) · manifest.webmanifest bbec517d26f8
- js/app.js 2df8682cc489: hash router. Screens: register (PDPA consent, then 4 steps: ID photo kept only in memory and never stored, 13-digit mod-11 check, SHA-256 hash stored, phone, plot + กระทง 1-30, voice), home, plot (5-year table / กระทง list with QR per กระทง), kratong, plotedit, mentor, analysis, options, market, points (เงิน), missions (ภารกิจ), lessons + quiz, gov
- Capture: BarcodeDetector, falling back to jsQR on getUserMedia, or typed code `RICE-TUBE-<plot>-<n>[-WET|-DRY]`. Rejects QR from another plot or an unknown กระทง. Takes a photo via `<input capture>`, saves a 320px thumbnail, GPS and client time. Each กระทง photographed adds a pending ledger row.
- Sparse sampling: ceil(20% of N) กระทง per day, least recently read first.
- js/points.js af121a6d590a: port of engine.py evaluate/in_force/week_start/caps. Rules come from data/ruleset_v2.json (copied from proto/rules).
- content/flags.json 51e13d86b859: 8 switches, default = identical to his screens. agency_logo, profit_before_2700, yield_750_600, prices_98_95_110, locked_15_ton, ai_advice_figures, ph_label_inconsistency, typos_as_shown
- data/knowledge.json 81b9ec0e29ff: mentor answers. Figures come only from 05-verified-facts.md, otherwise 'ไม่มีข้อมูลยืนยัน'. Every answer carries the label คำแนะนำประกอบ, a source and a no-guarantee line. data/lessons.json 6f80a8141b37
- img/: 30 regions cropped from his 7 images (2 logos, avatar, photos, mascot, tile icons, map). icons/: PIL-generated 192/512 any + maskable, apple-touch-icon
- tests/smoke.cjs d6e5c505e2dc: PASS. 8 html refs, 4 icons, 55 SW assets, all JS `node --check`, all JSON parse, every shipped file is in the SW cache, no จำลอง/ทดลอง/เดโม/ตัวอย่าง.
- tests/shots.cjs 988edf03b289: headless Chromium over CDP at 393x852 @2.168. **0 console errors** across 11 routes. Output in tests/shots/side-7484..7490.jpg (his | ours) and ours-*.png.
- Layout fidelity pass 2026-11-07: css/app.css f188cc3afa73 (CSS only, block at end of file + Prompt @font-face ascent 100%/descent 30%/line-gap 0), sw.js cfd6d14ce5b4 (cache `riceos-v2`), index.html unchanged 583ef6b651a4. smoke PASS, shots 0 console errors, side-*.jpg regenerated. Last button top y (ours vs his, CSS px at 393x852; nav top 780): register ถัดไป 630 vs 631 (-1) · home ฝนหนัก alert 613 vs 613 (0), สภาพแปลง card ends 770 · plot ดูตารางวิเคราะห์ AI 701 vs 703 (-2) · mentor input bar 726 vs ~736 (-10, his edge estimated by eye) · analysis ทำตามนี้ 720 vs 715 (+5) · options เลือกทางนี้ 731 vs 729 (+2) · market รับสัญญา 732 vs 730 (+2). Before: +106/-/+80/+175/+114/+117/+64. His y = dark-green/red pixel bands in docs/nopadon-7nov-0850/*.jpg; ours = getBoundingClientRect via CDP.
- README.md a8246590a20c: run, install on Android/iOS, store fees not paid. capacitor.config.json is a stub only.

- Review fixes (docs/riceos-app-review-7nov.md) 2026-11-07, deployed riceos.donaus.com, served==local: index.html 583ef6b651a4, sw.js 72a4c7719dd1 (VERSION riceos-v3), content/flags.json afcb1ad1110f, js/app.js 850f10c93e16, data/knowledge.json 277b44137bc1
  - B1 knowledge.json: new entry yellow-leaf (generic advice, no figures, 'ควรปรึกษาเจ้าหน้าที่เกษตร'); smoke.cjs asserts every data-q chip hits an entry
  - B2 knowledge.json sources now human names (Thai Rice GCF / อบก. / ข้อมูลของโครงการ / ไม่มีข้อมูลยืนยัน); app.js header comment cleaned; smoke.cjs fails on any 'docs/' in served files
  - B3 flags.json = {"flags":{key:bool}} only; display texts moved to app.js FLAG_TEXT; why-notes in ../docs/riceos-flags-notes.md (not served)
  - H2 ?seed=1 only works if localStorage 'riceos.dev'=='1' (shots.cjs sets it via addScriptToEvaluateOnNewDocument; shots.py NOT updated)
  - H1 photo texts: GPS-fail line, save toast, points note now say saved on phone / 'รอส่งเมื่อระบบกลางพร้อม'; disease answer no longer says photos go to officers
  - Screens pixel-identical to pre-fix except the points-page note line (text change only)

## Could not match exactly
| Where | Difference | Why |
|---|---|---|
| All screens | No iOS status bar or home indicator drawn. Header adds a 44px status-bar inset only in `?shot=1`. | The real phone draws these. Faking them would be wrong in the installed app. |
| All screens | Prompt/Sarabun instead of his rounded font. Some sizes are reduced so lines do not wrap. | His font is unknown. Free vendored fonts only. |
| All screens | Main button / last block now lands within the first 852px and within ±10px of his y (table in Done). Below it, our extra notes (คำแนะนำประกอบ..., ghost buttons on แปลง, ขั้นตอนทั้งหมด) still need a scroll. Our buttons are 44px tall vs his ~38 (touch-target minimum). | Cause was vertical, not width: Prompt's tall line box, wrapped lines in narrow cells, roomy paddings. Fixed in CSS only. |
| 7484 | Adds a "พิมพ์เลขบัตร 13 หลัก" field. A PDPA consent step comes before step 1 for a new user. | Manual entry and consent were required by the brief. The ID photo is never stored. |
| 7484 | Step 2 "ยืนยัน OTP" only records the phone number locally. | Sending an SMS OTP needs a paid gateway or server. |
| 7485 | Mission badge shows ruleset points (+12 for 20 ไร่: R1 3/ไร่, cap 12/week), not "+20". Left on purpose (layout pass 2026-11-07): showing +20 would promise points the engine does not award, and changing cap_per_week in ruleset_v2 would diverge from proto/rules + engine.py. Needs a ruleset decision, not a UI edit. Weather, Wallet 48,500 and เครดิต A appear only for the seeded ลุงสมชาย (`?seed=1`). A new user sees "-". | Points come from ruleset_v2. There is no weather or wallet source. |
| 7486 | Map is his satellite image (with "แปลงลุงสมชาย 20 ไร่" baked in), shown only for the seeded plot. Tab 2 "ไทม์ไลน์ดูแล" holds the กระทง/QR list. | There is no deed polygon data or map tiles offline. |
| 7487 | His conversation is shown as history for the seeded user. New questions are answered from knowledge.json. | AI is local keyword matching, not an LLM. Speech input only where the browser supports it. |
| 7488/7489 | Small "คำแนะนำประกอบ ไม่รับประกัน..." note under the button. | Advice-only labelling rule. |
| 7490 | Extra note that the app does not make contracts. The button records interest only. | Contract liability. Switch with locked_15_ton. |
| Not in his images | Points/league/rewards (เงิน), ภารกิจ, บทเรียน, กระทง screens built in the same style. League rank and reward list say they wait for the central system / committee. | There are no other farmers or approved rewards locally, and making them up would be unsourced. |
| ID card OCR | Not done. | Tesseract.js is too large and slow on phones. Manual entry is used instead. |

## Next
0. Free disk on vm2 first (needs ~2GB for Codex + shots).
1. Use the SEE-RENDERS loop (it works): run scratchpad r4/watch.sh in background (polls app/tests/shots/sol/REQUEST, runs r4/sshoot.sh on ai4, writes DONE); then Codex Sol with scratchpad r4/loop8.md (iterate fix->render->look, snapshot each round, restore best). Delete app/tests/shots/sol afterwards (smoke counts it). Codex sandbox cannot ssh itself (EPERM) -- hence the watcher bridge.
1b. r8 defects: phone wallet amount oversized + empty band above nav; phone lot QR card tall vs compressed timeline, share/AI action row asymmetric; phone dash map card side whitespace, crowded legend strip, opaque overlay above nav hides next card; PC dash KPI padding, map/list gutter, small chart plot; PC wallet balance-card gap, name/credit chip far apart, content ends high; PC lot badges left-aligned under centred QR, journey header gap, row metadata too far right.
2. In a browser, check fresh-user Wallet dashes/empty state, all three agency dialogs (including keyboard close/focus return), plot and gov entries, exact QR payload, successful/cancelled/unsupported file sharing and PNG fallback, UTF-8 CSV contents, resize at 1024px, and service-worker upgrade/offline behaviour.
3. Prior follow-ups remain: Jarin decides content flags; verify camera, QR and GPS on Android/iPhone over HTTPS.

## Facts worth not re-discovering
- In this sandbox, chrome `--screenshot` hangs. Use the CDP path in tests/shots.cjs (Node 22 global WebSocket).
- `?seed=1` loads ลุงสมชาย (plot A, 10 กระทง, opening balance 1,250 แต้ม as an OPENING ledger row). It does not overwrite a registered user.
- Regenerate the sw.js ASSETS list when files are added. smoke.cjs fails if a shipped file is missing from it.

## Tried and rejected
- Running Chromium on this host: excluded by the explicit 1.9GB RAM constraint; renders and visual sign-off are assigned to the other host.
- Smoke subprocess-only syntax checks: this sandbox returns `spawnSync /usr/bin/node EPERM`. Retained direct `node --check` validation and added a parse-only fallback exclusively for that error.
- Correcting S03's canal spelling: rejected because the instruction is to keep the shown content (“ตามที่ผิดนั่นแหละ”); see the exact spelling note in this delivery's Done entry.
- Real-money requests, external map services, QR/chart dependencies and runtime API integrations: outside this local implementation; notices, inline SVG, shipped vendor QR, file sharing and CSV cover the specified behaviour.
