# ขั้น 2: Worker ตัวเดียว — PDF + แจ้งเฉลย + sync ด้วยรหัส — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ความคืบหน้าตามไปทุกเครื่องด้วยรหัส sync (ไม่ต้องสมัคร) ผ่าน Worker ตัวเดิม + คู่มือให้ kevinzkevier85 ตั้ง Worker ทั้งก้อน

**Architecture:** เพิ่ม route `/sync/*` ใน `worker/drive-proxy.js` เก็บไฟล์ความคืบหน้าใน Cloudflare KV (binding `SYNC`) · เว็บเก็บรหัสใน localStorage ดึง → รวมด้วย `mergeProgress` ที่มีอยู่ → ส่งกลับ ตอนเปิดเว็บและหลังจบรอบ · หน้าตั้งค่ามีส่วน "ซิงก์ข้ามเครื่อง" ที่ขึ้นเฉพาะเมื่อ `site.json › drive_proxy_url` มีค่า

**Tech Stack:** Cloudflare Workers (ES module) + KV, Node 22 (มี `Request`/`Response` ในตัว) สำหรับเทส Worker, Playwright (ดัก request) สำหรับเทสหน้าเว็บ

**Spec:** `docs/superpowers/specs/2026-11-07-medlib-roadmap-design.md` § ขั้น 2

## Global Constraints
- รหัส: 12 ตัวจาก `23456789abcdefghjkmnpqrstuvwxyz` แบ่ง `xxxx-xxxx-xxxx` (regex `^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$`)
- `PUT /sync/<code>` รับ JSON ไม่เกิน **512 KB** (524288 bytes) · ตอบ 413 ถ้าเกิน · 400 ถ้าไม่ใช่ JSON หรือรหัสผิดรูป
- ทุก route ยังเช็ก `ALLOWED_ORIGINS` เหมือนเดิม (403) · CORS อนุญาต `GET, POST, PUT`
- ซิงก์ **เฉพาะตอนเปิดเว็บและหลังจบรอบ / ส่งคำตอบ** (ไม่ใช่ทุกคำตอบ) และ PUT เฉพาะเมื่อข้อมูลเปลี่ยน — KV ฟรีเขียนได้ 1,000 ครั้ง/วัน
- ไม่มี key/token ใดในเว็บหรือ repo · `site.json` เก็บแค่ URL
- ข้อความบนเว็บภาษาไทย · ออกเวอร์ชัน 0.14.0 ตาม CLAUDE.md

## Review Focus
1. เน็ตหลุด / Worker ตอบ error ระหว่างซิงก์ → เว็บยังใช้งานได้ ความคืบหน้าในเครื่องไม่หาย แสดง "ซิงก์ไม่สำเร็จ" (เทสใน Task 3)
2. ใส่รหัสที่ไม่มีบน Worker (404) → บอกว่า "ไม่พบรหัสนี้" ไม่ลบข้อมูลในเครื่อง (เทสใน Task 3)
3. ใส่รหัสพิมพ์ผิดรูป/มีช่องว่าง/ตัวพิมพ์ใหญ่ → ตัดช่องว่าง แปลงเป็นตัวเล็ก ถ้ายังผิดรูปไม่ส่ง request (เทสใน Task 3)
4. ไฟล์บน Worker เสีย (ไม่ใช่ความคืบหน้า) → ไม่รวม ไม่ทับข้อมูลในเครื่อง (เทสใน Task 2: PUT ต้องเป็นรูปแบบ `{format:"medlib-sync"}`)
5. สองเครื่องซิงก์สลับกัน → รอบของทั้งสองเครื่องอยู่ครบ (เทสใน Task 3)

---

### Task 1: เทสสำหรับ Worker (โครง)

**Files:**
- Create: `_test/worker.test.mjs`

**Interfaces:**
- Produces: `fakeEnv()` → `{ ALLOWED_ORIGINS: "http://localhost:8765", SYNC: <Map-based KV with get(key)/put(key,value)> }` · `call(method, path, body?, origin = "http://localhost:8765")` → `Response` จาก `worker.fetch(new Request(...), env, { waitUntil(){} })`

- [ ] **Step 1:** เขียน helper + เทสของที่มีอยู่แล้ว: origin อื่นได้ 403, `OPTIONS` ตอบ 204 และ `Access-Control-Allow-Methods` มี `PUT`
- [ ] **Step 2:** `node _test/worker.test.mjs` · Expected: FAIL ที่ `PUT` ไม่อยู่ใน allow-methods (ข้ออื่นผ่าน)
- [ ] **Step 3:** แก้ allow-methods เป็น `GET, POST, PUT` ใน `worker/drive-proxy.js`
- [ ] **Step 4:** รันซ้ำ · Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit** — `worker: allow PUT; add worker tests`

### Task 2: route `/sync` ใน Worker

**Files:**
- Modify: `worker/drive-proxy.js` (route ก่อน `/report`, คอมเมนต์หัวไฟล์ข้อ 3 + ตัวแปร `SYNC`)
- Test: `_test/worker.test.mjs`

**Interfaces:**
- Produces (HTTP): `POST /sync/new` → 201 `{"code":"xxxx-xxxx-xxxx"}` · `GET /sync/<code>` → 200 body ที่เก็บไว้ / 404 · `PUT /sync/<code>` → 200 `{"ok":true}` · ไม่มี binding `SYNC` → 501 `sync is not set up on the worker`

- [ ] **Step 1: เทสที่ยังไม่ผ่าน**
  - `new` ได้รหัสตรง regex ใน Global Constraints และสองครั้งได้คนละรหัส
  - `PUT` แล้ว `GET` ได้ body เดิม (`{"format":"medlib-sync","progress":{"rounds":{}}}`)
  - `GET` รหัสที่ไม่มี → 404 · รหัสผิดรูป (`ABC`) → 400
  - `PUT` body 524289 bytes → 413 · body `not json` → 400 · JSON ที่ `format` ไม่ใช่ `medlib-sync` → 400
  - env ไม่มี `SYNC` → 501
- [ ] **Step 2:** รัน · Expected: FAIL (route ยังไม่มี → 404/500)
- [ ] **Step 3:** เขียน route · สุ่มรหัสด้วย `crypto.getRandomValues` · เก็บใน KV key `p:<code>` · `POST /sync/new` เช็กว่าไม่ชนรหัสเดิม (get ก่อน put) แล้วเขียน `{"format":"medlib-sync","progress":{}}`
- [ ] **Step 4:** รัน · Expected: ผ่านทั้งหมด
- [ ] **Step 5: Commit** — `worker: progress sync by code (Cloudflare KV)`

### Task 3: ซิงก์ในหน้าเว็บ

**Files:**
- Modify: `app.js` (โมดูลซิงก์ + ส่วนในหน้าตั้งค่า + เรียกตอนเปิดเว็บ), `quiz.js` (เรียก `ML.syncSoon()` หลัง `finish` / `submit`), `styles.css` (ถ้าต้องใช้)
- Create: `_test/sync.mjs` (Playwright ดัก `**/sync/**` ด้วย KV ปลอมในเทส)

**Interfaces:**
- Consumes: Worker HTTP จาก Task 2 · `QC.mergeProgress(mine, theirs)` และ `normProg()` ที่มีอยู่
- Produces: `ML.syncSoon()` (ซิงก์หนึ่งครั้ง ไม่ซ้อนกันถ้ากำลังซิงก์อยู่) · localStorage `medlib.sync.v1` = `{ code, last, hash }`

- [ ] **Step 1: เทสที่ยังไม่ผ่าน (`_test/sync.mjs`)** — ตั้ง `site.json` ปลอมให้มี `drive_proxy_url: "http://worker.test"` ด้วย `page.route`
  - เครื่อง A: หน้าตั้งค่า กด "สร้างรหัสใหม่" → เห็นรหัส · ทำ 1 ข้อแล้วกดจบรอบ → มี `PUT` ไปที่ worker
  - เครื่อง B (context ใหม่): ใส่รหัสของ A → เห็นจำนวนรอบเท่าของ A · ทำรอบของ B แล้วจบ → เปิด A ใหม่ เห็นรอบของทั้งสองเครื่อง
  - ใส่ `"  K7M2-P9QX-4FH8 "` → ส่ง `GET /sync/k7m2-p9qx-4fh8` · ใส่ `abc` → ขึ้น "รหัสไม่ถูกต้อง" และไม่มี request
  - worker ตอบ 404 → "ไม่พบรหัสนี้" ข้อมูลในเครื่องไม่หาย · worker ตอบ 500 / network error → "ซิงก์ไม่สำเร็จ" ไม่มี `pageerror`
  - ไม่มี `drive_proxy_url` → ไม่มีส่วน "ซิงก์ข้ามเครื่อง" ในหน้าตั้งค่า
- [ ] **Step 2:** `node _test/sync.mjs` (เปิด `python3 -m http.server 8765` ก่อน) · Expected: FAIL (ยังไม่มีส่วนซิงก์)
- [ ] **Step 3:** เขียนโค้ด
  - ฐาน URL = `APP.config.drive_proxy_url` ตัด `/` ท้าย
  - `syncNow()`: GET → ถ้า 200 และ `format === "medlib-sync"` → `PROG = normProg(QC.mergeProgress(PROG, remote.progress))`, `saveProg()`, `route()` เมื่อมีอะไรเปลี่ยน · คำนวณ hash ของ `JSON.stringify(PROG)` ถ้าต่างจากที่ส่งครั้งก่อน → PUT `{format:"medlib-sync", progress: PROG, saved: ISO}` · เก็บ `last`
  - เรียก `syncNow()` หลังโหลดเว็บ (ถ้ามีรหัส) และ `ML.syncSoon()` หลัง finish/submit
  - หน้าตั้งค่า: ข้อความ "ใครรู้รหัสจะเห็นความคืบหน้าของคุณ (ไม่มีข้อมูลส่วนตัวอื่น)", ปุ่ม สร้างรหัสใหม่ / ช่องใส่รหัส + ปุ่มเชื่อม / ซิงก์ตอนนี้ / เลิกซิงก์ในเครื่องนี้ (ลบแค่รหัสในเครื่อง) / ปุ่มคัดลอกรหัส · สถานะ "ซิงก์ล่าสุด …"
- [ ] **Step 4:** รัน `node _test/sync.mjs` · Expected: ผ่านทั้งหมด · และ `node _test/quizcore.test.cjs` · `node tools/validate.cjs` ยังผ่าน
- [ ] **Step 5: Commit** — `Sync progress across devices with a code`

### Task 4: คู่มือตั้ง Worker + ออกเวอร์ชัน

**Files:**
- Create: `docs/worker-setup.md`
- Modify: `NEXT_TASKS.md` (รายการ "ผู้ใช้ตั้ง Worker" ชี้ไปคู่มือ), `version.json`, `CHANGELOG.md`, `index.html`, `sw.js`

- [ ] **Step 1:** คู่มือทีละขั้นสำหรับ kevinzkevier85 (ภาษาไทย ใช้คำง่าย): สมัคร Cloudflare ฟรี → สร้าง Worker → วางโค้ด `worker/drive-proxy.js` → สร้าง KV namespace `medlib-sync` และผูกชื่อ `SYNC` → ใส่ `DRIVE_API_KEY` (Secret, Drive API only) / `GITHUB_TOKEN` (fine-grained, Issues read/write เฉพาะ repo นี้) / `GITHUB_REPO` / `ALLOWED_ORIGINS` → ทดสอบ 3 อย่าง (`curl` เปิด PDF, แจ้งเฉลย, `POST /sync/new`) → ใส่ URL ใน `site.json` แล้วเปิด PR · ระบุว่าห้ามวาง key ในแชท/repo
- [ ] **Step 2:** ออกเวอร์ชัน 0.14.0 · `node tools/validate.cjs` · Expected: `✓ ผ่าน`
- [ ] **Step 3: Commit + push + PR draft** — branch `finn-worker-sync`
