// node _test/quizcore.test.cjs — checks the quiz logic without a browser
"use strict";
const assert = require("assert");
const Q = require("../lib/quizcore.js");

const mcq = { id: "X-1-MCQ-001", type: "MCQ", options: { A: "a", B: "b", C: "c" }, answer: "B" };
const kf = { id: "X-1-KF-001", type: "KF", items: [
  { id: "1", format: "short", accepted: ["transverse sinus"] },
  { id: "2", format: "short", accepted: [], keywords_all: ["เพิ่ม", "ลด"] },
  { id: "3", format: "select", options: [{ key: "a", text: "a" }, { key: "b", text: "b" }, { key: "c", text: "c" }], answer: ["a", "b"], max_answers: 2 },
] };
const qmap = { [mcq.id]: mcq, [kf.id]: kf };
let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("✓", name); };

t("short answer matches accepted text", () => assert.ok(Q.autoMatch(kf.items[0], "The Transverse Sinus")));
t("short answer needs every keyword", () => { assert.ok(Q.autoMatch(kf.items[1], "TV เพิ่ม IRV ลด")); assert.ok(!Q.autoMatch(kf.items[1], "เพิ่มอย่างเดียว")); });
t("select: partial and over-limit", () => {
  assert.strictEqual(Q.itemScore(kf.items[2], { sel: ["a"] }), 0.5);
  assert.strictEqual(Q.itemScore(kf.items[2], { sel: ["a", "b", "c"] }), 0);
});
t("override beats auto grading", () => assert.strictEqual(Q.itemScore(kf.items[0], { text: "zzz" }, 1), 1));

t("round: practice MCQ scoring + key override", () => {
  const r = Q.newRound([mcq, kf], { mode: "practice" });
  r.ans[mcq.id] = "C"; r.chk[mcq.id] = true;
  assert.strictEqual(Q.status(mcq, r), "wrong");
  assert.strictEqual(Q.status(mcq, r, { [mcq.id]: "C" }), "ok");
  r.ans[kf.id] = { 1: { text: "transverse sinus" }, 2: { text: "เพิ่ม ลด" }, 3: { sel: ["a"] } }; r.chk[kf.id] = true;
  assert.strictEqual(Q.status(kf, r), "partial");
  const s = Q.roundStats(r, qmap);
  assert.strictEqual(s.checked, 2); assert.strictEqual(s.ok, 0); assert.strictEqual(s.wrong, 2);
});
t("shuffle keeps every question once", () => {
  const r = Q.newRound([mcq, kf], { shuffleQ: true, shuffleC: true });
  assert.deepStrictEqual(r.qids.slice().sort(), [kf.id, mcq.id].sort());
  assert.deepStrictEqual(r.choiceOrder[mcq.id].slice().sort(), ["A", "B", "C"]);
});
t("latest result: newest round wins", () => {
  const r1 = Q.newRound([mcq]); r1.started = 1; r1.ans[mcq.id] = "A"; r1.chk[mcq.id] = true;
  const r2 = Q.newRound([mcq]); r2.started = 2; r2.ans[mcq.id] = "B"; r2.chk[mcq.id] = true;
  assert.strictEqual(Q.latestResults([r2, r1], qmap)[mcq.id], 1);
});
t("merge progress files", () => {
  const a = { rounds: { "X/s": [{ id: "r1", started: 1, chk: {}, qids: [] }] }, marks: { notes: { q: { t: 5, text: "old" } }, flag: { q1: true } } };
  const b = { rounds: { "X/s": [{ id: "r1", started: 1, chk: { q: true }, qids: [] }, { id: "r2", started: 2, chk: {}, qids: [] }] }, marks: { notes: { q: { t: 9, text: "new" } }, flag: { q2: true } } };
  const m = Q.mergeProgress(a, b);
  assert.strictEqual(m.rounds["X/s"].length, 2);
  assert.ok(m.rounds["X/s"][0].chk.q);
  assert.strictEqual(m.marks.notes.q.text, "new");
  assert.ok(m.marks.flag.q1 && m.marks.flag.q2);
});
const dr = { id: "X-1-MCQ-002", type: "MCQ", options: { A: "a", B: "b" }, answer: "A", answer_status: "draft" };
const dp = { ...dr, id: "X-1-MCQ-003", answer_status: "disputed" };
const qm2 = { [mcq.id]: mcq, [dr.id]: dr, [dp.id]: dp };
t("counts: draft/disputed no, verified/corrected/missing yes, own key yes", () => {
  assert.strictEqual(Q.counts(dr), false); assert.strictEqual(Q.counts(dp), false);
  assert.strictEqual(Q.counts(mcq), true); assert.strictEqual(Q.counts({ ...mcq, answer_status: "corrected" }), true);
  assert.strictEqual(Q.counts(dr, { [dr.id]: "B" }), true);
});
t("roundStats skips uncounted, still grades them", () => {
  const r = Q.newRound([mcq, dr, dp]);
  [mcq, dr, dp].forEach((q) => { r.ans[q.id] = "A"; r.chk[q.id] = true; });
  const s = Q.roundStats(r, qm2);
  assert.strictEqual(s.checked, 1); assert.strictEqual(s.wrong, 1); assert.strictEqual(s.uncounted, 2);
  assert.strictEqual(Q.status(dr, r), "ok");
});
t("roundStats: all uncounted gives 0%, not NaN", () => {
  const r = Q.newRound([dr]); r.ans[dr.id] = "A"; r.chk[dr.id] = true;
  const s = Q.roundStats(r, qm2); assert.strictEqual(s.pct, 0); assert.strictEqual(s.checked, 0);
});
t("latestResults leaves out uncounted unless own key", () => {
  const r = Q.newRound([mcq, dr]); r.ans[mcq.id] = "B"; r.ans[dr.id] = "A"; r.chk[mcq.id] = r.chk[dr.id] = true;
  assert.deepStrictEqual(Object.keys(Q.latestResults([r], qm2)), [mcq.id]);
  assert.ok(dr.id in Q.latestResults([r], qm2, { [dr.id]: "A" }));
});
console.log(`\n${pass} ผ่าน`);
