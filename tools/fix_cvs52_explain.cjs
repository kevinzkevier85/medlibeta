#!/usr/bin/env node
/*
 * ปรับรูปแบบเฉลย CVS 52 MCQ ให้ตรงมาตรฐาน (lib/validate.js › explainQuality)
 *
 *   node tools/fix_cvs52_explain.cjs
 *
 * data/blocks/CVS/exams/52_MCQ.json สร้างจาก tools/import_cvs.cjs (ต้นทางคือโปรเจกต์ CVS-pdf นอก repo)
 * จึงแก้มือไม่ได้ สคริปต์นี้ปรับเฉพาะรูปแบบ และต้องรันซ้ำทุกครั้งหลัง import_cvs.cjs:
 *   1. option_why: "ถูก — …" → "✓ …" และใส่/ถอด ✓ ให้ตรง answer + also_accept
 *   2. key_concept และเหตุผลตัวเลือกบางข้อ ตาม tools/cvs52_explain_patch.json
 *   3. ลำดับกลไก: ย้ายขั้นเฉลยไปขั้นที่ระบุคำตอบ (m = ลำดับขั้น เริ่ม 1, mt = [ลำดับ, ข้อความใหม่])
 */
"use strict";
const fs = require("fs");
const path = require("path");
const V = require("../lib/validate.js");
const FILE = path.join(__dirname, "..", "data", "blocks", "CVS", "exams", "52_MCQ.json");
const PATCH = JSON.parse(fs.readFileSync(path.join(__dirname, "cvs52_explain_patch.json"), "utf8"));

const set = JSON.parse(fs.readFileSync(FILE, "utf8"));
let marks = 0, patched = 0;
const restar = (m, i, text) => {
  if (!Array.isArray(m) || i < 0 || i >= m.length) throw new Error(`ลำดับกลไกไม่มีขั้นที่ ${i + 1}`);
  return m.map((x, j) => {
    let y = typeof x === "string" ? { s: x } : { ...x };
    delete y.answer;
    if (j === i) { if (text) y.s = text; y.answer = true; }
    return Object.keys(y).length === 1 ? y.s : y;
  });
};
for (const q of set.questions) {
  if (q.type !== "MCQ" || !q.option_why) continue;
  const ok = new Set([q.answer, ...(q.also_accept || [])]);
  const p = PATCH[String(q.n)] || {};
  if (p.w) for (const [l, t] of Object.entries(p.w)) { if (!(l in q.options)) throw new Error(`ข้อ ${q.n}: ไม่มีตัวเลือก ${l}`); q.option_why[l] = t; patched++; }
  if (p.k) { q.key_concept = p.k.map((x) => "• " + x).join("\n"); patched++; }
  if (p.m) { q.mechanism = restar(q.mechanism, p.m - 1); patched++; }
  if (p.mt) { q.mechanism = restar(q.mechanism, p.mt[0] - 1, p.mt[1]); patched++; }
  for (const l of Object.keys(q.option_why)) {
    const before = q.option_why[l];
    const bare = String(before).replace(/^\s*(✓\s*|ถูก\s*[—–-]\s*)/, "").trim();
    q.option_why[l] = ok.has(l) ? "✓ " + bare : bare;
    if (q.option_why[l] !== before) marks++;
  }
}
fs.writeFileSync(FILE, JSON.stringify(set, null, 1) + "\n");
const bad = set.questions.filter((q) => V.explainQuality(q).length);
console.log(`CVS 52 MCQ: ปรับ ✓ ${marks} จุด · ใช้แพตช์ ${patched} จุด · ยังไม่ผ่านเกณฑ์ ${bad.length} ข้อ`);
for (const q of bad) console.log(`  ข้อ ${q.n}: ${V.explainQuality(q).join(" ; ")}`);
process.exit(bad.length ? 1 : 0);
