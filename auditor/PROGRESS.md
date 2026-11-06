# PROGRESS — PSU Exam Auditor

แผนงานหลัก: [`../prompt-exam-auditor.md`](../prompt-exam-auditor.md) (อ่านก่อนเริ่มทุก session)

## ข้อตกลงกับผู้ใช้ (2026-11-07)
- ทำใน `medlib/auditor/` ส่งออกรูปแบบ psu-quiz (ตาม schema §6.1 เพราะใน projects/CVS ไม่มี data.json ของ psu-quiz) และคัดลอกเข้าเว็บ MedLib ด้วย
- pilot = 1 ชุด (`end_52_MCQ`) แล้วรอ feedback ก่อนขยาย
- commit ลง repo public ได้ · งาน auditor commit/push/PR บน branch แยกได้โดยไม่ต้องถามทีละครั้ง ห้ามแตะ main
- PDF ต้นฉบับอ่านจาก Drive ด้วย key ใน `../config.json` (สคริปต์อ่านเอง ไม่พิมพ์ key) แคชไว้ใน `source/` `raw/` (gitignored)

## Phase status
- [~] 0 Inventory — มีรายชื่อไฟล์ครบ 709 ไฟล์จาก `node tools/drive-list.cjs` แล้ว แต่ `data/inventory.json` ยังมีแค่ชุด pilot
- [x] 1–5 pilot `end_52_MCQ`
- [x] 6 QA pilot — quiz JSON schema 0 error · MedLib validate ผ่าน · headless Chrome `auditor/tools/check_site.mjs` 7/7 · `_test/qa.mjs` 26/26
- [ ] สุ่มตรวจซ้ำ 10% ของ source_agree (Phase 6) — ยังไม่ทำ

## Sets
| set_id | extract | audit (agree/disagree/drafted/unverified/ai_gen/skipped) | repair | build | PR |
|---|---|---|---|---|---|
| end_52_MCQ | ✓ 81/81 (text layer; key = ไฮไลต์ชมพู + โน้ตน้ำเงิน) | 62/0/0/5/0/14 · AI ตรงต้นฉบับ 67/67 | ✓ | ✓ json · report · pdf · MedLib | ดูแชท |

## Waiting for user
- `REVIEW.md`: 7 รายการ (ข้อ 18, 27, 32, 46, 63, 73, 81)

## ขั้นตอนต่อชุด (สิ่งที่สคริปต์ทำ / สิ่งที่ AI ทำ)
```
.venv/Scripts/python auditor/tools/extract.py   --set <id>   # ดาวน์โหลด + text/png ต่อหน้า
.venv/Scripts/python auditor/tools/parse_mcq.py --set <id>   # โจทย์/ช้อยส์ (อ่านเฉพาะไฟล์ข้อสอบ)
  → AI: data/work/<id>.blind.json   (ตอบทุกข้อก่อนเปิดเฉลย)
.venv/Scripts/python auditor/tools/parse_key.py --set <id>   # เฉลยต้นฉบับจากไฮไลต์ + โน้ต
  → AI: data/work/<id>.repair.json  (explanation, edits, flags, duplicate groups)
.venv/Scripts/python auditor/tools/build_work.py --set <id>  # รวม + ตั้ง answer_status (ใช้ decisions.json)
.venv/Scripts/python auditor/tools/build_outputs.py          # quiz JSON, reports, REVIEW.md, MedLib
.venv/Scripts/python auditor/tools/build_pdf.py --set <id>   # PDF ใหม่
node auditor/tools/check_site.mjs END 52                     # QA ในเว็บ (ต้องเปิด start.bat)
```

## ข้อสังเกตจาก pilot (ใช้กับชุดถัดไป)
- เฉลยรุ่น 52 เป็น PDF มี text layer แต่ไฮไลต์ฝังในภาพหน้า → `parse_key.py` วัดพิกเซลสีชมพู; เฉลยรุ่นเก่า (30–108 MB) น่าจะเป็นภาพสแกน ต้องใช้ OCR/vision
- text layer ภาษาไทยของไฟล์นี้ทำวรรณยุกต์หาย ("เปน") → โน้ตต้นฉบับเก็บไว้ใน `audit.source_answer_note` เท่านั้น คำอธิบายเขียนใหม่
- ข้อที่มีแค่ "–" ไม่มีข้อมูล → skipped (เก็บใน work file) รอ Phase 4 เติมจากข้อซ้ำรุ่นอื่น
- ยังไม่ได้ทำ `tools/run.py` (§7) กับ `crop_images.py` (ชุดนี้ไม่มีรูป)

## Last session
2026-11-07: pilot end_52_MCQ ครบทุก phase
