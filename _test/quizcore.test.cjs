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
t("English accepted answer starts at a word", () => {
  const it = { format: "short", accepted: ["thyroid", "gh", "c"] };
  assert.ok(Q.autoMatch(it, "Thyroid gland")); assert.ok(Q.autoMatch(it, "GH, PRL")); assert.ok(Q.autoMatch(it, "C (parafollicular)"));
  assert.ok(!Q.autoMatch(it, "parathyroid")); assert.ok(!Q.autoMatch(it, "high")); assert.ok(!Q.autoMatch(it, "abc"));
  assert.ok(Q.autoMatch({ accepted: ["gnrh"] }, "↓GnRH → ↓FSH"));
});
t("negated answer does not match", () => {
  const it = { accepted: ["thyroid gland", "ลด"] };
  assert.ok(!Q.autoMatch(it, "not thyroid gland")); assert.ok(!Q.autoMatch(it, "no thyroid gland")); assert.ok(!Q.autoMatch(it, "non-thyroid gland"));
  assert.ok(!Q.autoMatch(it, "ไม่ลด")); assert.ok(!Q.autoMatch(it, "ไม่ใช่ลด"));
  assert.ok(Q.autoMatch(it, "thyroid gland")); assert.ok(Q.autoMatch(it, "ลด"));
  assert.ok(Q.autoMatch({ accepted: ["no change"] }, "no change")); assert.ok(Q.autoMatch({ accepted: ["ไม่เปลี่ยน"] }, "ไม่เปลี่ยน"));
});
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
t("groupStats: weakest first, untouched last, uncounted left out", () => {
  const g = (id, topic, extra = {}) => ({ id, type: "MCQ", topic, options: { A: "a", B: "b" }, answer: "A", ...extra });
  const qs = [g("t1", "thyroid"), g("t2", "thyroid"), g("a1", "adrenal"), g("l1", "lipid"), g("t3", "thyroid", { answer_status: "draft" }), g("d1", "dm", { answer_status: "draft" })];
  const res = { t1: 1, t2: 0, a1: 1, t3: 0, d1: 1 };
  const out = Q.groupStats(qs, res, {}, (q) => q.topic);
  assert.deepStrictEqual(out.map((x) => x.key), ["thyroid", "adrenal", "lipid"]);
  assert.deepStrictEqual(out[0], { key: "thyroid", total: 2, done: 2, ok: 1, pct: 50 });
  assert.strictEqual(out[1].pct, 100); assert.strictEqual(out[2].pct, null); assert.strictEqual(out[2].done, 0);
});
t("groupStats: partial KF score averages", () => {
  const out = Q.groupStats([{ id: "k1", type: "KF", topic: "x", items: [] }], { k1: 0.5 }, {}, (q) => q.topic);
  assert.deepStrictEqual(out, [{ key: "x", total: 1, done: 1, ok: 0, pct: 50 }]);
});
const mk = (o) => ({ rounds: {}, marks: { flag: {}, notes: {}, setNotes: {}, keyOverride: {}, reported: {} }, mixes: {}, ts: {}, ...o });
t("merge: newer delete beats older add (flag, key, note, mix)", () => {
  const a = mk({ marks: { flag: {}, keyOverride: {}, notes: {}, setNotes: {}, reported: {} }, mixes: {}, ts: { "flag:q1": 20, "keyOverride:q1": 20, "notes:q1": 20, "mixes:m1": 20 } });
  const b = mk({ marks: { flag: { q1: true }, keyOverride: { q1: "B" }, notes: { q1: { t: 10, text: "x" } }, setNotes: {}, reported: {} }, mixes: { m1: { qids: [] } }, ts: { "flag:q1": 10, "keyOverride:q1": 10, "notes:q1": 10, "mixes:m1": 10 } });
  for (const m of [Q.mergeProgress(a, b), Q.mergeProgress(b, a)]) {
    assert.ok(!m.marks.flag.q1 && !m.marks.keyOverride.q1 && !m.marks.notes.q1 && !m.mixes.m1);
    assert.strictEqual(m.ts["flag:q1"], 20);
  }
});
t("merge: newer add beats older delete", () => {
  const a = mk({ ts: { "flag:q1": 10 } });
  const b = mk({ marks: { flag: { q1: 30 }, keyOverride: { q1: "C" }, notes: {}, setNotes: {}, reported: {} }, ts: { "flag:q1": 30, "keyOverride:q1": 30 } });
  const m = Q.mergeProgress(a, b);
  assert.ok(m.marks.flag.q1); assert.strictEqual(m.marks.keyOverride.q1, "C");
});
t("merge: cleared history drops older rounds, keeps newer", () => {
  const a = mk({ ts: { "clear:X/s": 15 } });
  const b = mk({ rounds: { "X/s": [{ id: "r1", started: 10, chk: {}, qids: [] }, { id: "r2", started: 20, chk: {}, qids: [] }] } });
  for (const m of [Q.mergeProgress(a, b), Q.mergeProgress(b, a)]) assert.deepStrictEqual(m.rounds["X/s"].map((r) => r.id), ["r2"]);
});
t("merge: no times (old data) keeps union", () => {
  const m = Q.mergeProgress(mk({ marks: { flag: { q1: true }, keyOverride: {}, notes: {}, setNotes: {}, reported: {} } }), mk({ marks: { flag: { q2: true }, keyOverride: {}, notes: {}, setNotes: {}, reported: {} } }));
  assert.ok(m.marks.flag.q1 && m.marks.flag.q2);
});
t("touch records the time of a change", () => {
  const p = mk(); Q.touch(p, "flag", "q1", 123); assert.strictEqual(p.ts["flag:q1"], 123);
  const p2 = {}; Q.touch(p2, "clear", "X/s"); assert.ok(p2.ts["clear:X/s"] > 0);
});
const DAY = 864e5, day0 = (t) => { const d = new Date(t); d.setHours(0, 0, 0, 0); return d.getTime(); };
t("review: wrong → due tomorrow; 3 right on time → 3 days, 7 days, out", () => {
  const p = {}, now = Date.UTC(2026, 10, 7, 10);
  Q.reviewUpdate(p, mcq, 0, now, {});
  assert.deepStrictEqual([p.review[mcq.id].step, p.review[mcq.id].due], [0, day0(now) + DAY]);
  let t1 = p.review[mcq.id].due + 3600e3;
  Q.reviewUpdate(p, mcq, 1, t1, {}); assert.deepStrictEqual([p.review[mcq.id].step, p.review[mcq.id].due], [1, day0(t1) + 3 * DAY]);
  t1 = p.review[mcq.id].due; Q.reviewUpdate(p, mcq, 1, t1, {}); assert.deepStrictEqual([p.review[mcq.id].step, p.review[mcq.id].due], [2, day0(t1) + 7 * DAY]);
  t1 = p.review[mcq.id].due; Q.reviewUpdate(p, mcq, 1, t1, {}); assert.ok(!(mcq.id in p.review));
  assert.ok(p.ts["review:" + mcq.id] > 0);
});
t("review: right before due does nothing; wrong restarts", () => {
  const p = {}, now = Date.UTC(2026, 10, 7, 10);
  Q.reviewUpdate(p, mcq, 0, now, {}); const before = JSON.stringify(p.review);
  Q.reviewUpdate(p, mcq, 1, now + 3600e3, {}); assert.strictEqual(JSON.stringify(p.review), before);
  const t1 = p.review[mcq.id].due; Q.reviewUpdate(p, mcq, 1, t1, {}); Q.reviewUpdate(p, mcq, 0.5, t1 + 1, {});
  assert.strictEqual(p.review[mcq.id].step, 0);
  assert.deepStrictEqual(Q.reviewDue(p, [mcq.id, "nope"], t1 + 1), []);
  assert.deepStrictEqual(Q.reviewDue(p, [mcq.id, "nope"], p.review[mcq.id].due), [mcq.id]);
});
t("review: uncounted never queued; right answer outside queue ignored; flag adds once", () => {
  const p = {}, now = Date.UTC(2026, 10, 7, 10);
  Q.reviewUpdate(p, dr, 0, now, {}); Q.reviewUpdate(p, mcq, 1, now, {});
  assert.deepStrictEqual(p.review || {}, {});
  Q.reviewAdd(p, mcq, now, {}); const e = p.review[mcq.id]; Q.reviewAdd(p, mcq, now + DAY, {}); assert.strictEqual(p.review[mcq.id], e);
  assert.strictEqual(e.step, 0); assert.strictEqual(e.due, day0(now) + DAY);
  Q.reviewAdd(p, dr, now, {}); assert.ok(!(dr.id in p.review), "flagged draft never queued");
});
t("review: merge keeps the newer change, including leaving the queue", () => {
  const a = { review: { q1: { step: 2, due: 50, t: 40 } }, ts: { "review:q1": 40 } };
  const b = { review: {}, ts: { "review:q1": 60 } };
  for (const m of [Q.mergeProgress(a, b), Q.mergeProgress(b, a)]) assert.ok(!("q1" in m.review));
  const c = { review: { q2: { step: 0, due: 30, t: 1 } } }, d = { review: { q2: { step: 1, due: 90, t: 1 } } };
  assert.strictEqual(Q.mergeProgress(c, d).review.q2.due, 30);
  assert.strictEqual(Q.mergeProgress(d, c).review.q2.due, 30);
});
t("disputed: no other cohort → source key, counted", () => {
  const q = { id: "D", type: "MCQ", options: { A: "a", B: "b" }, answer: "A", answer_status: "disputed", ai_answer: "B" };
  assert.strictEqual(Q.keyOf(q, {}), "A"); assert.ok(Q.counts(q, {}));
  assert.strictEqual(Q.qScore(q, { ans: { D: "B" } }, {}), 0);
});
t("disputed: other cohorts decide, tie → source", () => {
  const q = { id: "D", type: "MCQ", options: { A: "a", B: "b" }, answer: "A", ai_answer: "B", same_side: { x: "ai", y: "ai", z: "source" } };
  assert.strictEqual(Q.keyOf(q, {}), "B");
  assert.strictEqual(Q.keyOf(Object.assign({}, q, { same_side: { x: "ai", z: "source" } }), {}), "A");
});
t("disputed: the person's pick wins", () => {
  const q = { id: "D", type: "MCQ", options: { A: "a", B: "b" }, answer: "A", ai_answer: "B" };
  assert.strictEqual(Q.qScore(q, { ans: { D: "B" } }, { D: "B" }), 1);
});
console.log(`\n${pass} ผ่าน`);
