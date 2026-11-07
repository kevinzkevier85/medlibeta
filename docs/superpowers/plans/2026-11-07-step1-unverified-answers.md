# ขั้น 1: ข้อที่เฉลยยังไม่ยืนยัน — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ข้อ `draft` / `disputed` มีป้ายเตือนบนหัวข้อ และไม่ถูกนับในคะแนน ความคืบหน้า และจุดอ่อน แต่ยังทำและดูเฉลยได้

**Architecture:** ตัดสินว่าข้อไหน "นับคะแนน" ที่ `lib/quizcore.js` ที่เดียว (`counts(q, keyOv)`) แล้วให้ `roundStats` และ `latestResults` ใช้มัน หน้าเว็บ (`quiz.js`, `app.js`) แค่แสดงป้ายและตัวเลขที่ได้

**Tech Stack:** JavaScript แบบไม่มี build step, Node สำหรับเทส (`_test/quizcore.test.cjs`), Playwright สำหรับลองในเบราว์เซอร์

**Spec:** `docs/superpowers/specs/2026-11-07-medlib-roadmap-design.md` § ขั้น 1

## Global Constraints
- สถานะเฉลยที่ **ไม่นับ**: `draft`, `disputed` · ที่นับ: `verified`, `corrected` และข้อที่ไม่มี `answer_status`
- ถ้าผู้ใช้ตั้งเฉลยของตัวเอง (`keyOverride`) ข้อนั้น **นับ** (ผู้ใช้ตัดสินแล้ว)
- ข้อมูลเก่า (rounds, id) ไม่เปลี่ยนรูปแบบ
- ข้อความบนเว็บเป็นภาษาไทย คำว่า "ชุด" ไม่ใช่ "รุ่น"
- ออกเวอร์ชัน 0.13.0 ตาม CLAUDE.md (version.json, CHANGELOG.md, `?v=` ใน index.html, `VERSION` ใน sw.js)

## Review Focus
1. รอบที่ทุกข้อไม่นับคะแนน → คะแนนต้องเป็น 0/0 และ 0% ไม่ใช่ NaN (เทสใน Task 1)
2. ข้อไม่นับที่ผู้ใช้ตั้งเฉลยเอง → ต้องกลับมานับ (เทสใน Task 1)
3. ข้อไม่นับยังต้องแสดงสีถูก/ผิดบนปุ่มเลขข้อ (`status()` ไม่เปลี่ยน) (เทสใน Task 1)
4. ปิด "แสดงข้อสอบที่เฉลยยังไม่ยืนยัน" ในตั้งค่า → หน้าเว็บไม่พัง ตัวเลขยังถูก (ลองใน Task 2)
5. การ์ดชุดที่ทำครบแต่มีข้อไม่นับ → แถบความคืบหน้าต้องเต็ม 100% (ลองใน Task 2)

---

### Task 1: กติกา "นับคะแนน" ใน quizcore

**Files:**
- Modify: `lib/quizcore.js` (เพิ่ม `counts`, แก้ `roundStats`, `latestResults`, export)
- Test: `_test/quizcore.test.cjs`

**Interfaces:**
- Produces: `counts(q, keyOv) -> boolean` · `roundStats(...)` คืนค่าเพิ่ม `uncounted: number` (ข้อที่ตรวจแล้วแต่ไม่นับ) · `latestResults(...)` ไม่ใส่ข้อที่ไม่นับ

- [ ] **Step 1: เขียนเทสที่ยังไม่ผ่าน** (ต่อท้ายไฟล์ก่อนบรรทัด `console.log`)

```js
const dr = { id: "X-1-MCQ-002", type: "MCQ", options: { A: "a", B: "b" }, answer: "A", answer_status: "draft" };
const dp = { ...dr, id: "X-1-MCQ-003", answer_status: "disputed" };
const qm2 = { [mcq.id]: mcq, [dr.id]: dr, [dp.id]: dp };
t("counts: draft/disputed no, verified/corrected/missing yes, own key yes", () => {
  assert.strictEqual(Q.counts(dr), false); assert.strictEqual(Q.counts(dp), false);
  assert.strictEqual(Q.counts(mcq), true); assert.strictEqual(Q.counts({ ...mcq, answer_status: "corrected" }), true);
  assert.strictEqual(Q.counts(dr, { [dr.id]: "B" }), true);
});
t("roundStats skips uncounted, still grades them", () => {
  const r = Q.newRound([mcq, dr, dp]);
  [mcq, dr, dp].forEach((q) => { r.ans[q.id] = "A"; r.chk[q.id] = true; });
  const s = Q.roundStats(r, qm2);
  assert.strictEqual(s.checked, 1); assert.strictEqual(s.wrong, 1); assert.strictEqual(s.uncounted, 2);
  assert.strictEqual(Q.status(dr, r), "ok");
});
t("roundStats: all uncounted gives 0%, not NaN", () => {
  const r = Q.newRound([dr]); r.ans[dr.id] = "A"; r.chk[dr.id] = true;
  const s = Q.roundStats(r, qm2); assert.strictEqual(s.pct, 0); assert.strictEqual(s.checked, 0);
});
t("latestResults leaves out uncounted unless own key", () => {
  const r = Q.newRound([mcq, dr]); r.ans[mcq.id] = "B"; r.ans[dr.id] = "A"; r.chk[mcq.id] = r.chk[dr.id] = true;
  assert.deepStrictEqual(Object.keys(Q.latestResults([r], qm2)), [mcq.id]);
  assert.ok(dr.id in Q.latestResults([r], qm2, { [dr.id]: "A" }));
});
```

- [ ] **Step 2: รันให้เห็นว่าไม่ผ่าน**
Run: `node _test/quizcore.test.cjs` · Expected: error `Q.counts is not a function`

- [ ] **Step 3: เขียนโค้ด**
`counts(q, keyOv)` คืน `true` ถ้ามี `keyOv[q.id]` หรือ `answer_status` ไม่ใช่ `"draft"`/`"disputed"` · ใน `roundStats` ข้อที่ `chk` แล้วแต่ `!counts` ให้ `uncounted++` และไม่บวกคะแนน · ใน `latestResults` ข้าม `!counts(q, keyOv)` · เพิ่ม `counts` ใน `api`

- [ ] **Step 4: รันให้ผ่าน**
Run: `node _test/quizcore.test.cjs` · Expected: `12 ผ่าน`

- [ ] **Step 5: Commit** — `git commit -m "quizcore: draft/disputed answers do not count toward scores"`

### Task 2: ป้ายเตือน + ตัวเลขบนหน้าเว็บ + ออกเวอร์ชัน

**Files:**
- Modify: `quiz.js` (ป้ายบนหัวข้อในหน้าทำข้อสอบและหน้าข้อเดี่ยว, `setProgress`, หน้าสรุปผล), `app.js` (`viewHome` ตัวเลขบนการ์ดบล็อก), `styles.css` (ถ้าต้องใช้), `version.json`, `CHANGELOG.md`, `index.html`, `sw.js`

**Interfaces:**
- Consumes: `C.counts(q, kov())`, `roundStats(...).uncounted`

- [ ] **Step 1: ป้ายบนหัวข้อ** — ใน `.qhead` ของหน้าทำข้อสอบและหน้าข้อเดี่ยว ถ้า `!C.counts(q, kov())` ใส่ `<span class="badge warn">เฉลยยังไม่ยืนยัน · ไม่นับคะแนน</span>` (`disputed` ใช้ `badge bad` ข้อความ "เฉลยต้นฉบับอาจคลาดเคลื่อน · ไม่นับคะแนน")

- [ ] **Step 2: ความคืบหน้า** — `setProgress(b, s)` นับ `total`/`done`/`ok` จากเฉพาะข้อที่ `counts` · `viewHome` ใช้ `allExams(b).filter((q) => QZ.counts(q))` เป็นตัวหาร (export `counts` ผ่าน `QZ` หรือเรียก `C.counts` ผ่าน `window.QuizCore` ตามที่ไฟล์ใช้อยู่)

- [ ] **Step 3: หน้าสรุปผล** — เปลี่ยนรายการ `unsure` เป็นข้อที่ `!counts` หัวข้อ `ข้อที่ไม่นับคะแนน (N)` คำอธิบาย "เฉลยยังไม่ยืนยัน ทำได้แต่ไม่รวมในคะแนน ถ้าคิดว่าเฉลยผิดกด 'แจ้งเฉลยน่าสงสัย'" · ในกล่องคะแนนถ้า `st.uncounted` > 0 ต่อท้าย `· ไม่นับ ${st.uncounted} ข้อ`

- [ ] **Step 4: ออกเวอร์ชัน 0.13.0** และรัน `node tools/validate.cjs` · Expected: `✓ ผ่าน`

- [ ] **Step 5: ลองในเบราว์เซอร์ (Playwright)**
  - `#/q/END-51-MCQ-002` (ข้อ draft ใดก็ได้) → มีป้าย `ไม่นับคะแนน` บนหัวข้อ
  - ทำชุดที่มีข้อ draft ตอบครบแล้วจบรอบ → กล่องคะแนนมี "ไม่นับ N ข้อ" และหัวข้อ "ข้อที่ไม่นับคะแนน"
  - ตั้งค่าซ่อนข้อเฉลยรอยืนยัน → หน้าบล็อกและหน้าแรกไม่ error
  - Expected: ไม่มี `pageerror`

- [ ] **Step 6: Commit + push + PR draft** — branch `finn-unverified-answers`
