# รายงานชุด end_45_MCQ — MCQ_Endocrine [Med PSU 45]

- ข้อในต้นฉบับ: 61 ข้อ · นำเข้า quiz ได้ 61 ข้อ
- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/end_45_MCQ.blind.json`) แล้วค่อยเทียบ

## สรุปสถานะเฉลย

| สถานะ | ความหมาย | จำนวน |
|---|---|---|
| `source_agree` | ตรงกับต้นฉบับ | 48 |
| `ai_generated` | AI เขียนข้อใหม่ | 7 |
| `source_disagree` | ขัดกับต้นฉบับ | 4 |
| `source_unverified` | ต้นฉบับไม่แน่นอน | 2 |

AI ตอบตรงกับเฉลยต้นฉบับ **50/54** ข้อที่มีโจทย์

## ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)

| ข้อ | ต้นฉบับ | AI | ความมั่นใจ | ปัญหา | รายละเอียด |
|---|---|---|---|---|---|
| 2 | D | C | medium | คำตอบขึ้นกับตำรา: Golgi (lecture/BRS) หรือ secretory vesicle (USMLE); เฉลยขัดกับ AI | เฉลยต้นฉบับวง D (vesicle); ข้อ 13 ในชุดเดียวกันผู้เฉลยวงทั้ง vesicle และ Golgi และเขียนว่า lecture/BRS บอก Golgi — AI เลือก C (Golgi) อาจนับถูกทั้ง C และ D |
| 5 | E | E | low | ถ้อยคำโจทย์กว้าง (ตะคริวมีหลายสาเหตุ) |  |
| 13 | ['A', 'E'] | E | high | ผู้เฉลยวงทั้ง Golgi และ secretory vesicle; ต้นฉบับวงไว้หลายตัว | เฉลยต้นฉบับวงทั้ง A (lysosomal/secretory vesicle) และ E (Golgi) โดยเขียนว่า lecture/BRS บอก Golgi, USMLE บอก secretory granule — AI เลือก E |
| 14 | ['A', 'B'] | B | medium | ผู้จำจำได้ 2 ช้อยส์ และผู้เฉลยวงทั้งสองตัว; ช้อยส์ C, D, E AI เติมให้ครบ 5 ตัว; ต้นฉบับวงไว้หลายตัว | ต้นฉบับมีแค่ A (hyponatremia) และ B (hyperkalemia) ผู้เฉลยวงทั้งคู่ ซึ่งถูกทั้งคู่จริง AI เติม C–E เป็นตัวลวง — ควรนับถูกทั้ง A และ B |
| 43 | ['B', 'D'] | B | high | ผู้เฉลยวงทั้ง B (cAMP) และ D (2-deoxyglucose); ต้นฉบับวงไว้หลายตัว | เฉลยต้นฉบับวงทั้ง B และ D โดยอ้าง PubMed ว่า 2-deoxyglucose กระตุ้น insulin ได้ — ในตำราหลัก (Guyton) 2-deoxyglucose ถูกจัดเป็นตัวยับยั้ง (inhibitor) การหลั่ง insulin AI เลือก B |
| 54 | A | A | low | ไม่มี BMD (DXA) ในช้อยส์; ผู้เฉลยต้นฉบับเขียนว่าไม่แน่ใจ |  |

## ข้อที่ต้นฉบับไม่แน่นอน (source_unverified)

| ข้อ | เฉลย | หมายเหตุผู้จำ (ตัดออกจากโจทย์) | รายละเอียด |
|---|---|---|---|
| 58 | D | ให้อาการมาเยอะ ๆ (ผู้จำจำอาการไม่ได้) |  |
| 61 | D |  |  |

## ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)

| ข้อ | ปัญหา | รายละเอียด |
|---|---|---|
| 10 | ผู้เฉลยเขียนว่าน่าจะจำช้อยส์ผิด (ที่ถูกคือ thyroid hormone 'receptor' จับ RXR) |  |
| 17 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 21 | ช้อยส์เดิมเป็นภาษาไทยปนอังกฤษ แปลให้เป็นอังกฤษ; ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 23 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 28 | ช้อยส์ D, E AI เติมให้ครบ 5 ตัว |  |
| 31 | ช้อยส์ B ในต้นฉบับเขียนว่า prostaglandin A2 น่าจะหมายถึง phospholipase A2 |  |
| 32 | แก้ถ้อยคำโจทย์ตามที่ผู้เฉลยต้นฉบับแก้ไว้ |  |
| 37 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 39 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 40 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 41 | ช้อยส์ D, E AI เติมให้ครบ 5 ตัว |  |
| 42 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 44 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 45 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 46 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 47 | ผู้จำจำได้ 2 ช้อยส์ AI เติมให้ครบ; ช้อยส์ C, D, E AI เติมให้ครบ 5 ตัว |  |
| 48 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 50 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 51 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 53 | ช้อยส์เดิมเป็นภาษาไทย แปลให้เป็นอังกฤษ; ช้อยส์ D, E AI เติมให้ครบ 5 ตัว |  |
| 56 | ช้อยส์ D, E AI เติมให้ครบ 5 ตัว |  |
| 57 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 60 | ช้อยส์ B ในต้นฉบับ (Pyrolin) ไม่ใช่ชื่อยาที่มีจริง AI แทนด้วยยาจากข้อ 32; ช้อยส์ B, D, E AI เติมให้ครบ 5 ตัว |  |

## การแก้ไขข้อความ (edits)

| ข้อ | ส่วน | เดิม | ใหม่ |
|---|---|---|---|
| 2 | stem | Peptide prohormone is cleavage into active hormone | A peptide prohormone is cleaved into the active hormone |
| 4 | stem | Epinephrine is qualified neurotransmitter, but can be hormone in critical condition. | Epinephrine is a neurotransmitter but acts as a hormone in critical conditions. |
| 6 | choices.E | Trans occipital approach | Transoccipital approach |
| 7 | stem | which of the following organ regulate Ca2+? | which of the following organs regulates Ca²⁺? |
| 10 | choices.D | Thyroid hormone forms a heterodimer with retinoid X receptor (RXR) | Thyroid hormone receptor forms a heterodimer with retinoid X receptor (RXR) |
| 11 | stem | Which of the following is less likely be treated by thyroxin | Which of the following is least likely to improve with thyroxine treatment |
| 14 | stem | Which of following is the consequence | Which of the following is a consequence |
| 17 | stem | Which of the following is correct due to Hypothalamic-pituitary axis? | Which of the following is correct about the hypothalamic-pituitary-adrenal axis? |
| 18 | choices.E | Increase PLA | Increase PLA₂ |
| 20 | choices.E | Hyper-responsibility to stress | Hyper-responsiveness to stress |
| 24 | stem | The doctor gives him a medication | The doctor gives the patient a medication |
| 25 | choices.C | Dessicated | Desiccated thyroid |
| 25 | choices.E | iodide | Iodide |
| 26 | stem | exerts its action | exerts its action |
| 31 | choices.B | Inhibit prostaglandin A2 | Inhibit phospholipase A2 |
| 31 | choices.C | Inhibit lipocortin? | Inhibit lipocortin |
| 33 | choices.D | Fludocortisone | Fludrocortisone |
| 34 | stem | A 40 years old male patient taking dexamethasone 0.5mg 12tab/day | A 40-year-old man has been taking dexamethasone 0.5 mg, 12 tablets/day, |
| 37 | stem | what additional tests should be performed? | which additional test should be performed? |
| 41 | stem | What is the pathway of inorganic phosphate (Pi) in the body? | By which pathway is inorganic phosphate (Pi) reabsorbed in the proximal tubule? |
| 51 | stem | What is the mechanism of action of glyburide that distinguishes it from other antidiabetic drugs? | What mechanism of action of glyburide distinguishes it from other antidiabetic drugs? |
| 52 | choices.B | Cholestipol | Colestipol |
| 54 | choices.A | Bone turn over marker | Bone turnover marker |
| 58 | stem | ให้อาการมาเยอะ ๆ สุดท้ายบอกว่าพบ Mass ที่มี Yellow tissue ให้การวินิจฉัยว่าเป็นอะไร? | A patient has an adrenal mass composed of well-circumscribed yellow tissue. What is the most likely diagnosis? |
| 60 | stem | Which factor has the least effect on reducing blood levels of Prednisone? | Which drug has the least effect in reducing blood levels of prednisone? |
| 61 | stem | What does the hPTH/PTHr receptor do? | What is the main signaling action of the PTH/PTHrP receptor? |

## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้

- `end-45-neuroendocrine`: ข้อ 1, 59
- `end-45-glucocorticoid-pla2`: ข้อ 18, 31, 56
- `end-45-prednisolone-interaction`: ข้อ 32, 60
- `end-45-acth-independent-cushing`: ข้อ 35, 36
