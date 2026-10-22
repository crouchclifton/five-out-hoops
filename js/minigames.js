"use strict";
// Bonus games, in the spirit of Mario Party's quick mini games. Each lesson
// unlocks one (see LESSONS in js/lessons.js). They share a frame: coach intro,
// "3, 2, 1, GO!", the game, "FINISH!", then a medal.
//
// A game is a class with: start(), update(dt), draw(ctx), down/move/up(x, y),
// a `done` flag, `score`, and hud() returning the two HUD texts.

const GAMES = {
  swish: {
    title: "Swish Shot", glyph: "swish",
    intro: "Swish Shot! <b>Flick</b> the ball up at the hoop. Make as many baskets as you can!",
    tiers: [6, 14, 24], unit: "points", make: () => new SwishShot(),
  },
  passpop: {
    title: "Pass Pop", glyph: "passpop",
    intro: "Pass Pop! <b>Tap the open teammate next to the ball.</b> Don't pass to a covered teammate!",
    tiers: [8, 14, 20], unit: "passes", make: () => new PassPop(),
  },
  freethrow: {
    title: "Free Throw Frenzy", glyph: "freethrow",
    intro: "Free Throw Frenzy! <b>Tap</b> when the line is in the <b>green</b> zone to shoot. Ten shots!",
    tiers: [8, 15, 22], unit: "points", make: () => new FreeThrow(),
  },
  dribble: {
    title: "Dribble Dash", glyph: "dribble",
    intro: "Dribble Dash! Tap <b>left, right, left, right</b> as fast as you can to beat the defender to the hoop!",
    tiers: [13, 10, 8], unit: "seconds", lowerIsBetter: true, make: () => new DribbleDash(),
  },
};
const MEDALS = ["", "bronze", "silver", "gold"];
const medalIcon = (m, cls = "") => m ? icon(MEDAL_ICON[m], cls) : "";
const MEDAL_XP = [5, 10, 20, 30];

// 0 = no medal, 1 = bronze, 2 = silver, 3 = gold
function medalFor(def, score, won = true) {
  if (!won) return 0;
  let m = 0;
  def.tiers.forEach((t, i) => { if (def.lowerIsBetter ? score <= t : score >= t) m = i + 1; });
  return m;
}
const fmtScore = (def, s) => def.lowerIsBetter ? s.toFixed(1) + "s" : String(s);

// ---------- Shared drawing ----------
function drawGym(ctx, W, H, floorY) {
  const wall = ctx.createLinearGradient(0, 0, 0, floorY);
  wall.addColorStop(0, "#172554"); wall.addColorStop(1, "#1e40af");
  ctx.fillStyle = wall; ctx.fillRect(0, 0, W, floorY);
  // crowd dots
  for (let i = 0; i < 70; i++) {
    const x = (i * 97.3) % W, y = 40 + ((i * 53.7) % (floorY * 0.35));
    ctx.fillStyle = ["#f472b6", "#facc15", "#60a5fa", "#a78bfa", "#fb923c"][i % 5];
    ctx.globalAlpha = .35; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.fill();
  }
  ctx.globalAlpha = 1;
  const floor = ctx.createLinearGradient(0, floorY, 0, H);
  floor.addColorStop(0, "#d99a4e"); floor.addColorStop(1, "#f0c27b");
  ctx.fillStyle = floor; ctx.fillRect(0, floorY, W, H - floorY);
  ctx.strokeStyle = "rgba(120,60,10,.18)"; ctx.lineWidth = 2;
  for (let x = -W; x < W * 2; x += 46) { ctx.beginPath(); ctx.moveTo(W / 2 + (x - W / 2) * 0.35, floorY); ctx.lineTo(x, H); ctx.stroke(); }
}
function drawBall(ctx, x, y, r, spin = 0, fire = false) {
  if (fire) {
    ctx.save();
    ctx.shadowColor = "#fb923c"; ctx.shadowBlur = r * 1.4;
    ctx.fillStyle = "rgba(251,146,60,.55)"; ctx.beginPath(); ctx.arc(x, y + r * .25, r * 1.35, 0, 7); ctx.fill();
    ctx.restore();
  }
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, "#fdba74"); g.addColorStop(1, "#ea580c");
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.strokeStyle = "#7c2d12"; ctx.lineWidth = Math.max(1.2, r * .07);
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 1.15, 0, r * .85, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 1.15, 0, r * .85, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}
// part "back": backboard and the far half of the rim. part "front": near half of the rim and the net.
function drawHoop(ctx, cx, cy, w, part, netSwing = 0) {
  const rx = w / 2, ry = w * .15;
  if (part === "back") {
    const bw = w * 1.6, bh = w * 1.05;
    ctx.fillStyle = "rgba(255,255,255,.92)"; ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(cx - bw / 2, cy - bh + w * .08, bw, bh, 8); ctx.fill(); ctx.stroke();
    ctx.strokeRect(cx - w * .32, cy - w * .5, w * .64, w * .44);
    ctx.strokeStyle = "#ea580c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 2;
    const nb = w * .55 + netSwing, depth = w * .55;
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      ctx.beginPath(); ctx.moveTo(cx - rx + t * w, cy);
      ctx.lineTo(cx - nb / 2 + t * nb, cy + depth); ctx.stroke();
    }
    for (let j = 1; j <= 2; j++) {
      const k = j / 3, half = rx - (rx - nb / 2) * k;
      ctx.beginPath(); ctx.ellipse(cx, cy + depth * k, half, ry * (1 - k * .4), 0, 0, Math.PI); ctx.stroke();
    }
    ctx.strokeStyle = "#ea580c"; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI); ctx.stroke();
  }
}
function drawText(ctx, text, x, y, size, color = "#fff", align = "center") {
  ctx.font = `900 ${size}px ui-rounded, "SF Pro Rounded", system-ui, sans-serif`;
  ctx.textAlign = align; ctx.textBaseline = "middle";
  ctx.lineWidth = Math.max(3, size / 7); ctx.strokeStyle = "#1f2937"; ctx.lineJoin = "round";
  ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}
// Floating "+2" style texts.
class Floaters {
  constructor() { this.list = []; }
  add(text, x, y, color = "#ffc800", size = 34) { this.list.push({ text, x, y, color, size, t: 0 }); }
  update(dt) { this.list.forEach(f => f.t += dt); this.list = this.list.filter(f => f.t < 1.1); }
  draw(ctx) {
    for (const f of this.list) {
      ctx.globalAlpha = Math.max(0, 1 - f.t / 1.1);
      drawText(ctx, f.text, f.x, f.y - f.t * 50, f.size * (f.t < .15 ? .7 + f.t * 2.5 : 1), f.color);
    }
    ctx.globalAlpha = 1;
  }
}

// ---------- Swish Shot: flick the ball at a moving hoop ----------
class SwishShot {
  constructor() { this.score = 0; this.time = 30; this.streak = 0; this.fx = new Floaters(); this.clock = 0; this.phase = 0; }
  resize(W, H) {
    this.W = W; this.H = H;
    this.r = Math.min(W, H) * .085;
    this.hoopW = Math.min(W * .3, 130);
    this.hoopY = H * .27;
    this.home = { x: W / 2, y: H * .8 };
    if (!this.ball) this.newBall();
  }
  newBall() { this.ball = { x: this.home.x, y: this.home.y, r: this.r, state: "ready", spin: 0 }; }
  start() { this.running = true; }
  // The hoop swings faster as the score goes up. The swing angle is added up a
  // frame at a time, so a speed change never makes the hoop jump across the screen
  // (sin(clock * speed) did: a new speed moved the whole swing at once).
  get hoopX() { return this.W / 2 + Math.sin(this.phase) * this.W * .28; }
  hud() { return [icon("ball") + this.score, icon("clock") + Math.ceil(this.time)]; }
  down(x, y) {
    if (this.ball.state === "ready" && Math.hypot(x - this.ball.x, y - this.ball.y) < this.r * 2.6)
      this.drag = { x, y, t: performance.now() };
  }
  up(x, y) {
    if (!this.drag || !this.running) { this.drag = null; return; }
    const dx = x - this.drag.x, dy = this.drag.y - y;
    this.drag = null;
    if (dy < 25) { this.fx.add("Flick UP!", this.W / 2, this.home.y - this.r * 2, "#fff", 26); return; }
    const b = this.ball;
    const ex = b.x + dx * ((b.y - this.hoopY) / dy) * 0.9;
    b.state = "fly";
    b.f = { t: 0, sx: b.x, sy: b.y, ex: Math.max(-40, Math.min(this.W + 40, ex)), short: dy < 60 };
    sfx("pass");
  }
  update(dt) {
    this.clock += dt;
    this.phase += dt * (0.8 + Math.min(this.score, 30) * 0.035);
    this.fx.update(dt);
    if (this.running) {
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.running = false; if (this.ball.state === "ready") this.done = true; }
    }
    const b = this.ball;
    if (b.state === "fly") {
      const f = b.f;
      f.t += dt / 0.8;
      const t = Math.min(1, f.t);
      const ey = f.short ? this.hoopY + this.H * .2 : this.hoopY;
      b.x = f.sx + (f.ex - f.sx) * t;
      b.y = f.sy + (ey - f.sy) * t - Math.sin(Math.PI * t) * this.H * .22;
      b.r = this.r * (1 - .45 * t);
      b.spin += dt * 10;
      if (t >= 1) {
        const off = Math.abs(b.x - this.hoopX);
        if (!f.short && off < this.hoopW * .4) {
          this.streak++;
          const pts = this.streak > 3 ? 3 : 2;
          this.score += pts;
          b.state = "drop"; b.vy = 40; b.hx = this.hoopX;
          sfx(this.streak === 3 ? "combo" : "swish");
          this.fx.add(this.streak === 3 ? "ON FIRE!" : (off < this.hoopW * .15 ? "SWISH!" : "+" + pts), this.hoopX, this.hoopY - 40);
          this.netSwing = 14;
        } else {
          this.streak = 0;
          b.state = "bounce"; b.vx = (b.x < this.hoopX ? -1 : 1) * 260; b.vy = -260;
          sfx("clank");
          this.fx.add(f.short ? "Too short!" : "Clank!", b.x, this.hoopY - 30, "#fca5a5", 28);
        }
      }
    } else if (b.state === "drop") {
      b.vy += 900 * dt; b.y += b.vy * dt; b.x = b.hx;
      if (b.y > this.hoopY + this.H * .3) this.reload();
    } else if (b.state === "bounce") {
      b.vy += 1100 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 8;
      if (b.y > this.H + 60 || b.x < -80 || b.x > this.W + 80) this.reload();
    }
    if (this.netSwing) this.netSwing = Math.max(0, this.netSwing - dt * 40);
  }
  reload() { if (!this.running) { this.done = true; return; } this.newBall(); }
  draw(ctx) {
    const { W, H } = this, hx = this.hoopX;
    drawGym(ctx, W, H, H * .52);
    drawHoop(ctx, hx, this.hoopY, this.hoopW, "back");
    const b = this.ball;
    const fire = this.streak >= 3;
    const behind = b.state === "drop" || (b.state === "fly" && b.f.t > .55);
    if (behind) drawBall(ctx, b.x, b.y, b.r, b.spin, fire);
    drawHoop(ctx, hx, this.hoopY, this.hoopW, "front", this.netSwing || 0);
    if (!behind) drawBall(ctx, b.x, b.y, b.r, b.spin, fire);
    if (b.state === "ready" && this.running) {
      const bob = Math.sin(this.clock * 6) * 6;
      // a bouncing arrow that says "flick up"
      const ax = b.x, ay = b.y - this.r * 1.9 + bob;
      ctx.fillStyle = "#ffc800"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3; ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(ax, ay - 16); ctx.lineTo(ax + 14, ay); ctx.lineTo(ax + 6, ay); ctx.lineTo(ax + 6, ay + 14);
      ctx.lineTo(ax - 6, ay + 14); ctx.lineTo(ax - 6, ay); ctx.lineTo(ax - 14, ay); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    if (fire) drawText(ctx, "ON FIRE x3", W / 2, H * .5, 26, "#fb923c");
    this.fx.draw(ctx);
  }
}

// ---------- Free Throw Frenzy: stop the meter in the green ----------
class FreeThrow {
  constructor() { this.score = 0; this.shots = 10; this.taken = 0; this.makes = 0; this.fx = new Floaters();
    this.p = 0; this.dir = 1; this.zoneW = .3; this.zoneC = .5; this.clock = 0; }
  resize(W, H) {
    this.W = W; this.H = H; this.r = Math.min(W, H) * .08;
    this.hoopW = Math.min(W * .32, 140); this.hoopX = W / 2; this.hoopY = H * .3;
    this.home = { x: W / 2, y: H * .7 };
    if (!this.ball) this.ball = { x: this.home.x, y: this.home.y, r: this.r, state: "ready", spin: 0 };
  }
  start() { this.running = true; }
  hud() { return [icon("ball") + this.score, `Shot ${Math.min(this.taken + 1, this.shots)}/${this.shots}`]; }
  // Gets faster with each make, but never past 1.2 sweeps a second.
  get speed() { return Math.min(1.2, 0.85 + this.makes * 0.13); }
  down() {
    if (!this.running || this.ball.state !== "ready") return;
    const d = Math.abs(this.p - this.zoneC);
    const inZone = d <= this.zoneW / 2, perfect = d <= this.zoneW * .15;
    const b = this.ball;
    b.state = "fly"; b.f = { t: 0, sx: b.x, sy: b.y, result: inZone ? (perfect ? "perfect" : "make") : (this.p < this.zoneC ? "short" : "long") };
    this.taken++;
    sfx("pass");
  }
  update(dt) {
    this.clock += dt; this.fx.update(dt);
    if (this.running && this.ball.state === "ready") {
      this.p += this.dir * this.speed * dt;
      if (this.p > 1) { this.p = 1; this.dir = -1; } if (this.p < 0) { this.p = 0; this.dir = 1; }
    }
    const b = this.ball;
    if (b.state === "fly") {
      const f = b.f; f.t += dt / .85; const t = Math.min(1, f.t);
      const ey = f.result === "short" ? this.hoopY + 10 : f.result === "long" ? this.hoopY - this.hoopW * .55 : this.hoopY;
      const ex = this.hoopX + (f.result === "long" ? 10 : 0);
      b.x = f.sx + (ex - f.sx) * t; b.y = f.sy + (ey - f.sy) * t - Math.sin(Math.PI * t) * this.H * .2;
      b.r = this.r * (1 - .4 * t); b.spin += dt * 9;
      if (t >= 1) {
        if (f.result === "make" || f.result === "perfect") {
          const pts = f.result === "perfect" ? 3 : 2;
          this.score += pts; this.makes++;
          b.state = "drop"; b.vy = 40;
          sfx("swish"); this.netSwing = 14;
          this.fx.add(f.result === "perfect" ? "PERFECT! +3" : "+2", this.hoopX, this.hoopY - 46);
          // The green zone shrinks, but never below .18 of the bar: at top speed that is
          // still about 150 ms to tap, so a late shot takes timing, not luck.
          this.zoneW = Math.max(.18, this.zoneW * .86);
        } else {
          b.state = "bounce"; b.vx = (Math.random() < .5 ? -1 : 1) * 200; b.vy = f.result === "short" ? -200 : -120;
          sfx("clank");
          this.fx.add(f.result === "short" ? "Too short!" : "Too long!", this.hoopX, this.hoopY - 46, "#fca5a5", 28);
        }
      }
    } else if (b.state === "drop") {
      b.vy += 900 * dt; b.y += b.vy * dt;
      if (b.y > this.hoopY + this.H * .25) this.reload();
    } else if (b.state === "bounce") {
      b.vy += 1000 * dt; b.x += b.vx * dt; b.y += b.vy * dt; b.spin += dt * 8;
      if (b.y > this.H + 60) this.reload();
    }
    if (this.netSwing) this.netSwing = Math.max(0, this.netSwing - dt * 40);
  }
  reload() {
    if (this.taken >= this.shots) { this.running = false; this.done = true; return; }
    this.zoneC = .3 + Math.random() * .4;
    this.p = 0; this.dir = 1;
    this.ball = { x: this.home.x, y: this.home.y, r: this.r, state: "ready", spin: 0 };
  }
  draw(ctx) {
    const { W, H } = this;
    drawGym(ctx, W, H, H * .5);
    // free throw lane
    ctx.fillStyle = "rgba(29,53,87,.25)";
    ctx.beginPath(); ctx.moveTo(W * .36, H * .5); ctx.lineTo(W * .64, H * .5); ctx.lineTo(W * .8, H); ctx.lineTo(W * .2, H); ctx.fill();
    const b = this.ball;
    const behind = b.state === "drop" || (b.state === "fly" && b.f.t > .55);
    drawHoop(ctx, this.hoopX, this.hoopY, this.hoopW, "back");
    if (behind) drawBall(ctx, b.x, b.y, b.r, b.spin);
    drawHoop(ctx, this.hoopX, this.hoopY, this.hoopW, "front", this.netSwing || 0);
    if (!behind) drawBall(ctx, b.x, b.y, b.r, b.spin);
    // the meter
    const mx = W * .1, mw = W * .8, my = H * .86, mh = 30;
    ctx.fillStyle = "#1f2937"; ctx.beginPath(); ctx.roundRect(mx - 4, my - 4, mw + 8, mh + 8, 12); ctx.fill();
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.roundRect(mx, my, mw, mh, 9); ctx.fill();
    ctx.fillStyle = "#58cc02"; ctx.fillRect(mx + (this.zoneC - this.zoneW / 2) * mw, my, this.zoneW * mw, mh);
    ctx.fillStyle = "#ffc800"; ctx.fillRect(mx + (this.zoneC - this.zoneW * .15) * mw, my, this.zoneW * .3 * mw, mh);
    const nx = mx + this.p * mw;
    ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(nx - 6, my - 12, 12, mh + 24, 5); ctx.fill(); ctx.stroke();
    if (this.running && b.state === "ready") drawText(ctx, "TAP in the green!", W / 2, my - 34, 24, "#fff");
    this.fx.draw(ctx);
  }
}

// ---------- Pass Pop: tap the open teammate ----------
class PassPop {
  constructor() { this.score = 0; this.time = 30; this.fx = new Floaters(); this.clock = 0; this.open = null; this.wait = .6; }
  resize(W, H) {
    this.W = W; this.H = H;
    const size = Math.min(W - 20, H - 150);
    this.s = size / 100; this.ox = (W - size) / 2; this.oy = 90 + (H - 150 - size) / 2;
    if (!this.players) {
      this.players = Object.keys(SPOTS).map((k, i) => ({ id: i + 1, spot: k, ...SPOTS[k] }));
      this.holder = this.players[0];
      this.ball = { x: this.holder.x, y: this.holder.y };
    }
  }
  P(x, y) { return [this.ox + x * this.s, this.oy + y * this.s]; }
  start() { this.running = true; }
  hud() { return [icon("ball") + this.score, icon("clock") + Math.ceil(this.time)]; }
  get window() { return Math.max(.85, 1.7 - this.score * .05); }
  // Only a teammate next to the ball gets open: skip passes are steals in the lessons.
  pickOpen() {
    const next = PASSES[this.holder.spot].map(s => this.players.find(p => p.spot === s));
    this.open = { p: pick(next), t: 0, dur: this.window };
  }
  down(x, y) {
    if (!this.running || this.passing) return;
    const hit = this.players.find(p => { const [px, py] = this.P(p.x, p.y); return Math.hypot(x - px, y - py) < 7 * this.s; });
    if (!hit || hit === this.holder) return;
    if (this.open && hit === this.open.p) {
      this.score++;
      sfx("coin");
      const [px, py] = this.P(hit.x, hit.y);
      this.fx.add(pick(["+1", "Nice!", "Open!", "+1"]), px, py - 30);
      this.passing = { to: hit, t: 0, from: { x: this.ball.x, y: this.ball.y } };
      this.open = null;
    } else {
      sfx("steal");
      this.score = Math.max(0, this.score - 1);
      const [px, py] = this.P(hit.x, hit.y);
      this.fx.add("STEAL! -1", px, py - 30, "#fca5a5", 30);
      this.shake = .3;
    }
  }
  update(dt) {
    this.clock += dt; this.fx.update(dt);
    if (this.shake) this.shake = Math.max(0, this.shake - dt);
    if (!this.running) return;
    this.time -= dt;
    if (this.time <= 0) { this.time = 0; this.running = false; this.done = true; return; }
    if (this.passing) {
      const ps = this.passing; ps.t += dt / .22;
      const t = Math.min(1, ps.t);
      this.ball.x = ps.from.x + (ps.to.x - ps.from.x) * t; this.ball.y = ps.from.y + (ps.to.y - ps.from.y) * t;
      if (t >= 1) { this.holder = ps.to; this.passing = null; this.wait = .3; }
      return;
    }
    if (this.open) {
      this.open.t += dt;
      if (this.open.t > this.open.dur) {
        const [px, py] = this.P(this.open.p.x, this.open.p.y);
        this.fx.add("Too slow!", px, py - 30, "#e5e7eb", 24);
        this.open = null; this.wait = .35;
      }
    } else {
      this.wait -= dt;
      if (this.wait <= 0) { this.pickOpen(); sfx("pop"); }
    }
  }
  draw(ctx) {
    const { W, H } = this;
    ctx.fillStyle = "#1d3557"; ctx.fillRect(0, 0, W, H);
    ctx.save();
    if (this.shake) ctx.translate(Math.sin(this.clock * 80) * 6, 0);
    const s = this.s, [x0, y0] = this.P(0, 0);
    ctx.fillStyle = "#e8b26a"; ctx.fillRect(x0, y0, 100 * s, 100 * s);
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2;
    ctx.strokeRect(...this.P(36, 63), 28 * s, 33 * s);
    ctx.beginPath(); ctx.moveTo(...this.P(10, 96)); ctx.lineTo(...this.P(10, 80));
    const a = Math.atan2(9, 40); // the arc meets the corner lines 9 units above the hoop
    ctx.arc(...this.P(50, 89), 41 * s, -Math.PI + a, -a, false);
    ctx.lineTo(...this.P(90, 96)); ctx.stroke();
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(...this.P(50, 89), 2.4 * s, 0, 7); ctx.stroke();
    for (const p of this.players) {
      const [px, py] = this.P(p.x, p.y);
      const isOpen = this.open && this.open.p === p;
      // defender: next to the player, sliding away when the player is open
      const k = isOpen ? Math.min(1, this.open.t * 6) : 0;
      const dx = (HOOP.x - p.x), dy = (HOOP.y - p.y), L = Math.hypot(dx, dy);
      const gx = p.x + dx / L * 7 + (isOpen ? -dy / L * 10 * k : 0), gy = p.y + dy / L * 7 + (isOpen ? dx / L * 10 * k : 0);
      const [qx, qy] = this.P(gx, gy);
      ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(qx, qy, 3.4 * s, 0, 7); ctx.fill();
      if (isOpen) {
        const left = 1 - this.open.t / this.open.dur;
        ctx.strokeStyle = "#58cc02"; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(px, py, 6.8 * s, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); ctx.stroke();
        drawText(ctx, "OPEN!", px, py - 9 * s, Math.max(18, 4.6 * s), "#58cc02");
      }
      ctx.fillStyle = COLORS[p.id - 1]; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(px, py, 4.4 * s, 0, 7); ctx.fill(); ctx.stroke();
      drawText(ctx, String(p.id), px, py + 1, 4.6 * s, "#fff");
    }
    const [bx, by] = this.P(this.ball.x + 3, this.ball.y + 2.6);
    drawBall(ctx, bx, by, 2.2 * s, this.clock * 3);
    ctx.restore();
    this.fx.draw(ctx);
  }
}

// ---------- Dribble Dash: tap left-right to race the defender ----------
class DribbleDash {
  constructor() { this.score = 0; this.clock = 0; this.me = 0; this.cpu = 0; this.next = "L"; this.fx = new Floaters();
    this.flash = {}; this.bounce = 0; this.cpuTime = 11 + Math.random() * 1.2; }
  resize(W, H) {
    this.W = W; this.H = H;
    const bw = Math.min(W * .42, 170);
    this.btns = { L: { x: W * .27, y: H - 90, r: bw / 2.4 }, R: { x: W * .73, y: H - 90, r: bw / 2.4 } };
    this.top = 210; this.bottom = H - 200;
  }
  start() { this.running = true; }
  hud() { return [icon("clock") + this.clock.toFixed(1), this.me >= 1 ? icon("check") : `${Math.round(this.me * 100)}%`]; }
  down(x, y) {
    if (!this.running) return;
    const hit = Object.entries(this.btns).find(([, b]) => Math.hypot(x - b.x, y - b.y) < b.r * 1.25);
    if (!hit) return;
    const k = hit[0];
    this.flash[k] = .12;
    if (k === this.next) {
      this.me = Math.min(1, this.me + .024);
      this.next = k === "L" ? "R" : "L";
      this.bounce = 1;
      sfx("bounce");
    } else {
      this.flash[k + "x"] = .25;
    }
  }
  update(dt) {
    this.fx.update(dt);
    for (const k in this.flash) this.flash[k] = Math.max(0, this.flash[k] - dt);
    this.bounce = Math.max(0, this.bounce - dt * 5);
    if (!this.running) { if (this.dunk !== undefined) { this.dunk += dt; if (this.dunk > 1.4) this.done = true; } return; }
    this.clock += dt;
    this.cpu = Math.min(1, this.cpu + dt / this.cpuTime);
    if (this.me >= 1) {
      this.running = false; this.won = this.cpuFinish === undefined;
      this.score = this.clock; this.dunk = 0;
      sfx("swish");
      this.fx.add(this.won ? "SLAM DUNK!" : "Made it!", this.W / 2, this.top + 30, "#ffc800", 40);
    }
    if (this.cpu >= 1 && this.cpuFinish === undefined) {
      this.cpuFinish = this.clock;
      this.fx.add("Defender wins!", this.W / 2, this.top + 70, "#fca5a5", 30);
    }
    if (this.clock > 25) { this.running = false; this.won = false; this.score = this.clock; this.done = true; }
  }
  draw(ctx) {
    const { W, H } = this;
    const floor = ctx.createLinearGradient(0, 0, 0, H);
    floor.addColorStop(0, "#d99a4e"); floor.addColorStop(1, "#f0c27b");
    ctx.fillStyle = floor; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "rgba(255,255,255,.8)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W / 2, this.top - 30); ctx.lineTo(W / 2, this.bottom + 40); ctx.stroke();
    for (let y = this.top; y <= this.bottom; y += (this.bottom - this.top) / 4) {
      ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.beginPath(); ctx.moveTo(10, y); ctx.lineTo(W - 10, y); ctx.stroke();
    }
    const hw = Math.min(W * .22, 90);
    drawHoop(ctx, W * .27, this.top - 20, hw, "back"); drawHoop(ctx, W * .27, this.top - 20, hw, "front");
    drawHoop(ctx, W * .73, this.top - 20, hw, "back"); drawHoop(ctx, W * .73, this.top - 20, hw, "front");
    const yOf = p => this.bottom - (this.bottom - this.top) * p;
    const r = Math.min(W * .07, 30);
    // defender
    const cy = yOf(this.cpu);
    ctx.fillStyle = "#ef4444"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(W * .73, cy, r, 0, 7); ctx.fill(); ctx.stroke();
    drawText(ctx, "D", W * .73, cy + 1, r, "#fff");
    drawBall(ctx, W * .73 + r * 1.2, cy + r * .6 + Math.abs(Math.sin(this.clock * 9)) * 10, r * .45, this.clock * 5);
    // you
    let my = yOf(this.me);
    if (this.dunk !== undefined) my = yOf(1) - Math.sin(Math.min(1, this.dunk * 2) * Math.PI) * 30;
    ctx.fillStyle = COLORS[0];
    ctx.beginPath(); ctx.arc(W * .27, my, r, 0, 7); ctx.fill(); ctx.stroke();
    drawText(ctx, "YOU", W * .27, my + 1, r * .62, "#fff");
    drawBall(ctx, W * .27 + r * 1.2, my + r * .6 + this.bounce * 14, r * .45, this.me * 40);
    // buttons
    for (const [k, b] of Object.entries(this.btns)) {
      const want = this.running && this.next === k;
      const wrong = this.flash[k + "x"] > 0;
      ctx.fillStyle = wrong ? "#ff4b4b" : want ? "#58cc02" : "#94a3b8";
      ctx.beginPath(); ctx.arc(b.x, b.y + (this.flash[k] ? 4 : 0), b.r, 0, 7); ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = "#fff"; ctx.stroke();
      drawText(ctx, k === "L" ? "LEFT" : "RIGHT", b.x, b.y + (this.flash[k] ? 4 : 0), b.r * .42, "#fff");
    }
    this.fx.draw(ctx);
  }
}

// ---------- The frame every game runs in ----------
let miniCoach = null;
let miniGame = null;

function sizeCanvas() {
  const c = $("#miniCanvas"), dpr = Math.min(window.devicePixelRatio || 1, 3);
  const W = c.clientWidth, H = c.clientHeight;
  c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
  const ctx = c.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (miniGame) miniGame.resize(W, H);
  return ctx;
}
function canvasPoint(e) { const r = $("#miniCanvas").getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
(function wireCanvas() {
  const c = $("#miniCanvas");
  c.addEventListener("pointerdown", e => { e.preventDefault(); if (miniGame && miniGame.down) miniGame.down(...canvasPoint(e)); });
  c.addEventListener("pointermove", e => { if (miniGame && miniGame.move) miniGame.move(...canvasPoint(e)); });
  c.addEventListener("pointerup", e => { if (miniGame && miniGame.up) miniGame.up(...canvasPoint(e)); });
  window.addEventListener("resize", () => { if (miniGame) sizeCanvas(); });
})();

function overlay(inner, dim = true) {
  const o = $("#miniOverlay");
  o.className = "overlay" + (dim ? " dim" : "");
  o.innerHTML = "";
  o.classList.remove("hidden");
  if (typeof inner === "string") o.innerHTML = inner; else o.appendChild(inner);
  return o;
}
function hideOverlay() { $("#miniOverlay").classList.add("hidden"); }
function waitForButton(btn) { return new Promise(r => btn.addEventListener("click", r, { once: true })); }

// Plays one game from intro to medal. Resolves with { medal, score, best, xp, again }.
async function playMini(id) {
  const def = GAMES[id];
  const myRun = RUN;
  setActiveCoach(miniCoach);
  miniCoach.mood("idle");
  $("#miniHudA").textContent = ""; $("#miniHudB").textContent = "";

  // Intro card with the coach explaining the game.
  const card = html("div", "panel");
  card.appendChild(miniCoach.el);
  html("h2", "", card, def.title);
  html("p", "", card, def.intro);
  html("div", "howto", card, `<span class="glyph-badge game">${icon(def.glyph)}</span>`);
  html("div", "tiers", card, def.tiers.map((t, i) => `<span>${medalIcon(i + 1)} ${def.lowerIsBetter ? t + "s" : t}</span>`).join(""));
  const go = html("button", "btn green wide", card, "Play!");
  miniGame = def.make();
  const ctx = sizeCanvas();
  overlay(card);
  speak(def.intro);
  let raf = 0;
  const loop = (() => { let last = performance.now();
    return function tick(now) {
      if (myRun !== RUN) return;
      const dt = Math.min(.05, (now - last) / 1000); last = now;
      miniGame.update(dt);
      const W = $("#miniCanvas").clientWidth, H = $("#miniCanvas").clientHeight;
      ctx.clearRect(0, 0, W, H);
      miniGame.draw(ctx);
      if (miniGame.running || miniGame.done) { const [a, b] = miniGame.hud(); if ($("#miniHudA").innerHTML !== a) $("#miniHudA").innerHTML = a; if ($("#miniHudB").innerHTML !== b) $("#miniHudB").innerHTML = b; }
      raf = requestAnimationFrame(tick);
    }; })();
  raf = requestAnimationFrame(loop);
  await waitForButton(go);
  if (myRun !== RUN) throw ABORT;
  voiceEl.pause();

  // 3, 2, 1, GO!
  for (const n of ["3", "2", "1"]) {
    overlay(`<div class="banner">${n}</div>`, false);
    sfx("tick");
    await sleep(700);
  }
  overlay(`<div class="banner go">GO!</div>`, false);
  sfx("go");
  miniGame.start();
  await sleep(600);
  hideOverlay();
  while (!miniGame.done) await sleep(100);

  sfx("whistle");
  overlay(`<div class="banner finish">FINISH!</div>`, false);
  await sleep(1500);

  // Results and medal.
  const won = miniGame.won !== false;
  const score = def.lowerIsBetter ? Math.round(miniGame.score * 10) / 10 : miniGame.score;
  const medal = medalFor(def, score, won);
  const prevBest = save.best[id];
  const better = won && (prevBest === undefined || (def.lowerIsBetter ? score < prevBest : score > prevBest));
  if (better) save.best[id] = score;
  save.medals[id] = Math.max(save.medals[id] || 0, medal);
  const xp = MEDAL_XP[medal];
  addXP(xp);
  const newDay = touchStreak(); // bonus games keep the streak alive too
  challenge("game"); challenge("medal", medal);
  const res = html("div", "panel");
  res.appendChild(miniCoach.el);
  miniCoach.mood(medal >= 2 ? "cheer" : medal === 1 ? "happy" : "idle");
  html("div", "medal", res, medal ? medalIcon(medal) : icon("ball"));
  html("div", "result-score", res, won ? `${fmtScore(def, score)} ${def.lowerIsBetter ? "" : def.unit}` : "So close!");
  html("div", "result-best", res, better && prevBest !== undefined ? `${icon("star")} New best!` : save.best[id] !== undefined ? `Best: ${fmtScore(def, save.best[id])}` : "");
  html("div", "result-best", res, `+${xp} XP`);
  const again = html("button", "btn ghost wide", res, "Play again");
  const cont = html("button", "btn green wide", res, "Continue");
  overlay(res);
  const line = !won ? "The defender won this time. Try again!"
    : ["Good try! Play again to win a medal!", "Bronze medal! Nice work!", "Silver medal! Great job!", "Gold medal! You're a superstar!"][medal];
  if (medal) { sfx("fanfare"); if (medal === 3) confetti(); }
  speak(line);
  const choice = await Promise.race([waitForButton(again).then(() => "again"), waitForButton(cont).then(() => "continue")]);
  cancelAnimationFrame(raf);
  if (myRun !== RUN) throw ABORT;
  return { medal, score, xp, newDay, again: choice === "again" };
}
