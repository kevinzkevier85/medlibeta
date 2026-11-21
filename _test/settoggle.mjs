// node _test/settoggle.mjs — Settings › เปิด/ปิดชุดข้อสอบ: switch one set off/on, block-wide buttons (Playwright)
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8776, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block" });
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "#/");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
const go = async (h) => { await p.evaluate((x) => { location.hash = x; }, h); await sleep(150); };
const hidden = () => p.evaluate(() => (JSON.parse(localStorage.getItem("medlib.user.v1") || "{}").settings || {}).hiddenSets || []);
const cardText = async () => (await p.textContent("#main")) || "";

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("settings shows a switch for END 52 MCQ, on by default", async () => {
  await go("#/settings/sets-END");
  assert.ok(await p.$eval('details[data-blk="END"]', (d) => d.open), "END block opened from #/settings/sets-END");
  assert.strictEqual(await p.isChecked('[data-setoff="END/52_MCQ"]'), true);
});
await t("switch off → saved, counter updates, page not redrawn", async () => {
  await p.click('label.switch:has([data-setoff="END/52_MCQ"])');
  assert.deepStrictEqual(await hidden(), ["END/52_MCQ"]);
  assert.match(await p.textContent('[data-setcount="END"]'), /เปิด 26\/27 ชุด/);
  assert.ok(await p.$eval('details[data-blk="END"]', (d) => d.open), "details still open");
});
await t("block page: set 52 MCQ card shows ปิดไว้, random practice excludes it", async () => {
  await go("#/b/END");
  assert.match(await cardText(), /ปิดไว้/);
  await p.click('[data-z="etab"][data-t="MCQ"]').catch(() => {});
  await p.click('[data-z="mixrand"]'); await sleep(150);
  const ids = await p.evaluate(() => Object.values(window.__medlib.PROG.mixes).flatMap((m) => m.qids));
  assert.ok(ids.length > 0, "a random mix was made");
  assert.strictEqual(ids.filter((id) => id.startsWith("END-52-MCQ-")).length, 0, "no question from the switched-off set");
});
await t("set page still opens and says it is switched off", async () => {
  await go("#/set/END/52_MCQ");
  assert.match(await cardText(), /ชุดนี้ปิดไว้ในตั้งค่า/);
});
await t("ปิดทั้งหมด / เปิดทั้งหมด for a block", async () => {
  await go("#/settings/sets-END");
  await p.click('details[data-blk="END"] [data-act="setsall"][data-on="0"]');
  assert.strictEqual((await hidden()).filter((k) => k.startsWith("END/")).length, 27);
  assert.strictEqual(await p.isChecked('[data-setoff="END/45_KF"]'), false);
  await p.click('details[data-blk="END"] [data-act="setsall"][data-on="1"]');
  assert.deepStrictEqual(await hidden(), []);
  const raw = await p.evaluate(() => JSON.parse(localStorage.getItem("medlib.user.v1") || "{}").settings || {});
  assert.ok(!("hiddenSets" in raw), "back to the shared default → no personal value kept");
});
await t("no page errors", async () => { assert.deepStrictEqual(errors, []); });

console.log(`${pass} ผ่าน`);
await browser.close(); process.exit(0);
