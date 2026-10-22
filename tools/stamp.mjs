// Writes a build stamp into sw.js: a short hash of every file the service worker
// saves. When any of them changes, the stamp changes, so phones replace their
// saved copy of the game (and pick up new voice clips) on the next visit.
// make-voice.mjs runs this; run it yourself before a commit that changes code:
//   node tools/stamp.mjs
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const swFile = path.join(root, "sw.js");
const sw = fs.readFileSync(swFile, "utf8");
const files = ["index.html", "css/style.css", "manifest.webmanifest", "voice/manifest.js",
  ...fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js")).sort().map(f => "js/" + f)];
const h = crypto.createHash("sha256");
for (const f of files) h.update(f + "\0" + fs.readFileSync(path.join(root, f)));
// sw.js itself counts too, minus its own stamp line.
h.update(sw.replace(/^const BUILD = .*$/m, ""));
const stamp = h.digest("hex").slice(0, 10);
const next = sw.replace(/^const BUILD = .*$/m, `const BUILD = "${stamp}";`);
if (next !== sw) fs.writeFileSync(swFile, next);
console.log(`sw.js build ${stamp}${next === sw ? " (unchanged)" : ""}`);
