// node _test/validate.test.cjs — topic rules in lib/validate.js
"use strict";
const assert = require("assert");
const V = require("../lib/validate.js");
const block0 = require("../data/blocks/END/block.json");
const set0 = require("../data/blocks/END/exams/52_MCQ.json");

let pass = 0;
const t = (name, fn) => { fn(); pass++; console.log("✓", name); };
const TOP = [{ id: "thyroid", name: "Thyroid" }, { id: "adrenal", name: "Adrenal & steroids" }];
const blk = (topics) => { const b = JSON.parse(JSON.stringify(block0)); if (topics !== undefined) b.topics = topics; else delete b.topics; return b; };
const q0 = () => { const q = JSON.parse(JSON.stringify(set0.questions[0])); delete q.topic; return q; };
const has = (errs, word) => errs.some((m) => m.includes(word));

t("block: no topics is fine", () => assert.deepStrictEqual(V.validateBlock(blk()), []));
t("block: good topics are fine", () => assert.deepStrictEqual(V.validateBlock(blk(TOP)), []));
t("block: bad topics are errors", () => {
  assert.ok(has(V.validateBlock(blk({})), "topics"));
  assert.ok(has(V.validateBlock(blk([...TOP, { id: "thyroid", name: "x" }])), "thyroid"));
  assert.ok(has(V.validateBlock(blk([{ id: "Bad Id", name: "x" }])), "Bad Id"));
  assert.ok(has(V.validateBlock(blk([{ id: "lipid" }])), "lipid"));
});
t("question: topic must be in the block list", () => {
  const b = blk(TOP);
  assert.ok(has(V.validateQuestion({ ...q0(), topic: "nope" }, { block: b }), "topic"));
  assert.deepStrictEqual(V.validateQuestion({ ...q0(), topic: "thyroid" }, { block: b }), []);
  assert.deepStrictEqual(V.validateQuestion(q0(), { block: b }), []);   // added by hand in the web: no topic is fine
});
t("exam set: a question without topic does not fail the set (the site would hide the whole set)", () => {
  const set = { meta: set0.meta, questions: [q0()] };
  assert.deepStrictEqual(V.validateExamSet(set, blk(TOP)), []);
  assert.deepStrictEqual(V.untagged(set, blk(TOP)), [set.questions[0].id]);
  assert.deepStrictEqual(V.untagged(set, blk()), []);
  assert.deepStrictEqual(V.validateExamSet(set, blk()), []);
  set.questions[0].topic = "adrenal";
  assert.deepStrictEqual(V.validateExamSet(set, blk(TOP)), []);
  assert.deepStrictEqual(V.untagged(set, blk(TOP)), []);
});
console.log(`\n${pass} ผ่าน`);
