# Round 3 (October 22, 2026): done

Clifton asked for all the Duolingo ideas except recording his own voice (maybe later), plus player profiles. Built: hand-drawn SVG icons instead of emoji (js/icons.js); the Eagles identity (navy and orange, EAGLES on the gym floor, an original cartoon eagle mascot, never the league's logo; a credit line on the coaches page saying it is not an official league app); Unit 1 on an orange outdoor court and Unit 2 in the navy Eagles Gym; characters beside the path that move and cheer (js/cast.js); gym bags on the path; rewards one screen at a time (stars, XP, card pack, streak); streak milestones at 3, 7, 14, 30, 60 and 100 days with Coach Bounce on fire; Rest Day Passes (start with 1, earn one at each milestone from 7 on, hold 2); three daily Skills Challenges that pay a card pack (js/rewards.js); players as a face, jersey and number with no names, saved only on the phone, with per-player start over (js/profiles.js). Still Clifton's to do: playtest with a few players, and keep checking new features against Coach Russ's video.

# Round 2 (agreed with Clifton, October 22, 2026)

**Status, October 22, 2026: done.** All fixes 1 to 11, the Free Throw Frenzy floor (green zone never below .18 of the bar, speed capped at 1.2 sweeps a second, so the last shots still give about 150 ms), and the basketball cards. Added during the work at Clifton's request: Swish Shot's hoop no longer jumps across the screen when it speeds up, the home path no longer hangs 100 px off the right edge in Safari, every card player is a boy (boys-only league), and the coach's mouth now follows the speech instead of running through the quiet at the end of each clip. Big Game scoring went with "+1 per first-try read" (baskets still 2), not turnovers.

Source: Fable's review in `docs/review-2026-10-22.md` (item numbers below refer to it). Clifton said "go ahead" on the fixes and added the card idea.

## Clifton's calls

- **Keep bonus games at Mario Party difficulty.** His words: "kids are pretty good at video games, so anything similar to mario party should be fine for this age." So do NOT retune Dribble Dash (4), Free Throw Frenzy (5) or Swish Shot (14). Small exception worth considering: give Free Throw Frenzy's green zone a floor so it never gets faster than a person can react (the window shrinks to about 90 ms). Mention it, don't do more.
- **Voice is final:** Kokoro `am_adam` at 1.1x. Run `node tools/make-voice.mjs` after any text change; it re-records only new lines. Check new clips with whisper-cli (model at `~/work/points/tools/models/ggml-large-v3-turbo.bin`). Whisper hears "Swish" as "Swiss"; the phonemes are correct, so ignore that one. "Uh oh" can't be said naturally by the voice, so don't use it in any new line.
- **No real NBA players.** Names, likenesses, photos and real jersey numbers are off limits (right of publicity, NBPA licensing, photo copyright; the app is public). Use original cartoon players.

## Fixes to make

1. **Coach cut off mid-sentence (2).** `say()` returns a promise that resolves when the clip ends (timer fallback when sound is off or no clip); await it for informational lines. Questions stay interruptible.
2. **Install before playing on iPhone (1).** On iOS Safari, not standalone, show the Add to Home Screen sheet before the first lesson and say plainly that stars live in the icon, not in Safari.
3. **Service worker (3).** Build stamp in `sw.js` changed on every deploy (have make-voice or a tiny script write it), delete old caches on activate, re-precache voice clips, 3-second network timeout falling back to cache.
4. **Stale greeting (6)** and **small items (7):** always recompute the hero bubble; label the card "XP earned"; streak counts bonus games too; calendar-day streak math.
5. **Fade the 💤 (8).** Show it in early rounds of lessons 4 and 5, hide it later and in lesson 6. Give-and-go: cutter runs in front of a trailing defender.
6. **Rules in order (9).** Lesson 1's intro states all three rules; drop rule numbers from later intros or keep them consistent.
7. **Pass Pop (10).** Only flash OPEN on a teammate next to the ball (`PASSES[holder.spot]`).
8. **Lesson 2 cut question (11).** Rounds 3 to 5: no buttons, tap the hoop on the court.
9. **Big Game scoring (12).** Points follow reads: +1 per first-try correct read, or a wrong first answer is a turnover.
10. **No corner drives (13).** `drive: "open"` only from top or wing.
11. Nice-to-haves from (d) if cheap: speak the greeting on first tap; dim the decoy spots in lesson 1 part 2; Big Game 6 turns.

## New feature: basketball cards

Kids' favorites are Michael Jordan, Steph Curry and Victor Wembanyama. Capture the play style, never the person.

- **Original cartoon players**, drawn in SVG like Coach Bounce (varied skin tones, hair, jersey colors). Each card: name, fun nickname, signature move, rarity (common, rare, epic, legendary), four stats (Shooting, Passing, Speed, Defense), and a 5-Out tip on the back.
- **Legendary trio inspired by the favorites, with made-up names and different jersey numbers:** a high-flyer who dunks from the free throw line; a deep-range shooter with a shimmy after threes; a super-tall shot-blocker with an endless reach.
- **Earning:** a card pack after each lesson (3 stars improves the odds), a card for each bonus-game medal, a bonus pack on streak milestones. Duplicates turn into XP.
- **Card Binder** screen from the home top bar, with a flip-and-shine reveal animation for new cards.
- Probably 20 to 30 cards total.

## How to verify

Chrome playthrough bot and the iOS simulator setup are described in the memory note `five-out-hoops-game.md` (safaridriver with `safari:useSimulator`, its taps fire touchend but not click, so tap once to unlock sound then press buttons from JS). Test scripts from the last session were in `/tmp/fo-test/` and may be gone.
