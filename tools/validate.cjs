#!/usr/bin/env node
// Checks every block and exam file with the same rules the website uses (lib/validate.js).
// Run:  node tools/validate.cjs          (exit code 1 if anything is wrong)
const fs = require("fs");
const path = require("path");
const V = require("../lib/validate.js");

const ROOT = path.resolve(__dirname, "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), "utf8"));
let problems = 0, blocks = 0, questions = 0, noTopic = 0;
const gateFile = path.join(ROOT, "data/explain_gate.json");
const GATE = new Set(fs.existsSync(gateFile) ? JSON.parse(fs.readFileSync(gateFile, "utf8")).blocks : []);
const quality = {};   // block -> {mcq, bad}

for (const base of ["data/blocks", "samples/blocks"]) {
  const idx = read(`${base}/index.json`);
  for (const id of idx.blocks) {
    const b = read(`${base}/${id}/block.json`);
    const be = V.validateBlock(b);
    be.forEach((m) => console.log(`✗ ${base}/${id}/block.json: ${m}`));
    problems += be.length;
    blocks++;
    for (const l of [...(b.lectures || []), ...(b.papers || [])]) {
      if (l.file && !fs.existsSync(path.join(ROOT, base, id, l.file))) {
        console.log(`✗ ${base}/${id}: ไม่พบไฟล์ ${l.file}`); problems++;
      }
    }
    for (const sid of b.exam_sets || []) {
      const set = read(`${base}/${id}/exams/${sid}.json`);
      const se = V.validateExamSet(set, b);
      se.forEach((m) => console.log(`✗ ${base}/${id}/exams/${sid}.json: ${m}`));
      problems += se.length;
      questions += set.questions.length;
      if (base === "data/blocks") for (const q of set.questions) {
        if (q.type !== "MCQ") continue;
        const qp = V.explainQuality(q);
        const st = quality[id] || (quality[id] = { mcq: 0, bad: 0 });
        st.mcq++;
        if (qp.length) {
          st.bad++;
          if (GATE.has(id)) { console.log(`✗ ${base}/${id}/exams/${sid}.json: ${q.id}: เฉลยไม่ถึงมาตรฐาน — ${qp.join("; ")}`); problems++; }
        }
      }
      const ut = V.untagged(set, b);
      if (ut.length) { noTopic += ut.length; console.log(`⚠ ${base}/${id}/exams/${sid}.json: ยังไม่มีหัวข้อ ${ut.length} ข้อ (${ut.slice(0, 3).join(", ")}${ut.length > 3 ? " …" : ""}) — เพิ่มใน ${base}/${id}/topics.json แล้วรัน node tools/apply_topics.cjs ${id}`); }
    }
  }
}
const pend = Object.entries(quality).filter(([id, v]) => v.bad && !GATE.has(id)).map(([id, v]) => `${id} ${v.bad}/${v.mcq}`);
if (pend.length) console.log(`⚠ เฉลย MCQ ยังไม่ถึงมาตรฐาน (บล็อกที่ยังไม่อยู่ใน data/explain_gate.json): ${pend.join(", ")}`);
console.log(problems ? `\n${problems} ปัญหา` : `✓ ผ่าน — ${blocks} บล็อก, ${questions} ข้อ${noTopic ? ` (เตือน: ${noTopic} ข้อยังไม่มีหัวข้อ)` : ""}`);
process.exit(problems ? 1 : 0);
