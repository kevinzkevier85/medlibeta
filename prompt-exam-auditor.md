# CLAUDE.md — PSU Exam Auditor (ตรวจ + ซ่อมคลังข้อสอบทุก block)

ไฟล์นี้คือ**แผนงานฉบับเดียวที่ใช้อ้างอิง**ของโปรเจกต์ อ่านให้ครบก่อนเริ่มงานทุก session

ตัวย่อ: MCQ (Multiple Choice Question – ข้อสอบปรนัย), KF (Key Feature – ข้อสอบสถานการณ์), OSPE (Objective Structured Practical Examination – ข้อสอบสถานี), OCR (Optical Character Recognition – แปลงภาพเป็นข้อความ), ToS (Table of Specifications – ตารางกำหนดเนื้อหาข้อสอบ)

---

## 0. บริบทและวิธีเริ่ม session

### ผู้ใช้และงาน
- ผู้ใช้เป็นนักศึกษาแพทย์ PSU ได้รวบรวมข้อสอบเก่าที่รุ่นพี่จำมา (recall) **ครบทุก block ทุกรุ่น** ไว้เป็น PDF ใน Google Drive
- เป้าหมายคือทำให้คลังข้อสอบนี้**ถูกต้องและสมบูรณ์** เพื่อนำเข้าแอป quiz (`psu-quiz`) ได้ทันที
  1. ดึงโจทย์ ช้อยส์ และเฉลยเดิมออกมาให้ครบ
  2. **แก้โจทย์เองโดยไม่ดูเฉลย** แล้วเทียบกับเฉลยเดิม
  3. หาข้อที่โจทย์ไม่ครบ ไม่ดี หรือมีปัญหา แล้ว**ซ่อม** (เติมช้อยส์ เขียนข้อให้เต็ม ทำเฉลยให้ข้อที่ไม่มี)
  4. **รายงาน**ทุกอย่างที่เจอและทุกอย่างที่แก้

### ทุกครั้งที่เริ่ม session
1. อ่าน `PROGRESS.md` (ถ้ายังไม่มี ให้สร้างตามข้อ 8) เพื่อดูว่างานค้างอยู่ที่ Phase/ชุดไหน
2. อ่าน `REVIEW.md` และ `data/decisions.json` ถ้าผู้ใช้ตัดสินรายการไหนแล้ว ให้แก้ข้อมูลตามนั้นก่อน
3. ทำงานต่อจากจุดที่ค้าง
4. อัปเดต `PROGRESS.md` ทุกครั้งที่จบชุดหรือจบขั้นย่อย

### สไตล์การสื่อสาร
- ตอบเป็น**ภาษาไทย** ศัพท์การแพทย์และเทคนิคใช้อังกฤษ ตัวย่อครั้งแรกให้ใส่คำเต็มกำกับ
- สรุปเป็นตาราง กระชับ **ไม่ถามยืนยันระหว่างทาง** ยกเว้นที่ checkpoint ☑ หรือเมื่อทำต่อไม่ได้จริงๆ
- เรื่องที่ไม่แน่ใจ ให้ตัดสินใจอย่างสมเหตุสมผลแล้วจดลง `REVIEW.md`

---

## 1. เป้าหมาย (Deliverables)

| # | สิ่งที่ส่ง | ไฟล์ |
|---|---|---|
| 1 | JSON ที่ import เข้าแอป psu-quiz ได้ ต่อ block | `output/json/<block>.json` (+ `all.json`) |
| 2 | รายงานปัญหาและการแก้ ต่อชุด + สรุปรวม | `output/reports/<block>/<set_id>.md`, `output/reports/summary.md` |
| 3 | PDF ใหม่ที่สะอาด (โจทย์ + รูป + เฉลย + คำอธิบาย) | `output/pdf/<set_id>.pdf` |
| 4 | รายการรอผู้ใช้ตัดสิน | `REVIEW.md` |

ผลลัพธ์ทั้งหมด commit ลง GitHub repo นี้ แล้ว**เปิด PR ให้ผู้ใช้ตรวจ** ห้าม push เข้า main ตรงๆ

## 2. แหล่งข้อมูลและโครงสร้าง repo

- **PDF ต้นฉบับ:** อยู่ในโฟลเดอร์ Google Drive ของผู้ใช้ อ่านอย่างเดียว ห้ามแก้ ย้าย หรือลบไฟล์ใน Drive
  - อ่านผ่าน Google Drive connector ถ้ามี ถ้าไม่มีให้ขอให้ผู้ใช้ดาวน์โหลดมาไว้ใน `source/`
- **ห้าม commit PDF ต้นฉบับหรือรูปที่ render ทั้งหน้า** ลง repo (ไฟล์ใหญ่ และเป็นเอกสารของรุ่น) ให้เพิ่ม `source/` และ `raw/` ลงใน `.gitignore`

```
repo/
├─ CLAUDE.md            ← ไฟล์นี้
├─ PROGRESS.md          ← สถานะงาน
├─ REVIEW.md            ← รายการรอผู้ใช้ตัดสิน (สร้างด้วย tools/make_review.py)
├─ tools/               ← สคริปต์ extract / parse / crop / audit / build / validate
├─ source/              ← (gitignore) PDF ที่ดาวน์โหลดจาก Drive
├─ raw/<set_id>/        ← (gitignore) ข้อความต่อหน้า p###.txt + png ต่อหน้า (cache กันอ่านซ้ำ)
├─ data/
│  ├─ inventory.json
│  ├─ work/<set_id>.json   ← ผลต่อชุด (หน่วยที่ใช้สั่งทำซ้ำ)
│  └─ decisions.json       ← คำตัดสินของผู้ใช้ (ห้ามทับ)
└─ output/ json/ reports/ pdf/
```

## 3. กติกาการทำงาน (ผู้ใช้กำหนด ห้ามเปลี่ยน)

1. **ไม่แก้ต้นฉบับ** ทุกอย่างเขียนลง repo เท่านั้น
2. **เฉลยไม่ตรงกัน:** คงเฉลยต้นฉบับไว้เสมอ แล้วตั้ง `source_disagree` เขียนเหตุผลลงใน `audit_note` และลง `REVIEW.md` **ห้าม override เอง** แก้ได้เฉพาะเมื่อผู้ใช้ตัดสินแล้ว (กลายเป็น `corrected`)
3. **ข้อที่เป็นแค่โน้ตความจำ ไม่มีช้อยส์ หรือมีช้อยส์น้อยกว่า 2 ตัว:** ให้เขียนเป็นข้อ MCQ เต็ม (stem + 5 ช้อยส์ A–E + เฉลย) **และติดป้าย `ai_generated` เสมอ** เก็บข้อความเดิมไว้ใน `original_text`
   - ⚠️ ข้อนี้**ต่างจาก** project CVS เดิม (ที่ให้เก็บไว้แค่เป็น recall_topics) ผู้ใช้เปลี่ยนเป็นให้เขียนข้อให้เต็ม
   - ถ้าข้อเดียวกันในรุ่นอื่นมีช้อยส์จริงครบ ให้**ใช้ของจริงก่อน** (ติด `filled_from: "<id>"`) ค่อยแต่งเองเมื่อหาไม่ได้
4. **ช้อยส์ไม่ครบ (2–4 ตัว):** เติมให้ครบ 5 ตัว แล้วระบุใน `ai_choices` ว่าตัวไหนเป็นของ AI
5. **ไม่มีเฉลย:** AI ทำเฉลยให้ ตั้ง `drafted`
6. **ข้อซ้ำข้ามรุ่น:** เก็บทุกข้อ ห้ามลบ แต่โยงกันด้วย `duplicate_group` แล้วใช้เทียบเฉลย (ถ้าข้อซ้ำเฉลยต่างกันให้ลง REVIEW)
7. **ข้อที่มีรูป** (CXR, ECG, histo, gross, CT, กราฟ): crop เฉพาะรูปที่เกี่ยวข้อง ย่อกว้าง ≤ 1200 px บีบอัดเป็น JPEG แล้วฝังเป็น data URI จากนั้น**ดูรูปจริงก่อนตอบ** ถ้าไม่มั่นใจให้ติด `needs_review`
8. **คำอธิบาย** (ดูข้อ 5.1): สั้น ไทยปนอังกฤษ
9. **Resume ได้เสมอ:** ทำทีละชุด บันทึก `data/work/<set_id>.json` ทันทีที่จบแต่ละชุด
10. ทุกไฟล์เป็น UTF-8

---

## 4. ลักษณะข้อสอบและจุดที่ต้องระวัง (จากประสบการณ์ project CVS + psu-quiz)

### 4.1 ระดับความยาก
- MCQ 5 ช้อยส์ สไตล์ USMLE Step 1 / clinical vignette ระดับ preclinical ~35% เป็น physiology แบบ apply (ไม่ใช่ท่องจำ)
- จุดที่ AI ตอบผิดบ่อย:
  - **Anatomy/embryo ที่ถามรายละเอียดมาก:** ระดับกระดูกสันหลัง, dermatome, relation ใน mediastinum, nerve, sinus, arch derivative
  - **ข้อคำนวณ:** SVR, MAP, EF, Fick, Poiseuille, dead space, A-a gradient, acid–base ต้องคำนวณทีละขั้นให้เห็น ห้ามเดา
  - **Histology:** แยก muscular artery / large vein / elastic artery จากคำบรรยาย
  - **Pharmaco:** ยาที่กลไกใกล้กัน, compelling indication ของยาลดความดัน, ADR/contraindication
  - **CXR/ECG:** situs, chamber enlargement, axis
- ข้อสอบ**วนหัวข้อเดิมสูงมาก** บางข้อเหมือนกันแทบคำต่อคำข้ามรุ่น จึงใช้ข้อซ้ำช่วยตรวจเฉลยได้ดี
- ลำดับข้อในแต่ละชุดมักเรียงเป็นกลุ่ม: anatomy → histo/embryo → physiology → pharm → imaging → path → clinical correlation ใช้ช่วยระบุข้อที่หลงมาจาก block อื่นได้

### 4.2 ปัญหาของ PDF
| ปัญหา | วิธีรับมือ |
|---|---|
| **เฉลยไม่ใช่ข้อความ:** ไฮไลต์สีเขียว, วงกลมหรือกากบาทด้วยลายมือ, โน้ตสีน้ำเงิน | render หน้าเป็นภาพแล้ว**อ่านด้วย vision** อย่าเชื่อ text layer อย่างเดียว ติด tag `[ANS]` (ไฮไลต์) และ `[NOTE]` (โน้ต) ใน raw |
| **text layer เพี้ยน** ทั้งหน้า | ใช้ Tesseract (tha+eng) หรืออ่านจากภาพ |
| **หน้าเฉลยหาย/ว่าง** บางช่วงข้อ | ข้อเหล่านั้นตั้ง `drafted` และจดช่วงหน้าที่หายลง REVIEW |
| **เฉลยหลายไฟล์/หลายคนเฉลย** (เช่น "โดยรุ่น 46", "โดยพี่ X") | เลือกฉบับหลัก 1 ฉบับ แล้วเทียบกับอีกฉบับ ถ้าไม่ตรงกันให้ลง REVIEW |
| **ผู้เฉลยเขียนว่า "ไม่แน่ใจ"** หรือวงไว้หลายตัว | ถือว่าเป็นเฉลยต้นฉบับที่ความมั่นใจต่ำ ถ้า AI ไม่เห็นด้วยให้ตั้ง `source_disagree` |
| **วงผิดตำแหน่ง** (สไลด์ที่แปะในเฉลยขัดกับตัวที่วง) | ลง REVIEW พร้อมหลักฐาน |
| **โจทย์ไม่ครบ** ~40–60% ในบางรุ่น ("-", ว่าง, "จำไม่ได้") | แยกให้ออก: มีหัวข้อพอจะเขียนข้อได้ → ทำตามกติกาข้อ 3.3 / ไม่มีข้อมูลเลย → `skipped` |
| **ผู้จำแต่งช้อยส์เอง** หรือไม่แน่ใจว่าโจทย์ถามอะไร | ตั้ง `source_unverified` |
| **มีหลายคำตอบที่ถูก / ไม่มีคำตอบที่ถูก** | ลง REVIEW พร้อมตัวเลือกที่เป็นไปได้ |
| **ข้อหลงมาจาก block อื่น** (เช่น ข้อ KUB ในชุด CVS) | ติด `off_block` ไม่ลบ |
| **เลขข้อซ้ำ / เลขช่วง** (`51-53.`), "ข้อสอบเพิ่มเติม" ที่ไม่มีเลขข้อ | **ห้ามจับคู่เฉลยด้วยเลขข้ออย่างเดียว** ให้ดูลำดับ บริบท และเนื้อหาด้วย ข้อที่ไม่มีเลขข้อให้ใส่ `sourceNumber: "extra-N"` |
| **คำผิดจากต้นฉบับ** (`Phenylalanine` แทน phenylephrine, `Q-wave infection` แทน infarction) | แก้ให้อ่านรู้เรื่อง แล้วบันทึกลงใน `edits[]` (เดิม → ใหม่) |
| **OCR:** ตัวห้อย/ตัวยก (PCO₂, K⁺, HCO₃⁻), ↑↓, สระไทยลอย, ช่องว่างเกิน | normalize อย่างเดียว ห้ามเปลี่ยนความหมาย |
| **ไฟล์รวมหลายรุ่น** (เช่น 41–43) หรือ**ไฟล์รวมหลาย block** (เช่น OSPE Resp+CVS) | แยกตามรุ่น/block ถ้าแยกไม่ได้ให้ใช้กลุ่มของมันเอง (`41-43`) |
| **รูปเดียวใช้หลายข้อ / ใช้ซ้ำข้ามรุ่น / อยู่คนละหน้ากับโจทย์** | crop แยกต่อข้อ ทำ hash เพื่อหารูปซ้ำ |
| **ชื่อชุดไม่สม่ำเสมอ** (`MCQ_Respi [Med PSU 52]`, `45`, `drug`, `psvt`) | normalize เป็น `set_id = <block>_<รุ่น>_<type>` และเก็บชื่อเดิมไว้ด้วย |

---

## 5. Phases

### Phase 0 — Inventory
- ทำรายการทุกไฟล์ใน Drive: path, block, รุ่น, ประเภท (MCQ / KF / OSPE / เฉลย / ToS / อื่นๆ), จำนวนหน้า, เป็นข้อความหรือภาพสแกน, เฉลยอยู่ในไฟล์เดียวกันหรือแยก และรูปแบบเฉลย (ไฮไลต์ / ลายมือ / ตาราง / ไม่มี)
- ตั้ง `set_id` ต่อชุด เช่น `cvs_52_MCQ`, `respi_48_MCQ`
- Output: `data/inventory.json` + ตารางใน `PROGRESS.md`
- ☑ **Checkpoint:** แสดง inventory (ตาราง block × รุ่น) แล้วถามผู้ใช้ครั้งเดียว: ชื่อชุดถูกไหม ไฟล์ไหนไม่ใช้ **ทำ KF/OSPE ด้วยไหม** (ค่าเริ่มต้นคือทำ MCQ ก่อน) และเริ่มจาก block ไหน

### Phase 1 — Extract (ทีละชุด จากรุ่นใหม่ไปเก่า)
- `tools/extract.py --set <set_id>` → `raw/<set_id>/p###.txt` + png
- `tools/parse_mcq.py --set <set_id>` → stem, choices, เฉลยต้นฉบับ, หน้า
- `tools/crop_images.py --set <set_id>` → รูปต่อข้อ
- Validate: จำนวนข้อตรงกับต้นฉบับ, เลขข้อต่อเนื่อง, จับคู่เฉลยถูกข้อ, ช้อยส์ครบไหม

### Phase 2 — Answer audit (ทำทุกข้อ ไม่สุ่ม)
1. **แก้โจทย์เองโดยไม่ดูเฉลยต้นฉบับ** บันทึก `ai_answer`, `ai_confidence` (high / medium / low) และเหตุผล
2. เทียบกับเฉลยต้นฉบับ แล้วตั้ง `answer_status`:
   | status | ความหมาย |
   |---|---|
   | `source_agree` | ตรงกัน → `answer_verified: true` |
   | `source_disagree` | ไม่ตรงกัน → คงเฉลยต้นฉบับ + `audit_note` + REVIEW |
   | `corrected` | ผู้ใช้ตัดสินให้แก้แล้ว (เก็บเฉลยเดิมไว้ใน `source_answer`) |
   | `drafted` | ไม่มีเฉลยต้นฉบับ → ใช้ของ AI |
   | `source_unverified` | โจทย์ไม่ครบหรือกำกวมจนตรวจไม่ได้ |
   | `ai_generated` | ข้อที่ AI เขียนขึ้นใหม่ทั้งข้อ |
3. ถ้าไม่ตรงกัน ให้คิดซ้ำอีกรอบก่อน (อ่านโจทย์ใหม่ ดูรูปใหม่ เทียบกับข้อซ้ำในรุ่นอื่น)
4. สรุปจำนวนแต่ละ status ลงใน `PROGRESS.md`

### Phase 3 — Repair
- ซ่อมตามกติกาข้อ 3 (เติมช้อยส์ เขียนข้อให้เต็ม ทำเฉลย แก้คำผิด) และเขียนคำอธิบายตามข้อ 5.1
- ข้อที่ AI เขียนขึ้นใหม่: ต้องเป็นแนวเดียวกับข้อสอบจริง (vignette, distractor ที่สมเหตุสมผล, คำตอบถูกเพียงข้อเดียว)

### Phase 4 — Cross-year (ต่อ block)
- หาข้อซ้ำหรือคล้ายข้ามรุ่น (เนื้อหาคล้ายกันเกิน ~80%) แล้วตั้ง `duplicate_group`
- ข้อซ้ำที่เฉลยไม่ตรงกัน → REVIEW
- ใช้ข้อซ้ำเติมช้อยส์ที่ขาด (กติกาข้อ 3.3)

### Phase 5 — Build outputs
- `tools/build_json.py --block <b>` → `output/json/<b>.json` (schema ข้อ 6.1) + validate
- `tools/build_report.py --block <b>`
- `tools/build_pdf.py --set <set_id>` (ฟอนต์ไทย Sarabun / Noto Sans Thai; 🤖 = AI เขียน/เติม, ⚠️ = เฉลยขัดกัน)
- `tools/make_review.py` → `REVIEW.md`
- ☑ **Checkpoint (หลังจบแต่ละ block):** ส่งตารางรายการ `source_disagree` + `drafted` + `ai_generated` ให้ผู้ใช้ (ข้อ, เฉลยต้นฉบับ, เสนอ, เหตุผล, ความมั่นใจ) แล้ว commit + เปิด/อัปเดต PR จากนั้นทำ block ถัดไปทันที ไม่ต้องรอคำตัดสิน

### Phase 6 — QA
- JSON ผ่าน schema, import เข้า psu-quiz ได้ (ทดสอบด้วย headless browser ถ้าทำได้), จำนวนข้อตรง, รูป decode ได้, ทุก MCQ มีช้อยส์ A–E ครบและมี `correct`
- สุ่มตรวจ 10% ของข้อ `source_agree` ซ้ำอีกรอบ (กันกรณีที่ AI กับต้นฉบับผิดเหมือนกัน)

### 5.1 มาตรฐานคำอธิบาย
- `explanation` (บังคับทุกข้อ): 1–3 บรรทัด ไทยปนอังกฤษ รูปแบบเดียวกับแอปเดิม `(คำตอบที่ถูก)** — เหตุผลหลัก`
- ข้อ physiology/กลไก: เขียนเป็นลำดับลูกศรสั้นๆ ในบรรทัดเดียว เช่น `Venous return ↑ → preload ↑ → SV ↑ → CO ↑`
- เพิ่มบรรทัด `Trap: ...` ถ้ามีจุดที่มักสับสน
- `why` ต่อช้อยส์ (1 บรรทัด) **บังคับเฉพาะ**ข้อ `source_disagree`, `drafted`, `ai_generated` เพื่อให้ผู้ใช้ตัดสินได้เร็ว

---

## 6. Data schemas

### 6.1 JSON สำหรับ psu-quiz (output)
ต้องเหมือนรูปแบบ `data.json` ของแอปเดิม field ที่แอปใช้ (ห้ามเปลี่ยนชื่อ): `id, name, exams[].id, name, history, notes, questions[].id, number, sourceNumber, stem, choices{A..E}, correct, explanation, image, issues[], answerKeyIssue?` ส่วนข้อมูลการตรวจให้ใส่ไว้ใน `audit` (แอปจะไม่สนใจ field ที่ไม่รู้จัก)

```json
[{"id":"cvs","name":"cvs","exams":[{
  "id":"cvs_52_MCQ","name":"MCQ_CVS [Med PSU 52]","history":{"exam":[],"practice":[]},"notes":"",
  "questions":[{
    "id":"cvs_52_MCQ_017","number":"17","sourceNumber":"17",
    "stem":"...","choices":{"A":"...","B":"...","C":"...","D":"...","E":"..."},
    "correct":"B","explanation":"(Venous compliance)** — BP ↓ → baroreflex → sympathetic ↑ → venoconstriction\nTrap: CO ไม่ใช่ตัวที่ลด",
    "image":null,"issues":[],
    "audit":{
      "source_file":"CVS_52_MCQ_key.pdf","page":6,
      "answer_status":"source_disagree","answer_verified":false,
      "source_answer":"D","source_answer_note":"ผู้เฉลยเขียน 'ไม่แน่ใจ'",
      "ai_answer":"A","ai_confidence":"medium","audit_note":"...",
      "why":{"A":"...","B":"..."},
      "ai_generated":false,"ai_choices":[],"original_text":null,"filled_from":null,
      "edits":[],"duplicate_group":"cvs-baroreflex-03","off_block":false,"needs_review":true,
      "locked":false
    }}]}]}]
```
กฎ:
- `choices` ต้องมี key `A`–`E` ครบเสมอ (ค่าว่างได้)
- `correct` = ตัวอักษรเดียว หรือ `"__ALL__"` เฉพาะข้อที่ต้นฉบับให้คะแนนฟรีจริง
- `issues[]` ใส่ข้อความไทยสั้นๆ ให้แอปแสดง "⚠️ ต้องตรวจ" (เช่น `"เฉลยขัดกับ AI"`, `"AI เขียนข้อนี้ขึ้นใหม่"`)
- `id` ต้องคงที่ (`<set_id>_<NNN>`) รันซ้ำแล้วต้องได้ id เดิม
- `locked: true` = ผู้ใช้แก้มือแล้ว **ห้ามรันซ้ำทับ**

### 6.2 KF/OSPE (ถ้าผู้ใช้ให้ทำที่ checkpoint Phase 0)
แอป psu-quiz รับเฉพาะ MCQ ให้เก็บ KF/OSPE ไว้ที่ `output/json/<block>_kf_ospe.json` แยกต่างหาก (case/station + items + accepted/answer) และทำ PDF กับรายงานให้ด้วย

---

## 7. คำสั่ง (ต้องสั่งทำซ้ำรายชุดได้)

```bash
python tools/run.py --block cvs                        # ทั้ง block ทุกรุ่น
python tools/run.py --set cvs_48_MCQ                   # ทำซ้ำเฉพาะชุดเดียว
python tools/run.py --set cvs_48_MCQ --only flagged    # ทำซ้ำเฉพาะข้อที่ติดธง / อยู่ใน REVIEW
python tools/run.py --set cvs_48_MCQ --q 17,23         # ทำซ้ำเฉพาะบางข้อ
python tools/run.py --set cvs_48_MCQ --from audit      # เริ่มจาก Phase ที่กำหนด (extract|audit|repair|build)
python tools/run.py --block cvs --build-only           # สร้าง output ใหม่จาก data/work อย่างเดียว
```
- ถ้าชุดไหนทำเสร็จแล้วให้ข้าม เว้นแต่จะสั่ง `--force` / ข้อ `locked` จะไม่โดนทับ / คำตัดสินใน `decisions.json` จะถูกใช้ทุกครั้งที่ build
- **รอบตรวจจากผู้ใช้:** ถ้าผู้ใช้วางรายการข้อ (เช่น `cvs_52_MCQ_017: A`, `...: คงเดิม`, `...: ตรวจใหม่`) ให้บันทึกลง `decisions.json` → ตรวจใหม่ตาม Phase 2 → build ใหม่ → ตอบเป็นตาราง

## 8. PROGRESS.md (รูปแบบ)
```
## Phase status
- [x] 0 Inventory
- [ ] 1–5 ต่อ block (ดูตาราง)
- [ ] 6 QA
## Sets
| set_id | extract | audit (agree/disagree/drafted/unverified/ai_gen) | repair | build | PR |
|---|---|---|---|---|---|
| cvs_52_MCQ | ✓ 94/100 | 90/4/0/0/6 | ✓ | ✓ | #3 |
## Waiting for user
- REVIEW.md: N รายการ
## Last session
YYYY-MM-DD: ...
```

## 9. ข้อห้าม
- ห้ามแก้ ลบ หรือย้ายไฟล์ใน Google Drive / ห้าม commit PDF ต้นฉบับ
- ห้ามแตะ repo `psu-quiz` ให้ทำแค่ไฟล์ JSON ที่ import เข้าไปได้
- ห้ามเปลี่ยนเฉลยต้นฉบับเองโดยไม่ได้รับคำตัดสินจากผู้ใช้
- ห้ามแต่งข้อ ช้อยส์ หรือเฉลยโดยไม่ติดป้าย
- ห้ามลบข้อซ้ำ / ข้อ off-block / ข้อที่ skip (ให้เก็บไว้พร้อมสถานะ)
- ห้ามเดาเมื่อรูปหรือโจทย์อ่านไม่ออก ให้ติดธงแทน

## 10. Definition of done
ทุกชุดใน inventory มี `data/work/<set_id>.json` ผ่าน audit ครบทุกข้อ / ทุก block มี JSON + รายงาน + PDF / QA ผ่าน / PR เปิดไว้ครบ / `REVIEW.md` เหลือเฉพาะรายการที่รอผู้ใช้ตัดสิน

## 11. เริ่มงาน
1. ขอ link โฟลเดอร์ Drive จากผู้ใช้ (ถ้ายังไม่มี) → Phase 0 → ☑ checkpoint
2. ทำ block แรกเป็น pilot (แนะนำ block ที่มีเฉลยต้นฉบับครบที่สุด) → ส่งรายงานให้ผู้ใช้ดู → ปรับตาม feedback → ทำ block ที่เหลือต่อเนื่อง
