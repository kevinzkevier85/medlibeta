# HANDOFF — อ่านไฟล์นี้ก่อนเริ่มงาน (อัปเดต 2026-11-08 โดย Claude, session ของ Finn)

## 1. ตอนนี้
- ไม่มีงานค้าง · main = v0.25.0 · PR ทั้งหมด merge แล้ว (#25 #27 #33 #34 #35)
- งานตั้งเวลา "เช็ก issue ใหม่ MedLib" (trig_01YD7XFNaBoSEgDDzniA6jER) ทุก 3 ชม. ส่งเข้า session ของ Finn

## 2. ผู้ใช้ต้องการ (Finn)
- ตอบภาษาไทย สั้น ภาษาคน · ถามได้เฉพาะแบบช้อยส์ให้ติ๊ก · "ทำไปเรื่อย ๆ ไม่ต้องถาม" + "ประหยัดโทเค็นที่สุด"
- issue ใหม่ → แก้เองได้เลย (กติกาใน CLAUDE.md) · PR ให้อีกคนตรวจและ merge เสมอ
- บล็อกถัดไปยังไม่เลือก: ตัวเลือก respiratory (Drive 59 ไฟล์), urinary (44), immunity (46)

## 3. สถานะข้อมูล
| บล็อก | MCQ | KF | OSPE | หมายเหตุ |
|---|---|---|---|---|
| END | 9 ชุด | 1 | – | lecture + topics ครบ, แผนอ่านรายบท |
| GI | 10 ชุด (864) | 9 (196) | 7 (193 สถานี) | ไม่มี lecture ใน Drive |
| CVS | 11 ชุด (import เดิม) | | | |
- ข้อ MCQ เฉลยขัด AI 123 ข้อ: มี `ai_answer` + ปุ่มเชื่อต้นฉบับ/AI · ข้อซ้ำข้ามรุ่น `auditor/data/same/*.json`

## 4. จุดที่ต้องระวัง
- `config.json` ห้ามเปิดอ่าน · cloud: Drive ผ่าน proxy, GitHub ผ่าน mcp__github__ เท่านั้น
- ไฟล์ `data/blocks/*/exams/*.json` ที่มี generated_by ห้ามแก้มือ → แก้ `auditor/data/work` / `decisions.json` / repair แล้ว build
- MCQ: `build_work.py --set` → `build_outputs.py --block` · KF/OSPE: work `<set>.kf.json` → `build_kf.py --set`
- ฟอนต์ไทยเพี้ยนใน PDF (เปyน/ขWอ) แก้อัตโนมัติด้วย `fix_thai()` ใน build_work.py
- ไฮไลต์เฉลยมีหลายสี (ชมพู/เขียวมะนาว/แซลมอน/เหลือง) → `parse_key.py`; ถ้าวัดไม่ได้ อ่านด้วยตา
- รูป: ตัดด้วย rect ให้รวมป้าย A/B/ลูกศร แล้วดู contact sheet ทุกครั้ง · รูปที่ลงทะเบียนแต่ไม่ใช้ → build_kf error
- `node tools/validate.cjs | tail` กลืน exit code → redirect แล้ว `echo $?`
- ทุกการส่งงาน: version.json + CHANGELOG + `?v=` index.html + VERSION sw.js

## 5. ถัดไป
1. รอผู้ใช้เลือกบล็อกถัดไป แล้วทำ MCQ → KF → OSPE ทีละบล็อก (pipeline เดียวกับ GI)
2. CVS ข้อเฉลยขัด 14 ข้อยังไม่มี ai_answer
3. ข้อ OSPE/KF ที่ต้นฉบับไม่มีเฉลย (draft) รอคนตรวจ

## 6. ชี้ไปที่
- `auditor/PROGRESS.md` (รายชุด) · `NEXT_TASKS.md` · `prompt-exam-auditor.md` (ขั้นตอน auditor) · `docs/FORMAT.md` · `docs/superpowers/specs/`
