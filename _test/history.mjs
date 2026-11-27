// node _test/history.mjs — history page (one card per round), redo any round, look back at a round's answers, delete one round
// (headless Chromium via Playwright). Fake progress is put in localStorage once, before the first load.
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const Q = require("../lib/quizcore.js");
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8778, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

// two finished full rounds of END 52_MCQ: the OLD one has 3 wrong + 2 right, the NEW one 5 right (all on counted questions)
const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/exams/52_MCQ.json"), "utf8"));
const qs = set.questions.filter((q) => Q.counts(q, {})).slice(0, 5);
const wrongKey = (q) => Object.keys(q.options).find((k) => k !== q.answer);
const mk = (day, wrong) => {
  const r = Q.newRound(set.questions); r.id = "r" + day; r.started = Date.UTC(2026, 10, day, 3); r.finished = r.started + 3600e3; r.done = true;
  qs.forEach((q, j) => { r.ans[q.id] = j < wrong ? wrongKey(q) : q.answer; r.chk[q.id] = true; });
  return r;
};
const prog = { rounds: { "END/52_MCQ": [mk(1, 3), mk(5, 0)] }, marks: {}, read: {}, mixes: {}, prefs: {} };
const total = set.questions.length;

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block" });
await ctx.addInitScript((p) => { if (!sessionStorage.getItem("seeded")) { localStorage.setItem("medlib.progress.v1", p); sessionStorage.setItem("seeded", "1"); } }, JSON.stringify(prog));
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "#/set/END/52_MCQ/hist");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
await p.waitForSelector(".rcard");
const go = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await sleep(150); };
const rounds = () => p.evaluate(() => window.__medlib.PROG.rounds["END/52_MCQ"]);

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("history: one card per round, newest first, counts not %", async () => {
  const cards = await p.$$eval(".rcard", (cs) => cs.map((c) => c.dataset.round));
  assert.deepStrictEqual(cards, ["r5", "r1"]);
  const old = await p.textContent('.rcard[data-round="r1"] .rnums');
  assert.match(old, /2\s*ถูก/); assert.match(old, /3\s*ผิด/); assert.match(old, new RegExp(`${total - 5}\\s*ไม่ได้ทำ`));
  assert.ok(!/%/.test(await p.textContent(".rlist")), "no percent on the cards");
  assert.strictEqual(await p.$$eval("svg.chart.bars > g", (g) => g.length), 2);
});
await t("look back at the OLD round: its own answers, filter to the ones not right", async () => {
  await p.click('.rcard[data-round="r1"] a[href*="/rev/r1/"]'); await sleep(150);
  assert.match(await p.evaluate(() => location.hash), /\/rev\/r1\/1$/);
  assert.strictEqual(await p.$eval(".opt.wrong", (b) => b.dataset.opt), wrongKey(qs[0]));
  await p.click('[data-z="revwrong"]'); await sleep(100);
  assert.strictEqual(await p.$$eval(".qrow .qc", (b) => b.length), total - 2, "3 wrong + every not-done question");
  await p.keyboard.press("ArrowRight"); await sleep(150);
  assert.match(await p.evaluate(() => location.hash), /\/rev\/r1\/2$/);
  await p.click('[data-z="revall"]');
});
await t("redo the OLD round's wrong + not-done questions (not only the latest round)", async () => {
  await go("#/set/END/52_MCQ/hist");
  await p.click('.rcard[data-round="r1"] [data-z="retryround"]'); await sleep(200);
  assert.match(await p.evaluate(() => location.hash), /\/run\/1$/);
  const rs = await rounds(), r = rs[rs.length - 1];
  assert.strictEqual(r.kind, "retry"); assert.strictEqual(r.parent, "r1"); assert.strictEqual(r.qids.length, total - 2);
  assert.ok(!r.qids.includes(qs[3].id) && !r.qids.includes(qs[4].id), "right answers left out");
});
await t("the retry round sits under the round it came from", async () => {
  await go("#/set/END/52_MCQ/hist");
  const order = await p.$$eval(".rcard", (cs) => cs.map((c) => c.dataset.round + (c.classList.contains("child") ? "<" : "")));
  assert.strictEqual(order.length, 3); assert.deepStrictEqual(order.slice(0, 2), ["r5", "r1"]); assert.ok(order[2].endsWith("<"), "retry card right under r1");
  assert.match(await p.textContent(".rcard.child"), /ทำต่อ/);
});
await t("delete one round: confirm twice, undo brings it back, delete again keeps a tombstone", async () => {
  const del = '.rcard[data-round="r5"] [data-z="delround"]';
  await p.click(del); assert.strictEqual((await rounds()).length, 3, "first click only arms");
  await p.click(del); await sleep(150);
  assert.ok(!(await rounds()).some((r) => r.id === "r5"));
  await p.click(".toastbar button");
  await sleep(150);
  assert.ok((await rounds()).some((r) => r.id === "r5"), "undo");
  await p.click(del); await p.click(del); await sleep(150);
  assert.ok(!(await rounds()).some((r) => r.id === "r5"));
  assert.ok(await p.evaluate(() => !!window.__medlib.PROG.ts["delround:r5"]), "tombstone for sync");
});
await t("summary: counts, answer grid opens that round's answer", async () => {
  await go("#/set/END/52_MCQ/sum/r1");
  assert.match(await p.textContent(".scorebox"), /3\s*ผิด/);
  await p.click(".qrow.grid a.qc"); await sleep(150);
  assert.match(await p.evaluate(() => location.hash), /\/rev\/r1\/1$/);
});
await t("no page errors", async () => { assert.deepStrictEqual(errors, []); });

console.log(`${pass} ผ่าน`);
await browser.close(); process.exit(0);
