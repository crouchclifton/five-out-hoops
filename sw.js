// Service worker: lets the game install to the home screen and play with no signal.
// Code and pages: network first, so updates arrive whenever there is a connection.
// Sound files: cache first, since a clip's name changes whenever its words do.
const CACHE = "five-out-hoops";
const SHELL = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/core.js", "js/coach.js", "js/lessons.js", "js/minigames.js", "js/app.js", "voice/manifest.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  ...["good", "bad", "pass", "swish", "tick", "go", "whistle", "combo", "fanfare", "coin", "clank", "steal", "pop", "bounce"].map(s => `sfx/${s}.wav`),
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL);
    // Every voice clip, so the coach still talks offline.
    try {
      const m = await (await fetch("voice/manifest.js", { cache: "no-store" })).text();
      const keys = JSON.parse(m.slice(m.indexOf("["), m.lastIndexOf("]") + 1));
      await c.addAll(keys.map(k => `voice/${k}.m4a`));
    } catch (err) { /* the clips will be cached as they are played instead */ }
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

// Safari asks for audio in pieces (Range requests). Answer those from the cached file.
async function ranged(req, res) {
  const range = req.headers.get("range");
  if (!range || !res) return res;
  const buf = await res.arrayBuffer();
  const [, a, b] = /bytes=(\d*)-(\d*)/.exec(range) || [];
  const start = a ? +a : 0, end = b ? Math.min(+b, buf.byteLength - 1) : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    "Content-Type": res.headers.get("Content-Type") || "audio/mp4",
    "Content-Range": `bytes ${start}-${end}/${buf.byteLength}`,
    "Content-Length": String(end - start + 1), "Accept-Ranges": "bytes" } });
}

self.addEventListener("fetch", e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  const isMedia = /\/(voice|sfx)\/.+\.(m4a|wav)$/.test(url.pathname) || url.pathname.includes("/icons/");
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    if (isMedia) {
      const key = url.origin + url.pathname;
      let res = await c.match(key);
      if (!res) {
        res = await fetch(key);
        if (res.ok) await c.put(key, res.clone());
      }
      return ranged(req, res);
    }
    try {
      const res = await fetch(req, { cache: "no-cache" });
      if (res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      return (await c.match(req, { ignoreSearch: true })) || (await c.match("index.html"));
    }
  })());
});
