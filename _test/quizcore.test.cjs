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
console.log(`\n${pass} ผ่าน`);
