# REVIEW — รายการรอผู้ใช้ตัดสิน

ทั้งหมด 7 รายการ
วิธีตอบ: พิมพ์ในแชทเป็นบรรทัด เช่น `end_52_MCQ_027: คงเดิม` / `end_52_MCQ_063: C` / `end_52_MCQ_046: ตรวจใหม่`
Claude จะบันทึกลง `auditor/data/decisions.json` แล้ว build ใหม่

| id | ต้นฉบับ | AI | ความมั่นใจ | เรื่อง | ตัวเลือกที่เป็นไปได้ / เหตุผล |
|---|---|---|---|---|---|
| end_52_MCQ_018 | D | D | low | โจทย์ไม่มีข้อมูลแยก CAH กับ Addison | lab ในโจทย์เข้าได้ทั้ง salt-wasting 21-OHD และ Addison disease; AI เลือก 21-OHD (ตรงกับเฉลย) เพราะอยู่ในชุดข้อ CAH แต่ถ้าข้อสอบจริงมีข้อมูลเพิ่ม (ambiguous genitalia, 17-OHP) ควรเติม — A: lab เหมือนกันทุกตัว แต่โจทย์ไม่มีข้อมูล autoimmune/TB และอายุ 2 ปีพบ CAH บ่อยกว่า; B: pheochromocytoma ไม่ทำให้ cortisol/aldosterone ต่ำ; C: Cushing disease cortisol สูง; D: salt-wasting CAH เข้ากับทุก lab; E: 11β-OHD มี 11-DOC ↑ → hypertension, hypokalemia ไม่ใช่ salt wasting |
| end_52_MCQ_027 | C | C | medium | ช้อยส์ B อาจถูกด้วย | cortisol เพิ่มการสะสม glycogen ที่ตับ (ช้อยส์ B) ได้จริง — ถ้าข้อจริงเขียนว่า 'muscle glycogen' จะผิด; ต้นฉบับเลือก C ตรงกับ AI — A: cortisol ลด glucose uptake (insulin resistance); B: จริงสำหรับตับ (hepatic glycogen ↑) แต่ไม่ใช่ effect หลักที่สอนในบริบท catabolic; C: lipolysis ↑ เป็น effect หลักใน fasting/stress; D: cortisol เพิ่ม gluconeogenesis; E: cortisol เพิ่ม protein catabolism |
| end_52_MCQ_032 | C | C | high | โจทย์อ้างถึงรูป แต่ไม่มีรูปในต้นฉบับ | โจทย์เขียน 'as shown in the photo' แต่ไฟล์ข้อสอบและเฉลยไม่มีรูปประกอบ ตอบได้จากคำบรรยายอย่างเดียว  |
| end_52_MCQ_046 | B | B | medium | โจทย์ขัดกันเอง: เขียนว่า normal pH แต่ค่า 7.10 | 'normal arterial blood pH of 7.10' ขัดกัน (7.10 = acidosis) น่าจะจำค่าผิด — ไม่ได้แก้ตัวเลขเพราะเปลี่ยนความหมาย; ทั้ง AI และต้นฉบับตอบ HHS จาก ketone (−)  |
| end_52_MCQ_063 | A | A | medium | ช้อยส์ C อาจถูกด้วย | ทั้ง ketogenesis ↑ (A) และ gluconeogenesis ↑ (C) เกิดใน T1DM ที่ไม่ได้รักษา — มีคำตอบถูกมากกว่า 1 ตัว; ต้นฉบับเลือก A ตรงกับ AI — A: ถูก — ลักษณะเฉพาะของ T1DM; B: glycogenolysis เพิ่มขึ้น ไม่ได้ลดลง; C: ก็ถูก — glucagon/insulin ratio สูงกระตุ้น gluconeogenesis; D: protein synthesis ลดลง (catabolic); E: lipolysis เพิ่มขึ้น |
| end_52_MCQ_073 | E | E | medium | ช้อยส์ B อาจถูกด้วย | PTH ↓ ทำทั้ง bone resorption ↓ (B) และ gut Ca absorption ↓ ผ่าน vit D (E) — มีคำตอบถูกมากกว่า 1 ตัว; ต้นฉบับเลือก E ตรงกับ AI — A: calcitonin ไม่มีบทบาทใน hypocalcemia หลังผ่าตัดนี้; B: ก็ถูก — PTH ↓ → osteoclast activity ↓; C: FGF-23 ไม่ได้เพิ่ม; D: active vit D ลดลง ไม่ได้เพิ่ม; E: ถูก — vit D ↓ → gut absorption ↓ |
| end_52_MCQ_081 | E | E | low | ช้อยส์ B กับ E เป็นการตรวจเดียวกัน | BMD test (B) วัดด้วย DXA (E) — ช้อยส์ซ้ำซ้อน ข้อจริงอาจเขียนต่างจากนี้; ต้นฉบับเลือก E ตรงกับ AI — A: MRI ใช้หา occult fracture ไม่ใช่ประเมิน bone density; B: ความหมายเดียวกับ E; C: bone ALP เป็น turnover marker ไม่ใช่การวินิจฉัย; D: ใช้หา secondary cause ไม่ใช่ประเมินมวลกระดูก; E: DXA = gold standard วัด BMD |
