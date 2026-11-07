// node _test/review.mjs — "ทบทวนวันนี้" on the home page, in headless Chromium (Playwright).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8772, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/exams/52_MCQ.json"), "utf8"));
const okQ = set.questions.filter((q) => q.answer_status !== "draft" && q.answer_status !== "disputed");
const browser = await chromium.launch();
const pages = [];
async function open(hash, prog) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  if (prog) await ctx.addInitScript((p) => localStorage.setItem("medlib.progress.v1", p), JSON.stringify(prog));
  const page = await ctx.newPage(); page.errors = []; page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.goto(BASE + hash);
  await page.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  pages.push(page); return page;
}
let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("empty queue → no review box", async () => {
  const p = await open("#/"); await p.waitForSelector(".grid");
  assert.strictEqual(await p.$("#review"), null);
});
await t("wrong answer in practice → queued; home says in queue 1", async () => {
  const p = await open("#/set/END/52_MCQ");
  await p.click('input[name="mode"][value="practice"]'); await p.click('[data-z="start"]');
  const q = await p.evaluate(() => { const r = Object.values(window.__medlib.PROG.rounds)[0].slice(-1)[0]; return r.qids[0]; });
  const wrong = Object.keys(set.questions.find((x) => x.id === q).options).find((k) => k !== set.questions.find((x) => x.id === q).answer);
  await p.click(`.opt[data-opt="${wrong}"]`);
  assert.ok(await p.evaluate((id) => !!window.__medlib.PROG.review[id], q));
  await p.evaluate(() => { location.hash = "#/"; }); await p.waitForSelector("#review");
  assert.match(await p.textContent("#review"), /ยังไม่มีข้อครบกำหนดวันนี้ · ในคิว 1 ข้อ/);
});
await t("2 due in END (+1 gone id) → button shows 2, opens a 2-question set", async () => {
  const due = Date.now() - 1000, ids = okQ.slice(0, 2).map((q) => q.id);
  const review = Object.fromEntries([...ids, "END-99-MCQ-001"].map((id) => [id, { step: 0, due, t: due }]));
  const p = await open("#/", { rounds: {}, marks: {}, read: {}, mixes: {}, prefs: {}, review });
  await p.waitForSelector('#review [data-z="review"][data-b="END"]');
  assert.match(await p.textContent('#review [data-z="review"][data-b="END"]'), /2/);
  await p.click('#review [data-z="review"][data-b="END"]');
  await p.waitForFunction(() => location.hash.includes("/@"));
  const mix = await p.evaluate(() => Object.values(window.__medlib.PROG.mixes)[0]);
  assert.deepStrictEqual(mix.qids.sort(), ids.sort());
});
await t("no page errors", async () => { for (const p of pages) assert.deepStrictEqual(p.errors, []); });
await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
