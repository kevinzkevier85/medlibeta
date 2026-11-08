# ขั้น 3: แท็กหัวข้อ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ทุกข้อของ END และ CVS มีหัวข้อ (`topic`) จากรายชื่อที่ผู้ใช้อนุมัติ และหน้าบล็อกมีแท็บ "หัวข้อ" กดแล้วได้ชุดฝึกข้ามชุด

**Architecture:**
- **ที่เก็บแท็ก:** รายชื่อหัวข้อและการติดแท็กเก็บที่ `data/blocks/<B>/topics.json` ไฟล์เดียวต่อบล็อก
- **ใส่ลงไฟล์ข้อสอบ:** `tools/apply_topics.cjs` เขียน `topic` ลงไฟล์ข้อสอบ และเขียน `topics` ลง `block.json`
  - ไฟล์ข้อสอบมี `generated_by` ทั้งสองบล็อก จึงห้ามแก้มือ
  - ตัวสร้างทั้งสองเรียก apply_topics ตอนท้าย: `auditor/tools/build_outputs.py` (END) และ `tools/import_cvs.cjs` (CVS) สร้างใหม่เมื่อไรแท็กไม่หาย
- **กติกา:** อยู่ใน `lib/validate.js`
- **หน้าเว็บ:** ใช้ `makeMix` ที่มีอยู่แล้ว

**Tech Stack:** JS ไม่มี build step, Node (เทส), Python stdlib (auditor), Playwright

**Spec:** `docs/superpowers/specs/2026-11-07-medlib-roadmap-design.md` § ขั้น 3
(ต่างจาก spec: spec บอกว่าไฟล์ CVS "ไม่มี `generated_by`" แต่จริง ๆ มี และ spec ให้ใส่ END ผ่าน `repair.json › topic` → แผนนี้ใช้ `topics.json` ไฟล์เดียวต่อบล็อกแทนทั้งสองบล็อก)

## Global Constraints
- **END 7 หัวข้อ:**

  | id | name |
  |---|---|
  | `pituitary` | Hypothalamus & pituitary |
  | `thyroid` | Thyroid |
  | `calcium-bone` | Parathyroid, calcium & bone |
  | `adrenal` | Adrenal & steroids |
  | `diabetes` | Pancreas & diabetes |
  | `lipid` | Lipids & atherosclerosis |
  | `general` | General endocrine & obesity |

- **CVS 8 หัวข้อ:**

  | id | name |
  |---|---|
  | `anatomy` | Anatomy, histology & development |
  | `ecg` | Electrophysiology & ECG |
  | `physiology` | Cardiac cycle, hemodynamics & regulation |
  | `drugs` | CVS drugs |
  | `pathology` | Pathology & shock |
  | `congenital` | Congenital heart disease |
  | `cad-hf` | CAD & heart failure |
  | `vascular-lab` | Vascular disorders & lab tests |

- topic id ต้องตรง `/^[a-z0-9-]{2,30}$/`
- ข้อมูลส่วนตัวไม่เปลี่ยน (id ข้อเดิม)
- ข้อความบนเว็บเป็นภาษาไทย ("ชุด" ไม่ใช่ "รุ่น")
- ออกเวอร์ชันตาม CLAUDE.md:
  - เลขถัดจาก main ตอนส่ง (0.15.0 ถ้า main ยังเป็น 0.14.x)
  - ถ้า PR #14 merge ก่อน ให้ดึง main มารวม แล้วค่อยออกเลข

## Review Focus
1. บล็อกที่ไม่มี `topics` (DEMO, บล็อกใหม่) → ไม่มีแท็บ "หัวข้อ" หน้าเว็บไม่พัง (เทส Task 4)
2. หัวข้อที่ทุกข้อเฉลยยังไม่ยืนยัน → การ์ดขึ้น "เฉลยทั้งหัวข้อยังไม่ยืนยัน · ไม่นับคะแนน" ไม่ใช่ NaN% (เทส Task 4)
3. รัน `apply_topics` ซ้ำ หรือรัน build_outputs ใหม่ → `git diff` ว่าง (เทส Task 2)
4. mapping มี topic id ที่ไม่อยู่ในรายชื่อ หรือ qid ที่ไม่มีแล้ว → เครื่องมือหยุดและบอกชัด ไม่เขียนครึ่ง ๆ (เทส Task 2)
5. ข้อที่ผู้ใช้เพิ่มเองในเว็บ (ไม่มี topic) → ยังบันทึกได้ (เทส Task 1)

---

### Task 1: กติกา topic ใน validate.js

**Files:** Modify `lib/validate.js` (`validateBlock`, `validateQuestion`, `validateExamSet`), `docs/FORMAT.md` · Create `_test/validate.test.cjs`

**Interfaces:**
- Produces:
  - `block.topics?: {id, name}[]`
  - `question.topic?: string`
  - เพิ่มข้อความ error ภาษาไทยตามรายการด้านล่าง

- [ ] **Step 1: เทสที่ยังไม่ผ่าน** (`_test/validate.test.cjs` ใช้ helper `t()` แบบ `quizcore.test.cjs`)
  - `validateBlock`:
    - `topics` ไม่ใช่ array → error
    - id ซ้ำ → error
    - id `"Bad Id"` → error
    - ไม่มี `name` → error
    - ไม่มี `topics` เลย → ไม่มี error
  - `validateQuestion(q, {block})`:
    - `topic: "nope"` ในบล็อกที่มี topics → error มีคำว่า `topic`
    - `topic` ที่อยู่ในรายชื่อ → ไม่มี error
    - ไม่มี `topic` → ไม่มี error (ข้อที่ผู้ใช้เพิ่มเอง)
  - `validateExamSet(set, block)`: บล็อกมี topics แต่ข้อในชุดไม่มี `topic` → error `ยังไม่มีหัวข้อ (topic)`
- [ ] **Step 2:** `node _test/validate.test.cjs` · Expected: FAIL
- [ ] **Step 3:** เขียนกติกาใน `lib/validate.js` และเพิ่มหัวข้อ `topics` / `topic` ใน `docs/FORMAT.md`
- [ ] **Step 4:** ผ่านทั้งหมด และ `node tools/validate.cjs` ยัง ✓ (ยังไม่มีบล็อกไหนมี topics)
- [ ] **Step 5: Commit** — `validate: topic list per block, topic per question`

### Task 2: เครื่องมือ apply_topics + ต่อเข้าตัวสร้าง

**Files:**
- Create: `tools/apply_topics.cjs`, `_test/apply_topics.test.cjs`
- Modify: `tools/import_cvs.cjs` (เรียกตอนท้าย), `auditor/tools/build_outputs.py` (`main()` เรียกหลัง `build_medlib`, ก่อน validate)

**Interfaces:**
- Consumes: กติกา Task 1
- Produces:
  - ไฟล์ `data/blocks/<B>/topics.json` = `{"topics":[{"id","name"}], "questions":{"<qid>":"<topic id>"}}`
  - `applyTopics(blockDir) -> {tagged:number, untagged:string[]}` (export จาก `tools/apply_topics.cjs`)
  - CLI `node tools/apply_topics.cjs [BLOCK…]` (ไม่ใส่ = ทุกบล็อกที่มี topics.json)

- [ ] **Step 0:** รัน `python3 auditor/tools/build_outputs.py --block end` บน main ที่สะอาด → `git status` ต้องว่าง ถ้าไม่ว่าง หยุดและบอกผู้ใช้ ห้าม commit diff นั้น
- [ ] **Step 1: เทสที่ยังไม่ผ่าน** (สร้างบล็อกปลอมใน `fs.mkdtempSync`)
  - ใส่ topic ลงข้อที่มีใน mapping และเขียน `topics` ลง block.json
  - ข้อที่ไม่อยู่ใน mapping → อยู่ใน `untagged` และถ้าเคยมี `topic` ให้ลบออก
  - รันซ้ำ → ไฟล์ไม่เปลี่ยน (byte เท่าเดิม)
  - เว้นวรรค/ย่อหน้าของไฟล์เดิมคงเดิม (exam indent 1, block indent 2)
  - mapping ชี้ topic ที่ไม่มีในรายชื่อ หรือ qid ที่ไม่มีในไฟล์ข้อสอบ → throw ข้อความบอก id และไม่มีไฟล์ไหนถูกเขียน
- [ ] **Step 2:** `node _test/apply_topics.test.cjs` · Expected: FAIL (ไม่มีไฟล์)
- [ ] **Step 3:** เขียน `tools/apply_topics.cjs`
  - ตรวจทุกอย่างก่อน แล้วค่อยเขียนไฟล์
  - ใส่ `topic` ต่อจาก `type` ในลำดับ key
  - ต่อเข้าตัวสร้าง: `import_cvs.cjs` เรียก `applyTopics` · `build_outputs.py` ใช้ `subprocess.run(["node", "tools/apply_topics.cjs", B])`
- [ ] **Step 4:** เทสผ่าน · `node tools/validate.cjs` ✓
- [ ] **Step 5: Commit** — `tools: apply_topics writes topic tags from topics.json; builders call it`

### Task 3: ติดแท็กทุกข้อ (END 579, CVS 300)

**Files:** Create `data/blocks/END/topics.json`, `data/blocks/CVS/topics.json` · ไฟล์ข้อสอบและ block.json เปลี่ยนจาก `apply_topics` เท่านั้น

- [ ] **Step 1: CVS** — แปลง lecture ใน `refs` เป็นหัวข้อ:

  | หัวข้อ | lecture |
  |---|---|
  | `anatomy` | L01, L05, L06, L12, LAB1 |
  | `ecg` | L02, L03, CC2, LAB3, LAB3M |
  | `physiology` | L04, L07, L10, L15, L17 |
  | `drugs` | L08, L09, L13 |
  | `pathology` | L14, CC1, SDL1 |
  | `congenital` | L11, CCX |
  | `cad-hf` | CC3, CC4 |
  | `vascular-lab` | CC5, L16, LAB4 |

  - ข้อที่ refs ชี้หลายหัวข้อ หรือไม่มี lecture → Claude อ่านโจทย์แล้วเลือกเอง
- [ ] **Step 2: END** — ใช้คำสำคัญช่วยเดาก่อน (สคริปต์ใน scratchpad ไม่ commit) แล้ว Claude อ่านทุกข้อที่เดาไม่ได้หรือเดาได้หลายหัวข้อ
  - ตัวอย่างคำ: TSH/thyroid → `thyroid` · cortisol/aldosterone/ACTH → `adrenal` · insulin/glucose/HbA1c → `diabetes` · LDL/statin → `lipid` · PTH/calcium/vitamin D/bone → `calcium-bone` · GH/prolactin/ADH → `pituitary`
- [ ] **Step 3:** `node tools/apply_topics.cjs END CVS` → `untagged` ว่างทั้งสองบล็อก · `node tools/validate.cjs` ✓
- [ ] **Step 4:** ตรวจสุ่ม 15 ข้อต่อบล็อก (พิมพ์ id, หัวข้อ, โจทย์ 100 ตัวอักษร) แก้ที่ผิด · รายงานจำนวนข้อต่อหัวข้อ
- [ ] **Step 5: Commit** — `Tag every END and CVS question with a topic`

### Task 4: แท็บ "หัวข้อ" ในหน้าบล็อก + ออกเวอร์ชัน

**Files:**
- Modify: `quiz.js` (`examTabHTML`, `tabOf`, handler `mixtopic`)
- Modify: `styles.css` (ถ้าต้องใช้), version files
- Create: `_test/topics.mjs` (Playwright แบบ `_test/sync.mjs`)

**Interfaces:**
- Consumes: `b.topics`, `q.topic`
- Consumes: `makeMix(b, title, qids)`, `C.counts`, `blockResults(b)`

- [ ] **Step 1: เทสที่ยังไม่ผ่าน** (`_test/topics.mjs`)
  - `#/b/END` → มีแท็บ `หัวข้อ` · กดแล้วมีการ์ด 7 ใบ ตามลำดับใน `topics` · ผลรวมจำนวนข้อบนการ์ด = จำนวนข้อ END
  - กดการ์ด Thyroid → ไปหน้าชุดฝึก (`/@`) ชื่อ `Thyroid · ทุกชุด` จำนวนข้อเท่าบนการ์ด
  - เปิด DEMO (ตั้งค่าแสดงบล็อกตัวอย่าง) → ไม่มีแท็บ `หัวข้อ`
  - หัวข้อที่ทุกข้อไม่นับคะแนน (ปลอมด้วย `page.route` แก้ answer_status ของ exam file) → ข้อความ `เฉลยทั้งหัวข้อยังไม่ยืนยัน · ไม่นับคะแนน`
  - ไม่มี `pageerror`
- [ ] **Step 2:** รัน · Expected: FAIL
- [ ] **Step 3:** เขียนแท็บ `topic` ต่อจาก Lecture (แสดงเมื่อ `b.topics` มีและมีอย่างน้อย 1 ข้อที่มี topic)
  - การ์ดใช้ `card()` และวิธีนับแบบเดียวกับแท็บ Lecture: นับเฉพาะข้อที่ `C.counts`
  - ซ่อนหัวข้อที่มี 0 ข้อ
  - ปุ่มสุ่มของแท็บนี้ = ทั้งบล็อก (เหมือน Lecture)
  - handler `mixtopic` → `makeMix(b, \`${name} · ทุกชุด\`, qids)`
- [ ] **Step 4:** เทสผ่าน · รัน `quizcore`, `worker`, `sync`, `validate` ซ้ำ
- [ ] **Step 5:** ออกเวอร์ชัน (ดู Global Constraints) · ภาพหน้าจอมือถือของแท็บหัวข้อ
- [ ] **Step 6: Commit + push + PR draft** — branch `finn-topic-tags`
