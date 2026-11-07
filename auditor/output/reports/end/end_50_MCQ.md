# รายงานชุด end_50_MCQ — MCQ_Endocrine [Med PSU 50]

- ข้อในต้นฉบับ: 71 ข้อ · นำเข้า quiz ได้ 59 ข้อ
- AI แก้โจทย์ทุกข้อก่อนเปิดเฉลย (`data/work/end_50_MCQ.blind.json`) แล้วค่อยเทียบ

## สรุปสถานะเฉลย

| สถานะ | ความหมาย | จำนวน |
|---|---|---|
| `source_agree` | ตรงกับต้นฉบับ | 42 |
| `skipped` | ข้าม (ไม่มีโจทย์) | 12 |
| `source_disagree` | ขัดกับต้นฉบับ | 8 |
| `ai_generated` | AI เขียนข้อใหม่ | 5 |
| `source_unverified` | ต้นฉบับไม่แน่นอน | 3 |
| `drafted` | AI ทำเฉลย | 1 |

AI ตอบตรงกับเฉลยต้นฉบับ **45/54** ข้อที่มีโจทย์

## ข้อที่ต้องให้ผู้ใช้ตัดสิน (needs_review / disagree)

| ข้อ | ต้นฉบับ | AI | ความมั่นใจ | ปัญหา | รายละเอียด |
|---|---|---|---|---|---|
| 9 | E | C | medium | ถ้อยคำโจทย์กำกวม: 'TRH markedly increase when she is given'; เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก E (pituitary) โดยตีความว่า TRH สูง TSH ต่ำ = pituitary เสีย; แต่ถ้าโจทย์หมายถึง TRH stimulation test แล้ว TSH ขึ้นมาก จะเป็น hypothalamus (C) — ขึ้นกับถ้อยคำจริง |
| 11 | A | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก A (Graves) จาก lab ที่เป็น hyperthyroid แต่ไม่ได้ใช้อาการปวดคอและต่อมกดเจ็บ ซึ่งเป็นลักษณะเฉพาะของ subacute thyroiditis (B) — ทั้งสองโรคมี FT4 ↑ TSH ↓ |
| 30 | None | None | None | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ | เฉลยต้นฉบับเขียนว่า metyrapone พร้อมระบุ ADR ว่า hypertension ซึ่งขัดกับโจทย์ที่มี hypertension อยู่แล้ว AI จึงเขียนข้อให้คำตอบเป็น ketoconazole — ควรตรวจว่าโจทย์จริงถามอะไร |
| 39 | A | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก A (glimepiride + nateglinide) แต่ทั้งสองตัวเป็น insulin secretagogue ที่ออกฤทธิ์ที่ K-ATP เดียวกัน ไม่ใช่ complementary mechanism; B ใช้ 2 กลไกต่างกัน |
| 52 | A | B | low | ข้อมูลในโจทย์ไม่พอประเมิน sd-LDL (ไม่มี TG); ช้อยส์ E ตัวเลขผิดปกติ (HDL 160 TC 40); เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก A โดยคิด TC − HDL สูงสุด (145); AI เลือก B เพราะ HDL ต่ำสุด — sd-LDL สัมพันธ์กับ TG/HDL ซึ่งโจทย์ไม่ได้ให้ TG จึงกำกวม |
| 58 | C | A | medium | มีมากกว่า 1 ช้อยส์ที่เป็น first-line ตาม guideline; เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก C (denosumab); AI เลือก A (alendronate เป็น first-line ที่พบบ่อยสุด) — ทั้ง bisphosphonate และ denosumab เป็น first-line สำหรับ high risk ตาม guideline ขึ้นกับว่า lecture สอนอย่างไร |
| 59 | A | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก A (raloxifene + vitamin D) แต่ 'adjunctive therapy' หมายถึงสิ่งที่ให้ร่วมกับยาหลักทุกราย คือ calcium + vitamin D (B) |
| 60 | A | B | high | เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก A (cortisol) — cortisol ทำให้เกิดอาการ แต่คำว่า Cushing disease (ไม่ใช่ syndrome) หมายถึงสาเหตุคือ ACTH จาก pituitary adenoma; ขึ้นกับว่าโจทย์ถาม 'ตัวการ' ในความหมายไหน |
| 63 | B | B | medium | ความรู้ embryology ของกระดูกค่อนข้างละเอียด |  |
| 66 | D | D | low | ทั้ง VLDL และ chylomicron ขน TG ให้เซลล์ ถ้อยคำโจทย์ไม่ได้ระบุช่วงเวลา |  |
| 68 | E | A | high | ทั้ง IDL และ chylomicron (remnant) เพิ่มขึ้น; เฉลยขัดกับ AI | เฉลยต้นฉบับเลือก E (chylomicron) โดยโน้ตว่า IDL ยังเปลี่ยนเป็น LDL ได้; ใน type III ทั้ง IDL (VLDL remnant) และ chylomicron remnant เพิ่มขึ้น — อาจนับถูกทั้ง A และ E |

## ข้อที่ต้นฉบับไม่แน่นอน (source_unverified)

| ข้อ | เฉลย | หมายเหตุผู้จำ (ตัดออกจากโจทย์) | รายละเอียด |
|---|---|---|---|
| 6 | D | *เติมช้อยส์เพิ่มเอง (คิดเอง) |  |
| 18 | A | (คล้ายข้อ 13 ปี 49 แต่เปลี่ยนยีน จำยีนไม่ได้ TT) |  |
| 51 | C | (โจทย์ถามประมาณนี้ แต่แต่งตัวเลขขึ้นมา) |  |

## ปัญหาอื่นที่พบ (ไม่กระทบเฉลย)

| ข้อ | ปัญหา | รายละเอียด |
|---|---|---|
| 1 | โจทย์อ้างถึงภาพ ต้นฉบับใช้ภาพแทน (ไม่ใช่ภาพจริงในข้อสอบ) และภาพไม่ได้ใส่ในข้อนี้ |  |
| 3 | ในเฉลยต้นฉบับผู้จำเขียนว่าจำช้อยส์ไม่ได้เลย ช้อยส์ในไฟล์ข้อสอบอาจแต่งขึ้น; ไม่มีเฉลยต้นฉบับ AI ทำเฉลยให้ |  |
| 10 | ช้อยส์ E ในต้นฉบับซ้ำกับ D; ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |
| 22 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 25 | โจทย์ใช้คำว่า Addison disease ไม่ตรงกับ lab (ACTH ต่ำ) |  |
| 27 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 31 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 32 | AI เขียนข้อนี้ขึ้นใหม่จากโน้ตความจำในต้นฉบับ |  |
| 34 | ช้อยส์ B AI เติมให้ครบ 5 ตัว |  |
| 35 | ช้อยส์เดิมเป็นภาษาไทยปนอังกฤษ แปลให้เป็นอังกฤษ |  |
| 47 | ช้อยส์เดิมเป็นภาษาไทยปนอังกฤษ แปลให้เป็นอังกฤษ |  |
| 53 | ค่า calcium ในโจทย์ (6.8 mmol/L) เป็นไปไม่ได้ น่าจะเป็น 6.8 mg/dL |  |
| 54 | ช้อยส์เดิมเป็นภาษาไทย แปลให้เป็นอังกฤษ |  |
| 61 | ช้อยส์ E AI เติมให้ครบ 5 ตัว |  |

## การแก้ไขข้อความ (edits)

| ข้อ | ส่วน | เดิม | ใหม่ |
|---|---|---|---|
| 6 | stem | ยกตัวอย่างฮอร์โมนที่สร้างจาก Basophil *เติมช้อยส์เพิ่มเอง (คิดเอง) | Which of the following hormones is produced by basophils of the anterior pituitary? |
| 7 | stem | จากการ Overexpression of ADH ส่งผลให้เกิดอะไรบ้าง | Overproduction of ADH would result in which of the following? |
| 7 | choices.E | hyponatremia | Hyponatremia |
| 8 | choices.D | Pegvigsomant | Pegvisomant |
| 9 | stem | A young women มี puffy skin, weight gain, TSH concentration low TRH markly increase when she is given. | A young woman has puffy skin and weight gain. Her TSH concentration is low, and it increases markedly when TRH is given. |
| 14 | stem | Mechanism หลักของ iodine คืออะไร | What is the main mechanism of action of iodide in treating hyperthyroidism? |
| 15 | choices.C | Tremer | Tremor |
| 16 | stem | มารดาอายุครรภ์ 4 เดือนควรใช้ยา Antithyroid drug ชนิดใดต่อไปนี้ | A woman who is 4 months pregnant has hyperthyroidism. Which antithyroid drug should be used? |
| 17 | stem | She was heart palpitation, hypertension and hyperglycemia. | She had palpitations, hypertension and hyperglycemia. |
| 18 | stem | (คล้ายข้อ 13 ปี 49 แต่เปลี่ยนยีน จำยีนไม่ได้ TT) A patient with incomplete mutations of the starD1 gene, show low level of STAR protein expression. | A patient with an incomplete mutation of the STARD1 gene shows a low level of StAR protein expression. |
| 24 | stem | ผลแลปได้ Hypokalemia ต้องตรวจอะไรเป็นอันดับแรก | A patient's laboratory results show hypokalemia. Which test should be done first? |
| 24 | choices.D | Aldosterone to rennin ratio | Aldosterone to renin ratio |
| 25 | stem | เป็น Addison disease แล้ว ACTH ลดลง cortisol ลด test อะไร แยกระหว่าง pituitary กับ hypothalamus defects | A patient with adrenal insufficiency (called Addison disease in the original) has low ACTH and low cortisol. Which test distinguishes a pituitary from a hypothalamic defect? |
| 28 | choices.C | Capal tunnel syndrome | Carpal tunnel syndrome |
| 28 | choices.E | Hypotention | Hypotension |
| 35 | stem | A 47-year-old woman อาการ fatigue confusion blurred vision หิวมากตอนเช้า กินข้าวแล้ว 20- 30 นาทีหาย แพทย์สงสัย hypoglycemia จาก insulinoma (tumor หลั่ง insulin) ถามว่าข้อไหนตรงกับ อาการ | A 47-year-old woman has fatigue, confusion, blurred vision and severe hunger in the morning that resolve 20–30 minutes after eating. Hypoglycemia from an insulinoma is suspected. Which metabolic change is consistent with her condition? |
| 37 | stem | after receiving after receiving anti-diabetic drugs | after receiving anti-diabetic drugs |
| 38 | stem | glyburide glibenclamide | glyburide (glibenclamide) |
| 39 | stem | therefor | therefore |
| 40 | stem | หากผลตรวจ Hemoglobin typing ของคนไข้ได้เป็น EE ต้องใช้อะไรในการติดตามระดับน้ำตาลของ คนไข้? | A diabetic patient's hemoglobin typing is EE. Which test should be used to monitor glycemic control? |
| 41 | stem | FPG 120 mg/dl และ 75g OGTT 135 mg/dl รายงานผลอย่างไร? | A patient has FPG 120 mg/dL and 2-hour plasma glucose 135 mg/dL after a 75-g OGTT. How should the result be reported? |
| 46 | stem | ผู้ป่วยเป็น DM smoke cigarette 1 pack a day เป็น Myocardial infarction ถามว่าอะไรที่เสียหาย เป็นอย่างแรก? | A diabetic patient who smokes 1 pack a day develops myocardial infarction. Which structure is damaged first in the atherosclerotic process? |
| 47 | stem | Increase HDLs level decrease risk altherosis which of the following anti-atherogenic action HDLs? | Increased HDL levels decrease the risk of atherosclerosis. Which of the following is an anti-atherogenic action of HDL? |
| 48 | stem | 15-years-old patient มีอาการ hypercholesterolemia ได้รับการรักษาด้วย statin แล้วระดับ LDL ยังไม่ลด เมื่อตรวจยีนพบว่ามี overexpression of PCSK9 gene ควรใช้ยาอะไรในการรักษา? | A 15-year-old patient with hypercholesterolemia does not respond to statin therapy. Genetic testing shows overexpression of the PCSK9 gene. Which drug should be used? |
| 49 | stem | has persistence dyslipidemia | has persistent dyslipidemia |
| 51 | stem | ให้ระดับ Tc 280 mg/dL, TG 150 mg/dL, LDL-c 220 mg/dL, HDL-c 30 mg/dL ถามว่าปริมาณ non-HDL cholesterol เป็นเท่าไหร่? (โจทย์ถามประมาณนี้ แต่แต่งตัวเลขขึ้นมา) | A patient has total cholesterol 280 mg/dL, TG 150 mg/dL, LDL-C 220 mg/dL and HDL-C 30 mg/dL. What is the non-HDL cholesterol? |
| 54 | stem | A 55-year-old man กิน thiazide diuretics เพื่อลด hypertension ต่อมาเกิด constipation, fatigue, plasma Ca2+ 12.5 mg/dL โจทย์ถามว่า Thiazide diuretics มี MOA อย่างไร? | A 55-year-old man takes a thiazide diuretic for hypertension and later develops constipation, fatigue and plasma Ca²⁺ 12.5 mg/dL. Which mechanism of thiazide explains his hypercalcemia? |
| 56 | choices.E | Alkaline phosphate | Alkaline phosphatase |
| 57 | stem | OPG ทำอะไรกับ RANKL? | What does osteoprotegerin (OPG) do to RANKL? |
| 59 | stem | postmenopausal osteoporotic? | postmenopausal osteoporosis? |
| 60 | stem | อาการเป็น Cushing disease ถามว่า Hormone อะไรเป็นตัวการ? | A patient has Cushing disease. Which hormone is the primary cause? |
| 61 | stem | second amenorrhea | secondary amenorrhea |
| 68 | choices.B | DHL | HDL |
| 71 | stem | ผู้ชายอายุ 20 ปี x-ray กระดูดขาพบ loss สักอย่าง ประสบอุบัติเหตุ รถชน 2 ปี ต้องนอนเฉยๆ ผลฟิมล์ที่ เห็นมาจากอะไร? | A 20-year-old man was bedridden for 2 years after a car accident. An X-ray of his leg shows bone loss. Which cell is mainly responsible for this finding? |

## ข้อที่ข้าม (skipped)

ข้อ 4, 13, 19, 20, 21, 23, 26, 29, 65, 67, 69, 70 — ต้นฉบับมีแค่ "–" (ผู้จำจำโจทย์ไม่ได้) และในเฉลยก็ไม่มีโน้ตของข้อนี้
เก็บไว้ใน work file พร้อมสถานะ ไม่ได้ลบ แต่ไม่ใส่ใน quiz JSON เพราะไม่มีโจทย์ให้ทำ เมื่อทำรุ่นอื่นของ block นี้ (Phase 4) จะลองเติมจากข้อซ้ำข้ามรุ่น

## กลุ่มข้อที่ถามเรื่องเดียวกันในชุดนี้

- `end-50-rankl-opg`: ข้อ 56, 57
- `end-50-lipoprotein-energy`: ข้อ 66
