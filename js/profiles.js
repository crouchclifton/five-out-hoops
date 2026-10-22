"use strict";
// Players on this phone. A player is a look (face, hair, jersey, number) and
// never a name, so no one types anything personal. Every player lives only in
// this phone's storage (see the players section of js/core.js).

const MAX_PLAYERS = 6;
const HAIR_CHOICES = ["short", "fade", "buzz", "curly", "spiky", "afro", "braids", "locs"];
const HAIR_COLORS = ["#111827", "#5b3a1e", "#a16207", "#facc15", "#c2410c"];
const JERSEYS = [
  { label: "Home", jersey: "#1e3a8a", trim: "#f97316" },
  { label: "Away", jersey: "#f8fafc", trim: "#1e3a8a" },
  { label: "Practice", jersey: "#f97316", trim: "#1e3a8a" },
];
const randomLook = () => ({ skin: Math.floor(Math.random() * SKINS.length), hair: pick(HAIR_CHOICES), hc: HAIR_COLORS[0],
  jersey: JERSEYS[0].jersey, trim: JERSEYS[0].trim, num: 1 + Math.floor(Math.random() * 40), pose: "hold" });
const currentPlayer = () => profiles.list.find(p => p.id === profiles.current);
// The player drawn as a card player. head: just the face, for the top bar.
function avatarSVG(look, { head = false, pose = "hold" } = {}) {
  const svgText = playerSVG({ look: { ...look, pose } });
  return head ? svgText.replace('viewBox="0 0 100 110"', 'viewBox="22 10 56 56"') : svgText;
}

// ---------- Who's playing? ----------
function openPlayers() {
  stopRun();
  show("players");
  setActiveCoach(null);
  const box = $("#playersBody");
  box.innerHTML = "";
  const grid = html("div", "player-grid", box);
  for (const p of profiles.list) {
    const look = p.look || randomLook();
    const b = html("button", "player-tile" + (p.id === profiles.current ? " current" : ""), grid,
      `<div class="pt-art">${avatarSVG(look)}</div><b>#${look.num}</b>`);
    b.onclick = () => {
      if (p.id === profiles.current) { renderHome(false); return; }
      profiles.current = p.id; saveProfiles(); location.reload();
    };
  }
  if (profiles.list.length < MAX_PLAYERS) {
    html("button", "player-tile add", grid, `<div class="pt-art">${icon("plus")}</div><b>New player</b>`).onclick = () => openMaker(null);
  }
  const me = currentPlayer();
  if (me) {
    const a = html("div", "actions", box);
    html("button", "btn wide", a, "Change my player").onclick = () => openMaker(me);
    html("button", "btn ghost wide", a, "Start my progress over").onclick = () => confirmSheet(
      "Start over?", "This erases this player's stars, XP, streak and cards on this phone. It can't be undone.", "Start over", () => {
        localStorage.removeItem(saveKey); location.reload();
      });
    if (profiles.list.length > 1) html("button", "linkbtn", a, "Remove this player").onclick = () => confirmSheet(
      "Remove this player?", "This removes this player and all of their progress from this phone.", "Remove", () => {
        localStorage.removeItem(saveKey);
        profiles.list = profiles.list.filter(p => p.id !== me.id);
        profiles.current = profiles.list[0].id; saveProfiles(); location.reload();
      });
  }
  html("p", "privacy", box, "No names needed. Players are saved only on this phone, and nothing is sent anywhere.");
  speak("Who's playing? Tap your player!");
}
function confirmSheet(title, text, yes, then) {
  const wrap = html("div", "sheet-wrap", document.body);
  const sh = html("div", "sheet", wrap);
  html("h2", "", sh, title);
  html("p", "", sh, text);
  const r = html("div", "row", sh);
  html("button", "btn ghost", r, "Cancel").onclick = () => wrap.remove();
  html("button", "btn red", r, yes).onclick = () => { wrap.remove(); then(); };
  wrap.onclick = e => { if (e.target === wrap) wrap.remove(); };
}

// ---------- Make your player ----------
// p: the player to change, or null for a new one. The very first player on a
// phone is made before the home screen.
function openMaker(p) {
  stopRun();
  show("maker");
  setActiveCoach(makerCoach);
  makerCoach.mood("happy");
  const isNew = !p;
  const look = Object.assign(randomLook(), p && p.look ? p.look : {});
  $("#makerBack").classList.toggle("hidden", !profiles.list.length || (p && !p.look));
  const box = $("#makerBody");
  box.innerHTML = "";
  const preview = html("div", "maker-preview", box);
  const draw = () => { preview.innerHTML = avatarSVG(look, { pose: "wave" }); numEl.textContent = look.num; refresh(); };
  const section = title => { const s = html("div", "maker-row", box); html("h3", "", s, title); return html("div", "choices", s); };

  const skins = section("Face");
  SKINS.forEach((c, i) => { const b = html("button", "swatch", skins); b.style.background = c; b.dataset.k = "skin"; b.dataset.v = i;
    b.onclick = () => { look.skin = i; sfx("pop"); draw(); }; });
  const hairs = section("Hair");
  HAIR_CHOICES.forEach(h => { const b = html("button", "hairpick", hairs); b.dataset.k = "hair"; b.dataset.v = h;
    b.onclick = () => { look.hair = h; sfx("pop"); draw(); }; });
  const hcs = section("Hair color");
  HAIR_COLORS.forEach(c => { const b = html("button", "swatch", hcs); b.style.background = c; b.dataset.k = "hc"; b.dataset.v = c;
    b.onclick = () => { look.hc = c; sfx("pop"); draw(); }; });
  const jerseys = section("Eagles jersey");
  JERSEYS.forEach(j => { const b = html("button", "jerseypick", jerseys, `<i style="background:${j.jersey};border-color:${j.trim}"></i>${j.label}`);
    b.dataset.k = "jersey"; b.dataset.v = j.jersey;
    b.onclick = () => { look.jersey = j.jersey; look.trim = j.trim; sfx("pop"); draw(); }; });
  const nums = section("Number");
  const step = d => () => { look.num = (look.num + d + 100) % 100; sfx("tick"); draw(); };
  html("button", "numbtn", nums, "−10").onclick = step(-10);
  html("button", "numbtn", nums, "−").onclick = step(-1);
  const numEl = html("div", "numshow", nums, "");
  html("button", "numbtn", nums, "+").onclick = step(1);
  html("button", "numbtn", nums, "+10").onclick = step(10);

  // Hair buttons show the hair on this player's own face.
  function refresh() {
    hairs.querySelectorAll(".hairpick").forEach(b => { b.innerHTML = avatarSVG({ ...look, hair: b.dataset.v }, { head: true }); });
    box.querySelectorAll("[data-k]").forEach(b => b.classList.toggle("on", String(look[b.dataset.k]) === b.dataset.v));
  }
  draw();
  html("p", "privacy", box, "No names needed. Your player is saved only on this phone.");
  const a = html("div", "actions", box);
  html("button", "btn green wide step-next", a, "Done").onclick = () => {
    const keep = { ...look, pose: "hold" };
    if (isNew) {
      const id = "p" + Date.now().toString(36);
      profiles.list.push({ id, look: keep });
      const first = !profiles.current;
      profiles.current = id; saveProfiles();
      // The first player just takes over the empty save; another player starts fresh.
      if (first) { saveKey = "fiveout-save-" + id; persist(); renderHome(); return; }
      location.reload(); return;
    }
    p.look = keep; saveProfiles();
    renderHome(false);
  };
  speak(isNew && !profiles.list.length ? "Welcome to the Eagles! Make your player. Pick a face, a jersey and a number!"
    : "Make your player. Pick a face, a jersey and a number!");
}
let makerCoach = null;
