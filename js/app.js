"use strict";
// Screens and flow: the lesson path, lesson complete, rewards, bonus games, coach notes.

const SCREENS = ["home", "game", "complete", "reward", "mini", "notes"];
const show = id => SCREENS.forEach(s => $("#" + s).classList.toggle("hidden", s !== id));
const UNITS = [
  { title: "Unit 1: The 5-Out", sub: "Spots, cuts and filling", lessons: [0, 1, 2] },
  { title: "Unit 2: Read the Defense", sub: "Give and go, attack, big game", lessons: [3, 4, 5] },
];
const ZIGZAG = [0, -70, -100, -70, 0, 70, 100, 70];
const TIPS = [
  "Remember: pass and move! Never stand still.",
  "Spread out! Stay outside the big line.",
  "If your defender is sleeping, attack the basket!",
  "When a spot opens up, fill it!",
  "Look for the open cutter. Give and go!",
];

let homeCoach, doneCoach, rewardCoach;

const isUnlocked = i => save.unlockAll || i === 0 || (save.stars[i - 1] || 0) > 0;
const lessonOfGame = id => LESSONS.findIndex(l => l.game === id);
const gameUnlocked = id => save.unlockAll || (save.stars[lessonOfGame(id)] || 0) > 0;
const unlockedGames = () => Object.keys(GAMES).filter(gameUnlocked);

function stopRun() {
  RUN++;
  voiceEl.pause();
  players.forEach(p => p.anim = null);
  if (ball) ball.anim = null;
  miniGame = null;
}

function renderSound() { document.querySelectorAll(".soundbtn").forEach(b => b.textContent = soundOn ? "🔊" : "🔇"); }
function toggleSound() {
  soundOn = !soundOn;
  localStorage.setItem("fiveout-sound", soundOn ? "on" : "off");
  if (!soundOn) voiceEl.pause();
  renderSound();
}

// ---------- Home: the lesson path ----------
function heroSay(text, speakIt = true) {
  $("#heroBubble").innerHTML = text;
  if (speakIt && audioUnlocked) speak(text);
}
function renderHome(greet = true) {
  stopRun();
  show("home");
  setActiveCoach(homeCoach);
  homeCoach.mood("idle");
  const streak = liveStreak();
  $("#streakStat").innerHTML = `🔥 ${streak}`;
  $("#streakStat").classList.toggle("dim", !streak);
  $("#xpStat").innerHTML = `⭐ ${save.xp}`;
  const doneCount = LESSONS.filter((_, i) => save.stars[i]).length;
  if (greet) {
    heroSay(doneCount === 0 ? "Hi! I'm Coach Bounce! Tap the green circle to start your first lesson!"
      : doneCount === LESSONS.length ? "You finished every lesson! Play the bonus games anytime!"
      : "Welcome back! Let's keep learning the 5-Out!");
  }
  const current = LESSONS.findIndex((_, i) => !save.stars[i]);
  const path = $("#path");
  path.innerHTML = "";
  let z = 0;
  const row = (small) => {
    const r = html("div", "node-row" + (small ? " small" : ""), path);
    r.style.transform = `translateX(${ZIGZAG[z++ % ZIGZAG.length]}px)`;
    return r;
  };
  for (const u of UNITS) {
    html("div", "unit", path, `<h2>${u.title}</h2><p>${u.sub}</p>`);
    for (const i of u.lessons) {
      const L = LESSONS[i], st = save.stars[i] || 0, open = isUnlocked(i);
      const n = html("button", "node" + (st ? " done" : "") + (!open ? " locked" : "") + (i === current && open ? " current" : ""), row(false),
        open ? L.emoji : "🔒");
      if (st) html("div", "stars", n, "⭐".repeat(st) + "☆".repeat(3 - st));
      if (i === current && open) html("div", "start-tip", n, "START");
      n.onclick = () => {
        if (!open) { sfx("bad"); n.classList.add("shake"); setTimeout(() => n.classList.remove("shake"), 400); heroSay("Finish the lesson before this one to unlock it!"); return; }
        openSheet(i);
      };
      if (L.game) {
        const g = GAMES[L.game], gOpen = gameUnlocked(L.game);
        const gn = html("button", "node game" + (!gOpen ? " locked" : ""), row(true), gOpen ? g.emoji : "🎁");
        if (save.medals[L.game]) html("div", "stars", gn, MEDALS[save.medals[L.game]]);
        gn.onclick = () => {
          if (!gOpen) { sfx("bad"); heroSay("Finish the lesson above to unlock this bonus game!"); return; }
          startMini(L.game);
        };
      }
    }
  }
  const allDone = doneCount === LESSONS.length;
  const t = html("button", "node trophy" + (allDone ? "" : " locked"), row(false), "🏆");
  t.onclick = () => {
    if (allDone) { confetti(); sfx("fanfare"); heroSay("You're a 5-Out champion! Pick any bonus game!"); pickReward(); }
    else heroSay("Finish every lesson to win the trophy!");
  };
}
$("#heroCoachBtn").onclick = () => { homeCoach.flash("happy", 1500); heroSay(pick(TIPS)); };

function openSheet(i) {
  const L = LESSONS[i], done = save.stars[i];
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, `${L.emoji} Lesson ${i + 1}: ${L.title}`);
  html("p", "", sh, L.blurb + (L.game ? ` <br>🎁 Bonus game: <b>${GAMES[L.game].title}</b>` : ""));
  const r = html("div", "row", sh);
  const cancel = html("button", "btn ghost", r, "Back");
  const start = html("button", "btn green", r, done ? "Practice" : "Start");
  const close = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) close(); };
  cancel.onclick = close;
  start.onclick = () => { close(); startLesson(i); };
}

// ---------- Lessons ----------
async function startLesson(i) {
  stopRun();
  const id = RUN;
  resetStats();
  points = 0; SPEED = 32;
  players = []; defenders = []; ball = null;
  show("game");
  $("#bar").classList.remove("hidden"); $("#lessonTitle").classList.add("hidden");
  setActiveCoach(lessonCoach);
  lessonCoach.mood("idle");
  setScore(); setProgress(0, 1);
  $("#buttons").innerHTML = "";
  drawCourt();
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
  points = 0; SPEED = 22;
  players = []; defenders = []; ball = null;
  show("game");
  $("#bar").classList.add("hidden"); $("#lessonTitle").classList.remove("hidden");
  setActiveCoach(lessonCoach);
  lessonCoach.mood("idle");
  setScore();
  $("#buttons").innerHTML = "";
  drawCourt();
  try { await watchOffense(); } catch (e) { if (e !== ABORT) throw e; }
}

function quitLesson() {
  if ($("#lessonTitle").classList.contains("hidden") === false) { renderHome(false); return; } // watch mode
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, "Wait, don't go! 🏀");
  html("p", "", sh, "If you quit now, you'll lose your progress in this lesson.");
  const r = html("div", "row", sh);
  const quit = html("button", "btn ghost", r, "Quit");
  const keep = html("button", "btn green", r, "Keep going");
  keep.onclick = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
  quit.onclick = () => { wrap.remove(); renderHome(false); };
}

function lessonComplete(i) {
  const acc = stats.questions ? stats.firstTry / stats.questions : 1;
  const stars = acc >= .9 ? 3 : acc >= .7 ? 2 : 1;
  const firstTime = !save.stars[i];
  const xp = 10 + stats.firstTry * 5 + (stars === 3 ? 10 : 0);
  save.stars[i] = Math.max(save.stars[i] || 0, stars);
  addXP(xp);
  const newDay = touchStreak();
  show("complete");
  setActiveCoach(doneCoach);
  doneCoach.mood("cheer");
  $("#completeTitle").textContent = stars === 3 ? "Perfect lesson!" : "Lesson complete!";
  $("#completeCards").innerHTML =
    `<div class="card xp"><div class="k">Total XP</div><div class="v">⭐ ${xp}</div></div>` +
    `<div class="card acc"><div class="k">Accuracy</div><div class="v">🎯 ${Math.round(acc * 100)}%</div></div>` +
    `<div class="card st"><div class="k">Stars</div><div class="v">${"⭐".repeat(stars)}</div></div>`;
  $("#completeMsg").innerHTML = (newDay ? `🔥 <b>${save.streak} day streak!</b> ` : "") +
    (stats.bestCombo >= 3 ? `Best combo: ${stats.bestCombo} in a row! ` : "") +
    (stars < 3 ? "Play again for 3 stars!" : "");
  sfx("fanfare");
  confetti();
  speak(stars === 3 ? "Perfect! You're a 5-Out superstar!" : stars === 2 ? "Great job! Lesson complete!" : "You did it! Lesson complete!");
  $("#completeNext").onclick = () => reward(i, firstTime);
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
  html("div", "gift", box, "🎁");
  html("h2", "", box, firstTime ? "New bonus game!" : "Bonus game!");
  html("p", "", box, `${g.emoji} <b>${g.title}</b>`);
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
    html("button", "btn gold", grid, `<span>${g.emoji}</span>${g.title}`).onclick = () => startMini(id);
  }
  const a = html("div", "actions", box);
  html("button", "btn ghost wide", a, "Skip").onclick = () => renderHome();
  sfx("coin");
  speak("Pick any bonus game!");
}

// ---------- Bonus games ----------
async function startMini(id) {
  stopRun();
  show("mini");
  try {
    for (;;) {
      const res = await playMini(id);
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
$("#resetBtn").onclick = () => {
  if (!confirm("Erase all stars, XP, streak and medals on this phone?")) return;
  localStorage.removeItem("fiveout-save"); localStorage.removeItem("fiveout-stars");
  location.reload();
};

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
$("#installBtn").onclick = async () => {
  if (installPrompt) { installPrompt.prompt(); await installPrompt.userChoice; installPrompt = null; $("#installBtn").classList.add("hidden"); return; }
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, "📲 Add to Home Screen");
  html("p", "", sh, "1. Tap the <b>Share</b> button <b>⬆️</b> at the bottom of Safari.<br>2. Scroll down and tap <b>Add to Home Screen</b>.<br>3. Tap <b>Add</b>.<br><br>Then always play from the new <b>5-Out Hoops</b> icon so your stars and streak are saved.");
  html("button", "btn green wide", sh, "Got it").onclick = () => wrap.remove();
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
};

// ---------- Start up ----------
(function init() {
  homeCoach = createCoach(); $("#heroCoachBtn").appendChild(homeCoach.el);
  lessonCoach = createCoach(); $("#lessonCoach").appendChild(lessonCoach.el);
  doneCoach = createCoach(); $("#doneCoach").appendChild(doneCoach.el);
  rewardCoach = createCoach(); $("#rewardCoach").appendChild(rewardCoach.el);
  miniCoach = createCoach();
  $("#quitBtn").onclick = quitLesson;
  $("#miniQuit").onclick = () => renderHome(false);
  $("#watchBtn").onclick = startWatch;
  $("#notesBtn").onclick = openNotes;
  $("#notesClose").onclick = () => renderHome(false);
  document.querySelectorAll(".soundbtn").forEach(b => b.onclick = toggleSound);
  renderSound();
  renderHome();
})();
