// MedLib service worker: install as an app + open offline.
// Bump VERSION with every release (same number as version.json) so old caches are cleared.
const VERSION = "0.24.0";
const CACHE = "medlib-" + VERSION;
const SHELL = [
  "./", "./index.html", "./manifest.webmanifest",
  `./styles.css?v=${VERSION}`, `./app.js?v=${VERSION}`, `./quiz.js?v=${VERSION}`,
  `./lib/validate.js?v=${VERSION}`, `./lib/quizcore.js?v=${VERSION}`,
  "./vendor/pdf.min.js", "./vendor/pdf.worker.min.js",
  "./icons/icon.svg", "./icons/icon-192.png", "./icons/apple-touch-icon.png",
  "./version.json", "./defaults.json", "./site.json",
];
const NEVER = /\/config\.json$/; // local-only file that may hold a key: never cached

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith("medlib-") && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const put = (req, res) => { if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); } return res; };

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (NEVER.test(url.pathname)) return;
  const same = url.origin === location.origin;
  // Fonts and same-origin images / PDF.js: cache first (they rarely change)
  if (url.host.endsWith("fonts.googleapis.com") || url.host.endsWith("fonts.gstatic.com") || (same && /\/(img|icons|vendor)\//.test(url.pathname))) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => put(req, res))));
    return;
  }
  if (!same) return; // Drive / Worker / other sites: PDFs are kept in IndexedDB by the app
  // Pages, code and exam data: network first so new content shows when online, cache when offline
  e.respondWith(fetch(req).then((res) => put(req, res)).catch(() =>
    caches.match(req, { ignoreSearch: req.mode === "navigate" }).then((hit) => hit || (req.mode === "navigate" ? caches.match("./index.html") : Response.error()))));
});

// The app can ask to cache a list of URLs (e.g. every exam image) for offline use
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "cache-urls" || !Array.isArray(d.urls)) return;
  e.waitUntil((async () => {
    const c = await caches.open(CACHE); let done = 0;
    for (const u of d.urls) {
      try { if (!(await c.match(u))) { const r = await fetch(u); if (r.ok) await c.put(u, r); } } catch (err) { /* skip, try again next time */ }
      done++;
      if (done % 20 === 0 || done === d.urls.length) e.source && e.source.postMessage({ type: "cache-progress", done, total: d.urls.length });
    }
  })());
});
