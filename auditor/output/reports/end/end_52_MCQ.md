# รายงานชุด end_52_MCQ — MCQ_Endocrine [MED PSU 52]

- ข้อในต้นฉบับ: 81 ข้อ · นำเข้า quiz ได้ 67 ข้อ
- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/end_52_MCQ.blind.json`) แล้วค่อยเทียบ

## สรุปสถานะเฉลย

| สถานะ | ความหมาย | จำนวน |
|---|---|---|
| `source_agree` | ตรงกับต้นฉบับ | 62 |
| `skipped` | ข้าม (ไม่มีโจทย์) | 14 |
| `source_unverified` | ต้นฉบับไม่แน่นอน | 5 |

AI ตอบตรงกับเฉลยต้นฉบับ **67/67** ข้อที่มีโจทย์

## ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)

| ข้อ | ต้นฉบับ | AI | ความมั่นใจ | ปัญหา | รายละเอียด |
|---|---|---|---|---|---|
| 18 | D | D | low | โจทย์ไม่มีข้อมูลแยก CAH กับ Addison | lab ในโจทย์เข้าได้ทั้ง salt-wasting 21-OHD และ Addison disease; AI เลือก 21-OHD (ตรงกับเฉลย) เพราะอยู่ในชุดข้อ CAH แต่ถ้าข้อสอบจริงมีข้อมูลเพิ่ม (ambiguous genitalia, 17-OHP) ควรเติม |
| 27 | C | C | medium | ช้อยส์ B อาจถูกด้วย | cortisol เพิ่มการสะสม glycogen ที่ตับ (ช้อยส์ B) ได้จริง — ถ้าข้อจริงเขียนว่า 'muscle glycogen' จะผิด; ต้นฉบับเลือก C ตรงกับ AI |
| 32 | C | C | high | โจทย์อ้างถึงรูป แต่ไม่มีรูปในต้นฉบับ | โจทย์เขียน 'as shown in the photo' แต่ไฟล์ข้อสอบและเฉลยไม่มีรูปประกอบ ตอบได้จากคำบรรยายอย่างเดียว |
| 46 | B | B | medium | ต้นฉบับเขียนค่า pH 7.10 ซึ่งขัดกับคำว่า normal จึงแก้เป็น 7.38 (pH ปกติ) ให้ตรงกับเฉลย HHS | แก้ pH 7.10 → 7.38 ตาม issue #26 (ผู้ใช้ขอแก้โจทย์) · ต้นฉบับและ AI ตอบ HHS |

## ข้อที่ต้นฉบับไม่แน่นอน (source_unverified)

| ข้อ | เฉลย | หมายเหตุผู้จำ (ตัดออกจากโจทย์) | รายละเอียด |
|---|---|---|---|
| 20 | B | (ถามประมาณว่า 11β-hydroxylase ใช้ไม่ได้ จะเกิดอะไรขึ้น) | หมายเหตุผู้จำบอกว่าข้อจริงถามเรื่อง 11β-hydroxylase แต่ข้อที่เขียนไว้เป็น 11β-HSD2 — เป็นคนละเอนไซม์ (ข้อจริงอาจตรงกับข้อ 21 มากกว่า) |
| 35 | A | (จำช้อยไม่ได้ แต่พยายามเติมให้) | ผู้จำเขียนว่าจำช้อยส์ไม่ได้ แต่งให้เอง — ช้อยส์ไม่ใช่ของข้อสอบจริง |
| 69 | B | (จำได้ ไม่หมด แต่เติมช้อยให้แล้ว) | ผู้จำเขียนว่าจำได้ไม่หมด เติมช้อยส์เอง |
| 75 | D | (ไม่แน่ใจ) | ผู้จำเขียนว่าไม่แน่ใจ; คำตอบ D สอดคล้องกับกลไก GIOP |
| 79 | C | (มียา 5 ตัว แล้วถามประมาณว่าตัวไหนทำให้เกิด osteoporosis ได้บ้าง) | ผู้จำบอกว่าข้อจริงถามว่ายาตัวไหนทำให้เกิด osteoporosis — คำตอบเหมือนเดิม (pioglitazone) แต่ถ้อยคำโจทย์ไม่ใช่ของจริง |

## ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)

| ข้อ | ปัญหา | รายละเอียด |
|---|---|---|
| 17 | โจทย์ไม่ครบ: 'and imaging' ไม่มีผล imaging | ประโยค 'presents with episodes of hypoglycemia and imaging.' ขาดผล imaging (น่าจะเป็น pancreatic mass) — ไม่ได้เติมเอง เพราะไม่รู้ข้อความจริง |
| 53 | แก้โจทย์: ต้นฉบับเขียน "Addison's disease" แต่ cortisol ต่ำ + ACTH ต่ำ คือ central AI (Addison = primary AI, ACTH สูง) → เปลี่ยนเป็น "adrenal insufficiency" · เฉลยเดิม B | แก้โจทย์ (ผู้ใช้สั่ง 2026-11-10): ต้นฉบับเขียน "Addison's disease" แต่ lab ACTH ต่ำคือ central AI (Addison = primary AI, ACTH สูง) → เปลี่ยนเป็น "adrenal insufficiency"; เฉลย B เหมือนเดิม |
| 63 | ข้อนี้ถูก 2 ตัว: A และ C (ได้คะแนนทั้งคู่) | ถูก 2 ตัว: ketogenesis ↑ (A) และ gluconeogenesis ↑ (C) เกิดทั้งคู่ใน T1DM ที่ไม่ได้รักษา — ผู้ใช้ให้ถูกร่วมกัน |
| 68 | คำอธิบายในต้นฉบับเป็นของข้ออื่น | โน้ตสีน้ำเงินข้างข้อ 68 ในเฉลยต้นฉบับคัดลอกมาจากข้อ 67 (ezetimibe/NPC1L1) — ไฮไลต์คำตอบ B ถูกต้อง แต่คำอธิบายผิดข้อ |
| 73 | ข้อนี้ถูก 2 ตัว: B และ E (ได้คะแนนทั้งคู่) | ถูก 2 ตัว: PTH ↓ ทำทั้ง bone resorption ↓ (B) และ gut Ca absorption ↓ ผ่าน vit D (E) — ผู้ใช้ให้ถูกร่วมกัน |
| 81 | ข้อนี้ถูก 2 ตัว: B และ E (ได้คะแนนทั้งคู่) | ถูก 2 ตัว: BMD test (B) วัดด้วย DXA (E) เป็นการตรวจเดียวกัน — ผู้ใช้ให้ถูกร่วมกัน |

## การแก้ไขข้อความ (edits)

| ข้อ | ส่วน | เดิม | ใหม่ |
|---|---|---|---|
| 13 | stem | The cytologic smear form fine needle aspiration reveals groups of follicular having nuclear inclusion and nuclear groove. | The cytologic smear from fine needle aspiration reveals groups of follicular cells having nuclear inclusions and nuclear grooves. |
| 20 | stem | What is the most likely diagnosis? (ถามประมาณว่า 11β-hydroxylase ใช้ไม่ได้ จะเกิดอะไรขึ้น) | What is the most likely diagnosis? |
| 35 | stem | through which of the following mechanisms? (จำช้อยไม่ได้ แต่พยายามเติมให้) | through which of the following mechanisms? |
| 42 | choices | ตาราง 5 คอลัมน์ในต้นฉบับ (text layer อ่านเป็นข้อความต่อกัน) | แปลงแต่ละแถวเป็นข้อความในช้อยส์ A–E |
| 46 | stem | normal arterial blood pH of 7.10 | normal arterial blood pH of 7.38 |
| 53 | stem | Addison’s disease | adrenal insufficiency |
| 69 | stem | at this site? (จำได้ ไม่หมด แต่เติมช้อยให้แล้ว) | at this site? |
| 70 | stem | Which of following lipoprotein particles involved in storing fat after eating a meal? | Which of the following lipoprotein particles is involved in storing fat after eating a meal? |
| 75 | stem | Which of the following factors associated with this condition? (ไม่แน่ใจ) | Which of the following factors is associated with this condition? |
| 79 | stem | in the bone marrow? (มียา 5 ตัว แล้วถามประมาณว่าตัวไหนทำให้เกิด osteoporosis ได้บ้าง) | in the bone marrow? |

## ข้อที่ข้าม (skipped)

ข้อ 3, 7, 9, 16, 19, 22, 24, 26, 31, 36, 39, 43, 64, 74 — ต้นฉบับมีแค่ "–" (ผู้จำจำโจทย์ไม่ได้) ไม่มีหัวข้อหรือโน้ตพอจะเขียนข้อขึ้นใหม่ และในเฉลยก็ไม่มีโน้ตของข้อนี้
เก็บไว้ใน work file พร้อมสถานะ ไม่ได้ลบ แต่ไม่ใส่ใน quiz JSON เพราะไม่มีโจทย์ให้ทำ เมื่อทำรุ่นอื่นของ block นี้ (Phase 4) จะลองเติมจากข้อซ้ำข้ามรุ่น

## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้

- `end-tzd-heart-failure`: ข้อ 5, 62
- `end-mmi-pregnancy`: ข้อ 14, 15
- `end-primary-adrenal-insufficiency`: ข้อ 25, 30, 37
- `end-sulfonylurea-moa`: ข้อ 56, 58
