// MedLib Drive proxy — Cloudflare Worker
// Paste this whole file into the Cloudflare dashboard (Workers → your worker → Edit code).
//
// What it does: the website asks  GET <worker-url>/file/<drive_file_id>
// and the worker fetches that PDF from Google Drive with a key that only Cloudflare knows.
// The key never reaches GitHub or anyone's browser.
//
// Settings (Worker → Settings → Variables and Secrets):
//   DRIVE_API_KEY    type "Secret"  — Google API key restricted to "Google Drive API" only
//   ALLOWED_ORIGINS  type "Text"    — comma-separated sites allowed to use this worker, e.g.
//                    https://kevinzkevier85.github.io,http://localhost:8765,http://127.0.0.1:8765

const FILE_PATH = /^\/file\/([A-Za-z0-9_-]{10,100})$/;

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

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { ...cors, "Access-Control-Allow-Methods": "GET", "Access-Control-Max-Age": "86400" } });
    }
    if (request.method !== "GET") return reply(405, "method not allowed");
    if (!originOk) return reply(403, "this site is not allowed to use the MedLib proxy");
    if (!env.DRIVE_API_KEY) return reply(500, "DRIVE_API_KEY is not set on the worker");

    const url = new URL(request.url);
    const m = url.pathname.match(FILE_PATH);
    if (!m) return reply(404, "use /file/<drive_file_id>");
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
