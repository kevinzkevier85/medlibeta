# รายงานชุด end_49_MCQ — MCQ_Endocrine [Med PSU 49]

- ข้อในต้นฉบับ: 38 ข้อ · นำเข้า quiz ได้ 38 ข้อ
- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/end_49_MCQ.blind.json`) แล้วค่อยเทียบ

## สรุปสถานะเฉลย

| สถานะ | ความหมาย | จำนวน |
|---|---|---|
| `source_agree` | ตรงกับต้นฉบับ | 27 |
| `source_disagree` | ขัดกับต้นฉบับ | 8 |
| `ai_generated` | AI เขียนข้อใหม่ | 1 |
| `drafted` | AI ทำเฉลย | 1 |
| `corrected` | แก้ตามผู้ใช้ | 1 |

AI ตอบตรงกับเฉลยต้นฉบับ **27/37** ข้อที่มีโจทย์

## ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)

| ข้อ | ต้นฉบับ | AI | ความมั่นใจ | ปัญหา | รายละเอียด |
|---|---|---|---|---|---|
| 2 | ['C', 'D'] | C | high | ผู้เฉลยวงทั้ง acetylcholine และ norepinephrine และเขียนว่าไม่แน่ใจว่าโจทย์ถามอะไร; ต้นฉบับวงไว้หลายตัว | เฉลยต้นฉบับวงทั้ง C (acetylcholine) และ D (norepinephrine) พร้อมโน้ตว่าไม่แน่ใจว่าถามอะไร — สัญญาณกระตุ้นการหลั่งคือ ACh; NE เป็นผลผลิต AI เลือก C |
| 5 | C | E | high | ต้นฉบับพิมพ์ตัวอักษรช้อยส์ซ้ำ (a. a. b. c. d.) จัดเรียงใหม่เป็น A–E; เฉลยขัดกับ AI | เฉลยต้นฉบับวงช้อยส์ 'increased hepatic glycogenolysis' แต่โน้ตที่แปะเองบอกว่า fed state ตับสังเคราะห์ glycogen — glycogenolysis เกิดตอน fasting; คำตอบที่ถูกคือ muscle glucose uptake (E) ซึ่งเป็นเฉลยของข้อเดียวกันในรุ่น 47, 50 |
| 10 | C | B | high | ค่า calcium ในต้นฉบับเขียนซ้อนกัน (2.0 1.5 mmol/L); เฉลยขัดกับ AI | เฉลยต้นฉบับกากบาทที่ช้อยส์ c (osteoporosis) — hypocalcemia หลังตัด parathyroid ทำให้ tetany (B) ข้อเดียวกันในรุ่น 47 และ 50 เฉลย tetany น่าจะกากบาทผิดบรรทัด |
| 12 | B | A | low | ถ้อยคำโจทย์กำกวม (ไม่ระบุยาอื่น); ช้อยส์ E AI เติมให้ครบ 5 ตัว; เฉลยขัดกับ AI | เฉลยต้นฉบับกากบาท b (inhibit CYP3A4) — CYP3A4 inhibition ทำให้ prednisolone สูงขึ้น (Cushingoid) ไม่ใช่คลื่นไส้อ่อนแรง; อาการเข้ากับระดับ steroid ลดลงจาก inducer มากกว่า แต่โจทย์ไม่ระบุยาอื่น |
| 15 | E | D | high | เฉลยขัดกับ AI | เฉลยต้นฉบับขีดช้อยส์ e (increased glucose uptake in brain) — ข้อเดียวกันในรุ่น 47, 51, 52 เฉลย increased insulin secretion (D) ซึ่งเป็นกลไกชดเชยจริง |
| 17 | B | D | high | เฉลยขัดกับ AI | เฉลยต้นฉบับขีด b (atrophy both glands) โดยอ้าง autoimmune adrenalitis — แต่ทารกแรกเกิด salt wasting + hyperpigmentation คือ CAH ซึ่งต่อมโตทั้งสองข้าง (D) ข้อเดียวกันในรุ่น 46, 47 เฉลย bilateral diffuse enlargement |
| 28 | E | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับวง e (ACTH) โดยเขียน pituitary tumor → ACTH ↑ — แต่คางยื่น มือเท้าใหญ่ คือ acromegaly จาก GH (B) |
| 29 | E | C | high | เฉลยขัดกับ AI | เฉลยต้นฉบับวง e (decrease calcium absorption) โดยแปะสไลด์ bone/calcium — แต่ muscle pain และ weakness จาก dexamethasone ระยะยาวคือ steroid myopathy (protein catabolism, C) |
| 31 | None | A | medium | ตัวกระตุ้นโดยตรงที่สุดคือ hypoglycemia ซึ่งไม่มีในช้อยส์; ในเฉลยต้นฉบับไม่ได้วงคำตอบ (ใส่ ?); ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้ |  |

## ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)

| ข้อ | ปัญหา | รายละเอียด |
|---|---|---|
| 6 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 8 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 18 | ช้อยส์ D ในไฟล์ข้อสอบพิมพ์ผิดเป็น 17 hydroxylase |  |
| 19 | หน่วยในต้นฉบับ (mmol/dL, ng/dL/hour) น่าจะพิมพ์ผิด |  |
| 23 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 25 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 36 | แก้เฉลยตาม issue #28: DM หลัง total pancreatectomy = other specific type (โรคของตับอ่อนส่วน exocrine) แม้ต้องฉีด insulin | เฉลยต้นฉบับกากบาท a (type 1 diabetes) — ตาม ADA classification DM หลัง total pancreatectomy เป็น other specific type (C) ข้อเดียวกันในรุ่น 46, 47, 50 เฉลย C |

## การแก้ไขข้อความ (edits)

| ข้อ | ส่วน | เดิม | ใหม่ |
|---|---|---|---|
| 2 | choices.E | Vasoactive | Vasoactive intestinal peptide |
| 4 | choices.C | IPC | Phospholipase C |
| 4 | choices.D | IPA | Phospholipase A2 |
| 6 | stem | กิน niacin คันและเปqนผื่นแดง เกิดจากสารใด | A patient taking niacin develops pruritus and skin flushing. Which mediator causes this? |
| 7 | stem | A 55-year-old man กิน thiazide diuretics เพื่อลด hypertension ตÑอมาเกิด constipation, fatigue, plasma Ca2+ 12.5 mg/dL โจทยâถามวÑา Thiazide diuretics มี MOA อยÑางไร | A 55-year-old man takes a thiazide diuretic for hypertension and later develops constipation, fatigue and plasma Ca²⁺ 12.5 mg/dL. Which mechanism of thiazide explains his hypercalcemia? |
| 8 | stem | เปåาหมายของการวินิจฉัยโรคกระดูกพรุน | What is the goal of diagnosing osteoporosis? |
| 10 | stem | (2.0 1.5 mmol/L) | (1.5 mmol/L) |
| 11 | stem | with type 2 diabetics developed | with type 2 diabetes developed |
| 12 | stem | Patient take prednisolone with other drug and then having nausea and weakness. What is the following mechanism of prednisolone cause this symptom? | A patient takes prednisolone with another drug and then develops nausea and weakness. Which drug-interaction mechanism explains these symptoms? |
| 13 | stem | show low level of STAR protein expression. This mutation lead to | shows a low level of StAR protein expression. This mutation leads to |
| 13 | choices.A | salt waste | Salt wasting |
| 16 | stem | From this following picture. What is this hormone? | From the following picture, what is this hormone? |
| 17 | stem | เด็กชายอายุ 10 วัน น้ำหนักลด ปากแหSง skin pigmentation โจทยâถาม gross adrenal | A 10-day-old boy has weight loss, dry lips and skin hyperpigmentation. What is the gross appearance of his adrenal glands? |
| 18 | stem | แพทยâวินิจฉัยวÑาเปqน autosomal recessive disorder เนื่องมาจาก mutation of CYP27B1 Which following is contribute of these signs/symptoms? | A patient is diagnosed with an autosomal recessive disorder caused by a mutation of CYP27B1. Which of the following contributes to the signs and symptoms? |
| 19 | stem | 40 years old female มาหSองฉุกเฉิน ดSวยอาการ headache. | A 40-year-old woman presents to the emergency room with headache. |
| 20 | stem | Which of the following excess cortisol cause in Cushing patient? | Which of the following is caused by excess cortisol in a patient with Cushing syndrome? |
| 22 | stem | Which of followings cause | Which of the following causes |
| 23 | stem | Pars nervosa มีผลตÑอการทำงานกระบวนการอะไรในรÑางกาย | The pars nervosa affects which body process? |
| 24 | choices.B | Waterhouse-Friedrichsen syndrome | Waterhouse-Friderichsen syndrome |
| 26 | stem | groups of follicular having nuclear inclusion and nuclear groove. | groups of follicular cells having nuclear inclusions and nuclear grooves. What is the most likely diagnosis? |
| 28 | stem | คนไขSมี lateral visual defect แตÑ residual vision 20/20 และมีอาการคางยื่น มือเทSาใหญÑ จะตรวจพบ คÑาใดที่มีปริมาณที่สูง | A patient has a lateral (bitemporal) visual field defect with residual acuity 20/20, a protruding jaw and enlarged hands and feet. Which hormone level is expected to be high? |
| 30 | stem | อายุ 70 ป§ กิน colchicine กับ simvastatin เพื่อรักษาโรค gout และ hyperlipidemia ตามลำดับ what parameters could be found in this patient? | A 70-year-old patient takes colchicine for gout and simvastatin for hyperlipidemia. Which abnormal laboratory parameter could be found? |
| 32 | choices.C | Capel tunnel syndrome | Carpal tunnel syndrome |
| 33 | stem | MOA of anti-thyroid drugs ขSอใดถูกตSอง | Which pairing of antithyroid drug and mechanism is correct? |
| 36 | choices.E | Insulin dependent mellitus | Insulin-dependent diabetes mellitus |
| 38 | choices.B | DHL | HDL |

## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้

- `end-49-fed-state`: ข้อ 5
- `end-49-cushing-acth-independent`: ข้อ 21
