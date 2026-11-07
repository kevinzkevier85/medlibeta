// node _test/topics.mjs — the "หัวข้อ" tab on a block page, in headless Chromium (Playwright).
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8768, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const END = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/END/block.json"), "utf8"));
const browser = await chromium.launch();
async function open(hash, { demo = false, allDraft = null } = {}) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage(); page.errors = []; page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => page.errors.push(e.message));
  if (demo) await ctx.addInitScript(() => localStorage.setItem("medlib.user.v1", JSON.stringify({ settings: { showSample: true }, questions: [] })));
  if (allDraft) await page.route("**/data/blocks/END/exams/*.json", async (r) => {
    const j = await (await r.fetch()).json();
    j.questions.forEach((q) => { if (q.topic === allDraft) q.answer_status = "draft"; });
    r.fulfill({ json: j });
  });
  await page.goto(BASE + hash);
  await page.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  return page;
}
const topicTab = (p) => p.$('[data-z="etab"][data-t="topic"]');

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };
const pages = [];

await t("END: หัวข้อ tab lists the 7 topics in order, counts add up", async () => {
  const p = await open("#/b/END"); pages.push(p);
  await p.waitForSelector(".etabs");
  assert.strictEqual(await p.textContent('[data-z="etab"][data-t="topic"]'), "หัวข้อ");
  await p.click('[data-z="etab"][data-t="topic"]');
  const cards = await p.$$eval('[data-z="mixtopic"]', (els) => els.map((e) => ({ id: e.dataset.tp, title: e.querySelector("b").textContent, n: parseInt(e.querySelector(".n").textContent, 10) })));
  assert.deepStrictEqual(cards.map((c) => c.id), END.topics.map((x) => x.id));
  assert.deepStrictEqual(cards.map((c) => c.title), END.topics.map((x) => x.name));
  const total = await p.evaluate(() => window.__medlib.APP.blocks.find((b) => b.id === "END").exams.length);
  assert.strictEqual(cards.reduce((a, c) => a + c.n, 0), total);
});
await t("topic card → practice set across all cohorts", async () => {
  const p = pages[0];
  const n = parseInt(await p.textContent('[data-z="mixtopic"][data-tp="thyroid"] .n'), 10);
  await p.click('[data-z="mixtopic"][data-tp="thyroid"]');
  await p.waitForFunction(() => location.hash.includes("/@"));
  const mix = await p.evaluate(() => Object.values(window.__medlib.PROG.mixes).find((m) => m.title === "Thyroid · ทุกชุด"));
  assert.ok(mix, "mix made"); assert.strictEqual(mix.qids.length, n); assert.strictEqual(mix.block, "END");
});
await t("block without topics (DEMO) has no หัวข้อ tab", async () => {
  const p = await open("#/b/DEMO", { demo: true }); pages.push(p);
  await p.waitForSelector(".etabs, .empty");
  assert.strictEqual(await topicTab(p), null);
});
await t("topic where nothing counts says so, no NaN", async () => {
  const p = await open("#/b/END", { allDraft: "general" }); pages.push(p);
  await p.waitForSelector(".etabs"); await p.click('[data-z="etab"][data-t="topic"]');
  const txt = await p.textContent('[data-z="mixtopic"][data-tp="general"]');
  assert.match(txt, /เฉลยทั้งหัวข้อยังไม่ยืนยัน · ไม่นับคะแนน/);
  assert.ok(!/NaN/.test(await p.textContent("#main")));
});
await t("no page errors", async () => { for (const p of pages) assert.deepStrictEqual(p.errors, []); });

await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
