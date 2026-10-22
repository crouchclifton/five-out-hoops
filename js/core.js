"use strict";
// Shared helpers, sound, and save data. Loaded first; everything else uses these globals.

const $ = s => document.querySelector(s);
const NS = "http://www.w3.org/2000/svg";
function el(tag, attrs, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
function html(tag, cls, parent, inner) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (inner !== undefined) e.innerHTML = inner;
  if (parent) parent.appendChild(e);
  return e;
}
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];

// ---------- Runs and timing ----------
// Every lesson or mini game is a "run". Leaving bumps RUN, and any sleep() that
// wakes up in an old run throws ABORT, which quietly stops that run's script.
let RUN = 0;
const ABORT = new Error("abort");
const sleepRaw = ms => new Promise(r => setTimeout(r, ms));
async function sleep(ms) { const id = RUN; await sleepRaw(ms); if (id !== RUN) throw ABORT; }

// ---------- Sound and voice ----------
// Everything plays through <audio> elements: recorded voice clips (voice/) and
// short sound effects (sfx/). iPhone Safari treats these like video sound, so
// they play in silent mode and don't fight each other. The phone's built-in
// speech (speechSynthesis) was silent on iPhones and knocked out the other
// sounds, so the game does not use it.
// voice/ is built by tools/make-voice.mjs from the text in the js/ files.
let soundOn = localStorage.getItem("fiveout-sound") !== "off";
function cleanSpeech(html) {
  return html.replace(/<[^>]+>/g, "").replace(/#(\d)/g, "number $1")
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();
}
function voiceKey(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}
const SILENT = "data:audio/wav;base64,UklGRtwBAABXQVZFZm10IBAAAAABAAEAIlYAAESsAAACABAAZGF0YbgBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
const SFX = ["good", "bad", "pass", "swish", "tick", "go", "whistle", "combo", "fanfare", "coin", "clank", "steal", "pop", "bounce"];
const voiceEl = new Audio();
const sfxEls = Object.fromEntries(SFX.map(k => [k, new Audio()]));
function playEl(el, src) {
  if (!soundOn) { const off = Promise.reject(new Error("sound off")); off.catch(() => {}); return off; }
  if (!el.src.endsWith(src)) el.src = src;
  else { el.pause(); el.currentTime = 0; }
  const p = el.play();
  p.catch(() => {});
  return p;
}
function sfx(kind) { playEl(sfxEls[kind], `sfx/${kind}.wav`); }

// The coach on screen moves his mouth while he is talking. Each clip comes with
// the times it has speech (VOICE_TIMES, from tools/make-voice.mjs), so the mouth
// stops for the quiet before, between and after sentences.
let activeCoach = null;
let fakeTalk = 0;
function setActiveCoach(c) { if (activeCoach && activeCoach !== c) activeCoach.talk(false); activeCoach = c; }
for (const ev of ["ended", "pause", "error"]) voiceEl.addEventListener(ev, () => activeCoach && activeCoach.talk(false));

// Says a line. Returns a promise that resolves when the line is over: when the
// clip ends, or after about as long as the line takes to say when there is no
// sound. A newer line, or leaving the screen, ends the old one early.
let endSpeech = () => {};
const speechTime = t => 600 + t.length * 62;
function speak(html) {
  const t = cleanSpeech(html);
  const key = voiceKey(t);
  endSpeech();
  clearTimeout(fakeTalk);
  let timer = 0, finish;
  const done = new Promise(r => finish = r);
  let live = true;
  const end = () => {
    live = false;
    clearTimeout(timer);
    voiceEl.removeEventListener("ended", end);
    voiceEl.removeEventListener("error", end);
    if (endSpeech === end) endSpeech = () => {};
    finish();
  };
  endSpeech = end;
  if (!t) { voiceEl.pause(); end(); return done; }
  if (soundOn && window.VOICE && VOICE.has(key)) {
    voiceEl.addEventListener("ended", end);
    voiceEl.addEventListener("error", end);
    // Mouth on only during speech; the line is over when the last words end,
    // not when the file's trailing quiet runs out.
    const segs = (window.VOICE_TIMES && VOICE_TIMES[key]) || null;
    const lipSync = () => {
      if (!live) return;
      const t = voiceEl.currentTime, playing = !voiceEl.paused && voiceEl.currentTime > 0;
      const on = playing && (segs ? segs.some(([a, b]) => t >= a && t < b) : true);
      if (activeCoach) activeCoach.talk(on);
      if (playing && segs && segs.length && t >= segs[segs.length - 1][1]) { if (activeCoach) activeCoach.talk(false); end(); return; }
      requestAnimationFrame(lipSync);
    };
    requestAnimationFrame(lipSync);
    // If the phone blocks the clip, wait as if it had played. The long timer is a
    // safety net in case "ended" never arrives.
    playEl(voiceEl, `voice/${key}.m4a`).catch(() => { if (endSpeech === end) { clearTimeout(timer); timer = setTimeout(end, speechTime(t)); } });
    timer = setTimeout(end, speechTime(t) * 2 + 4000);
    return done;
  }
  // No sound: still flap the coach's mouth for about as long as the line takes.
  voiceEl.pause();
  if (activeCoach) {
    activeCoach.talk(true);
    fakeTalk = setTimeout(() => activeCoach && activeCoach.talk(false), Math.min(4000, speechTime(t)));
  }
  timer = setTimeout(end, speechTime(t));
  return done;
}
function hush() { voiceEl.pause(); endSpeech(); }

// iPhones only allow sound after the first real tap, and only from a tap event
// (touchend or click, not pointerdown). On that first tap, play a silent sound
// on every audio element; after that the game may play them whenever it wants.
let audioUnlocked = false;
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  for (const a of [voiceEl, ...Object.values(sfxEls)]) {
    a.src = SILENT;
    a.play().catch(() => {});
  }
}
["touchend", "click", "keydown"].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true }));

// ---------- Save data ----------
const save = Object.assign(
  { stars: {}, xp: 0, streak: 0, lastDay: null, best: {}, medals: {}, unlockAll: false, seenGames: {},
    cards: {}, newCards: [], packs: 0, sinceLegend: 0 },
  JSON.parse(localStorage.getItem("fiveout-save") || "{}"));
// Stars from the first version of the game.
const oldStars = JSON.parse(localStorage.getItem("fiveout-stars") || "null");
if (oldStars && !Object.keys(save.stars).length) save.stars = oldStars;
function persist() { localStorage.setItem("fiveout-save", JSON.stringify(save)); }
function addXP(n) { save.xp += n; persist(); }
const dayKey = d => d.toLocaleDateString("en-CA");
// Yesterday by the calendar, not "24 hours ago", so a daylight saving day can't break a streak.
const yesterday = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dayKey(d); };
// Counts a day of play (a lesson or a bonus game). Returns true the first time it's called on a new day.
function touchStreak() {
  const today = dayKey(new Date());
  if (save.lastDay === today) return false;
  save.streak = save.lastDay === yesterday() ? save.streak + 1 : 1;
  save.lastDay = today;
  persist();
  return true;
}
// The streak shown on the home screen: still alive if they played today or yesterday.
function liveStreak() {
  return (save.lastDay === dayKey(new Date()) || save.lastDay === yesterday()) ? save.streak : 0;
}

function confetti() {
  const bits = ["🏀", "⭐", "🎉", "✨", "🔥"];
  for (let i = 0; i < 28; i++) {
    const c = html("div", "confetti", document.body, pick(bits));
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    c.style.animationDelay = Math.random() * .6 + "s";
    setTimeout(() => c.remove(), 4500);
  }
}
