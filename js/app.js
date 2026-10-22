"use strict";
// Screens and flow: the lesson path, rewards, bonus games, players, coach notes.

const SCREENS = ["home", "game", "step", "reward", "mini", "notes", "pack", "binder", "players", "maker"];
const show = id => SCREENS.forEach(s => $("#" + s).classList.toggle("hidden", s !== id));
// Each unit has its own color and court: Unit 1 outside, Unit 2 in the Eagles gym.
const UNITS = [
  { title: "Unit 1: The 5-Out", sub: "Outdoor court: spots, cuts and filling", lessons: [0, 1, 2], color: "#f97316", dark: "#c2410c", court: "park" },
  { title: "Unit 2: Read the Defense", sub: "Eagles Gym: give and go, attack, big game", lessons: [3, 4, 5], color: "#1e3a8a", dark: "#172554", court: "gym" },
];
const unitOf = i => UNITS.find(u => u.lessons.includes(i));
const ZIGZAG = [0, -70, -100, -70, 0, 70, 100, 70];
const TIPS = [
  "Remember: pass and move! Never stand still.",
  "Spread out! Stay outside the big line.",
  "If your defender is not in the way, attack the basket!",
  "When a spot opens up, fill it!",
  "Look for the open cutter. Give and go!",
];
// Small drawings for the unit banners: a park hoop, and the Eagles mascot's face.
const UNIT_ART = [
  `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M30 46V14" stroke="#1e293b" stroke-width="3.5"/><rect x="12" y="5" width="30" height="20" rx="2" fill="#fff" stroke="#1e293b" stroke-width="2.5"/><rect x="20" y="12" width="14" height="9" fill="none" stroke="#ef4444" stroke-width="2"/><ellipse cx="24" cy="25" rx="8" ry="2.5" fill="none" stroke="#ea580c" stroke-width="3"/><path d="M17 26l3 9M24 27v9M31 26l-3 9" stroke="#fff" stroke-width="1.6"/></svg>`,
  EAGLE_SVG.replace('viewBox="0 0 100 110"', 'viewBox="24 10 52 54"'),
];

let homeCoach, rewardCoach;

const isUnlocked = i => save.unlockAll || i === 0 || (save.stars[i - 1] || 0) > 0;
const lessonOfGame = id => LESSONS.findIndex(l => l.game === id);
const gameUnlocked = id => save.unlockAll || (save.stars[lessonOfGame(id)] || 0) > 0;
const unlockedGames = () => Object.keys(GAMES).filter(gameUnlocked);

function stopRun() {
  RUN++;
  hush();
  players.forEach(p => p.anim = null);
  if (ball) ball.anim = null;
  miniGame = null;
}

function renderSound() { document.querySelectorAll(".soundbtn").forEach(b => b.innerHTML = icon(soundOn ? "soundOn" : "soundOff")); }
function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem("fiveout-sound", soundOn ? "on" : "off");
  if (!soundOn) hush();
  renderSound();
}

// ---------- Home: the lesson path ----------
function heroSay(text, speakIt = true) {
  $("#heroBubble").innerHTML = text;
  if (speakIt && audioUnlocked) speak(text);
}
// The first time someone taps the home screen (not a button), say the greeting:
// before that tap the phone won't play sound.
let greeted = false;
document.addEventListener("click", e => {
  if (greeted || $("#home").classList.contains("hidden") || e.target.closest("button")) return;
  greeted = true;
  speak($("#heroBubble").innerHTML);
});
function renderHome(greet = true) {
  stopRun();
  show("home");
  setActiveCoach(homeCoach);
  homeCoach.mood("idle");
  const me = currentPlayer();
  $("#meBtn").innerHTML = me && me.look ? avatarSVG(me.look, { head: true }) : icon("plus");
  const streak = liveStreak();
  $("#streakStat").innerHTML = icon(streak ? "flame" : "flameOff") + streak;
  $("#streakStat").classList.toggle("dim", !streak);
  $("#xpStat").innerHTML = icon("star") + save.xp;
  $("#cardsBtn").innerHTML = icon("cards") + ownedCount();
  $("#cardsBtn").classList.toggle("has-new", save.newCards.length > 0);
  const doneCount = LESSONS.filter((_, i) => save.stars[i]).length;
  // Always refresh the greeting; only say it out loud when asked to.
  heroSay(doneCount === 0 ? "Hi! I'm Coach Bounce! Welcome to the Eagles! Tap the glowing circle to start your first lesson!"
    : doneCount === LESSONS.length ? "You finished every lesson! Play the bonus games anytime!"
    : "Welcome back! Let's keep learning the 5-Out!", greet);
  $("#dailyBox").innerHTML = "";
  challengeList($("#dailyBox"));
  const current = LESSONS.findIndex((_, i) => !save.stars[i]);
  const path = $("#path");
  path.innerHTML = "";
  let z = 0;
  const row = (small) => {
    const r = html("div", "node-row" + (small ? " small" : ""), path);
    // Shift the circle, not the full-width row: a shifted row hangs off the side
    // of the screen and lets the path wobble sideways while scrolling.
    const x = ZIGZAG[z++ % ZIGZAG.length];
    r.style.setProperty("--x", x + "px");
    r.dataset.x = x;
    return r;
  };
  UNITS.forEach((u, ui) => {
    const head = html("div", "unit", path, `<div><h2>${u.title}</h2><p>${u.sub}</p></div><div class="unit-art">${UNIT_ART[ui]}</div>`);
    head.style.setProperty("--uc", u.color); head.style.setProperty("--ud", u.dark);
    for (const i of u.lessons) {
      const L = LESSONS[i], st = save.stars[i] || 0, open = isUnlocked(i);
      const r = row(false);
      const n = html("button", "node" + (st ? " done" : "") + (!open ? " locked" : "") + (i === current && open ? " current" : ""), r,
        icon(open ? L.glyph : "lock"));
      n.style.setProperty("--uc", u.color); n.style.setProperty("--ud", u.dark);
      if (st) html("div", "stars", n, [0, 1, 2].map(k => icon(k < st ? "star" : "starOff")).join(""));
      if (i === current && open) html("div", "start-tip", n, "START");
      n.onclick = () => {
        if (!open) { sfx("bad"); n.classList.add("shake"); setTimeout(() => n.classList.remove("shake"), 400); heroSay("Finish the lesson before this one to unlock it!"); return; }
        openSheet(i);
      };
      addBuddy(r, i);
      if (L.game) {
        const g = GAMES[L.game], gOpen = gameUnlocked(L.game);
        const gn = html("button", "node game" + (!gOpen ? " locked" : ""), row(true), icon(gOpen ? g.glyph : "lock"));
        if (save.medals[L.game]) html("div", "stars", gn, medalIcon(save.medals[L.game]));
        gn.onclick = () => {
          if (!gOpen) { sfx("bad"); heroSay("Finish the lesson above to unlock this bonus game!"); return; }
          startMini(L.game);
        };
      }
      if (BAGS[i]) {
        const id = BAGS[i], ready = st > 0 && !save.bags[id];
        const bn = html("button", "node bag" + (save.bags[id] ? " claimed" : ready ? " ready" : " locked"), row(true), icon(save.bags[id] ? "bagOpen" : "bag"));
        bn.onclick = async () => {
          if (save.bags[id]) { heroSay("You already opened this gym bag!"); return; }
          if (!ready) { sfx("bad"); heroSay("Finish the lesson above to open this gym bag!"); return; }
          await openBag(id);
          renderHome(false);
        };
      }
    }
  });
  const allDone = doneCount === LESSONS.length;
  const t = html("button", "node trophy" + (allDone ? "" : " locked"), row(false), icon("cup"));
  t.onclick = () => {
    if (allDone) { confetti(); sfx("fanfare"); heroSay("You're a 5-Out champion! Pick any bonus game!"); pickReward(); }
    else heroSay("Finish every lesson to win the trophy!");
  };
}
$("#heroCoachBtn").onclick = () => { homeCoach.flash("happy", 1500); heroSay(pick(TIPS)); };

// A character beside a lesson on the path, on the side away from the circle.
// It moves a little while it waits, and cheers the first time you come back
// after finishing that lesson.
function addBuddy(r, i) {
  const c = PATH_CAST.find(c => c.lesson === i);
  if (!c) return;
  const x = +r.dataset.x, side = x > 0 ? -1 : 1;
  const b = html("button", "buddy b-" + (c.kind || c.look.pose), r, castSVG(c));
  b.style.setProperty("--bx", side * 118 + "px");
  b.setAttribute("aria-label", c.says);
  const done = save.stars[i] > 0;
  if (done && !save.cheered[i]) {
    save.cheered[i] = true; persist();
    b.classList.add("cheer");
    html("div", "buddy-say", b, c.says);
    setTimeout(() => sfx("good"), 600);
  }
  b.onclick = () => { b.classList.remove("hop"); void b.offsetWidth; b.classList.add("hop"); speak(c.says); };
}

function openSheet(i) {
  const L = LESSONS[i], done = save.stars[i];
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  const u = unitOf(i);
  html("h2", "sheet-title", sh, `<span class="glyph-badge" style="background:${u.color}">${icon(L.glyph)}</span>Lesson ${i + 1}: ${L.title}`);
  html("p", "", sh, L.blurb + (L.game ? `<br>Bonus game: <b>${GAMES[L.game].title}</b>` : ""));
  const r = html("div", "row", sh);
  const cancel = html("button", "btn ghost", r, "Back");
  const start = html("button", "btn green", r, done ? "Practice" : "Start");
  const close = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) close(); };
  cancel.onclick = close;
  start.onclick = () => { close(); installFirst(() => startLesson(i)); };
}

// ---------- Lessons ----------
async function startLesson(i) {
  stopRun();
  const id = RUN;
  resetStats();
  points = 0; SPEED = 32; zzz = true; readPoints = false;
  players = []; defenders = []; ball = null;
  show("game");
  $("#bar").classList.remove("hidden"); $("#lessonTitle").classList.add("hidden");
  setActiveCoach(lessonCoach);
  lessonCoach.mood("idle");
  setScore(); setProgress(0, 1);
  $("#buttons").innerHTML = "";
  drawCourt(unitOf(i).court);
  try {
    await LESSONS[i].run();
  } catch (e) {
    if (e === ABORT) return;
    throw e;
  }
  if (id !== RUN) return;
  lessonComplete(i);
}

async function startWatch() {
  stopRun();
  points = 0; SPEED = 22; zzz = true; readPoints = false;
  players = []; defenders = []; ball = null;
  show("game");
  $("#bar").classList.add("hidden"); $("#lessonTitle").classList.remove("hidden");
  setActiveCoach(lessonCoach);
  lessonCoach.mood("idle");
  setScore();
  $("#buttons").innerHTML = "";
  drawCourt("gym");
  try { await watchOffense(); } catch (e) { if (e !== ABORT) throw e; }
}

function quitLesson() {
  if ($("#lessonTitle").classList.contains("hidden") === false) { renderHome(false); return; } // watch mode
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, "Wait, don't go!");
  html("p", "", sh, "If you quit now, you'll lose your progress in this lesson.");
  const r = html("div", "row", sh);
  const quit = html("button", "btn ghost", r, "Quit");
  const keep = html("button", "btn green", r, "Keep going");
  keep.onclick = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
  quit.onclick = () => { wrap.remove(); renderHome(false); };
}

// Stars, XP, card pack and streak, one screen at a time (js/rewards.js), then the bonus game.
async function lessonComplete(i) {
  const acc = stats.questions ? stats.firstTry / stats.questions : 1;
  const stars = acc >= .9 ? 3 : acc >= .7 ? 2 : 1;
  const firstTime = !save.stars[i];
  // "Perfect" means every answer right the first time, nothing less.
  const perfect = stats.firstTry === stats.questions;
  const parts = [["Finished the lesson", 10], ["Right the first time", stats.firstTry * 5], ["Three stars", stars === 3 ? 10 : 0], ["Perfect lesson", perfect ? 10 : 0]];
  const xp = parts.reduce((a, p) => a + p[1], 0);
  save.stars[i] = Math.max(save.stars[i] || 0, stars);
  addXP(xp);
  challenge("lesson"); challenge("stars", stars);
  const day = touchStreak();
  // The lesson's card pack (3 stars improves the odds). The very first pack has a
  // rare or better, and finishing the Big Game the first time adds a legendary.
  const pack = makePack("Lesson card pack!", 2, stars === 3 ? "good" : "normal",
    [null, save.packs === 0 ? "rare" : i === LESSONS.length - 1 && firstTime ? "legendary" : null]);
  await lessonRewards({ i, stars, acc, xp, parts, perfect, right: stats.firstTry, asked: stats.questions, bestCombo: stats.bestCombo, firstTime, pack, day });
  reward(i, firstTime);
}

// ---------- Rewards ----------
function reward(i, firstTime) {
  const id = LESSONS[i].game;
  if (!id) { pickReward(); return; }
  const g = GAMES[id];
  show("reward");
  setActiveCoach(rewardCoach);
  rewardCoach.mood("happy");
  const box = $("#rewardBody");
  box.innerHTML = "";
  html("div", "gift", box, `<span class="glyph-badge game big">${icon(g.glyph)}</span>`);
  html("h2", "", box, firstTime ? "New bonus game!" : "Bonus game!");
  html("p", "", box, `<b>${g.title}</b>`);
  const a = html("div", "actions", box);
  html("button", "btn gold wide", a, `Play ${g.title}!`).onclick = () => startMini(id);
  html("button", "btn ghost wide", a, "Skip").onclick = () => renderHome();
  sfx("coin");
  speak(firstTime ? "You unlocked a new bonus game!" : "You earned a bonus game!");
}

function pickReward() {
  show("reward");
  setActiveCoach(rewardCoach);
  rewardCoach.mood("happy");
  const box = $("#rewardBody");
  box.innerHTML = "";
  html("h2", "", box, "Pick a bonus game!");
  const grid = html("div", "pick-grid", box);
  for (const id of unlockedGames()) {
    const g = GAMES[id];
    html("button", "btn gold", grid, `<span class="glyph-badge game">${icon(g.glyph)}</span>${g.title}`).onclick = () => startMini(id);
  }
  const a = html("div", "actions", box);
  html("button", "btn ghost wide", a, "Skip").onclick = () => renderHome();
  sfx("coin");
  speak("Pick any bonus game!");
}

// ---------- Bonus games ----------
async function startMini(id) {
  stopRun();
  try {
    for (;;) {
      show("mini");
      const res = await playMini(id);
      const odds = ["normal", "normal", "good", "great"][res.medal];
      await showPacks([res.medal ? makePack(`${medalIcon(res.medal, "inline")} Medal card!`, 1, odds) : null, challengePack()]);
      if (res.newDay) await streakScreen(res.newDay);
      if (!res.again) break;
      RUN++;
    }
  } catch (e) {
    if (e === ABORT) return;
    throw e;
  }
  renderHome();
}

// ---------- Coach notes ----------
function openNotes() {
  show("notes");
  $("#unlockAll").checked = !!save.unlockAll;
}
$("#unlockAll").onchange = e => { save.unlockAll = e.target.checked; persist(); };
$("#resetBtn").onclick = () => confirmSheet("Erase every player?", "This removes every player on this phone, with all their stars, XP, streaks and cards. It can't be undone.", "Erase all", () => {
  Object.keys(localStorage).filter(k => k.startsWith("fiveout-") && k !== "fiveout-sound").forEach(k => localStorage.removeItem(k));
  location.reload();
});

// ---------- Home screen app (PWA) ----------
// Progress lives in this phone's storage. Ask the browser to keep it, and nudge
// players to add the game to their home screen, where it stays saved for good.
const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let installPrompt = null;
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; $("#installBtn").classList.remove("hidden"); });
window.addEventListener("appinstalled", () => $("#installBtn").classList.add("hidden"));
if (!standalone && isIOS) $("#installBtn").classList.remove("hidden");
function installSheet(firstLesson, then) {
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, `${icon("phone")} ` + (firstLesson ? "Before you play: add the game to your Home Screen" : "Add to Home Screen"));
  html("p", "", sh, "1. Tap the <b>Share</b> button in Safari (the square with an arrow pointing up).<br>2. Scroll down and tap <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>, then open the new <b>5-Out Hoops</b> icon.<br><br>" +
    "<b>Your players, stars, XP, streak and cards live in the icon, not in Safari.</b> Anything earned here in Safari won't show up in the icon, and Safari may erase it after a week.");
  const close = () => wrap.remove();
  if (then) {
    const r = html("div", "row", sh);
    html("button", "btn ghost", r, "Play in Safari").onclick = () => { close(); sessionStorage.setItem("fiveout-safari-ok", "1"); then(); };
    html("button", "btn green", r, "Got it").onclick = close;
  } else {
    html("button", "btn green wide", sh, "Got it").onclick = close;
  }
  wrap.onclick = e => { if (e.target === wrap) close(); };
}
// On iPhone Safari (not the home screen app), show how to install before a lesson,
// so a player doesn't earn stars in Safari and then lose them. Once per visit.
function installFirst(then) {
  if (standalone || !isIOS || sessionStorage.getItem("fiveout-safari-ok")) { then(); return; }
  installSheet(true, then);
}
$("#installBtn").onclick = async () => {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("#installBtn").classList.add("hidden"); return; }
  installSheet(false);
};

// ---------- Start up ----------
(function init() {
  homeCoach = createCoach(); $("#heroCoachBtn").appendChild(homeCoach.el);
  lessonCoach = createCoach(); $("#lessonCoach").appendChild(lessonCoach.el);
  stepCoach = createCoach(); $("#stepCoach").appendChild(stepCoach.el);
  rewardCoach = createCoach(); $("#rewardCoach").appendChild(rewardCoach.el);
  miniCoach = createCoach();
  packCoach = createCoach(); $("#packCoach").appendChild(packCoach.el);
  makerCoach = createCoach(); $("#makerCoach").appendChild(makerCoach.el);
  $("#cardsBtn").onclick = openBinder;
  $("#meBtn").onclick = openPlayers;
  $("#binderClose").onclick = () => renderHome(false);
  $("#playersClose").onclick = () => renderHome(false);
  $("#makerBack").onclick = () => openPlayers();
  $("#quitBtn").onclick = quitLesson;
  $("#miniQuit").onclick = () => renderHome(false);
  $("#watchBtn").onclick = startWatch;
  $("#notesBtn").onclick = openNotes;
  $("#notesClose").onclick = () => renderHome(false);
  document.querySelectorAll(".soundbtn").forEach(b => b.onclick = toggleSound);
  renderSound();
  // A new phone makes its first player before anything else; a player saved
  // before profiles existed picks a look first.
  const me = currentPlayer();
  if (!me) openMaker(null);
  else if (!me.look) openMaker(me);
  else renderHome();
})();
