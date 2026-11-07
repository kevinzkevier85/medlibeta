// node _test/apply_topics.test.cjs — tools/apply_topics.cjs on a throwaway block folder
"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { applyTopics } = require("../tools/apply_topics.cjs");

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("✓", name); };
const TOP = [{ id: "thyroid", name: "Thyroid" }, { id: "adrenal", name: "Adrenal & steroids" }];
const q = (n, extra = {}) => ({ id: `X-1-MCQ-00${n}`, block: "X", cohort: 1, n, type: "MCQ", stem: "stem text here", ...extra });

function makeBlock(map, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "topics-"));
  fs.mkdirSync(path.join(dir, "exams"));
  fs.writeFileSync(path.join(dir, "block.json"), JSON.stringify({ id: "X", name: "X", lectures: [], exam_sets: ["1_MCQ"] }, null, 2) + "\n");
  const set = { meta: { set_id: "1_MCQ", block: "X" }, questions: [q(1), q(2), q(3, opts.oldTopic ? { topic: "adrenal" } : {})] };
  fs.writeFileSync(path.join(dir, "exams", "1_MCQ.json"), JSON.stringify(set, null, 1));
  fs.writeFileSync(path.join(dir, "topics.json"), JSON.stringify({ topics: TOP, questions: map }, null, 2));
  return dir;
}
const read = (dir, f) => fs.readFileSync(path.join(dir, f), "utf8");
const snap = (dir) => [read(dir, "block.json"), read(dir, "exams/1_MCQ.json")];

t("writes topics to block.json and topic to tagged questions", () => {
  const dir = makeBlock({ "X-1-MCQ-001": "thyroid", "X-1-MCQ-002": "adrenal" });
  const r = applyTopics(dir);
  assert.strictEqual(r.tagged, 2); assert.deepStrictEqual(r.untagged, ["X-1-MCQ-003"]);
  assert.deepStrictEqual(JSON.parse(read(dir, "block.json")).topics, TOP);
  const qs = JSON.parse(read(dir, "exams/1_MCQ.json")).questions;
  assert.strictEqual(qs[0].topic, "thyroid"); assert.strictEqual(qs[1].topic, "adrenal");
  assert.deepStrictEqual(Object.keys(qs[0]).slice(0, 6), ["id", "block", "cohort", "n", "type", "topic"]);
});
t("question left out of the map loses an old topic", () => {
  const dir = makeBlock({ "X-1-MCQ-001": "thyroid" }, { oldTopic: true });
  applyTopics(dir);
  assert.ok(!("topic" in JSON.parse(read(dir, "exams/1_MCQ.json")).questions[2]));
});
t("running twice changes nothing; indents kept", () => {
  const dir = makeBlock({ "X-1-MCQ-001": "thyroid" });
  applyTopics(dir); const a = snap(dir); applyTopics(dir);
  assert.deepStrictEqual(snap(dir), a);
  assert.match(a[0], /^\{\n  "id"/); assert.match(a[1], /^\{\n "meta"/); assert.ok(a[0].endsWith("\n")); assert.ok(!a[1].endsWith("\n"));
});
t("unknown topic → throws, nothing written", () => {
  const dir = makeBlock({ "X-1-MCQ-001": "nope" }), before = snap(dir);
  assert.throws(() => applyTopics(dir), (e) => /nope/.test(e.message));
  assert.deepStrictEqual(snap(dir), before);
});
t("question id no longer in the exams → listed as stale, the rest still tagged", () => {
  const dir = makeBlock({ "X-1-MCQ-001": "thyroid", "X-1-MCQ-009": "thyroid" });
  const r = applyTopics(dir);
  assert.deepStrictEqual(r.stale, ["X-1-MCQ-009"]); assert.strictEqual(r.tagged, 1);
  assert.strictEqual(JSON.parse(read(dir, "exams/1_MCQ.json")).questions[0].topic, "thyroid");
});
console.log(`\n${pass} ผ่าน`);
