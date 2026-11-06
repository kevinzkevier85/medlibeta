# Next tasks

## เสร็จแล้ว — v0.2.0 (2026-11-07) หน้าตาใหม่
- ออกแบบใหม่ด้วย ui-ux-pro-max + frontend-design: gentian violet + ไฮไลต์เหลือง, เมนูสันแฟ้ม, ฟอนต์ Anuphan, dark mode
- แก้แค่ `styles.css` ชื่อ class เดิมทั้งหมด (`app.js` ไม่ได้แตะ)
- ตรวจหน้าตา: `node _test/shots.mjs` (และ `dark`) → `_test/shots/`

## เสร็จแล้ว — v0.1.0 (2026-11-07)
- เว็บใช้งานได้ในเครื่อง: บล็อก / lecture / ข้อสอบ / ค้นหา / ตัวดู PDF / ตั้งค่า / ฟอร์มเพิ่มข้อสอบ / เวอร์ชัน + changelog
- ตัวตรวจข้อมูลกลาง `lib/validate.js` + `tools/validate.cjs`
- บล็อก DEMO + PDF ตัวอย่าง

## ค้างตัดสินใจ (ผู้ใช้)
- ค่าส่วนตัวปรับได้แค่การตั้งค่าหน้าตา หรือเพิ่มโน้ต / ติดดาว / แก้คำอธิบายได้ด้วย

## ถัดไป
1. ผู้ใช้: ติดตั้ง Google Drive for Desktop, แชร์โฟลเดอร์ MedLib เป็น "ทุกคนที่มีลิงก์", สร้าง Drive API key (เขียนวิธีให้)
2. MCP server (Node) เรียก `lib/validate.js` ตัวเดียวกัน: list_blocks, search, get_question, get_lecture_page, add_question, add_lecture, sync_drive
3. `tools/sync_drive` อ่าน G:\ หาไฟล์ใหม่/เปลี่ยน → ดึงข้อความรายหน้า → `text/<lecture>.json` → ค้นหาในเนื้อหา lecture
4. นำเข้าไฟล์ `medlib-personal-*.json` เป็นข้อมูลกลาง
5. PWA (ติดตั้งเป็นแอป, เปิดออฟไลน์) แบบ CVS
6. push GitHub + GitHub Pages (ถามผู้ใช้ก่อน)
