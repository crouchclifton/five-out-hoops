"use strict";
// Basketball cards: original cartoon players (never real NBA players, their names,
// looks or jersey numbers; the app is public). All boys: it's a boys' league. Players earn packs from lessons,
// bonus-game medals and streaks, open them on the pack screen, and keep them in
// the Card Binder. A duplicate turns into XP.

// stats: [Shooting, Passing, Speed, Defense], out of 99.
// look: skin, hair style, hair color, jersey color, trim color, jersey number, pose, headband.
const CARDS = [
  // Legendary: play styles inspired by the kids' favorites, with made-up people.
  { id: "rocket", name: "Rocket Skyler", nick: "The Liftoff", rarity: "legendary", move: "Free Throw Line Slam",
    stats: [86, 80, 97, 88], tip: "Rocket attacks the hoop when the defender is not in the way. If it's open, drive!",
    look: { skin: 4, hair: "fade", hc: "#1f1308", jersey: "#0d9488", trim: "#ffc800", num: 14, pose: "dunk", band: true } },
  { id: "deacon", name: "Deacon Deepwater", nick: "Downtown Deacon", rarity: "legendary", move: "Deep Three Shimmy",
    stats: [99, 85, 80, 70], tip: "Great shooters stay spread out. Space the floor, and the defense can't guard everyone!",
    look: { skin: 1, hair: "curly", hc: "#6b3e1f", jersey: "#ea580c", trim: "#1e3a8a", num: 31, pose: "shoot" } },
  { id: "atlas", name: "Atlas Longarms", nick: "The Skyscraper", rarity: "legendary", move: "Sky-High Block",
    stats: [78, 75, 70, 99], tip: "Even giants pass and move. After you pass, cut to the hoop!",
    look: { skin: 3, hair: "locs", hc: "#111827", jersey: "#16a34a", trim: "#ffffff", num: 88, pose: "block" } },
  // Epic
  { id: "nico", name: "Nico Quickstep", nick: "Lightning", rarity: "epic", move: "Euro Step",
    stats: [80, 78, 95, 72], tip: "Read your defender. If they are not between you and the hoop, go!",
    look: { skin: 5, hair: "fade", hc: "#111827", jersey: "#db2777", trim: "#ffffff", num: 5, pose: "dribble" } },
  { id: "max", name: "Max Dimewell", nick: "The Dime Dropper", rarity: "epic", move: "No-Look Pass",
    stats: [70, 98, 82, 68], tip: "The best pass goes to the teammate right next to you.",
    look: { skin: 0, hair: "spiky", hc: "#facc15", jersey: "#2563eb", trim: "#ffffff", num: 10, pose: "pass" } },
  { id: "kai", name: "Kai Thunderhands", nick: "Pickpocket", rarity: "epic", move: "Lightning Steal",
    stats: [65, 72, 88, 96], tip: "On defense, stay between your player and the hoop.",
    look: { skin: 2, hair: "short", hc: "#111827", jersey: "#334155", trim: "#38bdf8", num: 22, pose: "hold" } },
  { id: "rex", name: "Rex Archer", nick: "Rainbow", rarity: "epic", move: "Rainbow Jumper",
    stats: [92, 74, 76, 70], tip: "The corners are great spots for open shots. Stay wide!",
    look: { skin: 4, hair: "braids", hc: "#111827", jersey: "#eab308", trim: "#7c2d12", num: 2, pose: "shoot" } },
  { id: "benji", name: "Benji Bounce", nick: "Pogo", rarity: "epic", move: "Tip-In",
    stats: [74, 66, 84, 90], tip: "When a teammate cuts, fill the open spot!",
    look: { skin: 1, hair: "curly", hc: "#c2410c", jersey: "#9333ea", trim: "#fde68a", num: 41, pose: "dunk" } },
  // Rare
  { id: "zeke", name: "Zeke Swift", nick: "The Blur", rarity: "rare", move: "Fast Break Layup",
    stats: [74, 70, 90, 66], tip: "After you pass, don't stand still. Cut!",
    look: { skin: 3, hair: "short", hc: "#111827", jersey: "#0891b2", trim: "#ffffff", num: 4, pose: "dribble" } },
  { id: "leo", name: "Leo Lockdown", nick: "The Wall", rarity: "rare", move: "Big Box Out",
    stats: [60, 64, 66, 88], tip: "Spread out! On offense, stay outside the big line.",
    look: { skin: 0, hair: "buzz", hc: "#78350f", jersey: "#1e3a8a", trim: "#fbbf24", num: 50, pose: "hold" } },
  { id: "milo", name: "Milo Crossover", nick: "Ankle Breaker", rarity: "rare", move: "Crossover",
    stats: [76, 72, 86, 68], tip: "Pass and move! Every time you pass, cut to the hoop.",
    look: { skin: 2, hair: "spiky", hc: "#111827", jersey: "#65a30d", trim: "#ffffff", num: 6, pose: "dribble", band: true } },
  { id: "theo", name: "Theo Banks", nick: "Glass Man", rarity: "rare", move: "Bank Shot",
    stats: [84, 66, 64, 70], tip: "Open on the wing? Be ready to catch and shoot!",
    look: { skin: 5, hair: "afro", hc: "#111827", jersey: "#9f1239", trim: "#fde68a", num: 15, pose: "shoot" } },
  { id: "iggy", name: "Iggy Hustle", nick: "Floor Burn", rarity: "rare", move: "Diving Save",
    stats: [62, 70, 80, 84], tip: "Help your team. When the spot next to you opens up, fill it!",
    look: { skin: 1, hair: "buzz", hc: "#a16207", jersey: "#0f766e", trim: "#ffffff", num: 13, pose: "hold" } },
  { id: "omar", name: "Omar Glide", nick: "Smooth", rarity: "rare", move: "Spin Move",
    stats: [72, 76, 82, 70], tip: "Swing the ball from side to side to make the defense run.",
    look: { skin: 4, hair: "short", hc: "#111827", jersey: "#f97316", trim: "#1f2937", num: 21, pose: "dribble" } },
  { id: "hank", name: "Hank Hops", nick: "Springs", rarity: "rare", move: "Jump Stop",
    stats: [70, 74, 78, 76], tip: "Land with a jump stop when you catch it, so you don't travel.",
    look: { skin: 0, hair: "short", hc: "#78350f", jersey: "#dc2626", trim: "#ffffff", num: 19, pose: "pass" } },
  // Common
  { id: "sam", name: "Sam Steady", nick: "Mister Reliable", rarity: "common", move: "Chest Pass",
    stats: [58, 74, 62, 60], tip: "For a chest pass, step toward your teammate and push with both hands.",
    look: { skin: 3, hair: "short", hc: "#111827", jersey: "#64748b", trim: "#ffffff", num: 11, pose: "pass" } },
  { id: "lenny", name: "Lenny Layup", nick: "Lefty", rarity: "common", move: "Left-Hand Layup",
    stats: [64, 58, 70, 56], tip: "Cut hard to the hoop. Your teammate might pass it right back!",
    look: { skin: 1, hair: "curly", hc: "#facc15", jersey: "#22c55e", trim: "#ffffff", num: 16, pose: "shoot" } },
  { id: "gus", name: "Gus Guard", nick: "Shadow", rarity: "common", move: "Slide Step",
    stats: [52, 60, 64, 76], tip: "Five spots for five players: the top, two wings and two corners.",
    look: { skin: 2, hair: "buzz", hc: "#111827", jersey: "#b45309", trim: "#ffffff", num: 25, pose: "hold" } },
  { id: "pip", name: "Pip Pocket", nick: "Tiny", rarity: "common", move: "Bounce Pass",
    stats: [60, 72, 74, 58], tip: "A bounce pass is hard to steal. Try it on a give and go!",
    look: { skin: 5, hair: "afro", hc: "#111827", jersey: "#ec4899", trim: "#ffffff", num: 3, pose: "pass" } },
  { id: "ollie", name: "Ollie Corner", nick: "Corner Pocket", rarity: "common", move: "Corner Three",
    stats: [72, 56, 58, 58], tip: "From the corner, pass back up to the wing. Don't drive the baseline!",
    look: { skin: 0, hair: "curly", hc: "#78350f", jersey: "#ca8a04", trim: "#1f2937", num: 20, pose: "shoot" } },
  { id: "rocco", name: "Rocco Rebound", nick: "Glue", rarity: "common", move: "Big Rebound",
    stats: [54, 58, 60, 72], tip: "Keep the middle open so your teammates can cut to the hoop.",
    look: { skin: 4, hair: "buzz", hc: "#111827", jersey: "#7c3aed", trim: "#ffffff", num: 34, pose: "block" } },
  { id: "ty", name: "Ty Pivot", nick: "Spinner", rarity: "common", move: "Pivot Foot",
    stats: [58, 64, 60, 62], tip: "Pivot to find the teammate next to you, then pass.",
    look: { skin: 3, hair: "fade", hc: "#111827", jersey: "#1d4ed8", trim: "#ffffff", num: 17, pose: "hold" } },
  { id: "nate", name: "Nate Dash", nick: "Zoom", rarity: "common", move: "Speed Dribble",
    stats: [56, 60, 76, 56], tip: "Stay wide! A crowded court is easy to guard.",
    look: { skin: 2, hair: "braids", hc: "#111827", jersey: "#ea580c", trim: "#ffffff", num: 26, pose: "dribble" } },
  { id: "finn", name: "Finn Fakeout", nick: "Pump Fake Finn", rarity: "common", move: "Pump Fake",
    stats: [66, 58, 60, 58], tip: "If your defender jumps at a fake, drive past them to the hoop!",
    look: { skin: 0, hair: "spiky", hc: "#c2410c", jersey: "#0d9488", trim: "#ffffff", num: 18, pose: "shoot" } },
];
const RARITIES = ["common", "rare", "epic", "legendary"];
const RARITY = {
  common: { label: "Common", xp: 5 }, rare: { label: "Rare", xp: 10 },
  epic: { label: "Epic", xp: 20 }, legendary: { label: "Legendary", xp: 40 },
};
// Chance of each rarity per card, in percent: common, rare, epic, legendary.
const ODDS = { normal: [62, 27, 9, 2], good: [45, 33, 16, 6], great: [28, 36, 26, 10] };
const PITY = 15; // a legendary is guaranteed after this many cards without one
const STREAK_PACKS = [3, 7, 14, 30, 60, 100];
const STAT_NAMES = ["Shooting", "Passing", "Speed", "Defense"];
const SKINS = ["#f9d7b9", "#f1c27d", "#e0ac69", "#c68642", "#8d5524", "#5c3a1e"];
const cardById = id => CARDS.find(c => c.id === id);

// ---------- Drawing a player ----------
// A cartoon player in SVG, in the same spirit as Coach Bounce. viewBox 0 0 100 110.
function playerSVG(c) {
  const L = c.look, skin = SKINS[L.skin], hc = L.hc;
  const line = "#3b1d0c";
  const arm = (pts) => `<polyline points="${pts}" fill="none" stroke="${skin}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`;
  const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="4.3" fill="${skin}"/>`;
  const ball = (x, y, r) => `<g transform="translate(${x} ${y})"><circle r="${r}" fill="#f97316" stroke="#7c2d12" stroke-width="1.2"/>` +
    `<path d="M${-r} 0 H${r} M0 ${-r} V${r} M${-r * .7} ${-r * .7} Q0 0 ${-r * .7} ${r * .7} M${r * .7} ${-r * .7} Q0 0 ${r * .7} ${r * .7}" fill="none" stroke="#7c2d12" stroke-width=".9"/></g>`;
  const whoosh = (x, y) => `<path d="M${x} ${y} h-9 M${x + 1} ${y + 5} h-12 M${x} ${y + 10} h-8" stroke="#fff" stroke-width="1.8" stroke-linecap="round" opacity=".8"/>`;

  // Arms and ball for each pose. "back" draws behind the body, "front" over it.
  let back = "", front = "";
  switch (L.pose) {
    case "dunk":
      back = arm("31,76 34,52 44,24") + arm("69,76 66,52 56,24");
      front = hand(44, 23) + hand(56, 23) + ball(50, 13, 9) + `<path d="M18 30 l-6 -4 M16 42 l-8 -1 M82 30 l6 -4 M84 42 l8 -1" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`;
      break;
    case "shoot":
      // Shooting hand under the ball, guide hand on its side, both arms behind the head.
      back = arm("69,76 78,50 72,26") + arm("31,76 30,48 59,17");
      front = hand(72, 25) + hand(59, 16) + ball(68, 14, 8.5);
      break;
    case "block":
      // Super long arms, reaching right off the top of the card.
      back = arm("31,76 22,46 14,4") + arm("69,76 78,46 86,4");
      front = hand(14, 4) + hand(86, 4);
      break;
    case "pass":
      front = arm("31,78 46,88 74,84") + arm("69,78 76,80 80,76") + hand(74, 84) + hand(80, 76) + ball(90, 80, 7.5) + whoosh(104, 72);
      break;
    case "dribble":
      back = arm("31,76 25,90 26,100");
      front = hand(26, 101) + arm("69,76 76,88 78,94") + hand(78, 95) + ball(82, 104, 7) +
        `<path d="M78 112 q4 -3 8 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".7"/>`;
      break;
    default: // hold: ball tucked at the hip
      back = arm("31,76 25,92 27,104");
      front = hand(27, 104) + ball(78, 98, 9) + arm("69,76 76,88 72,96") + hand(72, 96);
  }

  // Hair behind the head, and hair over the top of it.
  const cap = `<path d="M33 41 Q33 24 50 23 Q67 24 67 41 Q60 33 50 33 Q40 33 33 41 Z" fill="${hc}"/>`;
  let hb = "", hf = cap;
  switch (L.hair) {
    case "fade": hf = `<path d="M34 41 L34 27 Q36 21 50 21 Q64 21 66 27 L66 41 Q58 34 50 34 Q42 34 34 41 Z" fill="${hc}"/>`; break;
    case "afro": hb = `<circle cx="50" cy="36" r="24" fill="${hc}"/>`; hf = `<path d="M33 40 Q36 30 50 30 Q64 30 67 40 Q58 35 50 35 Q42 35 33 40 Z" fill="${hc}"/>`; break;
    case "braids": // cornrows
      hf = cap + `<path d="M42 25 V33 M50 23 V33 M58 25 V33" stroke="rgba(255,255,255,.18)" stroke-width="1.3"/>`; break;
    case "locs": hb = [36, 41, 46, 54, 59, 64].map(x => `<path d="M${x} 36 Q${x + (x < 50 ? -4 : 4)} 52 ${x + (x < 50 ? -3 : 3)} 66" stroke="${hc}" stroke-width="3.6" fill="none" stroke-linecap="round"/>`).join("");
      hf = `<path d="M32 42 Q31 22 50 21 Q69 22 68 42 Q60 31 50 31 Q40 31 32 42 Z" fill="${hc}"/>`; break;
    case "buzz": hf = `<path d="M33 41 Q33 25 50 24 Q67 25 67 41 Q60 34 50 34 Q40 34 33 41 Z" fill="${hc}" opacity=".55"/>`; break;
    case "curly": hf = cap + [36, 43, 50, 57, 64].map((x, i) => `<circle cx="${x}" cy="${i % 2 ? 23 : 26}" r="5" fill="${hc}"/>`).join(""); break;
    case "spiky": hf = `<path d="M33 41 L32 26 L39 30 L41 18 L47 28 L52 16 L56 28 L62 19 L63 30 L69 27 L67 41 Q60 33 50 33 Q40 33 33 41 Z" fill="${hc}"/>`; break;
  }
  const band = L.band ? `<path d="M33.5 36 Q50 28 66.5 36 L66.5 40 Q50 32 33.5 40 Z" fill="${L.trim}"/>` : "";

  return `<svg viewBox="0 0 100 110" aria-hidden="true">
  ${back}
  <path d="M27 112 L29 82 Q30 72 41 69 L59 69 Q70 72 71 82 L73 112 Z" fill="${L.jersey}"/>
  <path d="M41 69 L50 80 L59 69" fill="none" stroke="${L.trim}" stroke-width="2.6" stroke-linejoin="round"/>
  <path d="M30 80 Q35 82 36 90 M70 80 Q65 82 64 90" fill="none" stroke="${L.trim}" stroke-width="2"/>
  <text x="50" y="101" text-anchor="middle" font-size="15" font-weight="900" fill="${L.trim}" stroke="rgba(0,0,0,.25)" stroke-width=".6" font-family="ui-rounded, system-ui, sans-serif">${L.num}</text>
  ${hb}
  <rect x="45" y="56" width="10" height="14" rx="4" fill="${skin}"/>
  <circle cx="33" cy="46" r="4" fill="${skin}"/><circle cx="67" cy="46" r="4" fill="${skin}"/>
  <circle cx="50" cy="44" r="17" fill="${skin}"/>
  ${hf}${band}
  <path d="M40 39.5 Q43.5 37.5 47 39.5 M53 39.5 Q56.5 37.5 60 39.5" stroke="${line}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="43.5" cy="45" rx="3.3" ry="3.9" fill="#fff"/><ellipse cx="56.5" cy="45" rx="3.3" ry="3.9" fill="#fff"/>
  <circle cx="44" cy="45.6" r="2" fill="#111827"/><circle cx="57" cy="45.6" r="2" fill="#111827"/>
  <circle cx="44.8" cy="44.8" r=".7" fill="#fff"/><circle cx="57.8" cy="44.8" r=".7" fill="#fff"/>
  <circle cx="38.5" cy="51" r="2.6" fill="#fb7185" opacity=".35"/><circle cx="61.5" cy="51" r="2.6" fill="#fb7185" opacity=".35"/>
  <path d="M44 52.5 Q50 58.5 56 52.5 Z" fill="#7f1d1d"/><path d="M45.5 53 h9" stroke="#fff" stroke-width="1.4"/>
  ${front}
</svg>`;
}

// ---------- Card faces ----------
function cardFront(c, { locked = false } = {}) {
  const r = RARITY[c.rarity];
  return `<div class="pcard r-${c.rarity}${locked ? " locked" : ""}">
    <div class="pc-top"><span class="pc-num">#${locked ? "?" : c.look.num}</span><span class="pc-rar">${"★".repeat(RARITIES.indexOf(c.rarity) + 1)}</span></div>
    <div class="pc-art">${playerSVG(c)}</div>
    <div class="pc-plate"><div class="pc-name${c.name.length > 14 ? " long" : ""}">${locked ? "???" : c.name}</div><div class="pc-nick">${locked ? r.label : `"${c.nick}"`}</div></div>
    ${c.rarity !== "common" && !locked ? `<div class="shine"></div>` : ""}
  </div>`;
}
function cardBack(c) {
  const bars = c.stats.map((v, i) => `<div class="pc-stat"><span>${STAT_NAMES[i]}</span><i><b style="width:${v}%"></b></i><em>${v}</em></div>`).join("");
  return `<div class="pcard back r-${c.rarity}">
    <div class="pc-name">${c.name}</div>
    <div class="pc-rarlabel">${RARITY[c.rarity].label}</div>
    <div class="pc-move"><span>Signature move</span>${c.move}</div>
    ${bars}
    <div class="pc-tip"><span>🏀 5-Out tip</span>${c.tip}</div>
  </div>`;
}
const CARD_COVER = `<div class="pcard cover"><div class="cv-ball">🏀</div><div class="cv-text">5-OUT<br>HOOPS</div></div>`;
// A card that flips between two faces when it gets the class "on".
function flipCard(a, b, parent) {
  const f = html("div", "flip", parent, `<div class="flip-in"><div class="face fa">${a}</div><div class="face fb">${b}</div></div>`);
  return f;
}

// ---------- Earning cards ----------
function rollRarity(odds) {
  if (save.sinceLegend >= PITY) return "legendary";
  let n = Math.random() * 100;
  for (let i = 0; i < 4; i++) { n -= ODDS[odds][i]; if (n < 0) return RARITIES[i]; }
  return "common";
}
// Draws one card and saves it. force: a rarity this card must be.
function drawCard(odds, force) {
  const rarity = force || rollRarity(odds);
  const pool = CARDS.filter(c => c.rarity === rarity);
  const fresh = pool.filter(c => !save.cards[c.id]);
  // A forced legendary is always a new one if any are left. Otherwise one reroll
  // leans gently toward cards the player doesn't have yet.
  let c = force === "legendary" && fresh.length ? pick(fresh) : pick(pool);
  if (save.cards[c.id] && !force) c = pick(pool);
  save.sinceLegend = rarity === "legendary" ? 0 : save.sinceLegend + 1;
  const dup = !!save.cards[c.id];
  save.cards[c.id] = (save.cards[c.id] || 0) + 1;
  const xp = dup ? RARITY[rarity].xp : 0;
  if (dup) save.xp += xp; else save.newCards.push(c.id);
  persist();
  return { card: c, dup, xp };
}
// A pack: { title, n, odds, force: [rarity or null per slot] }
function makePack(title, n, odds, force = []) { return { title, n, odds, force }; }
const ownedCount = () => CARDS.filter(c => save.cards[c.id]).length;
// The pack for reaching a streak milestone today, if there is one.
function streakPack(newDay) {
  return newDay && STREAK_PACKS.includes(save.streak) ? makePack(`🔥 ${save.streak} day streak bonus!`, 3, "great") : null;
}

// ---------- Opening packs ----------
const REVEAL_LINE = { common: "New card!", rare: "Rare card!", epic: "Epic card!", legendary: "Legendary card!" };
let packCoach = null;

// Shows each pack in turn. Resolves when the player taps Continue after the last one.
async function showPacks(packs) {
  packs = packs.filter(Boolean);
  for (const p of packs) await openPack(p);
}
function openPack(pack) {
  return new Promise(resolve => {
    show("pack");
    setActiveCoach(packCoach);
    packCoach.mood("happy");
    const box = $("#packBody");
    box.innerHTML = "";
    html("h2", "", box, pack.title);
    const wrap = html("div", "pack-wrap", box);
    const foil = html("button", "foil", wrap, `<div class="foil-top"></div><div class="foil-ball">🏀</div><div class="foil-text">5-OUT HOOPS<br><small>${pack.n} ${pack.n === 1 ? "CARD" : "CARDS"}</small></div>`);
    const hint = html("p", "", box, "Tap the pack to open it!");
    sfx("coin");
    speak("Tap the pack to open it!");
    // Draw (and save) the cards right away, so leaving the screen can't lose them.
    const pulls = [];
    for (let i = 0; i < pack.n; i++) pulls.push(drawCard(pack.odds, pack.force[i]));
    save.packs++; persist();
    foil.onclick = () => {
      foil.onclick = null;
      foil.classList.add("rip");
      sfx("pop");
      setTimeout(() => {
        wrap.remove();
        hint.textContent = "Tap a card to flip it!";
        speak("Tap a card to flip it!");
        const row = html("div", "pack-row", null);
        box.insertBefore(row, hint);
        row.style.setProperty("--n", pulls.length);
        let flipped = 0;
        pulls.forEach((pull, i) => {
          const slot = html("div", "pack-slot", row);
          slot.style.animationDelay = i * .12 + "s";
          const f = flipCard(CARD_COVER, cardFront(pull.card), slot);
          const tag = html("div", "pack-tag", slot, "");
          f.onclick = async () => {
            if (f.classList.contains("on")) return;
            f.classList.add("on", "r-" + pull.card.rarity);
            flipped++;
            const r = pull.card.rarity;
            tag.innerHTML = pull.dup ? `+${pull.xp} XP` : "NEW!";
            tag.classList.add(pull.dup ? "dup" : "new", "show");
            if (r === "legendary") { sfx("fanfare"); confetti(); packCoach.mood("cheer"); }
            else if (r === "epic") { sfx("combo"); packCoach.flash("happy", 1400); }
            else { sfx(r === "rare" ? "coin" : "good"); packCoach.flash("happy", 1000); }
            if (pull.dup) await speak("You already have this one. Bonus XP!");
            else { await speak(REVEAL_LINE[r]); await speak(pull.card.name); }
            if (flipped === pulls.length && !box.querySelector(".pack-done")) {
              hint.textContent = "";
              const a = html("div", "actions pack-done", box);
              html("button", "btn green wide", a, "Continue").onclick = () => { hush(); resolve(); };
            }
          };
        });
      }, 450);
    };
  });
}

// ---------- The Card Binder ----------
function openBinder() {
  stopRun();
  show("binder");
  setActiveCoach(null);
  const fresh = new Set(save.newCards);
  save.newCards = []; persist();
  $("#binderCount").textContent = `${ownedCount()} / ${CARDS.length}`;
  const grid = $("#binderGrid");
  grid.innerHTML = "";
  const order = [...CARDS].sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity));
  for (const c of order) {
    const have = !!save.cards[c.id];
    const slot = html("button", "binder-slot", grid, cardFront(c, { locked: !have }));
    if (fresh.has(c.id)) html("div", "pack-tag new show", slot, "NEW!");
    slot.onclick = () => have ? showCard(c) : speak(`Keep playing to find this card!`);
  }
  if (!ownedCount()) speak("Finish a lesson to get your first card pack!");
}
function showCard(c) {
  const wrap = html("div", "sheet-wrap center", document.body);
  const box = html("div", "card-view", wrap);
  const f = flipCard(cardFront(c), cardBack(c), box);
  html("p", "", box, "Tap the card to flip it");
  const close = html("button", "btn green wide", box, "Close");
  const end = () => { hush(); wrap.remove(); };
  close.onclick = end;
  wrap.onclick = e => { if (e.target === wrap) end(); };
  f.onclick = () => { f.classList.toggle("on"); if (f.classList.contains("on")) speak(c.tip); else speak(c.name); };
  speak(c.name);
}
