"use strict";
// The six lessons: court drawing, players, the 5-Out rotation, and each lesson's script.

// ---------- Court geometry (viewBox 0..100, basket at the bottom) ----------
const HOOP = { x: 50, y: 89 };
const SPOTS = {
  T:  { x: 50, y: 36 },
  LW: { x: 15, y: 56 }, RW: { x: 85, y: 56 },
  LC: { x: 5,  y: 88 }, RC: { x: 95, y: 88 },
};
const DECOYS = [{ x: 50, y: 72 }, { x: 36, y: 62 }, { x: 64, y: 62 }, { x: 41, y: 83 }];
// The five spots sit in a line around the arc. "Next to" means next in this line.
const LINE = ["LC", "LW", "T", "RW", "RC"];
// Legal passes: only to the teammate next to you (no skip passes).
const PASSES = { T: ["LW", "RW"], LW: ["T", "LC"], RW: ["T", "RC"], LC: ["LW"], RC: ["RW"] };
const spotWord = s => s === "T" ? "top" : (s[1] === "W" ? "wing" : "corner");
const COLORS = ["#2563eb", "#16a34a", "#9333ea", "#0891b2", "#db2777"];

// After a pass from `from` to `to`, the passer cuts and every spot that opens
// is filled by the teammate next to it (never the one holding the ball).
// The cutter ends in whichever spot is left empty last.
// This one rule reproduces all four rotations in the video.
function rotation(from, to) {
  const filled = new Set([to]);
  const fills = [];
  let empty = from;
  for (;;) {
    const i = LINE.indexOf(empty);
    const nb = [LINE[i - 1], LINE[i + 1]].filter(s => s && !filled.has(s));
    if (!nb.length) return { fills, dest: empty };
    fills.push([nb[0], empty]);
    filled.add(empty);
    empty = nb[0];
  }
}

// ---------- Lesson state ----------
let svg, layers = {}, players = [], defenders = [], ball = null;
let points = 0;
let SPEED = 32;
const OK = { ok: true };
// How the player is doing this lesson. "firstTry" counts questions answered right the first time.
let stats = { questions: 0, firstTry: 0, combo: 0, bestCombo: 0 };
let lessonCoach = null;
function resetStats() { stats = { questions: 0, firstTry: 0, combo: 0, bestCombo: 0 }; }

// ---------- Drawing ----------
function drawCourt() {
  svg = $("#court");
  svg.innerHTML = "";
  el("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#e8b26a" }, svg);
  for (let i = 0; i < 100; i += 5) el("rect", { x: i, y: 0, width: 2.5, height: 100, fill: "#dfa75c", opacity: .55 }, svg);
  el("rect", { x: 36, y: 63, width: 28, height: 33, fill: "#1d3557", opacity: .22 }, svg);
  const g = el("g", { stroke: "#fff", fill: "none", "stroke-width": .7 }, svg);
  el("rect", { x: .5, y: .5, width: 99, height: 95.5 }, g);
  el("path", { d: "M38 .5 A12 12 0 0 0 62 .5" }, g);
  el("rect", { x: 36, y: 63, width: 28, height: 33 }, g);
  el("circle", { cx: 50, cy: 63, r: 9 }, g);
  el("path", { d: "M10 96 L10 80 A41 41 0 0 1 90 80 L90 96", "stroke-width": .9 }, g);
  el("line", { x1: 44, y1: 93, x2: 56, y2: 93, "stroke-width": 1.2 }, g);
  el("circle", { cx: HOOP.x, cy: HOOP.y, r: 2.2, stroke: "#f97316", "stroke-width": .9 }, svg);
  for (const k of ["spots", "markers", "defs", "players", "ball", "zones", "fx"]) layers[k] = el("g", {}, svg);
  layers.fx.setAttribute("pointer-events", "none");
  layers.markers.setAttribute("pointer-events", "none");
}
function drawSpots({ labels = true, decoys = false } = {}) {
  layers.spots.innerHTML = "";
  const all = Object.entries(SPOTS).map(([k, s]) => ({ k, ...s }));
  if (decoys) DECOYS.forEach((d, i) => all.push({ k: "d" + i, ...d }));
  for (const s of all) {
    el("circle", { cx: s.x, cy: s.y, r: 4.6, class: "spot" }, layers.spots);
    if (s.k[0] !== "d") {
      // Labels sit above the spot (defenders stand below it); corner labels hug the sideline.
      const anchor = s.k === "LC" ? "start" : s.k === "RC" ? "end" : "middle";
      const lx = s.k === "LC" ? 1.5 : s.k === "RC" ? 98.5 : s.x;
      const t = el("text", { x: lx, y: s.y - 6.2, class: "spotlabel", "text-anchor": anchor, "data-spot": s.k }, layers.spots);
      t.textContent = spotWord(s.k).toUpperCase();
      if (!labels) t.style.display = "none";
    }
  }
}
function revealLabel(k) { const t = layers.spots.querySelector(`[data-spot="${k}"]`); if (t) t.style.display = ""; }

function makePlayer(id, x, y, spot) {
  const g = el("g", {}, layers.players);
  const ring = el("circle", { r: 5.8, class: "pulse", style: "display:none" }, g);
  el("circle", { r: 4, fill: COLORS[id - 1], stroke: "#fff", "stroke-width": .7 }, g);
  el("text", { class: "ptext", y: .2 }, g).textContent = id;
  const p = { id, x, y, spot, g, ring, anim: null };
  players.push(p);
  return p;
}
function makeDefender(p) {
  const g = el("g", {}, layers.defs);
  el("circle", { r: 3.3, fill: "#ef4444", stroke: "#7f1d1d", "stroke-width": .5 }, g);
  el("path", { d: "M-1.6 -.6 L-.4 -.1 M1.6 -.6 L.4 -.1 M-1 1.3 Q0 .6 1 1.3", stroke: "#fff", "stroke-width": .45, fill: "none", "stroke-linecap": "round" }, g);
  const zz = el("text", { class: "zz", x: 3.2, y: -3 }, g);
  zz.textContent = "💤";
  const t = defTarget({ p, mode: "guard" });
  const d = { p, x: t.x, y: t.y, mode: "guard", fixed: null, g, zz };
  defenders.push(d);
  return d;
}
function makeBall(holder) {
  const g = el("g", {}, layers.ball);
  el("circle", { r: 1.9, fill: "#f97316", stroke: "#7c2d12", "stroke-width": .35 }, g);
  el("path", { d: "M-1.9 0 H1.9 M0 -1.9 V1.9", stroke: "#7c2d12", "stroke-width": .25 }, g);
  ball = { x: holder.x, y: holder.y, holder, g, anim: null };
}
const holdPos = p => ({ x: p.x + 2.9, y: p.y + 2.4 });
const at = spot => players.find(p => p.spot === spot);
const defOf = p => defenders.find(d => d.p === p);

// Where a defender wants to stand.
function defTarget(d) {
  if (d.mode === "lag") return d.fixed;
  const p = d.p;
  const dx = HOOP.x - p.x, dy = HOOP.y - p.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  if (d.mode === "sleep") {
    // Off to the side and a step back: the path to the hoop is wide open.
    let px = -uy, py = ux;
    if (py > 0 || (py === 0 && (p.x >= 50 ? px > 0 : px < 0))) { px = -px; py = -py; }
    return clamp({ x: p.x + px * 9 - ux * 2, y: p.y + py * 9 - uy * 2 });
  }
  const gap = Math.min(7, L * 0.6); // between the player and the hoop
  return clamp({ x: p.x + ux * gap, y: p.y + uy * gap });
}
const clamp = q => ({ x: Math.max(3, Math.min(97, q.x)), y: Math.max(3, Math.min(97, q.y)) });

// ---------- Animation loop ----------
const ease = k => k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
function tween(e, x, y, dur) {
  return new Promise(resolve => { e.anim = { sx: e.x, sy: e.y, tx: x, ty: y, t0: performance.now(), dur, resolve }; });
}
function moveTo(e, x, y, speed = SPEED) {
  const dist = Math.hypot(x - e.x, y - e.y);
  return tween(e, x, y, Math.max(150, dist / speed * 1000));
}
function step(e, now) {
  const a = e.anim;
  if (!a) return;
  const k = Math.min(1, (now - a.t0) / a.dur), s = ease(k);
  e.x = a.sx + (a.tx - a.sx) * s; e.y = a.sy + (a.ty - a.sy) * s;
  if (k >= 1) { e.anim = null; a.resolve(); }
}
function frame(now) {
  for (const p of players) { step(p, now); p.g.setAttribute("transform", `translate(${p.x} ${p.y})`); }
  for (const d of defenders) {
    const t = defTarget(d);
    d.x += (t.x - d.x) * 0.1; d.y += (t.y - d.y) * 0.1;
    d.g.setAttribute("transform", `translate(${d.x} ${d.y})`);
    d.zz.style.display = (d.mode === "sleep" || d.mode === "lag") ? "" : "none";
  }
  if (ball) {
    if (ball.anim) step(ball, now);
    else if (ball.holder) { const h = holdPos(ball.holder); ball.x = h.x; ball.y = h.y; }
    ball.g.setAttribute("transform", `translate(${ball.x} ${ball.y})`);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// ---------- Effects ----------
function floatText(x, y, txt) {
  const t = el("text", { x: Math.max(18, Math.min(82, x)), y: Math.max(8, y), class: "fx" }, layers.fx);
  t.textContent = txt;
  setTimeout(() => t.remove(), 1400);
}
function emptyMarker(spot) {
  const s = SPOTS[spot];
  const g = el("g", {}, layers.markers);
  el("circle", { cx: s.x, cy: s.y, r: 4.6, class: "pulse" }, g);
  el("text", { x: s.x, y: s.y, class: "qmark" }, g).textContent = "?";
  return g;
}
function setScore() { $("#score").textContent = "🏀 " + points; $("#score").style.display = points ? "" : "none"; }
function setProgress(done, total) { $("#barFill").style.width = Math.round(100 * done / total) + "%"; }

const PRAISE = ["Nice!", "Awesome!", "You got it!", "Great read!", "Boom!", "Yes!", "Sweet!", "Perfect!"];
function praise(text, combo = false) {
  const p = html("div", "praise" + (combo ? " combo" : ""), $("#panel"), text);
  setTimeout(() => p.remove(), 1200);
}
function flashPanel(kind) {
  const panel = $("#panel");
  panel.classList.remove("right", "wrong", "shake");
  void panel.offsetWidth;
  panel.classList.add(kind);
  if (kind === "wrong") panel.classList.add("shake");
  setTimeout(() => panel.classList.remove(kind), 650);
}

// ---------- Talking and asking ----------
function say(html, hint = false) {
  $("#prompt").innerHTML = html;
  $("#bubble").classList.toggle("hint", hint);
  if (lessonCoach && !hint && lessonCoach.current === "oops") lessonCoach.mood("idle");
  speak(html);
}

// Shows a question with tap targets on the court and/or buttons.
// Resolves only with a correct answer. A wrong answer shows a hint and the player tries again.
// Questions (anything with `check`) count toward accuracy, XP and combos.
function askTap({ text, zones = [], buttons = [], check }) {
  const id = RUN;
  say(text);
  if (check) stats.questions++;
  let missed = false;
  return new Promise(resolve => {
    let locked = false;
    const done = (key) => {
      if (id !== RUN || locked) return;
      const r = check ? check(key) : OK;
      if (r.ok) {
        locked = true;
        layers.zones.innerHTML = ""; $("#buttons").innerHTML = "";
        if (check) {
          if (!missed) {
            stats.firstTry++;
            stats.combo++;
            stats.bestCombo = Math.max(stats.bestCombo, stats.combo);
          }
          flashPanel("right");
          if (!missed && stats.combo >= 3 && stats.combo % 2 === 1) { sfx("combo"); praise(`🔥 ${stats.combo} in a row!`, true); }
          else { sfx("good"); praise(pick(PRAISE)); }
          lessonCoach.flash("happy", 1100);
        }
        resolve(key);
      } else {
        missed = true;
        stats.combo = 0;
        sfx("bad");
        flashPanel("wrong");
        lessonCoach.mood("oops");
        say("🤔 " + r.msg, true);
      }
    };
    layers.zones.innerHTML = "";
    for (const z of zones) {
      const c = el("circle", { cx: z.x, cy: z.y, r: z.r || 5.5, class: "zone" + (z.glow ? " glow" : "") }, layers.zones);
      c.addEventListener("pointerdown", e => { e.preventDefault(); done(z.key); });
    }
    const bw = $("#buttons");
    bw.innerHTML = "";
    for (const b of buttons) {
      const btn = html("button", "btn" + (b.alt ? " ghost" : b.green ? " green" : ""), bw, b.label);
      btn.onclick = () => done(b.key);
    }
  });
}
const next = (text, label = "Continue") => askTap({ text, buttons: [{ key: "n", label, green: true }] });

// ---------- Basketball actions ----------
async function passBall(to) {
  ball.holder = null;
  sfx("pass");
  const h = holdPos(to);
  await tween(ball, h.x, h.y, Math.max(260, Math.hypot(h.x - ball.x, h.y - ball.y) / 85 * 1000));
  ball.holder = to;
}
async function layup(p) {
  ball.holder = null;
  await tween(ball, (ball.x + HOOP.x) / 2, Math.min(ball.y, HOOP.y) - 9, 300);
  await tween(ball, HOOP.x, HOOP.y, 300);
  sfx("swish");
  floatText(HOOP.x, HOOP.y - 8, "SWISH! +2");
  points += 2; setScore();
  await tween(ball, HOOP.x, 94, 250);
}
async function driveAndScore(p) {
  floatText(p.x, p.y - 6, "ATTACK!");
  await moveTo(p, HOOP.x + (p.x - HOOP.x) * 0.12, HOOP.y - 7, 42);
  await layup(p);
}
const cutPoint = from => ({ x: 50 + (SPOTS[from].x - 50) * 0.15, y: 78 });

// Everyone back to their spot, ball to the top. Used after a basket.
async function resetAfterScore() {
  await sleep(500);
  defenders.forEach(d => d.mode = "guard");
  await Promise.all(players.map(p => moveTo(p, SPOTS[p.spot].x, SPOTS[p.spot].y)));
  await passBall(at("T"));
  await sleep(300);
}

function setupFive(withDefense) {
  players = []; defenders = []; ball = null;
  ["T", "LW", "RW", "LC", "RC"].forEach((s, i) => makePlayer(i + 1, SPOTS[s].x, SPOTS[s].y, s));
  if (withDefense) players.forEach(makeDefender);
  makeBall(at("T"));
}

// One trip of the ball: maybe a drive, then pass, cut, give-and-go read, and fills.
// Each `ask*` option turns a step into a question for the player.
async function possession(o = {}) {
  const N = o.narrate;
  const holder = ball.holder;
  const from = holder.spot;
  const hd = defOf(holder);

  // 1. Attack the basket?
  if (o.drive) {
    if (hd) hd.mode = o.drive === "open" ? "sleep" : "guard";
    await sleep(700);
    if (o.askDrive) {
      await askTap({
        text: `#${holder.id}, you have the ball! Is your defender in the way? <b>Drive</b> or <b>pass</b>?`,
        zones: [{ key: "drive", x: HOOP.x, y: HOOP.y - 4, r: 7, glow: true }],
        buttons: [{ key: "drive", label: "🏃 Drive!" }, { key: "pass", label: "🤝 Pass" }],
        check: k => o.drive === "open"
          ? (k === "drive" ? OK : { ok: false, msg: "Look! Your defender is sleeping 💤 and NOT in the way. Rule #1: <b>attack the basket!</b>" })
          : (k === "pass" ? OK : { ok: false, msg: "Your defender is standing between you and the hoop. <b>Pass it</b> to a teammate!" }),
      });
    } else if (N) {
      say(o.drive === "open" ? `#${holder.id}'s defender is not in the way. <b>Attack the basket!</b>` : `#${holder.id}'s defender is in the way. Look to pass.`);
      await sleep(1800);
    }
    if (o.drive === "open") {
      await driveAndScore(holder);
      if (N) say("Rule #1: <b>Attack the basket</b> when you can! 🏀");
      await resetAfterScore();
      return "score";
    }
    if (o.askDrive) { say("✅ Smart! The defender is in the way, so we pass."); await sleep(1100); }
  }

  // 2. Pass to a teammate next to you.
  const legal = PASSES[from];
  let to;
  if (o.askPass) {
    to = await askTap({
      text: o.passText || `Pass the ball! Tap a teammate <b>next to</b> #${holder.id}.`,
      zones: players.filter(p => p !== holder).map(p => ({ key: p.spot, x: p.x, y: p.y, glow: true })),
      check: k => legal.includes(k) ? OK : { ok: false, msg: "Too far! A defender could steal that. Pass to the teammate <b>right next to you</b>." },
    });
  } else {
    let c = legal;
    if (o.preferFills) { const f = c.filter(s => rotation(from, s).fills.length); if (f.length) c = f; }
    to = pick(c);
  }
  if (N || o.narratePass) { say(`#${holder.id} passes to the ${spotWord(to)}.`); }
  await passBall(at(to));
  if (N || o.narratePass) await sleep(900);

  // 3. Pass and MOVE: the passer cuts to the hoop.
  if (o.askCut) {
    await askTap({
      text: `Nice pass! Now what should #${holder.id} do?`,
      zones: [{ key: "cut", x: HOOP.x, y: HOOP.y - 6, r: 8, glow: true }],
      buttons: [{ key: "stay", label: "🧍 Stand still" }, { key: "cut", label: "🏃 Cut to the hoop!" }],
      check: k => k === "cut" ? OK : { ok: false, msg: "Rule #2: <b>Pass and MOVE!</b> Never stand still after you pass. Cut to the hoop!" },
    });
  } else if (N || o.narratePass) {
    say(`Pass and cut! #${holder.id} cuts to the hoop. ✂️`);
  }
  const cutter = holder;
  cutter.spot = null;
  const cd = defOf(cutter);
  const open = o.giveGo === true;
  if (cd && open) { cd.mode = "lag"; cd.fixed = { x: cd.x, y: cd.y }; }
  const cp = cutPoint(from);
  await moveTo(cutter, cp.x, cp.y, 40);

  // 4. Give and go: is the cutter open?
  let scored = false;
  if (cd && o.giveGo !== undefined) {
    await sleep(400);
    if (o.askGiveGo) {
      await askTap({
        text: `#${cutter.id} is cutting! Is #${cutter.id} <b>open</b>?`,
        zones: [{ key: "pass", x: cutter.x, y: cutter.y, r: 6, glow: true }],
        buttons: [{ key: "pass", label: `🎯 Pass to #${cutter.id}` }, { key: "hold", label: "✋ Not open" }],
        check: k => open
          ? (k === "pass" ? OK : { ok: false, msg: `Look! #${cutter.id}'s defender is sleeping 💤 way back. #${cutter.id} is OPEN. Pass it back!` })
          : (k === "hold" ? OK : { ok: false, msg: `The defender is right with #${cutter.id}. Not open! Hold the ball.` }),
      });
    } else if (N) {
      say(open ? `#${cutter.id} beat the defender! Pass it back!` : `#${cutter.id} is covered. No pass this time.`);
      await sleep(1400);
    }
    if (open) {
      say("🎯 <b>Give and go!</b>");
      await passBall(cutter);
      await layup(cutter);
      scored = true;
    } else if (o.askGiveGo) {
      say("✅ Good eyes! Not open, so we keep moving.");
      await sleep(1000);
    }
  } else {
    await sleep(N ? 900 : 300);
  }
  if (cd) cd.mode = "guard";

  // 5. Fill the open spot.
  const rot = rotation(from, to);
  if (o.askFills) {
    for (const [a, b] of rot.fills) {
      const filler = at(a);
      const mark = emptyMarker(b);
      await askTap({
        text: `The <b>${spotWord(b)}</b> spot is empty! Who fills it? Tap a player.`,
        zones: players.filter(p => p.spot).map(p => ({ key: String(p.id), x: p.x, y: p.y, glow: true })),
        check: k => {
          if (k === String(filler.id)) return OK;
          if (ball.holder && String(ball.holder.id) === k) return { ok: false, msg: "That teammate has the ball! Pick the one <b>right next to</b> the empty spot." };
          return { ok: false, msg: "Pick the teammate <b>right next to</b> the empty spot. 👀" };
        },
      });
      mark.remove();
      filler.spot = b;
      await moveTo(filler, SPOTS[b].x, SPOTS[b].y);
    }
    const mark = emptyMarker(rot.dest);
    await askTap({
      text: `One spot is still empty. Where does #${cutter.id} go? Tap the <b>empty spot</b>.`,
      zones: Object.entries(SPOTS).map(([k, s]) => ({ key: k, x: s.x, y: s.y })),
      check: k => k === rot.dest ? OK : { ok: false, msg: "Someone is already there! Find the <b>empty</b> spot." },
    });
    mark.remove();
    cutter.spot = rot.dest;
    await moveTo(cutter, SPOTS[rot.dest].x, SPOTS[rot.dest].y);
  } else {
    if (N || o.narrateFill) say(rot.fills.length ? "Everyone <b>fills the open spot</b> next to them! 🔄" : `#${cutter.id} comes right back to the corner.`);
    const moves = [];
    let delay = 0;
    for (const [a, b] of rot.fills) {
      const f = at(a);
      f.spot = b;
      moves.push(sleepRaw(delay).then(() => moveTo(f, SPOTS[b].x, SPOTS[b].y)));
      delay += 250;
    }
    cutter.spot = rot.dest;
    moves.push(sleepRaw(delay).then(() => moveTo(cutter, SPOTS[rot.dest].x, SPOTS[rot.dest].y)));
    await Promise.all(moves);
    await sleep(N ? 1200 : 300);
  }

  if (scored) { await resetAfterScore(); return "score"; }
  return "pass";
}

// ---------- The lessons ----------
// `game` is the bonus game a lesson unlocks (see js/minigames.js).
const LESSONS = [
  { title: "Find the Spots", emoji: "📍", game: "swish", run: lesson1,
    blurb: "Learn the 5 spots: the top, 2 wings and 2 corners." },
  { title: "Pass & Cut", emoji: "✂️", game: "passpop", run: lesson2,
    blurb: "After you pass, don't stand still. Cut to the hoop!" },
  { title: "Fill the Spot", emoji: "🧩", game: "freethrow", run: lesson3,
    blurb: "When a spot opens up, the teammate next to it slides over." },
  { title: "Give & Go", emoji: "🎯", game: "dribble", run: lesson4,
    blurb: "Pass, cut, and look. Is the cutter open?" },
  { title: "Attack!", emoji: "⚡", game: null, run: lesson5,
    blurb: "If your defender is not in the way, drive to the hoop!" },
  { title: "Big Game", emoji: "🏆", game: null, run: lesson6,
    blurb: "Use all 3 rules and score as many points as you can!" },
];

async function lesson1() {
  drawSpots({ labels: false, decoys: true });
  await next("In 5-Out, there are <b>5 spots</b>, all <b>outside</b> the big curved line. Let's find them!", "Let's go! 🏀");
  const isRight = (k, q) => q === "T" ? k === "T" : q === "W" ? (k === "LW" || k === "RW") : (k === "LC" || k === "RC");
  const word = { T: "TOP", W: "WING", C: "CORNER" };
  const ASK_SPOT = { T: "Tap the <b>TOP</b> spot.", W: "Tap a <b>WING</b> spot.", C: "Tap a <b>CORNER</b> spot." };
  const hint = {
    T: "The <b>top</b> is in the middle, out front, far from the hoop.",
    W: "<b>Wings</b> are on the sides, like a bird's wings!",
    C: "<b>Corners</b> are way down low, on the sides by the end line.",
  };
  const qs = shuffle(["T", "W", "C"]).concat(shuffle(["T", "W", "C"]));
  const total = qs.length + 5;
  const zones = Object.entries(SPOTS).map(([k, s]) => ({ key: k, x: s.x, y: s.y }))
    .concat(DECOYS.map((d, i) => ({ key: "d" + i, x: d.x, y: d.y, r: 5 })));
  for (let i = 0; i < qs.length; i++) {
    const q = qs[i];
    setProgress(i, total);
    const k = await askTap({
      text: ASK_SPOT[q],
      zones,
      check: k => isRight(k, q) ? OK
        : k[0] === "d" ? { ok: false, msg: "That spot is <b>inside</b> the line. 5-Out spots are all OUTSIDE the 3-point line." }
        : { ok: false, msg: hint[q] },
    });
    revealLabel(k);
    floatText(SPOTS[k].x, SPOTS[k].y - 6, word[q] + "!");
  }

  // Part 2: unbunch the team.
  drawSpots({ labels: true, decoys: true });
  const bunch = [{ x: 46, y: 70 }, { x: 55, y: 71 }, { x: 50, y: 78 }, { x: 43, y: 79 }, { x: 57, y: 80 }];
  bunch.forEach((b, i) => makePlayer(i + 1, b.x, b.y, null));
  // The coach acts out the "uh oh" with his worried face; the voice model can't say it naturally.
  const unbunch = next("Everyone is <b>bunched up</b> by the hoop! That makes it easy for the defense. Let's spread out!");
  lessonCoach.mood("oops");
  await unbunch;
  lessonCoach.mood("idle");
  for (let i = 0; i < players.length; i++) {
    const p = players[i];
    setProgress(qs.length + i, total);
    p.ring.style.display = "";
    const k = await askTap({
      text: `Tap an <b>empty spot</b> for #${p.id}.`,
      zones,
      check: k => k[0] === "d" ? { ok: false, msg: "That's <b>inside</b> the line. Pick a spot OUTSIDE the 3-point line." }
        : at(k) ? { ok: false, msg: "Someone is already there! Pick an <b>empty</b> spot." } : OK,
    });
    p.ring.style.display = "none";
    p.spot = k;
    await moveTo(p, SPOTS[k].x, SPOTS[k].y, 45);
  }
  setProgress(1, 1);
  floatText(50, 50, "SPREAD OUT!");
  sfx("swish");
  await next("1 top, 2 wings, 2 corners. That's the <b>5-Out</b>! 🙌", "Finish ⭐");
}

async function lesson2() {
  drawSpots(); setupFive(false);
  await next("Rule #2: <b>Pass and MOVE!</b> After you pass, don't stand still. Cut to the hoop!", "Let's go! 🏀");
  const rounds = 5;
  for (let i = 0; i < rounds; i++) {
    setProgress(i, rounds);
    await possession({ askPass: true, askCut: true, narrateFill: true });
  }
  setProgress(1, 1);
  await next("You did it! Pass, then <b>cut</b>! ✂️", "Finish ⭐");
}

async function lesson3() {
  drawSpots(); setupFive(false);
  await next("Rule #3: <b>Fill the open spot!</b> When a teammate cuts, their spot is empty. The teammate <b>next to it</b> slides over.", "Let's go! 🏀");
  const rounds = 4;
  let r = 0;
  while (r < rounds) {
    setProgress(r, rounds);
    if (ball.holder.spot[1] === "C") {
      // A corner pass has nothing to fill: the passer comes right back. Just show it.
      await possession({ narratePass: true, narrateFill: true });
      continue;
    }
    await possession({ askFills: true, preferFills: true, narratePass: true });
    r++;
  }
  setProgress(1, 1);
  await next("Awesome! Everyone moves over <b>one spot</b> to fill the hole. 🧩", "Finish ⭐");
}

async function lesson4() {
  drawSpots(); setupFive(true);
  await next("Pass and cut, then <b>look</b>! If the cutter gets past their defender, pass it right back for a layup. That's a <b>give and go</b>! 🎯", "Let's go! 🏀");
  const plan = shuffle([true, false, true, false, true, false]);
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    await possession({ askPass: true, giveGo: plan[i], askGiveGo: true });
  }
  setProgress(1, 1);
  await next("You can spot an open cutter! 👀", "Finish ⭐");
}

async function lesson5() {
  drawSpots(); setupFive(true);
  await next("Rule #1: <b>Attack the basket!</b> If your defender is NOT between you and the hoop, drive and score!", "Let's go! 🏀");
  const plan = shuffle(["open", "blocked", "open", "blocked", "open", "blocked"]);
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    await possession({ drive: plan[i], askDrive: true, askPass: true });
  }
  setProgress(1, 1);
  await next("You know when to attack! ⚡", "Finish ⭐");
}

async function lesson6() {
  drawSpots(); setupFive(true);
  await next("Big Game! Use all 3 rules: <b>attack</b>, <b>pass and move</b>, and <b>fill the spot</b>. Try to score lots of points!", "Tip off! 🏀");
  const turns = 8;
  for (let i = 0; i < turns; i++) {
    setProgress(i, turns);
    const drive = Math.random() < 0.35 ? "open" : "blocked";
    await possession({ drive, askDrive: true, askPass: true, askCut: i < 2, giveGo: Math.random() < 0.45, askGiveGo: true });
  }
  setProgress(1, 1);
  await next(`Game over! You scored <b>${points} points</b>! 🏆`, "Finish ⭐");
}

async function watchOffense() {
  drawSpots(); setupFive(true);
  SPEED = 22;
  say("Watch the <b>5-Out</b>! Look for the 3 rules: attack, pass and move, fill the spot.");
  await sleep(3500);
  for (;;) {
    const r = Math.random();
    await possession({ narrate: true, drive: r < 0.15 ? "open" : "blocked", giveGo: Math.random() < 0.25 });
  }
}
