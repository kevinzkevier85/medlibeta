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
ok(await ev("[...document.querySelectorAll('.card .code')].some((x) => x.innerText.includes('CVS'))"), "CVS block imported and shown");

await go("#/b/DEMO");
ok((await ev("document.querySelectorAll('.cohort').length")) === 1 && (await ev("document.querySelector('.set .n').innerText")).includes("3"), "exam tab: cohort card with set tile (DEMO 3 questions)");
ok(await ev("!!document.querySelector('.mixbox')"), "exam tab: cross-set practice box");
ok(await ev("document.querySelectorAll('#modes .mode').length === 2 && document.querySelector('#modes .mode.on').innerText === 'ข้อสอบ'"), "header switches between ข้อสอบ / Lecture modes");
await go("#/lec/DEMO");
ok((await ev("document.querySelectorAll('#leclist .lecitem').length")) === 3 && (await ev("!!document.querySelector('.shell.lecmode')")), "lecture mode: own page with lecture list on the left");
await go("#/b/DEMO/lec"); await sleep(200);
ok((await ev("location.hash")) === "#/lec/DEMO", "old block lecture link redirects to lecture mode");

// rounds: practice
await ev("localStorage.removeItem('medlib.progress.v1')"); await ev("location.reload()"); await sleep(500);
await waitFor("window.__medlib && window.__medlib.APP.blocks.length > 1");
await go("#/set/DEMO/52_MCQ");
ok(await waitFor("!!document.querySelector('[data-z=\"start\"]')"), "set overview offers to start a round");
await click('input[name="mode"][value="practice"]'); await click('[data-z="start"]');
ok(await waitFor("document.querySelectorAll('.qrow .qc').length === 3"), "runner: number strip with every question");
await click('.opt[data-opt="C"]'); await sleep(200);
ok(await ev("!!document.querySelector('.opt.wrong') && !!document.querySelector('.opt.correct') && !!document.querySelector('.qc.cur.wrong') && !!document.querySelector('.explain')"), "practice: instant feedback, strip marks wrong, explanation box");
await click('.qfoot [data-go]:last-child'); await sleep(200);
ok((await ev("location.hash")).endsWith("/run/2"), "next question");
await click('[data-z="flag"]'); await sleep(150);
ok(await ev("!!document.querySelector('.qc.cur.flag')"), "flag shows on strip");
await click('[data-z="finish"]'); await sleep(100); await click('[data-z="finish"]'); await sleep(300);
ok((await ev("location.hash")).includes("/sum/") && (await text()).includes("ข้อที่ผิด"), "finish (two clicks) → summary with wrong list");
await click('[data-z="retry"]'); await sleep(300);
ok(await ev("(() => { const r = window.__medlib.PROG.rounds['DEMO/52_MCQ']; const a = r[r.length-1]; return r.length === 2 && a.kind === 'retry' && a.qids.length === 1 && !a.done; })()"), "retry wrong starts a new round with only the picked wrong question");

// exam round without timer + history
await go("#/set/DEMO/52_MCQ");
await click('input[name="mode"][value="untimed"]'); await click('[data-z="start"]'); await sleep(300);
ok(await ev("document.querySelector('#ztimer').innerText.includes('เวลา')"), "untimed exam shows elapsed time");
await click('.opt[data-opt="A"]'); await sleep(150);
ok(await ev("!!document.querySelector('.opt[aria-pressed=\"true\"]') && !document.querySelector('.explain')"), "exam mode: no key before submit");
await click('[data-z="submit"]'); await sleep(100); await click('[data-z="submit"]'); await sleep(300);
ok((await ev("location.hash")).includes("/sum/"), "submit → summary");
await go("#/set/DEMO/52_MCQ/hist");
ok((await ev("document.querySelectorAll('tbody tr').length")) === 2, "history lists finished rounds (empty abandoned rounds hidden)");

// single question page + PDF
await go("#/q/DEMO-52-MCQ-005");
await click('.opt[data-opt="C"]'); await sleep(150);
ok((await ev("!!document.querySelector('.opt.wrong') && !!document.querySelector('.opt.correct')")) && (await text()).includes("คำตอบ B"), "single question: feedback + correct answer");
await click('.refs a[href="#/lec/DEMO/L02/5"]');
ok(await waitFor("location.hash === '#/lec/DEMO/L02/5'"), "lecture ref opens the lecture reader at page 5");
ok(await waitFor("!!document.querySelector('#lecpages .pgbox[data-n=\"5\"] canvas')", 10000), "reader renders page 5 (continuous pages)");
ok(await ev("document.querySelector('#leclist .lecitem.on') && document.querySelector('#leclist .lecitem.on').innerText.includes('L02')"), "current lecture highlighted in the list");
ok((await ev("document.querySelector('#pgtotal').innerText")).includes("8"), "page count read from PDF");
await click('[data-pg="1"]'); await sleep(900);
ok((await ev("location.hash")) === "#/lec/DEMO/L02/6" && (await ev("document.querySelector('#pgin').value")) === "6", "next page scrolls the reader");
ok(await ev("window.__medlib.PROG.read['DEMO/L02'].page === 6"), "reading position remembered");
ok(await ev("(() => { const p = document.querySelector('#lecpages'), d = p.querySelector('.pgbox[data-n=\"6\"]'); return Math.abs(d.getBoundingClientRect().top - p.getBoundingClientRect().top) < 40; })()"), "page 6 is at the top of the reader (no drift)");
await click('[data-zm="1"]'); await sleep(400);
ok(await waitFor("document.querySelector('#zlabel').innerText.includes('%') && !!document.querySelector('#lecpages .pgbox[data-n=\"6\"] canvas')"), "zoom in re-renders at the same page");
await setVal("#pdfq", "a", "input"); await ev("document.querySelector('[data-pdfsearch]').requestSubmit()");
ok(await waitFor("(document.querySelector('#pdfhits')||{}).innerText?.includes('พบใน')", 8000), "search inside the open PDF");
await go("#/lec/DEMO/L05/4");
ok(await waitFor("(document.querySelector('#lecpages .status.err')||{}).innerText?.includes('ยังไม่มีไฟล์ PDF')"), "lecture without file explains why");

// CVS: rich explanation, original key, my key, report fallback
await go("#/q/CVS-52-MCQ-005");
await click('.opt[data-opt="A"]'); await sleep(200);
ok(await ev("!!document.querySelector('.why') && !!document.querySelector('.chain') && !!document.querySelector('.keyrow.src')"), "CVS: why per choice + mechanism chain + original key row");
await ev("document.querySelector('.report').open = true");
await setVal('[data-rep-key]', "A"); await click('[data-z="setkey"]'); await sleep(200);
ok(await ev("window.__medlib.PROG.marks.keyOverride['CVS-52-MCQ-005'] === 'A' && !!document.querySelector('.badge.mine')"), "my key saved on this device and shown");
await click('[data-z="unkey"]'); await sleep(150);
await ev("document.querySelector('.report').open = true");
await setVal('[data-rep-reason]', "ทดสอบ เหตุผลยาวพอ", "input"); await click('[data-z="report"]'); await sleep(400);
ok((await text()).includes("คัดลอกข้อความ"), "report without a queue falls back to copy / GitHub issue link");

// KF / OSPE
await go("#/set/CVS/52_OSPE");
await click('input[name="mode"][value="practice"]'); await click('[data-z="start"]'); await sleep(300);
ok(await ev("!!document.querySelector('.case') && !!document.querySelector('figure img') && !!document.querySelector('textarea[data-item]')"), "OSPE: station, image and typed answers");
await setVal('textarea[data-item]', "transverse sinus", "input"); await click('[data-z="check"]'); await sleep(200);
ok(await ev("!!document.querySelector('.verdict') && !!document.querySelector('.override')"), "check → verdict + judge-it-yourself buttons");
await click('.override [data-ov="1"]'); await sleep(150);
ok(await ev("document.querySelector('.override [data-ov=\"1\"]').getAttribute('aria-pressed') === 'true'"), "override saved");

// block plan + lecture page + cross-set
await go("#/lec/CVS/plan");
ok((await ev("document.querySelectorAll('.lcard').length")) > 5 && (await text()).includes("Tier"), "reading plan per block");
await go("#/set/CVS/52_MCQ/guide");
ok((await ev("document.querySelectorAll('.lcard').length")) > 3, "set Guidereader");
await go("#/l/CVS/L04"); await sleep(300);
ok((await ev("location.hash")).startsWith("#/lec/CVS/L04"), "old lecture link redirects to the reader");
ok(await ev("document.querySelectorAll('.hotpages .hp').length > 0"), "reader shows pages that were examined");
await click('[data-act="toc"]'); await sleep(150);
ok((await ev("document.querySelectorAll('#toc .toc').length")) > 10 && (await ev("document.querySelectorAll('#toc .toc.hotpage').length")) > 0, "table of contents with examined pages highlighted");
await go("#/refs/CVS/L04/6");
ok((await ev("document.querySelectorAll('.rows .row').length")) > 0, "'ดูข้อสอบที่อ้างถึงหน้านี้' lists the questions in exam mode");
await go("#/b/CVS");
await setVal("#mixN", "10", "input"); await click('[data-z="mixrand"]');
ok(await waitFor("location.hash.startsWith('#/set/CVS/@')"), "random 10 from block creates a practice set");
ok((await waitFor("!!document.querySelector('[data-z=\"start\"]')")) && (await text()).includes("10 ข้อ"), "mix set has 10 questions");

await go("#/search/ADH");
ok(/\d+ รายการ/.test(await text()) && (await text()).includes("DEMO"), "search finds the DEMO ADH question");
await go("#/search/dicrotic");
ok((await text()).includes("หน้า lecture"), "search finds lecture page index entries");

// settings + personal file round trip
await go("#/settings");
await setVal("#s-font", "large");
ok((await ev("JSON.parse(localStorage.getItem('medlib.user.v1')).settings.fontSize")) === "large", "personal setting saved in browser");
await click('[data-act="reset"]'); await sleep(100); await click('[data-act="reset"]'); await sleep(200);
ok((await ev("Object.keys(JSON.parse(localStorage.getItem('medlib.user.v1')).settings).length")) === 0, "reset (two clicks) returns to defaults");
const navBefore = await ev("document.querySelectorAll('#side a.nav').length");
await setVal("#s-sample", "false");
ok((await ev("document.querySelectorAll('#side a.nav').length")) === navBefore - 1, "hiding sample removes DEMO from menu");
await setVal("#s-sample", "true");
const imported = await ev(`(async () => {
  const before = window.__medlib.PROG.rounds['DEMO/52_MCQ'].length;
  const other = { format: 'medlib-personal', schema: 2, settings: {}, questions: [], progress: { rounds: { 'DEMO/52_MCQ': [{ id: 'fromphone', kind: 'full', mode: 'practice', qids: ['DEMO-52-MCQ-005'], ans: { 'DEMO-52-MCQ-005': 'B' }, chk: { 'DEMO-52-MCQ-005': true }, ov: {}, started: 5, elapsed: 0, done: true }] }, marks: { flag: { 'CVS-52-MCQ-001': true } } } };
  const inp = document.querySelector('#importfile'); const dt = new DataTransfer();
  dt.items.add(new File([JSON.stringify(other)], 'p.json', { type: 'application/json' })); inp.files = dt.files;
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  for (let i = 0; i < 30 && window.__medlib.PROG.rounds['DEMO/52_MCQ'].length === before; i++) await new Promise((r) => setTimeout(r, 100));
  const P = window.__medlib.PROG; return P.rounds['DEMO/52_MCQ'].length === before + 1 && P.marks.flag['CVS-52-MCQ-001'] === true;
})()`);
ok(imported, "import a progress file from another device merges rounds and flags");

await go("#/add");
await click('[data-act="save"]'); await sleep(150);
ok((await text()).includes("ยังบันทึกไม่ได้"), "empty form is rejected");
await setVal("#f-block", "DEMO"); await sleep(150);
for (const [k, v] of Object.entries({ "#f-cohort": "52", "#f-n": "40", "#f-stem": "ข้อใดเป็นฮอร์โมนที่หลั่งจาก posterior pituitary", "#f-A": "ADH", "#f-B": "TSH", "#f-pages": "2" }))
  await setVal(k, v, "input");
await setVal("#f-answer", "A");
ok((await text()).includes("ผ่านการตรวจ format แล้ว"), "valid form passes shared validator");
await click('[data-act="save"]'); await sleep(200);
ok((await ev("JSON.parse(localStorage.getItem('medlib.user.v1')).questions[0].id")) === "DEMO-52-MCQ-040", "saved question has canonical id");
await go("#/q/DEMO-52-MCQ-040");
ok(await ev("!!document.querySelector('.qcard')"), "personal question opens");

// PWA: service worker + offline
await ev("location.reload()"); await sleep(1200);
ok(await waitFor("!!(navigator.serviceWorker && navigator.serviceWorker.controller)", 8000), "service worker controls the page");
ok(await ev("fetch('manifest.webmanifest').then((r) => r.json()).then((m) => m.icons.length >= 3)"), "manifest with icons");
await go("#/set/CVS/52_OSPE"); await sleep(300); // load a set while online
await send("Network.enable");
await send("Network.emulateNetworkConditions", { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
await ev("location.hash = '#/'; location.reload()"); await sleep(1500);
ok(await waitFor("document.querySelectorAll('.card').length >= 2", 8000), "offline: app opens from cache with every block");
await go("#/set/CVS/52_MCQ"); await click('input[name="mode"][value="practice"]'); await click('[data-z="start"]'); await sleep(300);
await click('.opt[data-opt="A"]'); await sleep(200);
ok(await ev("!!document.querySelector('.explain')"), "offline: can practise an exam set");
await send("Network.emulateNetworkConditions", { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });

// phone width: no sideways scroll
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
for (const h of ["#/", "#/b/CVS", "#/lec/CVS", "#/lec/CVS/plan", "#/lec/DEMO/L02/3", "#/q/CVS-52-MCQ-005", "#/set/CVS/52_MCQ", "#/set/CVS/52_OSPE/run/1", "#/set/DEMO/52_MCQ/hist", "#/settings", "#/add", "#/refs/CVS/L04/6"]) {
  await go(h); await sleep(400);
  ok((await ev("document.documentElement.scrollWidth <= window.innerWidth + 1")), `no horizontal scroll at 390px: ${h}`);
}
await go("#/lec/DEMO/L02/2"); await sleep(600);
await click('.rdbar [data-act="drawer"]'); await sleep(300);
ok(await ev("document.querySelector('.lec').classList.contains('drawer') && document.querySelector('.lecside').getBoundingClientRect().left >= 0"), "phone: lecture list opens as a drawer");
let shot0 = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(ROOT, "_test", "phone-lec-drawer.png"), Buffer.from(shot0.data, "base64"));
await click('.lecscrim'); await sleep(300);
shot0 = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(ROOT, "_test", "phone-lec.png"), Buffer.from(shot0.data, "base64"));
await go("#/set/CVS/52_OSPE/run/1"); await sleep(400);
const shot = await send("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(path.join(ROOT, "_test", "phone-run.png"), Buffer.from(shot.data, "base64"));

ok(errs.length === 0, "no JS errors" + (errs.length ? ": " + errs.join(" | ") : ""));
console.log(`\n${pass} passed, ${fail} failed`);
ws.close(); chrome.kill();
process.exit(fail ? 1 : 0);
