// node _test/lecread.mjs — "which lecture to read" after a wrong answer (Playwright)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8774, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/exams/52_MCQ.json"), "utf8"));
const block = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/block.json"), "utf8"));
const ok = set.questions.filter((q) => !["draft", "disputed"].includes(q.answer_status) && q.refs.some((r) => r.lecture));
const lecTitle = (id) => block.lectures.find((l) => l.id === id).title;
const wrongKey = (q) => Object.keys(q.options).find((k) => k !== q.answer);

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block" });
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "#/");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
const go = (h) => p.evaluate((x) => { location.hash = x; }, h);

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("wrong answer → 'ควรอ่าน' with the lecture, linking to it", async () => {
  const q = ok[0]; await go("#/q/" + q.id);
  await p.click(`.opt[data-opt="${wrongKey(q)}"]`); await p.waitForSelector(".readfirst");
  const L = q.refs.find((r) => r.lecture).lecture;
  assert.match(await p.textContent(".readfirst"), /ควรอ่าน/);
  assert.ok((await p.textContent(".readfirst")).includes(lecTitle(L)));
  assert.match(await p.getAttribute(".readfirst a", "href"), new RegExp(`#/lec/END/${L}`));
  assert.ok(!/undefined/.test(await p.textContent(".explain")));
});
await t("right answer → no 'ควรอ่าน' banner", async () => {
  const q = ok[1]; await go("#/q/" + q.id);
  await p.click(`.opt[data-opt="${q.answer}"]`); await p.waitForSelector(".explain");
  assert.strictEqual(await p.$(".readfirst"), null);
});
await t("summary lists the lectures to read first", async () => {
  await go("#/set/END/52_MCQ"); await p.click('input[name="mode"][value="practice"]'); await p.click('[data-z="start"]');
  const first = await p.evaluate(() => { const r = Object.values(window.__medlib.PROG.rounds["END/52_MCQ"]).filter((x) => !x.done).pop(); return r.qids[0]; });
  const q = set.questions.find((x) => x.id === first);
  await p.click(`.opt[data-opt="${wrongKey(q)}"]`);
  await p.click('[data-z="finish"]'); await p.click('[data-z="finish"]');
  await p.waitForFunction(() => location.hash.includes("/sum/")); await p.waitForSelector(".scorebox");
  const txt = await p.textContent("#main");
  if (ok.some((x) => x.id === first)) {
    assert.match(txt, /Lecture ที่ควรอ่านก่อน/);
    assert.ok(txt.includes(lecTitle(q.refs.find((r) => r.lecture).lecture)));
  }
});
await t("stats page: Lecture ที่ผิดบ่อย", async () => {
  await go("#/stats"); await p.waitForSelector("#stats");
  assert.match(await p.textContent('[data-blk="END"]'), /Lecture ที่ผิดบ่อย/);
});
await t("lecture pages of END open with page-less refs (reader, question list, plan, lecture tab)", async () => {
  for (const h of ["#/lec/END/L6", "#/refs/END/L6", "#/lec/END/plan", "#/set/END/52_MCQ/plan"]) { await go(h); await sleep(600); }
  await go("#/b/END"); await p.waitForSelector('[data-z="etab"][data-t="lec"]');
  await p.click('[data-z="etab"][data-t="lec"]'); await p.click('[data-z="mixlec"]');
  await p.waitForFunction(() => location.hash.includes("/@"));
  assert.deepStrictEqual(errors, []);
});
await t("no page errors", async () => assert.deepStrictEqual(errors, []));
await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
