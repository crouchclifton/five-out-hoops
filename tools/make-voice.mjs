// Records every line the game can say as a voice clip in voice/, using the
// Mac's built-in "say" voice, and writes voice/manifest.js listing them.
// Run on a Mac after changing any game text:   node tools/make-voice.mjs
// Clips whose text no longer appears in the game are deleted.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const VOICE = "Samantha";
const RATE = "175"; // words per minute; a little slower than normal for young kids

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

// Use the game's own cleanSpeech() and voiceKey(), so the file names always match.
const grab = name => html.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n`))[0];
const { cleanSpeech, voiceKey } = new Function(`${grab("cleanSpeech")}${grab("voiceKey")}return { cleanSpeech, voiceKey };`)();

// Spoken text lives between "Basketball actions" and the end of finishLevel().
const start = html.indexOf("// ---------- Basketball actions");
const end = html.indexOf("function confetti");
const code = html.slice(start, end);

// Values that can fill each ${...} in a spoken template.
const ids = ["1", "2", "3", "4", "5"];
function valuesFor(expr) {
  if (/\.id$/.test(expr)) return ids;
  if (/^spotWord\(/.test(expr)) return ["top", "wing", "corner"];
  // Level 6 has 8 turns worth 2 points each, so 30 leaves room to spare.
  if (expr === "points") return Array.from({ length: 16 }, (_, i) => String(i * 2));
  return null;
}

const lines = new Set();
const literal = /"((?:[^"\\\n]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
for (const m of code.matchAll(literal)) {
  let variants = [m[1] ?? m[2]];
  const exprs = [...new Set([...(m[2] ?? "").matchAll(/\$\{([^}]*)\}/g)].map(x => x[1]))];
  let usable = true;
  for (const e of exprs) {
    const vals = valuesFor(e);
    if (!vals) { usable = false; break; }
    variants = variants.flatMap(v => vals.map(val => v.split("${" + e + "}").join(val)));
  }
  if (!usable) continue; // a template that is not speech (CSS, transforms and so on)
  for (const v of variants) {
    const t = cleanSpeech(v.replace(/\\'/g, "'"));
    if (/[a-z]/i.test(t) && (t.includes(" ") || /[!.?]$/.test(t))) lines.add(t);
  }
}

const outDir = path.join(root, "voice");
fs.mkdirSync(outDir, { recursive: true });
const keys = new Set();
const tmp = path.join(outDir, "_tmp.aiff");
let made = 0;
for (const t of lines) {
  const key = voiceKey(t);
  keys.add(key);
  const out = path.join(outDir, key + ".m4a");
  if (fs.existsSync(out)) continue;
  execFileSync("say", ["-v", VOICE, "-r", RATE, "-o", tmp, t]);
  execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "32000", "-c", "1", tmp, out]);
  made++;
}
if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
let removed = 0;
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".m4a") && !keys.has(f.slice(0, -4))) { fs.unlinkSync(path.join(outDir, f)); removed++; }
}
fs.writeFileSync(path.join(outDir, "manifest.js"),
  "// Built by tools/make-voice.mjs. Lists the voice clips that exist.\n" +
  `window.VOICE = new Set(${JSON.stringify([...keys].sort())});\n`);
fs.writeFileSync(path.join(outDir, "lines.txt"), [...lines].sort().join("\n") + "\n");
console.log(`${lines.size} lines: ${made} recorded, ${removed} removed`);
