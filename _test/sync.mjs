// node _test/sync.mjs — progress sync across devices, in headless Chromium (Playwright).
// Starts its own static server on port 8766. The worker is faked with page.route + an in-test KV.
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 8766, BASE = `http://localhost:${PORT}/`, WORKER = "http://worker.test";
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const server = spawn("python3", ["-m", "http.server", String(PORT)], { cwd: ROOT, stdio: "ignore" });
process.on("exit", () => server.kill());
for (let i = 0; i < 50; i++) { try { await fetch(BASE); break; } catch { await sleep(100); } }

const KV = new Map();           // code -> stored body (string)
let mode = "ok", newCount = 0;                // ok | 404 | 500 | down
const log = [];                 // "METHOD /path"
const browser = await chromium.launch();

async function device(withWorker = true) {
  const ctx = await browser.newContext({ serviceWorkers: "block" });
  const page = await ctx.newPage();
  page.errors = [];
  page.on("pageerror", (e) => page.errors.push(e.message));
  await page.route("**/site.json", (r) => r.fulfill({ json: { drive_proxy_url: withWorker ? WORKER + "/" : "", report_url: "", repo: "x/y" } }));
  await page.route(WORKER + "/**", async (r) => {
    const req = r.request(), u = new URL(req.url()), m = req.method();
    const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, PUT", "Access-Control-Allow-Headers": "Content-Type" };
    if (m === "OPTIONS") return r.fulfill({ status: 204, headers: cors });
    log.push(`${m} ${u.pathname}`);
    if (mode === "down") return r.abort("failed");
    if (mode === "slow") await sleep(800);
    if (mode === "500") return r.fulfill({ status: 500, headers: cors, body: "boom" });
    if (u.pathname === "/sync/new" && m === "POST") {
      const code = "a2b3-c4d5-e6f" + "23456789"[newCount++];
      return r.fulfill({ status: 201, headers: cors, json: { code } });
    }
    const code = u.pathname.split("/")[2];
    if (m === "GET") return KV.has(code) && mode !== "404" ? r.fulfill({ headers: cors, contentType: "application/json", body: KV.get(code) }) : r.fulfill({ status: 404, headers: cors, body: "not found" });
    if (m === "PUT") { KV.set(code, req.postData()); return r.fulfill({ headers: cors, json: { ok: true } }); }
    return r.fulfill({ status: 405, headers: cors });
  });
  await page.goto(BASE + "#/settings");
  await page.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  return page;
}
const rounds = (page) => page.evaluate(() => Object.values(window.__medlib.PROG.rounds).reduce((a, l) => a + l.filter((r) => r.done).length, 0));
async function doRound(page) {
  await page.evaluate(() => { location.hash = "#/set/END/52_MCQ"; });
  await page.click('input[name="mode"][value="practice"]'); await page.click('[data-z="start"]');
  await page.click(".opt[data-opt]");
  await page.click('[data-z="finish"]'); await page.click('[data-z="finish"]');
  await page.waitForFunction(() => location.hash.includes("/sum/"));
}
const waitLog = async (s, from = 0) => { for (let i = 0; i < 60; i++) { if (log.slice(from).includes(s)) return true; await sleep(100); } return false; };
const settings = async (page) => { await page.evaluate(() => { location.hash = "#/settings/x"; location.hash = "#/settings"; }); await page.waitForSelector("#sync"); };

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

const A = await device();
let code;
await t("A: create a code → shown in settings", async () => {
  await A.click('[data-act="syncnew"]');
  await A.waitForSelector(".synccode");
  code = (await A.textContent(".synccode")).trim();
  for (let i = 0; i < 30 && !KV.has(code); i++) await sleep(100);
  assert.ok(KV.has(code), "first PUT stores the new code on the worker");
  assert.match(await A.textContent("#sync"), /ใครรู้รหัสจะเห็นความคืบหน้าของคุณ/);
});
await t("A: finishing a round sends a PUT", async () => {
  const n = log.length; await doRound(A);
  assert.ok(await waitLog(`PUT /sync/${code}`, n), "PUT after finish");
  assert.strictEqual(Object.values(JSON.parse(KV.get(code)).progress.rounds).flat().length, 1);
});

const B = await device();
await t("B: join with A's code → gets A's rounds", async () => {
  await B.fill("#syncin", code.toUpperCase()); await B.click('[data-syncjoin] button');
  await B.waitForSelector(".synccode");
  assert.strictEqual(await rounds(B), 1);
});
await t("B: own round syncs; A reopened sees both", async () => {
  const n = log.length; await doRound(B);
  assert.ok(await waitLog(`PUT /sync/${code}`, n));
  await A.reload(); await A.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0);
  for (let i = 0; i < 50 && (await rounds(A)) < 2; i++) await sleep(100);
  assert.strictEqual(await rounds(A), 2);
});
await t("unflag on B stays unflagged on A after sync", async () => {
  const qid = await A.evaluate(() => window.__medlib.APP.blocks.find((b) => b.id === "END").exams[0].id);
  const flagged = (p) => p.evaluate((id) => !!window.__medlib.PROG.marks.flag[id], qid);
  const toggle = async (p) => { await p.evaluate((id) => { location.hash = "#/q/" + id; }, qid); await p.click('[data-z="flag"]'); };
  const syncAndWait = async (p) => { const n = log.length; await settings(p); await p.click('[data-act="syncnow"]'); assert.ok(await waitLog(`PUT /sync/${code}`, n)); };
  const reopen = async (p) => { await p.reload(); await p.waitForFunction(() => window.__medlib && window.__medlib.APP.blocks.length > 0); await sleep(600); };
  await toggle(A); assert.ok(await flagged(A)); await syncAndWait(A);
  await reopen(B); assert.ok(await flagged(B), "B got the flag");
  await sleep(5); await toggle(B); assert.ok(!(await flagged(B))); await syncAndWait(B);
  await reopen(A); assert.ok(!(await flagged(A)), "flag stays removed on A");
});
await t("no change → no PUT", async () => {
  const n = log.length; await settings(A); await A.click('[data-act="syncnow"]');
  assert.ok(await waitLog(`GET /sync/${code}`, n)); await sleep(300);
  assert.ok(!log.slice(n).some((x) => x.startsWith("PUT")));
});

await t("prefs differ only → no PUT", async () => {
  await A.evaluate(() => { window.__medlib.PROG.prefs = { planTier: 3 }; });
  const n = log.length; await A.click('[data-act="syncnow"]');
  assert.ok(await waitLog(`GET /sync/${code}`, n)); await sleep(300);
  assert.ok(!log.slice(n).some((x) => x.startsWith("PUT")));
});
await t("stop syncing while a sync runs stays stopped", async () => {
  mode = "slow"; await settings(A);
  await A.click('[data-act="syncnow"]'); await A.click('[data-act="syncoff"]'); await A.click('[data-act="syncoff"]');
  await sleep(1500); mode = "ok";
  assert.strictEqual(await A.evaluate(() => localStorage.getItem("medlib.sync.v1")), null);
  await A.evaluate((c) => localStorage.setItem("medlib.sync.v1", JSON.stringify({ code: c })), code);
});

const C = await device();
await t("code is trimmed and lowercased", async () => {
  const n = log.length; mode = "404";
  await C.fill("#syncin", "  K7M2-P9QX-4FH8 "); await C.click('[data-syncjoin] button');
  assert.ok(await waitLog("GET /sync/k7m2-p9qx-4fh8", n));
});
await t("unknown code → ไม่พบรหัสนี้, nothing saved", async () => {
  await C.waitForFunction(() => document.querySelector("#sync").innerText.includes("ไม่พบรหัสนี้"));
  assert.strictEqual(await C.$(".synccode"), null);
  mode = "ok";
});
await t("bad code → รหัสไม่ถูกต้อง, no request", async () => {
  const n = log.length;
  await C.fill("#syncin", "abc"); await C.click('[data-syncjoin] button');
  await C.waitForFunction(() => document.querySelector("#sync").innerText.includes("รหัสไม่ถูกต้อง"));
  await sleep(200); assert.strictEqual(log.length, n);
});
await t("worker 500 / offline → ซิงก์ไม่สำเร็จ, local rounds kept", async () => {
  for (const m of ["500", "down"]) {
    mode = m; await settings(A); const before = await rounds(A);
    await A.click('[data-act="syncnow"]');
    await A.waitForFunction(() => document.querySelector("#sync").innerText.includes("ซิงก์ไม่สำเร็จ"));
    assert.strictEqual(await rounds(A), before);
  }
  mode = "ok";
});
await t("stop syncing removes only the code on this device", async () => {
  await settings(A); const before = await rounds(A);
  await A.click('[data-act="syncoff"]'); await A.click('[data-act="syncoff"]'); await A.waitForSelector("#syncin");
  assert.strictEqual(await rounds(A), before); assert.ok(KV.has(code));
});
const D = await device(false);
await t("no worker URL → no sync section", async () => {
  await D.waitForSelector(".settings");
  assert.strictEqual(await D.$("#sync"), null);
});
await t("no page errors", async () => {
  for (const p of [A, B, C, D]) assert.deepStrictEqual(p.errors, []);
});

await browser.close(); server.kill();
console.log(`\n${pass} ผ่าน`);
