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

// Spoken text lives in these files.
const code = ["js/lessons.js", "js/minigames.js", "js/app.js"].map(read).join("\n");

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
  if (/^#[0-9a-f]{3,8}$/i.test(variants[0]) || /^M-?[\d.]/.test(variants[0])) continue; // colors and SVG paths
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
fs.writeFileSync(path.join(outDir, "manifest.js"),
  "// Built by tools/make-voice.mjs. Lists the voice clips that exist.\n" +
  `window.VOICE = new Set(${JSON.stringify([...keys].sort())});\n`);
fs.writeFileSync(path.join(outDir, "lines.txt"), [...lines].sort().join("\n") + "\n");
console.log(`${lines.size} lines: ${made} recorded, ${removed} removed`);
