// Screenshots of main views (desktop + phone) for design review. Needs the site on :8765.
// Usage: node _test/shots.mjs [dark]   → _test/shots/*.png
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "_test", "shots"); fs.mkdirSync(OUT, { recursive: true });
const dark = process.argv[2] === "dark";
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const prof = path.join(ROOT, "_test", "chrome-qa");
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--remote-debugging-port=9352", `--user-data-dir=${prof}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });
let ws, id = 1; const pend = new Map();
for (let i = 0; i < 50 && !ws; i++) {
  try { const p = (await (await fetch("http://127.0.0.1:9352/json/list")).json()).find((t) => t.type === "page");
    if (p) { ws = new WebSocket(p.webSocketDebuggerUrl); await new Promise((r) => { ws.onopen = r; }); } } catch {}
  await sleep(200);
}
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = id++; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = (expr) => send("Runtime.evaluate", { expression: expr, awaitPromise: true });
if (dark) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-color-scheme", value: "dark" }] });
await send("Page.navigate", { url: "http://localhost:8765/#/" }); await sleep(1500);
const views = [["home", "#/"], ["block", "#/b/DEMO/exam"], ["question", "#/q/DEMO-52-MCQ-005", "document.querySelector('[data-pick=A]')?.click()"],
  ["lecture", "#/l/DEMO/L02"], ["pdf", "#/pdf/DEMO/L02/5"], ["search", "#/search/ADH"], ["settings", "#/settings"], ["add", "#/add"]];
for (const [w, h, mobile] of [[1280, 900, false], [390, 844, true]]) {
  await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile });
  for (const [name, hash, act] of views) {
    await ev(`location.hash = ${JSON.stringify(hash)}`); await sleep(name === "pdf" ? 1500 : 400);
    if (act) { await ev(act); await sleep(500); }
    const s = await send("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(path.join(OUT, `${dark ? "dark-" : ""}${mobile ? "phone" : "desk"}-${name}.png`), Buffer.from(s.data, "base64"));
  }
}
console.log("saved to", OUT); chrome.kill(); process.exit(0);
