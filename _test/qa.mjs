// QA for MedLib in a real headless Chrome. Needs the site running: start.bat (port 8765).
// Usage: node _test/qa.mjs
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASE = "http://localhost:8765/";
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const prof = path.join(ROOT, "_test", "chrome-qa");
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--remote-debugging-port=9351", `--user-data-dir=${prof}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

let ws, id = 1; const pend = new Map(); let errs = [];
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const p = (await (await fetch("http://127.0.0.1:9351/json/list")).json()).find((t) => t.type === "page");
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; }); }
  } catch {}
  await sleep(200);
}
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  else if (m.method === "Runtime.exceptionThrown") errs.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text);
  else if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push(m.params.args.map((a) => a.value || a.description).join(" "));
};
const send = (method, params = {}) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true })).result.value;
const waitFor = async (expr, ms = 8000) => { for (let t = 0; t < ms; t += 150) { if (await ev(expr)) return true; await sleep(150); } return false; };
const go = async (hash) => { await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(250); };
const click = (sel) => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); if (!el) return false; el.click(); return true; })()`);
const setVal = (sel, v, evt = "change") => ev(`(() => { const el = document.querySelector(${JSON.stringify(sel)}); el.value = ${JSON.stringify(v)}; el.dispatchEvent(new Event(${JSON.stringify(evt)}, { bubbles: true })); return true; })()`);
const text = () => ev("document.querySelector('#main').innerText");

let pass = 0, fail = 0;
const ok = (c, msg) => { if (c) { pass++; console.log("ok  ", msg); } else { fail++; console.log("FAIL", msg); } };

await send("Runtime.enable");
await send("Page.navigate", { url: BASE + "#/" });
ok(await waitFor("document.querySelector('.card')"), "home shows block cards");
ok((await ev("document.querySelector('.ver').innerText")).includes("v" + JSON.parse(fs.readFileSync(path.join(ROOT, "version.json"), "utf8")).version), "version + date shown in menu");

await go("#/b/DEMO/exam");
ok((await ev("document.querySelectorAll('.rows .row').length")) === 3, "DEMO block lists 3 questions");

await go("#/q/DEMO-52-MCQ-005");
await click('[data-pick="C"]'); await sleep(150);
ok((await ev("!!document.querySelector('.opt.wrong') && !!document.querySelector('.opt.right')")), "wrong pick marks wrong + right answer");
ok((await text()).includes("คำตอบคือ B"), "explanation shows the correct answer");

await click('.ref'); // opens PDF at the referenced page
ok(await waitFor("location.hash === '#/pdf/DEMO/L02/5'"), "lecture ref opens PDF at page 5");
ok(await waitFor("!!document.querySelector('#pdfstage canvas')", 10000), "PDF page renders to canvas");
ok((await ev("document.querySelector('#pgtotal').innerText")).includes("8"), "page count read from PDF");
await click('[data-pg="1"]');
ok(await waitFor("location.hash === '#/pdf/DEMO/L02/6' && !!document.querySelector('#pdfstage canvas')"), "next page works");
await go("#/pdf/DEMO/L05/4");
ok(await waitFor("(document.querySelector('.status.err')||{}).innerText?.includes('ยังไม่มีไฟล์ PDF')"), "lecture without file explains why");

await go("#/search/ADH");
ok(/\d+ รายการ/.test(await text()) && (await text()).includes("DEMO"), "search finds the DEMO ADH question");

await go("#/settings");
await setVal("#s-font", "large");
ok((await ev("JSON.parse(localStorage.getItem('medlib.user.v1')).settings.fontSize")) === "large", "personal setting saved in browser");
ok((await text()).includes("ค่าส่วนตัว"), "changed setting is labelled personal");
await click('[data-act="reset"]'); await sleep(100); await click('[data-act="reset"]'); await sleep(200);
ok((await ev("Object.keys(JSON.parse(localStorage.getItem('medlib.user.v1')).settings).length")) === 0, "reset (two clicks) returns to defaults");
const navBefore = await ev("document.querySelectorAll('#side .nav').length");
await setVal("#s-sample", "false");
ok((await ev("document.querySelectorAll('#side .nav').length")) === navBefore - 1, "hiding sample removes DEMO from menu");
await setVal("#s-sample", "true");

await go("#/add");
await click('[data-act="save"]'); await sleep(150);
ok((await text()).includes("ยังบันทึกไม่ได้"), "empty form is rejected");
await setVal("#f-block", "DEMO"); await sleep(150); // real blocks may exist; the form test targets the sample block
for (const [k, v] of Object.entries({ "#f-cohort": "52", "#f-n": "40", "#f-stem": "ข้อใดเป็นฮอร์โมนที่หลั่งจาก posterior pituitary", "#f-A": "ADH", "#f-B": "TSH", "#f-pages": "2" }))
  await setVal(k, v, "input");
await setVal("#f-answer", "A");
ok((await text()).includes("ผ่านการตรวจ format แล้ว"), "valid form passes shared validator");
await click('[data-act="save"]'); await sleep(200);
ok((await ev("JSON.parse(localStorage.getItem('medlib.user.v1')).questions[0].id")) === "DEMO-52-MCQ-040", "saved question has canonical id");
await go("#/q/DEMO-52-MCQ-040");
ok((await text()).includes("ของฉัน"), "personal question shows with 'ของฉัน' badge");
const sameShape = await ev(`(() => { const V = window.MedLibValidate; const b = window.__medlib.APP.blocks.find((x) => x.id === 'DEMO'); return V.validateQuestion(window.__medlib.USER.questions[0], { block: b }).length === 0; })()`);
ok(sameShape, "saved record re-validates with lib/validate.js");

// phone width: no sideways scroll
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (const h of ["#/", "#/q/DEMO-52-MCQ-005", "#/settings", "#/add", "#/pdf/DEMO/L08/3"]) {
  await go(h); await sleep(400);
  ok((await ev("document.documentElement.scrollWidth <= window.innerWidth + 1")), `no horizontal scroll at 390px: ${h}`);
}
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(ROOT, "_test", "phone-pdf.png"), Buffer.from(shot.data, "base64"));

ok(errs.length === 0, "no JS errors" + (errs.length ? ": " + errs.join(" | ") : ""));
console.log(`\n${pass} passed, ${fail} failed`);
ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
