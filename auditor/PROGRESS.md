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
| end_52_KF | ✓ 16 ข้อ 35 ข้อย่อย (ต้นฉบับ `projects/END/ข้อสอบ/KF` = ไฟล์เดียวกับ Drive) อ่านด้วยตาทุกหน้า | เห็นด้วยกับเฉลยทุกข้อ · เพิ่มคำตอบอื่นที่ถูก 10.1, 12.4, 13.2 · audit_note 13.1 (FNA vs TSH/US) | — | ✓ `build_kf.py` · MedLib v0.15.0 · รูปเฉลยข้อ 2.2 (native) | kel-end-kf-52 |
| end_52_MCQ | ✓ 81/81 (text layer; key = ไฮไลต์ชมพู + โน้ตน้ำเงิน) | 62/0/0/5/0/14 · AI ตรงต้นฉบับ 67/67 | ✓ | ✓ json · report · pdf · MedLib | ดูแชท |

## GI (เริ่ม 2026-11-07, ผู้ใช้สั่ง "ทำ block ต่อไปเรื่อยๆ" เลือก GI ครบ MCQ+KF+OSPE)
- Drive: `preclinic/2/gi` — MCQ 10 ชุด (41-43, 44–52), KF 9, OSPE 7 · ไม่มี lecture · ไล่ด้วย `auditor/tools/drive_walk_api.py` (drive.google.com ถูกบล็อกใน cloud)
- เฉลย GI 52 ไฮไลต์สีชมพูอมม่วง (g≈128) → ขยายช่วงสีใน `parse_key.py`
- ข้อรูป: เปิดดูรูปในหน้า **ข้อสอบ** ก่อนตอบ blind (ชุด 52 ไม่ได้ดู → ข้อ 51–54 ตั้งเป็น source_unverified)

| set_id | ข้อ | สถานะ |
|---|---|---|
| gi_52_MCQ | 100 | source_agree 86, source_disagree 5, source_unverified 4, skipped 5 |
| gi_51_MCQ | 99 | recall · เฉลยวงแดงอ่านด้วยตา · source_agree 36, source_disagree 8, ai_generated 10, drafted 2, skipped 43 |
| gi_50_MCQ | 101 | recall · เฉลยอ่านด้วยตา · source_agree 51, source_disagree 6, ai_generated 17, drafted 4, skipped 23 · needs_review 11 |
| gi_49_MCQ | 65 | recall (65 จาก 128 ข้อ) · เฉลยอ่านด้วยตา · source_agree 52, source_disagree 5, ai_generated 6, drafted 1, skipped 1 · needs_review 7 |
| gi_48_MCQ | 75 | recall (75 จาก 128) · เลขข้อไม่มีจุด → `parse_mcq/parse_key --bare-numbers` · ไฮไลต์เหลืองเขียว (parse_key อ่านได้แล้ว) ตรวจด้วยตาทุกหน้า · source_agree 58, source_disagree 11, ai_generated 4, drafted 2 · needs_review 12 |
| gi_47_MCQ | 99 | ข้อสอบ 2 คอลัมน์ มีลายน้ำ (รูปต้องตัดจากหน้า ไม่ใช้ native) · เฉลยเป็นขีด / ด้วยมือ อ่านด้วยตา · source_agree 82, source_disagree 12, ai_generated 5 · needs_review 14 |
| gi_46_MCQ | 78 | recall (78 จาก 129) · ไฮไลต์ชมพู parse_key อ่านได้ (ช้อยส์คอลัมน์ขวา/ตัวอักษรซ้ำ ตรวจด้วยตา) · source_agree 65, source_disagree 4, ai_generated 7, drafted 2 · needs_review 4 |
| gi_45_MCQ | 46 | recall · ตัวอักษรไทยใน text layer เพี้ยน (U→้, j→่) แก้ใน parsed.json · ข้อ 28/29, 45/46 ติดกัน แยกด้วยมือ · เฉลยขีด / อ่านด้วยตา · ⚠ เปิดหน้าเฉลย 1, 10, 15 ก่อนตอบ (ข้อ 1–3, 28–31, 44–46 ติด needs_review) · source_agree 41, source_disagree 5 · needs_review 14 |
| gi_44_MCQ | 73 | recall (เลข 2–125) · ไฮไลต์ส้มอ่อน (เพิ่มสีใน parse_key แต่ตัวอักษรสีเกือบดำทำให้ parse_key หาเลขข้อไม่เจอ → วัดสีเองต่อช้อยส์ + ดูด้วยตา) · แยกข้อ 32/67/82/100/102/104 ด้วยมือ · ไม่มีรูปใน PDF (ข้อ 78, 95) · source_agree 52, source_disagree 12, ai_generated 3, drafted 6 · needs_review 15 |
| gi_41-43_MCQ | 229 | ไฟล์รวม 3 รุ่น (PART 1–3 เลขเริ่มใหม่ → `parse_mcq --part-offsets 0,100,300,400`; PART 4 = ข้อเขียนรุ่น 41 ไม่มีช้อยส์ ข้าม 20 ข้อ) · ไฮไลต์เหลืองวัดต่อช้อยส์ (สีทองเหลือบเขียวหลายเฉด) + อ่านโน้ตน้ำเงิน/แดงจาก text layer · ข้ามรวม 29 (กำกวม/ไม่มีเฉลย/ซ้ำ) · source_agree 166, source_disagree 26, drafted 6, ai_generated 2 · needs_review 38 · เลขข้อในแอป = ออฟเซ็ต (เช่น 301 = MED43 ข้อ 1) |
| gi_52_KF | 21 ข้อ 70 ข้อย่อย | KF · ข้อ 19–21 ไม่มีเนื้อหา · เฉลยลายมือน้ำเงินบนข้อสอบ (text layer ครบ) · รูป 7 (native) · ข้อวาดรูป 7.3 ให้ตัดสินเอง · หมายเหตุ 8.4 โจทย์พิมพ์ sucrose แต่เฉลย SGLT1, 9.1 ผู้เฉลยไม่แน่ใจ (disputed) · รูปที่ 2 ของข้อเดียวกันใช้ id ลงท้ายตัวอักษร เช่น `_010b` |
| gi_51_KF | 17 ข้อ 52 ข้อย่อย | KF · ข้อ 11, 12, 20 ต้นฉบับมีแค่ "–", ข้อ 13 "เหมือนปี 49" (ข้ามทั้ง 4) · เฉลยลายมือน้ำเงินบนข้อสอบ · รูป 7 (4 ข้อสอบ + 3 รูปจากเฉลย) · 5.3 ข้อวาดรูปให้ตัดสินเอง |
| gi_50_KF | 24 ข้อ 72 ข้อย่อย | KF · เฉลยลายมือดำบนข้อสอบ (text layer ของเฉลย = ข้อสอบเปล่า ลายมืออยู่ในภาพ) · ข้อ 16 (ไวรัส) และ 26–28 ไม่มีเนื้อหา · ข้อ 11+12 รวมเป็นข้อ 11 · รูป 6 (5 ข้อสอบ + 1 ลายมือเฉลย) · 24.2 ลายมือท้ายบรรทัดอ่านยาก |
| gi_49_KF | 16 ข้อ 67 ข้อย่อย | KF (ข้อสอบจริง 22 ข้อ) · เฉลยลายมือแดง + สไลด์แนบ (ข้อ 3, 16 ไม่มีลายมือ เฉลยตามสไลด์) · รูป 13 (4 ข้อสอบ + 9 สไลด์เฉลย) · ข้อ 4.1 เฉลย glucose 'increase' ขัดรุ่น 50–52 (decrease) → disputed · ข้อ 5.5 เฉลย IBS (รุ่น 52 ตอบ SIBO) |
| gi_48_KF | 12 ข้อ 41 ข้อย่อย | KF (ข้อสอบจริง 20 ข้อ) · ไม่ระบุเวลา · เฉลยลายมือแดง · ข้อ 7 ไม่มีโจทย์ (ข้าม) · ข้อ 13 ไม่มีเฉลย AI ร่างให้ (draft) · disputed: 2 (urobilinogen no change ขัดรุ่น 52), 5 (cAMP vs cGMP) · รูป 4 (1 ข้อสอบ + 3 เฉลย) |
| gi_47_KF | 19 ข้อ 77 ข้อย่อย | KF (ข้อสอบจริง 20 ข้อ, 180 นาที) · เฉลยลายมือดำ "โดย Med PSU 52" · รูป 3 · หมายเหตุ: 4.3 เฉลย CFTR ดูด Cl⁻ (สรีรวิทยา: หลั่งออก), 11.6 เฉลย Enterovirus 72, 11.7 ลายมือ B/E ใช้ E, 17.2 ลายมือผล MacConkey อ่านไม่ชัด |
| gi_46_KF | 19 ข้อ 59 ข้อย่อย | KF 150 นาที · หน้าเฉลย 612×867 pt (ข้อสอบ 595×842 และแบ่งหน้าต่างกัน → `exam_page` ต่อข้อใน work file) · รูป 20 (1 ข้อสอบ + 19 สไลด์เฉลยตัดด้วย rect เพื่อเก็บ highlight) · disputed: 3 (urobilinogen ขัดรุ่น 48), 5 (adenylate vs cGMP), 11 (marker ขัดกันเอง), 13 (เฉลยเลือก HDV ต่างตำรา HBV) |
| gi_44_KF | 32 ข้อ 82 ข้อย่อย | KF · เฉลยลายมือน้ำเงินบนข้อสอบ + สไลด์แนบ (หน้าเฉลย = ข้อสอบ 595×842) · ข้อ 1 ไม่มีเฉลย (AI ร่าง, draft) · รูปไข่พยาธิข้อ 22, 24 ที่โจทย์อ้างไม่มีในไฟล์ · disputed: 4, 8, 13, 19, 22 · รูป 20 (1 ข้อสอบ + 19 เฉลย) · เฉลยข้อ 29 ตอบ HBV (ต่างจากรุ่น 46 ที่ตอบ HDV) |

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

## KF — ขั้นตอนต่อชุด (เริ่ม 2026-11-07 ที่ชุด 52 แล้วไล่ลง)
```
cp "../END/ข้อสอบ/KF/<ข้อสอบ>.pdf" auditor/source/end_<c>_KF__exam.pdf  (และ __key.pdf)   # หรือดาวน์โหลดจาก Drive
python auditor/tools/drive_walk_public.py 1xM-kIO6FthQ021JfvWnYB3kkwh1Ht3HZ --path preclinic/2/endocrine/kf   # id ไฟล์ใน Drive (ไม่ต้องมี key)
  → เพิ่มชุดใน data/inventory.json · AI อ่านทุกหน้าของข้อสอบและเฉลยด้วยตา → data/work/end_<c>_KF.kf.json
  → รูปทุกรูปใส่ data/images.json → crop_images.py --set end_<c>_KF → เปิดดูไฟล์ที่ได้ทุกรูป
.venv/Scripts/python auditor/tools/build_kf.py --set end_<c>_KF && node tools/validate.cjs && node _test/kf_check.mjs END <c>
```
### กติกาแคปรูป (ผู้ใช้ย้ำ 2026-11-07 — รอบ KF CVS เคยแคปไม่ครบ)
- **ต้องได้ทั้งภาพ** ทุกขอบ ทุก label/legend/คำบรรยายใต้ภาพที่เป็นของรูปนั้น ห้ามตัดชิดจนขอบหาย
- ไล่ดูทุกหน้าของ **ทั้งไฟล์ข้อสอบและไฟล์เฉลย** (เฉลยมักมีสไลด์/รูปอธิบายเพิ่ม → `role: key` แสดงเป็น `key_image` ตอนเฉลย)
- ถ้ารูปเป็นภาพฝังภาพเดียว ใช้ `native: true` (ดึงไฟล์ภาพเต็มความละเอียดเดิม ตีกรอบพลาดไม่ได้) · ถ้าเป็นภาพวาด/ตาราง vector หรือหลายชิ้นรวมกัน ตีกรอบ `rect` เผื่อขอบ แล้วเปิดไฟล์ที่ได้เทียบกับหน้าเต็มทุกครั้ง
- `build_kf.py` ล้มถ้ารูปใน images.json ไม่มีข้อไหนใช้ หรือข้อไหนอ้างรูปที่ไม่มีไฟล์
- ตารางเปล่าให้กรอกคำตอบ (เช่น Laboratory Test | Result) ไม่ใช่รูป ให้แปลงเป็นข้อย่อย · โลโก้รุ่นหัวกระดาษไม่ใช่รูปโจทย์

## ข้อสังเกตจาก pilot (ใช้กับชุดถัดไป)
- รุ่น 51: เฉลยเป็น PDF จาก iOS ที่ทุกหน้าวาดใน form BBox [0 0 0 0] → render ว่าง; `extract.py` แก้ให้แล้ว · ผู้เฉลยวงคำตอบเป็นวงชมพูหรือแถบส้ม/เหลือง `parse_key.py` จับไม่ได้ ต้องอ่านด้วยตาแล้วเขียน `<set>.key.json` เอง
- เฉลยรุ่น 52 เป็น PDF มี text layer แต่ไฮไลต์ฝังในภาพหน้า → `parse_key.py` วัดพิกเซลสีชมพู; เฉลยรุ่นเก่า (30–108 MB) น่าจะเป็นภาพสแกน ต้องใช้ OCR/vision
- text layer ภาษาไทยของไฟล์นี้ทำวรรณยุกต์หาย ("เปน") → โน้ตต้นฉบับเก็บไว้ใน `audit.source_answer_note` เท่านั้น คำอธิบายเขียนใหม่
- ข้อที่มีแค่ "–" ไม่มีข้อมูล → skipped (เก็บใน work file) รอ Phase 4 เติมจากข้อซ้ำรุ่นอื่น
- ยังไม่ได้ทำ `tools/run.py` (§7)
- รูปในข้อ: `data/images.json` (คู่ข้อ ↔ หน้า + กรอบ ตรวจด้วยตาทุกรูป) → `crop_images.py` → `data/blocks/<B>/img/<id>.jpg`; build_work ล้มถ้าโจทย์อ้างถึงรูปแต่ไม่มีรูป (ยกเว้นใน `no_image`)

## Last session
2026-11-07 (เย็น): KF Endocrine ชุด 52 เสร็จ (branch kel-end-kf-52) · ถัดไป KF 51 → 42-43
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
