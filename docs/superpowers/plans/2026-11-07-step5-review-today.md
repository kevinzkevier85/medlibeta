# ขั้น 5: ทบทวนวันนี้ — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ข้อที่ตอบผิดหรือปักธงเข้าคิว กลับมาให้ทบทวนใน 1 → 3 → 7 วัน หน้าแรกมีกล่อง "ทบทวนวันนี้" แยกทีละบล็อก

**Architecture:**
- คิดตารางในฟังก์ชันล้วนของ `lib/quizcore.js`
- เก็บใน `PROG.review` จึงซิงก์ไปด้วย
- `quiz.js` เรียกตอนตรวจคำตอบและตอนปักธง
- หน้าแรกใน `app.js` แสดงกล่อง กดแล้วใช้ `makeMix` เดิม

**Tech Stack:** JS ไม่มี build step, Node, Playwright · **Spec:** `docs/superpowers/specs/2026-11-07-medlib-roadmap-design.md` § ขั้น 5

## Global Constraints
- ผู้ใช้เลือก: แยกทีละบล็อก · เข้าคิวเมื่อตอบผิด (คะแนน < 0.999) หรือปักธง
- `review[qid] = {step, due, t}`
  - เข้าคิว: step 0, ครบกำหนด = ต้นวันพรุ่งนี้ (เวลาเครื่อง)
  - ตอบถูกตอนครบกำหนด: step+1 แล้วครบกำหนดอีก 3 วัน และ 7 วันตามลำดับ
  - ถูกครั้งที่ 3: ออกจากคิว
  - ตอบผิดเมื่อไร: เริ่ม step 0 ใหม่
  - ตอบถูกก่อนครบกำหนด: ไม่นับ
- ข้อที่ไม่นับคะแนน (`counts` = false) ไม่เข้าคิว
- รวมข้อมูลระหว่างเครื่อง: ใช้ `ts` แบบเดียวกับธง (`touch(p, "review", qid)`) ถ้าเสมอกันเลือก due ที่ใกล้กว่า
- ข้อความไทย · ออกเวอร์ชัน 0.18.0

## Review Focus
1. ตอบถูกก่อนครบกำหนด → step ไม่ขยับ (เทส Task 1)
2. ข้อ draft → ไม่เข้าคิว (เทส Task 1)
3. คิวว่าง → หน้าแรกไม่มีกล่อง · มีคิวแต่ยังไม่ครบกำหนด → "ยังไม่มีข้อครบกำหนดวันนี้ · ในคิว N ข้อ" (เทส Task 2)
4. ซิงก์สองเครื่อง: เครื่องหนึ่งออกจากคิว อีกเครื่องยังค้าง → ที่ใหม่กว่าชนะ (เทส Task 1)
5. ข้อที่ถูกลบจากชุดแล้วแต่ค้างในคิว → ไม่นับ ไม่พัง (เทส Task 2)

### Task 1: ตารางทบทวนใน quizcore
**Files:** `lib/quizcore.js`, `_test/quizcore.test.cjs`
**Produces:**
- `reviewUpdate(p, q, score, now, keyOv)`: ตอบแล้วปรับคิว
- `reviewAdd(p, qid, now)`: ปักธงแล้วเข้าคิวถ้ายังไม่อยู่
- `reviewDue(p, ids, now) -> qid[]`: ข้อที่ครบกำหนดแล้ว
- `mergeProgress` รวม `review` ด้วย

- [ ] เทสที่ยังไม่ผ่าน:
  - ผิด → step 0 ครบกำหนดพรุ่งนี้
  - ถูกตอนครบกำหนด 3 ครั้ง → +3 วัน, +7 วัน, แล้วออกจากคิว
  - ถูกก่อนครบกำหนด → ไม่เปลี่ยน · ผิดระหว่างทาง → กลับ step 0
  - draft → ไม่เข้าคิว · ปักธงเข้าคิว
  - merge: ที่ใหม่กว่าชนะ (รวมกรณีออกจากคิว)
- [ ] RED → เขียนโค้ด → GREEN → commit `quizcore: spaced review queue (1, 3, 7 days)`

### Task 2: ต่อเข้าหน้าเว็บ + กล่องหน้าแรก
**Files:** `quiz.js` (ตอนตรวจคำตอบ 3 จุด + ปักธง, handler `review`, export `reviewCounts(b)`), `app.js` (`normProg` รู้จัก `review`, กล่องใน `viewHome`), `styles.css`, version files · Test `_test/review.mjs`
- [ ] เทสที่ยังไม่ผ่าน (Playwright):
  - ไม่มีคิว → ไม่มี `#review`
  - ตอบผิด 1 ข้อในโหมดฝึก → `PROG.review` มีข้อนั้น · หน้าแรกขึ้น "ในคิว 1 ข้อ"
  - ใส่คิวปลอมที่ครบกำหนด 2 ข้อของ END + 1 id ที่ไม่มีแล้ว → ปุ่ม END แสดง 2 · กดแล้วได้ชุด `/@` ที่มี 2 ข้อ
  - ไม่มี pageerror
- [ ] RED → เขียนโค้ด → GREEN → รันเทสเดิมทั้งหมด → ออกเวอร์ชัน → commit → push → PR draft
