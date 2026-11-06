# CLAUDE.md — MedLib

คลัง lecture และข้อสอบหลายบล็อก เว็บ static (HTML + PDF.js) ไม่มี build step
แผนและตัวอย่าง UI: `docs/medlib-plan.html` (artifact: https://claude.ai/artifact/43LnYXR7Fs1fg3n3h4y48k)

## กติกา
- **database เริ่มว่างและแยกจาก CVS/END** ห้าม copy ข้อมูลจากโปรเจกต์เดิมเข้ามาเองโดยผู้ใช้ไม่สั่ง
- **กติกาข้อมูลมีที่เดียว: `lib/validate.js`** ทุกทางที่เพิ่มข้อมูล (ฟอร์มเว็บ, MCP, import) ต้องเรียกตัวนี้ ห้ามเขียนกติกาซ้ำ เอกสาร: `docs/FORMAT.md`
- ข้อมูลจริงอยู่ `data/blocks/` เท่านั้น ข้อมูลตัวอย่างอยู่ `samples/blocks/` ห้ามปนกัน
- PDF จริงอยู่ Google Drive (แชร์ "ทุกคนที่มีลิงก์") ใน repo เก็บแค่ `drive_file_id`
- `config.json` มี Drive API key ซึ่งเป็น key สำหรับเบราว์เซอร์ ต้องจำกัด HTTP referrer ไว้ที่โดเมนเว็บ
- ค่ากลาง `defaults.json` / ค่าส่วนตัว localStorage key `medlib.user.v1` / PDF cache IndexedDB `medlib`

## ออกเวอร์ชันใหม่ (ทุกครั้งที่ส่งมอบ)
1. เพิ่มเลขใน `version.json` (`version`, `date`, และรายการใหม่ด้านบนสุดของ `history`)
2. เพิ่มหัวข้อใน `CHANGELOG.md`
3. เปลี่ยน `?v=` ใน `index.html` ให้ตรงเลขใหม่ (กันเบราว์เซอร์ใช้ไฟล์เก่า)
4. `node tools/validate.cjs` ต้องผ่าน

## คำสั่ง
- เปิดเว็บ: ดับเบิลคลิก `start.bat` (หรือ `python -m http.server 8765` แล้วเปิด http://localhost:8765)
- ตรวจข้อมูล: `node tools/validate.cjs`
- สร้าง PDF ตัวอย่างใหม่: `python tools/make_sample_pdf.py`

## สถานะ: ดู `NEXT_TASKS.md`
