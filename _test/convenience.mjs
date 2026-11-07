// node _test/convenience.mjs — resume button, swipe between questions, pinch-zoom pictures (phone emulation, Playwright)
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8773, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], serviceWorkers: "block" });
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "#/");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
const go = (h) => p.evaluate((x) => { location.hash = x; }, h);
// fire a touch gesture: points = [[x,y],…] per finger for start, then end positions
const touch = (sel, start, end) => p.evaluate(([sel, start, end]) => {
  const el = document.querySelector(sel);
  const mk = (pts) => pts.map(([x, y], i) => new Touch({ identifier: i, target: el, clientX: x, clientY: y }));
  el.dispatchEvent(new TouchEvent("touchstart", { bubbles: true, cancelable: true, touches: mk(start), targetTouches: mk(start), changedTouches: mk(start) }));
  el.dispatchEvent(new TouchEvent("touchmove", { bubbles: true, cancelable: true, touches: mk(end), targetTouches: mk(end), changedTouches: mk(end) }));
  el.dispatchEvent(new TouchEvent("touchend", { bubbles: true, cancelable: true, touches: [], targetTouches: [], changedTouches: mk(end) }));
}, [sel, start, end]);

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("no round in progress → no resume button", async () => {
  await p.waitForSelector(".grid"); assert.strictEqual(await p.$("#resume"), null);
});
await t("swipe left → next question; swipe right → back; vertical swipe does nothing", async () => {
  await go("#/set/END/52_MCQ"); await p.click('input[name="mode"][value="practice"]'); await p.click('[data-z="start"]');
  await p.waitForSelector(".qcard");
  await touch(".qcard", [[300, 400]], [[120, 410]]); await p.waitForFunction(() => location.hash.endsWith("/run/2"));
  await touch(".qcard", [[300, 400]], [[120, 410]]); await p.waitForFunction(() => location.hash.endsWith("/run/3"));
  await touch(".qcard", [[100, 400]], [[300, 395]]); await p.waitForFunction(() => location.hash.endsWith("/run/2"));
  await touch(".qcard", [[200, 600]], [[230, 200]]); await sleep(300);
  assert.ok((await p.evaluate(() => location.hash)).endsWith("/run/2"));
});
await t("home: ทำต่อจากล่าสุด goes back to the question you were on", async () => {
  await go("#/"); await p.waitForSelector("#resume");
  assert.match(await p.textContent("#resume"), /ทำต่อจากล่าสุด/);
  assert.match(await p.textContent("#resume"), /52/);
  await p.click("#resume"); await p.waitForFunction(() => location.hash.endsWith("/run/2"));
});
await t("zoomed picture: two-finger pinch scales it, closing resets", async () => {
  await go("#/q/END-51-MCQ-001"); await p.waitForSelector("img[data-zoom]");
  await p.click("img[data-zoom]"); await p.waitForSelector("img.zoom");
  await touch("img.zoom", [[150, 400], [250, 400]], [[100, 400], [300, 400]]);
  const tf = await p.evaluate(() => document.querySelector("img.zoom").style.transform);
  assert.match(tf, /scale\((1\.[5-9]|2)/, tf);
  await p.evaluate(() => document.querySelector("img.zoom").click());
  assert.strictEqual(await p.evaluate(() => document.querySelector("img[data-zoom]").style.transform), "");
});
await t("no page errors", async () => assert.deepStrictEqual(errors, []));
await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
