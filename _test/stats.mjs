// node _test/stats.mjs — the #/stats page, in headless Chromium (Playwright). Fake progress is put in localStorage.
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
const PORT = 8770, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

// fake progress: END 52_MCQ, `nThy` thyroid questions (4 wrong when 6) and 6 adrenal (all right), in `nRounds` full rounds
const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/exams/52_MCQ.json"), "utf8"));
const counted = (q) => Q.counts(q, {});
const thy = set.questions.filter((q) => q.topic === "thyroid" && counted(q)), adr = set.questions.filter((q) => q.topic === "adrenal" && counted(q));
const wrongKey = (q) => Object.keys(q.options).find((k) => k !== q.answer);
function progress({ nThy = 6, nRounds = 2, demo = false } = {}) {
  const rounds = [];
  for (let i = 0; i < nRounds; i++) {
    const r = Q.newRound(set.questions);
    r.started = Date.UTC(2026, 10, 1 + i); r.finished = r.started + 3600e3; r.done = true;
    thy.slice(0, nThy).forEach((q, j) => { r.ans[q.id] = j < 4 ? wrongKey(q) : q.answer; r.chk[q.id] = true; });
    adr.slice(0, 6).forEach((q) => { r.ans[q.id] = q.answer; r.chk[q.id] = true; });
    rounds.push(r);
  }
  const p = { rounds: { "END/52_MCQ": rounds }, marks: {}, read: {}, mixes: {}, prefs: {} };
  if (demo) {
    const d = JSON.parse(fs.readFileSync(path.join(ROOT, "samples/blocks/DEMO/exams/52_MCQ.json"), "utf8"));
    const r = Q.newRound(d.questions); const q = d.questions.find((x) => x.type === "MCQ");
    r.ans[q.id] = q.answer; r.chk[q.id] = true; r.done = true; p.rounds["DEMO/52_MCQ"] = [r];
  }
  return p;
}

const browser = await chromium.launch();
const pages = [];
async function open(prog, demo = false) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  await ctx.addInitScript(([p, d]) => {
    if (p) localStorage.setItem("medlib.progress.v1", p);
    if (d) localStorage.setItem("medlib.user.v1", JSON.stringify({ settings: { showSample: true }, questions: [] }));
  }, [prog ? JSON.stringify(prog) : null, demo]);
  const page = await ctx.newPage(); page.errors = []; page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(BASE + "#/stats");
  await page.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  await page.waitForSelector("#stats");
  pages.push(page);
  return page;
}

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };
assert.ok(thy.length >= 6 && adr.length >= 6, "test data needs 6 thyroid + 6 adrenal questions in END 52_MCQ");

await t("no progress → ยังไม่มีข้อมูล, no NaN", async () => {
  const p = await open(null);
  assert.match(await p.textContent("#stats"), /ยังไม่มีข้อมูล/);
  assert.ok(!/NaN/.test(await p.textContent("#main")));
});
await t("weakest topic first, practice button, chart with 2 points", async () => {
  const p = await open(progress());
  const rows = await p.$$eval('[data-blk="END"] tbody tr', (trs) => trs.map((tr) => tr.cells[0].textContent));
  assert.strictEqual(rows[0], "Thyroid");
  assert.strictEqual(await p.$$eval("svg.chart circle", (c) => c.length), 2);
  assert.ok(!/NaN/.test(await p.textContent("#main")));
  await p.click('[data-z="mixtopic"].weakest');
  await p.waitForFunction(() => location.hash.includes("/@"));
  const mix = await p.evaluate(() => Object.values(window.__medlib.PROG.mixes).find((m) => m.title === "Thyroid · ทุกชุด"));
  assert.ok(mix && mix.block === "END");
});
await t("under 5 done in every topic → no weakest button; 1 round → chart hint", async () => {
  const p = await open(progress({ nThy: 3, nRounds: 1 }));
  // adrenal has 6 done but is 100%; thyroid (weaker) has only 3 → the button may only offer a topic with ≥ 5 done
  const w = await p.$('[data-z="mixtopic"].weakest');
  if (w) assert.match(await w.textContent(), /Adrenal/);
  assert.match(await p.textContent("#stats"), /ทำครบ 2 รอบขึ้นไปจะเห็นกราฟ/);
  assert.strictEqual(await p.$("svg.chart"), null);
});
await t("block without topics (DEMO) → score card, no topic table", async () => {
  const p = await open(progress({ demo: true }), true);
  assert.ok(await p.$('[data-blk="DEMO"]'), "DEMO card");
  assert.strictEqual(await p.$('[data-blk="DEMO"] table'), null);
});
await t("broken progress entries and rounds without dates don't break the page", async () => {
  const prog = progress();
  prog.rounds["END/51_MCQ"] = [null, { id: "x" }, { id: "y", done: true, qids: "bad" }];
  prog.rounds["END/50_MCQ"] = "oops";
  const r = prog.rounds["END/52_MCQ"][0]; delete r.started; delete r.finished;
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  await ctx.addInitScript((p) => localStorage.setItem("medlib.progress.v1", p), JSON.stringify(prog));
  const page = await ctx.newPage(); page.errors = []; page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(BASE + "#/stats");
  await page.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  await page.waitForSelector("#stats"); pages.push(page);
  assert.ok(await page.$('[data-blk="END"]'), "END card still shows");
  assert.ok(!/Invalid Date/.test(await page.content()));
});
await t("no page errors", async () => { for (const p of pages) assert.deepStrictEqual(p.errors, []); });

await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
