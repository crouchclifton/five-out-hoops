"use strict";
// Coach Bounce: the game's mascot, a basketball in a cap. Drawn in SVG and
// animated with CSS classes (see "Coach Bounce" in css/style.css).
//   const c = createCoach();  parent.appendChild(c.el);
//   c.mood("idle" | "happy" | "cheer" | "oops" | "think");
//   c.flash("happy", 1200)  -> that mood for a moment, then back to idle
//   c.talk(true/false)      -> mouth flaps (core.js does this while the voice plays)

const COACH_SVG = `
<svg viewBox="0 0 100 112" aria-hidden="true">
  <ellipse class="c-shadow" cx="50" cy="107" rx="25" ry="3.6"/>
  <g class="c-body">
    <g class="c-arm c-arm-l"><path d="M22 66 Q12 70 9 79"/><circle class="c-glove" cx="8.5" cy="80" r="5.6"/></g>
    <g class="c-arm c-arm-r"><path d="M78 66 Q88 70 91 79"/><circle class="c-glove" cx="91.5" cy="80" r="5.6"/>
      <path class="c-whistle" d="M93 84 h6 a3 3 0 0 1 0 6 h-6 z"/></g>
    <ellipse class="c-shoe" cx="38" cy="100" rx="9.5" ry="5.2"/><path class="c-stripe" d="M32 99 h12"/>
    <ellipse class="c-shoe" cx="62" cy="100" rx="9.5" ry="5.2"/><path class="c-stripe" d="M56 99 h12"/>
    <circle class="c-ball" cx="50" cy="62" r="34"/>
    <path class="c-seam" d="M50 29 V95 M16.5 64 H83.5 M28 38 Q40 63 28 88 M72 38 Q60 63 72 88"/>
    <path class="c-cap" d="M23 45 Q24 19 50 18 Q76 19 77 45 Q50 37 23 45 Z"/>
    <path class="c-brim" d="M60 41 Q80 35 96 43 Q80 48 62 46 Z"/>
    <circle class="c-capbtn" cx="50" cy="19" r="2.6"/>
    <path class="c-capstar" d="M50 26 l2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z"/>
    <path class="c-brow c-brow-l" d="M32 47.5 Q39 43.5 46 47.5"/>
    <path class="c-brow c-brow-r" d="M54 47.5 Q61 43.5 68 47.5"/>
    <g class="c-eyes">
      <ellipse class="c-eye" cx="39" cy="58" rx="7.4" ry="8.8"/>
      <ellipse class="c-eye" cx="61" cy="58" rx="7.4" ry="8.8"/>
      <g class="c-pupil"><circle cx="40" cy="59.5" r="4.3"/><circle cx="62" cy="59.5" r="4.3"/></g>
      <circle class="c-shine" cx="41.6" cy="57.4" r="1.5"/><circle class="c-shine" cx="63.6" cy="57.4" r="1.5"/>
    </g>
    <circle class="c-cheek" cx="28.5" cy="71" r="5"/><circle class="c-cheek" cx="71.5" cy="71" r="5"/>
    <path class="c-m c-m-smile" d="M41 74 Q50 82 59 74"/>
    <ellipse class="c-m c-m-open" cx="50" cy="77.5" rx="6" ry="5.4"/>
    <g class="c-m c-m-grin"><path d="M38 72 Q50 91 62 72 Z"/><path class="c-tongue" d="M44 81 Q50 77 56 81 Q50 86 44 81 Z"/></g>
    <path class="c-m c-m-oops" d="M42 79 Q46 75 50 79 Q54 83 58 79"/>
    <path class="c-sweat" d="M80 36 q4 6 0 8 q-4 -2 0 -8 z"/>
  </g>
</svg>`;

function createCoach(extraClass = "") {
  const wrap = html("div", "coach mood-idle " + extraClass, null, COACH_SVG);
  let mood = "idle", flashTimer = 0, alive = true;
  const setMood = m => {
    mood = m;
    wrap.classList.remove("mood-idle", "mood-happy", "mood-cheer", "mood-oops", "mood-think");
    // Restart the CSS animation so a repeated mood plays again.
    void wrap.offsetWidth;
    wrap.classList.add("mood-" + m);
  };
  // Blink every few seconds.
  (function blink() {
    if (!alive) return;
    setTimeout(() => {
      wrap.classList.add("blink");
      setTimeout(() => { wrap.classList.remove("blink"); blink(); }, 130);
    }, 2200 + Math.random() * 3000);
  })();
  return {
    el: wrap,
    mood(m) { clearTimeout(flashTimer); setMood(m); },
    flash(m, ms = 1200) {
      clearTimeout(flashTimer);
      setMood(m);
      flashTimer = setTimeout(() => setMood("idle"), ms);
    },
    talk(on) { wrap.classList.toggle("talking", !!on); },
    get current() { return mood; },
  };
}
