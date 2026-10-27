"use strict";
// The lessons: court drawing, players, the 5-Out rotation, and each lesson's script.

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
// Our team is the Eagles: navy jerseys with orange trim. Defenders are red.
const COLORS = ["#1e3a8a", "#1e3a8a", "#1e3a8a", "#1e3a8a", "#1e3a8a"];

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
// Whether sleeping defenders show 💤. Lessons fade it out so players learn to read
// where the defender stands, not to look for the symbol.
let zzz = true;
// Big Game: every read answered right the first time is worth a point.
let readPoints = false;
const OK = { ok: true };
// How the player is doing this lesson. "firstTry" counts questions answered right the first time.
let stats = { questions: 0, firstTry: 0, combo: 0, bestCombo: 0 };
let lessonCoach = null;
function resetStats() { stats = { questions: 0, firstTry: 0, combo: 0, bestCombo: 0 }; }

// ---------- Drawing ----------
// theme "park": Unit 1's outdoor court. "gym": Unit 2's Eagles gym, wood floor.
function drawCourt(theme = "gym") {
  svg = $("#court");
  svg.innerHTML = "";
  if (theme === "park") {
    el("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#3f7d5c" }, svg);
    // a faint diagonal grain, so the blacktop isn't flat
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "parkGrain", width: 3, height: 3, patternUnits: "userSpaceOnUse", patternTransform: "rotate(35)" }, defs);
    el("rect", { width: 1.2, height: 3, fill: "#000", opacity: .045 }, pat);
    // No worn patches or cracks: round marks look like extra spots in a lesson about spots.
    el("rect", { x: 0, y: 0, width: 100, height: 100, fill: "url(#parkGrain)" }, svg);
    el("rect", { x: 36, y: 63, width: 28, height: 33, fill: "#2b5f8a", opacity: .85 }, svg);
  } else {
    el("rect", { x: 0, y: 0, width: 100, height: 100, fill: "#e8b26a" }, svg);
    for (let i = 0; i < 100; i += 5) el("rect", { x: i, y: 0, width: 2.5, height: 100, fill: "#dfa75c", opacity: .55 }, svg);
    el("rect", { x: 36, y: 63, width: 28, height: 33, fill: "#1e3a8a", opacity: .32 }, svg);
    el("text", { x: 50, y: 17, "text-anchor": "middle", "font-size": 9, "font-weight": 900, fill: "#1e3a8a", opacity: .16,
      "letter-spacing": 1.5, "font-family": "ui-rounded, system-ui, sans-serif" }, svg).textContent = "EAGLES";
  }
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
// decoys: false, true, or "dim" (still tappable, drawn faintly once the real spots are known)
function drawSpots({ labels = true, decoys = false } = {}) {
  layers.spots.innerHTML = "";
  const all = Object.entries(SPOTS).map(([k, s]) => ({ k, ...s }));
  if (decoys) DECOYS.forEach((d, i) => all.push({ k: "d" + i, ...d }));
  for (const s of all) {
    el("circle", { cx: s.x, cy: s.y, r: 4.6, class: "spot" + (s.k[0] === "d" && decoys === "dim" ? " decoy" : "") }, layers.spots);
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
  el("circle", { r: 4, fill: COLORS[id - 1], stroke: "#f97316", "stroke-width": .8 }, g);
  el("text", { class: "ptext", y: .2 }, g).textContent = id;
  const p = { id, x, y, spot, g, ring, anim: null };
  players.push(p);
  return p;
}
function makeDefender(p) {
  const g = el("g", {}, layers.defs);
  el("circle", { r: 3.3, fill: "#ef4444", stroke: "#7f1d1d", "stroke-width": .5 }, g);
  el("path", { d: "M-1.6 -.6 L-.4 -.1 M1.6 -.6 L.4 -.1 M-1 1.3 Q0 .6 1 1.3", stroke: "#fff", "stroke-width": .45, fill: "none", "stroke-linecap": "round" }, g);
  const zz = el("text", { class: "zz", x: 3.4, y: -3.2 }, g);
  zz.innerHTML = '<tspan font-size="2.2">z</tspan><tspan dy="-1.3" font-size="2.9">z</tspan><tspan dy="-1.5" font-size="3.6">Z</tspan>';
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
  const p = d.p;
  const dx = HOOP.x - p.x, dy = HOOP.y - p.y, L = Math.hypot(dx, dy) || 1;
  const ux = dx / L, uy = dy / L;
  // Beaten on a cut: a step behind the cutter, who is in front with a clear path.
  if (d.mode === "lag") return clamp({ x: p.x - ux * 8.5, y: p.y - uy * 8.5 });
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
    const k = d.mode === "lag" ? 0.035 : 0.1; // a beaten defender is slow to catch up
    d.x += (t.x - d.x) * k; d.y += (t.y - d.y) * k;
    d.g.setAttribute("transform", `translate(${d.x} ${d.y})`);
    d.zz.style.display = zzz && (d.mode === "sleep" || d.mode === "lag") ? "" : "none";
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
function setScore() { $("#score").innerHTML = icon("ball") + points; $("#score").style.display = points ? "" : "none"; }
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
// Shows and says a line. Returns a promise that resolves when the coach finishes it.
function say(html, hint = false) {
  $("#prompt").innerHTML = html;
  $("#bubble").classList.toggle("hint", hint);
  if (lessonCoach && !hint && lessonCoach.current === "oops") lessonCoach.mood("idle");
  return speak(html);
}
// Says an informational line and waits for the coach to finish it, so it is never cut off.
async function talk(html) { const id = RUN; await say(html); if (id !== RUN) throw ABORT; }

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
            if (readPoints) { points++; setScore(); }
            challenge("read", 1);
            challenge("combo", stats.combo);
          }
          flashPanel("right");
          if (!missed && stats.combo >= 3 && stats.combo % 2 === 1) { sfx("combo"); praise(`${icon("flame")} ${stats.combo} in a row!`, true); }
          else if (!missed && readPoints) { sfx("good"); praise("+1 Great read!"); }
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
        say(r.msg, true);
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
// The four kinds of pass in the video: TW (top to wing), WC, CW and WT.
const kindOf = s => s === "T" ? "T" : s[1];
const passType = (from, to) => kindOf(from) + kindOf(to);
// Where the passer ends up after each kind of pass (coach notes table, video 2:24 to 6:07).
const DEST_HINT = {
  TW: "After a pass from the <b>top to the wing</b>, the passer goes to the <b>opposite corner</b>, away from the ball.",
  WC: "After a pass from the <b>wing to the corner</b>, the passer goes to the <b>opposite corner</b>, away from the ball.",
  CW: "After a pass from the <b>corner to the wing</b>, the passer comes right back to the <b>same corner</b>.",
  WT: "After a pass from the <b>wing to the top</b>, the passer goes to the <b>corner on the same side</b>.",
};
// The fills after a pass, all at once with a little stagger, then the cutter.
async function autoFill(rot, cutter) {
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
}

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
// hideZ: no 💤 on beaten defenders, so the player reads where they stand.
async function possession(o = {}) {
  const N = o.narrate;
  const holder = ball.holder;
  const from = holder.spot;
  const hd = defOf(holder);
  zzz = !o.hideZ;
  // No drives from the corner: the baseline is like an extra defender there.
  const drive = o.drive === "open" && from[1] === "C" ? "blocked" : o.drive;

  // 1a. In the corner with the defender off to the side: still pass (video 5:06,
  // "the added defender of the baseline").
  if (o.cornerOpen && from[1] === "C") {
    if (hd) hd.mode = "sleep";
    await sleep(700);
    await askTap({
      text: `#${holder.id} has the ball in the corner, and the defender is off to the side. <b>Drive</b> or <b>pass</b>?`,
      zones: [{ key: "drive", x: HOOP.x, y: HOOP.y - 4, r: 7, glow: true }],
      buttons: [{ key: "drive", label: `${icon("drive")} Drive!` }, { key: "pass", label: `${icon("passBtn")} Pass` }],
      check: k => k === "pass" ? OK : { ok: false, msg: "Careful! In the corner, the <b>end line</b> is like an extra defender. Pass it up to the <b>wing</b>." },
    });
    await talk(" Smart! From the corner, we pass up to the wing.");
    if (hd) hd.mode = "guard";
  }
  // 1. Attack the basket?
  else if (drive) {
    if (hd) hd.mode = drive === "open" ? "sleep" : "guard";
    await sleep(700);
    if (o.askDrive) {
      await askTap({
        text: `#${holder.id}, you have the ball! Is your defender in the way? <b>Drive</b> or <b>pass</b>?`,
        zones: [{ key: "drive", x: HOOP.x, y: HOOP.y - 4, r: 7, glow: true }],
        buttons: [{ key: "drive", label: `${icon("drive")} Drive!` }, { key: "pass", label: `${icon("passBtn")} Pass` }],
        check: k => drive === "open"
          ? (k === "drive" ? OK : { ok: false, msg: zzz
            ? "Look! Your defender is sleeping and NOT in the way. Rule #1: <b>attack the basket!</b>"
            : "Look! Your defender is off to the side, NOT between you and the hoop. Rule #1: <b>attack the basket!</b>" })
          : (k === "pass" ? OK : { ok: false, msg: "Your defender is standing between you and the hoop. <b>Pass it</b> to a teammate!" }),
      });
    } else if (N) {
      await talk(drive === "open" ? `#${holder.id}'s defender is not in the way. <b>Attack the basket!</b>` : `#${holder.id}'s defender is in the way. Look to pass.`);
    }
    if (drive === "open") {
      await driveAndScore(holder);
      await Promise.all([N ? say("Rule #1: <b>Attack the basket</b> when you can!") : null, resetAfterScore()]);
      await sleep(0);
      return "score";
    }
    if (o.askDrive) await talk(" Smart! The defender is in the way, so we pass.");
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
  } else if (o.forceTo) {
    to = o.forceTo;
  } else {
    let c = legal;
    if (o.preferFills) { const f = c.filter(s => rotation(from, s).fills.length); if (f.length) c = f; }
    to = pick(c);
  }
  if (N || o.narratePass) {
    await Promise.all([say(`#${holder.id} passes to the ${spotWord(to)}.`), passBall(at(to))]);
    await sleep(200);
  } else {
    await passBall(at(to));
  }

  // 3. Pass and MOVE: the passer cuts to the hoop.
  // askCut "tap": no buttons, the player taps where the passer should go.
  if (o.askCut) {
    const tapOnly = o.askCut === "tap";
    holder.ring.style.display = tapOnly ? "" : "none";
    await askTap({
      text: tapOnly ? `Nice pass! Where should #${holder.id} go now? <b>Tap it on the court.</b>` : `Nice pass! Now what should #${holder.id} do?`,
      zones: [{ key: "cut", x: HOOP.x, y: HOOP.y - 6, r: 8, glow: !tapOnly },
        ...(tapOnly ? players.map(p => ({ key: p === holder ? "stay" : "mate", x: p.x, y: p.y })) : [])],
      buttons: tapOnly ? [] : [{ key: "stay", label: `${icon("stop")} Stand still` }, { key: "cut", label: `${icon("cutBtn")} Cut to the hoop!` }],
      check: k => k === "cut" ? OK
        : k === "mate" ? { ok: false, msg: "A teammate is already there. After you pass, cut to the <b>hoop</b>!" }
        : { ok: false, msg: "Rule #2: <b>Pass and MOVE!</b> Never stand still after you pass. Cut to the hoop!" },
    });
    holder.ring.style.display = "none";
  }
  // 3b. The cut secret (video 3:05): step away first so the defender follows,
  // then cut in front of the defender.
  if (o.askFake) {
    await askTap({
      text: `#${holder.id}'s defender is right there. How should #${holder.id} cut?`,
      buttons: [{ key: "fake", label: `${icon("cutBtn")} Step away, then cut in front` }, { key: "straight", label: `${icon("stop")} Run straight in` }],
      check: k => k === "fake" ? OK : { ok: false, msg: "If you run straight in, your defender stays with you. Take a step <b>away</b> first, then cut <b>in front</b>!" },
    });
  }
  if (o.fake) {
    const away = { x: holder.x + (holder.x - HOOP.x) * 0.16, y: holder.y + (holder.y - HOOP.y) * 0.16 };
    if (o.narrateFake) say(`#${holder.id} steps away first...`);
    await moveTo(holder, clamp(away).x, clamp(away).y, 26);
    await sleep(350);
  }
  const cutter = holder;
  cutter.spot = null;
  const cd = defOf(cutter);
  const open = o.giveGo === true;
  // An open cutter gets in front; the defender trails a step behind.
  if (cd && open) cd.mode = "lag";
  const cp = cutPoint(from);
  const cutLine = !o.askCut && (N || o.narratePass) ? say(`Pass and cut! #${holder.id} cuts to the hoop.`) : null;
  await moveTo(cutter, cp.x, cp.y, 40);
  if (cutLine) { await cutLine; await sleep(0); }

  // 4. Give and go: is the cutter open?
  let scored = false;
  if (cd && o.giveGo !== undefined) {
    await sleep(400);
    if (o.askGiveGo) {
      await askTap({
        text: `#${cutter.id} is cutting! Is #${cutter.id} <b>open</b>?`,
        zones: [{ key: "pass", x: cutter.x, y: cutter.y, r: 6, glow: true }],
        buttons: [{ key: "pass", label: `${icon("passBtn")} Pass to #${cutter.id}` }, { key: "hold", label: `${icon("stop")} Not open` }],
        check: k => open
          ? (k === "pass" ? OK : { ok: false, msg: zzz
            ? `Look! #${cutter.id}'s defender is sleeping way back. #${cutter.id} is OPEN. Pass it back!`
            : `Look! #${cutter.id} got <b>in front</b> of the defender. Nothing is between #${cutter.id} and the hoop. Pass it back!` })
          : (k === "hold" ? OK : { ok: false, msg: `The defender is right with #${cutter.id}. Not open! Hold the ball.` }),
      });
    } else if (N) {
      await talk(open ? `#${cutter.id} beat the defender! Pass it back!` : `#${cutter.id} is covered. No pass this time.`);
    }
    if (open) {
      await Promise.all([say(" <b>Give and go!</b>"), passBall(cutter).then(() => layup(cutter))]);
      scored = true;
    } else if (o.askGiveGo) {
      await talk(" Good eyes! Not open, so we keep moving.");
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
          return { ok: false, msg: "Pick the teammate <b>right next to</b> the empty spot." };
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
    // askDest: before anyone moves, the player says where the passer ends up.
    if (o.askDest) {
      cutter.ring.style.display = "";
      await askTap({
        text: `Where does #${cutter.id} end up? Tap the spot.`,
        zones: Object.entries(SPOTS).map(([k, s]) => ({ key: k, x: s.x, y: s.y })),
        check: k => k === rot.dest ? OK : { ok: false, msg: DEST_HINT[passType(from, to)] },
      });
      cutter.ring.style.display = "none";
    }
    const line = (N || o.narrateFill) ? say(rot.fills.length ? "Everyone <b>fills the open spot</b> next to them!" : `#${cutter.id} comes right back to the corner.`) : null;
    await autoFill(rot, cutter);
    if (line) await line;
    await sleep(N ? 700 : 300);
  }

  if (scored) { await resetAfterScore(); return "score"; }
  return "pass";
}

// ---------- The lessons ----------
// `game` is the bonus game a lesson unlocks (see js/minigames.js).
const LESSONS = [
  { title: "Find the Spots", glyph: "spots", game: "swish", run: lesson1,
    blurb: "Learn the 5 spots: the top, 2 wings and 2 corners." },
  { title: "Pass & Cut", glyph: "cut", game: "passpop", run: lesson2,
    blurb: "After you pass, don't stand still. Cut to the hoop!" },
  { title: "Fill the Spot", glyph: "fill", game: "freethrow", run: lesson3,
    blurb: "When a spot opens up, the teammate next to it slides over." },
  { title: "Give & Go", glyph: "givego", game: "dribble", run: lesson4,
    blurb: "Pass, cut, and look. Is the cutter open?" },
  { title: "Attack!", glyph: "attack", game: "hoopwall", run: lesson5,
    blurb: "If your defender is not in the way, drive to the hoop!" },
  { title: "Big Game", glyph: "cup", game: null, run: lesson6, legend: true,
    blurb: "Use all 3 rules. Every smart read scores a point!" },
  // Unit 3 (October 27, 2026): review, still only the first 6:10 of the video,
  // each part broken down further or taught a different way.
  { title: "Where Do I Go?", glyph: "rotate", game: null, run: lesson7,
    blurb: "Each kind of pass sends the passer to a different spot. Learn all 4!" },
  { title: "Cut in Front", glyph: "fake", game: null, run: lesson8,
    blurb: "Step away first, then cut in front of your defender." },
  { title: "Corner Smarts", glyph: "corner", game: null, run: lesson9,
    blurb: "In the corner? Pass up to the wing, then come right back." },
  { title: "Spot the Mistake", glyph: "coach", game: null, run: lesson10,
    blurb: "You're the coach! Watch the Eagles and catch the broken rule." },
  { title: "Lightning Round", glyph: "zap", game: null, run: lesson11,
    blurb: "Everything at game speed, with no spot names. Every read is a point!" },
];

async function lesson1() {
  drawSpots({ labels: false, decoys: true });
  await next("5-Out has <b>3 rules</b>. Rule #1: <b>attack the basket</b>. Rule #2: <b>pass and move</b>. Rule #3: <b>fill the open spot</b>. You'll learn them all!", "Cool!");
  await next("In 5-Out, there are <b>5 spots</b>, all <b>outside</b> the big curved line. Let's find them!", "Let's go!");
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
  drawSpots({ labels: true, decoys: "dim" });
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
  await next("1 top, 2 wings, 2 corners. That's the <b>5-Out</b>!", `Finish ${icon("star")}`);
}

async function lesson2() {
  drawSpots(); setupFive(false);
  await next("Rule #2: <b>Pass and MOVE!</b> After you pass, don't stand still. Cut to the hoop!", "Let's go!");
  const rounds = 5;
  for (let i = 0; i < rounds; i++) {
    setProgress(i, rounds);
    // After two rounds with buttons, the player acts out the cut by tapping the hoop.
    if (i === 2) await talk("Now <b>you</b> show me! Tap where the passer should go.");
    await possession({ askPass: true, askCut: i < 2 ? true : "tap", narrateFill: true });
  }
  setProgress(1, 1);
  await next("You did it! Pass, then <b>cut</b>!", `Finish ${icon("star")}`);
}

async function lesson3() {
  drawSpots(); setupFive(false);
  await next("Rule #3: <b>Fill the open spot!</b> When a teammate cuts, their spot is empty. The teammate <b>next to it</b> slides over.", "Let's go!");
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
  await next("Awesome! Everyone moves over <b>one spot</b> to fill the hole.", `Finish ${icon("star")}`);
}

// The 💤 helps at first, then goes away: on a real court, players read where the defender stands.
const NO_MORE_ZZZ = "From now on, no sleepy faces! Look at <b>where</b> the defender is.";

async function lesson4() {
  drawSpots(); setupFive(true);
  await next("Pass and cut, then <b>look</b>! If the cutter gets past their defender, pass it right back for a layup. That's a <b>give and go</b>!", "Let's go!");
  const plan = shuffle([true, false, true]).concat(shuffle([false, true, false]));
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    if (i === 3) await talk(NO_MORE_ZZZ);
    await possession({ askPass: true, giveGo: plan[i], askGiveGo: true, hideZ: i >= 3 });
  }
  setProgress(1, 1);
  await next("You can spot an open cutter!", `Finish ${icon("star")}`);
}

async function lesson5() {
  drawSpots(); setupFive(true);
  await next("Rule #1: <b>Attack the basket!</b> If your defender is NOT between you and the hoop, drive and score!", "Let's go!");
  const plan = shuffle(["open", "blocked", "open"]).concat(shuffle(["blocked", "open", "blocked"]));
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    // No drives from the corner, so swing the ball out of a corner first.
    while (ball.holder.spot[1] === "C") await possession({ narratePass: true, narrateFill: true, hideZ: i >= 3 });
    if (i === 3) await talk(NO_MORE_ZZZ);
    await possession({ drive: plan[i], askDrive: true, askPass: true, hideZ: i >= 3 });
  }
  setProgress(1, 1);
  await next("You know when to attack!", `Finish ${icon("star")}`);
}

async function lesson6() {
  drawSpots(); setupFive(true);
  await next("Big Game! Use all 3 rules: <b>attack</b>, <b>pass and move</b>, and <b>fill the spot</b>. Every smart read is <b>1 point</b>, and baskets are <b>2</b>!", "Tip off!");
  readPoints = true;
  const turns = 6;
  for (let i = 0; i < turns; i++) {
    setProgress(i, turns);
    const drive = ball.holder.spot[1] !== "C" && Math.random() < 0.35 ? "open" : "blocked";
    await possession({ drive, askDrive: true, askPass: true, askCut: i < 2, giveGo: Math.random() < 0.45, askGiveGo: true, hideZ: true });
  }
  readPoints = false;
  setProgress(1, 1);
  await next(`Game over! You scored <b>${points} points</b>!`, `Finish ${icon("star")}`);
}


// ---------- Unit 3: Practice Court ----------

// The four rotations one at a time. The coach calls the pass, the player says
// where the passer ends up. Each kind of pass comes up twice.
async function lesson7() {
  drawSpots(); setupFive(false);
  await next("Every pass sends the passer to a spot. There are <b>4 kinds</b> of passes. Let's learn where you go after each one!", "Let's go!");
  const seen = { TW: 0, WC: 0, CW: 0, WT: 0 };
  const rounds = 8;
  for (let i = 0; i < rounds; i++) {
    setProgress(i, rounds);
    const from = ball.holder.spot;
    // The pass whose kind has come up the least, so all four get practice.
    const options = shuffle(PASSES[from].slice());
    options.sort((a, b) => seen[passType(from, a)] - seen[passType(from, b)]);
    const to = options[0];
    seen[passType(from, to)]++;
    await possession({ forceTo: to, narratePass: true, askDest: true });
  }
  setProgress(1, 1);
  await next("Top to wing, wing to corner: <b>opposite corner</b>. Corner to wing: <b>same corner</b>. Wing to top: <b>same side corner</b>!", `Finish ${icon("star")}`);
}

// The cutting secret from the video: step away, then cut in front.
async function lesson8() {
  drawSpots(); setupFive(true);
  await next("Here's a cutting secret! Take a step <b>away</b> first. Your defender follows you. Then cut <b>in front</b> of your defender!", "Let's go!");
  // Two rounds that teach it, then reads: did the cutter step away and get in front?
  const plan = [true, true].concat(shuffle([true, false, true, false]));
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    while (ball.holder.spot[1] === "C") await possession({ narratePass: true, narrateFill: true, hideZ: true });
    if (i === 2) await talk("Now watch the cutter. Did he step away and get <b>in front</b>?");
    await possession({ askPass: true, askFake: i < 2, fake: plan[i], narrateFake: i >= 2 && plan[i], giveGo: plan[i], askGiveGo: true, hideZ: i >= 2 });
  }
  setProgress(1, 1);
  await next("Step away, then cut in front. That's how you get open!", `Finish ${icon("star")}`);
}

// Corners: pass up (not drive), and after a corner to wing pass, come back.
async function lesson9() {
  drawSpots(); setupFive(true);
  await next("Ball in the corner? The <b>end line</b> is like an extra defender. So pass it up to the wing, cut, and come right back!", "Let's go!");
  const rounds = 4;
  for (let i = 0; i < rounds; i++) {
    setProgress(i, rounds);
    // Move the ball toward a corner: top to a wing, wing to its corner.
    while (ball.holder.spot[1] !== "C") {
      const from = ball.holder.spot;
      const to = from === "T" ? pick(PASSES.T) : from[0] + "C";
      await possession({ forceTo: to, narratePass: true, narrateFill: true });
    }
    await possession({ cornerOpen: true, askPass: true, askDest: true });
  }
  setProgress(1, 1);
  await next("Corner smarts! Pass up to the wing, cut, and come back to the <b>same corner</b>.", `Finish ${icon("star")}`);
}

// Be the coach: one Eagle breaks a rule (or nobody does). Which rule was it?
const RULE_BUTTONS = [
  { key: "r1", label: `${icon("drive")} Rule #1: Attack` },
  { key: "r2", label: `${icon("cutBtn")} Rule #2: Pass and move` },
  { key: "r3", label: `${icon("fill")} Rule #3: Fill the spot` },
  { key: "ok", label: `${icon("check")} No mistake!`, green: true },
];
async function mistakeRound(kind) {
  // Nothing to fill after a corner pass, and no drives from the corner, so start
  // these from the top or a wing.
  while (ball.holder.spot[1] === "C") await possession({ narratePass: true, narrateFill: true });
  const holder = ball.holder, from = holder.spot, hd = defOf(holder);
  const choices = PASSES[from].filter(s => rotation(from, s).fills.length);
  const to = pick(choices.length ? choices : PASSES[from]);
  const rot = rotation(from, to);
  if (kind === "noattack") { hd.mode = "sleep"; await sleep(1100); }
  await passBall(at(to));
  if (hd) hd.mode = "guard";
  let mark = null;
  if (kind === "stand") {
    await sleep(1600);
  } else {
    holder.spot = null;
    const cp = cutPoint(from);
    await moveTo(holder, cp.x, cp.y, 40);
    if (kind === "nofill") { mark = emptyMarker(from); await sleep(1400); }
    else await autoFill(rot, holder);
  }
  const want = { noattack: "r1", stand: "r2", nofill: "r3", good: "ok" }[kind];
  const hint = {
    noattack: `Look back at #${holder.id} with the ball. Was the defender <b>in the way</b>?`,
    stand: `Look at #${holder.id} after the pass. Did he <b>move</b>?`,
    nofill: "Look at the court. Is a spot still <b>empty</b>?",
    good: "Everyone did their job this time. Look again!",
  }[kind];
  await askTap({
    text: "You're the coach! Did the Eagles break a rule?",
    buttons: RULE_BUTTONS,
    check: k => k === want ? OK : { ok: false, msg: hint },
  });
  // Fix it, so the team is back in the 5-Out for the next round.
  if (kind === "stand") {
    await talk(`Right! #${holder.id} stood still. Let's fix it: pass and <b>cut</b>!`);
    holder.spot = null;
    const cp = cutPoint(from);
    await moveTo(holder, cp.x, cp.y, 40);
    await autoFill(rot, holder);
  } else if (kind === "nofill") {
    await talk(" Right! Nobody filled the empty spot. Let's fix it: <b>fill the spot</b>!");
    mark.remove();
    await autoFill(rot, holder);
  } else if (kind === "noattack") {
    await talk(`Right! #${holder.id}'s defender was not in the way. He should <b>attack the basket</b>!`);
  } else {
    await talk(" Right! Pass, cut and fill. That's the 5-Out!");
  }
  await sleep(300);
}
async function lesson10() {
  drawSpots(); setupFive(true);
  await next("You're the coach! Watch the Eagles. If someone breaks a rule, tap <b>which rule</b>. If they do it right, tap <b>No mistake</b>!", "Let's go!");
  const plan = shuffle(["stand", "nofill", "noattack", "good"]).concat(shuffle(["stand", "nofill", "noattack"]).slice(0, 2));
  for (let i = 0; i < plan.length; i++) {
    setProgress(i, plan.length);
    await mistakeRound(plan[i]);
  }
  setProgress(1, 1);
  await next("Great coaching! You know all <b>3 rules</b>.", `Finish ${icon("star")}`);
}

// Everything mixed, faster, with the spot names hidden. Like the Big Game, every
// read right the first time is a point.
async function lesson11() {
  drawSpots({ labels: false }); setupFive(true);
  SPEED = 40;
  await next("Lightning Round! No spot names this time, and the Eagles move <b>fast</b>. Every smart read is <b>1 point</b>!", "Tip off!");
  readPoints = true;
  const turns = 7;
  for (let i = 0; i < turns; i++) {
    setProgress(i, turns);
    const inCorner = ball.holder.spot[1] === "C";
    const gg = Math.random() < 0.45;
    await possession({
      cornerOpen: inCorner && Math.random() < 0.6,
      drive: inCorner ? undefined : Math.random() < 0.3 ? "open" : "blocked", askDrive: true,
      askPass: true, askCut: Math.random() < 0.4 ? "tap" : false,
      fake: gg, giveGo: gg, askGiveGo: true, askDest: true, hideZ: true,
    });
  }
  readPoints = false;
  setProgress(1, 1);
  await next(`Lightning Round over! You scored <b>${points} points</b>!`, `Finish ${icon("star")}`);
}

async function watchOffense() {
  drawSpots(); setupFive(true);
  SPEED = 22;
  await talk("Watch the <b>5-Out</b>! Look for the 3 rules: attack, pass and move, fill the spot.");
  await sleep(600);
  for (;;) {
    const r = Math.random();
    await possession({ narrate: true, drive: r < 0.15 ? "open" : "blocked", giveGo: Math.random() < 0.25 });
  }
}
