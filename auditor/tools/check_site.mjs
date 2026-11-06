// Phase 6 QA — open audited questions in the MedLib site with headless Chrome.
// Needs the site running (start.bat, port 8765).  Usage: node auditor/tools/check_site.mjs [BLOCK] [cohort]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const [B = "END", C = "52"] = process.argv.slice(2);
const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks", B, "exams", `${C}_MCQ.json`), "utf8"));
const BASE = "http://localhost:8765/";
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const prof = path.join(ROOT, "_test", "chrome-auditor");
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--remote-debugging-port=9352", `--user-data-dir=${prof}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

let ws, id = 1; const pend = new Map(); const errs = [];
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const p = (await (await fetch("http://127.0.0.1:9352/json/list")).json()).find((t) => t.type === "page");
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; }); }
  } catch {}
  await sleep(200);
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  else if (m.method === "Runtime.exceptionThrown") errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
};
const send = (method, params = {}) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const waitFor = async (expr, ms = 10000) => { for (let t = 0; t < ms; t += 150) { if (await ev(expr)) return true; await sleep(150); } return false; };
const go = async (hash) => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(300); };
const text = () => ev("document.querySelector('#main').innerText");
let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log("ok  ", msg); } else { fail++; console.log("FAIL", msg); } };

await send("Runtime.enable");
await send("Page.navigate", { url: BASE + `#/b/${B}/exam` });
ok(await waitFor("document.querySelectorAll('.rows .row').length > 0"), "exam tab lists questions");
ok((await ev("document.querySelectorAll('.rows .row').length")) === set.questions.length, `exam tab shows all ${set.questions.length} questions`);

// every question page renders stem + all options
let bad = [];
for (const q of set.questions) {
  await go(`#/q/${q.id}`);
  const okq = await waitFor(`document.querySelectorAll('[data-pick]').length === ${Object.keys(q.options).length}`, 3000);
  if (!okq) bad.push(q.id);
}
ok(bad.length === 0, `all question pages render with their options ${bad.length ? "(bad: " + bad.join(",") + ")" : ""}`);

// answer → explanation, and the reference opens the original exam PDF from Drive
const q = set.questions.find((x) => x.n === 42) || set.questions[0];
await go(`#/q/${q.id}`);
await ev(`document.querySelector('[data-pick="${q.answer}"]').click()`); await sleep(200);
ok(await ev("!!document.querySelector('.opt.right')"), `picking ${q.answer} on ${q.id} is marked right`);
ok((await ev("document.querySelector('.explain')?.innerText || ''")).includes("ถูกต้อง"), "right pick shows 'ถูกต้อง' + explanation");
await ev("document.querySelector('.ref').click()");
ok(await waitFor("!!document.querySelector('#pdfstage canvas')", 20000), "reference opens the original PDF page (from Google Drive)");

ok(errs.length === 0, `no JS errors ${errs.length ? errs.join(" | ") : ""}`);
console.log(`\n${pass} passed, ${fail} failed`);
chrome.kill();
process.exit(fail ? 1 : 0);
