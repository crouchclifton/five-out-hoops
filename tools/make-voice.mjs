// Records every line the game can say as a voice clip in voice/, and writes
// voice/manifest.js listing them. Clips whose text no longer appears in the
// game are deleted. Run on a Mac after changing any game text:
//   node tools/make-voice.mjs
//
// The voice is Kokoro (open source, runs on this Mac, nothing sent anywhere)
// through the narration tool in ~/work/claude-toolkit/narration. Set it up once
// with that folder's ./setup.sh kokoro. Changing VOICE or SPEED re-records
// every clip.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VOICE = "am_adam";    // Kokoro's male US voices: am_adam, am_michael, am_fenrir, am_puck, am_echo
const SPEED = "1.1";        // 1.0 is normal; Clifton picked Adam a little faster
const NARRATE = process.env.NARRATE || path.join(os.homedir(), "work/claude-toolkit/narration/narrate.py");
const PYTHON = process.env.KOKORO_PYTHON || path.join(os.homedir(), ".local/share/cru-narration/kokoro-venv/bin/python");

const root = path.join(path.dirname(new URL(import.meta.url).pathname), "..");
const read = f => fs.readFileSync(path.join(root, f), "utf8");

// Use the game's own cleanSpeech() and voiceKey(), so the file names always match.
const core = read("js/core.js");
const grab = name => core.match(new RegExp(`function ${name}\\([\\s\\S]*?\\n}\\n`))[0];
const { cleanSpeech, voiceKey } = new Function(`${grab("cleanSpeech")}${grab("voiceKey")}return { cleanSpeech, voiceKey };`)();

// Spoken text can be in any game script (icons.js is only drawings, core.js only code).
const code = fs.readdirSync(path.join(root, "js")).filter(f => f.endsWith(".js") && !["icons.js", "core.js"].includes(f)).sort()
  .map(f => read("js/" + f)).join("\n");

// Values that can fill each ${...} in a spoken template.
const ids = ["1", "2", "3", "4", "5"];
function valuesFor(expr) {
  if (/\.id$/.test(expr)) return ids;
  if (/^spotWord\(/.test(expr)) return ["top", "wing", "corner"];
  // The Big Game: 6 turns, at most 4 reads (1 point each) and a basket (2) per turn.
  if (expr === "points") return Array.from({ length: 41 }, (_, i) => String(i));
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
  if (/^#[0-9a-f]{3,8}$/i.test(variants[0]) || /^M-?[\d.]/.test(variants[0])) continue; // colors and SVG paths
  if (/^[\d.,\s-]+$/.test(variants[0])) continue; // numbers only, like SVG points
  for (const v of variants) {
    const t = cleanSpeech(v.replace(/\\'/g, "'"));
    // Speech starts like a sentence; class names and other code strings start lowercase.
    if (/^([A-Z0-9]|number )/.test(t) && (t.includes(" ") || /[!.?]$/.test(t))) lines.add(t);
  }
}

const outDir = path.join(root, "voice");
fs.mkdirSync(outDir, { recursive: true });

// A different voice means every clip has to be recorded again.
const stampFile = path.join(outDir, "voice.txt");
const stamp = `kokoro ${VOICE} ${SPEED}\n`;
if (!fs.existsSync(stampFile) || fs.readFileSync(stampFile, "utf8") !== stamp) {
  for (const f of fs.readdirSync(outDir)) if (f.endsWith(".m4a")) fs.unlinkSync(path.join(outDir, f));
}

const keys = new Set();
const todo = [];
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "five-out-voice-"));
for (const t of lines) {
  const key = voiceKey(t);
  keys.add(key);
  if (!fs.existsSync(path.join(outDir, key + ".m4a"))) todo.push({ text: t, out: path.join(tmpDir, key + ".wav") });
}
if (todo.length) {
  const jobs = path.join(tmpDir, "jobs.json");
  fs.writeFileSync(jobs, JSON.stringify(todo));
  execFileSync(PYTHON, [NARRATE, "--engine", "kokoro", "--voice", VOICE, "--speed", SPEED, "--jobs", jobs], { stdio: "inherit" });
  for (const j of todo) {
    execFileSync("afconvert", ["-f", "m4af", "-d", "aac", "-b", "40000", "-c", "1", j.out,
      path.join(outDir, path.basename(j.out, ".wav") + ".m4a")]);
  }
}
fs.rmSync(tmpDir, { recursive: true, force: true });
fs.writeFileSync(stampFile, stamp);
const made = todo.length;
let removed = 0;
for (const f of fs.readdirSync(outDir)) {
  if (f.endsWith(".m4a") && !keys.has(f.slice(0, -4))) { fs.unlinkSync(path.join(outDir, f)); removed++; }
}
// When each clip actually has speech, so the coach's mouth moves only while he
// is talking (not through the quiet at the start, the end and between sentences).
// Each clip gets [[start, end], ...] in seconds.
function speechTimes(file) {
  const wav = path.join(os.tmpdir(), "five-out-timing.wav");
  execFileSync("afconvert", ["-f", "WAVE", "-d", "LEI16@8000", "-c", "1", file, wav]);
  const buf = fs.readFileSync(wav);
  fs.unlinkSync(wav);
  const at = buf.indexOf("data");
  const pcm = new Int16Array(buf.buffer.slice(buf.byteOffset + at + 8, buf.byteOffset + at + 8 + buf.readUInt32LE(at + 4)));
  const win = 160; // 20 ms windows
  const level = [];
  for (let i = 0; i + win <= pcm.length; i += win) {
    let m = 0;
    for (let j = i; j < i + win; j++) m = Math.max(m, Math.abs(pcm[j]));
    level.push(m);
  }
  const loud = Math.max(...level) * 0.06;
  const segs = [];
  level.forEach((v, i) => {
    if (v <= loud) return;
    const t = i * 0.02, last = segs[segs.length - 1];
    if (last && t - last[1] < 0.16) last[1] = t + 0.02; // a short gap is part of the same phrase
    else segs.push([t, t + 0.02]);
  });
  return segs.map(([a, b]) => [+a.toFixed(2), +b.toFixed(2)]);
}
const times = {};
for (const k of [...keys].sort()) times[k] = speechTimes(path.join(outDir, k + ".m4a"));
fs.writeFileSync(path.join(outDir, "manifest.js"),
  "// Built by tools/make-voice.mjs. Lists the voice clips that exist, and when\n" +
  "// each one has speech ([start, end] seconds), for the coach's mouth.\n" +
  `window.VOICE = new Set(${JSON.stringify([...keys].sort())});\n` +
  `window.VOICE_TIMES = ${JSON.stringify(times)};\n`);
fs.writeFileSync(path.join(outDir, "lines.txt"), [...lines].sort().join("\n") + "\n");
console.log(`${lines.size} lines: ${made} recorded, ${removed} removed`);
// The voice manifest changed, so the service worker needs a new build stamp.
execFileSync("node", [path.join(root, "tools/stamp.mjs")], { stdio: "inherit" });
