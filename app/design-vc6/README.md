# design-vc6 -- Codex mockups of the 10 target screens (13 Nov 2026 BKK)
Board: `board.jpg` (1800x1680, 5x2; each cell letterboxed to 390x844 ratio, labelled with the Sol overall of the version shown).
Generator: `codex exec -m gpt-6.1-sol` image generation (`gen.sh`, `jobs.txt`), each call given the current screenshot `app/tests/shots/vc6/<screen>.png` and `docs/from-nopadon-20261112/20261113-1758/8507.jpg` (style only) via -i. Scorer: Sol, one call with all 10 images (`score.sh`; raw output `score-r1.txt`, `score2.txt`).
Scores are beauty/clarity/consistency/bible/overall, 0-10. Round 1 (all 10 below 8) -> one regenerate round with Sol's flaw note appended to the prompt. The board shows the better version per screen (r1 kept for 05 and 07, which got worse). Mixed-set mean of the overalls shown: **7.19**. Sol's own SET OVERALL: round 1 **6.7**, round 2 **7.0**. Target 8.5 NOT reached.
Main remaining flaws are content from the app, not styling: placeholder lesson text, unconfirmed point/reward numbers, pre-ticked consent. These need real content from นพดล.

## Common prompt (the screen-specific text replaces `$extra`)

```
You are a senior mobile UI designer. The first attached image is the CURRENT screenshot of the '<screen>' screen of a Thai rice-farmer app (RiceOS). Redesign it as ONE high-fidelity mobile UI mockup, portrait 390x844 ratio, a single phone screen filling the whole image (no device frame, no extra canvas). KEEP the same Thai labels, content and structure as the screenshot (copy the real Thai text exactly; do not invent KPI numbers, prices, statistics, or agency logos or government seals). Style: clean government-grade but warm, elderly-friendly: body text at least 16px, big tap targets (>=48px), high contrast, white cards with rounded corners and soft shadow, dark-green top bar, ONE consistent outline icon set, IBM Plex Sans Thai typography, fixed bottom navigation. Palette: Primary Forest Green #0B5A2A, RiceOS Green #1D7A3E, Harvest Gold #D4A017, Warm White #F7F8F5, Alert Yellow #E9B949, Risk Red #C93C32 (status always with text or icon). The second attached image is only a STYLE reference (a poster by the client): borrow its warm Thai agritech feel, not its content. No neon glow, no clutter, no tiny text. Screen specifics: $extra Use your image generation tool (not code drawing). Save the PNG into the current directory as screen$n.png and print its path.
```

Round 2 appended: `REVISION ROUND: ... Fix this flaw (Thai note): <flaw from round 1>. Also reduce density ... no pre-selected states; no fake precision numbers; ... no invented certification badges.` (see `jobs.txt` for each exact line).

## 01 Home
- Input screenshot: `app/tests/shots/vc6/01-home.png`; screen text: Home: profile header, the day's mission, tiles. Hero area warm and friendly, calm hierarchy.
- Sol r1: 6.5 -- หน้าแรกแน่นเกินไป; “3 ขั้นตอนเริ่มต้น” แสดงเพียงปุ่มเดียว และ +12 แต้มไม่มีเงื่อนไขตรวจรับชัดเจน
- Sol r2: 6.9 -- Crowded home with competing photo buttons; variety text appears garbled as “กย85”; unsupported +12 points.
- Shown on board: r2 (overall 6.9); files `png-r1/screen01.png` (r1), `png/screen01.png` (r2)

## 02 Add plot
- Input screenshot: `app/tests/shots/vc6/02-add-plot.png`; screen text: Add plot form: shorter looking, grouped fields, big inputs, sticky green save button above bottom nav.
- Sol r1: 7.3 -- คำอธิบาย “กระทง” ยาวและอยู่ห่างช่องกรอก; ช่องพันธุ์ข้าวไม่มีตัวช่วยเลือก
- Sol r2: 7.6 -- Dense jargon explanation; “ไม่แน่ใจ ใส่ 1 ได้เลย” encourages inaccurate plot data.
- Shown on board: r2 (overall 7.6); files `png-r1/screen02.png` (r1), `png/screen02.png` (r2)

## 03 Evidence photo + status
- Input screenshot: `app/tests/shots/vc6/03-evidence.png`; screen text: Evidence photo capture plus status card (green good / yellow pending / red problem, with icon+text).
- Sol r1: 6.1 -- สถานะ “มีน้ำ” ถูกเลือกไว้ก่อนถ่ายหลักฐาน; พิกัดละเอียดพร้อม “±0 ม.” ให้ความแม่นยำที่ไม่น่าเชื่อถือ
- Sol r2: 7.1 -- “ไม่มีรหัส / ยังไม่มีท่อ” conflates two different situations; photo requirements remain unclear.
- Shown on board: r2 (overall 7.1); files `png-r1/screen03.png` (r1), `png/screen03.png` (r2)

## 04 Missions & points
- Input screenshot: `app/tests/shots/vc6/04-missions.png`; screen text: Missions and points: daily mission list with clear status chips and points progress.
- Sol r1: 7.6 -- “ภารกิจ & แต้ม” ไม่แสดงยอดแต้ม และ “วันที่ 6/7” กำกวมว่าเป็นวันที่หรือความคืบหน้า
- Sol r2: 7.5 -- Points stay unexplained, while unverified crop timing and mission counts look authoritative.
- Shown on board: r1 (overall 7.6); files `png-r1/screen04.png` (r1), `png/screen04.png` (r2)

## 05 Lessons list
- Input screenshot: `app/tests/shots/vc6/05-lessons.png`; screen text: Lessons list: cards with reading minutes, clear progress.
- Sol r1: 7.0 -- รายละเอียดและป้าย SRP แน่นเกินไป; เกณฑ์ 70% กับเป้าหมาย 30 ชั่วโมงไม่มีที่มาแสดง
- Sol r2: 6.4 -- “เกณฑ์และเป้าหมายจากหน้าบทเรียนเดิม” reads like an internal note; black navigation breaks consistency.
- Shown on board: r1 (overall 7.0); files `png-r1/screen05.png` (r1), `png/screen05.png` (r2)

## 06 Lesson detail + quiz
- Input screenshot: `app/tests/shots/vc6/06-lesson-detail.png`; screen text: Lesson detail with a quiz: readable body text, big answer buttons.
- Sol r1: 5.5 -- เนื้อหาและข้อสอบยังเป็นข้อความตัวอย่าง เช่น “เนื้อหาบทเรียนที่ 1” และ “ตอบ ก” จึงใช้งานจริงไม่ได้
- Sol r2: 7.5 -- Large readable quiz, but the long page obscures completion controls; lesson-duration claims lack support.
- Shown on board: r2 (overall 7.5); files `png-r1/screen06.png` (r1), `png/screen06.png` (r2)

## 07 League
- Input screenshot: `app/tests/shots/vc6/07-league.png`; screen text: League/ranking: privacy-safe leaderboard, clear consent copy at readable size.
- Sol r1: 6.8 -- คะแนนและจำนวนสมาชิกดูเป็นข้อมูลสมมติ; ความยินยอมเผยชื่อถูกติ๊กไว้แล้วและแข่งขันกันทั้งระดับคนกับพื้นที่
- Sol r2: 5.9 -- Invented rice logo and unsupported rankings, scores and member counts; selected geographic tab is unclear.
- Shown on board: r1 (overall 6.8); files `png-r1/screen07.png` (r1), `png/screen07.png` (r2)

## 08 Rewards
- Input screenshot: `app/tests/shots/vc6/08-rewards.png`; screen text: Rewards: tier icons, gold for points, large reward cards.
- Sol r1: 6.4 -- ยอดแต้มและเกณฑ์รางวัลยังไม่ยืนยัน แต่แสดงเด่นเหมือนใช้งานจริง; “ตรารับรองเกษตรกรใหม่” เสี่ยงสื่อการรับรองที่ไม่มี
- Sol r2: 6.9 -- Repeated pending labels overwhelm rewards; “ตรารับรองเกษตรกรใหม่” implies an unconfirmed certification.
- Shown on board: r2 (overall 6.9); files `png-r1/screen08.png` (r1), `png/screen08.png` (r2)

## 09 Symptom checklist
- Input screenshot: `app/tests/shots/vc6/09-symptoms.png`; screen text: Symptom checklist: large checkbox rows, clear grouping.
- Sol r1: 6.5 -- คำเตือนยาวและข้อความ AI สับสน; ช่องสี่เหลี่ยมสื่อเลือกหลายหมวด แต่ขั้นตอนถัดไปไม่ชัดเจน
- Sol r2: 7.5 -- Oversized disclaimer competes with the task; “เลือกอาการ” labels a button before symptom selection begins.
- Shown on board: r2 (overall 7.5); files `png-r1/screen09.png` (r1), `png/screen09.png` (r2)

## 10 Profile / consent
- Input screenshot: `app/tests/shots/vc6/10-profile.png`; screen text: Profile and PDPA consent: readable copy, clear accept buttons.
- Sol r1: 6.9 -- รวมการเผยชื่อกับความสนใจ ธ.ก.ส. ไว้ในความยินยอมเดียวกัน; เบอร์ตัวอย่างและไอคอนเงินไม่สอดคล้องทั้งชุด
- Sol r2: 7.0 -- Consent mixes league visibility with vague bank interest; wallet icon changes the established money navigation.
- Shown on board: r2 (overall 7.0); files `png-r1/screen10.png` (r1), `png/screen10.png` (r2)
