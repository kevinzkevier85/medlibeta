#!/usr/bin/env node
// Writes topic tags from data/blocks/<B>/topics.json into the block's generated files:
//   block.json › topics            = topics.json › topics   ([{id, name}])
//   exams/*.json › questions[].topic = topics.json › questions[<question id>]
// Exam files are generated (auditor/tools/build_outputs.py, tools/import_cvs.cjs) and both call this
// at the end, so tags survive a rebuild. Edit topics.json, never the exam files.
// Run:  node tools/apply_topics.cjs [BLOCK …]      (no block = every block that has topics.json)
"use strict";
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const readJSON = (f) => JSON.parse(fs.readFileSync(f, "utf8"));
// keep each file's own style: indent width and whether it ends with a newline
function writeLike(file, original, data) {
  const m = original.match(/^\{\r?\n( +)/);
  const out = JSON.stringify(data, null, m ? m[1].length : 2) + (original.endsWith("\n") ? "\n" : "");
  if (out !== original) fs.writeFileSync(file, out);
}
// put topic right after type, so it reads next to the question's identity
function withTopic(q, topic) {
  const out = {};
  for (const [k, v] of Object.entries(q)) {
    if (k === "topic") continue;
    out[k] = v;
    if (k === "type" && topic) out.topic = topic;
  }
  if (topic && !("topic" in out)) out.topic = topic;
  return out;
}

// "read this lecture" refs ({lecture} without pages) come from topics.json › lectures; refs with pages are left alone
function withLectures(q, ls) {
  if (!Array.isArray(q.refs)) return q;
  const keep = q.refs.filter((r) => !(r && r.lecture && r.pages === undefined));
  const add = (Array.isArray(ls) ? ls : ls ? [ls] : []).filter((l, i, a) => a.indexOf(l) === i && !keep.some((r) => r && r.lecture === l));
  return { ...q, refs: [...keep, ...add.map((l) => ({ lecture: l }))] };
}

function applyTopics(blockDir) {
  const map = readJSON(path.join(blockDir, "topics.json"));
  const ids = new Set((map.topics || []).map((x) => x.id));
  const blockFile = path.join(blockDir, "block.json"), blockRaw = fs.readFileSync(blockFile, "utf8"), block = JSON.parse(blockRaw);
  const files = (block.exam_sets || []).map((s) => path.join(blockDir, "exams", `${s}.json`)).filter((f) => fs.existsSync(f));
  const raws = files.map((f) => fs.readFileSync(f, "utf8")), sets = raws.map((r) => JSON.parse(r));
  // check everything before writing anything
  const seen = new Set(sets.flatMap((s) => s.questions.map((q) => q.id)));
  const lecIds = new Set((block.lectures || []).map((l) => l.id)), lecMap = map.lectures || {};
  const bad = [
    ...Object.entries(map.questions || {}).filter(([, tp]) => !ids.has(tp)).map(([qid, tp]) => `${qid}: ไม่มีหัวข้อ ${tp} ในรายชื่อ`),
    ...Object.entries(lecMap).flatMap(([qid, ls]) => (Array.isArray(ls) ? ls : [ls]).filter((l) => !lecIds.has(l)).map((l) => `${qid}: ไม่มี lecture ${l} ในบล็อก`)),
  ];
  if (bad.length) throw new Error(`topics.json ของ ${block.id} ผิด:\n  ${bad.join("\n  ")}`);
  // a question removed from the exams but still in topics.json: skip it (warn), never block the rebuild
  const stale = Object.keys(map.questions || {}).filter((qid) => !seen.has(qid));

  let tagged = 0; const untagged = [];
  sets.forEach((s, i) => {
    s.questions = s.questions.map((q) => {
      const tp = map.questions[q.id];
      if (tp) tagged++; else untagged.push(q.id);
      return withLectures(withTopic(q, tp), lecMap[q.id]);
    });
    writeLike(files[i], raws[i], s);
  });
  const nb = {};
  for (const [k, v] of Object.entries(block)) { if (k !== "topics") nb[k] = v; if (k === "exam_sets") nb.topics = map.topics; }
  if (!("topics" in nb)) nb.topics = map.topics;
  writeLike(blockFile, blockRaw, nb);
  return { tagged, untagged, stale };
}

if (require.main === module) {
  const base = path.join(ROOT, "data", "blocks");
  const want = process.argv.slice(2).map((b) => b.toUpperCase());
  const blocks = want.length ? want : fs.readdirSync(base).filter((b) => fs.existsSync(path.join(base, b, "topics.json")));
  let fail = false;
  for (const b of blocks) {
    const dir = path.join(base, b);
    if (!fs.existsSync(path.join(dir, "topics.json"))) { console.log(`${b}: ไม่มี topics.json ข้าม`); continue; }
    try {
      const r = applyTopics(dir);
      console.log(`${b}: ติดหัวข้อ ${r.tagged} ข้อ · ยังไม่มีหัวข้อ ${r.untagged.length} ข้อ${r.untagged.length ? ` (${r.untagged.slice(0, 5).join(", ")}${r.untagged.length > 5 ? " …" : ""})` : ""}`);
      if (r.stale.length) console.log(`⚠ ${b}: topics.json มีข้อที่ไม่อยู่ในไฟล์ข้อสอบแล้ว ${r.stale.length} ข้อ (${r.stale.slice(0, 5).join(", ")}) ลบออกจาก topics.json ได้`);
    } catch (e) { console.log(`✗ ${e.message}`); fail = true; }
  }
  process.exit(fail ? 1 : 0);
}
module.exports = { applyTopics };
