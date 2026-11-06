// Screenshots of the exam tab + set runner (desktop and phone). Needs start.bat (port 8765).
// Usage: node _test/shots-set.mjs [BLOCK] [SET]   → _test/shots/set-*.png
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [B = "END", SET = "52_MCQ"] = process.argv.slice(2);
const OUT = path.join(ROOT, "_test", "shots");
fs.mkdirSync(OUT, { recursive: true });
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const prof = path.join(ROOT, "_test", "chrome-shot");
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--remote-debugging-port=9353", `--user-data-dir=${prof}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
let ws, id = 1; const pend = new Map();
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const p = (await (await fetch("http://127.0.0.1:9353/json/list")).json()).find((t) => t.type === "page");
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; }); }
  } catch {}
  await sleep(200);
}
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, returnByValue: true, awaitPromise: true })).result.value;
const shot = async (name) => { const r = await send("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, "base64")); };

await send("Page.navigate", { url: `http://localhost:8765/#/b/${B}/exam` }); await sleep(1500);
await shot("set-exam-tab.png");
await ev(`location.hash = "#/set/${B}/${SET}/5"`); await sleep(500);
await ev(`document.querySelector('[data-qpick="B"]').click()`); await sleep(400);
await shot("set-runner.png");
await ev(`location.hash = "#/set/${B}/${SET}/sum"`); await sleep(500);
await shot("set-summary.png");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
await ev(`location.hash = "#/set/${B}/${SET}/6"`); await sleep(600);
await shot("set-phone.png");
console.log("phone sideways overflow:", await ev("document.documentElement.scrollWidth > window.innerWidth"));
await ev("localStorage.removeItem('medlib.quiz.v1')");
chrome.kill();
