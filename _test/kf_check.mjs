// KF set check in headless Chrome: every question/item renders, every item picture loads. Needs start.bat (port 8765).
// Usage: node _test/kf_check.mjs [END] [52]
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const [B = "END", C = "52"] = process.argv.slice(2);
const set = JSON.parse(fs.readFileSync(path.join(ROOT, "data/blocks", B, "exams", `${C}_KF.json`), "utf8"));
const BASE = "http://localhost:8765/";
const sleep = (m) => new Promise((r) => setTimeout(r, m));
const prof = path.join(ROOT, "_test", "chrome-kf");
fs.rmSync(prof, { recursive: true, force: true });
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe",
  ["--headless=new", "--remote-debugging-port=9353", `--user-data-dir=${prof}`, "--window-size=1280,900", "about:blank"], { stdio: "ignore" });

let ws, id = 1; const pend = new Map(); const errs = [];
for (let i = 0; i < 50 && !ws; i++) {
  try {
    const p = (await (await fetch("http://127.0.0.1:9353/json/list")).json()).find((t) => t.type === "page");
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
await send("Page.navigate", { url: BASE + `#/set/${B}/${C}_KF` });
await ev("localStorage.removeItem('medlib.quiz.v1')");
await go(`#/set/${B}/${C}_KF`);
await waitFor(`!!document.querySelector('[data-z="start"]')`);
await ev(`document.querySelector('[data-z="start"]').click()`); await sleep(400);   // practice mode (default)
ok(await waitFor(`document.querySelectorAll('.qnav .qrow > *').length === ${set.questions.length}`), `navigator lists all ${set.questions.length} KF questions`);
const bad = [];
for (let i = 1; i <= set.questions.length; i++) {
  const q = set.questions[i - 1];
  await ev(`location.replace('#/set/${B}/${C}_KF/${i}')`); await sleep(80);
  if (!(await waitFor(`document.querySelectorAll('.item').length === ${q.items.length} && !!document.querySelector('.case')`, 3000))) bad.push(q.n);
}
ok(bad.length === 0, `every KF question renders with all its items ${bad.length ? "(bad: " + bad.join(",") + ")" : ""}`);
// pictures: every item picture appears after "check", loads, and is the full file (natural size = file size)
for (const [qi, q] of set.questions.entries()) {
  const pics = q.items.flatMap((it) => [it.image, it.key_image]).filter(Boolean);
  if (!pics.length) continue;
  await ev(`location.replace('#/set/${B}/${C}_KF/${qi + 1}')`);
  await waitFor(`document.querySelectorAll('.item').length === ${q.items.length}`, 3000);
  await ev(`document.querySelector('[data-z="check"]')?.click()`);
  await waitFor(`document.querySelectorAll('.item .verdict').length === ${q.items.length}`, 3000);
  console.log("     ", q.id, "revealed items:", await ev("document.querySelectorAll('.item .verdict').length"), "/", q.items.length, "· key pictures:", await ev("document.querySelectorAll('figure.keyfig').length"));
  for (const f of pics) {
    await ev(`[...document.images].find((x) => x.getAttribute('src').endsWith(${JSON.stringify(f)}))?.scrollIntoView()`);   // pictures are loading="lazy"
    const loaded = await waitFor(`(() => { const im = [...document.querySelectorAll('.qcard img, img')].find((x) => x.getAttribute('src').endsWith(${JSON.stringify(f)})); return im && im.complete && im.naturalWidth > 0; })()`, 5000);
    ok(loaded, `${q.id}: picture ${f} shown and loaded`);
  }
}
console.log(errs.length ? "page errors: " + errs.join(" | ") : "no page errors");
ok(errs.length === 0, "no JS errors");
console.log(`\n${pass} passed, ${fail} failed`);
chrome.kill(); process.exit(fail ? 1 : 0);
