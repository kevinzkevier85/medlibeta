// node _test/report.mjs — "แจ้งปัญหาข้อนี้" (pick what is wrong first) and the floating "ติดต่อ" pop-up (Playwright).
// The worker is faked by intercepting POST <proxy>/report, so nothing is sent anywhere.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8781, BASE = `http://localhost:${PORT}/`;
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn(process.platform === "win32" ? "python" : "python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const browser = await chromium.launch();
const ctx = await browser.newContext({ serviceWorkers: "block" });
const sent = [];
await ctx.route("**/report", async (route) => { sent.push(JSON.parse(route.request().postData())); await route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true, number: 42 }), headers: { "Access-Control-Allow-Origin": "*" } }); });
const p = await ctx.newPage(); p.setDefaultTimeout(10000);
const errors = []; p.on("pageerror", (e) => errors.push(e.message));
await p.goto(BASE + "#/q/END-52-MCQ-005");
await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0 && window.__medlib.APP.config.drive_proxy_url);
await p.click(".opt >> nth=0"); await p.waitForSelector(".report");

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("report: categories first, which-answer part only for เฉลยผิด", async () => {
  await p.click(".report summary");
  assert.strictEqual(await p.$$eval("[data-rep-cat]", (x) => x.length), 6);
  assert.strictEqual(await p.isVisible(".repkey [data-rep-key]"), false);
  await p.click('label.chip:has([data-rep-cat="key"])');
  assert.strictEqual(await p.isVisible(".repkey [data-rep-key]"), true);
  assert.match(await p.getAttribute("[data-rep-reason]", "placeholder"), /lecture/);
});
await t("report: needs a category, then sends category + answer", async () => {
  await p.click('label.chip:has([data-rep-cat="key"])');   // untick
  await p.fill("[data-rep-reason]", "เฉลยน่าจะเป็น C ตาม lecture");
  await p.click('[data-z="report"]');
  assert.match(await p.textContent("[data-rep-msg]"), /เลือกก่อนว่าอะไรมีปัญหา/);
  await p.click('label.chip:has([data-rep-cat="stem"])'); await p.click('label.chip:has([data-rep-cat="key"])');
  await p.selectOption("[data-rep-key]", "C");
  await p.click('[data-z="report"]'); await sleep(300);
  assert.deepStrictEqual(sent[0].category, ["stem", "key"]); assert.strictEqual(sent[0].override, "C"); assert.strictEqual(sent[0].qid, "END-52-MCQ-005");
});
await t("contact pop-up: open, needs a topic, sends kind contact, shows the issue number", async () => {
  await p.click(".cfab"); await p.waitForSelector("#cpanel");
  await p.fill("#ctext", "ปุ่มทำต่อไม่ทำงาน"); await p.click('[data-act="contactsend"]');
  assert.match(await p.textContent("#cmsg"), /เลือกเรื่องก่อน/);
  await p.click('[data-act="ccat"][data-c="bug"]'); await p.click('[data-act="contactsend"]'); await sleep(300);
  const last = sent[sent.length - 1];
  assert.strictEqual(last.kind, "contact"); assert.deepStrictEqual(last.category, ["bug"]); assert.ok(!last.qid);
  assert.match(await p.textContent("#cpanel"), /#42/);
});
await t("contact pop-up stays open across pages, Escape closes it", async () => {
  await p.evaluate(() => { location.hash = "#/settings"; }); await sleep(200);
  assert.ok(await p.isVisible("#cpanel"));
  await p.keyboard.press("Escape"); await sleep(100);
  assert.strictEqual(await p.$("#cpanel"), null);
  assert.ok(await p.isVisible(".cfab"));
});
await t("no page errors", async () => { assert.deepStrictEqual(errors, []); });

console.log(`${pass} ผ่าน`);
await browser.close(); process.exit(0);
