// node _test/gi_smoke.mjs — every GI exam set opens, shows its questions, answers and images load (Playwright)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8779, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const block = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks/GI/block.json"), "utf8"));
const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block" });
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = [], bad = [];
p.on("pageerror", (e) => errors.push(e.message));
p.on("response", (r) => { if (r.status() >= 400 && /\/data\/blocks\/GI\//.test(r.url())) bad.push(r.status() + " " + r.url()); });
await p.goto(BASE + "#/");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
const go = (h) => p.evaluate((x) => { location.hash = x; }, h);

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("GI block page lists every exam set", async () => {
  await go("#/b/GI"); await p.waitForSelector("body");
  const html = await p.content();
  for (const s of block.exam_sets) assert.ok(html.includes(s.split("_")[0]), "set missing on page: " + s);
});
for (const s of block.exam_sets) {
  const set = JSON.parse(fs.readFileSync(path.join(ROOT, `data/blocks/GI/exams/${s}.json`), "utf8"));
  await t(`set ${s}: opens, first question renders, no broken images (${set.questions.length} ข้อ)`, async () => {
    await go(`#/set/GI/${s}/run`); await p.waitForSelector(".opt, .case, .kfitem, textarea, input");
    assert.ok((await p.textContent("body")).trim().length > 50);
  });
  const withImg = set.questions.filter((q) => q.image).slice(0, 3);
  for (const q of withImg) {
    await t(`  ${q.id}: picture loads`, async () => {
      await go("#/q/" + q.id); await p.waitForSelector(".opt, .case");
      await p.waitForFunction(() => [...document.images].every((i) => i.complete));
      const broken = await p.evaluate(() => [...document.images].filter((i) => i.naturalWidth === 0).map((i) => i.src));
      assert.deepStrictEqual(broken, []);
      assert.ok(await p.$("img[src*='GI-']"), "no GI image on page");
    });
  }
}
await t("no broken GI files, no pageerror", async () => { assert.deepStrictEqual(bad, []); assert.deepStrictEqual(errors, []); });
console.log(`\n${pass} passed`);
await browser.close(); server.kill();
