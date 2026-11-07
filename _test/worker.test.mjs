// node _test/worker.test.mjs — checks the Cloudflare Worker (worker/drive-proxy.js) without Cloudflare
import assert from "node:assert";
import worker from "../worker/drive-proxy.js";

const ORIGIN = "http://localhost:8765";
// A Map-backed stand-in for a Cloudflare KV namespace (only the calls the worker uses)
const fakeKV = () => { const m = new Map(); return { get: async (k) => (m.has(k) ? m.get(k) : null), put: async (k, v) => { m.set(k, v); } }; };
export const fakeEnv = (extra = {}) => ({ ALLOWED_ORIGINS: ORIGIN, SYNC: fakeKV(), ...extra });
let env = fakeEnv();
const call = (method, path, body, origin = ORIGIN, e = env) =>
  worker.fetch(new Request("https://worker.test" + path, { method, body, headers: origin ? { Origin: origin } : {} }), e, { waitUntil() {} });

let pass = 0;
const t = async (name, fn) => { await fn(); pass++; console.log("✓", name); };

await t("other sites are refused", async () => assert.strictEqual((await call("GET", "/file/abcdefghijk", null, "https://evil.example")).status, 403));
await t("preflight allows PUT", async () => {
  const r = await call("OPTIONS", "/sync/new");
  assert.strictEqual(r.status, 204);
  assert.match(r.headers.get("Access-Control-Allow-Methods"), /PUT/);
});

const CODE = /^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$/;
const good = JSON.stringify({ format: "medlib-sync", progress: { rounds: {} } });
await t("new code: right shape, different each time", async () => {
  const a = await (await call("POST", "/sync/new")).json(), b = await (await call("POST", "/sync/new")).json();
  assert.match(a.code, CODE); assert.match(b.code, CODE); assert.notStrictEqual(a.code, b.code);
});
await t("put then get returns the same body", async () => {
  const { code } = await (await call("POST", "/sync/new")).json();
  assert.strictEqual((await call("PUT", `/sync/${code}`, good)).status, 200);
  const r = await call("GET", `/sync/${code}`);
  assert.strictEqual(r.status, 200); assert.deepStrictEqual(await r.json(), JSON.parse(good));
});
await t("unknown code 404, malformed code 400", async () => {
  assert.strictEqual((await call("GET", "/sync/2222-3333-4444")).status, 404);
  assert.strictEqual((await call("GET", "/sync/ABC")).status, 400);
});
await t("put: too big 413, not json 400, wrong format 400", async () => {
  const { code } = await (await call("POST", "/sync/new")).json();
  assert.strictEqual((await call("PUT", `/sync/${code}`, "x".repeat(524289))).status, 413);
  assert.strictEqual((await call("PUT", `/sync/${code}`, "not json")).status, 400);
  assert.strictEqual((await call("PUT", `/sync/${code}`, JSON.stringify({ rounds: {} }))).status, 400);
});
await t("no KV binding → 501", async () => {
  const e = fakeEnv(); delete e.SYNC;
  assert.strictEqual((await call("POST", "/sync/new", null, ORIGIN, e)).status, 501);
});
console.log(`\n${pass} ผ่าน`);
