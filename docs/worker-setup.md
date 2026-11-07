# ตั้ง Cloudflare Worker ของ MedLib (ทีละขั้น)

สำหรับ: kevinzkevier85 · ใช้เวลา ~30 นาที · ฟรีทั้งหมด

Worker ตัวเดียวทำ 3 อย่าง
1. **เปิด PDF** จาก Google Drive (กระโดดไปหน้าของข้อได้ ซูมได้ เก็บไว้ดูออฟไลน์ได้)
2. **แจ้งเฉลยน่าสงสัย** → เปิดเป็น GitHub Issue ป้าย `answer-report`
3. **ซิงก์ข้ามเครื่อง** ด้วยรหัส (ไม่ต้องสมัคร)

> ⚠️ **ห้ามวาง key หรือ token ในแชท ในไฟล์ใน repo หรือใน `site.json`** ใส่ในหน้า Cloudflare เท่านั้น (ชนิด Secret)
> `site.json` เก็บแค่ URL ของ Worker ซึ่งเปิดเผยได้

---

## 1. สมัคร Cloudflare
1. เข้า https://dash.cloudflare.com/sign-up สมัครด้วยอีเมล (แพ็กเกจ Free)
2. ยืนยันอีเมล

## 2. สร้าง Worker
1. เมนูซ้าย **Workers & Pages** → **Create** → **Create Worker**
2. ตั้งชื่อ เช่น `medlib` → **Deploy** (โค้ดตัวอย่างก่อน ไม่เป็นไร)
3. จะได้ URL แบบ `https://medlib.<ชื่อบัญชี>.workers.dev` จดไว้
4. กด **Edit code** → ลบโค้ดเดิมทั้งหมด → วางทั้งไฟล์ [`worker/drive-proxy.js`](../worker/drive-proxy.js) → **Deploy**

## 3. สร้างที่เก็บซิงก์ (KV)
1. เมนูซ้าย **Storage & Databases** → **KV** → **Create** ตั้งชื่อ `medlib-sync`
2. กลับไปที่ Worker `medlib` → **Settings** → **Bindings** → **Add** → **KV namespace**
3. Variable name: **`SYNC`** (ตัวพิมพ์ใหญ่ทั้งหมด) · KV namespace: `medlib-sync` → **Save**

## 4. ทำ key / token
### 4.1 Google API key สำหรับ Drive
1. https://console.cloud.google.com/apis/credentials → **Create credentials** → **API key**
2. กด key ที่ได้ → **API restrictions** → **Restrict key** → ติ๊ก **Google Drive API** อย่างเดียว
3. **Application restrictions** = None (Worker ไม่มีเว็บไซต์หรือ IP คงที่) → **Save**
4. คัดลอก key ไว้ใช้ในขั้น 5 (อย่าส่งให้ใคร)

### 4.2 GitHub token สำหรับแจ้งเฉลย
1. https://github.com/settings/personal-access-tokens/new (Fine-grained token)
2. Token name: `medlib-worker` · Expiration: ตามสะดวก (เช่น 1 ปี)
3. **Repository access** → **Only select repositories** → `kevinzkevier85/medlibeta`
4. **Permissions** → Repository permissions → **Issues: Read and write** (อย่างอื่นไม่ต้อง)
5. **Generate token** → คัดลอกไว้

## 5. ใส่ค่าใน Worker
Worker `medlib` → **Settings** → **Variables and Secrets** → **Add**

| ชื่อ | ชนิด | ค่า |
|---|---|---|
| `DRIVE_API_KEY` | **Secret** | key จากขั้น 4.1 |
| `GITHUB_TOKEN` | **Secret** | token จากขั้น 4.2 |
| `GITHUB_REPO` | Text | `kevinzkevier85/medlibeta` |
| `ALLOWED_ORIGINS` | Text | `https://kevinzkevier85.github.io,http://localhost:8765,http://127.0.0.1:8765` |

กด **Deploy** อีกครั้งถ้ามีปุ่มขึ้น

> `ALLOWED_ORIGINS` คือเว็บที่ใช้ Worker ได้ ใส่แค่ต้นทาง (ไม่มี `/medlibeta` ต่อท้าย) คั่นด้วย `,` ไม่มีช่องว่าง

## 6. ทดสอบ
เปิด Terminal (Mac) หรือ PowerShell (Windows) แทน `<URL>` ด้วย URL ของ Worker
(Windows ใช้ `curl.exe` แทน `curl`)

**PDF** — ใช้ `drive_file_id` ไฟล์ใดก็ได้จาก `data/blocks/END/block.json`
```bash
curl -s -o test.pdf -w "%{http_code}\n" -H "Origin: http://localhost:8765" "<URL>/file/<drive_file_id>"
```
ต้องได้ `200` และไฟล์ `test.pdf` เปิดได้

**ซิงก์**
```bash
curl -s -X POST -H "Origin: http://localhost:8765" "<URL>/sync/new"
```
ต้องได้ `{"code":"xxxx-xxxx-xxxx"}` (ถ้าได้ `sync is not set up` = ยังไม่ได้ผูก KV ชื่อ `SYNC`)

**เว็บอื่นใช้ไม่ได้** (ต้องได้ `403`)
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Origin: https://evil.example" "<URL>/sync/new"
```

**แจ้งเฉลย** — ทดสอบในเว็บหลังขั้น 7: เปิดข้อใดก็ได้ › แจ้งเฉลยน่าสงสัย › ส่ง แล้วดูว่ามี Issue ใหม่ใน GitHub (ปิด Issue ทดสอบทิ้งได้)

## 7. ให้เว็บใช้ Worker
1. สร้าง branch ใหม่ (เช่น `kevin-worker-url`) แก้ `site.json`:
   ```json
   { "drive_proxy_url": "<URL>", "report_url": "", "repo": "kevinzkevier85/medlibeta" }
   ```
   (`report_url` เว้นว่างได้ เว็บใช้ `drive_proxy_url` แทน)
2. เปิด PR ให้อีกคนตรวจ แล้ว merge
3. เปิดเว็บ › ตั้งค่า จะเห็นส่วน **ซิงก์ข้ามเครื่อง** และ "ดึงไฟล์จาก Google Drive: ผ่าน Cloudflare Worker"

---

## ถ้ามีปัญหา
| อาการ | สาเหตุที่พบบ่อย |
|---|---|
| `403 this site is not allowed` | `ALLOWED_ORIGINS` ไม่ตรงกับเว็บ (เช็ก http/https, ไม่มี `/` ท้าย) |
| `501 sync is not set up` | ยังไม่ผูก KV หรือชื่อไม่ใช่ `SYNC` |
| `503 sync storage is busy` | KV เขียนเกินโควตาฟรีของวันนั้น (รีเซ็ตทุกวัน) ข้อมูลในเครื่องผู้ใช้ไม่หาย |
| PDF ได้ `Google Drive returned 403/404` | key ผิด, ยังไม่เปิด Drive API, หรือไฟล์ไม่ได้แชร์ "ทุกคนที่มีลิงก์" |
| PDF ได้ `500 DRIVE_API_KEY is not set` | ยังไม่ได้ใส่ `DRIVE_API_KEY` |
| แจ้งเฉลยไม่ขึ้น Issue (`GitHub returned 401/403/404`) | token หมดอายุ / ไม่ได้ให้สิทธิ์ Issues / `GITHUB_REPO` ผิด |

**ขีดจำกัดแพ็กเกจฟรี:** Worker 100,000 ครั้ง/วัน · KV เขียนได้ 1,000 ครั้ง/วัน (เว็บซิงก์เฉพาะตอนเปิดเว็บและหลังจบรอบ และส่งเฉพาะเมื่อมีอะไรใหม่ ทั้งรุ่นยังพอ)

**ความเป็นส่วนตัวของซิงก์:** รหัส = กุญแจ ใครรู้รหัสเห็นความคืบหน้าของคนนั้น (ไม่มีชื่อ/อีเมล) · ถ้ารหัสหลุด ให้กด "เลิกซิงก์ในเครื่องนี้" แล้ว "สร้างรหัสใหม่"
