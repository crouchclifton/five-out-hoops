// Service worker: lets the game install to the home screen and play with no signal.
// Code and pages: network first, but after 3 seconds with no answer use the saved
// copy, so a weak gym signal can't leave a blank screen.
// Sound files: cache first, since a clip's name changes whenever its words do.
// BUILD is rewritten by tools/stamp.mjs whenever a game file changes. A new BUILD
// makes phones install a fresh cache (with every new voice clip) and drop the old one.
const BUILD = "4027cd8083";
const CACHE = "five-out-hoops-" + BUILD;
const SHELL = [
  "./", "index.html", "css/style.css", "manifest.webmanifest",
  "js/core.js", "js/coach.js", "js/lessons.js", "js/minigames.js", "js/cards.js", "js/app.js", "voice/manifest.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  ...["good", "bad", "pass", "swish", "tick", "go", "whistle", "combo", "fanfare", "coin", "clank", "steal", "pop", "bounce", "rip", "zip"].map(s => `sfx/${s}.wav`),
];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(CACHE);
    await c.addAll(SHELL.map(u => new Request(u, { cache: "reload" })));
    // Every voice clip, so the coach still talks offline. Clips already saved by an
    // older version are copied over instead of downloaded again.
    try {
      const m = await (await fetch("voice/manifest.js", { cache: "no-store" })).text();
      const keys = JSON.parse(/new Set\((\[.*?\])\)/.exec(m)[1]);
      // Six downloads at a time, so the clips don't crowd out the game's own files.
      const todo = keys.slice();
      await Promise.all(Array.from({ length: 6 }, async () => {
        for (let k; (k = todo.shift());) {
          const url = new URL(`voice/${k}.m4a`, self.registration.scope).href;
          const old = await caches.match(url);
          if (old) { await c.put(url, old); continue; }
          const res = await fetch(url).catch(() => null);
          if (res && res.ok) await c.put(url, res);
        }
      }));
    } catch (err) { /* the clips will be cached as they are played instead */ }
    self.skipWaiting();
  })());
});
self.addEventListener("activate", e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE && k.startsWith("five-out-hoops")) await caches.delete(k);
  await self.clients.claim();
})()));

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
    const saved = () => c.match(req, { ignoreSearch: true }).then(r => r || c.match("index.html"));
    const net = fetch(req, { cache: "no-cache" }).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    });
    // Whichever comes first: the network, or the saved copy after 3 seconds.
    const slow = new Promise(r => setTimeout(r, 3000)).then(saved);
    try {
      return await Promise.race([net, slow.then(r => r || net)]);
    } catch (err) {
      return (await saved()) || Response.error();
    }
  })());
});
