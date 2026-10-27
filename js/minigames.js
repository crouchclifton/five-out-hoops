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
  hoopwall: {
    title: "Hoop Wall", glyph: "hoopwall",
    intro: "Hoop Wall! <b>Hold</b> to power up and <b>let go</b> when the meter is level with a row of hoops. Slide your finger to move. Higher hoops score more!",
    tiers: [14, 22, 30], unit: "points", make: () => new HoopWall(),
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


// ---------- Hoop Wall: hold to power up, let go to shoot at a wall of hoops ----------
// Inspired by a Mario Party mini game Clifton sent (two screenshots, October 2026).
// Three rows on a brick wall: bottom +1, a sliding gold middle row +2, top +3.
// You and three CPU players (made-up kids from the cards) race for 30 seconds.
const HW_ROWS = [{ pts: 3, n: 4, rim: "#ea580c" }, { pts: 2, n: 5, rim: "#f5b800", slide: true }, { pts: 1, n: 4, rim: "#ea580c" }];
const HW_TOL = 0.075;           // how close to a row's level the meter has to be
const HW_FILL = 1.0;            // meter fills bottom to top in 1 second, then drains
// CPU skill: how far off their timing and aim are, and which rows they go for.
const HW_CPU = [
  { name: "Sam", card: "sam", color: "#ef4444", sigma: .085, aim: .3, rows: [.15, .3, .55], predict: false },
  { name: "Zeke", card: "zeke", color: "#22c55e", sigma: .06, aim: .2, rows: [.3, .35, .35], predict: false },
  { name: "Rex", card: "rex", color: "#a855f7", sigma: .07, aim: .16, rows: [.35, .35, .3], predict: true },
];
function hwImage(look, pose) {
  // The card art's orange ball comes out: each shooter holds a ball in their own color.
  const svgText = playerSVG({ look: { ...look, pose } })
    .replace(/<g class="pl-ball">.*?<\/g><\/g>/g, "")
    .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="220" ');
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
  return img;
}
function drawTintBall(ctx, x, y, r, color, spin = 0) {
  const g = ctx.createRadialGradient(x - r * .35, y - r * .35, r * .1, x, y, r);
  g.addColorStop(0, "#fff"); g.addColorStop(.25, color); g.addColorStop(1, color);
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
  ctx.save(); ctx.translate(x, y); ctx.rotate(spin);
  ctx.strokeStyle = "rgba(0,0,0,.45)"; ctx.lineWidth = Math.max(1.2, r * .08);
  ctx.beginPath(); ctx.moveTo(-r, 0); ctx.lineTo(r, 0); ctx.moveTo(0, -r); ctx.lineTo(0, r); ctx.stroke();
  ctx.beginPath(); ctx.arc(-r * 1.15, 0, r * .85, -0.9, 0.9); ctx.stroke();
  ctx.beginPath(); ctx.arc(r * 1.15, 0, r * .85, Math.PI - 0.9, Math.PI + 0.9); ctx.stroke();
  ctx.restore();
}
class HoopWall {
  constructor() {
    this.time = 30; this.clock = 0; this.slide = 0; this.fx = new Floaters(); this.sparks = []; this.shake = 0;
    const me = typeof currentPlayer === "function" && currentPlayer();
    const myLook = { ...(me && me.look ? me.look : { skin: 2, hair: "short", hc: "#111827", num: 1 }), jersey: "#1e3a8a", trim: "#f97316" };
    const cpus = HW_CPU.map(c => ({ ...c, look: { ...cardById(c.card).look, jersey: c.color, trim: "#ffffff" } }));
    this.players = [
      { name: "You", you: true, color: "#f97316", look: myLook },
      ...cpus,
    ].map(p => ({ ...p, score: 0, x: 0, tx: 0, p: 0, dir: 1, charging: false, ball: null, cool: 0, jump: 0,
      state: "think", wait: .4 + Math.random() * .8, img: { hold: hwImage(p.look, "hold"), shoot: hwImage(p.look, "shoot") } }));
    // You start second from the left, between two CPU players.
    [this.players[1], this.players[0]] = [this.players[0], this.players[1]];
  }
  get me() { return this.players.find(p => p.you); }
  get score() { return this.me.score; }
  resize(W, H) {
    this.W = W; this.H = H;
    this.wallTop = 128; this.floorY = H * .64;
    this.pw = W - 46; // the hoops and shooters stay left of the power meter
    this.hw = Math.min(this.pw / 5, 70);
    const span = this.floorY - this.wallTop;
    this.rowY = [this.wallTop + span * .2, this.wallTop + span * .5, this.wallTop + span * .8];
    this.feetY = H - 34;
    this.sh = Math.min(H * .19, 150);
    this.launchY = this.feetY - this.sh * .78;
    this.topY = this.wallTop - 18;
    if (!this.placed) { this.placed = true; this.players.forEach((p, i) => { p.x = p.tx = this.pw * (.14 + i * .24); }); }
    this.bricks = null; // redrawn at the new size
  }
  start() { this.running = true; }
  hud() { return [icon("ball") + this.score, icon("clock") + Math.ceil(this.time)]; }
  // Meter level -> how high the ball goes, and the level each row needs.
  yOf(p) { return this.launchY - p * (this.launchY - this.topY); }
  pRow(r) { return (this.launchY - (this.rowY[r] - this.hw * .3)) / (this.launchY - this.topY); }
  hoopsIn(r) {
    const row = HW_ROWS[r], W = this.pw;
    if (!row.slide) return Array.from({ length: row.n }, (_, i) => W * (i + .5) / row.n);
    const sp = W / 4, loop = sp * row.n;
    return Array.from({ length: row.n }, (_, i) => ((i * sp + this.slide) % loop + loop) % loop - sp / 2);
  }
  slideAt(t) { return this.slide + t * this.W * .11; }
  // Pointer: press to start charging, slide to move, let go to shoot.
  down(x) { const m = this.me; if (!this.running || m.cool > 0 || m.ball) return; m.tx = x; m.charging = true; m.p = 0; m.dir = 1; }
  move(x) { if (this.me.charging) this.me.tx = x; }
  up() { const m = this.me; if (m.charging) this.shoot(m); }
  shoot(pl) {
    pl.charging = false; pl.jump = 1;
    let row = null, best = 1;
    HW_ROWS.forEach((_, r) => { const d = Math.abs(pl.p - this.pRow(r)); if (d <= HW_TOL && d < best) { best = d; row = r; } });
    pl.ball = { x: pl.x, y: this.launchY, t: 0, row, p: pl.p, phase: "up", spin: 0, r: this.sh * .11 };
    pl.cool = .45;
    sfx("pass");
  }
  updateBall(pl, dt) {
    const b = pl.ball;
    b.spin += dt * 9;
    if (b.phase === "up") {
      b.t += dt / .55;
      const k = Math.min(1, b.t), apex = b.row !== null ? this.rowY[b.row] - this.hw * .3 : this.yOf(b.p);
      b.y = this.launchY + (apex - this.launchY) * Math.sin(k * Math.PI / 2);
      b.r = this.sh * .11 * (1 - .3 * k);
      if (k < 1) return;
      if (b.row === null) {
        // Missed every row: off the bricks (or over the top) and back down.
        b.phase = "fall"; b.vx = (Math.random() - .5) * 120; b.vy = 60;
        if (pl.you) this.fx.add(b.p > this.pRow(0) ? "Too strong!" : b.p < this.pRow(2) ? "Too short!" : "In between!", b.x, b.y - 20, "#fca5a5", 24);
        sfx("bounce");
        return;
      }
      const hoops = this.hoopsIn(b.row);
      let hx = null, off = Infinity;
      for (const x of hoops) if (Math.abs(x - b.x) < off) { off = Math.abs(x - b.x); hx = x; }
      if (off < this.hw * .42) {
        const pts = HW_ROWS[b.row].pts;
        pl.score += pts;
        b.phase = "in"; b.hx = hx; b.ht = 0;
        this.wobble(b.row, hx, 1);
        if (pl.you) {
          sfx(pts === 3 ? "combo" : "swish");
          this.fx.add(off < this.hw * .12 ? `SWISH! +${pts}` : "+" + pts, hx, this.rowY[b.row] - this.hw * .7, pts === 3 ? "#ffc800" : "#fff", pts === 3 ? 38 : 32);
          this.burst(hx, this.rowY[b.row], pts === 3 ? 18 : 10, pts === 2 ? "#f5b800" : pl.color);
          if (pts === 3) this.shake = .25;
        } else {
          this.fx.add("+" + pts, hx, this.rowY[b.row] - this.hw * .55, pl.color, 22);
        }
      } else {
        b.phase = "fall"; b.vx = (b.x < hx ? -1 : 1) * (90 + Math.random() * 80); b.vy = -140;
        this.wobble(b.row, hx, .6);
        if (pl.you) { sfx("clank"); this.fx.add("Clank!", b.x, b.y - 24, "#fca5a5", 24); }
      }
    } else if (b.phase === "in") {
      b.ht += dt / .3;
      const r = HW_ROWS[b.row];
      if (r.slide) b.hx = this.hoopsIn(b.row).reduce((a, x) => Math.abs(x - b.hx) < Math.abs(a - b.hx) ? x : a);
      b.x += (b.hx - b.x) * Math.min(1, dt * 18);
      b.y = this.rowY[b.row] - this.hw * .3 + Math.min(1, b.ht) * this.hw * .6;
      if (b.ht >= 1.6) pl.ball = null;
    } else {
      b.vy += 900 * dt; b.x += b.vx * dt; b.y += b.vy * dt;
      if (b.y > this.feetY) pl.ball = null;
    }
  }
  wobble(r, x, k) { (this.wob = this.wob || []).push({ r, x, t: 0, k }); }
  burst(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 160;
      this.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60, t: 0, color: i % 3 ? color : "#fff" });
    }
  }
  // A CPU player: pick a hoop, walk under it, hold, and let go a little early or late.
  thinkCPU(pl, dt) {
    if (pl.state === "think") {
      pl.wait -= dt;
      if (pl.wait > 0 || pl.ball || !this.running) return;
      let n = Math.random(), r = 0;
      while (r < 2 && (n -= pl.rows[r]) > 0) r++;
      pl.row = r;
      // Skip hoops another shooter is already standing under, so nobody crowds you.
      const others = this.players.filter(o => o !== pl).map(o => o.tx);
      let hoops = this.hoopsIn(r).filter(x => x > 20 && x < this.pw - 20);
      const free = hoops.filter(x => others.every(o => Math.abs(o - x) > this.hw * .8));
      if (free.length) hoops = free;
      const near = hoops.sort((a, b) => Math.abs(a - pl.x) - Math.abs(b - pl.x)).slice(0, 2);
      pl.hoopX = pick(near);
      pl.miss = (Math.random() * 2 - 1) * this.hw * pl.aim;
      pl.want = Math.min(.98, this.pRow(r) + gauss() * pl.sigma);
      pl.tx = pl.hoopX + pl.miss;
      pl.state = "walk";
    } else if (pl.state === "walk") {
      pl.walkT = (pl.walkT || 0) + dt;
      if (HW_ROWS[pl.row].slide) {
        // The good CPU leads the moving hoop; the others aim where it is now. A hoop
        // sliding off the edge is swapped for the next one coming in, so the target
        // is always somewhere they can stand.
        const lead = pl.predict ? (pl.want / HW_FILL + .55) * this.W * .11 : 0;
        const ok = this.hoopsIn(pl.row).filter(x => x + lead > 30 && x + lead < this.pw - 20);
        const h = ok.reduce((a, x) => Math.abs(x - pl.hoopX) < Math.abs(a - pl.hoopX) ? x : a, ok[0]);
        pl.hoopX = h; pl.tx = h + lead + pl.miss;
      }
      pl.tx = Math.max(24, Math.min(this.pw - 10, pl.tx));
      if (Math.abs(pl.x - pl.tx) < 6 && this.running) { pl.state = "charge"; pl.charging = true; pl.p = 0; pl.dir = 1; pl.walkT = 0; }
      else if (pl.walkT > 3) { pl.state = "think"; pl.wait = .2; pl.walkT = 0; } // never get stuck
    } else if (pl.state === "charge") {
      if (!this.running) { pl.charging = false; pl.state = "think"; return; }
      if (pl.p >= pl.want || pl.dir < 0) { this.shoot(pl); pl.state = "think"; pl.wait = .25 + Math.random() * .5; }
    }
  }
  update(dt) {
    this.clock += dt;
    this.slide = this.slideAt(dt) ; // gold row drifts to the right and wraps around
    this.fx.update(dt);
    this.shake = Math.max(0, this.shake - dt);
    this.sparks.forEach(s => { s.t += dt; s.vy += 500 * dt; s.x += s.vx * dt; s.y += s.vy * dt; });
    this.sparks = this.sparks.filter(s => s.t < .7);
    if (this.wob) { this.wob.forEach(w => w.t += dt); this.wob = this.wob.filter(w => w.t < .6); }
    if (this.running) {
      this.time -= dt;
      if (this.time <= 0) { this.time = 0; this.running = false; this.players.forEach(p => p.charging = false); }
    }
    for (const pl of this.players) {
      if (!pl.you) this.thinkCPU(pl, dt);
      const walk = this.W * (pl.you ? 2.2 : .5) * dt;
      pl.tx = Math.max(24, Math.min(this.pw - 10, pl.tx));
      pl.x += Math.max(-walk, Math.min(walk, pl.tx - pl.x));
      if (pl.charging) {
        pl.p += pl.dir * dt / HW_FILL;
        if (pl.p >= 1) { pl.p = 1; pl.dir = -1; }
        if (pl.p <= 0) { pl.p = 0; pl.dir = 1; }
      }
      pl.cool = Math.max(0, pl.cool - dt);
      pl.jump = Math.max(0, pl.jump - dt * 3);
      if (pl.ball) this.updateBall(pl, dt);
    }
    // Time's up: wait for the last balls, show the standings, then finish.
    if (!this.running && this.time === 0 && !this.players.some(p => p.ball)) {
      if (this.endT === undefined) { this.endT = 0; sfx("coin"); }
      this.endT += dt;
      if (this.endT > 3) this.done = true;
    }
  }
  standings() { return this.players.slice().sort((a, b) => b.score - a.score || (b.you ? 1 : 0) - (a.you ? 1 : 0)); }
  drawBricks() {
    const { W } = this, c = document.createElement("canvas"), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const h = this.floorY - this.wallTop + 10;
    c.width = W * dpr; c.height = h * dpr;
    const x = c.getContext("2d"); x.scale(dpr, dpr);
    x.fillStyle = "#b9654a"; x.fillRect(0, 0, W, h);
    const bh = 15, bw = 34;
    for (let r = 0, y = 0; y < h; r++, y += bh) {
      for (let cx = r % 2 ? -bw / 2 : 0; cx < W; cx += bw) {
        const shade = ["#c4704f", "#b45f44", "#cf7b57", "#a95a41"][(r * 7 + Math.round(cx)) % 4];
        x.fillStyle = shade; x.fillRect(cx + 1.5, y + 1.5, bw - 3, bh - 3);
      }
    }
    x.fillStyle = "rgba(0,0,0,.18)"; x.fillRect(0, h - 10, W, 10);
    this.bricks = c;
  }
  drawShooter(ctx, pl) {
    const w = this.sh * 100 / 110, h = this.sh;
    const crouch = pl.charging ? .06 + pl.p * .05 : 0;
    const lift = Math.sin(pl.jump * Math.PI) * this.sh * .16;
    ctx.fillStyle = "rgba(0,0,0,.22)";
    ctx.beginPath(); ctx.ellipse(pl.x, this.feetY - 2, w * .32 * (1 - lift / this.sh), 7, 0, 0, 7); ctx.fill();
    if (pl.you) { ctx.strokeStyle = "#ffc800"; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(pl.x, this.feetY - 2, w * .38, 10, 0, 0, 7); ctx.stroke(); }
    const img = pl.jump > 0 ? pl.img.shoot : pl.img.hold;
    if (img.complete && img.naturalWidth) {
      const hh = h * (1 - crouch);
      ctx.drawImage(img, pl.x - w / 2, this.feetY - hh - lift, w, hh);
    }
    // the ball in hand, in the player's color, while waiting to shoot
    if (!pl.ball && pl.cool === 0) drawTintBall(ctx, pl.x + w * .2, this.feetY - h * (.5 - crouch) - lift, this.sh * .1, pl.color, 0);
    if (pl.you) drawText(ctx, "YOU", pl.x, this.feetY - h * .84 - lift, 18, "#ffc800");
  }
  drawHoopAt(ctx, x, y, r, part) {
    const w = this.hw, rx = w / 2, ry = w * .14;
    const wob = (this.wob || []).filter(o => o.r === r && Math.abs(o.x - x) < 2).reduce((a, o) => a + Math.sin(o.t * 40) * (1 - o.t / .6) * 4 * o.k, 0);
    const rim = HW_ROWS[r].rim;
    if (part === "back") {
      const bw = w * 1.25, bh = w * .8;
      ctx.fillStyle = "#f8fafc"; ctx.strokeStyle = "#334155"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.roundRect(x - bw / 2, y - bh + w * .05, bw, bh, 9); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = "#4f46e5"; ctx.lineWidth = 2.5; ctx.strokeRect(x - w * .27, y - w * .45, w * .54, w * .38);
      ctx.strokeStyle = rim; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.ellipse(x, y + wob, rx, ry, 0, Math.PI, Math.PI * 2); ctx.stroke();
    } else {
      ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 1.6;
      const nb = w * .5, depth = w * .5;
      for (let i = 0; i <= 6; i++) {
        const t = i / 6; ctx.beginPath(); ctx.moveTo(x - rx + t * w, y + wob); ctx.lineTo(x - nb / 2 + t * nb + wob, y + depth); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(x, y + depth * .5, rx * .75, ry * .7, 0, 0, Math.PI); ctx.stroke();
      ctx.strokeStyle = rim; ctx.lineWidth = 4.5;
      if (HW_ROWS[r].slide) { ctx.shadowColor = "#ffe066"; ctx.shadowBlur = 8; }
      ctx.beginPath(); ctx.ellipse(x, y + wob, rx, ry, 0, 0, Math.PI); ctx.stroke();
      ctx.shadowBlur = 0;
    }
  }
  draw(ctx) {
    const { W, H } = this;
    ctx.save();
    if (this.shake) ctx.translate((Math.random() - .5) * 10 * this.shake / .25, (Math.random() - .5) * 8 * this.shake / .25);
    // sky, wall, court
    const sky = ctx.createLinearGradient(0, 0, 0, this.wallTop);
    sky.addColorStop(0, "#38bdf8"); sky.addColorStop(1, "#bae6fd");
    ctx.fillStyle = sky; ctx.fillRect(-20, -20, W + 40, this.wallTop + 20);
    if (!this.bricks) this.drawBricks();
    ctx.drawImage(this.bricks, 0, this.wallTop, W, this.floorY - this.wallTop + 10);
    ctx.fillStyle = "#9a4a35"; ctx.fillRect(0, this.wallTop - 8, W, 10);
    const court = ctx.createLinearGradient(0, this.floorY, 0, H);
    court.addColorStop(0, "#64748b"); court.addColorStop(1, "#94a3b8");
    ctx.fillStyle = court; ctx.fillRect(-20, this.floorY + 10, W + 40, H);
    ctx.strokeStyle = "rgba(255,255,255,.75)"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(W * .3, this.floorY + 10); ctx.lineTo(W * .26, H); ctx.moveTo(W * .7, this.floorY + 10); ctx.lineTo(W * .74, H); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W / 2, this.floorY + 10, W * .46, (H - this.floorY) * .75, 0, 0, Math.PI); ctx.stroke();
    // aim line: where your ball will go if you let go now
    const m = this.me;
    if (m.charging) {
      const y = this.yOf(m.p), on = HW_ROWS.some((_, r) => Math.abs(m.p - this.pRow(r)) <= HW_TOL);
      ctx.setLineDash([4, 7]); ctx.strokeStyle = on ? "#58cc02" : "rgba(255,255,255,.8)"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(m.x, this.launchY); ctx.lineTo(m.x, y); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = on ? "#58cc02" : "#fff"; ctx.beginPath(); ctx.arc(m.x, y, 6, 0, 7); ctx.fill();
    }
    // hoops (back), balls going in, hoop fronts, other balls
    HW_ROWS.forEach((_, r) => this.hoopsIn(r).forEach(x => this.drawHoopAt(ctx, x, this.rowY[r], r, "back")));
    for (const pl of this.players) if (pl.ball && pl.ball.phase === "in") drawTintBall(ctx, pl.ball.x, pl.ball.y, pl.ball.r, pl.color, pl.ball.spin);
    HW_ROWS.forEach((_, r) => this.hoopsIn(r).forEach(x => this.drawHoopAt(ctx, x, this.rowY[r], r, "front")));
    for (const pl of this.players) if (pl.ball && pl.ball.phase !== "in") drawTintBall(ctx, pl.ball.x, pl.ball.y, pl.ball.r, pl.color, pl.ball.spin);
    // shooters, back to front
    this.players.slice().sort((a, b) => (a.you ? 1 : 0) - (b.you ? 1 : 0)).forEach(pl => this.drawShooter(ctx, pl));
    for (const s of this.sparks) { ctx.globalAlpha = 1 - s.t / .7; ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(s.x, s.y, 4, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    // the power meter up the right side, lined up with the rows
    const mx = W - 22, top = this.topY, bot = this.launchY;
    ctx.fillStyle = "rgba(15,23,42,.75)"; ctx.beginPath(); ctx.roundRect(mx - 11, top - 6, 22, bot - top + 12, 11); ctx.fill();
    HW_ROWS.forEach((row, r) => {
      const a = this.yOf(this.pRow(r) + HW_TOL), b = this.yOf(this.pRow(r) - HW_TOL);
      ctx.fillStyle = row.slide ? "#f5b800" : "#58cc02"; ctx.fillRect(mx - 7, a, 14, b - a);
      drawText(ctx, "+" + row.pts, mx, (a + b) / 2, 13, "#fff");
    });
    if (m.charging) { ctx.fillStyle = "#fff"; ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(mx - 15, this.yOf(m.p) - 4, 30, 8, 4); ctx.fill(); ctx.stroke(); }
    // scoreboard
    const sw = (W - 16) / 4;
    this.players.forEach((pl, i) => {
      const x = 8 + i * sw;
      ctx.fillStyle = pl.you ? "rgba(255,200,0,.92)" : "rgba(15,23,42,.72)";
      ctx.beginPath(); ctx.roundRect(x + 2, 80, sw - 4, 34, 10); ctx.fill();
      drawTintBall(ctx, x + 16, 97, 8, pl.color);
      drawText(ctx, `${pl.name} ${pl.score}`, x + 30, 97, 15, pl.you ? "#1f2937" : "#fff", "left");
    });
    if (this.running && this.clock < 4 && !m.charging) drawText(ctx, "HOLD, then let go!", W / 2, this.floorY + 34, 24, "#fff");
    this.fx.draw(ctx);
    ctx.restore();
    if (this.endT !== undefined) {
      ctx.fillStyle = "rgba(15,23,42,.78)"; ctx.fillRect(0, 0, W, H);
      drawText(ctx, "FINAL SCORES", W / 2, H * .25, 30, "#ffc800");
      this.standings().forEach((pl, i) => {
        const y = H * .34 + i * 52, k = Math.min(1, Math.max(0, this.endT * 3 - i * .4));
        ctx.globalAlpha = k;
        drawText(ctx, ["1st", "2nd", "3rd", "4th"][i], W * .22, y, 26, i === 0 ? "#ffc800" : "#fff");
        drawTintBall(ctx, W * .38, y, 12, pl.color);
        drawText(ctx, pl.name, W * .46, y, 26, pl.you ? "#ffc800" : "#fff", "left");
        drawText(ctx, String(pl.score), W * .84, y, 26, "#fff");
      });
      ctx.globalAlpha = 1;
    }
  }
}
// A rough bell curve, for CPU timing mistakes.
const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / .5;

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
  const improved = medal > (save.medals[id] || 0);
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
  return { medal, improved, score, xp, newDay, again: choice === "again" };
}
