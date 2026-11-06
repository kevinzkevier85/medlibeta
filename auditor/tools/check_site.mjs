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
await send("Page.navigate", { url: BASE + `#/b/${B}/lec` });
await waitFor("!!document.querySelector('.tabs')");
ok((await ev("document.querySelectorAll('.rows .row').length")) === 0, "lecture tab has no exam PDFs in it");
await go(`#/b/${B}/exam`);
ok(await waitFor("document.querySelectorAll('.cohort').length > 0"), "exam tab shows cohort cards");
ok((await ev("document.querySelector('.cohort h3').innerText")).includes(`รุ่น ${C}`), `cohort card รุ่น ${C}`);
ok((await ev("document.querySelector('.setmain .setn').innerText")).includes(String(set.questions.length)), `set tile shows ${set.questions.length} questions`);
ok((await ev("[...document.querySelectorAll('.pdflink')].map(a => a.innerText).join('|')")).includes("PDF เฉลย"), "set tile links the exam and key PDFs");

await ev("localStorage.removeItem('medlib.quiz.v1')");
await go(`#/set/${B}/${C}_MCQ`);
ok(await waitFor(`document.querySelectorAll('.qgrid .qn').length === ${set.questions.length}`), `navigator lists all ${set.questions.length} questions`);
const bad = [];
for (let i = 1; i <= set.questions.length; i++) {
  const q = set.questions[i - 1];
  await ev(`location.replace('#/set/${B}/${C}_MCQ/${i}')`); await sleep(60);
  const okq = await waitFor(`document.querySelectorAll('[data-qpick]').length === ${Object.keys(q.options).length} && document.querySelector('.qcard .stem').innerText.length > 10`, 3000);
  if (!okq) bad.push(q.n);
}
ok(bad.length === 0, `every question renders in the set runner ${bad.length ? "(bad: " + bad.join(",") + ")" : ""}`);

const q = set.questions.find((x) => x.n === 42) || set.questions[0];
const qi = set.questions.indexOf(q) + 1;
await go(`#/set/${B}/${C}_MCQ/${qi}`);
await ev(`document.querySelector('[data-qpick="${q.answer}"]').click()`); await sleep(250);
ok(await ev("!!document.querySelector('.opt.right') && (document.querySelector('.explain')?.innerText || '').includes('ถูกต้อง')"), `practice: ${q.id} right answer → 'ถูกต้อง' + explanation`);
ok((await ev("document.querySelectorAll('.explain .ref').length")) === 2, "explanation links both original PDFs (exam + key page)");
await ev("document.querySelector('.explain .ref').click()");
ok(await waitFor("!!document.querySelector('#pdfstage canvas') || !!document.querySelector('iframe.drivepreview')", 20000), "reference opens the original exam PDF page");
ok((await ev("document.querySelector('.crumbs').innerText")).includes("MCQ"), "PDF breadcrumb names the exam paper, not a lecture");

// online without key/Worker (GitHub Pages): falls back to Google Drive preview
await ev("indexedDB.deleteDatabase('medlib'); window.__medlib.APP.config = {}; true"); await sleep(300);
await go(`#/pdf/${B}/MCQ${C}-KEY/3`);
ok(await waitFor("!!document.querySelector('iframe.drivepreview')"), "no key → Google Drive preview iframe instead of an error");
await ev("localStorage.removeItem('medlib.quiz.v1')");

ok(errs.length === 0, `no JS errors ${errs.length ? errs.join(" | ") : ""}`);
console.log(`\n${pass} passed, ${fail} failed`);
chrome.kill();
process.exit(fail ? 1 : 0);
