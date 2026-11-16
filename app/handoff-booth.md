# Booth stations C and D (13 Nov) -- handoff
Status: done (code + tests), NOT deployed. Visual score below the 9 bar, see Next.

## Done
- D: #/symptoms "ตรวจอาการข้าวเบื้องต้น", 3 steps (5 groups: สีใบ, จุด/แผล, ล้ม, แมลง, น้ำ; 19 symptoms) -> js/booth.js, content in data/knowledge.json key `symptom_check` (honest line verbatim in `.honest`, shown on every step). No AI claim anywhere else.
- C: #/rewards "ของรางวัล", read-only, label "ตัวอย่างรายการ — กำลังกำหนดกับโครงการ", tiers from content/rewards.json only (5 sample tiers 100/300/600/1000/2000), balance from GET /api/me/points, progress bar per tier, no redeem.
- Entry links: home (after grid, js/booth.js place()), lessons list, points page. CSS: css/w9b.css (bt-*). sw riceos-v24 (v23 was already taken by an uncommitted bump from another agent).
- Tests: tests/e2e-booth.cjs (flow, WCAG contrast >= 4.5, font >= 16px, tap >= 48px, overlap, rewards.json single source), smoke.cjs booth block.

## Next
1. Drop นพดล's real tiers into content/rewards.json (keep schema: version, status, label, note, no_redeem, tiers[{id,points,title,desc}]); when real, change `label`/`note` and smoke.cjs label check.
2. Have a clinical reviewer (agriculture officer) check symptom wording in data/knowledge.json before the booth.
3. Visual: Sol score 6 (see report); fixes: tier object illustrations, shorter global header on desktop, home page entry links above the fold for new accounts.

## Facts
- Sol runs: /tmp/claude-1001/sol-booth-b1.md (first), sol-booth-b2.md (after fixes).
- e2e-w8 is timing-flaky under CPU load (failed twice at load 6, passed alone and at HEAD).
- smoke bans "ตัวอย่าง"; the mandated rewards label is exempted in tests/smoke.cjs.
