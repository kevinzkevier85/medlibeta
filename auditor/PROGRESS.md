# PROGRESS — PSU Exam Auditor

แผนงานหลัก: [`../prompt-exam-auditor.md`](../prompt-exam-auditor.md) (อ่านก่อนเริ่มทุก session)

## ข้อตกลงกับผู้ใช้ (2026-11-07)
- ทำใน `medlib/auditor/` ส่งออกรูปแบบ psu-quiz (ตาม schema §6.1 เพราะใน projects/CVS ไม่มี data.json ของ psu-quiz) และคัดลอกเข้าเว็บ MedLib ด้วย
- pilot = 1 ชุด (`end_52_MCQ`) แล้วรอ feedback ก่อนขยาย
- commit ลง repo public ได้ · งาน auditor commit/push/PR บน branch แยกได้โดยไม่ต้องถามทีละครั้ง ห้ามแตะ main
- PDF ต้นฉบับอ่านจาก Drive ด้วย key ใน `../config.json` (สคริปต์อ่านเอง ไม่พิมพ์ key) แคชไว้ใน `source/` `raw/` (gitignored)

## Phase status
- [~] 0 Inventory — Endocrine MCQ ครบ 9 รุ่นใน `data/inventory.json` (42-43, 44, 45, 46, 47, 49, 50, 51, 52; ไม่มีรุ่น 48 ใน Drive) · block อื่นยังไม่ทำ
- [x] 1–5 pilot `end_52_MCQ`
- [x] 6 QA pilot — quiz JSON schema 0 error · MedLib validate ผ่าน · headless Chrome `auditor/tools/check_site.mjs` 7/7 · `_test/qa.mjs` 26/26
- [ ] สุ่มตรวจซ้ำ 10% ของ source_agree (Phase 6) — ยังไม่ทำ

## Sets
| set_id | extract | audit (agree/disagree/drafted/unverified/ai_gen/skipped) | repair | build | PR |
|---|---|---|---|---|---|
| end_51_MCQ | ✓ 75 (exam text · key iOS PDF หน้าว่าง → แก้ BBox, อ่านเฉลยด้วยตา: วงชมพู/แถบส้ม · เฉลยหมดที่ข้อ 71) | 24/3/3/3/6/36 | ✓ | ✓ json · report · MedLib | finn-end-mcq-all |
| end_52_MCQ | ✓ 81/81 (text layer; key = ไฮไลต์ชมพู + โน้ตน้ำเงิน) | 62/0/0/5/0/14 · AI ตรงต้นฉบับ 67/67 | ✓ | ✓ json · report · pdf · MedLib | ดูแชท |

## Waiting for user
- `REVIEW.md`: 89 รายการ (Endocrine MCQ ทุกรุ่น)
- ✓ REVIEW 7 ข้อของ end_52_MCQ ตัดสินแล้ว (2026-11-07) อยู่ใน `data/decisions.json` · decision รองรับ `also_accept` (นับถูกหลายช้อยส์) ส่งเข้า MedLib เท่านั้น (psu-quiz JSON ยังเฉลยเดียว)

## Next
- MCQ Endocrine ทุกรุ่น (ผู้ใช้สั่ง 2026-11-07) — ทำ inventory จาก Drive ก่อน แล้วรันทีละชุด

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

## Cloud session
- Drive key อยู่ใน cloud environment `medlibeta` (Network secret host `www.googleapis.com`, header `X-goog-api-key`) ไม่มี `config.json` → สคริปต์ไม่ใส่ `key=` เอง proxy ใส่ให้ · node ต้องรันด้วย `NODE_USE_ENV_PROXY=1`
- ใช้ `python3` แทน `.venv/Scripts/python` (ต้อง `pip install pymupdf`)

## ข้อสังเกตจาก pilot (ใช้กับชุดถัดไป)
- รุ่น 51: เฉลยเป็น PDF จาก iOS ที่ทุกหน้าวาดใน form BBox [0 0 0 0] → render ว่าง; `extract.py` แก้ให้แล้ว · ผู้เฉลยวงคำตอบเป็นวงชมพูหรือแถบส้ม/เหลือง `parse_key.py` จับไม่ได้ ต้องอ่านด้วยตาแล้วเขียน `<set>.key.json` เอง
- เฉลยรุ่น 52 เป็น PDF มี text layer แต่ไฮไลต์ฝังในภาพหน้า → `parse_key.py` วัดพิกเซลสีชมพู; เฉลยรุ่นเก่า (30–108 MB) น่าจะเป็นภาพสแกน ต้องใช้ OCR/vision
- text layer ภาษาไทยของไฟล์นี้ทำวรรณยุกต์หาย ("เปน") → โน้ตต้นฉบับเก็บไว้ใน `audit.source_answer_note` เท่านั้น คำอธิบายเขียนใหม่
- ข้อที่มีแค่ "–" ไม่มีข้อมูล → skipped (เก็บใน work file) รอ Phase 4 เติมจากข้อซ้ำรุ่นอื่น
- ยังไม่ได้ทำ `tools/run.py` (§7) กับ `crop_images.py` (ชุดนี้ไม่มีรูป)

## Last session
2026-11-07: pilot end_52_MCQ ครบทุก phase · MedLib v0.4.0: export ใช้ `papers` (ไม่ใช่ lectures) + `time_limit_min`; เว็บแสดงเป็นชุดแบบ CVS

## Endocrine MCQ — สรุปทุกรุ่น (2026-11-07)
| set_id | ข้อในต้นฉบับ | สถานะ |
|---|---|---|
| end_52_MCQ | 81 | skipped 14, source_agree 62, source_unverified 5 |
| end_51_MCQ | 75 | ai_generated 6, drafted 3, skipped 36, source_agree 24, source_disagree 3, source_unverified 3 |
| end_50_MCQ | 71 | ai_generated 5, drafted 1, skipped 12, source_agree 42, source_disagree 8, source_unverified 3 |
| end_49_MCQ | 38 | ai_generated 1, drafted 1, source_agree 27, source_disagree 9 |
| end_47_MCQ | 63 | drafted 1, source_agree 58, source_disagree 4 |
| end_46_MCQ | 51 | ai_generated 1, source_agree 47, source_disagree 1, source_unverified 2 |
| end_45_MCQ | 61 | ai_generated 7, source_agree 48, source_disagree 4, source_unverified 2 |
| end_44_MCQ | 48 | source_agree 46, source_disagree 1, source_unverified 1 |
| end_42-43_MCQ | 154 | ai_generated 4, drafted 1, skipped 1, source_agree 127, source_disagree 21 |
- เฉลยทุกรุ่นอ่านด้วยตา (ไฮไลต์/วง/กากบาท) บันทึกใน `<set>.key.json` (42-43 มี `keyread.txt`)
- 42-43 เป็นไฟล์รวม 2 รุ่น แสดงใน MedLib เป็นรุ่น 43 (`medlib_cohort`)
- ยังไม่ทำ: Phase 4 cross-year (duplicate_group ข้ามรุ่น), สุ่มตรวจซ้ำ 10%, key2 ของรุ่น 45
