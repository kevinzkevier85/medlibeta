// node _test/home.mjs — home page grouped by year, block pop-up with MCQ / KF / OSPE / Lecture tabs (Playwright)
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8783, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const browser = await chromium.launch();
let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

for (const [label, opts] of [["desktop", { viewport: { width: 1200, height: 900 } }], ["phone", devices["iPhone 13"]]]) {
  const ctx = await browser.newContext({ ...opts, serviceWorkers: "block" });
  const p = await ctx.newPage(); p.setDefaultTimeout(10000);
  const errors = []; p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + "#/");
  await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  await p.waitForSelector(".yeargrp");

  await t(`${label}: blocks grouped by year, in year order, every block once`, async () => {
    const heads = await p.$$eval(".yeargrp > h3", (h) => h.map((x) => x.firstChild.textContent.trim()));
    assert.ok(heads.length >= 2 && heads.every((h) => /^ปี \d$|^อื่น ๆ$/.test(h)), heads.join("|"));
    const ys = heads.filter((h) => h.startsWith("ปี")).map((h) => Number(h.slice(3)));
    assert.deepStrictEqual(ys, [...ys].sort((a, b) => a - b));
    const ids = await p.$$eval(".yeargrp a.card", (c) => c.map((x) => x.dataset.bmodal));
    const all = await p.evaluate(() => window.__medlib.APP.blocks.filter((b) => !b._sample).map((b) => b.id));
    assert.deepStrictEqual([...ids].sort(), [...all].sort());
  });
  await t(`${label}: tap a block → pop-up with MCQ / KF / OSPE / Lecture, URL unchanged`, async () => {
    await p.click('a.card[data-bmodal="END"]');
    await p.waitForSelector("#bmodal .bmsheet");
    assert.strictEqual(await p.evaluate(() => location.hash), "#/");
    const tabs = await p.$$eval("#bmodal .tab", (x) => x.map((b) => b.dataset.t));
    assert.deepStrictEqual(tabs, ["MCQ", "KF", "OSPE", "lec"]);
    assert.ok((await p.$$("#bmodal .pcard")).length >= 5, "MCQ cohort cards");
    await p.click('#bmodal [data-t="lec"]');
    assert.ok((await p.$$("#bmodal .bmrow")).length >= 10, "END lectures listed");
  });
  await t(`${label}: Escape / backdrop close; picking a cohort opens the set and closes the pop-up`, async () => {
    await p.keyboard.press("Escape"); assert.strictEqual(await p.$("#bmodal"), null);
    await p.click('a.card[data-bmodal="GI"]'); await p.waitForSelector("#bmodal");
    assert.match(await p.textContent("#bmodal .bmbody"), /ชุด/);
    await p.click('#bmodal [data-t="lec"]');
    assert.match(await p.textContent("#bmodal .bmbody"), /ยังไม่มี lecture/);
    await p.click('#bmodal [data-t="KF"]');
    await p.click("#bmodal a.pcard >> nth=0"); await sleep(200);
    assert.match(await p.evaluate(() => location.hash), /^#\/set\/GI\/\d+_KF$/);
    assert.strictEqual(await p.$("#bmodal"), null);
    assert.ok(!(await p.evaluate(() => document.body.classList.contains("modal-open"))), "page scroll unlocked");
  });
  await t(`${label}: no page errors`, async () => { assert.deepStrictEqual(errors, []); });
  await ctx.close();
}
console.log(`${pass} ผ่าน`);
await browser.close(); process.exit(0);
