"use strict";
// Rewards, one screen at a time like Duolingo: after a lesson the player sees
// stars, then XP, then a card pack, then the streak. Also the daily Skills
// Challenges, streak milestones (Coach Bounce catches fire), Rest Day Passes,
// and the gym bags on the path.

// ---------- Daily Skills Challenges ----------
// Three a day, one from each slot, picked by the date. Finishing all three pays a card pack.
const CHALLENGES = {
  lesson: { text: "Finish a lesson", goal: 1, icon: "whistle" },
  games2: { text: "Play 2 bonus games", goal: 2, icon: "ball" },
  reads10: { text: "Get 10 answers right on the first try", goal: 10, icon: "target" },
  combo5: { text: "Get 5 right in a row", goal: 5, icon: "flame" },
  xp60: { text: "Earn 60 XP", goal: 60, icon: "star" },
  stars3: { text: "Get 3 stars in a lesson", goal: 1, icon: "star" },
  medal: { text: "Earn a medal in a bonus game", goal: 1, icon: "medal1" },
  silver: { text: "Win a silver or gold medal", goal: 1, icon: "medal2" },
};
const CHALLENGE_SLOTS = [["lesson", "games2"], ["reads10", "combo5", "xp60"], ["stars3", "medal", "silver"]];
function dailyChallenges() {
  const t = today();
  if (!save.daily || save.daily.day !== t) {
    const n = dayNum(t);
    save.daily = { day: t, ids: CHALLENGE_SLOTS.map((slot, i) => slot[(n + i) % slot.length]), prog: {}, paid: false };
    persist();
  }
  return save.daily;
}
// Moves today's challenges forward. kind: "lesson", "game", "read" (+n), "combo" (best so far),
// "xp" (+n), "stars" (stars in a lesson), "medal" (medal won).
function challenge(kind, n = 1) {
  if (!saveKey) return;
  const d = dailyChallenges(), p = d.prog;
  const add = (id, v) => { if (d.ids.includes(id)) p[id] = (p[id] || 0) + v; };
  const best = (id, v) => { if (d.ids.includes(id)) p[id] = Math.max(p[id] || 0, v); };
  if (kind === "lesson") add("lesson", 1);
  if (kind === "game") add("games2", 1);
  if (kind === "read") add("reads10", n);
  if (kind === "combo") best("combo5", n);
  if (kind === "xp") add("xp60", n);
  if (kind === "stars" && n === 3) add("stars3", 1);
  if (kind === "medal" && n >= 1) add("medal", 1);
  if (kind === "medal" && n >= 2) add("silver", 1);
  persist();
}
onXP = n => challenge("xp", n);
const challengeProgress = id => Math.min(CHALLENGES[id].goal, dailyChallenges().prog[id] || 0);
const challengeDone = id => challengeProgress(id) >= CHALLENGES[id].goal;
// The first time all three are done today: a card pack.
function challengePack() {
  const d = dailyChallenges();
  if (d.paid || !d.ids.every(challengeDone)) return null;
  d.paid = true; persist();
  return makePack("Skills Challenges complete!", 3, "good");
}
// The list of today's three, for the home screen and the XP screen.
function challengeList(parent, { speakRows = true } = {}) {
  const d = dailyChallenges();
  const box = html("div", "daily", parent);
  const doneCount = d.ids.filter(challengeDone).length;
  const head = html("button", "daily-h", box, `${icon(d.paid ? "bagOpen" : "bag")}<span>Today's Skills Challenges</span><b>${doneCount}/3</b>`);
  head.onclick = () => speak(d.paid ? "You finished today's Skills Challenges! Come back tomorrow for more." : "Finish all three Skills Challenges to win a card pack!");
  for (const id of d.ids) {
    const c = CHALLENGES[id], got = challengeProgress(id), done = got >= c.goal;
    const row = html("button", "daily-row" + (done ? " done" : ""), box,
      `${icon(done ? "check" : c.icon)}<span class="dr-text">${c.text}</span>` +
      `<span class="dr-bar"><i style="width:${Math.round(100 * got / c.goal)}%"></i></span><span class="dr-n">${got}/${c.goal}</span>`);
    if (speakRows) row.onclick = () => speak(c.text);
  }
  return box;
}

// ---------- One reward screen at a time ----------
let stepCoach = null;
// Shows one screen built by `build(body)`, and resolves when Continue is tapped.
function stepScreen(build, { mood = "happy", label = "Continue" } = {}) {
  return new Promise(resolve => {
    show("step");
    setActiveCoach(stepCoach);
    stepCoach.mood(mood);
    $("#stepCoach").classList.remove("on-fire");
    $("#stepCoach").querySelectorAll(".fire-behind").forEach(f => f.remove());
    const body = $("#stepBody");
    body.innerHTML = "";
    build(body);
    const a = html("div", "actions", body);
    html("button", "btn green wide step-next", a, label).onclick = () => { hush(); resolve(); };
  });
}

// After a lesson: r = { i, stars, acc, xp, parts, bestCombo, firstTime, day }
async function lessonRewards(r) {
  // 1. Stars
  await stepScreen(body => {
    html("h2", "", body, r.perfect ? "Perfect lesson!" : r.stars === 3 ? "Awesome lesson!" : "Lesson complete!");
    const row = html("div", "big-stars", body);
    for (let k = 0; k < 3; k++) {
      const s = html("span", "big-star" + (k < r.stars ? " on" : ""), row, icon(k < r.stars ? "star" : "starOff"));
      s.style.animationDelay = .25 + k * .35 + "s";
      if (k < r.stars) setTimeout(() => sfx("coin"), 250 + k * 350);
    }
    // "10 of 11" is easier for a young player to picture than "91%".
    html("div", "pill-acc", body, r.asked ? `${icon("target")} ${r.right} of ${r.asked} right the first time` : `${icon("target")} Every answer right`);
    if (r.stars < 3) html("p", "", body, "Play it again for 3 stars!");
    else if (!r.perfect) html("p", "", body, "Get every answer right the first time for a perfect lesson!");
    sfx("fanfare");
    if (r.stars === 3) confetti();
    speak(r.perfect ? "Perfect! You're a 5-Out superstar!" : r.stars === 3 ? "Awesome job! Three stars!"
      : r.stars === 2 ? "Great job! Lesson complete!" : "You did it! Lesson complete!");
  }, { mood: "cheer" });

  // 2. XP, counted up, and how today's challenges moved
  await stepScreen(body => {
    html("h2", "", body, "XP earned");
    const big = html("div", "big-xp", body, `${icon("star")}<span>0</span>`);
    const n = big.querySelector("span");
    const t0 = performance.now();
    (function count(now) {
      const k = Math.min(1, (now - t0) / 900);
      n.textContent = "+" + Math.round(r.xp * k);
      if (k < 1) requestAnimationFrame(count); else sfx("coin");
    })(t0);
    const list = html("div", "xp-parts", body);
    for (const [label, v] of r.parts) if (v) html("div", "", list, `<span>${label}</span><b>+${v}</b>`);
    if (r.bestCombo >= 3) html("div", "", list, `<span>${icon("flame")} Best combo</span><b>${r.bestCombo} in a row</b>`);
    challengeList(body);
    speak("Great work! Look at all that XP!");
  });

  // 3. Card packs: the lesson pack, and the Skills Challenge pack if today's three are done
  await showPacks([r.pack, challengePack()]);

  // 4. The streak, the first time they play today
  if (r.day) await streakScreen(r.day);
}

// ---------- The streak ----------
const WEEKDAY = ["S", "M", "T", "W", "T", "F", "S"];
// The last 7 days: a ball for a day played, a ticket for a Rest Day Pass.
function weekStrip(parent) {
  const row = html("div", "week", parent);
  const t = dayNum(today());
  for (let n = t - 6; n <= t; n++) {
    const key = numDay(n), played = save.days.includes(key), rest = save.restDays.includes(key);
    const wd = new Date(n * 864e5).getUTCDay();
    html("div", "wk" + (n === t ? " today" : "") + (played ? " played" : rest ? " rest" : ""), row,
      `<span>${WEEKDAY[wd]}</span><i>${played ? icon("ball") : rest ? icon("pass") : ""}</i>`);
  }
}
async function streakScreen(day) {
  await stepScreen(body => {
    // A milestone: Coach Bounce turns into a flaming ball.
    if (day.milestone) { $("#stepCoach").classList.add("on-fire"); $("#stepCoach").insertAdjacentHTML("afterbegin", `<div class="fire-behind">${icon("flame")}</div>`); }
    html("div", "streak-flame", body, `${icon("flame")}<b>${day.streak}</b>`);
    html("h2", "", body, day.streak === 1 ? "You started a streak!" : `${day.streak} day streak!`);
    if (day.used) html("p", "pass-note", body, `${icon("pass")} Your Rest Day Pass saved your streak!`);
    weekStrip(body);
    html("div", "passes", body, `Rest Day Passes: ${save.passes ? Array.from({ length: save.passes }, () => icon("pass")).join("") : "none yet"}`);
    html("p", "small", body, "A Rest Day Pass covers a day you miss. Win more at streak milestones.");
    sfx(day.milestone ? "fanfare" : "coin");
    if (day.milestone) confetti();
    speak(day.used ? "Your Rest Day Pass saved your streak!" : day.milestone ? "Your streak is on fire! Coach Bounce is on fire too!"
      : day.streak === 1 ? "You started a streak! Play again tomorrow to keep it going!" : "You kept your streak going!");
  }, { mood: "cheer" });
  if (day.milestone) await showPacks([makePack(`${day.streak} day streak bonus!`, 3, "great")]);
}

// ---------- Gym bags on the path ----------
// A bag sits on the path after these lessons. Finishing the lesson unlocks it; it opens once.
const BAGS = { 1: "u1", 4: "u2" };
async function openBag(id) {
  save.bags[id] = true; persist();
  await showPacks([makePack("You found a gym bag!", 3, "good", [], "bag")]);
}
