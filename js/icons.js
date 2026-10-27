"use strict";
// The game's icons, drawn by hand in SVG in the same style as Coach Bounce and
// the cards: flat colors, rounded shapes, one dark outline. Used instead of emoji
// so the game looks like one made thing on every phone.
//   icon("flame")             -> an <svg> string
//   icon("ball", "big")       -> with an extra class
// Node glyphs (spots, cut, fill, ...) are white, for the colored path circles.

const INK = "#1e293b";
const NAVY = "#1e3a8a", ORANGE = "#f97316";
const ink = (w = 2.5) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;
const wht = (w = 3.4) => `fill="none" stroke="#fff" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;
const starPath = "M24 5l5.6 11.6 12.7 1.8-9.2 8.9 2.2 12.6L24 34.3l-11.3 5.9 2.2-12.6-9.2-8.9 12.7-1.8z";
const speaker = `<path d="M7 19h7l9-8v26l-9-8H7z" fill="#fff" ${ink()}/>`;
const medal = (fill, edge, n) => `<path d="M14 4h8l4 12h-8z" fill="${NAVY}" ${ink(2)}/><path d="M34 4h-8l-4 12h8z" fill="${ORANGE}" ${ink(2)}/>` +
  `<circle cx="24" cy="30" r="13" fill="${fill}" ${ink()}/><circle cx="24" cy="30" r="8.5" fill="none" stroke="${edge}" stroke-width="2"/>` +
  `<text x="24" y="34.6" text-anchor="middle" font-size="13" font-weight="900" fill="${edge}" font-family="ui-rounded, system-ui, sans-serif">${n}</text>`;

const ICONS = {
  ball: `<circle cx="24" cy="24" r="17" fill="${ORANGE}" ${ink()}/><path d="M7 24h34M24 7v34M12.5 12q8 12 0 24M35.5 12q-8 12 0 24" fill="none" ${ink(2)}/><circle cx="17" cy="15.5" r="3" fill="#fff" opacity=".45"/>`,
  flame: `<path d="M24 4c3 8 14 12 14 25a14 14 0 0 1-28 0c0-7 4-12 7-15 0 5 2 8 4 9 0-8-1-13 3-19z" fill="#ff9600" ${ink()}/>` +
    `<path d="M24 25c2 3 7 5 7 10.5a7 7 0 0 1-14 0c0-3.2 2-5.4 3.2-6.4 0 2 .9 3.1 2 3.4 0-3.2 0-5.4 1.8-7.5z" fill="#ffd34d"/>`,
  flameOff: `<path d="M24 4c3 8 14 12 14 25a14 14 0 0 1-28 0c0-7 4-12 7-15 0 5 2 8 4 9 0-8-1-13 3-19z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2.5" stroke-linejoin="round"/>`,
  star: `<path d="${starPath}" fill="#ffc800" ${ink()}/><path d="M19.5 16.5l2.6-5.4" stroke="#fff" stroke-width="2.6" stroke-linecap="round" opacity=".7"/>`,
  starOff: `<path d="${starPath}" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2.5" stroke-linejoin="round"/>`,
  cards: `<rect x="7" y="9" width="21" height="30" rx="4" transform="rotate(-13 17 24)" fill="${NAVY}" ${ink()}/>` +
    `<g transform="rotate(9 30 24)"><rect x="19" y="8" width="22" height="31" rx="4" fill="#fff" ${ink()}/><rect x="22.5" y="11.5" width="15" height="16" rx="2" fill="#fde68a"/>` +
    `<circle cx="30" cy="17.5" r="3.8" fill="${ORANGE}"/><path d="M24.5 27.5q5.5-7 11 0z" fill="${ORANGE}"/><rect x="23" y="31" width="14" height="4" rx="2" fill="${ORANGE}"/></g>`,
  soundOn: `${speaker}<path d="M29 18q4 6 0 12M34 13q8 11 0 22" fill="none" ${ink()}/>`,
  soundOff: `${speaker}<path d="M30 19l10 10M40 19l-10 10" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>`,
  lock: `<path d="M16.5 21v-5a7.5 7.5 0 0 1 15 0v5" fill="none" ${ink(3)}/><rect x="11" y="21" width="26" height="20" rx="5" fill="#cbd5e1" ${ink()}/>` +
    `<circle cx="24" cy="29.5" r="2.8" fill="${INK}"/><path d="M24 31v5" ${ink()}/>`,
  trophy: `<path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="#ffc800" ${ink()}/><path d="M15 11H9q0 9 7 10M33 11h6q0 9-7 10" fill="none" ${ink()}/>` +
    `<path d="M21 26h6l1 7h-8z" fill="#ffc800" ${ink()}/><rect x="14" y="33" width="20" height="7" rx="2" fill="${NAVY}" ${ink()}/><path d="M19 11v6" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>`,
  target: `<circle cx="24" cy="24" r="17" fill="#fff" ${ink()}/><circle cx="24" cy="24" r="11" fill="#ef4444"/><circle cx="24" cy="24" r="6" fill="#fff"/><circle cx="24" cy="24" r="2.6" fill="#ef4444"/>`,
  check: `<circle cx="24" cy="24" r="17" fill="#58cc02" ${ink()}/><path d="M15.5 24.5l6 6 11-12" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>`,
  medal1: medal("#e8a46a", "#9a4d16", 3),
  medal2: medal("#e2e8f0", "#64748b", 2),
  medal3: medal("#ffd34d", "#a16207", 1),
  // The gym bag: a navy duffel with an Eagles orange stripe. Open = already claimed.
  bag: `<path d="M17 17q0-8 7-8t7 8" fill="none" ${ink(3)}/><rect x="5" y="16" width="38" height="24" rx="11" fill="${NAVY}" ${ink()}/>` +
    `<rect x="5" y="25" width="38" height="5" fill="${ORANGE}"/><rect x="5" y="16" width="38" height="24" rx="11" fill="none" ${ink()}/>` +
    `<path d="M14 20h20" stroke="#fff" stroke-width="2" stroke-dasharray="2 2.5" opacity=".7"/><circle cx="35" cy="34.5" r="2.4" fill="#ffc800" ${ink(1.5)}/>`,
  bagOpen: `<ellipse cx="24" cy="20" rx="16" ry="5" fill="#0f172a" ${ink(2)}/><rect x="16" y="4" width="13" height="18" rx="2" transform="rotate(-12 22 13)" fill="#fff" ${ink(2)}/>` +
    `<rect x="17.5" y="7" width="9" height="8" rx="1" transform="rotate(-12 22 13)" fill="#fde68a"/>` +
    `<path d="M5 22h38v8a10 10 0 0 1-10 10H15A10 10 0 0 1 5 30z" fill="${NAVY}" ${ink()}/><rect x="5" y="27" width="38" height="5" fill="${ORANGE}"/>` +
    `<path d="M5 22h38v8a10 10 0 0 1-10 10H15A10 10 0 0 1 5 30z" fill="none" ${ink()}/>`,
  // A Rest Day Pass: a ticket with a moon on it.
  pass: `<path d="M6 14h36v6a4 4 0 0 0 0 8v6H6v-6a4 4 0 0 0 0-8z" fill="#7dd3fc" ${ink()}/><path d="M17 14v20" stroke="${INK}" stroke-width="2" stroke-dasharray="2.5 2.5"/>` +
    `<path d="M33 18a6 6 0 1 0 3 9.5 5 5 0 0 1-3-9.5z" fill="#fff" ${ink(2)}/>`,
  whistle: `<path d="M10 20h16a9 9 0 1 1-9 9v-1h-7z" fill="#cbd5e1" ${ink()}/><circle cx="26" cy="29" r="3" fill="${INK}"/><path d="M26 20v-5h14" fill="none" stroke="${ORANGE}" stroke-width="3" stroke-linecap="round"/>`,
  phone: `<rect x="13" y="4" width="22" height="40" rx="5" fill="${NAVY}" ${ink()}/><rect x="16" y="9" width="16" height="27" rx="2" fill="#bae6fd"/><path d="M24 30v-14M19 21l5-5 5 5" fill="none" stroke="${NAVY}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>`,
  // Path circle glyphs (white)
  spots: `<path d="M7 37Q24 0 41 37" ${wht(2.2)} stroke-dasharray="1 4.5"/>` + [[7, 37], [12, 21], [24, 12.5], [36, 21], [41, 37]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4.6" fill="#fff"/>`).join(""),
  cut: `<circle cx="13" cy="12" r="6" fill="#fff"/><path d="M14 22q1 14 17 15" ${wht()} stroke-dasharray="0.5 6.5"/><path d="M26.5 32l6 5-7 3.5" ${wht()}/><ellipse cx="38" cy="38" rx="6.5" ry="2.6" ${wht(3)}/>`,
  fill: `<circle cx="34" cy="16" r="7" fill="none" stroke="#fff" stroke-width="3" stroke-dasharray="3 3"/><circle cx="14" cy="32" r="7" fill="#fff"/><path d="M21 26l7-5" ${wht()}/><path d="M22.5 20.5l5.5.5-.5 5.5" ${wht()}/>`,
  givego: `<circle cx="11" cy="31" r="6" fill="#fff"/><circle cx="37" cy="17" r="6" fill="#fff"/><path d="M15 23q8-12 16-12" ${wht()}/><path d="M27 8l4 3-4 3.5" ${wht()}/><path d="M33 25q-8 12-16 12" ${wht()}/><path d="M21 40l-4-3 4-3.5" ${wht()}/>`,
  attack: `<path d="M27 4L12 27h10l-3 17 17-25H25z" fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round"/>`,
  cup: `<path d="M15 8h18v9a9 9 0 0 1-18 0z" fill="#fff"/><path d="M15 11H9q0 9 7 10M33 11h6q0 9-7 10" ${wht(3)}/><path d="M21 26h6l1 7h-8z" fill="#fff"/><rect x="14" y="34" width="20" height="6" rx="2" fill="#fff"/>`,
  swish: `<rect x="9" y="5" width="30" height="20" rx="3" ${wht(3)}/><ellipse cx="24" cy="24" rx="10" ry="3" fill="none" stroke="#fff" stroke-width="3.4"/><path d="M15 25l3 13M20 26l1.5 12M28 26l-1.5 12M33 25l-3 13M17 32h14" ${wht(2.2)}/>`,
  passpop: `<circle cx="9" cy="33" r="6" fill="#fff"/><circle cx="39" cy="33" r="6" fill="#fff"/><path d="M14 28q10-14 20 0" ${wht(2.6)} stroke-dasharray="1 5"/><circle cx="24" cy="18" r="6.5" fill="#fff"/><path d="M17.5 18h13M24 11.5v13" stroke="#c084fc" stroke-width="1.8"/>`,
  freethrow: `<rect x="5" y="27" width="38" height="12" rx="6" ${wht(3)}/><rect x="18" y="27" width="12" height="12" fill="#fff" opacity=".55"/><path d="M26 22v22" ${wht(3.6)}/><circle cx="24" cy="12" r="6.5" fill="#fff"/>`,
  dribble: `<circle cx="30" cy="14" r="8" fill="#fff"/><path d="M24.5 14h11M30 6v16" stroke="#c084fc" stroke-width="1.8"/><path d="M30 26v9" ${wht(3)} stroke-dasharray="2 4"/><path d="M22 41h16" ${wht(3)}/><path d="M6 12h10M4 19h10M7 26h8" ${wht(2.6)}/>`,
  // Unit 3 and Hoop Wall
  rotate: `<path d="M12 18a13 13 0 0 1 23-4" ${wht()}/><path d="M36 6v9h-9" ${wht()}/><path d="M36 30a13 13 0 0 1-23 4" ${wht()}/><path d="M12 42v-9h9" ${wht()}/><circle cx="24" cy="24" r="4.5" fill="#fff"/>`,
  fake: `<circle cx="12" cy="10" r="5.5" fill="#fff"/><path d="M12 18l-5 9 13 3" ${wht()}/><path d="M20 30q4 8 15 9" ${wht()} stroke-dasharray="0.5 6"/><path d="M30 34.5l6 4.5-6.5 3" ${wht()}/>`,
  corner: `<path d="M8 8v32h32" ${wht(3.6)}/><circle cx="16" cy="31" r="6" fill="#fff"/><path d="M21 26l9-12" ${wht()}/><path d="M24 14l6-.5.5 6" ${wht()}/>`,
  coach: `<rect x="9" y="7" width="26" height="34" rx="3" ${wht(3)}/><path d="M15 17l5 5M20 17l-5 5" ${wht(2.6)}/><path d="M16 33q4-8 12-9" ${wht(2.4)} stroke-dasharray="1 4"/><circle cx="34" cy="34" r="7" fill="none" stroke="#fff" stroke-width="3.2"/><path d="M39 39l5 5" ${wht(3.6)}/>`,
  zap: `<circle cx="24" cy="24" r="18" ${wht(3)}/><path d="M27 9L15 27h8l-3 13 13-19h-8z" fill="#fff"/>`,
  hoopwall: `<rect x="4" y="5" width="40" height="38" rx="3" ${wht(2.6)}/><path d="M4 18h40M4 31h40M17 5v13M31 18v13M17 31v12" stroke="#fff" stroke-width="1.4" opacity=".55"/>${[[12, 14], [34, 14], [24, 27], [12, 40], [34, 40]].map(([x, y]) => `<ellipse cx="${x}" cy="${y - 2}" rx="5" ry="1.8" fill="none" stroke="#fff" stroke-width="2.6"/>`).join("")}`,
  rotrush: `<circle cx="10" cy="14" r="5" fill="#fff"/><circle cx="38" cy="14" r="5" fill="#fff"/><circle cx="24" cy="38" r="5" fill="#fff"/><path d="M15 12q9-6 18 0M36 20q-2 10-8 14M19 35q-8-3-9-15" ${wht(2.6)}/><path d="M30 9l3 3-4 2" ${wht(2.4)}/>`,
  cutcatch: `<circle cx="9" cy="30" r="6" fill="#fff"/><path d="M15 28l14-10" ${wht(2.6)} stroke-dasharray="1 4.5"/><circle cx="34" cy="14" r="6" fill="#fff"/><path d="M34 21v8q0 8 8 11" ${wht(2.6)}/><path d="M24 22l5-4 1 6" ${wht(2.4)}/>`,
  // Little buttons inside lessons
  drive: `<path d="M27 4L12 27h10l-3 17 17-25H25z" fill="#ffc800" ${ink(2)}/>`,
  passBtn: `<circle cx="10" cy="30" r="6" fill="${NAVY}" ${ink(2)}/><circle cx="38" cy="30" r="6" fill="${NAVY}" ${ink(2)}/><path d="M15 25q9-12 18 0" fill="none" stroke="${INK}" stroke-width="2.4" stroke-dasharray="1 4.5" stroke-linecap="round"/><circle cx="24" cy="16" r="5.5" fill="${ORANGE}" ${ink(2)}/>`,
  stop: `<path d="M17 6h14l10 10v14L31 40H17L7 30V16z" fill="#ef4444" ${ink()}/><path d="M16 23h16" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
  cutBtn: `<circle cx="13" cy="12" r="6" fill="${NAVY}" ${ink(2)}/><path d="M14 22q1 14 17 15" fill="none" stroke="${INK}" stroke-width="2.6" stroke-dasharray="0.5 5.5" stroke-linecap="round"/><path d="M26.5 32l6 5-7 3.5" fill="none" ${ink(2.6)}/><ellipse cx="38" cy="38" rx="6.5" ry="2.6" fill="none" stroke="${ORANGE}" stroke-width="3"/>`,
  clock: `<circle cx="24" cy="26" r="16" fill="#fff" ${ink()}/><path d="M24 26V16M24 26l7 4" fill="none" ${ink(3)}/><path d="M19 6h10M24 6v4" ${ink(3)}/>`,
  plus: `<circle cx="24" cy="24" r="17" fill="#fff" stroke="#cbd5e1" stroke-width="2.5" stroke-dasharray="4 3"/><path d="M24 16v16M16 24h16" stroke="#94a3b8" stroke-width="3.5" stroke-linecap="round"/>`,
};
function icon(name, cls = "") { return `<svg class="ic ${cls}" viewBox="0 0 48 48" aria-hidden="true">${ICONS[name]}</svg>`; }
const MEDAL_ICON = ["", "medal1", "medal2", "medal3"];
