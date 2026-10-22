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
const SFX = ["good", "bad", "pass", "swish", "tick", "go", "whistle", "combo", "fanfare", "coin", "clank", "steal", "pop", "bounce", "rip", "zip"];
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
// Sound effects play through Web Audio once it is running: each sound is loaded
// into memory once and starts at once. An <audio> element on iPhone can take a
// few hundred milliseconds to start, which made taps sound late. The <audio>
// element is only the fallback before the sounds have loaded.
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let actx = null;
const sfxBuf = {};
function startSfxAudio() {
  if (!AudioCtx || actx) return;
  // "playback" makes Web Audio play with the ring switch on silent, like the voice does.
  try { if (navigator.audioSession) navigator.audioSession.type = "playback"; } catch (e) { /* older Safari */ }
  actx = new AudioCtx();
  if (actx.resume) actx.resume().catch(() => {});
  for (const k of SFX) {
    fetch(`sfx/${k}.wav`).then(r => r.arrayBuffer())
      .then(b => new Promise((ok, bad) => actx.decodeAudioData(b, ok, bad)))
      .then(buf => { sfxBuf[k] = buf; }).catch(() => {});
  }
}
function sfx(kind) {
  if (!soundOn) return;
  if (actx && sfxBuf[kind] && actx.state === "running") {
    const src = actx.createBufferSource();
    src.buffer = sfxBuf[kind];
    src.connect(actx.destination);
    src.start();
    return;
  }
  if (actx && actx.state !== "running") actx.resume().catch(() => {});
  playEl(sfxEls[kind], `sfx/${kind}.wav`);
}

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

// iPhones only allow sound after a real tap, and only from a tap event (touchend
// or click, not pointerdown). A swipe or a scroll does not count. So on each touch,
// until it works, play a silent sound on every audio element; sound counts as
// unlocked only once one of those actually plays.
let audioUnlocked = false;
function unlockAudio() {
  // After the phone sleeps or the app is in the background, iPhone pauses Web Audio;
  // any tap wakes it back up.
  if (actx && actx.state !== "running") actx.resume().catch(() => {});
  if (audioUnlocked) return;
  startSfxAudio();
  for (const a of [voiceEl, ...Object.values(sfxEls)]) {
    if (a.src && !a.src.startsWith("data:") && !a.paused) continue;
    a.src = SILENT;
    a.play().then(() => { audioUnlocked = true; }).catch(() => {});
  }
}
["touchend", "click", "keydown"].forEach(ev => document.addEventListener(ev, unlockAudio, { capture: true }));

// ---------- Players and save data ----------
// Each player on this phone is a look (face, jersey, number; never a name) with
// a save of their own. Everything stays in this phone's storage: the game has
// no server and sends nothing anywhere.
const profiles = Object.assign({ list: [], current: null }, JSON.parse(localStorage.getItem("fiveout-profiles") || "{}"));
function saveProfiles() { localStorage.setItem("fiveout-profiles", JSON.stringify(profiles)); }
// Saves from before players existed become player 1, who picks a look next.
if (!profiles.list.length && (localStorage.getItem("fiveout-save") || localStorage.getItem("fiveout-stars"))) {
  profiles.list.push({ id: "p1", look: null });
  profiles.current = "p1";
  localStorage.setItem("fiveout-save-p1", localStorage.getItem("fiveout-save") || "{}");
  localStorage.removeItem("fiveout-save");
  saveProfiles();
}
let saveKey = profiles.current ? "fiveout-save-" + profiles.current : null;
const SAVE_DEFAULTS = () => ({ stars: {}, xp: 0, streak: 0, lastDay: null, best: {}, medals: {}, unlockAll: false, seenGames: {},
  cards: {}, newCards: [], packs: 0, sinceLegend: 0, bags: {}, days: [], restDays: [], passes: 1, daily: null, cheered: {} });
const save = Object.assign(SAVE_DEFAULTS(), JSON.parse((saveKey && localStorage.getItem(saveKey)) || "{}"));
// Stars from the first version of the game.
const oldStars = JSON.parse(localStorage.getItem("fiveout-stars") || "null");
if (oldStars && !Object.keys(save.stars).length) save.stars = oldStars;
localStorage.removeItem("fiveout-stars");
function persist() { if (saveKey) localStorage.setItem(saveKey, JSON.stringify(save)); }
let onXP = null; // the daily challenges listen here (js/rewards.js)
function addXP(n) { save.xp += n; persist(); if (onXP) onXP(n); }

// ---------- Days and the streak ----------
const dayKey = d => d.toLocaleDateString("en-CA");
const dayNum = key => { const [y, m, d] = key.split("-").map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); };
const numDay = n => new Date(n * 864e5).toISOString().slice(0, 10);
const today = () => dayKey(new Date());
const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100];
const MAX_PASSES = 2;
// Counts a day of play (a lesson or a bonus game). The first time on a new day it
// returns what happened: { streak, used (Rest Day Passes spent), milestone }.
// A missed day is covered by a Rest Day Pass, if the player has one.
function touchStreak() {
  const t = today();
  if (save.lastDay === t) return null;
  const gap = save.lastDay ? dayNum(t) - dayNum(save.lastDay) : 1;
  let used = 0;
  if (gap === 1) save.streak++;
  else if (gap > 1 && gap - 1 <= save.passes) {
    used = gap - 1;
    save.passes -= used;
    for (let i = 1; i < gap; i++) save.restDays.push(numDay(dayNum(save.lastDay) + i));
    save.streak++;
  } else save.streak = 1;
  save.lastDay = t;
  save.days.push(t);
  save.days = save.days.slice(-60); save.restDays = save.restDays.slice(-30);
  const milestone = STREAK_MILESTONES.includes(save.streak);
  // Every milestone after the first earns a Rest Day Pass.
  if (milestone && save.streak >= 7) save.passes = Math.min(MAX_PASSES, save.passes + 1);
  persist();
  return { streak: save.streak, used, milestone };
}
// The streak shown on the home screen: alive if they played today or yesterday,
// or if their Rest Day Passes can cover the days they missed.
function liveStreak() {
  if (!save.lastDay) return 0;
  const missed = dayNum(today()) - dayNum(save.lastDay) - 1;
  return missed <= save.passes ? save.streak : 0;
}

// Paper confetti in Eagles colors, with a few little basketballs.
function confetti() {
  const colors = ["#f97316", "#1e3a8a", "#ffc800", "#ffffff", "#58cc02", "#1cb0f6"];
  for (let i = 0; i < 34; i++) {
    const ballBit = i % 7 === 0;
    const c = html("div", "confetti" + (ballBit ? " ball" : ""), document.body, ballBit ? icon("ball") : "");
    if (!ballBit) { c.style.background = colors[i % colors.length]; c.style.width = 7 + Math.random() * 6 + "px"; c.style.height = 10 + Math.random() * 8 + "px"; }
    c.style.left = Math.random() * 100 + "vw";
    c.style.animationDuration = 1.8 + Math.random() * 1.8 + "s";
    c.style.animationDelay = Math.random() * .6 + "s";
    setTimeout(() => c.remove(), 4500);
  }
}
