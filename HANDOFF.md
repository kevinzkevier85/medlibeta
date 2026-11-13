# HANDOFF — กระดาษส่งต่องาน (ยื่นให้ AI ตัวไหนก็ได้ อ่านใบนี้ใบเดียวแล้วทำต่อได้)
> งานที่ทำค้างล่าสุด: ดู branch ที่ push ล่าสุด `git branch -r --sort=-committerdate | head -3` แล้ว `git log -5 --format=%B <branch>` — บรรทัด `ถัดไป:` คือขั้นต่อไป
อัปเดต: 2026-11-13 (v0.45.0 · Immunity/Respiratory/KUB merge เข้า main แล้ว ไม่มี PR ค้าง) · เขียนโดย Claude (ผู้ใช้: Finn)

## 0.0 บล็อก Commed I / Commed II / Community Health Dev (CM1, CM2, CD) — ทำบางส่วน (Drive `preclinic/2/commed-1|commed-2|community-dev`)
- ✅ CM1 MCQ 52 (29/33) · CM2 MCQ 52 (14/15) + 48 (14/15) · CD MCQ 52 (24/37) — ข้อสอบจำ ข้อว่าง/ตัวเลือกไม่มีข้ามหมด
- ✅ CM1 MCQ 48 (22/29 ข้อ · เฉลยลายมือ: X น้ำเงินที่ตัวอักษร หรือวงกลม/กรอบแดง = เฉลย · ข้อ 22–24 อ่านยาก ควรตรวจ · ข้อ 12 มี 2 คำตอบ · ข้อ 13–19 ข้าม) · ✅ CM2 KF 47 (ส่วน 1–2; ส่วน 3 sampling ไม่ใส่)
- ✅ MP1 (Medical Profession) KF 52 (10 ข้อ) + KF 50 (11 ข้อ; ไฟล์ข้อสอบเป็นวิชา Med Profession II) · เฉลยลายมือ/สไลด์ · **draft**: KF 52 ข้อ 1–4, KF 50 ข้อ 1–4, 10, 11 (ไฟล์ไม่มีเฉลย AI เขียน) · ข้อ KF 52 10.3 และ KF 50 6.1/6.3 ลายมืออ่านยาก ควรตรวจ · KF 42/39: ไฟล์เฉลยเป็นลายมือสแกนยาว (42: 12 หน้า; 39: เฉลยรวม 39,42 แต่เนื้อหาเป็นข้อสอบอีกเทอม) · KF 46: มีแต่ไฟล์ข้อสอบ 1 หน้า ไม่มีเฉลย
- 🔄 NERV (Nervous System ปี 3, `data/blocks/NERV`, inventory `nerv_<รุ่น>_<MCQ|KF|OSPE>` ลงทะเบียน 21 ชุด): **MCQ ครบทุกชุดแล้ว** 52 (77) · 51 (62) · 50 (70) · 49 (59) · 47 (126 **AI draft ทั้งชุด** เพราะเฉลยลายมือ 4-up อ่านไม่ได้) · 46 (56) · 45 (20) · **ตรวจ**: 52 ข้อ 38/54 · 51 ข้อ 12, 65 (AI เห็นต่าง) · 50 ข้อ 13, 19, 63, 64 · 49 ข้อ 51 · 46 ข้อ 41, 46, 50 · 47 ข้อ 30, 42, 49, 76 · **ยังไม่ทำ**: KF 45–52 · OSPE 42-43–52 · `parse_key.py`: เขียวกลาง, ขีด slash, `KEY_XMAX=700` (key 4-up)
- ⛔ ยังไม่ทำ (ต้องดูแลพิเศษ): **CM1 KF 49 / MCQ 49** (Drive มีแต่ไฟล์เฉลย ไม่มีไฟล์ข้อสอบ) · **CM2 KF 40** (สแกนเป็นภาพทั้งไฟล์ข้อสอบ 4 หน้า + เฉลยลายมือ ต้องอ่านจากภาพ) · **HS MCQ 52** (25 ข้อ แทบว่าง มีโจทย์ 6 ข้อไม่มีไฮไลต์ → ไม่ลงทะเบียน) · **medprof-1 KF 39, 42, 46** (50, 52 ทำแล้ว ดูบรรทัดถัดไป; 42/39/46 ยังไม่ทำ) (ตรวจแล้ว: ข้อสอบเป็นเรียงความ/จริยธรรม/ตรวจร่างกาย เฉลย=ลายมือที่ text layer เป็นขยะ ต้องอ่านจากภาพทุกหน้า · 46 มีแต่ไฟล์ข้อสอบ 1 หน้า ไม่มีเฉลย · 39 ใช้เฉลยรวม 39,42 · ชุด 52: Ottawa Charter ข้อ 5, vital sign/ตรวจ respiratory ข้อ 6–7, HT/valve ข้อ 8, ปวดท้อง HCC ข้อ 9, ใส่สายสวน/ตรวจภายใน ข้อ 10)
- ผู้ตรวจควรดู: เฉลยที่ไฟล์วง 2 ตัว (CM2 52 ข้อ 14, 18 · CM2 48 ข้อ 9 · CD 52 ข้อ 34 — ใส่ also_accept ใน decisions.json) · CM1 52 ข้อ 28 (secondary vs tertiary), ข้อ 37 (Bismarck vs managed competition), ข้อ 50 (primordial vs primary) · CD 52 ข้อ 16 · CM2 48 ข้อ 12 (วัด)
- เครื่องมือที่แก้: `parse_key.py` เพิ่มสีไฮไลต์ cyan · `parse_mcq.py`/`parse_key.py` รองรับตัวเลือก ก ข ค ง จ และปก "1. ข้อสอบมีทั้งหมด…" ที่เป็นไทยล้วน — **ห้าม re-parse ชุดเก่า** (จะเขียนทับ parsed.json ที่แก้มือ เช่น imm_47 ลบลายน้ำแล้ว)

## 0. บล็อก Biomed (BIO, Pharmacology) — ทำแล้ว (Drive `preclinic/2/biomed`)
- block id `BIO` · inventory `bio_<รุ่น>_<MCQ|KF>` 10 ชุด · ชุดรวม 46-48 ใช้ `medlib_cohort: 48`
- MCQ ✅ 52 (44 ข้อ) · 51 (20) · 49 (9) · 46-48 (40) · 50 (51 ข้อ ไม่มีเฉลย AI draft) — ข้อสอบรุ่น 49–51 เป็น "ข้อสอบจำ" ข้อที่ไม่มีตัวเลือก/เฉลยข้าม · ข้อที่ตัวเลือกไม่ครบ AI เติมครบ 5 (`ai_choices`)
- KF ✅ 52 (19) · 51 (8) · 49 (13) · 46-48 (20 · MED 46 ข้อ 22–28, 47 ข้อ 22–28, 48 ข้อ 21–26) · 50 (22 ไม่มีเฉลย AI draft)
- ผู้ตรวจควรดู: MCQ 52 ข้อ 43 (ไฟล์เฉลย alprostadil vs AI ibuprofen), ข้อ 10, 51; MCQ 49 ข้อ 20 vs MCQ 51 ข้อ 64 (เฉลยต่างกัน); KF 46-48 ข้อ 8 (sweat gland), ข้อ 13 (bradycardia β1 vs M2)
- Drive ที่ยังไม่ทำ: `preclinic/3` (hematopoietic, higher-brain, human-lifecycle, musculoskeletal, nervous KF/OSPE, medprof-2 …) · `preclinic/1` (genome, intromed, physics, neoplasia, microbe-parasite …) · รายชื่อไฟล์: `drive_walk_api.py --path preclinic/3 --depth 6`

## 0.1 บล็อก Immunity (IMM) — ครบทั้งบล็อกแล้ว, merge แล้ว (PR #78–#81, Drive `preclinic/2/immunity`)
- block id `IMM` · inventory `imm_<รุ่น>_<MCQ|KF|OSPE>` 25 ชุด · ชุดรวม (41-43, 40-43) ใช้ `medlib_cohort: 43`
- MCQ ✅ 41-43, 44–52 · MCQ 48 = AI ตอบเอง 112/123 ข้อ draft (ข้าม 14, 32, 37, 48, 65, 73, 80, 85, 86, 87, 115 ที่โจทย์/ภาพไม่ชัด; ข้อ 25/39/96 ไม่มั่นใจ) · ⛔ MCQ 40 ข้ามทั้งชุด (โน้ตจำ ไม่มีตัวเลือก)
- KF ✅ 9 ชุด (47 AI draft; 40-43, 48–49 บางข้อ draft) · OSPE ✅ 5 ชุด (40-43 และ 47 draft; 40-43 ไม่มีรูป)
- ข้อ MCQ ที่ต้นฉบับขัดกับ AI คงตามต้นฉบับ + ความเห็น AI ใน option_why (ค้น "AI เห็นว่า")

## 1. บล็อก Respiratory (RESP) — ครบทุกชุดแล้ว (Drive `preclinic/2/respiratory`)
- (merge แล้ว PR #80) block id `RESP` · inventory `resp_<รุ่น>_<MCQ|KF|OSPE>` · `data/blocks/RESP/`
- MCQ ✅ 11 ชุด (40 = AI เขียนจากโพย) · KF ✅ 11 ชุด · OSPE ✅ 10 ชุด (51 รวม 51-1/51-2 เป็น 17 สถานี · 40-43 ภาพบางสถานีตัดออก) · ข้อที่ไฟล์ไม่มีเฉลยหรือเฉลยลายมืออ่านไม่ออก AI เติมให้ ติดป้าย `draft` (KF 44–51, OSPE 40-43/44 ฯลฯ) ผู้ตรวจควรยืนยัน
- MCQ รุ่นเก่าเป็น "ข้อสอบจำ" ข้อที่ไม่มีช้อยส์/ซ้ำ ข้าม · เฉลยต้นฉบับใช้วงกลม/ขีดเฉียง/ไฮไลต์หลายแบบ (parse_key.py รองรับแล้ว ข้อที่อ่านไม่ได้ต้องดู `auditor/raw/<ชุด>/key_pNNN.png` เอง)

## 2. บล็อก KUB and Repro — merge แล้ว (PR #38)
- branch **`finn-urinary-block`** · PR #38 · รวม main แล้ว (v0.32.0) · block id `KUB` (inventory `kub_<รุ่น>_<MCQ|KF|OSPE>`, 27 ชุด) · `data/blocks/KUB/`
- สถานะ: MCQ ครบ 10 ชุดแบบปี 52 (42-43/45–48 AI ร่างเฉลย) · KF ครบ 10 ชุด · OSPE ครบ 7 ชุด 124 สถานี (42-43, 44, 46 ไม่มีเฉลย AI ร่าง) — ผู้ตรวจควรยืนยัน draft
- เมื่อครบบล็อก: version ใหม่ + PROGRESS.md (เพิ่มส่วน KUB) + อัปเดตไฟล์นี้
- ตัวช่วย: `auditor/tools/parse_key.py` อ่านไฮไลต์ ส้ม/ฟ้า ได้ · เฉลยขีด/วงกลมลายมือต้องอ่านด้วยตา · ข้อที่ต้นฉบับเลือก 2 ตัว → `auditor/data/decisions.json` ใส่ `also_accept`
- เขียนเฉลยแบบฟอร์มปี 52 (ดู CLAUDE.md "แบบฟอร์มเฉลย MCQ")
- ทุกชั่วโมงมีงานตั้งเวลาเช็ก GitHub issue ใหม่ (ฝั่ง Claude ของ Finn)

## 2. ผู้ใช้ (Finn) ต้องการ
- ตอบภาษาไทย สั้น ภาษาคน · ถ้าจะถาม ให้ถามเป็นช้อยส์ให้ติ๊ก
- "ทำไปเรื่อย ๆ ไม่ต้องถาม" · "ประหยัดโทเค็นที่สุด" = ประหยัดที่ **วิธีทำ** เท่านั้น **ผลลัพธ์ต้องคุณภาพเท่าบล็อก GI** (ผู้ใช้ย้ำ 2026-11-08): ห้ามข้ามข้อที่จำโจทย์มาไม่ครบ → AI เขียนโจทย์เต็ม (ai_generated) · ช้อยส์ไม่ครบ → เติมให้ครบ 5 (ai_choices) · ข้อมีรูป → ตัดรูปใส่ · explanation เต็ม (เหตุผล + Trap) · ข้ามได้เฉพาะข้อที่ต้นฉบับว่างเปล่าจริง (ขีด –)
- มี GitHub issue ใหม่ (เช่น "[เฉลย] END-47-MCQ-006 ควรเป็น E" จากปุ่มแจ้งเฉลยในเว็บ) → แก้เองได้เลย แล้วเปิด PR ใส่ `Closes #เลข`
- **ผู้ใช้สั่ง 2026-11-13: "ทำต่อเองเลย อย่าถามอีก รันยาว ๆ"** → ทำบล็อกถัดไปต่อเอง ไม่ต้องถามก่อนเริ่มบล็อกใหม่ (ลำดับ: preclinic/3 nervous → hematopoietic → higher-brain → human-lifecycle → musculoskeletal แล้ว preclinic/1)

## 3. สถานะข้อมูล
| บล็อก | MCQ | KF | OSPE |
|---|---|---|---|
| END (Endocrine) | 9 ชุด + lecture + แผนอ่าน | 9 ชุด | 9 ชุด 156 สถานี |
| GI | 10 ชุด 864 ข้อ (เฉลยแบบปี 52 ครบ) | 9 ชุด 196 ข้อ | 7 ชุด 193 สถานี |
| KUB | 10 ชุด 722 ข้อ (แบบปี 52 ทุกชุด) | 10 ชุด 129 ข้อ | 7 ชุด 124 สถานี |
| RESP | 11 ชุด (40 = จากโพย) | 11 ชุด | 10 ชุด |
| IMM | 11 ชุด (40 ข้าม · 48 draft) | 9 ชุด | 5 ชุด |
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
## 6. งานเหลือ (เรียงลำดับ — ไม่มี PR ค้าง)
1. **รอคนตรวจ draft** (AI เฉลยเองเพราะไม่มีไฟล์เฉลย): IMM MCQ 48 · KF 47 · OSPE 40-43/47 · RESP KF 44–51, OSPE 40-43/44 · KUB MCQ 45–48 + KF 42-43/45/47 + OSPE 42-43/44/46
2. issue **#76** (END-51-OSPE-007 ขอบบน capsule / B = glomerulosa?) เปิดอยู่ claude[bot] ตอบแล้ว → รอผู้แจ้ง/ผู้ตรวจตัดสิน
3. CVS: ai_answer ครบแล้ว (v0.41.1) · 49-019 ไม่มีตัวเลือกถูก คงตามต้นฉบับ · KF 51-1.4/6.4 + OSPE 51-11.2 เฉลยขัด มี source_answer/proposed แล้ว รอคนตัดสิน
4. บล็อกอื่นใน Drive `preclinic/2`: biomed, commed-1/2, community-dev, health-system, medprof-1 → **ทำเมื่อผู้ใช้สั่งเท่านั้น**
5. ค้างเทคนิค: ผู้ใช้ตั้ง Cloudflare Worker (`docs/worker-setup.md`) · รัน `node _test/qa.mjs` บนเครื่อง Windows ยืนยันที่แก้ใน v0.41.0 (ยังไม่เคยรัน) · (v0.41.0 แก้แล้ว: autoMatch คำปฏิเสธ, ลายน้ำ imm_47_MCQ)
6. ทุกชั่วโมงมีงานตั้งเวลาเช็ก GitHub issue ใหม่ (trigger ฝั่ง Claude ของ Finn)
## 7. อ่านเพิ่มเมื่อจำเป็นเท่านั้น
`auditor/PROGRESS.md` (รายชุด) · `NEXT_TASKS.md` · `docs/FORMAT.md` (รูปแบบข้อมูล) · `lib/validate.js` (กติกาข้อมูล) · `CLAUDE.md` (กติกาทีม)