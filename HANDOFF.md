# HANDOFF — กระดาษส่งต่องาน (ยื่นให้ AI ตัวไหนก็ได้ อ่านใบนี้ใบเดียวแล้วทำต่อได้)
> งานที่ทำค้างล่าสุด: ดู branch ที่ push ล่าสุด `git branch -r --sort=-committerdate | head -3` แล้ว `git log -5 --format=%B <branch>` — บรรทัด `ถัดไป:` คือขั้นต่อไป
อัปเดต: 2026-11-08 · เขียนโดย Claude (ผู้ใช้: Finn)

## 0. โปรเจกต์นี้คืออะไร
- **MedLib** = เว็บคลังข้อสอบ/lecture แพทย์ PSU ปี 1–3 (static HTML+JS, ไม่มี build) · repo `github.com/kevinzkevier85/medlibeta` · เว็บ `kevinzkevier85.github.io/medlibeta`
- ข้อสอบต้นฉบับ = PDF ของรุ่นพี่ใน Google Drive (`preclinic/<ปี>/<บล็อก>/`) → AI อ่าน ตรวจเฉลย ตัดรูป → JSON ใน `data/blocks/<BLOCK>/exams/`
- ทำงาน 2 คน (Finn + เพื่อน): แก้บน branch `finn-…` → PR → **อีกคนเป็นคน merge** ห้าม push main ตรง ห้าม force push
- รันเว็บ: `python -m http.server 8765` · ตรวจข้อมูล: `node tools/validate.cjs` (ต้องผ่านก่อนส่งทุกครั้ง)
- ส่งงานทุกครั้ง: เพิ่มเลขใน `version.json` + `CHANGELOG.md` + `?v=` ใน `index.html` + `VERSION` ใน `sw.js`

## 1. งานค้างตอนนี้
- ไม่มีงานค้าง · main = **v0.25.0** · PR ทั้งหมด merge แล้ว (ล่าสุด #36)
- ทุก 3 ชม. มีงานตั้งเวลาเช็ก GitHub issue ใหม่ (ฝั่ง Claude ของ Finn)

## 2. ผู้ใช้ (Finn) ต้องการ
- ตอบภาษาไทย สั้น ภาษาคน · ถ้าจะถาม ให้ถามเป็นช้อยส์ให้ติ๊ก
- "ทำไปเรื่อย ๆ ไม่ต้องถาม" · "ประหยัดโทเค็นที่สุด" = ประหยัดที่ **วิธีทำ** เท่านั้น **ผลลัพธ์ต้องคุณภาพเท่าบล็อก GI** (ผู้ใช้ย้ำ 2026-11-08): ห้ามข้ามข้อที่จำโจทย์มาไม่ครบ → AI เขียนโจทย์เต็ม (ai_generated) · ช้อยส์ไม่ครบ → เติมให้ครบ 5 (ai_choices) · ข้อมีรูป → ตัดรูปใส่ · explanation เต็ม (เหตุผล + Trap) · ข้ามได้เฉพาะข้อที่ต้นฉบับว่างเปล่าจริง (ขีด –)
- มี GitHub issue ใหม่ (เช่น "[เฉลย] END-47-MCQ-006 ควรเป็น E" จากปุ่มแจ้งเฉลยในเว็บ) → แก้เองได้เลย แล้วเปิด PR ใส่ `Closes #เลข`
- บล็อกถัดไป: ยังไม่เลือก (respiratory / urinary / immunity)

## 3. สถานะข้อมูล
| บล็อก | MCQ | KF | OSPE |
|---|---|---|---|
| END (Endocrine) | 9 ชุด + lecture + แผนอ่าน | 1 | – |
| GI | 10 ชุด 864 ข้อ | 9 ชุด 196 ข้อ | 7 ชุด 193 สถานี |
| CVS | 11 ชุด (import เก่า) | – | – |
- ข้อที่เฉลยต้นฉบับ ≠ AI: มี `ai_answer` ในข้อ + ปุ่ม "เชื่อต้นฉบับ/เชื่อ AI" · ก่อนกดใช้เฉลยรุ่นอื่นส่วนใหญ่ (`same_side`)

## 4. วิธีทำงานกับข้อมูล (สำคัญ)
- **ห้ามแก้** `data/blocks/*/exams/*.json` ที่มี `generated_by` ด้วยมือ → แก้ต้นทางใน `auditor/` แล้ว build ใหม่
  - เปลี่ยนเฉลย MCQ: เพิ่มใน `auditor/data/decisions.json` `{"<set>_<NNN>": {"answer":"E","note":"…"}}` → `python3 auditor/tools/build_work.py --set <set>` → `python3 auditor/tools/build_outputs.py --block <end|gi>`
  - แก้โจทย์ MCQ: `auditor/data/work/<set>.repair.json` → questions.<เลข>.edits `[{"field":"stem","old":"…","new":"…"}]` แล้ว build เหมือนข้างบน
  - KF/OSPE: แก้ `auditor/data/work/<set>.kf.json` → `python3 auditor/tools/build_kf.py --set <set>`
- ชุดใหม่ (MCQ): `extract.py --set` → `parse_mcq.py` → AI ตอบเองก่อนดูเฉลย (`blind.json`) → อ่านเฉลย (`key.json`) → `repair.json` → รูปใน `auditor/data/images.json` + `crop_images.py` → build · ขั้นละเอียด: `prompt-exam-auditor.md`
- กติกาเฉลย: AI ไม่เห็นด้วย = เก็บเฉลยต้นฉบับ ติด disputed · ไม่มีเฉลย = AI ร่าง ติด draft · อย่าเดาเกินที่ภาพบอก

## 5. กับดักที่เจอแล้ว
- `config.json` มี API key **ห้ามเปิดอ่าน/พิมพ์** ห้ามใส่ key ลง repo
- PDF บางไฟล์ฟอนต์ไทยเพี้ยน (เปyน/ขWอ) → แก้อัตโนมัติแล้วใน `build_work.py fix_thai()`
- ไฮไลต์เฉลยมีหลายสี → `parse_key.py`; วัดไม่ได้ให้อ่านด้วยตา
- ตัดรูปต้องรวมป้าย A/B/ลูกศร แล้วดูภาพรวมทุกครั้ง · รูปที่ลงทะเบียนแต่ไม่ใช้ทำ build error
- `node tools/validate.cjs | tail` ซ่อน exit code → ใช้ `> file; echo $?`

## 6. ถัดไป (เรียงลำดับ)
1. ถามผู้ใช้เลือกบล็อกถัดไป แล้วทำ MCQ → KF → OSPE ครบทีละบล็อก (แบบเดียวกับ GI)
2. CVS: 14 ข้อเฉลยขัด ยังไม่มี `ai_answer`
3. ข้อ draft ที่ต้นฉบับไม่มีเฉลย รอคนตรวจ

## 7. อ่านเพิ่มเมื่อจำเป็นเท่านั้น
`auditor/PROGRESS.md` (รายชุด) · `NEXT_TASKS.md` · `docs/FORMAT.md` (รูปแบบข้อมูล) · `lib/validate.js` (กติกาข้อมูล) · `CLAUDE.md` (กติกาทีม)
