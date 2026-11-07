// MedLib Drive proxy + answer-report queue — Cloudflare Worker
// Paste this whole file into the Cloudflare dashboard (Workers → your worker → Edit code).
//
// 1) GET  <worker-url>/file/<drive_file_id>
//    fetches that PDF from Google Drive with a key that only Cloudflare knows (never reaches GitHub or browsers).
// 2) POST <worker-url>/report   body: {"qid","set","answer","override","reason","page"}
//    a friend reports a doubtful answer key from the website → the worker opens a GitHub Issue
//    (label "answer-report") so Claude can read the queue with `gh issue list -l answer-report`.
// 3) Progress sync across devices (no account, a code works like a key):
//    POST <worker-url>/sync/new          → {"code":"k7m2-p9qx-4fh8"}
//    GET  <worker-url>/sync/<code>       → the saved progress file, or 404
//    PUT  <worker-url>/sync/<code>       body {"format":"medlib-sync","progress":{…}} (≤ 512 KB)
//
// Settings (Worker → Settings → Variables and Secrets):
//   DRIVE_API_KEY    type "Secret"  — Google API key restricted to "Google Drive API" only
//   ALLOWED_ORIGINS  type "Text"    — comma-separated sites allowed to use this worker, e.g.
//                    https://kevinzkevier85.github.io,http://localhost:8765,http://127.0.0.1:8765
//   GITHUB_TOKEN     type "Secret"  — fine-grained token: only the medlibeta repo, permission "Issues: Read and write"
//   GITHUB_REPO      type "Text"    — owner/repo, e.g. kevinzkevier85/medlibeta
//   SYNC             KV namespace binding (Worker → Settings → Bindings → KV namespace, variable name SYNC)

const FILE_PATH = /^\/file\/([A-Za-z0-9_-]{10,100})$/;
const QID = /^[A-Z0-9]{2,8}-\d{1,4}-(MCQ|KF|OSPE)-\d{3}$/;
const SYNC_PATH = /^\/sync\/([^/]+)$/;
const CODE = /^[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}-[2-9a-hjkmnp-z]{4}$/;
const CODE_CHARS = "23456789abcdefghjkmnpqrstuvwxyz";
const SYNC_MAX = 512 * 1024;
const newCode = () => {
  const b = crypto.getRandomValues(new Uint8Array(12));
  const s = Array.from(b, (x) => CODE_CHARS[x % CODE_CHARS.length]).join("");
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8)}`;
};
const clip = (s, n) => String(s == null ? "" : s).replace(/[\u0000-\u0008\u000b-\u001f]/g, "").slice(0, n);

export default {
  async fetch(request, env, ctx) {
    const allowed = (env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);
    const origin = request.headers.get("Origin") || "";
    const originOk = allowed.includes(origin);
    const cors = {
      "Access-Control-Allow-Origin": originOk ? origin : "null",
      "Access-Control-Expose-Headers": "Content-Length",
      Vary: "Origin",
    };
    const reply = (status, text) => new Response(text, { status, headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" } });
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET, POST, PUT", "Access-Control-Allow-Headers": "Content-Type", "Access-Control-Max-Age": "86400" } });
    }
    if (!originOk) return reply(403, "this site is not allowed to use the MedLib proxy");

    const sm = url.pathname.match(SYNC_PATH);
    if (sm) {
      if (!env.SYNC) return reply(501, "sync is not set up on the worker");
      const json = (status, obj) => new Response(JSON.stringify(obj), { status, headers: { ...cors, "Content-Type": "application/json" } });
      try {
        if (sm[1] === "new") {
          if (request.method !== "POST") return reply(405, "use POST");
          let code = newCode();
          // No KV write here (free plan: 1,000 writes/day) — the first PUT creates the entry.
          for (let i = 0; i < 3 && (await env.SYNC.get("p:" + code)) !== null; i++) code = newCode();
          return json(201, { code });
        }
        const code = sm[1];
        if (!CODE.test(code)) return reply(400, "bad sync code");
        if (request.method === "GET") {
          const v = await env.SYNC.get("p:" + code);
          return v === null ? reply(404, "no such sync code") : new Response(v, { status: 200, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
        }
        if (request.method === "PUT") {
          const raw = await request.text();
          if (new TextEncoder().encode(raw).length > SYNC_MAX) return reply(413, "progress file is too big");
          let d; try { d = JSON.parse(raw); } catch { return reply(400, "bad json"); }
          if (!d || d.format !== "medlib-sync" || !d.progress || typeof d.progress !== "object" || Array.isArray(d.progress)) return reply(400, "not a MedLib progress file");
          await env.SYNC.put("p:" + code, raw);
          return json(200, { ok: true });
        }
        return reply(405, "method not allowed");
      } catch (e) { return reply(503, "sync storage is busy, try again later"); }   // e.g. KV write limits
    }

    if (url.pathname === "/report") {
      if (request.method !== "POST") return reply(405, "use POST");
      if (!env.GITHUB_TOKEN || !env.GITHUB_REPO) return reply(501, "report queue is not set up on the worker");
      const raw = await request.text();
      if (raw.length > 4000) return reply(413, "too long");
      let r; try { r = JSON.parse(raw); } catch { return reply(400, "bad json"); }
      if (!QID.test(r.qid || "")) return reply(400, "bad question id");
      const reason = clip(r.reason, 1500).trim();
      if (reason.length < 3) return reply(400, "please give a reason");
      const title = `[เฉลย] ${r.qid}${r.override ? ` ควรเป็น ${clip(r.override, 20)}` : ""}`;
      const body = [
        `**ข้อ:** \`${r.qid}\` · ชุด \`${clip(r.set, 40)}\``,
        `**เฉลยในเว็บ:** ${clip(r.answer, 200) || "-"}`,
        r.override ? `**ผู้แจ้งคิดว่าควรเป็น:** ${clip(r.override, 200)}` : "",
        "", "**เหตุผล:**", reason, "",
        r.page ? `หน้าเว็บ: ${clip(r.page, 300)}` : "",
        "_ส่งจากปุ่ม \"แจ้งเฉลยน่าสงสัย\" ใน MedLib (ไม่มีข้อมูลผู้แจ้ง)_",
      ].filter((x) => x !== "").join("\n");
      const g = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/issues`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "User-Agent": "medlib-worker", "Content-Type": "application/json" },
        body: JSON.stringify({ title, body, labels: ["answer-report"] }),
      });
      if (!g.ok) return reply(502, `GitHub returned ${g.status}`);
      const issue = await g.json();
      return new Response(JSON.stringify({ ok: true, number: issue.number }), { status: 201, headers: { ...cors, "Content-Type": "application/json" } });
    }

    if (request.method !== "GET") return reply(405, "method not allowed");
    if (!env.DRIVE_API_KEY) return reply(500, "DRIVE_API_KEY is not set on the worker");
    const m = url.pathname.match(FILE_PATH);
    if (!m) return reply(404, "use /file/<drive_file_id>, POST /report or /sync/…");
    const fileId = m[1];

    // Cloudflare edge cache: the same PDF is fetched from Google once per day per location.
    const cache = caches.default;
    const cacheKey = new Request(`${url.origin}/file/${fileId}`);
    let resp = await cache.match(cacheKey);

    if (!resp) {
      const g = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true&key=${encodeURIComponent(env.DRIVE_API_KEY)}`
      );
      // Pass the status on, but never Google's body (it can echo request details).
      if (!g.ok) return reply(g.status, `Google Drive returned ${g.status}`);
      const headers = { "Content-Type": "application/pdf", "Cache-Control": "public, max-age=86400" };
      const len = g.headers.get("Content-Length");
      if (len) headers["Content-Length"] = len;
      resp = new Response(g.body, { status: 200, headers });
      ctx.waitUntil(cache.put(cacheKey, resp.clone()));
    }

    const out = new Response(resp.body, resp);
    for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
    return out;
  },
};
