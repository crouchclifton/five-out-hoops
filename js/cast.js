"use strict";
// The cast along the lesson path, like the characters beside Duolingo's path:
// the Eagles mascot, a ref and Eagles players. Each one moves a little while it
// waits, and cheers when the player finishes the lesson next to it.

// The mascot: an original cartoon eagle in an Eagles jersey (not the league logo).
const EAGLE_SVG = `
<svg viewBox="0 0 100 110" aria-hidden="true">
  <g class="eg-wing-l"><path d="M33 72 Q17 67 13 52 L5 46 L13 46 L8 37 L16 41 L15 31 L21 40 Q25 56 37 63 Z" fill="#5b3a1e" stroke="#2b1a0b" stroke-width="1.6" stroke-linejoin="round"/></g>
  <path d="M70 72 Q86 80 86 92 Q80 90 77 92 Q78 86 70 84 Z" fill="#5b3a1e" stroke="#2b1a0b" stroke-width="1.6" stroke-linejoin="round"/>
  <ellipse cx="41" cy="104" rx="7" ry="3.6" fill="#f59e0b" stroke="#92400e" stroke-width="1.3"/>
  <ellipse cx="59" cy="104" rx="7" ry="3.6" fill="#f59e0b" stroke="#92400e" stroke-width="1.3"/>
  <path d="M27 101 Q25 70 40 66 L60 66 Q75 70 73 101 Z" fill="#1e3a8a" stroke="#172554" stroke-width="1.6"/>
  <path d="M40 66 L50 77 L60 66" fill="none" stroke="#f97316" stroke-width="2.6" stroke-linejoin="round"/>
  <text x="50" y="96" text-anchor="middle" font-size="16" font-weight="900" fill="#f97316" font-family="ui-rounded, system-ui, sans-serif">E</text>
  <g transform="translate(83 93)"><circle r="7.5" fill="#f97316" stroke="#7c2d12" stroke-width="1.2"/><path d="M-7.5 0H7.5M0 -7.5V7.5" stroke="#7c2d12" stroke-width=".9"/></g>
  <path d="M40 26 L42 16 L46 24 L49 13 L52 23 L56 15 L58 26 Z" fill="#fff" stroke="#cbd5e1" stroke-width="1.2" stroke-linejoin="round"/>
  <circle cx="50" cy="44" r="21" fill="#fff" stroke="#cbd5e1" stroke-width="1.6"/>
  <path d="M33 37 Q41 31 47 37" stroke="#1e293b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <path d="M53 37 Q59 31 67 37" stroke="#1e293b" stroke-width="2.6" fill="none" stroke-linecap="round"/>
  <ellipse cx="42" cy="43" rx="4.2" ry="4.8" fill="#fde68a" stroke="#1e293b" stroke-width="1.2"/><ellipse cx="58" cy="43" rx="4.2" ry="4.8" fill="#fde68a" stroke="#1e293b" stroke-width="1.2"/>
  <circle cx="42.6" cy="44" r="2.3" fill="#111827"/><circle cx="58.6" cy="44" r="2.3" fill="#111827"/>
  <circle cx="43.4" cy="43" r=".8" fill="#fff"/><circle cx="59.4" cy="43" r=".8" fill="#fff"/>
  <path d="M41 51 Q50 45 60 51 Q64 57 56 62 Q53 58 50 58 Q46 58 43 55 Z" fill="#f59e0b" stroke="#92400e" stroke-width="1.5" stroke-linejoin="round"/>
  <path d="M44 55 Q50 59 56 56" fill="none" stroke="#92400e" stroke-width="1.2"/>
</svg>`;

// Who stands beside which lesson. `side` is filled in when the path is drawn.
// look uses the same fields as a card (see js/cards.js).
const EAGLES_LOOK = { jersey: "#1e3a8a", trim: "#f97316" };
const PATH_CAST = [
  { lesson: 0, kind: "eagle", says: "Go Eagles!" },
  { lesson: 1, look: { skin: 3, hair: "short", hc: "#111827", ...EAGLES_LOOK, num: 4, pose: "dribble" }, says: "Pass and cut!" },
  { lesson: 2, look: { skin: 1, hair: "buzz", hc: "#78350f", jersey: "#ffffff", trim: "#111827", ref: true, pose: "whistle" }, says: "Good spacing!" },
  { lesson: 3, look: { skin: 4, hair: "fade", hc: "#111827", ...EAGLES_LOOK, num: 11, pose: "pass" }, says: "Give and go!" },
  { lesson: 4, look: { skin: 0, hair: "curly", hc: "#a16207", ...EAGLES_LOOK, num: 7, pose: "shoot" }, says: "Attack!" },
  { lesson: 5, look: { skin: 5, hair: "afro", hc: "#111827", ...EAGLES_LOOK, num: 33, pose: "wave" }, says: "Big game!" },
];
function castSVG(c) { return c.kind === "eagle" ? EAGLE_SVG : playerSVG({ look: c.look }); }
