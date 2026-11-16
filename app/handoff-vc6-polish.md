# vc6 polish -- handoff
Owner: rice-farmer coordinator
Updated: 2026-11-13 BKK
Status: done (Sol target >=9 NOT reached; plateau 5-6, see Next)

## Done
- css/vc6.css (phone only, <=700px): palette from bible, 8/16/24 spacing, one card style, 60px header (80px home), tiles 14px sub-labels, welcome card compact + collapsed steps, home order profile > today > tiles, rewards tier icons, symptoms/lessons/points card rhythm
- js/vc6.js: one outline SVG icon set (RiceIco) replacing emoji on home, missions, rewards, symptoms, settings
- sw riceos-v26 (css/vc6.css, js/vc6.js cached); smoke.cjs version check updated; e2e-booth points regex now /340/
- tests/shots-vc6.cjs (10 screens + objective audit at 390 and 360), tests/score-sol-vc6.sh <round>

## Next
- Sol keeps scoring 5-6 mostly on: stub placeholder lesson text (lesson-detail=3), viewport cut at fixed nav, add-plot form length, league consent copy size. Needs real lesson content and art from นพดล, not CSS.

## Tried and rejected
- Hiding welcome intro paragraph -> copy removal, not allowed

## Facts worth not re-discovering
- Sol outputs: /tmp/claude-1001/sol-vc6-{0..3}.md; codex is at ~/.local/bin/codex (old score-sol.sh path is wrong)
- Images >30KB unreadable: make previews with convert -resize 240x -quality 35

- push NOT done (guard hook: no fresh ALLOW-DANGEROUS marker). Wanted: git push origin main
