# รายงานชุด end_51_MCQ — MCQ_Endocrine [Med PSU 51]

- ข้อในต้นฉบับ: 75 ข้อ · นำเข้า quiz ได้ 39 ข้อ
- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/end_51_MCQ.blind.json`) แล้วค่อยเทียบ

## สรุปสถานะเฉลย

| สถานะ | ความหมาย | จำนวน |
|---|---|---|
| `skipped` | ข้าม (ไม่มีโจทย์) | 36 |
| `source_agree` | ตรงกับต้นฉบับ | 24 |
| `ai_generated` | AI เขียนข้อใหม่ | 6 |
| `source_unverified` | ต้นฉบับไม่แน่นอน | 3 |
| `source_disagree` | ขัดกับต้นฉบับ | 3 |
| `drafted` | AI ทำเฉลย | 3 |

AI ตอบตรงกับเฉลยต้นฉบับ **27/33** ข้อที่มีโจทย์

## ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)

| ข้อ | ต้นฉบับ | AI | ความมั่นใจ | ปัญหา | รายละเอียด |
|---|---|---|---|---|---|
| 51 | B | A | medium | ช้อยส์จากความจำ ถ้อยคำไม่ชัด (A, E); เฉลยขัดกับ AI | เฉลยต้นฉบับวง B (convert cholesterol to bile) แต่โน้ตของผู้เฉลยเองอธิบาย reverse cholesterol transport ซึ่งตรงกับ A (efflux cholesterol ... to liver) — HDL ไม่ได้เปลี่ยน cholesterol เป็น bile เอง (ตับทำ) AI เลือก A |
| 61 | ['A', 'C'] | A | medium | ต้นฉบับไฮไลต์ไว้ 2 ตัว (A และ C); ต้นฉบับวงไว้หลายตัว | เฉลยต้นฉบับไฮไลต์ทั้ง A (down-regulation of RANKL) และ C (increased RANKL-OPG interaction) พร้อมโน้ต 'estrogen ↓ RANKL & ↑ OPG' — OPG ↑ ทำให้ RANKL ถูก OPG จับมากขึ้น C จึงถูกได้ด้วย; AI เลือก A |
| 69 | C | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก C (increased urinary glucose excretion) และผู้เฉลยเขียนว่า 'ไม่แน่ใจ' — กลไกที่ทำให้ glucose ปกติใน insulin resistance คือ compensatory hyperinsulinemia (B); glucosuria เกิดเมื่อ glucose สูงแล้ว |
| 71 | None | A | low | หน้าเฉลยต้นฉบับขาดหลังช้อยส์ A ไม่ทราบตัวที่เลือก; ถ้อยคำโจทย์กำกวม (chylomicron ก็ขน TG); ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้ | เฉลยต้นฉบับหมดที่หน้า 12 (หลังช้อยส์ A) มีแต่โน้ต 'storage energy = Triglyceride' — ทั้ง VLDL และ chylomicron ขน TG; AI เลือก VLDL ความมั่นใจต่ำ |

## ข้อที่ต้นฉบับไม่แน่นอน (source_unverified)

| ข้อ | เฉลย | หมายเหตุผู้จำ (ตัดออกจากโจทย์) | รายละเอียด |
|---|---|---|---|
| 23 | A | บรรยาย pancreas tumor มาแล้วถามว่า ควรใช้อะไรย้อมแล้วได้ผลpositive |  |
| 38 | A | คนไข้ 45 ชาย มาด้วยอาการ thirsty ปัสสาวะบ่อย อาการอะไรอีกซักอย่าง เป็นมาหลายเดือนแล้ว พ่อมีประวัติเป็น t2dm ตอนอายุประมาณ 50 (มีอะไรสำคัญอีกมั้ยมมนจ) mechanism คืออะไร |  |
| 43 | A | คนไข้เป็นเบาหวาน และมีอาการติดเชื้อ UTI (มีช้อยส์ A ตัวเดียว) |  |

## ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)

| ข้อ | ปัญหา | รายละเอียด |
|---|---|---|
| 1 | โจทย์อ้างถึงภาพ ต้นฉบับใช้ภาพแทน (ไม่ใช่ภาพจริงในข้อสอบ) และภาพไม่ได้ใส่ในข้อนี้ |  |
| 2 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 9 | ต้นฉบับช้อยส์ D กับ E ซ้ำกัน (Easy bruising); ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 10 | ช้อยส์ C, D, E AI เติมให้ครบ 5 ตัว |  |
| 15 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 18 | ผู้จำไม่แน่ใจชื่อโรค (11-hydroxylase); AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 33 | ต้นฉบับไม่มีโจทย์ AI เขียนโจทย์ใหม่จากช้อยส์ (น่าจะเป็นข้อเดียวกับข้อ 50); AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 50 | ช้อยส์ C, E AI เติมให้ครบ 5 ตัว |  |
| 52 | ในเฉลยต้นฉบับข้อนี้ไม่ได้วงคำตอบ; ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้ |  |
| 53 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 55 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 58 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 63 | ต้นฉบับเขียน endothelium น่าจะหมายถึง endometrium; AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 74 | ต้นฉบับจำช้อยส์ได้ตัวเดียว และเฉลยหมดก่อนถึงข้อนี้; AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 75 | เฉลยต้นฉบับหมดก่อนถึงข้อนี้; ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้ |  |

## การแก้ไขข้อความ (edits)

| ข้อ | ส่วน | เดิม | ใหม่ |
|---|---|---|---|
| 5 | choices.C | Paraventicullar nuclei | Paraventricular nuclei |
| 5 | choices.E | Somatrotroph | Somatotroph |
| 6 | choices.C | Inferioir thyroid artery | Inferior thyroid artery |
| 10 | stem | การ mutations ของ NIS ส่งผลให้เกิดhypothyroid ยังไง | Mutation of the sodium-iodide symporter (NIS) causes hypothyroidism through which mechanism? |
| 23 | stem | บรรยาย pancreas tumor มาแล้วถามว่า ควรใช้อะไรย้อมแล้วได้ผลpositive | A patient has a pancreatic neuroendocrine tumor. Which immunohistochemical stain is expected to be positive? |
| 33 | choices.B | decease glycogenolysis | decrease glycogenolysis |
| 37 | choices.E | nhibition of membrane depolarization | Inhibition of membrane depolarization |
| 37 | choices.B | Decreasing of intercellular ATP | Decreasing of intracellular ATP |
| 38 | stem | คนไข้ 45 ชาย มาด้วยอาการ thirsty ปัสสาวะบ่อย อาการอะไรอีกซักอย่าง เป็นมาหลายเดือนแล้ว พ่อมีประวัติเป็น t2dm ตอนอายุประมาณ 50 (มีอะไรสำคัญอีกมั้ยมมนจ) mechanism คืออะไร | A 45-year-old man has had thirst and frequent urination for several months. His father was diagnosed with type 2 diabetes at about age 50. What is the main mechanism of his disease? |
| 45 | choices.B | Delaglutide | Dulaglutide |
| 57 | choices.D | Hypercalemia | Hypercalcemia |
| 57 | choices.E | Hyperphosphotemia | Hyperphosphatemia |
| 58 | stem | 2 weeks after operation ชีมาหาหมอด้วยอาการ arrhythmia, muscle spasm. Which of the following mechanism ทำให้ calcium dyshomeostasis? | 2 weeks after the operation he presents with arrhythmia and muscle spasm. Which of the following mechanisms causes the calcium dyshomeostasis? |
| 58 | choices.B | Decrease bone reabsorption | Decrease bone resorption |
| 60 | stem | 52-year-old women มีภาวะ post menstrual osteoporosis ถามว่ากลไกของ post menstrual osteoporosis ตรงกับข้อใด | A 52-year-old woman has postmenopausal osteoporosis. Which of the following is the mechanism of postmenopausal osteoporosis? |
| 69 | choices.E | Decreased intestinal absorbtion | Decreased intestinal absorption |

## ข้อที่ข้าม (skipped)

ข้อ 3, 4, 11, 16, 17, 20, 21, 22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 35, 36, 39, 41, 42, 44, 46, 47, 48, 49, 54, 56, 62, 66, 67, 68, 70, 72, 73 — ต้นฉบับมีแค่ "–" (ผู้จำจำโจทย์ไม่ได้) และในเฉลยก็ไม่มีโน้ตของข้อนี้
เก็บไว้ใน work file พร้อมสถานะ ไม่ได้ลบ แต่ไม่ใส่ใน quiz JSON เพราะไม่มีโจทย์ให้ทำ เมื่อทำรุ่นอื่นของ block นี้ (Phase 4) จะลองเติมจากข้อซ้ำข้ามรุ่น

## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้

- `end-t1dm-metabolism`: ข้อ 33, 50
- `end-estrogen-rankl`: ข้อ 60, 61, 74
