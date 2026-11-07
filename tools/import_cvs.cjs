#!/usr/bin/env node
/*
 * Import the CVS block from the CVS-pdf project into MedLib (format v2).
 *
 *   node tools/import_cvs.cjs [path-to-CVS-project]      (default: ../CVS)
 *
 * Reads  <CVS>/exams/quiz_*.html (quiz data embedded as JSON) and <CVS>/Output/data/lectures.json
 * Writes data/blocks/CVS/block.json, data/blocks/CVS/exams/<set>.json, data/blocks/CVS/img/*.jpg
 * and adds CVS to data/blocks/index.json. Re-running replaces the CVS block (generated files only).
 * Lecture PDFs stay on the CVS-pdf GitHub Pages site (block.json › lectures[].url).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const V = require("../lib/validate.js");

const ROOT = path.join(__dirname, "..");
const SRC = path.resolve(process.argv[2] || path.join(ROOT, "..", "CVS"));
const OUT = path.join(ROOT, "data", "blocks", "CVS");
const LECTURE_BASE = "https://apiwata90-design.github.io/CVS-pdf/lectures/";
const STATUS = { source_agree: "verified", corrected: "corrected", source_disagree: "disputed", drafted: "draft", source_unverified: "draft" };

function readQuiz(file) {
  const html = fs.readFileSync(file, "utf8");
  const m = html.match(/<script type="application\/json" id="quiz-data">([\s\S]*?)<\/script>/);
  if (!m) throw new Error(`no quiz-data in ${file}`);
  return JSON.parse(m[1]);
}
const pad = (n) => String(n).padStart(3, "0");
const expand = (p) => {
  const a = (p || []).map(Number).filter((x) => x > 0);
  if (a.length === 2 && a[1] >= a[0] && a[1] - a[0] < 40) return Array.from({ length: a[1] - a[0] + 1 }, (_, i) => a[0] + i);
  return [...new Set(a)];
};
const words = (t) => {
  if (Array.isArray(t)) return t.filter((x) => typeof x === "string" && x.trim());
  if (t && typeof t === "object") return [t.topic, t.discipline, t.bloom].filter((x) => typeof x === "string" && x.trim());
  return [];
};

// ---- lectures ----
const lecSrc = JSON.parse(fs.readFileSync(path.join(SRC, "Output", "data", "lectures.json"), "utf8")).lectures;
const lectures = lecSrc.map((l) => {
  const out = { id: l.lecture_id, title: l.title, pages: l.page_count, url: LECTURE_BASE + encodeURIComponent(l.file) };
  if (l.lecturer) out.lecturer = l.lecturer;
  const idx = (l.pages || []).filter((p) => p && p.page >= 1 && p.page <= l.page_count)
    .map((p) => ({ page: p.page, heading: p.heading || "", summary: p.summary || "", keywords: Array.isArray(p.keywords) ? p.keywords : [] }));
  if (idx.length) out.page_index = idx;
  return out;
});

// ---- exam sets ----
fs.rmSync(path.join(OUT, "exams"), { recursive: true, force: true });
fs.rmSync(path.join(OUT, "img"), { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, "exams"), { recursive: true });
fs.mkdirSync(path.join(OUT, "img"), { recursive: true });

const quizFiles = fs.readdirSync(path.join(SRC, "exams")).filter((f) => /^quiz_\d+_(MCQ|KF|OSPE)\.html$/.test(f));
const order = { MCQ: 0, KF: 1, OSPE: 2 };
quizFiles.sort((a, b) => {
  const [, ca, ta] = a.match(/quiz_(\d+)_(\w+)/), [, cb, tb] = b.match(/quiz_(\d+)_(\w+)/);
  return cb - ca || order[ta] - order[tb];
});

const sets = [];
let imgBytes = 0, nq = 0;
const block = { id: "CVS", name: "Cardiovascular System", year: "ปี 2", color: "#B3202E", lectures, papers: [], exam_sets: [] };

for (const f of quizFiles) {
  const d = readQuiz(path.join(SRC, "exams", f));
  const m = d.meta || {};
  const cohort = Number(m.year);
  const type = m.type;
  const sid = `${cohort}_${type}`;
  const idMap = {};
  const questions = (d.questions || []).map((q) => {
    const id = V.questionId("CVS", cohort, q.n, type);
    idMap[q.id] = id;
    const o = { id, block: "CVS", cohort, n: q.n, type };
    if (type === "MCQ") {
      o.stem = q.stem;
      o.options = Object.fromEntries((q.options || []).map((x) => [x.key, x.text]));
      const why = Object.fromEntries((q.options || []).filter((x) => x.why).map((x) => [x.key, x.why]));
      if (Object.keys(why).length) o.option_why = why;
      o.answer = q.answer;
      if (q.source_answer && q.source_answer !== q.answer && q.source_answer in o.options) o.source_answer = q.source_answer;
    } else {
      if (type === "KF") o.case = q.case || q.stem;
      else { o.station = q.station; o.stem = q.stem || ""; }
      o.items = (q.items || []).map((it) => {
        const c = Object.assign({}, it);
        if (!["short", "select"].includes(c.format)) c.format = c.options ? "select" : "short";
        return c;
      });
      if (q.source_answer) o.source_answer_text = String(q.source_answer);
    }
    o.answer_status = STATUS[q.answer_status] || (q.answer_verified ? "verified" : "draft");
    if (q.source_answer_note) o.source_answer_note = q.source_answer_note;
    if (q.explanation) o.explanation = q.explanation;
    if (q.key_concept) o.key_concept = q.key_concept;
    if (Array.isArray(q.mechanism) && q.mechanism.length) o.mechanism = q.mechanism;
    if (q.audit_note) o.audit_note = q.audit_note;
    if (q.image) {
      const mm = String(q.image).match(/^data:image\/(\w+);base64,(.+)$/);
      if (mm) {
        const ext = mm[1] === "jpeg" ? "jpg" : mm[1];
        const name = `img/${sid}_${pad(q.n)}.${ext}`;
        const buf = Buffer.from(mm[2], "base64");
        fs.writeFileSync(path.join(OUT, name), buf); imgBytes += buf.length;
        o.image = name;
      }
    }
    if (q.image_caption) o.image_caption = q.image_caption;
    o.refs = (q.refs || []).map((r) => {
      const x = { lecture: r.lecture, pages: expand(r.pages) };
      if (r.focus) x.focus = r.focus;
      if (r.note) x.note = r.note;
      if (r.hotspot && r.hotspot.tier) x.hotspot = { tier: r.hotspot.tier, years: r.hotspot.years || [] };
      return x;
    }).filter((r) => r.pages.length);
    o.tags = words(q.tags);
    o.source = "import";
    return o;
  });
  const guide = d.guide ? JSON.parse(JSON.stringify(d.guide)) : undefined;
  if (guide) (guide.lectures || []).forEach((L) => (L.topics || []).forEach((t) => {
    if (Array.isArray(t.question_ids)) t.question_ids = t.question_ids.map((x) => idMap[x] || x);
  }));
  const set = {
    meta: {
      set_id: sid, block: "CVS", cohort, type, title: `${type} CVS · Med PSU ${cohort}`,
      time_limit_min: m.time_limit_min || undefined, n_source_items: m.n_source_items || undefined,
      generated_by: "tools/import_cvs.cjs from the CVS-pdf project — do not edit by hand",
    },
    questions,
  };
  if (guide) set.guide = guide;
  sets.push(set);
  block.exam_sets.push(sid);
  nq += questions.length;
}

// ---- validate before writing ----
const errs = V.validateBlock(block);
sets.forEach((s) => V.validateExamSet(s, block).forEach((e) => errs.push(`${s.meta.set_id}: ${e}`)));
if (errs.length) {
  console.error(`ไม่ผ่าน ${errs.length} จุด:\n` + errs.slice(0, 40).map((e) => "  " + e).join("\n"));
  process.exit(1);
}
fs.writeFileSync(path.join(OUT, "block.json"), JSON.stringify(block, null, 2) + "\n");
sets.forEach((s) => fs.writeFileSync(path.join(OUT, "exams", `${s.meta.set_id}.json`), JSON.stringify(s, null, 1) + "\n"));
const idxFile = path.join(ROOT, "data", "blocks", "index.json");
const idx = JSON.parse(fs.readFileSync(idxFile, "utf8"));
if (!idx.blocks.includes("CVS")) { idx.blocks.push("CVS"); fs.writeFileSync(idxFile, JSON.stringify(idx, null, 2) + "\n"); }
console.log(`CVS: ${lectures.length} lectures, ${sets.length} sets, ${nq} questions, images ${(imgBytes / 1e6).toFixed(1)} MB`);
