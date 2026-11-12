# HANDOFF — กระดาษส่งต่องาน (ยื่นให้ AI ตัวไหนก็ได้ อ่านใบนี้ใบเดียวแล้วทำต่อได้)
> งานที่ทำค้างล่าสุด: ดู branch ที่ push ล่าสุด `git branch -r --sort=-committerdate | head -3` แล้ว `git log -5 --format=%B <branch>` — บรรทัด `ถัดไป:` คือขั้นต่อไป
อัปเดต: 2026-11-12 · เขียนโดย Claude (ผู้ใช้: Finn)

## 0. โปรเจกต์นี้คืออะไร
- **MedLib** = เว็บคลังข้อสอบ/lecture แพทย์ PSU ปี 1–3 (static HTML+JS, ไม่มี build) · repo `github.com/kevinzkevier85/medlibeta` · เว็บ `kevinzkevier85.github.io/medlibeta`
- ข้อสอบต้นฉบับ = PDF ของรุ่นพี่ใน Google Drive (`preclinic/<ปี>/<บล็อก>/`) → AI อ่าน ตรวจเฉลย ตัดรูป → JSON ใน `data/blocks/<BLOCK>/exams/`
- ทำงาน 2 คน (Finn + เพื่อน): แก้บน branch `finn-…` → PR → **อีกคนเป็นคน merge** ห้าม push main ตรง ห้าม force push
- รันเว็บ: `python -m http.server 8765` · ตรวจข้อมูล: `node tools/validate.cjs` (ต้องผ่านก่อนส่งทุกครั้ง)
- ส่งงานทุกครั้ง: เพิ่มเลขใน `version.json` + `CHANGELOG.md` + `?v=` ใน `index.html` + `VERSION` ใน `sw.js`

## 1. บล็อก Respiratory (RESP) — กำลังทำ (Drive `preclinic/2/respiratory`)
- branch **`finn-resp-block`** · block id `RESP` · inventory `resp_<รุ่น>_<MCQ|KF|OSPE>` (32 ชุด) · `data/blocks/RESP/`
- MCQ ✅ ปี 45, 46, 47, 48, 49, 50, 51, 52 (เฉลยแบบปี 52 แล้ว) · ⏳ เหลือ MCQ 44, 42-43, 40 · ⏳ KF ทั้ง 11 ชุด · ⏳ OSPE ทั้ง 10 ชุด (ภาษาไทย)
- MCQ รุ่นเก่าเป็น "ข้อสอบจำ" ข้อที่ไม่มีช้อยส์/ซ้ำ ข้าม · เฉลยต้นฉบับใช้วงกลม/ขีดเฉียง/ไฮไลต์หลายแบบ (parse_key.py รองรับแล้ว ข้อที่อ่านไม่ได้ต้องดู `auditor/raw/<ชุด>/key_pNNN.png` เอง)

## 2. บล็อก KUB and Repro — merge แล้ว (PR #38)
- branch **`finn-urinary-block`** · PR #38 · รวม main แล้ว (v0.32.0) · block id `KUB` (inventory `kub_<รุ่น>_<MCQ|KF|OSPE>`, 27 ชุด) · `data/blocks/KUB/`
- สถานะรายชุด:
  | ชุด | สถานะ |
  |---|---|
  | MCQ 44, 49, 50, 51, 52 | ✅ ครบ 318 ข้อ เฉลยแบบปี 52 แล้ว |
  | MCQ 42-43 | ✅ ครบ 145 ข้อ (ข้อ 7 ข้าม) แบบฟอร์มปี 52 · ข้อ 26/37/93/144/145 AI ร่างเฉลย |
  | MCQ 45 | ✅ 67 ข้อ AI ร่างเฉลยทั้งชุด (ข้าม 17, 28, 69) แบบปี 52 |
  | MCQ 46 | ✅ 71 ข้อ AI ร่างเฉลย (ข้าม 21) แบบปี 52 |
  | MCQ 47, 48 | ✅ 73 + 48 ข้อ AI ร่างเฉลยแบบปี 52 (ข้าม 47: 3, 15 · 48: 1, 13, 16, 20) · 48 ใช้ `--number-own-line --fix-glyphs` + เติมข้อ 1 มือใน parsed.json |
  | KF ×10 | ✅ ครบ (42-43, 45, 47 ไม่มีเฉลย → AI ร่าง draft · 44, 46, 48–52 เฉลยลายมือ/พิมพ์) · 49, 50 ผู้เฉลยเตือน "ใช้วิจารณญาณ" |
  | OSPE ×7 | ✅ ครบ 124 สถานี (48, 50, 51, 52 มีเฉลย · 42-43, 44, 46 ไม่มีเฉลย → AI ร่างเฉลยครบทุกสถานี) · ผู้ตรวจควรยืนยัน draft |
- เมื่อครบบล็อก: version ใหม่ + PROGRESS.md (เพิ่มส่วน KUB) + อัปเดตไฟล์นี้
- ตัวช่วย: `auditor/tools/parse_key.py` อ่านไฮไลต์ ส้ม/ฟ้า ได้ · เฉลยขีด/วงกลมลายมือต้องอ่านด้วยตา · ข้อที่ต้นฉบับเลือก 2 ตัว → `auditor/data/decisions.json` ใส่ `also_accept`
- เขียนเฉลยแบบฟอร์มปี 52 (ดู CLAUDE.md "แบบฟอร์มเฉลย MCQ")
- ทุกชั่วโมงมีงานตั้งเวลาเช็ก GitHub issue ใหม่ (ฝั่ง Claude ของ Finn)

## 2. ผู้ใช้ (Finn) ต้องการ
- ตอบภาษาไทย สั้น ภาษาคน · ถ้าจะถาม ให้ถามเป็นช้อยส์ให้ติ๊ก
- "ทำไปเรื่อย ๆ ไม่ต้องถาม" · "ประหยัดโทเค็นที่สุด" = ประหยัดที่ **วิธีทำ** เท่านั้น **ผลลัพธ์ต้องคุณภาพเท่าบล็อก GI** (ผู้ใช้ย้ำ 2026-11-08): ห้ามข้ามข้อที่จำโจทย์มาไม่ครบ → AI เขียนโจทย์เต็ม (ai_generated) · ช้อยส์ไม่ครบ → เติมให้ครบ 5 (ai_choices) · ข้อมีรูป → ตัดรูปใส่ · explanation เต็ม (เหตุผล + Trap) · ข้ามได้เฉพาะข้อที่ต้นฉบับว่างเปล่าจริง (ขีด –)
- มี GitHub issue ใหม่ (เช่น "[เฉลย] END-47-MCQ-006 ควรเป็น E" จากปุ่มแจ้งเฉลยในเว็บ) → แก้เองได้เลย แล้วเปิด PR ใส่ `Closes #เลข`
- บล็อกถัดไป: ทำ Respiratory ต่อ (ดูหัวข้อ 1) แล้วค่อยเลือก immunity

## 3. สถานะข้อมูล
| บล็อก | MCQ | KF | OSPE |
|---|---|---|---|
| END (Endocrine) | 9 ชุด + lecture + แผนอ่าน | 9 ชุด | 9 ชุด 156 สถานี |
| GI | 10 ชุด 864 ข้อ (เฉลยแบบปี 52 ครบ) | 9 ชุด 196 ข้อ | 7 ชุด 193 สถานี |
| KUB | 10 ชุด 722 ข้อ (แบบปี 52 ทุกชุด) | 10 ชุด 129 ข้อ | 7 ชุด 124 สถานี |
| CVS | 11 ชุด (import เก่า) · ai_answer 11 ข้อ | – | – |
- ข้อที่เฉลยต้นฉบับ ≠ AI: มี `ai_answer` ในข้อ + ปุ่ม "เชื่อต้นฉบับ/เชื่อ AI" · ก่อนกดใช้เฉลยรุ่นอื่นส่วนใหญ่ (`same_side`)

## 4. วิธีทำงานกับข้อมูล (สำคัญ)
- **ห้ามแก้** `data/blocks/*/exams/*.json` ที่มี `generated_by` ด้วยมือ → แก้ต้นทางใน `auditor/` แล้ว build ใหม่
  - เปลี่ยนเฉลย MCQ: เพิ่มใน `auditor/data/decisions.json` `{"<set>_<NNN>": {"answer":"E","note":"…"}}` → `python3 auditor/tools/build_work.py --set <set>` → `python3 auditor/tools/build_outputs.py --block <end|gi>`
  - แก้โจทย์ MCQ: `auditor/data/work/<set>.repair.json` → questions.<เลข>.edits `[{"field":"stem","old":"…","new":"…"}]` แล้ว build เหมือนข้างบน
  - **OSPE: ข้อความสถานี (case) และคำถาม (prompt) ต้องเป็นภาษาไทย** ศัพท์แพทย์คงอังกฤษ ต่อท้าย `(ตอบภาษาอังกฤษ)` เพราะ accepted เป็นอังกฤษ (ผู้ใช้สั่ง 2026-11-09; END และ GI ทำแล้ว)
  - KF/OSPE: แก้ `auditor/data/work/<set>.kf.json` → `python3 auditor/tools/build_kf.py --set <set>`
- ชุดใหม่ (MCQ): `extract.py --set` → `parse_mcq.py` → AI ตอบเองก่อนดูเฉลย (`blind.json`) → อ่านเฉลย (`key.json`) → `repair.json` → รูปใน `auditor/data/images.json` + `crop_images.py` → build · ขั้นละเอียด: `prompt-exam-auditor.md`
- กติกาเฉลย: AI ไม่เห็นด้วย = เก็บเฉลยต้นฉบับ ติด disputed · ไม่มีเฉลย = AI ร่าง ติด draft · อย่าเดาเกินที่ภาพบอก

## 5. กับดักที่เจอแล้ว
- `config.json` มี API key **ห้ามเปิดอ่าน/พิมพ์** ห้ามใส่ key ลง repo
- PDF บางไฟล์ฟอนต์ไทยเพี้ยน (เปyน/ขWอ) → แก้อัตโนมัติแล้วใน `build_work.py fix_thai()`
- ตัวตรวจคำตอบพิมพ์ (`lib/quizcore.js autoMatch`): คำตอบอังกฤษต้องตรงตั้งแต่ต้นคำ, ≤3 ตัวอักษรต้องเป็นคำเต็ม → ใส่ accepted เป็นคำ/วลี ไม่ใช่เศษกลางคำ · `case` ของ OSPE ห้ามบรรยายภาพจนเฉลยหลุด
- ไฮไลต์เฉลยมีหลายสี → `parse_key.py`; วัดไม่ได้ให้อ่านด้วยตา
- ตัดรูปต้องรวมป้าย A/B/ลูกศร แล้วดูภาพรวมทุกครั้ง · รูปที่ลงทะเบียนแต่ไม่ใช้ทำ build error
- `node tools/validate.cjs | tail` ซ่อน exit code → ใช้ `> file; echo $?`

## 6. ถัดไป (เรียงลำดับ)
1. KUB ครบแล้ว รอ PR #38 merge · ถัดไป GI MCQ 43–52 เฉลยแบบปี 52 (branch แยก) · commit+push ทุกชุดพร้อมบรรทัด `ถัดไป:`
2. CVS: เฉลยขัดที่ยังไม่มี `ai_answer` เหลือ 3 MCQ (49-019 ไม่มีตัวเลือกถูก · 50-049 · 51-011 ไม่แน่ใจ) + KF 51-001/006 + OSPE 51-011
3. ข้อ draft ที่ต้นฉบับไม่มีเฉลย รอคนตรวจ

## 7. อ่านเพิ่มเมื่อจำเป็นเท่านั้น
`auditor/PROGRESS.md` (รายชุด) · `NEXT_TASKS.md` · `docs/FORMAT.md` (รูปแบบข้อมูล) · `lib/validate.js` (กติกาข้อมูล) · `CLAUDE.md` (กติกาทีม)
