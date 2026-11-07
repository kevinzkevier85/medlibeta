# ตอบผิดแล้วต้องอ่าน lecture ไหน — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** ข้อ END ทุกข้อชี้ lecture 1–2 บท · ตอบผิดเห็น "ควรอ่าน" · หน้าสรุปและหน้าสถิติบอก lecture ที่ควรอ่าน
**Spec:** `docs/superpowers/specs/2026-11-07-lecture-to-read-design.md`
**Global:** ข้อความไทย · CVS ไม่แตะข้อมูล · ออกเวอร์ชันถัดจาก main (0.20.0)

## Review Focus
1. ref lecture ไม่มีหน้า → กล่องเฉลยไม่ขึ้น "หน้า undefined" (Task 4)
2. รัน apply_topics ซ้ำ → ไม่มี ref ซ้ำ (Task 2)
3. ข้อที่ตอบถูก → ไม่ขึ้นแถบ "ควรอ่าน" (Task 4)
4. บล็อกที่ไม่มีข้อผิด → ไม่มีตาราง "Lecture ที่ผิดบ่อย" (Task 4)
5. ข้อเฉลยรอยืนยันที่ตอบผิด → ไม่นับในหน้าสถิติ (Task 4)

### Task 1: validate — ref lecture ไม่ต้องมี pages
- [ ] เทส (`_test/validate.test.cjs`): `{lecture:"L5"}` ผ่าน · `{paper:"MCQ52"}` ไม่ผ่าน · `{lecture:"L5", pages:[999]}` ไม่ผ่าน → RED → แก้ `lib/validate.js` → GREEN → commit

### Task 2: apply_topics เขียน ref lecture
- [ ] เทส (`_test/apply_topics.test.cjs`): `lectures: {qid:["L1"]}` → refs มี `{lecture:"L1"}` ต่อท้าย · รันซ้ำไม่ซ้ำ · ref เดิม (paper) อยู่ครบ · lecture id ที่ไม่มี → throw ไม่เขียน · ข้อที่เอาออกจาก map → ref lecture ที่ apply ใส่ไว้ (ไม่มี pages) ถูกเอาออก
- [ ] RED → เขียน → GREEN → commit

### Task 3: ผูก END 595 ข้อ
- [ ] เดาจากคำสำคัญ + หัวข้อ → Claude อ่านข้อที่ไม่ชัด → สุ่มตรวจ 45 → `node tools/apply_topics.cjs END` → validate ✓ → commit

### Task 4: หน้าเว็บ 3 ที่ + ออกเวอร์ชัน
- [ ] เทส `_test/lecread.mjs` (Playwright): ตอบผิดข้อ END → `.readfirst` มีชื่อ lecture · ตอบถูก → ไม่มี `.readfirst` · จบรอบ → หน้าสรุปมี "Lecture ที่ควรอ่านก่อน" · หน้าสถิติมี "Lecture ที่ผิดบ่อย" · ไม่มี pageerror
- [ ] RED → เขียน (`quiz.js` refs/summary/stats) → GREEN → เทสเดิมทั้งหมด → v0.20.0 → ผู้ตรวจคนใหม่ → push → PR
